import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { OrphanBatchesClient } from "./OrphanBatchesClient";

export default async function VisibilidadLotesHuerfanosPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  const userRole =
    ((claimsData.claims as Record<string, unknown> | undefined)?.user_role as string) ??
    ((claimsData.claims?.app_metadata as Record<string, unknown> | undefined)?.role as string) ??
    null;

  const isDev = process.env.NODE_ENV === "development";
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  if (!isDev && !isAdmin) {
    redirect("/dashboard/capacitacion");
  }

  return <OrphanBatchesClient />;
}
