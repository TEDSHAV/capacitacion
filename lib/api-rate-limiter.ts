import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory API rate limiter.
 *
 * Limits requests per IP address per route group to prevent abuse.
 *
 * NOTE: In-memory like the login limiter — sufficient for single-instance
 * Docker deployments. For multi-instance, move to Redis/Upstash.
 *
 * Route groups and their limits (requests per minute per IP):
 *   - "ocr":      10/min  (expensive Mistral API calls)
 *   - "upload":   10/min  (file uploads)
 *   - "citizen":  20/min  (ID enumeration risk)
 *   - "default":  60/min  (general API routes)
 */

type RateLimitGroup = "ocr" | "upload" | "citizen" | "default";

const LIMITS: Record<RateLimitGroup, { max: number; windowMs: number }> = {
  ocr: { max: 10, windowMs: 60_000 },
  upload: { max: 10, windowMs: 60_000 },
  citizen: { max: 20, windowMs: 60_000 },
  default: { max: 60, windowMs: 60_000 },
};

interface Bucket {
  timestamps: number[];
}

const store = new Map<string, Bucket>();

function cleanup() {
  if (store.size < 1000) return;
  const now = Date.now();
  for (const [key, bucket] of store) {
    const maxWindow = 60_000;
    bucket.timestamps = bucket.timestamps.filter((t) => t > now - maxWindow);
    if (bucket.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

function getClientIpFromRequest(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/**
 * Check rate limit for a request. Returns null if allowed, or a 429
 * NextResponse if the limit has been exceeded.
 *
 * Usage in an API route:
 *   const limited = checkApiRateLimit(request, "ocr");
 *   if (limited) return limited;
 */
export function checkApiRateLimit(
  request: NextRequest,
  group: RateLimitGroup = "default",
): NextResponse | null {
  cleanup();
  const ip = getClientIpFromRequest(request);
  const key = `${group}:${ip}`;
  const now = Date.now();
  const limit = LIMITS[group];

  const bucket = store.get(key) || { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > now - limit.windowMs);

  if (bucket.timestamps.length >= limit.max) {
    const retryAfter = Math.ceil(limit.windowMs / 1000);
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  bucket.timestamps.push(now);
  store.set(key, bucket);
  return null;
}
