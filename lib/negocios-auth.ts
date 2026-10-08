import { createClient } from "@/utils/supabase/server";

export interface UserAccessInfo {
  isNegociosReadOnly: boolean;
  departamento: number | null;
  cargo: string | null;
  userId: string | null;
}

/**
 * Checks whether the given departamento and cargo qualify as a Negocios
 * analista or coordinador user with read-only access to the facilitadores pool.
 */
export function isNegociosAnalistaOCoordinador(
  departamento: number | null | undefined,
  cargo: string | null | undefined,
): boolean {
  if (departamento !== 2 || !cargo) return false;
  return /analista/i.test(cargo) || /coordinador/i.test(cargo);
}

/**
 * Checks the current session to determine if the user is a Negocios
 * analista or coordinador, who only has read-only access to
 * the gestion-de-facilitadores pool and Ficha Técnica downloads.
 */
export async function checkUserNegociosAccess(): Promise<UserAccessInfo> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isNegociosReadOnly: false,
      departamento: null,
      cargo: null,
      userId: null,
    };
  }

  // Fast path: admin or superadmin are never restricted
  const { data: claimsData } = await supabase.auth.getClaims();
  const userRole =
    ((claimsData?.claims as Record<string, unknown> | undefined)?.user_role as string) ??
    ((claimsData?.claims?.app_metadata as Record<string, unknown> | undefined)?.role as string) ??
    null;
  if (userRole === "admin" || userRole === "superadmin") {
    return {
      isNegociosReadOnly: false,
      departamento: null,
      cargo: null,
      userId: user.id,
    };
  }

  const { data: userData } = await supabase
    .from("usuarios")
    .select("departamento, cargo")
    .eq("id_auth", user.id)
    .maybeSingle();

  if (!userData) {
    return {
      isNegociosReadOnly: false,
      departamento: null,
      cargo: null,
      userId: user.id,
    };
  }

  const isRestricted = isNegociosAnalistaOCoordinador(userData.departamento, userData.cargo);

  return {
    isNegociosReadOnly: isRestricted,
    departamento: userData.departamento,
    cargo: userData.cargo,
    userId: user.id,
  };
}
