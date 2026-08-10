"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import {
  ProcesoPhase,
  getStepKeys,
  isAutoStep,
  getPhaseForStep,
  isAutoStepUnified,
  requiresStepInput,
  ALL_STEPS,
} from "@/lib/proceso-steps";
import type { OSIAttachment, OSISesion } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProcesoStepRecord {
  id: number;
  osi_id: number;
  nro_sesion: number;
  phase: string;
  step_key: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  step_metadata?: Record<string, unknown> | null;
}

export interface ListaAsistenciaInfo {
  attachment_received: boolean;
  attachment_received_at: string | null;
  attachments: OSIAttachment[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve the sessions for an OSI using a priority fallback chain:
 *   1. desglose_recursos_sesiones (JSONB array on the view — has costs)
 *   2. sesiones_programadas (JSONB array on ejecucion_osi)
 *   3. osi_sesion table (relational fallback)
 * Returns an array of { nro_sesion, fecha, hora_inicio, hora_fin }.
 */
function resolveSessions(
  osi: {
    desglose_recursos_sesiones?: OSISesion[] | unknown[] | null;
    sesiones_programadas?: unknown[] | null;
  },
  osiSesionRows?: { nro_sesion: number; fecha: string | null; hora_inicio: string | null; hora_fin: string | null }[],
): { nro_sesion: number; fecha: string | null; hora_inicio: string | null; hora_fin: string | null }[] {
  // 1. desglose_recursos_sesiones
  const desglose = osi.desglose_recursos_sesiones;
  if (Array.isArray(desglose) && desglose.length > 0) {
    return desglose.map((s) => {
      const row = s as Record<string, unknown>;
      return {
        nro_sesion: (row.nro_sesion as number) ?? 1,
        fecha: (row.fecha as string) ?? null,
        hora_inicio: (row.hora_inicio as string) ?? null,
        hora_fin: (row.hora_fin as string) ?? null,
      };
    });
  }

  // 2. sesiones_programadas
  const programadas = osi.sesiones_programadas;
  if (Array.isArray(programadas) && programadas.length > 0) {
    return programadas.map((s, i) => {
      const row = s as Record<string, unknown>;
      return {
        nro_sesion: (row.nro_sesion as number) ?? i + 1,
        fecha: (row.fecha as string) ?? null,
        hora_inicio: (row.hora_inicio as string) ?? null,
        hora_fin: (row.hora_fin as string) ?? null,
      };
    });
  }

  // 3. osi_sesion table
  if (osiSesionRows && osiSesionRows.length > 0) {
    return osiSesionRows.map((s) => ({
      nro_sesion: s.nro_sesion,
      fecha: s.fecha,
      hora_inicio: s.hora_inicio,
      hora_fin: s.hora_fin,
    }));
  }

  // Fallback: single session
  return [{ nro_sesion: 1, fecha: null, hora_inicio: null, hora_fin: null }];
}

/**
 * Build an OSISesion[] for an OSI using the same priority chain as getOSISessions,
 * but reusing pre-fetched osi_sesion rows instead of issuing a new query.
 */
function toOSISessions(
  osi: {
    desglose_recursos_sesiones?: OSISesion[] | unknown[] | null;
    sesiones_programadas?: unknown[] | null;
  },
  osiSesionRows?: { id: number; nro_sesion: number; fecha: string | null; hora_inicio: string | null; hora_fin: string | null }[],
): OSISesion[] {
  // 1. desglose_recursos_sesiones (already full OSISesion[] shape from the view)
  const desglose = osi.desglose_recursos_sesiones;
  if (Array.isArray(desglose) && desglose.length > 0) {
    return desglose as OSISesion[];
  }

  // 2. sesiones_programadas
  const programadas = osi.sesiones_programadas;
  if (Array.isArray(programadas) && programadas.length > 0) {
    return programadas.map((s, i) => {
      const row = s as Record<string, unknown>;
      return {
        id: i,
        id_sesion: i + 1,
        nro_sesion: (row.nro_sesion as number) ?? i + 1,
        fecha: (row.fecha as string) ?? null,
        hora_inicio: (row.hora_inicio as string) ?? null,
        hora_fin: (row.hora_fin as string) ?? null,
        costo_traslado: null,
        costo_impresion_material: null,
        horas_honorarios_instructor: null,
        tarifa_hora_honorarios: null,
        costo_honorarios_instructor: null,
      };
    });
  }

  // 3. osi_sesion table rows
  if (osiSesionRows && osiSesionRows.length > 0) {
    return osiSesionRows.map((s) => ({
      id: s.id,
      id_sesion: s.id,
      nro_sesion: s.nro_sesion,
      fecha: s.fecha,
      hora_inicio: s.hora_inicio,
      hora_fin: s.hora_fin,
      costo_traslado: null,
      costo_impresion_material: null,
      horas_honorarios_instructor: null,
      tarifa_hora_honorarios: null,
      costo_honorarios_instructor: null,
    }));
  }

  // Fallback: single session
  return [{
    id: 0,
    id_sesion: 1,
    nro_sesion: 1,
    fecha: null,
    hora_inicio: null,
    hora_fin: null,
    costo_traslado: null,
    costo_impresion_material: null,
    horas_honorarios_instructor: null,
    tarifa_hora_honorarios: null,
    costo_honorarios_instructor: null,
  }];
}

// ─── Step CRUD ───────────────────────────────────────────────────────────────

/**
 * Fetch step completion records for a single OSI/session/phase.
 */
export async function getProcesoSteps(
  osiId: number,
  phase: ProcesoPhase,
  nroSesion: number = 1,
): Promise<ProcesoStepRecord[]> {
  if (!Number.isFinite(osiId) || osiId <= 0) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("capacitacion_proceso_steps")
      .select("*")
      .eq("osi_id", osiId)
      .eq("phase", phase)
      .eq("nro_sesion", nroSesion)
      .order("step_key", { ascending: true });

    if (error) {
      console.error("Error fetching proceso steps:", error);
      return [];
    }
    return (data || []) as ProcesoStepRecord[];
  } catch (err) {
    console.error("Unexpected error in getProcesoSteps:", err);
    return [];
  }
}

/**
 * Batch fetch step completion records for multiple OSIs in a phase (all sessions).
 * Returns a nested map: osiId → nroSesion → stepKey → record.
 */
export async function getProcesoStepsBatch(
  osiIds: number[],
  phase: ProcesoPhase,
): Promise<Map<number, Map<number, Record<string, ProcesoStepRecord>>>> {
  const result = new Map<number, Map<number, Record<string, ProcesoStepRecord>>>();
  if (!osiIds.length) return result;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("capacitacion_proceso_steps")
      .select("*")
      .in("osi_id", osiIds)
      .eq("phase", phase);

    if (error) {
      console.error("Error fetching proceso steps batch:", error);
      return result;
    }

    for (const row of (data || []) as ProcesoStepRecord[]) {
      let osiMap = result.get(row.osi_id);
      if (!osiMap) {
        osiMap = new Map();
        result.set(row.osi_id, osiMap);
      }
      let sessionMap = osiMap.get(row.nro_sesion);
      if (!sessionMap) {
        sessionMap = {};
        osiMap.set(row.nro_sesion, sessionMap);
      }
      sessionMap[row.step_key] = row;
    }
    return result;
  } catch (err) {
    console.error("Unexpected error in getProcesoStepsBatch:", err);
    return result;
  }
}

