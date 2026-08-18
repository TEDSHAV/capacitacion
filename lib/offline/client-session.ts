"use client";

import { getOfflineDB, type ClientSession } from "./db";

const SESSION_DURATION = 60 * 60 * 24 * 30 * 1000; // 30 days in ms

/**
 * Client-side session mirror stored in IndexedDB.
 *
 * This is NOT authoritative authentication — the real session is the
 * httpOnly cookie verified server-side. This is a hint that the user
 * was recently logged in, so the UI can:
 * - Show "Abrir panel" on the login form when offline
 * - Auto-redirect to the cached dashboard
 */

/**
 * Save a client-side session record after successful login.
 * Replaces any existing session for the same portal.
 */
export async function saveClientSession(
  portal: "facilitador" | "cliente",
  userId: number,
  nombre: string,
): Promise<void> {
  const db = getOfflineDB();
  const now = Date.now();
  // Remove any existing session for this portal
  const existing = await db.clientSession.where("portal").equals(portal).toArray();
  for (const s of existing) {
    if (s.id) await db.clientSession.delete(s.id);
  }
  await db.clientSession.add({
    portal,
    userId,
    nombre,
    loggedInAt: now,
    expiresAt: now + SESSION_DURATION,
  });
}

/**
 * Get the active client-side session for a portal, or null if
 * none exists or it has expired.
 */
export async function getClientSession(
  portal: "facilitador" | "cliente",
): Promise<ClientSession | null> {
  const db = getOfflineDB();
  const session = await db.clientSession
    .where("portal")
    .equals(portal)
    .first();
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    // Expired — clean up
    if (session.id) await db.clientSession.delete(session.id);
    return null;
  }
  return session;
}

/**
 * Get any active client-side session (either portal).
 * Returns the first valid one found.
 */
export async function getAnyClientSession(): Promise<ClientSession | null> {
  const facilitador = await getClientSession("facilitador");
  if (facilitador) return facilitador;
  const cliente = await getClientSession("cliente");
  return cliente;
}

/**
 * Clear the client-side session for a portal (on logout).
 */
export async function clearClientSession(
  portal: "facilitador" | "cliente",
): Promise<void> {
  const db = getOfflineDB();
  const sessions = await db.clientSession.where("portal").equals(portal).toArray();
  for (const s of sessions) {
    if (s.id) await db.clientSession.delete(s.id);
  }
}

/**
 * Clear all client-side sessions.
 */
export async function clearAllClientSessions(): Promise<void> {
  const db = getOfflineDB();
  await db.clientSession.clear();
}
