import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { OrphanBatchesClient } from "./OrphanBatchesClient";

export default async function VisibilidadLotesHuerfanosPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  // Fast path: shell-level admin/superadmin from JWT claims.
  const userRole =
    ((claimsData.claims as Record<string, unknown> | undefined)?.user_role as string) ??
    ((claimsData.claims?.app_metadata as Record<string, unknown> | undefined)?.role as string) ??
    null;
  if (userRole === "admin" || userRole === "superadmin") {
    return <OrphanBatchesClient />;
  }

  // Fallback: app-specific admin role via RPC (matches proxy.ts logic).
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/dashboard/capacitacion");
  }

  const { data: userData } = await supabase
    .from("usuarios")
    .select("id")
    .eq("id_auth", user.id)
    .maybeSingle();
  if (!userData) {
    redirect("/dashboard/capacitacion");
  }

  const { data: userRoles } = await supabase.rpc("get_user_roles_by_app", {
    p_usuario_id: userData.id,
  });

  const isAdmin =
    Array.isArray(userRoles) &&
    (userRoles as Array<{ app_slug: string; role_slug: string }>).some(
      (r) =>
        r.app_slug === "scapacitacion" &&
        (r.role_slug === "admin" || r.role_slug === "superadmin"),
    );

  if (!isAdmin) {
    redirect("/dashboard/capacitacion");
  }

  return <OrphanBatchesClient />;
}
