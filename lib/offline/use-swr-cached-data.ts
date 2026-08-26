"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cachePortalData, getCachedPortalData } from "./portal-data-cache";
import type { PortalDataType } from "./db";

/**
 * Stale-While-Revalidate (SWR) cached data hook.
 *
 * Generalizes the proven pattern from GestionOSIClient:
 * 1. On mount: check module-level cache → paint instantly if present
 * 2. Else: check Dexie → paint as soon as read (~10-50ms)
 * 3. Always: background-refetch unless fresh (<60s), then swap + persist to Dexie
 *
 * Returns { data, loading, fetching, fromCache, cachedAt, reload }
 * - loading: true only when NOTHING cached (first-ever visit)
 * - fetching: true during background refresh (data already on screen)
 * - fromCache: true if data came from offline cache (Dexie)
 * - cachedAt: timestamp of when data was cached (for "Actualizado hace X")
 *
 * Usage:
 *   const { data, loading, fetching, fromCache } = useSwrCachedData(
 *     "dash_certs_p1",
 *     "dash_certs",
 *     () => getCertificatesForManagement(filters, 1, 10),
 *     [filters]
 *   );
 *   if (loading) return <Skeleton />;
 *   return (
 *     <>
 *       {fetching && <div className="text-sm text-gray-500">Actualizando...</div>}
 *       <CertificateTable records={data} />
 *     </>
 *   );
 */

// Module-level cache: survives navigation, per-tab session
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const moduleCache = new Map<string, CacheEntry<any>>();
const FRESH_MS = 60_000; // 60 seconds
const MAX_CACHE_ENTRIES = 50;

export interface UseSwrCachedDataResult<T> {
  data: T | null;
  loading: boolean;
  fetching: boolean;
  fromCache: boolean;
  cachedAt: number | null;
  reload: () => void;
}

export function useSwrCachedData<T>(
  cacheKey: string,
  cacheType: PortalDataType,
  fetcher: () => Promise<T>,
  dependencies: unknown[] = [],
): UseSwrCachedDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  // Keep fetcher ref stable so we don't refetch on every render
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Sync-check module cache before first paint (useLayoutEffect would be ideal,
  // but we use a ref + effect to avoid hydration mismatches)
  useEffect(() => {
    const cached = moduleCache.get(cacheKey);
    if (cached) {
      setData(cached.data);
      setCachedAt(cached.timestamp);
      setFromCache(false); // module cache is always fresh
      if (Date.now() - cached.timestamp < FRESH_MS) {
        setLoading(false);
        setFetching(false);
        return; // Don't refetch if fresh
      }
    }
  }, [cacheKey]);

  const reload = useCallback(async () => {
    let cancelled = false;

    // Check if we have fresh cached data
    const cached = moduleCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < FRESH_MS) {
      return; // Already fresh, skip refetch
    }

    // If we have stale module cache, show it while fetching
    if (cached) {
      setLoading(false);
      setFetching(true);
    } else {
      // No module cache; try Dexie
      try {
        const dexieCached = await getCachedPortalData<T>(cacheKey);
        if (dexieCached && !cancelled) {
          setData(dexieCached.data);
          setCachedAt(dexieCached.cachedAt);
          setFromCache(true);
          setLoading(false);
          setFetching(true);
        }
      } catch {
        // Dexie read failed, will show loading
      }

      if (!cancelled) {
        setLoading(!cached);
        setFetching(!!cached);
      }
    }

    // Background fetch
    try {
      const result = await fetcherRef.current();
      if (!cancelled) {
        setData(result);
        setCachedAt(Date.now());
        setFromCache(false);
        setLoading(false);
        setFetching(false);

        // Update module cache
        moduleCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
        if (moduleCache.size > MAX_CACHE_ENTRIES) {
          const firstKey = moduleCache.keys().next().value;
          if (firstKey) moduleCache.delete(firstKey);
        }

        // Persist to Dexie for offline
        cachePortalData(cacheKey, cacheType, result).catch(() => {});
      }
    } catch (err) {
      if (!cancelled) {
        setLoading(false);
        setFetching(false);
        // If we have any cached data, keep showing it; otherwise show error state
        if (!data && !cached) {
          console.error(`[useSwrCachedData] Error fetching ${cacheKey}:`, err);
        }
      }
    }

    return () => {
      cancelled = true;
    };
  }, [cacheKey, data]);

  // Trigger reload on mount and when dependencies change
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, cacheType, ...dependencies]);

  return { data, loading, fetching, fromCache, cachedAt, reload };
}
