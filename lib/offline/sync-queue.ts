"use client";

import { getOfflineDB, type SyncOp, type SyncOpType } from "./db";

/**
 * Offline sync queue using Dexie (IndexedDB).
 *
 * Operations are enqueued while offline and replayed to REST API routes
 * when connectivity returns. Triggered by the `online` event,
 * `visibilitychange`, and manual calls.
 */

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 2000;

const API_ROUTES: Record<SyncOpType, string> = {
  saveParticipants: "/api/portal/facilitador/participants",
  uploadAttachment: "/api/portal/facilitador/attachments",
  deleteAttachment: "/api/portal/facilitador/attachments",
  saveAcknowledgment: "/api/portal/facilitador/acknowledgment",
  submitSurvey: "/api/surveys/submit",
  toggleUnifiedStep: "/api/capacitacion/proceso-steps/toggle",
  toggleAttachmentReceived: "/api/capacitacion/proceso-steps/attachment",
  updateCertificateScore: "/api/certificates/score",
};

let isFlushing = false;
let flushListeners: Array<(stats: FlushStats) => void> = [];

export interface FlushStats {
  total: number;
  succeeded: number;
  failed: number;
  remaining: number;
}

/**
 * Enqueue a sync operation. If an op with the same groupKey exists and is
 * still pending, it's replaced (last-write-wins semantics).
 */
export async function enqueueOp(
  type: SyncOpType,
  groupKey: string,
  payload: Record<string, unknown>,
  blob?: { blob: Blob; name: string; type: string } | null,
): Promise<number> {
  const db = getOfflineDB();

  // Store blob if provided
  let blobId: number | null = null;
  if (blob) {
    blobId = await db.blobs.add({
      groupKey,
      blob: blob.blob,
      name: blob.name,
      type: blob.type,
      createdAt: Date.now(),
    });
  }

  // Replace existing pending op with same groupKey (last-write-wins)
  const existing = await db.syncOps
    .where("groupKey")
    .equals(groupKey)
    .filter((op) => op.status === "pending" || op.status === "error")
    .first();

  const now = Date.now();
  const op: SyncOp = {
    type,
    groupKey,
    payload,
    blobId: blobId ?? existing?.blobId ?? null,
    status: "pending",
    retries: 0,
    createdAt: now,
    updatedAt: now,
  };

  if (existing?.id) {
    await db.syncOps.update(existing.id, { ...op, id: existing.id });
    return existing.id;
  }

  return db.syncOps.add(op);
}

/**
 * Get all pending/error operations count.
 */
export async function getPendingCount(): Promise<number> {
  const db = getOfflineDB();
  return db.syncOps
    .where("status")
    .anyOf(["pending", "error", "syncing"])
    .count();
}

/**
 * Get all pending operations (for UI display).
 */
export async function getPendingOps(): Promise<SyncOp[]> {
  const db = getOfflineDB();
  return db.syncOps
    .where("status")
    .anyOf(["pending", "error"])
    .toArray();
}

/**
 * Remove completed ops and their associated blobs.
 */
export async function clearCompletedOps(): Promise<void> {
  const db = getOfflineDB();
  const done = await db.syncOps.where("status").equals("done").toArray();
  for (const op of done) {
    if (op.blobId) await db.blobs.delete(op.blobId);
    if (op.id) await db.syncOps.delete(op.id);
  }
}

/**
 * Flush all pending operations to the API routes.
 * Called on `online` event, `visibilitychange`, or manually.
 */
export async function flushQueue(): Promise<FlushStats> {
  if (isFlushing) {
    return { total: 0, succeeded: 0, failed: 0, remaining: 0 };
  }
  isFlushing = true;

  const db = getOfflineDB();
  const pending = await db.syncOps
    .where("status")
    .anyOf(["pending", "error"])
    .toArray();

  const stats: FlushStats = {
    total: pending.length,
    succeeded: 0,
    failed: 0,
    remaining: 0,
  };

  for (const op of pending) {
    if (!op.id) continue;

    // Mark as syncing
    await db.syncOps.update(op.id, { status: "syncing", updatedAt: Date.now() });

    try {
      const route = API_ROUTES[op.type];
      if (!route) {
        throw new Error(`No API route for op type: ${op.type}`);
      }

      const response = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(op.payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Success — mark as done
      await db.syncOps.update(op.id, {
        status: "done",
        updatedAt: Date.now(),
        lastError: undefined,
      });

      // Clean up blob if any
      if (op.blobId) {
        await db.blobs.delete(op.blobId);
      }

      stats.succeeded++;
    } catch (err) {
      const error = err as Error;
      const newRetries = op.retries + 1;

      if (newRetries >= MAX_RETRIES) {
        // Max retries reached — mark as error permanently
        await db.syncOps.update(op.id, {
          status: "error",
          retries: newRetries,
          lastError: error.message,
          updatedAt: Date.now(),
        });
      } else {
        // Reset to pending for next flush attempt (with backoff)
        await db.syncOps.update(op.id, {
          status: "pending",
          retries: newRetries,
          lastError: error.message,
          updatedAt: Date.now(),
        });
      }

      stats.failed++;
      stats.remaining++;

      // Exponential backoff — wait before next op if we're failing
      const backoff = BASE_BACKOFF_MS * Math.pow(2, newRetries - 1);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  isFlushing = false;

  // Notify listeners
  for (const listener of flushListeners) {
    listener(stats);
  }

  return stats;
}

/**
 * Subscribe to flush completion events.
 */
export function onFlushComplete(listener: (stats: FlushStats) => void): () => void {
  flushListeners.push(listener);
  return () => {
    flushListeners = flushListeners.filter((l) => l !== listener);
  };
}

/**
 * Initialize sync queue event listeners (call once on app mount).
 */
export function initSyncQueue(): () => void {
  const handleOnline = () => {
    flushQueue();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      flushQueue();
    }
  };

  window.addEventListener("online", handleOnline);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Try flushing on init if online
  if (navigator.onLine) {
    flushQueue();
  }

  return () => {
    window.removeEventListener("online", handleOnline);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
