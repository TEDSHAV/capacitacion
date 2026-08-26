import { createClient } from "@/utils/supabase/server";

interface CapacitacionStatsProps {
  firstDayOfMonth: string;
}

export async function CapacitacionStats({ firstDayOfMonth }: CapacitacionStatsProps) {
  const supabase = await createClient();

  const { data: countsData } = await supabase.rpc("get_capacitacion_dashboard_counts", {
    p_first_day_of_month: firstDayOfMonth,
  });

  const counts = countsData?.[0];

  return {
    cursosActivos: counts?.cursos_activos ?? 0,
    participantes: counts?.participantes ?? 0,
    certificados: counts?.certificados ?? 0,
    facilitadores: counts?.facilitadores ?? 0,
    certificadosMes: counts?.certificados_mes ?? 0,
  };
}
