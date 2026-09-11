"use server";

import { createClient } from "@/utils/supabase/server";
import type { EmailContext, EmailSessionInfo } from "@/types/email";
import { buildEmailContext } from "@/lib/email/template-render";

/**
 * Fetch the OSI + facilitador + session data needed to render an "Asignación
 * de Facilitador" email, and return a ready-to-use `EmailContext`.
 *
 * Session detail is sourced from the `osi_sesion` table (preferred, dedicated
 * per-session rows with fecha/hora_inicio/hora_fin), falling back to the
 * `desglose_recursos_sesiones` JSONB array on the OSI view when `osi_sesion`
 * has no rows for this OSI.
 *
 * @param osiId          The OSI id (ejecucion_osi.id / v_osi_formato_completo.id_osi).
 * @param facilitadorId  The facilitador to address the email to.
 * @param nroSesion      When null → all sessions; when a number → only that
 *                       session (used to scope fechas/horario/duracion).
 */
export async function getOSIEmailContext(
  osiId: number,
  facilitadorId: number,
  nroSesion: number | null,
): Promise<{ data: EmailContext | null; error: string | null }> {
  const supabase = await createClient();

  // OSI + facilitador in parallel.
  const [osiRes, facRes, sesRes] = await Promise.all([
    supabase
      .from("v_osi_formato_completo")
      .select(
        "nro_osi, servicio, nombre_empresa, direccion_ejecucion, persona_contacto, contacto_telefono, contenido_servicio, observaciones_totales, fecha_inicio_real, desglose_recursos_sesiones",
      )
      .eq("id_osi", osiId)
      .maybeSingle(),
    supabase
      .from("facilitadores")
      .select("nombre_apellido, email")
      .eq("id", facilitadorId)
      .maybeSingle(),
    supabase
      .from("osi_sesion")
      .select("nro_sesion, fecha, hora_inicio, hora_fin")
      .eq("id_osi", osiId)
      .order("nro_sesion", { ascending: true }),
  ]);

  if (osiRes.error) {
    console.error("[getOSIEmailContext] OSI fetch error:", osiRes.error);
    return { data: null, error: osiRes.error.message };
  }
  if (!osiRes.data) {
    return { data: null, error: "OSI no encontrada" };
  }
  if (facRes.error) {
    console.error("[getOSIEmailContext] facilitador fetch error:", facRes.error);
    return { data: null, error: facRes.error.message };
  }
  if (!facRes.data) {
    return { data: null, error: "Facilitador no encontrado" };
  }

  // Build session list.
  let sessions: EmailSessionInfo[] = [];

  type OsiSesionRow = {
    nro_sesion: number | null;
    fecha: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
  };
  type DesgloseRow = {
    nro_sesion?: number | null;
    id_sesion?: number | null;
    fecha?: string | null;
    hora_inicio?: string | null;
    hora_fin?: string | null;
    horas_honorarios_instructor?: number | null;
  };

  if (sesRes.data && sesRes.data.length > 0) {
    sessions = (sesRes.data as OsiSesionRow[]).map((s) => ({
      nro_sesion: s.nro_sesion,
      fecha: s.fecha,
      hora_inicio: s.hora_inicio,
      hora_fin: s.hora_fin,
      horas: null, // osi_sesion has no hours column
    }));
  } else if (Array.isArray(osiRes.data.desglose_recursos_sesiones)) {
    // Fallback: desglose_recursos_sesiones JSONB on the view.
    sessions = (osiRes.data.desglose_recursos_sesiones as DesgloseRow[]).map((s) => ({
      nro_sesion: s.nro_sesion ?? s.id_sesion ?? null,
      fecha: s.fecha ?? null,
      hora_inicio: s.hora_inicio ?? null,
      hora_fin: s.hora_fin ?? null,
      horas: s.horas_honorarios_instructor ?? null,
    }));
  }

  // Scope to the assigned session when a specific one was selected.
  if (nroSesion != null) {
    sessions = sessions.filter((s) => s.nro_sesion === nroSesion);
  }

  const ctx = buildEmailContext(
    {
      nro_osi: osiRes.data.nro_osi,
      servicio: osiRes.data.servicio,
      nombre_empresa: osiRes.data.nombre_empresa,
      direccion_ejecucion: osiRes.data.direccion_ejecucion,
      persona_contacto: osiRes.data.persona_contacto,
      contacto_telefono: osiRes.data.contacto_telefono,
      contenido_servicio: osiRes.data.contenido_servicio,
      observaciones_totales: osiRes.data.observaciones_totales,
      fecha_inicio_real: osiRes.data.fecha_inicio_real,
    },
    {
      nombre_apellido: facRes.data.nombre_apellido,
      email: facRes.data.email,
    },
    sessions,
  );

  return { data: ctx, error: null };
}