/**
 * Seed all step rows for an OSI/session/phase if they don't exist yet.
 */
export async function ensureProcesoStepsExist(
  osiId: number,
  phase: ProcesoPhase,
  nroSesion: number = 1,
): Promise<void> {
  if (!Number.isFinite(osiId) || osiId <= 0) return;
  const stepKeys = getStepKeys(phase);
  if (!stepKeys.length) return;

  try {
    const supabase = await createClient();
    const rows = stepKeys.map((key) => ({
      osi_id: osiId,
      nro_sesion: nroSesion,
      phase,
      step_key: key,
      completed: false,
    }));

    const { error } = await supabase
      .from("capacitacion_proceso_steps")
      .upsert(rows, { onConflict: "osi_id,nro_sesion,phase,step_key", ignoreDuplicates: true });

    if (error) {
      console.error("Error seeding proceso steps:", error);
    }
  } catch (err) {
    console.error("Unexpected error in ensureProcesoStepsExist:", err);
  }
}

/**
 * Toggle a step's completion state for an OSI/session/phase.
 * Auto steps cannot be toggled manually.
 */
export async function toggleProcesoStep(
  osiId: number,
  phase: ProcesoPhase,
  stepKey: string,
  nroSesion: number = 1,
  notes?: string,
): Promise<{ success: boolean; completed?: boolean; error?: string }> {
  if (!Number.isFinite(osiId) || osiId <= 0) {
    return { success: false, error: "OSI inválido" };
  }
  if (isAutoStep(phase, stepKey)) {
    return { success: false, error: "Este paso es automático y no puede ser modificado manualmente" };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    // Ensure rows exist
    await ensureProcesoStepsExist(osiId, phase, nroSesion);

    // Fetch current state
    const { data: existing, error: fetchError } = await supabase
      .from("capacitacion_proceso_steps")
      .select("id, completed")
      .eq("osi_id", osiId)
      .eq("phase", phase)
      .eq("nro_sesion", nroSesion)
      .eq("step_key", stepKey)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching step for toggle:", fetchError);
      return { success: false, error: "Error al buscar el paso" };
    }

    const currentlyCompleted = !!existing?.completed;
    const newCompleted = !currentlyCompleted;
    const now = new Date().toISOString();

    // For steps that require input (e.g. nro guía), notes must be non-empty when marking complete
    if (newCompleted && requiresStepInput(stepKey) && !notes?.trim()) {
      return { success: false, error: "Debe ingresar el número de guía" };
    }

    // Clear notes when unmarking
    const finalNotes = newCompleted ? (notes ?? null) : null;
    // Store structured metadata for input-based steps (e.g. sobre_enviado_zoom → { guia: "..." })
    const finalMetadata = newCompleted && notes?.trim()
      ? { guia: notes.trim() }
      : {};

    if (existing) {
      const { error: updateError } = await supabase
        .from("capacitacion_proceso_steps")
        .update({
          completed: newCompleted,
          completed_at: newCompleted ? now : null,
          completed_by: newCompleted ? userId : null,
          notes: finalNotes,
          step_metadata: finalMetadata,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Error toggling step:", updateError);
        return { success: false, error: "Error al actualizar el paso" };
      }
    } else {
      const { error: insertError } = await supabase
        .from("capacitacion_proceso_steps")
        .insert({
          osi_id: osiId,
          nro_sesion: nroSesion,
          phase,
          step_key: stepKey,
          completed: newCompleted,
          completed_at: newCompleted ? now : null,
          completed_by: newCompleted ? userId : null,
          notes: finalNotes,
          step_metadata: finalMetadata,
        });

      if (insertError) {
        console.error("Error inserting step:", insertError);
        return { success: false, error: "Error al crear el paso" };
      }
    }

    return { success: true, completed: newCompleted };
  } catch (err) {
    console.error("Unexpected error in toggleProcesoStep:", err);
    return { success: false, error: "Error inesperado" };
  }
}

