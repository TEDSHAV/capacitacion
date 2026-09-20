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
  isPostServiceOrSubsequentStep,
} from "@/lib/proceso-steps";
import type { OSIAttachment, OSISesion, OSIManagement, OSIFilters } from "@/types";
import { getOSIsForManagement } from "@/app/actions/osi";
import {
  syncOsiEjecutadoToShell,
  recalcOsiEstatusFromSteps,
  resolveOsiSesion,
  getPreviousSessionStatus,
  OSI_ESTATUS,
} from "@/lib/sync/sync-osi-estatus";
import { addOsiNota } from "@/app/actions/capacitacion-osi-notas";

/**
 * Returns current date in Venezuela timezone (America/Caracas, UTC-4) as YYYY-MM-DD.
 */
function getCaracasTodayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

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
): Promise<{ success: boolean; completed?: boolean; autoCompletedEnProceso?: boolean; error?: string }> {
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
      .select("id, completed, step_metadata, notes")
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

    const existingMeta = (existing?.step_metadata as Record<string, unknown> | null) || {};
    let finalNotes: string | null = null;
    const finalMetadata: Record<string, unknown> = { ...existingMeta };

    if (newCompleted) {
      finalNotes = notes ?? null;
      if (notes?.trim()) {
        finalMetadata.guia = notes.trim();
      }
      if (stepKey === "en_proceso") {
        finalMetadata.unmarked_by_user = false;
        finalMetadata.is_rescheduled = false;
      }
    } else {
      // Unmarking
      if (stepKey === "en_proceso") {
        finalNotes = notes?.trim() || existing?.notes || "Desmarcado manual";
        finalMetadata.unmarked_by_user = true;
        finalMetadata.unmark_reason = finalNotes;
        finalMetadata.unmarked_at = now;
        finalMetadata.unmarked_by = userId;
      } else {
        finalNotes = null;
        delete finalMetadata.guia;
      }
    }

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

    // Sync `en_proceso` step (En proceso/Ejecutado) to the shell's OSI status tables
    // (best-effort). Marking = EJECUTADO, unmarking = NO_EJECUTADA. The sync resolves
    // the session date internally from osi_sesion / sesiones_programadas.
    if (stepKey === "en_proceso") {
      await syncOsiEjecutadoToShell(osiId, nroSesion, newCompleted).catch((err) =>
        console.error("[toggleProcesoStep] syncOsiEjecutadoToShell failed:", err),
      );
    }

    // Guard clause: if any post-service or subsequent execution step is marked completed,
    // that is definitive proof the service took place. Auto-mark `en_proceso` as completed.
    let autoCompletedEnProceso = false;
    if (newCompleted && isPostServiceOrSubsequentStep(stepKey)) {
      const { data: enProcesoRow } = await supabase
        .from("capacitacion_proceso_steps")
        .select("id, completed, step_metadata")
        .eq("osi_id", osiId)
        .eq("phase", "ejecucion")
        .eq("nro_sesion", nroSesion)
        .eq("step_key", "en_proceso")
        .maybeSingle();

      if (!enProcesoRow?.completed) {
        const enProcesoMeta = (enProcesoRow?.step_metadata as Record<string, unknown> | null) || {};
        await supabase
          .from("capacitacion_proceso_steps")
          .upsert(
            {
              osi_id: osiId,
              nro_sesion: nroSesion,
              phase: "ejecucion",
              step_key: "en_proceso",
              completed: true,
              completed_at: now,
              completed_by: userId,
              step_metadata: {
                ...enProcesoMeta,
                unmarked_by_user: false,
                is_rescheduled: false,
                auto_completed_reason: `Guard clause triggered by ${stepKey}`,
              },
            },
            { onConflict: "osi_id,nro_sesion,phase,step_key" },
          );

        await syncOsiEjecutadoToShell(osiId, nroSesion, true).catch((err) =>
          console.error("[toggleProcesoStep] guard clause syncOsiEjecutadoToShell failed:", err),
        );
        autoCompletedEnProceso = true;
      }
    }

    return { success: true, completed: newCompleted, autoCompletedEnProceso };
  } catch (err) {
    console.error("Unexpected error in toggleProcesoStep:", err);
    return { success: false, error: "Error inesperado" };
  }
}

