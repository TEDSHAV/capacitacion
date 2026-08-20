"use client";

import { useState, useCallback } from "react";
import { fetchWithOfflineFallback, type OfflineResult } from "./use-offline-data";
import type { PortalDataType } from "./db";

/**
 * Hook for loading data with offline fallback support.
 * Automatically caches successful fetches and falls back to cache on failure.
 *
 * Usage:
 *   const { data, loading, error, fromCache, cachedAt } = useCachedData(
 *     "dash_osis_page1",
 *     "dash_osis",
 *     () => getOSIsForManagement(filters, 1, 20)
 *   );
 */
export function useCachedData<T>(
  cacheKey: string,
  cacheType: PortalDataType,
  fetcher: () => Promise<T>,
  dependencies: unknown[] = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWithOfflineFallback(cacheKey, cacheType, fetcher);
      setData(result.data);
      setFromCache(result.fromCache);
      setCachedAt(result.cachedAt);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, cacheType, fetcher]);

  return { data, loading, error, fromCache, cachedAt, load };
}