// ─── Auto-advance for Ejecucion ──────────────────────────────────────────────

/**
 * Result of auto-advancing ejecucion steps for a batch of OSIs.
 * - stepsByOsi: osiId → nroSesion → stepKey → record (reflects post-upsert state,
 *   including seeded rows and auto-completed en_proceso/ejecutado).
 * - sessionsByOsi: osiId → sessions[] (resolved via the same priority chain as
 *   getOSISessions, reusing the osi_sesion rows already fetched here).
 */
export interface AutoAdvanceResult {
  stepsByOsi: Map<number, Map<number, Record<string, ProcesoStepRecord>>>;
  sessionsByOsi: Map<number, OSISesion[]>;
}

/**
 * Auto-advance ejecucion steps for a batch of OSIs, per-session:
 *   - Ensure all step rows exist (seeds rows for old OSIs predating the steps system)
 *   - If session fecha is today or past, mark "en_proceso" as completed
 *   - If session fecha is strictly past, also mark "ejecutado" as completed
 *
 * Seeding is done in a SINGLE batch upsert (ignoreDuplicates) instead of one
 * round-trip per session/phase, and the function returns the steps + sessions
 * maps it already builds internally so callers don't need to re-fetch them.
 *
 * Uses admin client to avoid RLS issues on bulk operations.
 */