// ─── Auto-advance for Ejecucion ──────────────────────────────────────────────

/**
 * Result of auto-advancing ejecucion steps for a batch of OSIs.
 * - stepsByOsi: osiId → nroSesion → stepKey → record (reflects post-upsert state,
 *   including seeded rows and auto-completed en_proceso).
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
 *   - If session fecha is today or past, mark "en_proceso" (En proceso/Ejecutado) as completed
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
    const todayStr = getCaracasTodayStr();

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

    // Auto-advance upserts (en_proceso)
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
        const hasEjecucion = existingSessionSteps?.["en_proceso"];
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

        // Determine if this session's date is today or past (date-only comparison in Caracas timezone)
        let isTodayOrPast = false;
        if (session.fecha) {
          const sessionDateStr = session.fecha.split("T")[0];
          if (sessionDateStr <= todayStr) isTodayOrPast = true;
        } else if (nroSesion === 1 && osi.fecha_inicio_real) {
          // Fallback to fecha_inicio_real for session 1 if session fecha is null
          const startDateStr = osi.fecha_inicio_real.split("T")[0];
          if (startDateStr <= todayStr) isTodayOrPast = true;
        }

        // Guard clause: check if ANY post-service step is already completed
        let anyPostServiceCompleted = false;
        for (const [key, stepRec] of sessionSteps.entries()) {
          if (key !== "en_proceso" && stepRec.completed && isPostServiceOrSubsequentStep(key)) {
            anyPostServiceCompleted = true;
            break;
          }
        }

        const enProceso = sessionSteps.get("en_proceso");
        const isAlreadyCompleted = !!enProceso?.completed;
        const meta = (enProceso?.step_metadata as Record<string, unknown> | null) || {};
        const isManuallyUnmarked = !!meta.unmarked_by_user;

        // Auto-complete "en_proceso" (En proceso/Ejecutado) if:
        // 1. Guard clause: a post-service step is completed (proof that service was executed).
        // 2. Date is today or past, step is not completed, and was NOT manually unmarked by a user.
        if (!isAlreadyCompleted) {
          if (anyPostServiceCompleted) {
            upserts.push({
              osi_id: osi.id_osi,
              nro_sesion: nroSesion,
              phase: "ejecucion",
              step_key: "en_proceso",
              completed: true,
              completed_at: enProceso?.completed_at || todayStr,
            });
          } else if (isTodayOrPast && !isManuallyUnmarked) {
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

    // Sync auto-advanced `en_proceso` steps to the shell's OSI status tables.
    // Only the `en_proceso` step_key triggers the shell sync (best-effort).
    // Group by osiId to call recalcOsiEstatusFromSteps once per OSI after
    // all its sessions are synced.
    const enProcesoUpsertsByOsi = new Map<number, Array<{ nro_sesion: number; sessionDate: string | null }>>();
    for (const u of upserts) {
      if (u.step_key !== "en_proceso" || !u.completed) continue;
      const osi = osis.find((o) => o.id_osi === u.osi_id);
      if (!osi) continue;
      const sessions = sessionsByOsi.get(u.osi_id) || [];
      const session = sessions.find((s) => s.nro_sesion === u.nro_sesion);
      const sessionDate = session?.fecha ?? null;
      const list = enProcesoUpsertsByOsi.get(u.osi_id) || [];
      list.push({ nro_sesion: u.nro_sesion, sessionDate });
      enProcesoUpsertsByOsi.set(u.osi_id, list);
    }

    // Sync auto-advanced `en_proceso` steps to the shell's OSI status tables in parallel.
    // Each call is independent (different osiId/nroSesion pairs); recalcOsiEstatusFromSteps
    // is idempotent so concurrent calls for the same OSI produce the same final status.
    // Fire-and-forget: the page doesn't depend on the sync result (the steps map is built
    // from stepsLookup + upserts in memory below). The sync completes in the background.
    const syncPromises: Promise<void>[] = [];
    for (const [osiId, sessions] of enProcesoUpsertsByOsi) {
      for (const { nro_sesion, sessionDate } of sessions) {
        syncPromises.push(
          syncOsiEjecutadoToShell(osiId, nro_sesion, true, sessionDate).catch((err) =>
            console.error("[autoAdvanceEjecucionSteps] syncOsiEjecutadoToShell failed:", err),
          ),
        );
      }
    }
    if (syncPromises.length > 0) {
      Promise.all(syncPromises).catch((err) =>
        console.error("[autoAdvanceEjecucionSteps] sync chain failed:", err),
      );
    }

    // Build the returned steps map from the existing stepsLookup + applied upserts
    // (no re-fetch needed — we already have the pre-upsert state and know exactly what
    // we upserted). Overlay upserts onto stepsLookup in memory.
    for (const u of upserts) {
      let osiMap = stepsLookup.get(u.osi_id);
      if (!osiMap) {
        osiMap = new Map();
        stepsLookup.set(u.osi_id, osiMap);
      }
      let sessionMap = osiMap.get(u.nro_sesion);
      if (!sessionMap) {
        sessionMap = new Map();
        osiMap.set(u.nro_sesion, sessionMap);
      }
      const prev = sessionMap.get(u.step_key);
      sessionMap.set(u.step_key, {
        id: prev?.id ?? 0,
        osi_id: u.osi_id,
        nro_sesion: u.nro_sesion,
        phase: u.phase,
        step_key: u.step_key,
        completed: u.completed,
        completed_at: u.completed_at,
        completed_by: prev?.completed_by ?? null,
        notes: prev?.notes ?? null,
        step_metadata: {
          ...((prev?.step_metadata as Record<string, unknown> | null) || {}),
          unmarked_by_user: false,
          is_rescheduled: false,
        },
      });
    }
    // Also overlay seeded rows (id: 0 placeholders) so the return map includes them
    for (const s of seedRows) {
      let osiMap = stepsLookup.get(s.osi_id);
      if (!osiMap) {
        osiMap = new Map();
        stepsLookup.set(s.osi_id, osiMap);
      }
      let sessionMap = osiMap.get(s.nro_sesion);
      if (!sessionMap) {
        sessionMap = new Map();
        osiMap.set(s.nro_sesion, sessionMap);
      }
      if (!sessionMap.has(s.step_key)) {
        sessionMap.set(s.step_key, {
          id: 0,
          osi_id: s.osi_id,
          nro_sesion: s.nro_sesion,
          phase: s.phase,
          step_key: s.step_key,
          completed: false,
          completed_at: null,
          completed_by: null,
          notes: null,
        });
      }
    }

    // Build the returned steps map reflecting post-upsert state:
    // for each OSI/session, seed all step keys as incomplete defaults, overlay existing
    // DB rows (real ids + state), then overlay auto-advanced upserts.
    const stepsByOsi = new Map<number, Map<number, Record<string, ProcesoStepRecord>>>();

    for (const osi of osis) {
      const osiId = osi.id_osi;
      const osiMap = new Map<number, Record<string, ProcesoStepRecord>>();
      const existingOsiMap = stepsLookup.get(osiId);
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

        // Overlay existing DB rows (real ids + state) — this now includes
        // upserted rows since we overlaid them onto stepsLookup in memory above.
        const existingSession = existingOsiMap?.get(nroSesion);
        if (existingSession) {
          for (const [stepKey, record] of existingSession.entries()) {
            sessionRec[stepKey] = record;
          }
        }
        osiMap.set(nroSesion, sessionRec);
      }

      stepsByOsi.set(osiId, osiMap);
    }

    return { stepsByOsi, sessionsByOsi };
  } catch (err) {
    console.error("Unexpected error in autoAdvanceEjecucionSteps:", err);
    return emptyResult;
  }
}

// ─── Consolidated Page Data for Seguimiento ─────────────────────────────────

export interface SeguimientoPageData {
  osis: OSIManagement[];
  totalCount: number;
  stepsPlain: Record<string, Record<string, Record<string, ProcesoStepRecord>>>;
  sessionsPlain: Record<string, OSISesion[]>;
}

function serializeAutoAdvanceResult(autoResult: AutoAdvanceResult): {
  stepsPlain: Record<string, Record<string, Record<string, ProcesoStepRecord>>>;
  sessionsPlain: Record<string, OSISesion[]>;
} {
  const stepsPlain: Record<string, Record<string, Record<string, ProcesoStepRecord>>> = {};
  for (const [osiId, sessionMap] of autoResult.stepsByOsi.entries()) {
    const sessionObj: Record<string, Record<string, ProcesoStepRecord>> = {};
    for (const [nroSesion, steps] of sessionMap.entries()) {
      sessionObj[String(nroSesion)] = steps;
    }
    stepsPlain[String(osiId)] = sessionObj;
  }

  const sessionsPlain: Record<string, OSISesion[]> = {};
  for (const [osiId, sessions] of autoResult.sessionsByOsi.entries()) {
    sessionsPlain[String(osiId)] = sessions;
  }

  return { stepsPlain, sessionsPlain };
}

/**
 * Consolidated server action that fetches OSIs for management AND runs autoAdvanceEjecucionSteps
 * in a single server-side operation, eliminating the client-side waterfall.
 */
