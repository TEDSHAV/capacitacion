"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  EvaluacionPlantilla,
  EvaluacionPregunta,
  OSIEvaluacion,
  EvaluacionPublicData,
  EvaluacionRespuestaItem,
  SubmitEvaluacionPayload,
  SubmitEvaluacionResult,
  ParticipantStageResult,
  TipoEvaluacionCurso,
  EtapaEvaluacion,
  TipoPreguntaEvaluacion,
  SalonId,
  SalonInfo,
} from "@/types/evaluacion";
import { SALONES } from "@/types/evaluacion";
import { toTitleCase } from "@/utils/string-utils";

interface SalonMetadataItem {
  _is_salon_meta: true;
  salon_id: SalonId;
  salon_fecha_inicio?: string | null;
  salon_fecha_fin?: string | null;
}

/**
 * Helper to identify a salon from its slug, ID, or alias.
 */
export function getSalonFromSlug(slug: string): SalonInfo | null {
  if (!slug) return null;
  const clean = slug.trim().toLowerCase();
  return SALONES.find((s) => s.slugs.includes(clean) || s.id === clean) || null;
}

/**
 * Returns today's date in Venezuela local timezone (YYYY-MM-DD).
 */
export function getTodayDateString(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * Resolves an OSI by either:
 * 1. A physical classroom slug ("salon-principal", "salon-elite", "salon-oriente") active today
 * 2. An internal numeric ID
 * 3. A sequential/formatted number (e.g. "153", "2026-042", "OSI-2026-042").
 */
export async function resolveOSIByIdentifier(identifier: string): Promise<{
  id_osi: number;
  nro_osi: string;
  servicio: string;
  nombre_empresa: string;
  eval_pre_post?: boolean;
  fecha_inicio_real?: string | null;
  fecha_fin_real?: string | null;
  salon_id?: SalonId | null;
  salon_nombre?: string | null;
} | null> {
  const admin = await createAdminClient();
  const trimmed = identifier.trim();

  // 0. Check if identifier is a classroom slug
  const salon = getSalonFromSlug(trimmed);
  if (salon) {
    const today = getTodayDateString();
    let matchedOsiId: number | null = null;

    // A. Check dedicated assignments table if present
    try {
      const { data: sa } = await admin
        .from("capacitacion_salones_asignaciones")
        .select("id_osi")
        .eq("salon_id", salon.id)
        .eq("is_active", true)
        .lte("fecha_inicio", today)
        .gte("fecha_fin", today)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sa && sa.id_osi) {
        matchedOsiId = sa.id_osi;
      }
    } catch {
      // Ignored if table not created yet in schema cache
    }

    // B. Check dual-storage metadata inside capacitacion_osi_evaluaciones.preguntas
    if (!matchedOsiId) {
      const { data: activeEvals } = await admin
        .from("capacitacion_osi_evaluaciones")
        .select("id, id_osi, preguntas")
        .eq("is_active", true);

      if (activeEvals && activeEvals.length > 0) {
        for (const ev of activeEvals) {
          const rawPreguntas = Array.isArray(ev.preguntas) ? ev.preguntas : [];
          const meta = rawPreguntas.find(
            (p): p is SalonMetadataItem =>
              typeof p === "object" && p !== null && "_is_salon_meta" in p && (p as SalonMetadataItem)._is_salon_meta === true,
          );
          if (meta && meta.salon_id === salon.id) {
            const fInicio = meta.salon_fecha_inicio || today;
            const fFin = meta.salon_fecha_fin || fInicio || today;
            if (today >= fInicio && today <= fFin) {
              matchedOsiId = ev.id_osi;
              break;
            }
          }
        }
      }
    }

    if (!matchedOsiId) {
      // Salon has no active course scheduled for today
      return null;
    }

    const { data: osiData } = await admin
      .from("v_osi_formato_completo")
      .select("id_osi, nro_osi, servicio, nombre_empresa, eval_pre_post, fecha_inicio_real, fecha_fin_real")
      .eq("id_osi", matchedOsiId)
      .maybeSingle();

    if (osiData) {
      return {
        id_osi: osiData.id_osi,
        nro_osi: osiData.nro_osi || `OSI-${osiData.id_osi}`,
        servicio: osiData.servicio || "Servicio de Capacitación",
        nombre_empresa: osiData.nombre_empresa || "Cliente",
        eval_pre_post: Boolean(osiData.eval_pre_post),
        fecha_inicio_real: osiData.fecha_inicio_real,
        fecha_fin_real: osiData.fecha_fin_real,
        salon_id: salon.id,
        salon_nombre: salon.nombre,
      };
    }
    return null;
  }

  const cleanNumber = trimmed.replace(/^OSI-?/i, "").trim();

  // 1. Try exact match on nro_osi (since users and URLs type e.g. "3746" or "2026-042")
  const { data: byExactNro } = await admin
    .from("v_osi_formato_completo")
    .select("id_osi, nro_osi, servicio, nombre_empresa, eval_pre_post, fecha_inicio_real, fecha_fin_real")
    .eq("nro_osi", cleanNumber)
    .limit(1)
    .maybeSingle();

  if (byExactNro) {
    return {
      id_osi: byExactNro.id_osi,
      nro_osi: byExactNro.nro_osi || `OSI-${byExactNro.id_osi}`,
      servicio: byExactNro.servicio || "Servicio de Capacitación",
      nombre_empresa: byExactNro.nombre_empresa || "Cliente",
      eval_pre_post: Boolean(byExactNro.eval_pre_post),
      fecha_inicio_real: byExactNro.fecha_inicio_real,
      fecha_fin_real: byExactNro.fecha_fin_real,
    };
  }

  // 2. If numeric, try matching by id_osi directly
  const numericId = parseInt(trimmed, 10);
  if (!isNaN(numericId) && numericId > 0 && String(numericId) === trimmed) {
    const { data: byId } = await admin
      .from("v_osi_formato_completo")
      .select("id_osi, nro_osi, servicio, nombre_empresa, eval_pre_post, fecha_inicio_real, fecha_fin_real")
      .eq("id_osi", numericId)
      .maybeSingle();

    if (byId) {
      return {
        id_osi: byId.id_osi,
        nro_osi: byId.nro_osi || `OSI-${byId.id_osi}`,
        servicio: byId.servicio || "Servicio de Capacitación",
        nombre_empresa: byId.nombre_empresa || "Cliente",
        eval_pre_post: Boolean(byId.eval_pre_post),
        fecha_inicio_real: byId.fecha_inicio_real,
        fecha_fin_real: byId.fecha_fin_real,
      };
    }
  }

  // 3. Try partial substring match on nro_osi
  const { data: byNroLike } = await admin
    .from("v_osi_formato_completo")
    .select("id_osi, nro_osi, servicio, nombre_empresa, eval_pre_post, fecha_inicio_real, fecha_fin_real")
    .ilike("nro_osi", `%${cleanNumber}%`)
    .limit(1)
    .maybeSingle();

  if (byNroLike) {
    return {
      id_osi: byNroLike.id_osi,
      nro_osi: byNroLike.nro_osi || `OSI-${byNroLike.id_osi}`,
      servicio: byNroLike.servicio || "Servicio de Capacitación",
      nombre_empresa: byNroLike.nombre_empresa || "Cliente",
      eval_pre_post: Boolean(byNroLike.eval_pre_post),
      fecha_inicio_real: byNroLike.fecha_inicio_real,
      fecha_fin_real: byNroLike.fecha_fin_real,
    };
  }

  return null;
}

