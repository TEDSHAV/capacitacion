import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import CapacitacionClient from "./CapacitacionClient";
import { CapacitacionStats } from "./CapacitacionStats";

async function StatsWrapper() {
  const stats = await CapacitacionStats({
    firstDayOfMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
  });
  return stats;
}

/** Check if the current user is admin/superadmin for the capacitacion app. */
async function isCapacitacionAdmin(): Promise<boolean> {
  const supabase = await createClient();

  // Fast path: shell-level admin/superadmin from JWT claims.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userRole =
    ((claimsData?.claims as Record<string, unknown> | undefined)?.user_role as string) ??
    ((claimsData?.claims?.app_metadata as Record<string, unknown> | undefined)?.role as string) ??
    null;
  if (userRole === "admin" || userRole === "superadmin") return true;

  // Fallback: app-specific admin role via RPC (matches proxy.ts logic).
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: userData } = await supabase
    .from("usuarios")
    .select("id")
    .eq("id_auth", user.id)
    .maybeSingle();
  if (!userData) return false;

  const { data: userRoles } = await supabase.rpc("get_user_roles_by_app", {
    p_usuario_id: userData.id,
  });
  if (!userRoles) return false;

  return (userRoles as Array<{ app_slug: string; role_slug: string }>).some(
    (r) =>
      r.app_slug === "scapacitacion" &&
      (r.role_slug === "admin" || r.role_slug === "superadmin"),
  );
}

export default async function CapacitacionPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  const isAdmin = await isCapacitacionAdmin();

  return (
    <Suspense fallback={<CapacitacionClient user={claimsData.claims as any} isAdmin={isAdmin} />}>
      <CapacitacionClientWithStats user={claimsData.claims as any} isAdmin={isAdmin} />
    </Suspense>
  );
}

async function CapacitacionClientWithStats({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const stats = await StatsWrapper();
  return <CapacitacionClient user={user} stats={stats} isAdmin={isAdmin} />;
}
