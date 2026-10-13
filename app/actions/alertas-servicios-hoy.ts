"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { toTitleCase } from "@/utils/string-utils";
import { syncOsiEjecutadoToShell } from "@/lib/sync/sync-osi-estatus";
import { addOsiNota } from "@/app/actions/capacitacion-osi-notas";
import {
  ensureProcesoStepsExist,
  unmarkEnProcesoStep,
  restoreRescheduledToActivos,
} from "@/app/actions/capacitacion-proceso-steps";

export type OsiHoyStatus = "pendiente" | "en_proceso" | "reagendado" | "no_ejecutado";

export interface OsiHoyItem {
  osiId: number;
  nroOsi: string;
  sesionId: number;
  nroSesion: number;
  totalSesiones: number;
  fecha: string; // YYYY-MM-DD
  fechaInicioReal: string | null;
  fechaFinReal: string | null;
  horaInicio: string | null; // e.g. "08:00:00"
  horaFin: string | null;
  nombreEmpresa: string;
  servicio: string;
  ciudad: string | null;
  direccion: string | null;
  facilitadorNombre: string | null;
  status: OsiHoyStatus;
  stepId: number | null;
  completedAt: string | null;
  completedBy: string | null;
  rescheduledDate: string | null;
  notes: string | null;
  unmarkReason: string | null;
}

export interface ResumenOsisHoy {
  todayStr: string;
  todayFormatted: string; // e.g. "Martes, 13 de Octubre de 2026"
  total: number;
  pendientes: number;
  enProceso: number;
  reagendados: number;
  noEjecutados: number;
  items: OsiHoyItem[];
}

/**
 * Returns current date in Venezuela timezone (America/Caracas, UTC-4) as YYYY-MM-DD.
 */