export async function autoAdvanceEjecucionSteps(
  osis: {
    id_osi: number;
    fecha_inicio_real?: string | null;
    desglose_recursos_sesiones?: OSISesion[] | unknown[] | null;
    sesiones_programadas?: unknown[] | null;
  }[],
): Promise<AutoAdvanceResult> {
  const emptyResult: AutoAdvanceResult = {
    stepsByOsi: new Map(),
    sessionsByOsi: new Map(),
  };
  if (!osis.length) return emptyResult;

  try {
    const admin = await createAdminClient();
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Fetch osi_sesion rows as fallback for session dates
    const osiIds = osis.map((o) => o.id_osi);
    const osiSesionByOsi = new Map<number, { id: number; nro_sesion: number; fecha: string | null; hora_inicio: string | null; hora_fin: string | null }[]>();
    try {
      const { data: sesionRows } = await admin
        .from("osi_sesion")
        .select("id, id_osi, nro_sesion, fecha, hora_inicio, hora_fin")
        .in("id_osi", osiIds)
        .order("nro_sesion", { ascending: true });
      if (sesionRows) {
        for (const row of sesionRows as { id: number; id_osi: number; nro_sesion: number; fecha: string | null; hora_inicio: string | null; hora_fin: string | null }[]) {
          const list = osiSesionByOsi.get(row.id_osi) || [];
          list.push({ id: row.id, nro_sesion: row.nro_sesion, fecha: row.fecha, hora_inicio: row.hora_inicio, hora_fin: row.hora_fin });
          osiSesionByOsi.set(row.id_osi, list);
        }
      }
    } catch (e) {
      console.error("Error fetching osi_sesion for auto-advance:", e);
    }

    // Fetch existing step rows for all OSIs (both phases)
    const { data: existingSteps } = await admin
      .from("capacitacion_proceso_steps")
      .select("*")
      .in("osi_id", osiIds);

    // Build lookup: osiId → nroSesion → stepKey → record
    const stepsLookup = new Map<number, Map<number, Map<string, ProcesoStepRecord>>>();
    for (const row of (existingSteps || []) as ProcesoStepRecord[]) {
      let osiMap = stepsLookup.get(row.osi_id);
      if (!osiMap) {
        osiMap = new Map();
        stepsLookup.set(row.osi_id, osiMap);
      }
      let sessionMap = osiMap.get(row.nro_sesion);
      if (!sessionMap) {
        sessionMap = new Map();
        osiMap.set(row.nro_sesion, sessionMap);
      }
      sessionMap.set(row.step_key, row);
    }

    // Collect ALL missing step rows across OSIs/sessions/phases for a single batch upsert.
    const seedRows: {
      osi_id: number;
      nro_sesion: number;
      phase: string;
      step_key: string;
      completed: boolean;
    }[] = [];

    // Auto-advance upserts (en_proceso / ejecutado)
    const upserts: {
      osi_id: number;
      nro_sesion: number;
      phase: string;
      step_key: string;
      completed: boolean;
      completed_at: string | null;
    }[] = [];

    // Sessions map (osiId → OSISesion[]), built from the same resolution chain
    const sessionsByOsi = new Map<number, OSISesion[]>();

    for (const osi of osis) {
      const osiSesionRows = osiSesionByOsi.get(osi.id_osi);
      const sessions = resolveSessions(osi, osiSesionRows);
      // Build OSISesion[] mirroring getOSISessions priority logic
      sessionsByOsi.set(osi.id_osi, toOSISessions(osi, osiSesionRows));

      const osiStepsMap = stepsLookup.get(osi.id_osi) || new Map();

      // Collect missing step rows for batch seeding (replaces sequential ensureProcesoStepsExist calls)
      for (const session of sessions) {
        const existingSessionSteps = osiStepsMap.get(session.nro_sesion);
        const hasPlanificacion = existingSessionSteps?.["requisicion_enviada_admin"];
        if (!hasPlanificacion) {
          for (const key of getStepKeys("planificacion")) {
            seedRows.push({
              osi_id: osi.id_osi,
              nro_sesion: session.nro_sesion,
              phase: "planificacion",
              step_key: key,
              completed: false,
            });
          }
        }
        const hasEjecucion = existingSessionSteps?.["en_proceso"] || existingSessionSteps?.["ejecutado"];
        if (!hasEjecucion) {
          for (const key of getStepKeys("ejecucion")) {
            seedRows.push({
              osi_id: osi.id_osi,
              nro_sesion: session.nro_sesion,
              phase: "ejecucion",
              step_key: key,
              completed: false,
            });
          }
        }
      }

      for (const session of sessions) {
        const nroSesion = session.nro_sesion;
        const sessionSteps = osiStepsMap.get(nroSesion) || new Map();

        // Determine if this session's date is today/past or strictly past (date-only comparison)
        let isTodayOrPast = false;
        let isPast = false;
        if (session.fecha) {
          const sessionDateStr = session.fecha.split("T")[0];
          if (sessionDateStr <= todayStr) isTodayOrPast = true;
          if (sessionDateStr < todayStr) isPast = true;
        } else if (nroSesion === 1 && osi.fecha_inicio_real) {
          // Fallback to fecha_inicio_real for session 1 if session fecha is null
          const startDateStr = osi.fecha_inicio_real.split("T")[0];
          if (startDateStr <= todayStr) isTodayOrPast = true;
          if (startDateStr < todayStr) isPast = true;
        }

        // Auto-complete "en_proceso" if date is today or past
        if (isTodayOrPast) {
          const enProceso = sessionSteps.get("en_proceso");
          if (!enProceso || !enProceso.completed) {
            upserts.push({
              osi_id: osi.id_osi,
              nro_sesion: nroSesion,
              phase: "ejecucion",
              step_key: "en_proceso",
              completed: true,
              completed_at: enProceso?.completed_at || todayStr,
            });
          }
        }

        // Auto-complete "ejecutado" only if date is strictly past (autoUnmarkable: can be manually unmarked)
        if (isPast) {
          const ejecutado = sessionSteps.get("ejecutado");
          if (!ejecutado || !ejecutado.completed) {
            upserts.push({
              osi_id: osi.id_osi,
              nro_sesion: nroSesion,
              phase: "ejecucion",
              step_key: "ejecutado",
              completed: true,
              completed_at: ejecutado?.completed_at || todayStr,
            });
          }
        }
      }
    }

    // Single batch upsert for seeding (ignoreDuplicates → only inserts missing rows)
    if (seedRows.length > 0) {
      const { error: seedError } = await admin
        .from("capacitacion_proceso_steps")
        .upsert(seedRows, { onConflict: "osi_id,nro_sesion,phase,step_key", ignoreDuplicates: true });

      if (seedError) {
        console.error("Error seeding proceso steps (batch):", JSON.stringify(seedError, null, 2));
      }
    }

    if (upserts.length > 0) {
      const { error: upsertError } = await admin
        .from("capacitacion_proceso_steps")
        .upsert(upserts, { onConflict: "osi_id,nro_sesion,phase,step_key" });

      if (upsertError) {
        console.error("Error auto-advancing ejecucion steps:", JSON.stringify(upsertError, null, 2));
      }
    }

    // Re-fetch all steps AFTER seeding and auto-advance to ensure the return map
    // reflects the actual DB state (handles race conditions where facilitador uploads
    // auto-marked a step while this function was running).
    const { data: refreshedSteps } = await admin
      .from("capacitacion_proceso_steps")
      .select("*")
      .in("osi_id", osiIds);

    // Rebuild stepsLookup from the fresh fetch
    const freshLookup = new Map<number, Map<number, Map<string, ProcesoStepRecord>>>();
    for (const row of (refreshedSteps || []) as ProcesoStepRecord[]) {
      let osiMap = freshLookup.get(row.osi_id);
      if (!osiMap) {
        osiMap = new Map();
        freshLookup.set(row.osi_id, osiMap);
      }
      let sessionMap = osiMap.get(row.nro_sesion);
      if (!sessionMap) {
        sessionMap = new Map();
        osiMap.set(row.nro_sesion, sessionMap);
      }
      sessionMap.set(row.step_key, row);
    }

    // Build the returned steps map reflecting post-upsert state:
    // for each OSI/session, seed all step keys as incomplete defaults, overlay existing
    // DB rows (real ids + state), then overlay auto-advanced upserts.
    const stepsByOsi = new Map<number, Map<number, Record<string, ProcesoStepRecord>>>();

    for (const osi of osis) {
      const osiId = osi.id_osi;
      const osiMap = new Map<number, Record<string, ProcesoStepRecord>>();
      const existingOsiMap = freshLookup.get(osiId);
      const sessions = resolveSessions(osi, osiSesionByOsi.get(osiId));

      for (const session of sessions) {
        const nroSesion = session.nro_sesion;
        const sessionRec: Record<string, ProcesoStepRecord> = {};

        // Seed all step keys as incomplete defaults (id: 0 placeholder)
        for (const key of getStepKeys("planificacion")) {
          sessionRec[key] = {
            id: 0,
            osi_id: osiId,
            nro_sesion: nroSesion,
            phase: "planificacion",
            step_key: key,
            completed: false,
            completed_at: null,
            completed_by: null,
            notes: null,
          };
        }
        for (const key of getStepKeys("ejecucion")) {
          sessionRec[key] = {
            id: 0,
            osi_id: osiId,
            nro_sesion: nroSesion,
            phase: "ejecucion",
            step_key: key,
            completed: false,
            completed_at: null,
            completed_by: null,
            notes: null,
          };
        }

        // Overlay existing DB rows (real ids + state)
        const existingSession = existingOsiMap?.get(nroSesion);
        if (existingSession) {
          for (const [stepKey, record] of existingSession.entries()) {
            sessionRec[stepKey] = record;
          }
        }
        osiMap.set(nroSesion, sessionRec);
      }

      // Overlay auto-advanced upserts for this OSI
      for (const u of upserts) {
        if (u.osi_id !== osiId) continue;
        let sessionRec = osiMap.get(u.nro_sesion);
        if (!sessionRec) {
          sessionRec = {};
          osiMap.set(u.nro_sesion, sessionRec);
        }
        const prev = sessionRec[u.step_key];
        sessionRec[u.step_key] = {
          id: prev?.id ?? 0,
          osi_id: osiId,
          nro_sesion: u.nro_sesion,
          phase: u.phase,
          step_key: u.step_key,
          completed: u.completed,
          completed_at: u.completed_at,
          completed_by: prev?.completed_by ?? null,
          notes: prev?.notes ?? null,
        };
      }

      stepsByOsi.set(osiId, osiMap);
    }

    return { stepsByOsi, sessionsByOsi };
  } catch (err) {
    console.error("Unexpected error in autoAdvanceEjecucionSteps:", err);
    return emptyResult;
  }
}