export async function getSeguimientoPageData(
  filters: OSIFilters = {},
  page = 1,
  limit = 10,
): Promise<SeguimientoPageData> {
  const result = await getOSIsForManagement(filters, page, limit);
  const osis = (result.osis || []) as OSIManagement[];

  if (osis.length === 0) {
    return {
      osis: [],
      totalCount: result.totalCount || 0,
      stepsPlain: {},
      sessionsPlain: {},
    };
  }

  const autoResult = await autoAdvanceEjecucionSteps(
    osis.map((o) => ({
      id_osi: o.id_osi,
      fecha_inicio_real: o.fecha_inicio_real ?? null,
      desglose_recursos_sesiones: o.desglose_recursos_sesiones ?? null,
      sesiones_programadas: o.sesiones_programadas ?? null,
    })),
  );

  const { stepsPlain, sessionsPlain } = serializeAutoAdvanceResult(autoResult);

  return {
    osis,
    totalCount: result.totalCount,
    stepsPlain,
    sessionsPlain,
  };
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
): Promise<{ success: boolean; completed?: boolean; autoCompletedEnProceso?: boolean; error?: string }> {
  const phase = getPhaseForStep(stepKey);
  if (!phase) {
    return { success: false, error: "Paso no reconocido" };
  }
  if (isAutoStepUnified(stepKey)) {
    return { success: false, error: "Este paso es automático y no puede ser modificado manualmente" };
  }
  return toggleProcesoStep(osiId, phase, stepKey, nroSesion, notes);
}

