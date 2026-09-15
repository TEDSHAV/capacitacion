import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { EntrevistaListClient } from "./components/EntrevistaListClient";

export const metadata = {
  title: "Entrevista de Facilitadores | Capacitación",
  description: "Registro, evaluación y seguimiento de entrevistas de facilitadores y aspirantes",
};

export default async function EntrevistaFacilitadoresPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  return <EntrevistaListClient />;
}