// ─── Lista Asistencia ────────────────────────────────────────────────────────

/**
 * Fetch lista-asistencia info for an OSI (per-OSI, not per-session):
 *   - attachment_received flag from facilitador_osi_assignments
 *   - uploaded files from ejecucion_osi_asistencia (with public URLs)
 */
export async function getListaAsistenciaInfo(
  osiId: number,
  category?: string,
  nroSesion?: number,
): Promise<ListaAsistenciaInfo> {
  if (!Number.isFinite(osiId) || osiId <= 0) {
    return { attachment_received: false, attachment_received_at: null, attachments: [] };
  }

  try {
    const admin = await createAdminClient();

    // Find the assignment for this session (or the all-sessions fallback)
    let assignmentQuery = admin
      .from("facilitador_osi_assignments")
      .select("attachment_received, attachment_received_at, nro_sesion")
      .eq("osi_id", osiId)
      .eq("is_active", true);

    if (nroSesion != null) {
      assignmentQuery = assignmentQuery.eq("nro_sesion", nroSesion);
    }

    // Use limit(1) + take first to avoid maybeSingle() error when multiple rows exist
    const { data: assignmentRows } = await assignmentQuery.limit(1);
    const assignment = assignmentRows?.[0];

    // If no session-specific assignment, try the all-sessions (NULL) one
    let assignmentData = assignment;
    if (!assignmentData && nroSesion != null) {
      const { data: fallback } = await admin
        .from("facilitador_osi_assignments")
        .select("attachment_received, attachment_received_at, nro_sesion")
        .eq("osi_id", osiId)
        .eq("is_active", true)
        .is("nro_sesion", null)
        .maybeSingle();
      assignmentData = fallback ?? undefined;
    }

    let filesQuery = admin
      .from("ejecucion_osi_asistencia")
      .select("*")
      .eq("osi_id", osiId);

    if (category) {
      filesQuery = filesQuery.eq("category", category);
    }

    if (nroSesion != null) {
      // Include uploads for the specific session AND legacy uploads where nro_sesion is null
      filesQuery = filesQuery.or(`nro_sesion.eq.${nroSesion},nro_sesion.is.null`);
    }

    const { data: files, error: filesError } = await filesQuery.order("created_at", { ascending: false });

    if (filesError) {
      console.error("Error fetching asistencia files:", filesError);
    }

    const attachments: OSIAttachment[] = ((files || []) as Array<{
      id: string;
      osi_id: number | null;
      facilitador_id: number | null;
      storage_path: string;
      file_name: string;
      file_type: string;
      file_size: number | null;
      created_at: string | null;
      updated_at: string | null;
    }>).map((att) => {
      const { data: { publicUrl } } = admin
        .storage
        .from("facilitador-uploads")
        .getPublicUrl(att.storage_path);
      return { ...att, publicUrl } as OSIAttachment;
    });

    return {
      attachment_received: !!assignmentData?.attachment_received,
      attachment_received_at: assignmentData?.attachment_received_at ?? null,
      attachments,
    };
  } catch (err) {
    console.error("Unexpected error in getListaAsistenciaInfo:", err);
    return { attachment_received: false, attachment_received_at: null, attachments: [] };
  }
}

