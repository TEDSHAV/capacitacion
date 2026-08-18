"use client";

import Dexie, { type Table } from "dexie";

export type SyncOpStatus = "pending" | "syncing" | "done" | "error";

export type SyncOpType = "saveParticipants" | "uploadAttachment" | "deleteAttachment" | "saveAcknowledgment";

export interface SyncOp {
  id?: number;
  type: SyncOpType;
  /** Key for deduplication / grouping (e.g. `osi_${osiId}_participants`) */
  groupKey: string;
  /** JSON-serializable payload for the API route */
  payload: Record<string, unknown>;
  /** Optional blob data (for attachment uploads) stored separately */
  blobId?: number | null;
  status: SyncOpStatus;
  retries: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OfflineBlob {
  id?: number;
  /** Associated group key to link with SyncOp */
  groupKey: string;
  /** The file blob */
  blob: Blob;
  /** Original filename */
  name: string;
  /** MIME type */
  type: string;
  createdAt: number;
}

export class OfflineDB extends Dexie {
  syncOps!: Table<SyncOp, number>;
  blobs!: Table<OfflineBlob, number>;

  constructor() {
    super("capacitacion-offline");
    this.version(1).stores({
      syncOps: "++id, type, groupKey, status, createdAt",
      blobs: "++id, groupKey, createdAt",
    });
  }
}

let dbInstance: OfflineDB | null = null;

export function getOfflineDB(): OfflineDB {
  if (!dbInstance) {
    dbInstance = new OfflineDB();
  }
  return dbInstance;
}
