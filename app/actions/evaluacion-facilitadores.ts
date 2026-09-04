"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentUserUsuarioId } from "./requisiciones";
import {
  computePuntajeInicial,
  classifyInicial,
  computeSeguimientoTotal,
} from "./evaluacion-facilitadores-scoring";
import type {
  TipoEvaluacion,
  CondicionFinal,
  FaseInicial,
  FaseSeguimiento,
  FaseReevaluacion,
  EvaluacionPayload,
  EvaluacionWithFacilitador,
} from "./evaluacion-facilitadores-types";

// Re-export types so existing imports from this module still work
export type {
  TipoEvaluacion,
  CondicionFinal,
  FaseInicial,
  FaseSeguimiento,
  FaseReevaluacion,
  EvaluacionPayload,
  EvaluacionWithFacilitador,
} from "./evaluacion-facilitadores-types";

// ─── Server actions ──────────────────────────────────────────────────────────

/**
 * Get the list of all evaluations joined with facilitador data, ordered by
 * most recent first. Used by the registry/list view.
 */
export async function getEvaluacionesList() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("facilitador_evaluaciones")
      .select(
        `
        id,
        facilitador_id,
        tipo_evaluacion,
        fecha_evaluacion,
        puntaje_total,
        porcentaje_total,
        condicion_final,
        created_at,
        facilitadores (
          id,
          nombre_apellido,
          cedula,
          rif,
          is_active,
          id_ciudad
        )
      `,
      )
      .order("fecha_evaluacion", { ascending: false });

    if (error) throw error;

    return { evaluaciones: data ?? [] };
  } catch (err) {
    console.error("Error en getEvaluacionesList:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Error al cargar las evaluaciones.",
      evaluaciones: [],
    };
  }
}

/**
 * Get all evaluations for a specific facilitador (history view).
 */
export async function getEvaluacionesByFacilitador(facilitadorId: number) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("facilitador_evaluaciones")
      .select("*")
      .eq("facilitador_id", facilitadorId)
      .order("fecha_evaluacion", { ascending: false });

    if (error) throw error;

    return { evaluaciones: data ?? [] };
  } catch (err) {
    console.error("Error en getEvaluacionesByFacilitador:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Error al cargar el historial de evaluaciones.",
      evaluaciones: [],
    };
  }
}

/**
 * Get a single evaluation by ID, with facilitador data.
 */
export async function getEvaluacionById(id: number) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("facilitador_evaluaciones")
      .select(
        `
        *,
        facilitadores (
          id,
          nombre_apellido,
          cedula,
          rif,
          is_active,
          id_ciudad,
          id_estado_geografico
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;

    return { evaluacion: data };
  } catch (err) {
    console.error("Error en getEvaluacionById:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Error al cargar la evaluación.",
      evaluacion: null,
    };
  }
}

/**
 * Save (insert or update) an evaluation. Computes puntaje_total,
 * porcentaje_total, and condicion_final server-side from the payload.
 */
export async function saveEvaluacion(payload: EvaluacionPayload) {
  try {
    const supabase = await createClient();
    const usuarioId = await getCurrentUserUsuarioId();

    // Compute derived fields server-side
    const puntajeInicial = computePuntajeInicial(payload.fase_inicial);
    let porcentajeTotal: number | null = null;
    let condicionFinal: CondicionFinal | null = null;

    if (payload.tipo_evaluacion === "nuevo") {
      // Phase 1 only — classification by points
      porcentajeTotal = puntajeInicial / 30; // 30 = max reference for classification ranges
      condicionFinal = classifyInicial(puntajeInicial);
    } else if (payload.tipo_evaluacion === "seguimiento") {
      // Phase 2 — weighted total
      porcentajeTotal = computeSeguimientoTotal(payload.fase_seguimiento);
      condicionFinal = porcentajeTotal >= 0.8 ? "aceptable" : "no_aceptable";
    } else if (payload.tipo_evaluacion === "reevaluacion") {
      // Phase 3 — average of per-OSI totals
      const osis = payload.fase_reevaluacion?.osis ?? [];
      if (osis.length > 0) {
        const avgTotal =
          osis.reduce((sum, o) => sum + (o.total ?? 0), 0) / osis.length;
        porcentajeTotal = avgTotal;
        condicionFinal = avgTotal >= 0.8 ? "aceptable" : "no_aceptable";
      }
    }

    const row = {
      facilitador_id: payload.facilitador_id,
      tipo_evaluacion: payload.tipo_evaluacion,
      evaluador_nombre: payload.evaluador_nombre ?? null,
      evaluador_cargo: payload.evaluador_cargo ?? null,
      recomendado_por: payload.recomendado_por ?? null,
      tipo_proveedor: payload.tipo_proveedor ?? null,
      entrevista: payload.entrevista ?? null,
      firma: payload.firma ?? null,
      fecha_evaluacion: payload.fecha_evaluacion,
      fase_inicial: payload.fase_inicial as unknown as Record<string, unknown>,
      fase_seguimiento: (payload.fase_seguimiento ?? null) as unknown as Record<string, unknown> | null,
      fase_reevaluacion: (payload.fase_reevaluacion ?? null) as unknown as Record<string, unknown> | null,
      puntaje_total: puntajeInicial,
      porcentaje_total: porcentajeTotal,
      condicion_final: condicionFinal,
      observaciones: payload.observaciones ?? null,
      creado_por: usuarioId,
    };

    if (payload.id) {
      // Update — don't overwrite creado_por
      const { creado_por: _, ...updateRow } = row;
      void _;
      const { data, error } = await supabase
        .from("facilitador_evaluaciones")
        .update(updateRow)
        .eq("id", payload.id)
        .select()
        .single();

      if (error) throw error;
      return { evaluacion: data };
    } else {
      const { data, error } = await supabase
        .from("facilitador_evaluaciones")
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      return { evaluacion: data };
    }
  } catch (err) {
    console.error("Error en saveEvaluacion:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Error al guardar la evaluación.",
      evaluacion: null,
    };
  }
}

/**
 * Delete an evaluation by ID.
 */
export async function deleteEvaluacion(id: number) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("facilitador_evaluaciones")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error("Error en deleteEvaluacion:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Error al eliminar la evaluación.",
    };
  }
}
