/**
 * Shared in-memory cache for alertas-certificados data.
 *
 * Problem: CertificadosNotificationsBanner (on the Capacitacion home page) and
 * CertificadosAlertCenter (in the dashboard layout) both call the same heavy
 * server action on mount — two identical round-trips fetching 400 OSIs +
 * 5 parallel sub-queries.
 *
 * Solution: This module deduplicates calls. The first caller triggers the
 * fetch; concurrent or near-subsequent callers get the in-flight promise or
 * the cached result. The cache is held for `STALE_MS` (60 seconds) before
 * a new fetch is allowed.
 */
import {
  getAlertasCertificadosPendientes,
  type AlertasCertificadosResumen,
} from "@/app/actions/alertas-certificados";

const STALE_MS = 60_000; // 60 seconds

type Listener = (data: AlertasCertificadosResumen) => void;

let cached: AlertasCertificadosResumen | null = null;
let cachedAt = 0;
let inflight: Promise<AlertasCertificadosResumen> | null = null;
const listeners = new Set<Listener>();

/** Subscribe to data updates. Returns an unsubscribe function. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  // If we already have fresh data, deliver it immediately
  if (cached && Date.now() - cachedAt < STALE_MS) {
    fn(cached);
  }
  return () => {
    listeners.delete(fn);
  };
}

function notify(data: AlertasCertificadosResumen) {
  listeners.forEach((fn) => {
    try {
      fn(data);
    } catch {
      // ignore listener errors
    }
  });
}

/**
 * Request data. Deduplicates in-flight calls and serves from cache when fresh.
 * Returns the result directly too (for callers that want it).
 */
export async function requestData(
  forceRefresh = false,
): Promise<AlertasCertificadosResumen> {
  // Serve from cache if still fresh and not forcing
  if (!forceRefresh && cached && Date.now() - cachedAt < STALE_MS) {
    return cached;
  }

  // Deduplicate: if a fetch is already in-flight, piggyback on it
  if (inflight) {
    return inflight;
  }

  inflight = getAlertasCertificadosPendientes()
    .then((res) => {
      cached = res;
      cachedAt = Date.now();
      inflight = null;
      notify(res);
      return res;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });

  return inflight;
}

/** Returns current cached data without triggering a fetch. */
export function getCached(): AlertasCertificadosResumen | null {
  return cached;
}
