"use client";

import { getOfflineDB, type PortalDataCache } from "./db";

/**
 * Cache and retrieve portal data (batches, certificates, OSIs) in IndexedDB
 * so the portal is usable offline. Data is stored as JSON strings keyed by
 * a descriptive key (e.g. `cliente_certs_osi_123`).
 */

/**
 * Store portal data in the cache. Overwrites if the key already exists.
 */
export async function cachePortalData<T>(
  key: string,
  type: PortalDataCache["type"],
  data: T,
): Promise<void> {
  const db = getOfflineDB();
  const entry: PortalDataCache = {
    key,
    type,
    data: JSON.stringify(data),
    cachedAt: Date.now(),
  };
  await db.portalData.put(entry);
}

/**
 * Retrieve cached portal data. Returns null if not cached.
 */
export async function getCachedPortalData<T>(
  key: string,
): Promise<{ data: T; cachedAt: number } | null> {
  const db = getOfflineDB();
  const entry = await db.portalData.get(key);
  if (!entry) return null;
  try {
    return {
      data: JSON.parse(entry.data) as T,
      cachedAt: entry.cachedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Retrieve all cached entries of a given type (e.g. all `cliente_certs`).
 */
export async function getCachedPortalDataByType<T>(
  type: PortalDataCache["type"],
): Promise<Array<{ key: string; data: T; cachedAt: number }>> {
  const db = getOfflineDB();
  const entries = await db.portalData.where("type").equals(type).toArray();
  return entries.map((entry) => ({
    key: entry.key,
    data: JSON.parse(entry.data) as T,
    cachedAt: entry.cachedAt,
  }));
}

/**
 * Remove a cached entry by key.
 */
export async function removeCachedPortalData(key: string): Promise<void> {
  const db = getOfflineDB();
  await db.portalData.delete(key);
}

/**
 * Clear all cached portal data of a given type.
 */
export async function clearCachedPortalDataByType(
  type: PortalDataCache["type"],
): Promise<void> {
  const db = getOfflineDB();
  const keys = await db.portalData.where("type").equals(type).primaryKeys();
  await db.portalData.bulkDelete(keys);
}

/**
 * Get the age of a cached entry in milliseconds, or null if not cached.
 */
export async function getCachedAge(key: string): Promise<number | null> {
  const db = getOfflineDB();
  const entry = await db.portalData.get(key);
  if (!entry) return null;
  return Date.now() - entry.cachedAt;
}

/**
 * Check if data is cached and fresh (within maxAge milliseconds).
 */
export async function isCacheFresh(
  key: string,
  maxAge: number,
): Promise<boolean> {
  const age = await getCachedAge(key);
  return age !== null && age < maxAge;
}
