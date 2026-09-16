"use server";

import { createClient } from "@/utils/supabase/server";

export interface FacilitadorTopicRating {
  topic: string;
  avg_rating: number;
  review_count: number;
  sessions_count: number;
}

export interface FacilitadorResumen {
  id: number;
  nombre_apellido: string;
  titulo_profesional: string | null;
  foto_perfil_url: string | null;
  cedula: string | null;
  email: string | null;
  telefono: string | null;
  is_active: boolean;
  alcance: string | null;
  ano_ingreso: number | null;
  fecha_creacion: string | null;
  temas_cursos: string[];
  niveles_habilidad: Record<string, string> | null;
  calificacion: number | null;
  ciudad_nombre: string | null;
  estado_nombre: string | null;
  evaluacion_condicion: string | null;
  evaluacion_porcentaje: number | null;
  evaluacion_fecha: string | null;
  total_osis: number;
  total_certificados: number;
  overall_rating: number;
  review_count: number;
  topic_ratings: FacilitadorTopicRating[];
}

/**
 * Fetch a single facilitador's resumen from the v_facilitador_resumen view.
 * Used by the Resumen PDF export. The view is RLS-readable by any
 * authenticated user (security_invoker = true).
 *
 * Returns null on error / not found.
 */
export async function getFacilitadorResumen(
  id: number,
): Promise<FacilitadorResumen | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("v_facilitador_resumen")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("[getFacilitadorResumen] Error:", error);
      return null;
    }

    // Normalize fields that may arrive as strings/arrays from JSONB
    return {
      id: data.id,
      nombre_apellido: data.nombre_apellido ?? "",
      titulo_profesional: data.titulo_profesional ?? null,
      foto_perfil_url: data.foto_perfil_url ?? null,
      cedula: data.cedula ?? null,
      email: data.email ?? null,
      telefono: data.telefono ?? null,
      is_active: !!data.is_active,
      alcance: data.alcance ?? null,
      ano_ingreso: data.ano_ingreso ?? null,
      fecha_creacion: data.fecha_creacion ?? null,
      temas_cursos: Array.isArray(data.temas_cursos) ? data.temas_cursos : [],
      niveles_habilidad:
        (data.niveles_habilidad as Record<string, string> | null) ?? {},
      calificacion: data.calificacion ?? null,
      ciudad_nombre: data.ciudad_nombre ?? null,
      estado_nombre: data.estado_nombre ?? null,
      evaluacion_condicion: data.evaluacion_condicion ?? null,
      evaluacion_porcentaje:
        data.evaluacion_porcentaje != null
          ? Number(data.evaluacion_porcentaje)
          : null,
      evaluacion_fecha: data.evaluacion_fecha ?? null,
      total_osis: data.total_osis ?? 0,
      total_certificados: data.total_certificados ?? 0,
      overall_rating:
        data.overall_rating != null ? Number(data.overall_rating) : 0,
      review_count: data.review_count ?? 0,
      topic_ratings: Array.isArray(data.topic_ratings)
        ? (data.topic_ratings as FacilitadorTopicRating[])
        : [],
    };
  } catch (err) {
    console.error("[getFacilitadorResumen] Uncaught exception:", err);
    return null;
  }
}
