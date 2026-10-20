"use server";

import { createClient } from "@/utils/supabase/server";
import type { EmailContext, EmailSessionInfo } from "@/types/email";
import { buildEmailContext } from "@/lib/email/template-render";
import { isMaterialesEnabled } from "@/lib/materiales-flags";
import { getOsiSessionInfo } from "@/app/actions/osi-facilitador-assignments";


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

  // OSI + facilitador + session details in parallel.
  const [osiRes, facRes, sessionInfo] = await Promise.all([
    supabase
      .from("v_osi_formato_completo")
      .select(
        "nro_osi, servicio, nombre_empresa, direccion_ejecucion, persona_contacto, contacto_telefono, contenido_servicio, observaciones_totales, fecha_inicio_real, desglose_recursos_sesiones, costo_honorarios_instructor, costo_traslado, costo_impresion_material, horas_academicas_ejecucion, sesiones_ejecucion",
      )
      .eq("id_osi", osiId)
      .maybeSingle(),
    supabase
      .from("facilitadores")
      .select("nombre_apellido, email, telefono")
      .eq("id", facilitadorId)
      .maybeSingle(),
    getOsiSessionInfo(osiId),
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

  // Build session list using getOsiSessionInfo so all sessions (including unconfirmed dates) are captured.

  type DesgloseRow = {
    nro_sesion?: number | null;
    id_sesion?: number | null;
    fecha?: string | null;
    hora_inicio?: string | null;
    hora_fin?: string | null;
    horas_honorarios_instructor?: number | null;
    tarifa_hora_honorarios?: number | null;
    costo_honorarios_instructor?: number | null;
    costo_traslado?: number | null;
    costo_impresion_material?: number | null;
  };

  const rawDesglose = Array.isArray(osiRes.data.desglose_recursos_sesiones)
    ? (osiRes.data.desglose_recursos_sesiones as DesgloseRow[])
    : [];

  let sessions: EmailSessionInfo[] = sessionInfo.sessions.map((s) => {
    const desgloseMatch = rawDesglose.find((d, idx) => (d.nro_sesion ?? d.id_sesion ?? idx + 1) === s.nro_sesion);
    return {
      nro_sesion: s.nro_sesion,
      fecha: s.fecha,
      hora_inicio: s.hora_inicio,
      hora_fin: s.hora_fin,
      horas: desgloseMatch?.horas_honorarios_instructor ?? null,
    };
  });

  // Scope to the assigned session when a specific one was selected.
  if (nroSesion != null) {
    const scoped = sessions.filter((s) => s.nro_sesion === nroSesion);
    sessions = scoped.length > 0
      ? scoped
      : [{ nro_sesion: nroSesion, fecha: null, hora_inicio: null, hora_fin: null, horas: null }];
  }


  // Extract economic conditions (per-session when scoped, or OSI-level)
  let sesionHonorarios: number | null = null;
  let sesionTraslado: number | null = null;
  let sesionImpresion: number | null = null;

  if (nroSesion != null && rawDesglose.length > 0) {
    const match = rawDesglose.find(
      (d, idx) => (d.nro_sesion ?? d.id_sesion ?? idx + 1) === nroSesion,
    );
    if (match) {
      sesionHonorarios =
        match.costo_honorarios_instructor ??
        (match.horas_honorarios_instructor && match.tarifa_hora_honorarios
          ? match.horas_honorarios_instructor * match.tarifa_hora_honorarios
          : null);
      sesionTraslado = match.costo_traslado ?? null;
      sesionImpresion = match.costo_impresion_material ?? null;
    }
  }

  let honorarios = sesionHonorarios ?? osiRes.data.costo_honorarios_instructor ?? null;
  let traslado = sesionTraslado ?? osiRes.data.costo_traslado ?? null;
  let impresion = sesionImpresion ?? osiRes.data.costo_impresion_material ?? null;

  // Fallback to requisición if honorarios not present on OSI
  if (!honorarios) {
    try {
      const { data: req } = await supabase
        .from("requisiciones")
        .select("costo_traslado, impresion_total, honorarios_total")
        .eq("id_osi", osiId)
        .eq("cod_facilitador", facilitadorId)
        .is("deleted_at", null)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (req) {
        if (!honorarios && req.honorarios_total) honorarios = req.honorarios_total;
        if (!traslado && req.costo_traslado) traslado = req.costo_traslado;
        if (!impresion && req.impresion_total) impresion = req.impresion_total;
      }
    } catch {
      // Non-fatal
    }
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
      horas_academicas_ejecucion: osiRes.data.horas_academicas_ejecucion,
      sesiones_ejecucion: osiRes.data.sesiones_ejecucion,
    },
    {
      nombre_apellido: facRes.data.nombre_apellido,
      email: facRes.data.email,
      telefono: facRes.data.telefono,
    },
    sessions,
    {
      honorarios,
      traslado,
      impresion,
    },
  );

  // Link to Facilitator Portal
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://capacitacion.shadevenezuela.com.ve";
  ctx.enlace_portal = `${baseUrl}/portal/facilitador/osi/${osiId}`;

  // Check if course has digital presentation uploaded (dev-only feature)
  if (isMaterialesEnabled()) {
    try {
      const { getMaterialKitForOSI } = await import("./material-didactico");
      const kitRes = await getMaterialKitForOSI(osiId);
      if (kitRes.data?.presentacionPptx?.download_url) {
        ctx.enlace_presentacion = kitRes.data.presentacionPptx.download_url;
      } else if (kitRes.data?.presentacionPdf?.download_url) {
        ctx.enlace_presentacion = kitRes.data.presentacionPdf.download_url;
      }
    } catch (err) {
      console.warn("[getOSIEmailContext] Could not attach presentation link:", err);
    }
  }

  return { data: ctx, error: null };
}

