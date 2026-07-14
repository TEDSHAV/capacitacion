"use server";

import { createClient } from "@/utils/supabase/server";
import { cache } from "react";

// Cached dashboard statistics for better performance
const getCachedDashboardStats = cache(async () => {
  const supabase = await createClient();

  try {
    // Get counts in parallel
    const [
      clientesResult,
      osisTotalResult,
      osisActiveResult,
      cursosResult,
      tareasResult,
    ] = await Promise.all([
      // Get total clients
      supabase.from("empresas").select("id", { count: "exact", head: true }),

      // Get total OSIs
      supabase
        .from("ejecucion_osi")
        .select("id", { count: "exact", head: true }),

      // Get active OSIs (pendiente or active status)
      supabase
        .from("ejecucion_osi")
        .select("id", { count: "exact", head: true })
        .in("id_estatus", [1, 2, 3]),

      // Get completed courses
      supabase
        .from("cursos")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),

      // Get pending tasks (assuming there's a tasks table)
      supabase
        .from("tareas")
        .select("id", { count: "exact", head: true })
        .eq("estatus", "pendiente"),
    ]);

    const stats = {
      totalClientes: clientesResult.count || 0,
      totalOSIs: osisTotalResult.count || 0,
      osisActivas: osisActiveResult.count || 0,
      cursosCompletados: cursosResult.count || 0,
      tareasPendientes: tareasResult.count || 0,
    };

    return { stats };
  } catch (err) {
    return {
      stats: {
        totalClientes: 0,
        totalOSIs: 0,
        osisActivas: 0,
        cursosCompletados: 0,
        tareasPendientes: 0,
      },
    };
  }
});

// Cached recent activity for better performance
const getCachedRecentActivity = cache(async (limit: number = 10) => {
  const supabase = await createClient();

  try {
    // Get recent activity from different tables
    const [cursosResult, clientesResult, osisResult] = await Promise.all([
      // Recent courses
      supabase
        .from("cursos")
        .select("id, nombre, created_at")
        .order("created_at", { ascending: false })
        .limit(3),

      // Recent clients
      supabase
        .from("empresas")
        .select("id, razon_social, created_at")
        .order("created_at", { ascending: false })
        .limit(3),

      // Recent OSI updates
      supabase
        .from("ejecucion_osi")
        .select("id, nro_osi, fecha_actualizacion, id_estatus")
        .order("fecha_actualizacion", { ascending: false })
        .limit(3)
        .in("id_estatus", [3, 4]), // Completed statuses
    ]);

    const activities = [
      ...(cursosResult.data || []).map((curso) => ({
        id: `course-${curso.id}`,
        type: "course",
        description: `Nuevo curso '${curso.nombre}' creado`,
        time: formatRelativeTime(curso.created_at),
        user: "Sistema",
      })),

      ...(clientesResult.data || []).map((cliente) => ({
        id: `client-${cliente.id}`,
        type: "client",
        description: `Cliente '${cliente.razon_social}' registrado`,
        time: formatRelativeTime(cliente.created_at),
        user: "Sistema",
      })),

      ...(osisResult.data || []).map((osi) => ({
        id: `osi-${osi.id}`,
        type: "osi",
        description: `OSI ${osi.nro_osi} marcada como completada`,
        time: formatRelativeTime(osi.fecha_actualizacion),
        user: "Sistema",
      })),
    ];

    // Sort by date and limit
    const sortedActivities = activities
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, limit);

    return { activities: sortedActivities };
  } catch (err) {
    return { activities: [] };
  }
});

// Get dashboard statistics
export async function getDashboardStats() {
  return await getCachedDashboardStats();
}

// Get recent activity
export async function getRecentActivity(limit: number = 10) {
  return await getCachedRecentActivity(limit);
}

// Helper function to format relative time
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Fecha desconocida";

  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60),
  );

  if (diffInMinutes < 5) return "Hace 5 min";
  if (diffInMinutes < 15) return "Hace 15 min";
  if (diffInMinutes < 60)
    return `Hace ${Math.floor(diffInMinutes / 10) * 10} min`;
  if (diffInMinutes < 120) return "Hace 1 hora";
  if (diffInMinutes < 1440)
    return `Hace ${Math.floor(diffInMinutes / 60)} horas`;
  return `Hace ${Math.floor(diffInMinutes / 1440)} días`;
}
