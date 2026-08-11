import crypto from "node:crypto";

/**
 * Secret used to sign/verify portal sessions.
 *
 * Prefer a dedicated SESSION_SIGNING_SECRET env var. For backward
 * compatibility, fall back to SUPABASE_SERVICE_ROLE_KEY if the dedicated
 * secret is not set. In production, fail hard if neither is available.
 *
 * Computed lazily (on first use) so that the module can be imported during
 * `next build` without throwing — secret env vars are not available at build
 * time in Docker, only at runtime.
 */
let cachedSecret: string | null = null;

function getSecret(): string {
  if (cachedSecret !== null) return cachedSecret;

  const dedicated = process.env.SESSION_SIGNING_SECRET;
  if (dedicated) {
    cachedSecret = dedicated;
    return cachedSecret;
  }

  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (fallback) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[session-signing] SESSION_SIGNING_SECRET is not set — falling back to SUPABASE_SERVICE_ROLE_KEY. " +
          "Set a dedicated secret for better security.",
      );
    }
    cachedSecret = fallback;
    return cachedSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SIGNING_SECRET (or SUPABASE_SERVICE_ROLE_KEY) must be set in production.",
    );
  }
  cachedSecret = "fallback-dev-secret";
  return cachedSecret;
}

/**
 * Sign a JSON-serializable payload with HMAC-SHA256.
 * Returns "payload.hmac" where both parts are base64url-encoded.
 */
export function signSession(payload: Record<string, unknown> | object): string {
  const SECRET = getSecret();
  const json = JSON.stringify(payload);
  const payloadB64 = Buffer.from(json, "utf-8").toString("base64url");
  const hmac = crypto.createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
  return `${payloadB64}.${hmac}`;
}

/**
 * Verify and decode a signed session string.
 * Returns the original payload if valid, or null if the signature is invalid.
 */
export function verifySession<T = Record<string, unknown>>(signed: string): T | null {
  try {
    const SECRET = getSecret();
    const [payloadB64, hmac] = signed.split(".");
    if (!payloadB64 || !hmac) return null;

    const expectedHmac = crypto
      .createHmac("sha256", SECRET)
      .update(payloadB64)
      .digest("base64url");

    // Use timing-safe comparison
    const a = Buffer.from(hmac);
    const b = Buffer.from(expectedHmac);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const json = Buffer.from(payloadB64, "base64url").toString("utf-8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
