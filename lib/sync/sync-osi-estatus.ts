import { createAdminClient } from "@/utils/supabase/server";

/**
 * Sync bridge: when capacitacion's `ejecutado` step is toggled (manually or
 * auto-advanced), mirror the change into the shell's OSI status tables so the
 * shell's `consulta-osi` view stays in sync without any shell code changes.
 *
 * Both apps share the same Supabase project and capacitacion holds the
 * service-role key, so we write directly to:
 *   - `osi_sesion`         (per-session execution date)
 *   - `historial_cambios_estado` (per-session status history)
 *   - `ejecucion_osi`      (OSI-level id_estatus aggregation)
 *
 * All operations are best-effort: errors are logged but never thrown, so a
 * sync failure never blocks the capacitacion step toggle.
 */

// ─── Status IDs (conf_estatus, aligned with shell's OSI_PREVIEW_ESTATUS) ────
export const OSI_ESTATUS = {
  PENDIENTE: 10,
  EN_PROCESO: 11,
  EJECUTADO: 12,
  NO_EJECUTADA: 39,
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function is_missing_column_error(error: {
  message?: string;
  code?: string;
} | null): boolean {
  if (!error) return false;
  const msg = String(error.message ?? "").toLowerCase();
  return (
    msg.includes("fecha_ejecutada") ||
    msg.includes("ejecutada_en_fecha_planificada") ||
    (msg.includes("column") && msg.includes("does not exist")) ||
    error.code === "42703" ||
    error.code === "PGRST204"
  );
}

/**
 * Resolve the osi_sesion row for a given OSI + nro_sesion.
 * If no row exists, try to materialize one from ejecucion_osi.sesiones_programadas
 * (mirrors the shell's ensure_osi_sesiones_from_programadas behavior).
 * Returns { id, fecha, hora_inicio } or null if the session can't be resolved.
 */
async function resolveOsiSesion(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  osiId: number,
  nroSesion: number,
): Promise<{ id: number; fecha: string | null; hora_inicio: string | null } | null> {
  // 1. Try existing osi_sesion row
  const { data: existing, error } = await admin
    .from("osi_sesion")
    .select("id, fecha, hora_inicio")
    .eq("id_osi", osiId)
    .eq("nro_sesion", nroSesion)
    .maybeSingle();

  if (!error && existing) {
    return {
      id: existing.id as number,
      fecha: existing.fecha as string | null,
      hora_inicio: existing.hora_inicio as string | null,
    };
  }

  // 2. Materialize from sesiones_programadas if possible
  const { data: osiRow } = await admin
    .from("ejecucion_osi")
    .select("sesiones_programadas")
    .eq("id", osiId)
    .maybeSingle();

  const programmed = Array.isArray(osiRow?.sesiones_programadas)
    ? (osiRow!.sesiones_programadas as Array<Record<string, unknown>>)
    : [];

  const entry = programmed.find(
    (_, i) => i + 1 === nroSesion, // sesiones_programadas is 0-indexed, nro_sesion is 1-indexed
  );
  // Also try matching by explicit nro_sesion field in the JSON
  const byField = programmed.find(
    (item) => Number(item.nro_sesion) === nroSesion,
  );
  const source = byField ?? entry;
  if (!source) return null;

  const fecha =
    typeof source.fecha === "string" ? source.fecha.trim() : "";
  if (!fecha) return null;

  const horaInicio =
    typeof source.hora_inicio === "string" ? source.hora_inicio : null;

  const { data: inserted, error: insertError } = await admin
    .from("osi_sesion")
    .upsert(
      {
        id_osi: osiId,
        nro_sesion: nroSesion,
        fecha,
        hora_inicio: horaInicio,
        hora_fin:
          typeof source.hora_fin === "string" ? source.hora_fin : null,
      },
      { onConflict: "id_osi,nro_sesion", ignoreDuplicates: true },
    )
    .select("id, fecha, hora_inicio")
    .eq("id_osi", osiId)
    .eq("nro_sesion", nroSesion)
    .maybeSingle();

  if (insertError || !inserted) {
    // Fall back to a re-read in case ignoreDuplicates skipped the insert
    const { data: refetched } = await admin
      .from("osi_sesion")
      .select("id, fecha, hora_inicio")
      .eq("id_osi", osiId)
      .eq("nro_sesion", nroSesion)
      .maybeSingle();
    if (!refetched) return null;
    return {
      id: refetched.id as number,
      fecha: refetched.fecha as string | null,
      hora_inicio: refetched.hora_inicio as string | null,
    };
  }

  return {
    id: inserted.id as number,
    fecha: inserted.fecha as string | null,
    hora_inicio: inserted.hora_inicio as string | null,
  };
}

/**
 * Look up the previous status id for a session from historial_cambios_estado.
 */
async function getPreviousSessionStatus(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  sessionId: number,
): Promise<number | null> {
  const { data } = await admin
    .from("historial_cambios_estado")
    .select("id_estatus_nuevo")
    .eq("tabla_afectada", "osi_sesion")
    .eq("id_registro", sessionId)
    .order("fecha_cambio", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.id_estatus_nuevo as number | null) ?? null;
}

/**
 * Recalculate and update the OSI-level id_estatus based on how many sessions
 * have the `en_proceso` step (En proceso/Ejecutado) completed in capacitacion_proceso_steps.
 *
 *   ALL sessions en_proceso  → 12 (EJECUTADO)
 *   SOME sessions en_proceso → 11 (EN_PROCESO)
 *   NONE sessions en_proceso → 39 (NO_EJECUTADA)
 *
 * Skipped (no-op) when there are no seeded `en_proceso` step rows for the OSI,
 * to avoid clobbering shell-managed pre-execution statuses for legacy OSIs.
 */
export async function recalcOsiEstatusFromSteps(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  osiId: number,
): Promise<void> {
  try {
    // Count distinct sessions with an `en_proceso` step row, and how many are completed
    const { data: rows, error } = await admin
      .from("capacitacion_proceso_steps")
      .select("nro_sesion, completed")
      .eq("osi_id", osiId)
      .eq("step_key", "en_proceso");

    if (error) {
      console.error("[sync-osi-estatus] Error fetching ejecutado steps for recalc:", error);
      return;
    }

    if (!rows || rows.length === 0) {
      // No seeded steps — don't clobber existing shell-managed status
      return;
    }

    const totalSessions = new Set(rows.map((r) => r.nro_sesion as number)).size;
    const executedSessions = new Set(
      rows.filter((r) => r.completed === true).map((r) => r.nro_sesion as number),
    ).size;

    let newStatusId: number;
    if (executedSessions === 0) {
      newStatusId = OSI_ESTATUS.NO_EJECUTADA;
    } else if (executedSessions === totalSessions) {
      newStatusId = OSI_ESTATUS.EJECUTADO;
    } else {
      newStatusId = OSI_ESTATUS.EN_PROCESO;
    }

    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from("ejecucion_osi")
      .update({ id_estatus: newStatusId, status_changed_at: now })
      .eq("id", osiId);

    if (updateError) {
      console.error("[sync-osi-estatus] Error updating ejecucion_osi.id_estatus:", updateError);
    }
  } catch (err) {
    console.error("[sync-osi-estatus] Unexpected error in recalcOsiEstatusFromSteps:", err);
  }
}

// ─── Main sync entry point ──────────────────────────────────────────────────

/**
 * Sync a single session's `ejecutado` toggle to the shell's tables.
 *
 * @param osiId         ejecucion_osi.id
 * @param nroSesion     session number (1-indexed)
 * @param completed     true = step was marked, false = step was unmarked
 * @param sessionDate   the session's planned date (ISO string or YYYY-MM-DD),
 *                      used as fecha_ejecutada when marking. Falls back to today.
 */
export async function syncOsiEjecutadoToShell(
  osiId: number,
  nroSesion: number,
  completed: boolean,
  sessionDate?: string | null,
): Promise<void> {
  if (!Number.isFinite(osiId) || osiId <= 0) return;

  try {
    const admin = await createAdminClient();

    // 1. Resolve the osi_sesion row (materialize from sesiones_programadas if needed)
    const session = await resolveOsiSesion(admin, osiId, nroSesion);

    if (session) {
      // 2. Update osi_sesion execution date columns
      const todayStr = new Date().toISOString().split("T")[0];
      const fechaEjecutada = completed
        ? (sessionDate?.split("T")[0] || session.fecha?.split("T")[0] || todayStr)
        : null;

      const { error: sesionError } = await admin
        .from("osi_sesion")
        .update({
          fecha_ejecutada: fechaEjecutada,
          ejecutada_en_fecha_planificada: completed
            ? (sessionDate?.split("T")[0] === session.fecha?.split("T")[0] || !sessionDate)
            : null,
        })
        .eq("id", session.id);

      if (sesionError && !is_missing_column_error(sesionError)) {
        console.error("[sync-osi-estatus] Error updating osi_sesion:", sesionError);
      }
      // If missing-column error, the migration hasn't been applied — skip
      // gracefully, status history below still gets written.

      // 3. Insert status history row
      const prevStatusId = await getPreviousSessionStatus(admin, session.id);
      const newStatusId = completed ? OSI_ESTATUS.EJECUTADO : OSI_ESTATUS.NO_EJECUTADA;

      const { error: historyError } = await admin
        .from("historial_cambios_estado")
        .insert({
          tabla_afectada: "osi_sesion",
          id_registro: session.id,
          id_estatus_anterior: prevStatusId,
          id_estatus_nuevo: newStatusId,
          fecha_cambio: new Date().toISOString(),
          id_usuario_cambio: null, // no reliable user context in server action
        });

      if (historyError) {
        console.error("[sync-osi-estatus] Error inserting historial_cambios_estado:", historyError);
      }
    }

    // 4. Recalculate OSI-level status from all sessions' ejecutado steps
    await recalcOsiEstatusFromSteps(admin, osiId);
  } catch (err) {
    console.error("[sync-osi-estatus] Unexpected error in syncOsiEjecutadoToShell:", err);
  }
}
