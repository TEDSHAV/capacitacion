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
    { data: claimsData },
    { data: countsData },
  ] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.rpc("get_capacitacion_dashboard_counts", {
      p_first_day_of_month: firstDayStr,
    }),
  ]);

  if (!claimsData?.claims) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  const counts = countsData?.[0];

  return (
    <CapacitacionClient
      user={claimsData.claims as any}
      stats={{
        cursosActivos: counts?.cursos_activos ?? 0,
        participantes: counts?.participantes ?? 0,
        certificados: counts?.certificados ?? 0,
        facilitadores: counts?.facilitadores ?? 0,
        certificadosMes: counts?.certificados_mes ?? 0,
      }}
    />
  );
}
