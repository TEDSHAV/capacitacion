import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;

/**
 * Hash a password using bcrypt with a random salt.
 * Use this for all new password creation and updates.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Detect whether a stored hash is a bcrypt hash (starts with $2a$, $2b$, or $2y$)
 * or a legacy SHA-256 hash (64 hex characters).
 */
export function isBcryptHash(hash: string): boolean {
  return /^\$2[abxy]\$\d{2}\$/.test(hash);
}