/**
 * Unmark "en_proceso" step with an obligatory reason/justification and optional rescheduled flag.
 * Registers an audit note in capacitacion_osi_notas and syncs to shell as NO_EJECUTADA.
 */
export async function unmarkEnProcesoStep({
  osiId,
  nroSesion,
  reason,
  isRescheduled = false,
  newDate = null,
}: {
  osiId: number;
  nroSesion: number;
  reason: string;
  isRescheduled?: boolean;
  newDate?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(osiId) || osiId <= 0) {
    return { success: false, error: "OSI inválido" };
  }
  const trimmedReason = (reason || "").trim();
  if (!trimmedReason) {
    return { success: false, error: "Debe ingresar el motivo del desmarcado" };
  }

  const cleanNewDate = isRescheduled && newDate?.trim() ? newDate.trim() : null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const now = new Date().toISOString();

    // Ensure step rows exist
    await ensureProcesoStepsExist(osiId, "ejecucion", nroSesion);

    // If a new date was defined, update the planned date on osi_sesion
    if (cleanNewDate) {
      const admin = await createAdminClient();
      await admin
        .from("osi_sesion")
        .update({ fecha: cleanNewDate })
        .eq("id_osi", osiId)
        .eq("nro_sesion", nroSesion);
    }

    // Get current record to preserve other metadata if present
    const { data: existing } = await supabase
      .from("capacitacion_proceso_steps")
      .select("id, step_metadata")
      .eq("osi_id", osiId)
      .eq("phase", "ejecucion")
      .eq("nro_sesion", nroSesion)
      .eq("step_key", "en_proceso")
      .maybeSingle();

    const currentMeta = (existing?.step_metadata as Record<string, unknown> | null) || {};
    const updatedMeta = {
      ...currentMeta,
      unmarked_by_user: true,
      unmark_reason: trimmedReason,
      unmarked_at: now,
      unmarked_by: userId,
      is_rescheduled: !!isRescheduled,
      new_date: cleanNewDate,
      date_confirmed: !!cleanNewDate,
    };

    const { error: updateError } = await supabase
      .from("capacitacion_proceso_steps")
      .upsert(
        {
          osi_id: osiId,
          nro_sesion: nroSesion,
          phase: "ejecucion",
          step_key: "en_proceso",
          completed: false,
          completed_at: null,
          completed_by: null,
          notes: trimmedReason,
          step_metadata: updatedMeta,
        },
        { onConflict: "osi_id,nro_sesion,phase,step_key" },
      );

    if (updateError) {
      console.error("[unmarkEnProcesoStep] updateError:", updateError);
      return { success: false, error: "Error al desmarcar el paso" };
    }

    // Sync to shell status as REAGENDADO (46) or NO_EJECUTADA (39)
    await syncOsiEjecutadoToShell(osiId, nroSesion, false, cleanNewDate, isRescheduled).catch((err) =>
      console.error("[unmarkEnProcesoStep] syncOsiEjecutadoToShell failed:", err),
    );

    // Add audit note to capacitacion_osi_notas
    const noteText = isRescheduled
      ? `[Desmarcado En proceso/Ejecutado - Sesión ${nroSesion}] Motivo: ${trimmedReason}. Re-agendado${
          cleanNewDate ? ` para el: ${cleanNewDate}` : " (Fecha por confirmar)"
        }`
      : `[Desmarcado En proceso/Ejecutado - Sesión ${nroSesion}] Motivo: ${trimmedReason}`;
    await addOsiNota(osiId, noteText).catch((err) =>
      console.error("[unmarkEnProcesoStep] addOsiNota failed:", err),
    );

    return { success: true };
  } catch (err) {
    console.error("[unmarkEnProcesoStep] unexpected error:", err);
    return { success: false, error: "Error inesperado al desmarcar el paso" };
  }
}

