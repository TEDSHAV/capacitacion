import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCoberturaGeograficaData } from "@/app/actions/cobertura-geografica";
import CoberturaGeograficaClient from "./CoberturaGeograficaClient";

export const metadata = {
  title: "Calendario y Aulas SHA | Capacitación PRISMA",
  description:
    "Control de ocupación, disponibilidad semanal y asignación de salones en instalaciones SHA.",
};

export default async function CoberturaGeograficaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  // Pre-fetch initial SHA classroom data
  const { data: initialData } = await getCoberturaGeograficaData({ salon: "all_sha" });

  return (
    <CoberturaGeograficaClient
      initialData={initialData}
      shellUrl={process.env.NEXT_PUBLIC_SHELL_URL || ""}
    />
  );
}
