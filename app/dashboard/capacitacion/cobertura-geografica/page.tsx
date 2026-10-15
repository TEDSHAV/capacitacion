import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCoberturaGeograficaData } from "@/app/actions/cobertura-geografica";
import CoberturaGeograficaClient from "./CoberturaGeograficaClient";

export const metadata = {
  title: "Cobertura Geográfica y Sedes | Capacitación PRISMA",
  description:
    "Auditoría gerencial de cursos impartidos, temas capacitados y certificados emitidos por ubicación geográfica, estado y sede.",
};

export default async function CoberturaGeograficaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  // Pre-fetch initial data (all historical or default year)
  const { data: initialData } = await getCoberturaGeograficaData();

  return (
    <CoberturaGeograficaClient
      initialData={initialData}
      shellUrl={process.env.NEXT_PUBLIC_SHELL_URL || ""}
    />
  );
}