/**
 * Restore an OSI that was rescheduled back to Activos (clears is_rescheduled).
 */
export async function restoreRescheduledToActivos(
  osiId: number,
  nroSesion?: number,
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(osiId) || osiId <= 0) {
    return { success: false, error: "OSI inválido" };
  }

  try {
    const supabase = await createClient();

    let query = supabase
      .from("capacitacion_proceso_steps")
      .select("id, nro_sesion, step_metadata")
      .eq("osi_id", osiId)
      .eq("phase", "ejecucion")
      .eq("step_key", "en_proceso");

    if (nroSesion !== undefined) {
      query = query.eq("nro_sesion", nroSesion);
    }

    const { data: rows, error } = await query;
    if (error || !rows || rows.length === 0) {
      return { success: false, error: "No se encontró el registro" };
    }

    for (const row of rows) {
      const meta = (row.step_metadata as Record<string, unknown> | null) || {};
      const updatedMeta = {
        ...meta,
        is_rescheduled: false,
        unmarked_by_user: false,
        restored_at: new Date().toISOString(),
      };
      await supabase
        .from("capacitacion_proceso_steps")
        .update({ step_metadata: updatedMeta })
        .eq("id", row.id);
    }

    // Sync session and OSI-level status in shell back to PENDIENTE (10)
    const admin = await createAdminClient();
    for (const row of rows) {
      const session = await resolveOsiSesion(admin, osiId, row.nro_sesion);
      if (session) {
        const prevStatusId = await getPreviousSessionStatus(admin, session.id);
        await admin.from("historial_cambios_estado").insert({
          tabla_afectada: "osi_sesion",
          id_registro: session.id,
          id_estatus_anterior: prevStatusId,
          id_estatus_nuevo: OSI_ESTATUS.PENDIENTE,
          fecha_cambio: new Date().toISOString(),
          id_usuario_cambio: null,
        });
      }
    }
    await recalcOsiEstatusFromSteps(admin, osiId).catch((err) =>
      console.error("[restoreRescheduledToActivos] recalcOsiEstatusFromSteps failed:", err),
    );

    // Add note to capacitacion_osi_notas
    const noteText = nroSesion
      ? `[Servicio reactivado - Sesión ${nroSesion}] La OSI ha sido retornada a la pestaña de Activos.`
      : `[Servicio reactivado] La OSI ha sido retornada a la pestaña de Activos.`;
    await addOsiNota(osiId, noteText).catch((err) =>
      console.error("[restoreRescheduledToActivos] addOsiNota failed:", err),
    );

    return { success: true };
  } catch (err) {
    console.error("[restoreRescheduledToActivos] unexpected error:", err);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Fetch list of distinct osi_ids that have any session marked as rescheduled and not yet completed.
 */
export async function getRescheduledOsiIds(): Promise<number[]> {
  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("capacitacion_proceso_steps")
      .select("osi_id, step_metadata")
      .eq("step_key", "en_proceso")
      .eq("completed", false);

    if (error || !data) return [];

    const ids = new Set<number>();
    for (const row of data) {
      const meta = row.step_metadata as Record<string, unknown> | null;
      if (meta?.is_rescheduled === true || meta?.is_rescheduled === "true") {
        ids.add(row.osi_id);
      }
    }
    return Array.from(ids);
  } catch (err) {
    console.error("Error fetching rescheduled OSI ids:", err);
    return [];
  }
}