// ─── MASTER TEMPLATES CRUD ──────────────────────────────────────────────────

/**
 * Fetch active courses catalog matching the gestion-cursos directory (shown in catalog).
 */
export async function getActiveCoursesCatalog(): Promise<Array<{ id: number; nombre: string; nota_aprobatoria?: number | null }>> {
  const admin = await createAdminClient();

  const { data: initialData, error } = await admin
    .from("catalogo_servicios")
    .select("id, nombre, nota_aprobatoria")
    .eq("esta_activo", true)
    .eq("id_departamento_ejecutante", 3)
    .eq("tipo_servicio", 1)
    .eq("mostrar_en_catalogo", true)
    .order("nombre", { ascending: true });

  let data = initialData;

  if (error && (error.code === "42703" || error.message?.includes("mostrar_en_catalogo"))) {
    const retry = await admin
      .from("catalogo_servicios")
      .select("id, nombre, nota_aprobatoria")
      .eq("esta_activo", true)
      .eq("id_departamento_ejecutante", 3)
      .eq("tipo_servicio", 1)
      .order("nombre", { ascending: true });
    data = retry.data;
  }

  return (data || []).map((c: { id: number; nombre: string; nota_aprobatoria?: number | string | null }) => ({
    id: c.id,
    nombre: c.nombre,
    nota_aprobatoria: c.nota_aprobatoria != null ? Number(c.nota_aprobatoria) : null,
  }));
}

/**
 * Fetch all master evaluation templates with their question counts.
 */
export async function getEvaluacionPlantillas(): Promise<EvaluacionPlantilla[]> {
  const supabase = await createAdminClient();

  const { data: templates, error: tplErr } = await supabase
    .from("capacitacion_evaluaciones_plantillas")
    .select("*, catalogo_servicios:id_curso(nombre)")
    .order("id", { ascending: false });

  if (tplErr) {
    console.error("[getEvaluacionPlantillas] Error:", tplErr);
    return [];
  }

  // Fetch question counts per template
  const { data: questions } = await supabase
    .from("capacitacion_evaluaciones_preguntas")
    .select("plantilla_id");

  const countMap = new Map<number, number>();
  for (const q of questions || []) {
    countMap.set(q.plantilla_id, (countMap.get(q.plantilla_id) || 0) + 1);
  }

  return (templates || []).map((t: Record<string, unknown>) => ({
    id: Number(t.id),
    id_curso: t.id_curso != null ? Number(t.id_curso) : null,
    titulo: String(t.titulo || ""),
    descripcion: t.descripcion ? String(t.descripcion) : null,
    nota_aprobatoria: Number(t.nota_aprobatoria) || 14,
    duracion_minutos: t.duracion_minutos != null ? Number(t.duracion_minutos) : null,
    tipo_evaluacion: (t.tipo_evaluacion as TipoEvaluacionCurso) || "standard",
    is_active: Boolean(t.is_active),
    created_at: String(t.created_at || ""),
    updated_at: String(t.updated_at || ""),
    preguntas_count: countMap.get(Number(t.id)) || 0,
    curso_nombre: (t.catalogo_servicios as { nombre?: string })?.nombre || null,
  }));
}

