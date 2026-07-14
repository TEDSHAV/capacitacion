"use server";

import { createClient } from '@/utils/supabase/server';

export async function getCoursesByClient(clientId?: string) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("catalogo_servicios")
      .select("id, nombre, contenido_curso, created_at")
      .eq("tipo_servicio", 1)
      .order("created_at", { ascending: false });

    // Note: cliente filtering removed since cliente_asociado column doesn't exist

    const { data, error } = await query;

    if (error) throw error;

    return {
      courses: (data || []).map((course) => ({
        id: course.id.toString(),
        name: course.nombre,
        description: course.nombre,
        contenido_curso: course.contenido_curso,
        created_at: course.created_at,
      }))
    };

  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error al cargar los cursos' };
  }
}