// ─── Auto-mark from requisicion externa creation ─────────────────────────────

/**
 * Idempotently mark the `requisicion_enviada_admin` planificacion step as
 * completed for the given OSI sessions. Called when an externa requisicion is
 * created — the selected sessions get the first planificacion step auto-marked
 * in the seguimiento-servicios workflow.
 *
 * Best-effort: errors are logged and never thrown, so a failure here won't
 * block requisicion creation.
 *
 * @param sessions Array of { osiId, nroSesion } pairs identifying which
 *                 OSI sessions to mark. Only the specified sessions are
 *                 marked (not all sessions of the OSI).
 */
export async function markRequisicionEnviadaAdminForSessions(
  sessions: { osiId: number; nroSesion: number }[],
): Promise<{ success: boolean; sessionsMarked?: number; error?: string }> {
  if (!sessions.length) return { success: true, sessionsMarked: 0 };

  try {
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    const userId = user?.id ?? null;

    const admin = await createAdminClient();
    const now = new Date().toISOString();
    const planificacionKeys = getStepKeys("planificacion");

    // 1. Batch seed all planificacion step rows for each session (ignoreDuplicates
    //    so existing rows are untouched).
    const seedRows = sessions.flatMap(({ osiId, nroSesion }) =>
      planificacionKeys.map((key) => ({
        osi_id: osiId,
        nro_sesion: nroSesion,
        phase: "planificacion" as const,
        step_key: key,
        completed: false,
      })),
    );

    const { error: seedError } = await admin
      .from("capacitacion_proceso_steps")
      .upsert(seedRows, {
        onConflict: "osi_id,nro_sesion,phase,step_key",
        ignoreDuplicates: true,
      });

    if (seedError) {
      console.error("[markRequisicionEnviadaAdminForSessions] seed error:", seedError);
    }

    // 2. Batch upsert requisicion_enviada_admin as completed for each session.
    //    Uses onConflict WITHOUT ignoreDuplicates so existing rows get updated
    //    to completed=true (idempotent).
    const markRows = sessions.map(({ osiId, nroSesion }) => ({
      osi_id: osiId,
      nro_sesion: nroSesion,
      phase: "planificacion" as const,
      step_key: "requisicion_enviada_admin",
      completed: true,
      completed_at: now,
      completed_by: userId,
      notes: "Auto-marcada por creación de requisición externa",
    }));

    const { error: markError } = await admin
      .from("capacitacion_proceso_steps")
      .upsert(markRows, {
        onConflict: "osi_id,nro_sesion,phase,step_key",
      });

    if (markError) {
      console.error("[markRequisicionEnviadaAdminForSessions] mark error:", markError);
      return { success: false, error: markError.message };
    }

    return { success: true, sessionsMarked: sessions.length };
  } catch (err) {
    console.error("[markRequisicionEnviadaAdminForSessions] unexpected error:", err);
    return { success: false, error: "Error inesperado" };
  }
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
