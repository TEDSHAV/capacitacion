"use client";

/**
 * Offline document storage using the Cache API.
 *
 * Stores downloaded PDF/ZIP blobs keyed by a document URL so they can be
 * opened later without a network connection. A metadata index is kept in
 * IndexedDB (via localStorage as a lightweight fallback) to list cached
 * documents in the UI.
 */

const CACHE_NAME = "offline-documents";
const META_KEY = "offline-documents-meta";

export interface OfflineDocumentMeta {
  /** Cache key — the original URL used to fetch the document */
  url: string;
  /** Human-readable label (e.g. "Certificado #123 — Juan Pérez") */
  label: string;
  /** Document type: certificate PDF, batch ZIP, etc. */
  type: "certificate" | "batch-osi" | "batch-docs" | "carnet";
  /** Entity ID (certificate ID, OSI number, etc.) */
  id: number | string;
  /** Timestamp when the document was cached */
  cachedAt: number;
  /** File size in bytes (approximate) */
  size: number;
  /** MIME type */
  contentType: string;
}

function getMetaStore(): OfflineDocumentMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMetaStore(metas: OfflineDocumentMeta[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(META_KEY, JSON.stringify(metas));
  } catch {
    // localStorage might be full — non-fatal
  }
}

async function getCache(): Promise<Cache | null> {
  if (typeof window === "undefined" || !("caches" in window)) return null;
  return caches.open(CACHE_NAME);
}

/**
 * Downloads a document from the given URL and stores it in the Cache API
 * for offline access. Also records metadata for the UI.
 */
export async function cacheDocument(
  url: string,
  meta: Omit<OfflineDocumentMeta, "url" | "cachedAt" | "size" | "contentType">,
): Promise<{ success: boolean; error?: string }> {
  try {
    const cache = await getCache();
    if (!cache) return { success: false, error: "Cache API no disponible" };

    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, error: `Error ${response.status} al descargar` };
    }

    const blob = await response.blob();
    const contentType = response.headers.get("content-type") || blob.type || "application/octet-stream";

    // Store in Cache API — put a new Response with the blob
    const cachedResponse = new Response(blob, {
      headers: { "Content-Type": contentType },
    });
    await cache.put(url, cachedResponse);

    // Update metadata
    const metas = getMetaStore();
    const existingIdx = metas.findIndex((m) => m.url === url);
    const newMeta: OfflineDocumentMeta = {
      ...meta,
      url,
      cachedAt: Date.now(),
      size: blob.size,
      contentType,
    };
    if (existingIdx >= 0) {
      metas[existingIdx] = newMeta;
    } else {
      metas.push(newMeta);
    }
    saveMetaStore(metas);

    return { success: true };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

/**
 * Opens a cached document in a new tab. If not cached, fetches it online.
 */
export async function openCachedDocument(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cache = await getCache();
    if (cache) {
      const cached = await cache.match(url);
      if (cached) {
        const blob = await cached.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        // Revoke after a delay to allow the tab to load
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return { success: true };
      }
    }
    // Not cached — open online
    window.open(url, "_blank");
    return { success: true };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

/**
 * Checks if a document URL is already cached offline.
 */
export async function isDocumentCached(url: string): Promise<boolean> {
  const cache = await getCache();
  if (!cache) return false;
  const cached = await cache.match(url);
  return !!cached;
}

/**
 * Removes a document from the offline cache.
 */
export async function removeCachedDocument(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cache = await getCache();
    if (cache) {
      await cache.delete(url);
    }
    const metas = getMetaStore();
    saveMetaStore(metas.filter((m) => m.url !== url));
    return { success: true };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

/**
 * Lists all cached documents' metadata.
 */
export function listCachedDocuments(): OfflineDocumentMeta[] {
  return getMetaStore().sort((a, b) => b.cachedAt - a.cachedAt);
}

/**
 * Clears all cached documents.
 */
export async function clearAllCachedDocuments(): Promise<{ success: boolean; error?: string }> {
  try {
    if ("caches" in window) {
      await caches.delete(CACHE_NAME);
    }
    saveMetaStore([]);
    return { success: true };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}
