"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { fetchWithOfflineFallback } from "./use-offline-data";
import type { PortalDataType } from "./db";

/**
 * Hook for loading data with offline fallback support.
 * Automatically caches successful fetches and falls back to cache on failure.
 * Auto-fetches on mount and when dependencies change.
 *
 * Usage:
 *   const { data, loading, error, fromCache, cachedAt, reload } = useCachedData(
 *     "dash_osis_page1",
 *     "dash_osis",
 *     () => getOSIsForManagement(filters, 1, 20),
 *     [filters, currentPage]
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

  // Keep fetcher ref stable so we don't refetch on every render due to
  // inline arrow functions. We read the latest fetcher via ref.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWithOfflineFallback(cacheKey, cacheType, () => fetcherRef.current());
      setData(result.data);
      setFromCache(result.fromCache);
      setCachedAt(result.cachedAt);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, cacheType]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, cacheType, ...dependencies]);

  return { data, loading, error, fromCache, cachedAt, load, reload: load };
}
