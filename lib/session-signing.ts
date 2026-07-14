import crypto from "node:crypto";

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback-dev-secret";

/**
 * Sign a JSON-serializable payload with HMAC-SHA256.
 * Returns "payload.hmac" where both parts are base64url-encoded.
 */
export function signSession(payload: Record<string, unknown> | object): string {
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
