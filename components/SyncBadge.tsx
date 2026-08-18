"use client";

import { useEffect, useState, useCallback } from "react";
import { CloudUpload, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { getPendingCount, flushQueue, initSyncQueue, onFlushComplete, type FlushStats } from "@/lib/offline/sync-queue";

/**
 * Shows a badge in the facilitador portal navbar with the count of
 * pending offline operations. Clicking it triggers a manual sync.
 */
export function SyncBadge() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastFlush, setLastFlush] = useState<FlushStats | null>(null);

  const refreshCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refreshCount();
    const cleanup = initSyncQueue();
    const unsubscribe = onFlushComplete((stats) => {
      setLastFlush(stats);
      setSyncing(false);
      refreshCount();
    });
    return () => {
      cleanup();
      unsubscribe();
    };
  }, [refreshCount]);

  const handleManualSync = async () => {
    if (syncing || pendingCount === 0) return;
    setSyncing(true);
    await flushQueue();
  };

  if (pendingCount === 0 && !syncing) {
    return null;
  }

  return (
    <button
      onClick={handleManualSync}
      disabled={syncing}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
      title={syncing ? "Sincronizando..." : `${pendingCount} cambio(s) pendiente(s) — clic para sincronizar`}
    >
      {syncing ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <CloudUpload className="w-3.5 h-3.5" />
      )}
      {syncing ? "Sincronizando..." : `${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""}`}
    </button>
  );
}
