import { headers } from "next/headers";

/**
 * In-memory login rate limiter.
 *
 * Limits failed login attempts per (IP, username) pair to mitigate brute-force
 * attacks on the facilitador and cliente portal logins.
 *
 * NOTE: This is in-memory and therefore only effective for single-instance
 * deployments (the current Docker setup). If the app scales to multiple
 * instances, move this to Redis/Upstash so the counters are shared.
 *
 * Limits:
 *   - 5 failed attempts per (IP, username) within a 15-minute sliding window
 *   - After 5 failures, that (IP, username) pair is locked for 15 minutes
 *   - Successful logins clear the counter for that pair
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface AttemptRecord {
  failures: number[];
  lockedUntil: number;
}

const store = new Map<string, AttemptRecord>();

// Periodic cleanup of expired entries to prevent unbounded memory growth.
// Runs on every call to check() but only purges if the map is large.
function cleanup() {
  if (store.size < 500) return;
  const now = Date.now();
  for (const [key, record] of store) {
    if (record.lockedUntil <= now && record.failures.every((t) => t <= now - WINDOW_MS)) {
      store.delete(key);
    }
  }
}

function getKey(ip: string, username: string): string {
  return `${ip}::${username.toLowerCase()}`;
}

/**
 * Get the client IP from the request headers.
 * Falls back to "unknown" if no IP header is present.
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/**
 * Check whether a login attempt for (ip, username) is allowed.
 * Returns `{ allowed: true }` or `{ allowed: false, retryAfterMs }`.
 */
export async function checkLoginRateLimit(
  ip: string,
  username: string,
): Promise<{ allowed: true } | { allowed: false; retryAfterMs: number }> {
  cleanup();
  const key = getKey(ip, username);
  const now = Date.now();
  const record = store.get(key);

  if (record && record.lockedUntil > now) {
    return { allowed: false, retryAfterMs: record.lockedUntil - now };
  }

  return { allowed: true };
}

/**
 * Record a failed login attempt for (ip, username).
 * If the attempt count exceeds MAX_ATTEMPTS within the window, the pair is
 * locked for WINDOW_MS.
 */
export async function recordLoginFailure(ip: string, username: string): Promise<void> {
  const key = getKey(ip, username);
  const now = Date.now();
  const record = store.get(key) || { failures: [], lockedUntil: 0 };

  // Drop timestamps outside the current window
  record.failures = record.failures.filter((t) => t > now - WINDOW_MS);
  record.failures.push(now);

  if (record.failures.length >= MAX_ATTEMPTS) {
    record.lockedUntil = now + WINDOW_MS;
  }

  store.set(key, record);
}

/**
 * Clear the failure counter for (ip, username) after a successful login.
 */
export async function clearLoginFailures(ip: string, username: string): Promise<void> {
  const key = getKey(ip, username);
  store.delete(key);
}
