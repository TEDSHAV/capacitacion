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

    // Fetch cursos directly - no longer using catalogo_servicios
    const { data: cursosData, error: cursosError } = await supabase
      .from("cursos")
      .select("id, nombre, contenido, cliente_asociado, created_at, nota_aprobatoria, horas_estimadas")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (cursosError) {
      console.error('Cursos fetch error:', cursosError);
      throw cursosError;
    }

    console.log('Cursos data:', cursosData);

    return {
      osis: osis || [],
      courseTopics: (cursosData || []).map((curso) => ({
        id: curso.id.toString(),
        name: curso.nombre,
        description: curso.nombre,
        contenido_curso: curso.contenido,
        cliente_asociado: curso.cliente_asociado,
        created_at: curso.created_at,
        nota_aprobatoria: curso.nota_aprobatoria ?? 14, // Default to 14 if no nota_aprobatoria
        horas_estimadas: curso.horas_estimadas, // Add horas_estimadas from database
      }))
    };

  } catch (error) {
    console.error('Server action error:', error);
    return { error: error instanceof Error ? error.message : 'Error al cargar los datos' };
  }
}
