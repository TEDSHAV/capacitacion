"use client";

import { useState, useCallback } from "react";
import {
  cacheDocument,
  isDocumentCached,
  removeCachedDocument,
} from "@/lib/offline/offline-documents";

interface UseOfflineDownloadOptions {
  /** Document type for metadata */
  type: "certificate" | "batch-osi" | "batch-docs" | "carnet";
  /** Entity ID (certificate ID, OSI number, etc.) */
  id: number | string;
  /** Human-readable label */
  label: string;
}

interface UseOfflineDownloadReturn {
  /** Whether the document is currently cached offline */
  isCached: boolean;
  /** Whether a download/cache operation is in progress */
  isDownloading: boolean;
  /** Error message if the last operation failed */
  error: string | null;
  /** Downloads and caches the document for offline use */
  downloadForOffline: (url: string) => Promise<void>;
  /** Removes the document from offline cache */
  removeFromOffline: (url: string) => Promise<void>;
  /** Checks if the document is already cached */
  checkCached: (url: string) => Promise<void>;
}

/**
 * Hook for managing offline document downloads from cliente/facilitador portal UI.
 */
export function useOfflineDownload({
  type,
  id,
  label,
}: UseOfflineDownloadOptions): UseOfflineDownloadReturn {
  const [isCached, setIsCached] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkCached = useCallback(async (url: string) => {
    const cached = await isDocumentCached(url);
    setIsCached(cached);
  }, []);

  const downloadForOffline = useCallback(
    async (url: string) => {
      setIsDownloading(true);
      setError(null);
      const result = await cacheDocument(url, { type, id, label });
      if (result.success) {
        setIsCached(true);
      } else {
        setError(result.error || "Error al descargar");
      }
      setIsDownloading(false);
    },
    [type, id, label],
  );

  const removeFromOffline = useCallback(async (url: string) => {
    await removeCachedDocument(url);
    setIsCached(false);
  }, []);

  return {
    isCached,
    isDownloading,
    error,
    downloadForOffline,
    removeFromOffline,
    checkCached,
  };
}
