"use client";

import { cachePortalData, getCachedPortalData } from "./portal-data-cache";
import type { PortalDataType } from "./db";

export interface OfflineResult<T> {
  data: T;
  fromCache: boolean;
  cachedAt: number | null;
}

/**
 * Runs `fetcher`. On success caches the result under `key` and returns it.
 * On failure (offline / network error) returns the cached copy if present,
 * otherwise rethrows so the caller's existing error handling still runs.
 *
 * Usage:
 *   const result = await fetchWithOfflineFallback(
 *     "dash_osis_page1",
 *     "dash_osis",
 *     () => getOSIsForManagement(filters, 1, 20)
 *   );
 *   setOsis(result.data);
 *   setFromCache(result.fromCache);
 */
export async function fetchWithOfflineFallback<T>(
  key: string,
  type: PortalDataType,
  fetcher: () => Promise<T>,
): Promise<OfflineResult<T>> {
  try {
    const data = await fetcher();
    cachePortalData(key, type, data).catch(() => {});
    return { data, fromCache: false, cachedAt: null };
  } catch (err) {
    const cached = await getCachedPortalData<T>(key);
    if (cached) {
      return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt };
    }
    throw err;
  }
}
