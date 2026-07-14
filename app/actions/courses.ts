"use server";

import { createClient } from '@/utils/supabase/server';

export async function getCoursesByClient(clientId?: string) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("catalogo_servicios")
      .select("id, nombre, contenido_curso, cliente_asociado, created_at")
      .eq("tipo_servicio", 1)
      .order("created_at", { ascending: false });

    // Filter by client if clientId is provided
    if (clientId && clientId.trim()) {
      query = query.eq("cliente_asociado", clientId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      courses: (data || []).map((course) => ({
        id: course.id.toString(),
        name: course.nombre,
        description: course.nombre,
        contenido_curso: course.contenido_curso,
        cliente_asociado: course.cliente_asociado,
        created_at: course.created_at,
      }))
    };

  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error al cargar los cursos' };
  }
}