/**
 * Fetch a single master evaluation template with its questions.
 */
export async function getEvaluacionPlantilla(id: number): Promise<{
  data: EvaluacionPlantilla | null;
  error?: string;
}> {
  const supabase = await createAdminClient();

  const { data: tpl, error: tplErr } = await supabase
    .from("capacitacion_evaluaciones_plantillas")
    .select("*, catalogo_servicios:id_curso(nombre)")
    .eq("id", id)
    .maybeSingle();

  if (tplErr || !tpl) {
    return { data: null, error: tplErr?.message || "Plantilla no encontrada" };
  }

  const { data: questions } = await supabase
    .from("capacitacion_evaluaciones_preguntas")
    .select("*")
    .eq("plantilla_id", id)
    .order("orden", { ascending: true })
    .order("id", { ascending: true });

  const formattedQuestions: EvaluacionPregunta[] = (questions || []).map((q: Record<string, unknown>) => ({
    id: String(q.id),
    enunciado: String(q.enunciado || ""),
    tipo: (q.tipo as TipoPreguntaEvaluacion) || "single_choice",
    puntos: Number(q.puntos) || 2,
    orden: Number(q.orden) || 1,
    etapa: (q.etapa as EtapaEvaluacion) || "post",
    opciones: Array.isArray(q.opciones) ? (q.opciones as EvaluacionPregunta["opciones"]) : [],
  }));

  return {
    data: {
      id: tpl.id,
      id_curso: tpl.id_curso,
      titulo: tpl.titulo,
      descripcion: tpl.descripcion,
      nota_aprobatoria: Number(tpl.nota_aprobatoria) || 14,
      duracion_minutos: tpl.duracion_minutos,
      tipo_evaluacion: (tpl.tipo_evaluacion as TipoEvaluacionCurso) || "standard",
      is_active: tpl.is_active,
      created_at: tpl.created_at,
      updated_at: tpl.updated_at,
      preguntas: formattedQuestions,
      preguntas_count: formattedQuestions.length,
      curso_nombre: tpl.catalogo_servicios?.nombre || null,
    },
  };
}

/**
 * Save or update a master evaluation template and its questions.
 */