/**
 * Toggle the attachment_received flag on facilitador_osi_assignments (per-OSI).
 * Mirrors the shell's toggleOSIAttachmentReceived action.
 */
export async function toggleAttachmentReceived(
  osiId: number,
  nroSesion?: number | null,
): Promise<{ success: boolean; attachment_received?: boolean; error?: string }> {
  if (!Number.isFinite(osiId) || osiId <= 0) {
    return { success: false, error: "OSI inválido" };
  }

  try {
    const admin = await createAdminClient();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    // Find the active assignment for this OSI (and optionally a specific session)
    let findQuery = admin
      .from("facilitador_osi_assignments")
      .select("id, attachment_received, nro_sesion")
      .eq("osi_id", osiId)
      .eq("is_active", true);

    if (nroSesion != null) {
      // Try session-specific first, then fall back to all-sessions (NULL)
      findQuery = findQuery.eq("nro_sesion", nroSesion);
    }

    const { data: assignments, error: findError } = await findQuery.order("nro_sesion", { ascending: true, nullsFirst: false }).limit(1);

    let assignment = assignments?.[0];

    // If no session-specific assignment found, try the all-sessions (NULL) one
    if (!assignment && nroSesion != null) {
      const { data: fallback } = await admin
        .from("facilitador_osi_assignments")
        .select("id, attachment_received, nro_sesion")
        .eq("osi_id", osiId)
        .eq("is_active", true)
        .is("nro_sesion", null)
        .maybeSingle();
      assignment = fallback ?? undefined;
    }

    if (findError) {
      console.error("Error finding assignment for attachment toggle:", findError);
      return { success: false, error: "Error al buscar la asignación" };
    }

    if (!assignment) {
      return { success: false, error: "No hay facilitador asignado a esta OSI" };
    }

    const currentlyReceived = !!assignment.attachment_received;
    const newReceived = !currentlyReceived;

    const { error: updateError } = await admin
      .from("facilitador_osi_assignments")
      .update({
        attachment_received: newReceived,
        attachment_received_at: newReceived ? new Date().toISOString() : null,
        attachment_received_by: newReceived ? userId : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment.id);

    if (updateError) {
      console.error("Error toggling attachment_received:", updateError);
      return { success: false, error: "Error al actualizar el estado" };
    }

    return { success: true, attachment_received: newReceived };
  } catch (err) {
    console.error("Unexpected error in toggleAttachmentReceived:", err);
    return { success: false, error: "Error inesperado" };
  }
}

// ─── Unified (both phases) ───────────────────────────────────────────────────

/**
 * Batch fetch step completion records for multiple OSIs across BOTH phases.
 * Returns a nested map: osiId → nroSesion → stepKey → record.
 */
export async function getAllProcesoStepsBatch(
  osiIds: number[],
): Promise<Map<number, Map<number, Record<string, ProcesoStepRecord>>>> {
  const result = new Map<number, Map<number, Record<string, ProcesoStepRecord>>>();
  if (!osiIds.length) return result;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("capacitacion_proceso_steps")
      .select("*")
      .in("osi_id", osiIds);

    if (error) {
      console.error("Error fetching all proceso steps:", error);
      return result;
    }

    for (const row of (data || []) as ProcesoStepRecord[]) {
      let osiMap = result.get(row.osi_id);
      if (!osiMap) {
        osiMap = new Map();
        result.set(row.osi_id, osiMap);
      }
      let sessionMap = osiMap.get(row.nro_sesion);
      if (!sessionMap) {
        sessionMap = {};
        osiMap.set(row.nro_sesion, sessionMap);
      }
      sessionMap[row.step_key] = row;
    }
    return result;
  } catch (err) {
    console.error("Unexpected error in getAllProcesoStepsBatch:", err);
    return result;
  }
}