export async function getCaracasTodayStr(): Promise<string> {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Returns a human-friendly Spanish date string for today in Venezuela.
 * Example: "Martes, 13 de Octubre de 2026"
 */
function getCaracasTodayFormatted(): string {
  const parts = new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return toTitleCase(parts);
}

/**
 * Fetch all training courses/sessions scheduled for today in Venezuela time,
 * along with their current execution status and quick-action metadata.
 */
export async function getOsisDeHoy(): Promise<ResumenOsisHoy> {
  const todayStr = await getCaracasTodayStr();
  const todayFormatted = getCaracasTodayFormatted();

  const emptyResumen: ResumenOsisHoy = {
    todayStr,
    todayFormatted,
    total: 0,
    pendientes: 0,
    enProceso: 0,
    reagendados: 0,
    noEjecutados: 0,
    items: [],
  };

  try {
    const admin = await createAdminClient();

    // 1. Fetch all osi_sesion rows with planned date = today
    const { data: sesionRows, error: sesionError } = await admin
      .from("osi_sesion")
      .select("id, id_osi, nro_sesion, fecha, hora_inicio, hora_fin, fecha_ejecutada")
      .eq("fecha", todayStr);

    if (sesionError) {
      console.error("[getOsisDeHoy] Error querying osi_sesion for today:", sesionError);
      return emptyResumen;
    }

    if (!sesionRows || sesionRows.length === 0) {
      return emptyResumen;
    }

    const osiIds = Array.from(new Set(sesionRows.map((s) => s.id_osi).filter(Boolean)));
    if (osiIds.length === 0) return emptyResumen;

    // 2. Fetch related OSI details, total sessions, step records, facilitators, and cities
    const [osisResult, allSessionsResult, stepsResult, assignmentsResult, ciudadesResult] =
      await Promise.all([
        // Basic OSI info from view
        admin
          .from("v_osi_lista")
          .select(
            "id_osi, nro_osi, nombre_empresa, servicio, tipo_servicio, id_estatus, direccion_ejecucion, id_ciudad_direccion_ejecucion_efectiva, fecha_inicio_real, fecha_fin_real",
          )
          .in("id_osi", osiIds),

        // All session numbers to compute total sessions per OSI
        admin
          .from("osi_sesion")
          .select("id_osi, nro_sesion")
          .in("id_osi", osiIds),

        // Step completion for "en_proceso"
        admin
          .from("capacitacion_proceso_steps")
          .select(
            "id, osi_id, nro_sesion, phase, step_key, completed, completed_at, completed_by, notes, step_metadata",
          )
          .in("osi_id", osiIds)
          .eq("phase", "ejecucion")
          .eq("step_key", "en_proceso"),

        // Facilitator assignments
        admin
          .from("facilitador_osi_assignments")
          .select("osi_id, nro_sesion, is_active, facilitadores(nombre_apellido)")
          .in("osi_id", osiIds)
          .eq("is_active", true),

        // City names catalog
        admin.from("cat_ciudades").select("id, nombre_ciudad"),
      ]);

    // Build lookups
    const cityMap = new Map<number, string>(
      (ciudadesResult.data || []).map((c: { id: number; nombre_ciudad: string }) => [
        c.id,
        c.nombre_ciudad,
      ]),
    );

    const osiMap = new Map<number, any>();
    for (const osi of osisResult.data || []) {
      // Must be capacitacion and not PEN- draft
      const tipo = (osi.tipo_servicio || "").toLowerCase();
      const nro = (osi.nro_osi || "").toUpperCase();
      if (tipo.includes("capacitacion") && !nro.includes("PEN-")) {
        osiMap.set(osi.id_osi, osi);
      }
    }

    const totalSessionsByOsi = new Map<number, number>();
    for (const s of allSessionsResult.data || []) {
      totalSessionsByOsi.set(s.id_osi, (totalSessionsByOsi.get(s.id_osi) || 0) + 1);
    }

    // Step lookup by "osiId:nroSesion"
    const stepLookup = new Map<string, any>();
    for (const st of stepsResult.data || []) {
      stepLookup.set(`${st.osi_id}:${st.nro_sesion}`, st);
    }

    // Facilitator lookup by osiId
    const assignmentList = assignmentsResult.data || [];

    // Assemble item list
    const items: OsiHoyItem[] = [];

    for (const session of sesionRows) {
      const osi = osiMap.get(session.id_osi);
      if (!osi) continue; // Skip non-capacitacion or drafts

      const step = stepLookup.get(`${session.id_osi}:${session.nro_sesion}`);
      const meta = (step?.step_metadata as Record<string, unknown> | null) || {};

      // Determine facilitator for this session
      const osiAssignments = assignmentList.filter((a) => a.osi_id === session.id_osi);
      let match = osiAssignments.find((a) => a.nro_sesion === session.nro_sesion);
      if (!match) match = osiAssignments.find((a) => a.nro_sesion === null);
      if (!match && osiAssignments.length > 0) match = osiAssignments[0];

      const facRelation = match?.facilitadores;
      const facObj = Array.isArray(facRelation) ? facRelation[0] : facRelation;
      const facilitadorNombre = facObj?.nombre_apellido
        ? toTitleCase(facObj.nombre_apellido)
        : null;

      // Determine execution status
      let status: OsiHoyStatus = "pendiente";
      if (step?.completed || session.fecha_ejecutada) {
        status = "en_proceso";
      } else if (meta.is_rescheduled) {
        status = "reagendado";
      } else if (meta.unmarked_by_user && !meta.is_rescheduled) {
        status = "no_ejecutado";
      }

      // City resolution
      const ciudad = osi.id_ciudad_direccion_ejecucion_efectiva
        ? cityMap.get(osi.id_ciudad_direccion_ejecucion_efectiva) || null
        : null;

      items.push({
        osiId: session.id_osi,
        nroOsi: osi.nro_osi,
        sesionId: session.id,
        nroSesion: session.nro_sesion,
        totalSesiones: totalSessionsByOsi.get(session.id_osi) || 1,
        fecha: session.fecha,
        fechaInicioReal: osi.fecha_inicio_real || null,
        fechaFinReal: osi.fecha_fin_real || null,
        horaInicio: session.hora_inicio || null,
        horaFin: session.hora_fin || null,
        nombreEmpresa: osi.nombre_empresa,
        servicio: osi.servicio,
        ciudad,
        direccion: osi.direccion_ejecucion || null,
        facilitadorNombre,
        status,
        stepId: step?.id || null,
        completedAt: step?.completed_at || null,
        completedBy: step?.completed_by || null,
        rescheduledDate: (meta.new_date as string) || null,
        notes: step?.notes || null,
        unmarkReason: (meta.unmark_reason as string) || null,
      });
    }

    // Sort items: Pendientes first, then En Proceso, then Reagendados/No ejecutados.
    // Within same status, sort by horaInicio.
    const statusPriority: Record<OsiHoyStatus, number> = {
      pendiente: 1,
      en_proceso: 2,
      reagendado: 3,
      no_ejecutado: 4,
    };

    items.sort((a, b) => {
      const pDiff = statusPriority[a.status] - statusPriority[b.status];
      if (pDiff !== 0) return pDiff;
      const timeA = a.horaInicio || "99:99:99";
      const timeB = b.horaInicio || "99:99:99";
      return timeA.localeCompare(timeB);
    });

    const pendientes = items.filter((i) => i.status === "pendiente").length;
    const enProceso = items.filter((i) => i.status === "en_proceso").length;
    const reagendados = items.filter((i) => i.status === "reagendado").length;
    const noEjecutados = items.filter((i) => i.status === "no_ejecutado").length;

    return {
      todayStr,
      todayFormatted,
      total: items.length,
      pendientes,
      enProceso,
      reagendados,
      noEjecutados,
      items,
    };
  } catch (err) {
    console.error("[getOsisDeHoy] Unexpected error:", err);
    return emptyResumen;
  }
}

/**
 * 1-Click quick action: Marks today's session as completed (En Proceso / Ejecutado).
 * Syncs status to the shell as EJECUTADO and logs an audit note in capacitacion_osi_notas.
 */
export async function confirmarEjecucionHoy(
  osiId: number,
  nroSesion: number = 1,
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(osiId) || osiId <= 0) {
    return { success: false, error: "OSI inválido" };
  }

  try {
    const supabase = await createClient();
    const admin = await createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const now = new Date().toISOString();

    // Ensure step rows exist
    await ensureProcesoStepsExist(osiId, "ejecucion", nroSesion);

    // Fetch existing step to retain notes or other metadata
    const { data: existing } = await admin
      .from("capacitacion_proceso_steps")
      .select("id, step_metadata")
      .eq("osi_id", osiId)
      .eq("phase", "ejecucion")
      .eq("nro_sesion", nroSesion)
      .eq("step_key", "en_proceso")
      .maybeSingle();

    const existingMeta = (existing?.step_metadata as Record<string, unknown> | null) || {};
    const updatedMeta = {
      ...existingMeta,
      is_rescheduled: false,
      unmarked_by_user: false,
      confirmed_from_today_banner: true,
      confirmed_at: now,
    };

    const { error: updateError } = await admin.from("capacitacion_proceso_steps").upsert(
      {
        osi_id: osiId,
        nro_sesion: nroSesion,
        phase: "ejecucion",
        step_key: "en_proceso",
        completed: true,
        completed_at: now,
        completed_by: userId,
        step_metadata: updatedMeta,
      },
      { onConflict: "osi_id,nro_sesion,phase,step_key" },
    );

    if (updateError) {
      console.error("[confirmarEjecucionHoy] updateError:", updateError);
      return { success: false, error: "Error al registrar la ejecución" };
    }

    // Sync to shell status as EJECUTADO (best-effort)
    await syncOsiEjecutadoToShell(osiId, nroSesion, true).catch((err) =>
      console.error("[confirmarEjecucionHoy] syncOsiEjecutadoToShell failed:", err),
    );

    // Add note to capacitacion_osi_notas
    await addOsiNota(
      osiId,
      `[Confirmación en Vivo - Sesión ${nroSesion}] Servicio del día confirmado como En proceso / Ejecutado desde el panel de control.`,
    ).catch((err) => console.error("[confirmarEjecucionHoy] addOsiNota failed:", err));

    return { success: true };
  } catch (err) {
    console.error("[confirmarEjecucionHoy] unexpected error:", err);
    return { success: false, error: "Error inesperado al confirmar ejecución" };
  }
}

/**
 * Reschedule today's session with a reason and new planned date.
 */
export async function reagendarServicioHoy({
  osiId,
  nroSesion,
  reason,
  newDate,
}: {
  osiId: number;
  nroSesion: number;
  reason: string;
  newDate?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  return unmarkEnProcesoStep({
    osiId,
    nroSesion,
    reason,
    isRescheduled: true,
    newDate,
  });
}

/**
 * Cancel or mark today's session as not executed with a reason.
 */
export async function cancelarServicioHoy({
  osiId,
  nroSesion,
  reason,
}: {
  osiId: number;
  nroSesion: number;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  return unmarkEnProcesoStep({
    osiId,
    nroSesion,
    reason,
    isRescheduled: false,
  });
}

/**
 * Restore an OSI that was rescheduled or cancelled back to active.
 */
export async function restaurarServicioHoy({
  osiId,
  nroSesion,
}: {
  osiId: number;
  nroSesion: number;
}): Promise<{ success: boolean; error?: string }> {
  return restoreRescheduledToActivos(osiId, nroSesion);
}
