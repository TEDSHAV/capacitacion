import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import EvaluacionListClient from "./components/EvaluacionListClient";

export default async function EvaluacionFacilitadoresPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  return <EvaluacionListClient />;
}