export async function saveEvaluacionPlantilla(payload: {
  id?: number;
  id_curso?: number | null;
  titulo: string;
  descripcion?: string | null;
  nota_aprobatoria?: number;
  duracion_minutos?: number | null;
  tipo_evaluacion?: TipoEvaluacionCurso;
  is_active?: boolean;
  preguntas: EvaluacionPregunta[];
}): Promise<{ data?: EvaluacionPlantilla; error?: string }> {
  const admin = await createAdminClient();

  try {
    let templateId = payload.id;
    const tipoEvaluacion = payload.tipo_evaluacion || "standard";

    if (templateId) {
      const { error: updateErr } = await admin
        .from("capacitacion_evaluaciones_plantillas")
        .update({
          id_curso: payload.id_curso ?? null,
          titulo: payload.titulo.trim(),
          descripcion: payload.descripcion?.trim() || null,
          nota_aprobatoria: payload.nota_aprobatoria ?? 14,
          duracion_minutos: payload.duracion_minutos ?? null,
          tipo_evaluacion: tipoEvaluacion,
          is_active: payload.is_active ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId);

      if (updateErr) throw updateErr;

      // Delete existing questions to replace with current set
      await admin
        .from("capacitacion_evaluaciones_preguntas")
        .delete()
        .eq("plantilla_id", templateId);
    } else {
      const { data: newTpl, error: insertErr } = await admin
        .from("capacitacion_evaluaciones_plantillas")
        .insert({
          id_curso: payload.id_curso ?? null,
          titulo: payload.titulo.trim(),
          descripcion: payload.descripcion?.trim() || null,
          nota_aprobatoria: payload.nota_aprobatoria ?? 14,
          duracion_minutos: payload.duracion_minutos ?? null,
          tipo_evaluacion: tipoEvaluacion,
          is_active: payload.is_active ?? true,
        })
        .select()
        .single();

      if (insertErr || !newTpl) throw insertErr;
      templateId = newTpl.id;
    }

    // Insert questions
    if (payload.preguntas && payload.preguntas.length > 0) {
      const questionsToInsert = payload.preguntas.map((q, idx) => ({
        plantilla_id: templateId,
        enunciado: q.enunciado.trim(),
        tipo: q.tipo || "single_choice",
        puntos: Number(q.puntos) || 2,
        orden: idx + 1,
        etapa: q.etapa || "post",
        opciones: q.opciones || [],
      }));

      const { error: qErr } = await admin
        .from("capacitacion_evaluaciones_preguntas")
        .insert(questionsToInsert);

      if (qErr) throw qErr;
    }

    revalidatePath("/dashboard/capacitacion/gestion-examenes");
    const fresh = await getEvaluacionPlantilla(templateId!);
    return { data: fresh.data || undefined };
  } catch (err) {
    console.error("[saveEvaluacionPlantilla] Error:", err);
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete a master evaluation template.
 */
export async function deleteEvaluacionPlantilla(id: number): Promise<{ success: boolean; error?: string }> {
  const admin = await createAdminClient();
  const { error } = await admin
    .from("capacitacion_evaluaciones_plantillas")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteEvaluacionPlantilla] Error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/capacitacion/gestion-examenes");
  return { success: true };
}

// ─── OSI EVALUATION ASSIGNMENT ──────────────────────────────────────────────

/**
 * Get active evaluation assigned to an OSI.
 */
export async function getOSIEvaluacion(osiId: number): Promise<{
  data: (OSIEvaluacion & { submissions_count: number }) | null;
  error?: string;
}> {
  const admin = await createAdminClient();

  const { data, error } = await admin
    .from("capacitacion_osi_evaluaciones")
    .select("*")
    .eq("id_osi", osiId)
    .maybeSingle();

  if (error) {
    console.error("[getOSIEvaluacion] Error:", error);
    return { data: null, error: error.message };
  }
  if (!data) return { data: null };

  // Count submissions for this OSI evaluation
  const { count } = await admin
    .from("capacitacion_evaluaciones_respuestas")
    .select("id", { count: "exact", head: true })
    .eq("id_osi", osiId);

  const rawPreguntas = Array.isArray(data.preguntas) ? data.preguntas : [];
  const salonMeta = rawPreguntas.find(
    (p): p is SalonMetadataItem =>
      typeof p === "object" && p !== null && "_is_salon_meta" in p && (p as SalonMetadataItem)._is_salon_meta === true,
  );
  const cleanPreguntas = rawPreguntas.filter(
    (p) => !(typeof p === "object" && p !== null && "_is_salon_meta" in p),
  ) as EvaluacionPregunta[];

  return {
    data: {
      id: data.id,
      id_osi: data.id_osi,
      plantilla_id: data.plantilla_id,
      titulo: data.titulo,
      nota_aprobatoria: Number(data.nota_aprobatoria) || 14,
      duracion_minutos: data.duracion_minutos,
      tipo_evaluacion: (data.tipo_evaluacion as TipoEvaluacionCurso) || "standard",
      preguntas: cleanPreguntas,
      salon_id: salonMeta?.salon_id || null,
      salon_fecha_inicio: salonMeta?.salon_fecha_inicio || null,
      salon_fecha_fin: salonMeta?.salon_fecha_fin || null,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at,
      created_by: data.created_by,
      submissions_count: count || 0,
    },
  };
}

/**
 * Assign or update an evaluation for an OSI.
 * Capacitación coordinators explicitly trigger this to assign an exam to an OSI.
 */
export async function assignEvaluacionToOSI(payload: {
  id_osi: number;
  plantilla_id?: number | null;
  titulo?: string;
  nota_aprobatoria?: number;
  duracion_minutos?: number | null;
  preguntas?: EvaluacionPregunta[];
  salon_id?: SalonId | null;
  salon_fecha_inicio?: string | null;
  salon_fecha_fin?: string | null;
  tipo_evaluacion?: TipoEvaluacionCurso;
}): Promise<{ data?: OSIEvaluacion; error?: string }> {
  const admin = await createAdminClient();
  const supabase = await createClient();
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id || null;

  try {
    let titulo = payload.titulo?.trim();
    let notaAprobatoria = payload.nota_aprobatoria ?? 14;
    let duracionMinutos = payload.duracion_minutos ?? null;
    let preguntas: EvaluacionPregunta[] = (payload.preguntas || []).filter(
      (p) => !(typeof p === "object" && p !== null && "_is_salon_meta" in p),
    );
    let tipoEvaluacion: TipoEvaluacionCurso = payload.tipo_evaluacion || "standard";

    // Check if OSI in v_osi_formato_completo specifies eval_pre_post
    const { data: osiInfo } = await admin
      .from("v_osi_formato_completo")
      .select("eval_pre_post, fecha_inicio_real, fecha_fin_real")
      .eq("id_osi", payload.id_osi)
      .maybeSingle();

    if (osiInfo && osiInfo.eval_pre_post !== null && osiInfo.eval_pre_post !== undefined) {
      tipoEvaluacion = osiInfo.eval_pre_post ? "pre_post" : "standard";
    }

    // If template specified and no explicit questions provided, load from template
    if (payload.plantilla_id && preguntas.length === 0) {
      const tplRes = await getEvaluacionPlantilla(payload.plantilla_id);
      if (tplRes.data) {
        if (!titulo) titulo = tplRes.data.titulo;
        notaAprobatoria = tplRes.data.nota_aprobatoria;
        duracionMinutos = tplRes.data.duracion_minutos;
        preguntas = (tplRes.data.preguntas || []).filter(
          (p) => !(typeof p === "object" && p !== null && "_is_salon_meta" in p),
        );
        if (!osiInfo || osiInfo.eval_pre_post === null) {
          tipoEvaluacion = tplRes.data.tipo_evaluacion || "standard";
        }
      }
    }

    if (!titulo) {
      titulo = "Evaluación de Curso";
    }

    const today = getTodayDateString();
    const fechaInicio = payload.salon_fecha_inicio || osiInfo?.fecha_inicio_real || today;
    const fechaFin = payload.salon_fecha_fin || osiInfo?.fecha_fin_real || fechaInicio || today;

    // Prepare questions with salon metadata if salon assigned
    const preguntasWithMeta: Array<EvaluacionPregunta | SalonMetadataItem> = [...preguntas];
    if (payload.salon_id) {
      preguntasWithMeta.push({
        _is_salon_meta: true,
        salon_id: payload.salon_id,
        salon_fecha_inicio: fechaInicio,
        salon_fecha_fin: fechaFin,
      });
    }

    const { data: saved, error } = await admin
      .from("capacitacion_osi_evaluaciones")
      .upsert(
        {
          id_osi: payload.id_osi,
          plantilla_id: payload.plantilla_id ?? null,
          titulo,
          nota_aprobatoria: notaAprobatoria,
          duracion_minutos: duracionMinutos,
          tipo_evaluacion: tipoEvaluacion,
          preguntas: preguntasWithMeta,
          is_active: true,
          updated_at: new Date().toISOString(),
          created_by: userId,
        },
        { onConflict: "id_osi" },
      )
      .select()
      .single();

    if (error || !saved) throw error;

    // Dual-storage attempt for capacitacion_salones_asignaciones
    if (payload.salon_id) {
      try {
        await admin.from("capacitacion_salones_asignaciones").upsert(
          {
            salon_id: payload.salon_id,
            id_osi: payload.id_osi,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            is_active: true,
          },
          { onConflict: "salon_id,fecha_inicio,id_osi" },
        );
      } catch {
        // Ignored if table not created yet in schema cache
      }
    }

    revalidatePath(`/dashboard/capacitacion/gestion-osi`);
    revalidatePath(`/dashboard/capacitacion/gestion-examenes`);
    revalidatePath(`/portal/facilitador/osi/${payload.id_osi}`);
    revalidatePath(`/evaluacion/${payload.id_osi}`);
    revalidatePath(`/evaluacion/salon-principal`);
    revalidatePath(`/evaluacion/salon-elite`);
    revalidatePath(`/evaluacion/salon-oriente`);

    return {
      data: {
        id: saved.id,
        id_osi: saved.id_osi,
        plantilla_id: saved.plantilla_id,
        titulo: saved.titulo,
        nota_aprobatoria: Number(saved.nota_aprobatoria) || 14,
        duracion_minutos: saved.duracion_minutos,
        tipo_evaluacion: (saved.tipo_evaluacion as TipoEvaluacionCurso) || "standard",
        preguntas,
        salon_id: payload.salon_id || null,
        salon_fecha_inicio: payload.salon_id ? fechaInicio : null,
        salon_fecha_fin: payload.salon_id ? fechaFin : null,
        is_active: saved.is_active,
        created_at: saved.created_at,
        updated_at: saved.updated_at,
        created_by: saved.created_by,
      },
    };
  } catch (err) {
    console.error("[assignEvaluacionToOSI] Error:", err);
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Remove an evaluation from an OSI.
 */
export async function removeOSIEvaluacion(osiId: number): Promise<{ success: boolean; error?: string }> {
  const admin = await createAdminClient();
  const { error } = await admin
    .from("capacitacion_osi_evaluaciones")
    .delete()
    .eq("id_osi", osiId);

  if (error) {
    console.error("[removeOSIEvaluacion] Error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/capacitacion/gestion-osi`);
  revalidatePath(`/portal/facilitador/osi/${osiId}`);
  return { success: true };
}

// ─── PUBLIC EVALUATION TAKER & AUTO-GRADING ─────────────────────────────────

/**
 * Public query for participants taking the evaluation.
 * IMPORTANT: Strips `es_correcta` from options to prevent cheating via browser inspection.
 */
export async function getOSIEvaluacionPublicData(identifier: string): Promise<{
  data: EvaluacionPublicData | null;
  error?: string;
}> {
  const salonInfo = getSalonFromSlug(identifier);
  const osi = await resolveOSIByIdentifier(identifier);

  if (!osi) {
    if (salonInfo) {
      return {
        data: null,
        error: `No hay una evaluación activa asignada para el ${salonInfo.nombre} el día de hoy.`,
      };
    }
    return { data: null, error: `No se encontró la OSI correspondiente al código "${identifier}".` };
  }

  const admin = await createAdminClient();
  const { data: osiEval, error } = await admin
    .from("capacitacion_osi_evaluaciones")
    .select("*")
    .eq("id_osi", osi.id_osi)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !osiEval) {
    return {
      data: null,
      error: `Esta OSI (${osi.nro_osi}) no tiene una evaluación activa asignada por el equipo de Capacitación.`,
    };
  }

  const rawQuestions = Array.isArray(osiEval.preguntas) ? osiEval.preguntas : [];

  const salonMeta = rawQuestions.find(
    (q): q is SalonMetadataItem =>
      typeof q === "object" && q !== null && "_is_salon_meta" in q && (q as SalonMetadataItem)._is_salon_meta === true,
  );
  const cleanQuestions = rawQuestions.filter(
    (q) => !(typeof q === "object" && q !== null && "_is_salon_meta" in q),
  ) as EvaluacionPregunta[];

  let salonNombre = osi.salon_nombre || null;
  if (!salonNombre && salonMeta && salonMeta.salon_id) {
    const s = SALONES.find((sl) => sl.id === salonMeta.salon_id);
    if (s) salonNombre = s.nombre;
  }

  // Strip correct answer flags
  const sanitizedQuestions = cleanQuestions.map((q) => ({
    id: String(q.id),
    enunciado: q.enunciado,
    tipo: q.tipo,
    puntos: Number(q.puntos) || 2,
    orden: q.orden || 1,
    etapa: q.etapa || "post",
    opciones: (q.opciones || []).map((o) => ({
      id: o.id,
      texto: o.texto,
    })),
  }));

  const tipoEvaluacion: TipoEvaluacionCurso =
    osi.eval_pre_post === true
      ? "pre_post"
      : osi.eval_pre_post === false
      ? "standard"
      : (osiEval.tipo_evaluacion as TipoEvaluacionCurso) || "standard";

  return {
    data: {
      osiId: osi.id_osi,
      nroOsi: osi.nro_osi,
      servicio: osi.servicio,
      nombreEmpresa: osi.nombre_empresa,
      evaluacionId: osiEval.id,
      titulo: osiEval.titulo,
      notaAprobatoria: Number(osiEval.nota_aprobatoria) || 14,
      duracionMinutos: osiEval.duracion_minutos,
      tipoEvaluacion,
      salonNombre,
      preguntas: sanitizedQuestions,
    },
  };
}

// ─── PARTICIPANT STAGE AUTO-DETECTION & SUBMISSION ─────────────────────────

/**
 * Checks a participant's evaluation stage for a given OSI.
 * Automatically resolves whether they should take 'pre' or 'post',
 * or if they have already completed both, without requiring user selection.
 * Also retrieves their existing registered name to auto-fill.
 */
export async function getParticipantEvaluationStage(
  identifier: string,
  cedula: string,
): Promise<ParticipantStageResult> {
  try {
    const osi = await resolveOSIByIdentifier(identifier);
    if (!osi) {
      return {
        success: false,
        isPrePost: false,
        stage: "post",
        alreadyCompletedAll: false,
        error: "OSI no encontrada.",
      };
    }

    const cleanCedula = cedula.trim().toUpperCase();
    if (!cleanCedula) {
      return {
        success: false,
        isPrePost: false,
        stage: "post",
        alreadyCompletedAll: false,
        error: "Cédula inválida.",
      };
    }

    const admin = await createAdminClient();

    const { data: osiEval } = await admin
      .from("capacitacion_osi_evaluaciones")
      .select("id, tipo_evaluacion")
      .eq("id_osi", osi.id_osi)
      .eq("is_active", true)
      .maybeSingle();

    if (!osiEval) {
      return {
        success: false,
        isPrePost: false,
        stage: "post",
        alreadyCompletedAll: false,
        error: "No hay una evaluación activa disponible para esta OSI.",
      };
    }

    const isPrePost =
      osi.eval_pre_post === true
        ? true
        : osi.eval_pre_post === false
        ? false
        : osiEval.tipo_evaluacion === "pre_post";

    const { data: subs } = await admin
      .from("capacitacion_evaluaciones_respuestas")
      .select("id, etapa, nombre_apellido")
      .eq("id_osi", osi.id_osi)
      .eq("cedula", cleanCedula);

    const { data: part } = await admin
      .from("ejecucion_osi_participantes")
      .select("nombre_apellido, score_pre, score_post, score")
      .eq("osi_id", osi.id_osi)
      .eq("cedula", cleanCedula)
      .maybeSingle();

    const participantName =
      (subs && subs.length > 0 ? subs[0].nombre_apellido : undefined) ||
      part?.nombre_apellido ||
      undefined;

    if (!isPrePost) {
      const alreadyDone =
        (subs && subs.length > 0) || (part && part.score !== null);
      return {
        success: true,
        isPrePost: false,
        stage: "post",
        alreadyCompletedAll: Boolean(alreadyDone),
        participantName,
      };
    }

    const hasPre =
      (subs || []).some((s) => s.etapa === "pre") ||
      (part && part.score_pre !== null && part.score_pre !== undefined);
    const hasPost =
      (subs || []).some((s) => s.etapa === "post") ||
      (part && part.score_post !== null && part.score_post !== undefined);

    if (hasPost) {
      return {
        success: true,
        isPrePost: true,
        stage: "post",
        alreadyCompletedAll: true,
        participantName,
      };
    }

    if (hasPre) {
      return {
        success: true,
        isPrePost: true,
        stage: "post",
        alreadyCompletedAll: false,
        participantName,
      };
    }

    return {
      success: true,
      isPrePost: true,
      stage: "pre",
      alreadyCompletedAll: false,
      participantName,
    };
  } catch (err) {
    console.error("[getParticipantEvaluationStage] Error:", err);
    return {
      success: false,
      isPrePost: false,
      stage: "post",
      alreadyCompletedAll: false,
      error: "Error al verificar la fase de evaluación.",
    };
  }
}

/**
 * Submit and auto-grade an evaluation.
 *
 * 1. Checks correct answers against the server-side snapshot.
 * 2. Calculates grade on a 0–20 scale.
 * 3. Records submission in `capacitacion_evaluaciones_respuestas`.
 * 4. Automatically upserts participant name, cédula, and score into `ejecucion_osi_participantes`,
 *    making it immediately visible in the Facilitator Portal!
 * 5. Intentionally avoids exposing score or approval status to the participant response
 *    to prevent classroom tension, while securely storing grades for facilitator review.
 */
export async function submitOSIEvaluacion(
  payload: SubmitEvaluacionPayload,
): Promise<SubmitEvaluacionResult> {
  try {
    const osi = await resolveOSIByIdentifier(payload.identifier);
    if (!osi) {
      return { success: false, error: "OSI no encontrada." };
    }

    const cleanCedula = payload.cedula.trim().toUpperCase();
    const cleanNombre = toTitleCase(payload.nombre_apellido.trim());

    if (!cleanCedula || !cleanNombre) {
      return { success: false, error: "El nombre y la cédula son obligatorios." };
    }

    const admin = await createAdminClient();

    // 1. Fetch OSI evaluation with full questions & correct answers
    const { data: osiEval, error: evalErr } = await admin
      .from("capacitacion_osi_evaluaciones")
      .select("*")
      .eq("id_osi", osi.id_osi)
      .eq("is_active", true)
      .maybeSingle();

    if (evalErr || !osiEval) {
      return { success: false, error: "No hay una evaluación activa disponible para esta OSI." };
    }

    const isPrePost =
      osi.eval_pre_post === true
        ? true
        : osi.eval_pre_post === false
        ? false
        : osiEval.tipo_evaluacion === "pre_post";

    // Check existing submissions and participant records
    const { data: existingSubs } = await admin
      .from("capacitacion_evaluaciones_respuestas")
      .select("id, etapa")
      .eq("id_osi", osi.id_osi)
      .eq("cedula", cleanCedula);

    const { data: existingParticipant } = await admin
      .from("ejecucion_osi_participantes")
      .select("id, score, score_pre, score_post")
      .eq("osi_id", osi.id_osi)
      .eq("cedula", cleanCedula)
      .maybeSingle();

    let etapa: EtapaEvaluacion = "post";

    if (isPrePost) {
      const hasPre =
        (existingSubs || []).some((s) => s.etapa === "pre") ||
        (existingParticipant && existingParticipant.score_pre !== null && existingParticipant.score_pre !== undefined);
      const hasPost =
        (existingSubs || []).some((s) => s.etapa === "post") ||
        (existingParticipant && existingParticipant.score_post !== null && existingParticipant.score_post !== undefined);

      if (hasPost) {
        return {
          success: true,
          alreadySubmitted: true,
          etapa: "post",
        };
      }

      if (hasPre) {
        etapa = "post";
      } else {
        etapa = "pre";
      }
    } else {
      const alreadyDone =
        (existingSubs && existingSubs.length > 0) ||
        (existingParticipant && existingParticipant.score !== null && existingParticipant.score !== undefined);

      if (alreadyDone) {
        return {
          success: true,
          alreadySubmitted: true,
          etapa: "post",
        };
      }
      etapa = "post";
    }

    // 2. Auto-grading
    const rawQuestions = Array.isArray(osiEval.preguntas) ? osiEval.preguntas : [];

    const cleanQuestions: EvaluacionPregunta[] = rawQuestions.filter(
      (q) => !(typeof q === "object" && q !== null && "_is_salon_meta" in q),
    ) as EvaluacionPregunta[];

    const questions = isPrePost
      ? cleanQuestions.filter((q) => (q.etapa || "post") === etapa)
      : cleanQuestions;

    let totalPointsEarned = 0;
    let totalPossiblePoints = 0;

    for (const q of questions) {
      const qWeight = Number(q.puntos) || 2;
      totalPossiblePoints += qWeight;

      const userSelectedOptId = payload.respuestas[String(q.id)];
      const correctOpt = (q.opciones || []).find((o) => o.es_correcta);

      if (userSelectedOptId && correctOpt && userSelectedOptId === correctOpt.id) {
        totalPointsEarned += qWeight;
      }
    }

    // Convert to standard 0-20 scale
    let finalScore = totalPossiblePoints > 0
      ? (totalPointsEarned / totalPossiblePoints) * 20
      : 0;

    // Round to 1 decimal place or integer
    finalScore = Math.round(finalScore * 10) / 10;
    const notaAprobatoria = Number(osiEval.nota_aprobatoria) || 14;
    const aprobado = finalScore >= notaAprobatoria;

    // 3. Save submission record (with retry without etapa if column missing from schema cache)
    let subErr: { code?: string; message?: string } | null = null;
    const { error: initialErr } = await admin
      .from("capacitacion_evaluaciones_respuestas")
      .insert({
        osi_evaluacion_id: osiEval.id,
        id_osi: osi.id_osi,
        nro_sesion: payload.nroSesion ?? 1,
        cedula: cleanCedula,
        nombre_apellido: cleanNombre,
        respuestas: payload.respuestas,
        nota: finalScore,
        aprobado,
        dispositivo: payload.dispositivo || "mobile_qr",
        etapa,
      });

    subErr = initialErr;

    if (subErr && (subErr.code === "PGRST204" || subErr.message?.includes("etapa"))) {
      const { error: retryErr } = await admin
        .from("capacitacion_evaluaciones_respuestas")
        .insert({
          osi_evaluacion_id: osiEval.id,
          id_osi: osi.id_osi,
          nro_sesion: payload.nroSesion ?? 1,
          cedula: cleanCedula,
          nombre_apellido: cleanNombre,
          respuestas: payload.respuestas,
          nota: finalScore,
          aprobado,
          dispositivo: payload.dispositivo || "mobile_qr",
        });
      subErr = retryErr;
    }

    if (subErr) {
      console.error("[submitOSIEvaluacion] Error saving submission:", subErr);
      return { success: false, error: "Error al guardar el resultado de la evaluación." };
    }

    // 4. Automatically populate into ejecucion_osi_participantes
    try {
      // Find active facilitador for this OSI
      const { data: assignment } = await admin
        .from("facilitador_osi_assignments")
        .select("facilitador_id")
        .eq("osi_id", osi.id_osi)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      const facilitadorId = assignment?.facilitador_id || 0;

      if (existingParticipant) {
        const updateData: Record<string, unknown> = {
          nombre_apellido: cleanNombre,
          status: "guardado",
          updated_at: new Date().toISOString(),
        };

        if (isPrePost) {
          updateData.tipo_evaluacion = "pre_post";
          if (etapa === "pre") {
            updateData.score_pre = finalScore;
            const postVal = existingParticipant.score_post !== null ? Number(existingParticipant.score_post) : null;
            if (postVal !== null && !isNaN(postVal)) {
              updateData.score_promedio = Math.round(((finalScore + postVal) / 2) * 10) / 10;
              updateData.score = finalScore;
            } else {
              updateData.score = finalScore;
            }
          } else {
            updateData.score_post = finalScore;
            updateData.score = finalScore;
            updateData.score_teorica = finalScore;
            const preVal = existingParticipant.score_pre !== null ? Number(existingParticipant.score_pre) : null;
            if (preVal !== null && !isNaN(preVal)) {
              updateData.score_promedio = Math.round(((preVal + finalScore) / 2) * 10) / 10;
            }
          }
        } else {
          updateData.score = finalScore;
          updateData.score_teorica = finalScore;
        }

        await admin
          .from("ejecucion_osi_participantes")
          .update(updateData)
          .eq("id", existingParticipant.id);
      } else {
        const insertData: Record<string, unknown> = {
          osi_id: osi.id_osi,
          facilitador_id: facilitadorId,
          nombre_apellido: cleanNombre,
          cedula: cleanCedula,
          status: "guardado",
          nro_sesion: payload.nroSesion ?? 1,
        };

        if (isPrePost) {
          insertData.tipo_evaluacion = "pre_post";
          if (etapa === "pre") {
            insertData.score_pre = finalScore;
            insertData.score = finalScore;
          } else {
            insertData.score_post = finalScore;
            insertData.score = finalScore;
            insertData.score_teorica = finalScore;
          }
        } else {
          insertData.score = finalScore;
          insertData.score_teorica = finalScore;
        }

        await admin
          .from("ejecucion_osi_participantes")
          .insert(insertData);
      }
    } catch (syncErr) {
      console.warn("[submitOSIEvaluacion] Warning syncing to ejecucion_osi_participantes:", syncErr);
    }

    // Revalidate paths for Facilitator portal and dashboard
    revalidatePath(`/portal/facilitador/osi/${osi.id_osi}`);
    revalidatePath(`/dashboard/capacitacion/gestion-osi`);

    // Intentionally do NOT send score or approval flag back to participant UI
    return {
      success: true,
      etapa,
      alreadySubmitted: false,
    };
  } catch (err) {
    console.error("[submitOSIEvaluacion] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Fetch all participant submissions for an OSI evaluation.
 */
export async function getOSIEvaluacionSubmissions(osiId: number): Promise<EvaluacionRespuestaItem[]> {
  const admin = await createAdminClient();

  const { data, error } = await admin
    .from("capacitacion_evaluaciones_respuestas")
    .select("*")
    .eq("id_osi", osiId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getOSIEvaluacionSubmissions] Error:", error);
    return [];
  }

  return (data || []).map((r: Record<string, unknown>) => ({
    id: Number(r.id),
    osi_evaluacion_id: Number(r.osi_evaluacion_id),
    id_osi: Number(r.id_osi),
    nro_sesion: Number(r.nro_sesion || 1),
    cedula: String(r.cedula || ""),
    nombre_apellido: String(r.nombre_apellido || ""),
    respuestas: (r.respuestas as Record<string, string>) || {},
    nota: Number(r.nota),
    aprobado: Boolean(r.aprobado),
    dispositivo: String(r.dispositivo || "mobile_qr"),
    created_at: String(r.created_at || ""),
  }));
}

