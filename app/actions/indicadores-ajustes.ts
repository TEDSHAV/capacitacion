"use server";

import { createAdminClient, createClient } from "@/utils/supabase/server";

export interface SaveIndicadorAjusteParams {
  osiId: number;
  fechaEjecucion?: string | null;
  fechaEmision?: string | null;
  motivo?: string | null;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Persist manual date adjustments for an OSI in the 72h certificates indicators view.
 * Kept strictly in `capacitacion_indicadores_ajustes` so core operational tables
 * (ejecucion_osi, osi_sesion, certificados) remain untouched.
 */
export async function saveIndicadorAjuste({
  osiId,
  fechaEjecucion,
  fechaEmision,
  motivo,
}: SaveIndicadorAjusteParams): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(osiId) || osiId <= 0) {
    return { success: false, error: "ID de OSI inválido" };
  }

  // Normalize dates: trim and ensure YYYY-MM-DD or null
  const cleanEjecucion = fechaEjecucion?.trim() ? fechaEjecucion.trim() : null;
  const cleanEmision = fechaEmision?.trim() ? fechaEmision.trim() : null;
  const cleanMotivo = motivo?.trim() ? motivo.trim() : null;

  if (cleanEjecucion && !DATE_REGEX.test(cleanEjecucion)) {
    return { success: false, error: "Formato de fecha de ejecución inválido (debe ser YYYY-MM-DD)" };
  }

  if (cleanEmision && !DATE_REGEX.test(cleanEmision)) {
    return { success: false, error: "Formato de fecha de emisión inválido (debe ser YYYY-MM-DD)" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = await createAdminClient();

    // If both dates are empty/null, clear the adjustment record
    if (!cleanEjecucion && !cleanEmision) {
      const { error: delError } = await admin
        .from("capacitacion_indicadores_ajustes")
        .delete()
        .eq("osi_id", osiId);

      if (delError) {
        console.error("[indicadores-ajustes] Error deleting record:", delError);
        return { success: false, error: delError.message };
      }
      return { success: true };
    }

    const { error: upsertError } = await admin
      .from("capacitacion_indicadores_ajustes")
      .upsert(
        {
          osi_id: osiId,
          fecha_ejecucion: cleanEjecucion,
          fecha_emision: cleanEmision,
          motivo: cleanMotivo,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        },
        { onConflict: "osi_id" }
      );

    if (upsertError) {
      console.error("[indicadores-ajustes] Error upserting ajuste:", upsertError);
      return { success: false, error: upsertError.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[indicadores-ajustes] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido al guardar el ajuste",
    };
  }
}

/**
 * Reset one or both adjusted dates for an OSI back to original system calculations.
 */
export async function resetIndicadorAjuste(
  osiId: number,
  tipo: "all" | "ejecucion" | "emision" = "all"
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(osiId) || osiId <= 0) {
    return { success: false, error: "ID de OSI inválido" };
  }

  try {
    const admin = await createAdminClient();

    if (tipo === "all") {
      const { error: delError } = await admin
        .from("capacitacion_indicadores_ajustes")
        .delete()
        .eq("osi_id", osiId);

      if (delError) {
        console.error("[indicadores-ajustes] Error resetting all:", delError);
        return { success: false, error: delError.message };
      }
      return { success: true };
    }

    // Single date reset: check existing row
    const { data: existing, error: selError } = await admin
      .from("capacitacion_indicadores_ajustes")
      .select("fecha_ejecucion, fecha_emision")
      .eq("osi_id", osiId)
      .single();

    if (selError || !existing) {
      // Nothing to reset
      return { success: true };
    }

    const newEjecucion = tipo === "ejecucion" ? null : existing.fecha_ejecucion;
    const newEmision = tipo === "emision" ? null : existing.fecha_emision;

    if (!newEjecucion && !newEmision) {
      // Both are now null, delete row
      await admin
        .from("capacitacion_indicadores_ajustes")
        .delete()
        .eq("osi_id", osiId);
      return { success: true };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await admin
      .from("capacitacion_indicadores_ajustes")
      .update({
        fecha_ejecucion: newEjecucion,
        fecha_emision: newEmision,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      })
      .eq("osi_id", osiId);

    if (updateError) {
      console.error("[indicadores-ajustes] Error resetting single date:", updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[indicadores-ajustes] Unexpected error resetting:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al restablecer fechas",
    };
  }
}
