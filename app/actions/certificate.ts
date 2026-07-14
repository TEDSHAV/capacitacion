"use server";

import { createClient } from '@/utils/supabase/server';

export async function getCertificateData() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'No autorizado' };
    }

    // Fetch OSIs
    const { data: osis, error: osiError } = await supabase
      .from("osis")
      .select("*")
      .order("nro_osi", { ascending: false })
      .limit(100);

    if (osiError) throw osiError;

    // Fetch course topics from catalogo_servicios where tipo_servicio = 1
    const { data: courseData, error: courseError } = await supabase
      .from("catalogo_servicios")
      .select("id, nombre, contenido_curso, created_at")
      .eq("tipo_servicio", 1)
      .order("created_at", { ascending: false });

    if (courseError) throw courseError;

    return {
      osis: osis || [],
      courseTopics: (courseData || []).map((course) => ({
        id: course.id.toString(),
        name: course.nombre,
        description: course.nombre,
        contenido_curso: course.contenido_curso,
        created_at: course.created_at,
      }))
    };

  } catch (error) {
    return { error: 'Error al cargar los datos' };
  }
}
