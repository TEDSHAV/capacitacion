"use server";

import { createClient } from '@/utils/supabase/server';

export async function getCertificateData() {
  try {
    const supabase = await createClient();

    // Fetch OSIs
    const { data: osis, error: osiError } = await supabase
      .from("osi")
      .select("*")
      .order("nro_osi", { ascending: false })
      .limit(100);

    if (osiError) {
      console.error('OSI fetch error:', osiError);
      throw osiError;
    }

    // Fetch course topics from catalogo_servicios where tipo_servicio = 1
    const { data: courseData, error: courseError } = await supabase
      .from("catalogo_servicios")
      .select("id, nombre, contenido_curso, cliente_asociado, created_at")
      .eq("tipo_servicio", 1)
      .order("created_at", { ascending: false });

    if (courseError) {
      console.error('Course topics fetch error:', courseError);
      throw courseError;
    }

    return {
      osis: osis || [],
      courseTopics: (courseData || []).map((course) => ({
        id: course.id.toString(),
        name: course.nombre,
        description: course.nombre,
        contenido_curso: course.contenido_curso,
        cliente_asociado: course.cliente_asociado, // Keep as number from DB
        created_at: course.created_at,
      }))
    };

  } catch (error) {
    console.error('Server action error:', error);
    return { error: error instanceof Error ? error.message : 'Error al cargar los datos' };
  }
}
