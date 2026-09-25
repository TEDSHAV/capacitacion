import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory API rate limiter.
 *
 * Limits requests per client (session/IP) per route group to prevent abuse
 * while accommodating legitimate high-volume workflows like batch uploads,
 * class roster verification, and multi-session OCR scanning.
 *
 * Route groups and their limits (requests per minute):
 *   - "ocr":      60/min  (Mistral OCR & AI scanning)
 *   - "upload":   120/min (File & image uploads)
 *   - "citizen":  180/min (CNE / Seniat verification for entire classes)
 *   - "default":  180/min (General API routes)
 */

type RateLimitGroup = "ocr" | "upload" | "citizen" | "default";

const LIMITS: Record<RateLimitGroup, { max: number; windowMs: number }> = {
  ocr: { max: 60, windowMs: 60_000 },
  upload: { max: 120, windowMs: 60_000 },
  citizen: { max: 180, windowMs: 60_000 },
  default: { max: 180, windowMs: 60_000 },
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

function getClientIdentifier(request: NextRequest): string {
  // Check for session cookies first so authenticated users don't share a bucket on NAT/proxies
  const facilitadorSession = request.cookies.get("facilitador_session")?.value;
  if (facilitadorSession) {
    return `session_fac:${facilitadorSession.substring(0, 24)}`;
  }
  const clienteSession = request.cookies.get("cliente_session")?.value;
  if (clienteSession) {
    return `session_cli:${clienteSession.substring(0, 24)}`;
  }
  const authSession = request.cookies.get("sb-shade-auth-token")?.value;
  if (authSession) {
    return `session_auth:${authSession.substring(0, 24)}`;
  }

  // Fallback to IP address, checking Cloudflare real IP header first
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
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
  const clientId = getClientIdentifier(request);
  const key = `${group}:${clientId}`;
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
