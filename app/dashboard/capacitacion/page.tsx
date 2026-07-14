import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import CapacitacionClient from "./CapacitacionClient";

export default async function CapacitacionPage() {
  const supabase = await createClient();

  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);
  const firstDayStr = firstDayOfMonth.toISOString().split("T")[0];

  const [
    {
      data: { user },
    },
    { data: companies },
    { count: cursosCount },
    { count: participantesCount },
    { count: certificadosCount },
    { count: facilitadoresCount },
    { count: certificadosMesCount },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("empresas")
      .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
      .order("razon_social"),
    supabase
      .from("cursos")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("participantes_certificados")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("certificados").select("*", { count: "exact", head: true }),
    supabase.from("facilitadores").select("*", { count: "exact", head: true }),
    supabase
      .from("certificados")
      .select("*", { count: "exact", head: true })
      .gte("fecha_emision", firstDayStr),
  ]);

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  return (
    <CapacitacionClient
      user={user}
      companies={companies || []}
      stats={{
        cursosActivos: cursosCount ?? 0,
        participantes: participantesCount ?? 0,
        certificados: certificadosCount ?? 0,
        facilitadores: facilitadoresCount ?? 0,
        certificadosMes: certificadosMesCount ?? 0,
      }}
    />
  );
}