/**
 * Ensure all step rows (both phases) exist for an OSI/session.
 */
export async function ensureAllProcesoStepsExist(
  osiId: number,
  nroSesion: number = 1,
): Promise<void> {
  await ensureProcesoStepsExist(osiId, "planificacion", nroSesion);
  await ensureProcesoStepsExist(osiId, "ejecucion", nroSesion);
}

/**
 * Toggle a step's completion state, auto-detecting the phase from the step key.
 */
export async function toggleUnifiedStep(
  osiId: number,
  stepKey: string,
  nroSesion: number = 1,
  notes?: string,
): Promise<{ success: boolean; completed?: boolean; error?: string }> {
  const phase = getPhaseForStep(stepKey);
  if (!phase) {
    return { success: false, error: "Paso no reconocido" };
  }
  if (isAutoStepUnified(stepKey)) {
    return { success: false, error: "Este paso es automático y no puede ser modificado manualmente" };
  }
  return toggleProcesoStep(osiId, phase, stepKey, nroSesion, notes);
}

// ─── Session helpers for UI ──────────────────────────────────────────────────

/**
 * Extract per-session data from an OSI for UI display.
 * Priority: desglose_recursos_sesiones → sesiones_programadas → osi_sesion table.
 */
export async function getOSISessions(
  osiId: number,
  fallback?: {
    desglose_recursos_sesiones?: OSISesion[] | unknown[] | null;
    sesiones_programadas?: unknown[] | null;
  },
): Promise<OSISesion[]> {
  // 1. desglose_recursos_sesiones
  const desglose = fallback?.desglose_recursos_sesiones;
  if (Array.isArray(desglose) && desglose.length > 0) {
    return desglose as OSISesion[];
  }

  // 2. sesiones_programadas
  const programadas = fallback?.sesiones_programadas;
  if (Array.isArray(programadas) && programadas.length > 0) {
    return programadas.map((s, i) => {
      const row = s as Record<string, unknown>;
      return {
        id: i,
        id_sesion: i + 1,
        nro_sesion: (row.nro_sesion as number) ?? i + 1,
        fecha: (row.fecha as string) ?? null,
        hora_inicio: (row.hora_inicio as string) ?? null,
        hora_fin: (row.hora_fin as string) ?? null,
        costo_traslado: null,
        costo_impresion_material: null,
        horas_honorarios_instructor: null,
        tarifa_hora_honorarios: null,
        costo_honorarios_instructor: null,
      };
    });
  }

  // 3. osi_sesion table
  try {
    const admin = await createAdminClient();
    const { data } = await admin
      .from("osi_sesion")
      .select("id, id_osi, nro_sesion, fecha, hora_inicio, hora_fin")
      .eq("id_osi", osiId)
      .order("nro_sesion", { ascending: true });

    return ((data || []) as Array<{
      id: number;
      id_osi: number;
      nro_sesion: number;
      fecha: string;
      hora_inicio: string | null;
      hora_fin: string | null;
    }>).map((s) => ({
      id: s.id,
      id_sesion: s.id,
      nro_sesion: s.nro_sesion,
      fecha: s.fecha,
      hora_inicio: s.hora_inicio,
      hora_fin: s.hora_fin,
      costo_traslado: null,
      costo_impresion_material: null,
      horas_honorarios_instructor: null,
      tarifa_hora_honorarios: null,
      costo_honorarios_instructor: null,
    }));
  } catch (err) {
    console.error("Error fetching osi_sesion:", err);
    return [];
  }
}

// ─── Bulk backfill for completed OSIs ─────────────────────────────────────────

/**
 * One-time backfill: mark ALL process steps as completed for OSIs where
 * every session has already passed (no future session dates).
 * Intended for OSIs that were completed before the steps system existed.
 */
