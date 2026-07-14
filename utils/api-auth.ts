import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session-signing";
import { createClient } from "@/utils/supabase/server";

/**
 * Check if a request has a valid Supabase auth session (dashboard user).
 * Returns the user object if authenticated, or null if not.
 */
export async function getDashboardUser() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Check if a request has a valid cliente portal session.
 * Returns the session payload if authenticated, or null if not.
 */
export function getClienteSessionFromRequest(request: NextRequest) {
  const cookie = request.cookies.get("cliente_session");
  if (!cookie) return null;
  return verifySession(cookie.value);
}

/**
 * Check if a request has a valid facilitador portal session.
 * Returns the session payload if authenticated, or null if not.
 */
export function getFacilitadorSessionFromRequest(request: NextRequest) {
  const cookie = request.cookies.get("facilitador_session");
  if (!cookie) return null;
  return verifySession(cookie.value);
}

/**
 * Require authentication on an API route. Accepts either:
 * - Supabase auth (dashboard user)
 * - Cliente portal session
 * - Facilitador portal session
 *
 * Returns { type: 'dashboard' | 'cliente' | 'facilitador', session } if authenticated,
 * or a 401 NextResponse if not.
 */
export async function requireApiAuth(request: NextRequest): Promise<
  | { type: "dashboard"; session: null }
  | { type: "cliente"; session: Record<string, unknown> }
  | { type: "facilitador"; session: Record<string, unknown> }
  | { unauthorized: NextResponse }
> {
  // Try dashboard auth first
  const user = await getDashboardUser();
  if (user) {
    return { type: "dashboard", session: null };
  }

  // Try cliente portal session
  const clienteSession = getClienteSessionFromRequest(request);
  if (clienteSession) {
    return { type: "cliente", session: clienteSession };
  }

  // Try facilitador portal session
  const facilitadorSession = getFacilitadorSessionFromRequest(request);
  if (facilitadorSession) {
    return { type: "facilitador", session: facilitadorSession };
  }

  return {
    unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}

/**
 * Require dashboard (Supabase) auth only. For routes that should only be
 * accessible by authenticated dashboard users.
 * Returns the user if authenticated, or a 401 NextResponse if not.
 */
export async function requireDashboardAuth(
  _request: NextRequest,
): Promise<{ user: { id: string } } | { unauthorized: NextResponse }> {
  const user = await getDashboardUser();
  if (user) {
    return { user };
  }
  return {
    unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}