export async function bulkCompleteStepsForFinishedOsis(): Promise<{
  success: boolean;
  osisProcessed?: number;
  stepsMarked?: number;
  error?: string;
}> {
  try {
    const admin = await createAdminClient();
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // 1. Fetch all capacitacion OSIs (non-pending)
    const { data: osis, error: osiError } = await admin
      .from("v_osi_formato_completo")
      .select("id_osi, fecha_inicio_real, desglose_recursos_sesiones, sesiones_programadas")
      .ilike("tipo_servicio", "%capacitacion%")
      .not("nro_osi", "ilike", "%PEN-%");

    if (osiError) {
      console.error("Error fetching OSIs for backfill:", osiError);
      return { success: false, error: "Error al obtener OSIs" };
    }

    if (!osis || osis.length === 0) {
      return { success: true, osisProcessed: 0, stepsMarked: 0 };
    }

    // 2. Fetch osi_sesion rows as fallback for session dates
    const osiIds = osis.map((o: any) => o.id_osi);
    const osiSesionByOsi = new Map<number, { nro_sesion: number; fecha: string | null; hora_inicio: string | null; hora_fin: string | null }[]>();
    try {
      const { data: sesionRows } = await admin
        .from("osi_sesion")
        .select("id_osi, nro_sesion, fecha, hora_inicio, hora_fin")
        .in("id_osi", osiIds)
        .order("nro_sesion", { ascending: true });
      if (sesionRows) {
        for (const row of sesionRows as any[]) {
          const list = osiSesionByOsi.get(row.id_osi) || [];
          list.push({ nro_sesion: row.nro_sesion, fecha: row.fecha, hora_inicio: row.hora_inicio, hora_fin: row.hora_fin });
          osiSesionByOsi.set(row.id_osi, list);
        }
      }
    } catch (e) {
      console.error("Error fetching osi_sesion for backfill:", e);
    }

    // 3. Determine which OSIs have all sessions past
    const finishedOsiIds: number[] = [];
    for (const osi of osis as any[]) {
      const sessions = resolveSessions(osi, osiSesionByOsi.get(osi.id_osi));
      const allPast = sessions.every((s) => {
        if (s.fecha) {
          const sessionDateStr = s.fecha.split("T")[0];
          return sessionDateStr <= todayStr;
        }
        return false;
      });
      // Also accept OSIs with fecha_inicio_real in the past and no session dates
      if (!allPast && sessions.length === 1 && !sessions[0].fecha && osi.fecha_inicio_real) {
        const startDateStr = osi.fecha_inicio_real.split("T")[0];
        if (startDateStr <= todayStr) {
          finishedOsiIds.push(osi.id_osi);
          continue;
        }
      }
      if (allPast) {
        finishedOsiIds.push(osi.id_osi);
      }
    }

    if (finishedOsiIds.length === 0) {
      return { success: true, osisProcessed: 0, stepsMarked: 0 };
    }

    // 4. Fetch existing step rows for these OSIs
    const { data: existingSteps } = await admin
      .from("capacitacion_proceso_steps")
      .select("*")
      .in("osi_id", finishedOsiIds);

    // Build lookup: osiId → nroSesion → stepKey → record
    const stepsLookup = new Map<number, Map<number, Map<string, ProcesoStepRecord>>>();
    for (const row of (existingSteps || []) as ProcesoStepRecord[]) {
      let osiMap = stepsLookup.get(row.osi_id);
      if (!osiMap) { osiMap = new Map(); stepsLookup.set(row.osi_id, osiMap); }
      let sessionMap = osiMap.get(row.nro_sesion);
      if (!sessionMap) { sessionMap = new Map(); osiMap.set(row.nro_sesion, sessionMap); }
      sessionMap.set(row.step_key, row);
    }

    // 5. Build upserts: mark all steps as completed for all sessions of finished OSIs
    const upserts: {
      osi_id: number;
      nro_sesion: number;
      phase: string;
      step_key: string;
      completed: boolean;
      completed_at: string | null;
    }[] = [];

    for (const osiId of finishedOsiIds) {
      const osi = (osis as any[]).find((o) => o.id_osi === osiId)!;
      const sessions = resolveSessions(osi, osiSesionByOsi.get(osiId));
      const osiMap = stepsLookup.get(osiId) || new Map();

      for (const session of sessions) {
        const nroSesion = session.nro_sesion;
        const sessionMap = osiMap.get(nroSesion) || new Map();

        for (const step of ALL_STEPS) {
          const existing = sessionMap.get(step.key);
          if (existing?.completed) continue;
          upserts.push({
            osi_id: osiId,
            nro_sesion: nroSesion,
            phase: step.phase,
            step_key: step.key,
            completed: true,
            completed_at: existing?.completed_at || todayStr,
          });
        }
      }
    }

    if (upserts.length > 0) {
      const { error: upsertError } = await admin
        .from("capacitacion_proceso_steps")
        .upsert(upserts, { onConflict: "osi_id,nro_sesion,phase,step_key" });

      if (upsertError) {
        console.error("Error bulk completing steps:", JSON.stringify(upsertError, null, 2));
        return { success: false, error: "Error al marcar pasos" };
      }
    }

    return {
      success: true,
      osisProcessed: finishedOsiIds.length,
      stepsMarked: upserts.length,
    };
  } catch (err) {
    console.error("Unexpected error in bulkCompleteStepsForFinishedOsis:", err);
    return { success: false, error: "Error inesperado" };
  }
}
