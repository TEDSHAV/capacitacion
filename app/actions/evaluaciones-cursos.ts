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
  TipoEvaluacionCurso,
} from "@/types/evaluacion";
import { toTitleCase } from "@/utils/string-utils";

/**
 * Resolves an OSI by either its internal numeric ID or its sequential/formatted number
 * (e.g. "153", "2026-042", "OSI-2026-042").
 */
export async function resolveOSIByIdentifier(identifier: string): Promise<{
  id_osi: number;
  nro_osi: string;
  servicio: string;
  nombre_empresa: string;
} | null> {
  const admin = await createAdminClient();
  const trimmed = identifier.trim();
  const cleanNumber = trimmed.replace(/^OSI-?/i, "").trim();

  // 1. Try exact match on nro_osi (since users and URLs type e.g. "3746" or "2026-042")
  const { data: byExactNro } = await admin
    .from("v_osi_formato_completo")
    .select("id_osi, nro_osi, servicio, nombre_empresa")
    .eq("nro_osi", cleanNumber)
    .limit(1)
    .maybeSingle();

  if (byExactNro) {
    return {
      id_osi: byExactNro.id_osi,
      nro_osi: byExactNro.nro_osi || `OSI-${byExactNro.id_osi}`,
      servicio: byExactNro.servicio || "Servicio de Capacitación",
      nombre_empresa: byExactNro.nombre_empresa || "Cliente",
    };
  }

  // 2. If numeric, try matching by id_osi directly
  const numericId = parseInt(trimmed, 10);
  if (!isNaN(numericId) && numericId > 0 && String(numericId) === trimmed) {
    const { data: byId } = await admin
      .from("v_osi_formato_completo")
      .select("id_osi, nro_osi, servicio, nombre_empresa")
      .eq("id_osi", numericId)
      .maybeSingle();

    if (byId) {
      return {
        id_osi: byId.id_osi,
        nro_osi: byId.nro_osi || `OSI-${byId.id_osi}`,
        servicio: byId.servicio || "Servicio de Capacitación",
        nombre_empresa: byId.nombre_empresa || "Cliente",
      };
    }
  }

  // 3. Try partial substring match on nro_osi
  const { data: byNroLike } = await admin
    .from("v_osi_formato_completo")
    .select("id_osi, nro_osi, servicio, nombre_empresa")
    .ilike("nro_osi", `%${cleanNumber}%`)
    .limit(1)
    .maybeSingle();

  if (byNroLike) {
    return {
      id_osi: byNroLike.id_osi,
      nro_osi: byNroLike.nro_osi || `OSI-${byNroLike.id_osi}`,
      servicio: byNroLike.servicio || "Servicio de Capacitación",
      nombre_empresa: byNroLike.nombre_empresa || "Cliente",
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

  let { data, error } = await admin
    .from("catalogo_servicios")
    .select("id, nombre, nota_aprobatoria")
    .eq("esta_activo", true)
    .eq("id_departamento_ejecutante", 3)
    .eq("tipo_servicio", 1)
    .eq("mostrar_en_catalogo", true)
    .order("nombre", { ascending: true });

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

  return (data || []).map((c: any) => ({
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

  return (templates || []).map((t: any) => ({
    id: t.id,
    id_curso: t.id_curso,
    titulo: t.titulo,
    descripcion: t.descripcion,
    nota_aprobatoria: Number(t.nota_aprobatoria) || 14,
    duracion_minutos: t.duracion_minutos,
    tipo_evaluacion: (t.tipo_evaluacion as TipoEvaluacionCurso) || "standard",
    is_active: t.is_active,
    created_at: t.created_at,
    updated_at: t.updated_at,
    preguntas_count: countMap.get(t.id) || 0,
    curso_nombre: t.catalogo_servicios?.nombre || null,
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

  const formattedQuestions: EvaluacionPregunta[] = (questions || []).map((q: any) => ({
    id: String(q.id),
    enunciado: q.enunciado,
    tipo: q.tipo || "single_choice",
    puntos: Number(q.puntos) || 2,
    orden: q.orden || 1,
    etapa: q.etapa || "post",
    opciones: Array.isArray(q.opciones) ? q.opciones : [],
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
  data: OSIEvaluacion | null;
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

  return {
    data: {
      id: data.id,
      id_osi: data.id_osi,
      plantilla_id: data.plantilla_id,
      titulo: data.titulo,
      nota_aprobatoria: Number(data.nota_aprobatoria) || 14,
      duracion_minutos: data.duracion_minutos,
      preguntas: Array.isArray(data.preguntas) ? data.preguntas : [],
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
}): Promise<{ data?: OSIEvaluacion; error?: string }> {
  const admin = await createAdminClient();
  const supabase = await createClient();
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id || null;

  try {
    let titulo = payload.titulo?.trim();
    let notaAprobatoria = payload.nota_aprobatoria ?? 14;
    let duracionMinutos = payload.duracion_minutos ?? null;
    let preguntas: EvaluacionPregunta[] = payload.preguntas || [];
    let tipoEvaluacion: TipoEvaluacionCurso = "standard";

    // If template specified and no explicit questions provided, load from template
    if (payload.plantilla_id && preguntas.length === 0) {
      const tplRes = await getEvaluacionPlantilla(payload.plantilla_id);
      if (tplRes.data) {
        if (!titulo) titulo = tplRes.data.titulo;
        notaAprobatoria = tplRes.data.nota_aprobatoria;
        duracionMinutos = tplRes.data.duracion_minutos;
        preguntas = tplRes.data.preguntas || [];
        tipoEvaluacion = tplRes.data.tipo_evaluacion || "standard";
      }
    }

    if (!titulo) {
      titulo = "Evaluación de Curso";
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
          preguntas,
          is_active: true,
          updated_at: new Date().toISOString(),
          created_by: userId,
        },
        { onConflict: "id_osi" },
      )
      .select()
      .single();

    if (error || !saved) throw error;

    revalidatePath(`/dashboard/capacitacion/gestion-osi`);
    revalidatePath(`/portal/facilitador/osi/${payload.id_osi}`);
    revalidatePath(`/evaluacion/${payload.id_osi}`);

    return {
      data: {
        id: saved.id,
        id_osi: saved.id_osi,
        plantilla_id: saved.plantilla_id,
        titulo: saved.titulo,
        nota_aprobatoria: Number(saved.nota_aprobatoria) || 14,
        duracion_minutos: saved.duracion_minutos,
        tipo_evaluacion: (saved.tipo_evaluacion as TipoEvaluacionCurso) || "standard",
        preguntas: Array.isArray(saved.preguntas) ? saved.preguntas : [],
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
  const osi = await resolveOSIByIdentifier(identifier);
  if (!osi) {
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

  const rawQuestions: EvaluacionPregunta[] = Array.isArray(osiEval.preguntas)
    ? osiEval.preguntas
    : [];

  // Strip correct answer flags
  const sanitizedQuestions = rawQuestions.map((q) => ({
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
      tipoEvaluacion: (osiEval.tipo_evaluacion as TipoEvaluacionCurso) || "standard",
      preguntas: sanitizedQuestions,
    },
  };
}

/**
 * Submit and auto-grade an evaluation.
 *
 * 1. Checks correct answers against the server-side snapshot.
 * 2. Calculates grade on a 0–20 scale.
 * 3. Records submission in `capacitacion_evaluaciones_respuestas`.
 * 4. Automatically upserts participant name, cédula, and score into `ejecucion_osi_participantes`,
 *    making it immediately visible in the Facilitator Portal!
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

    const etapa = payload.etapa || "post";
    const isPrePost = osiEval.tipo_evaluacion === "pre_post";

    // Check if participant already submitted this exam stage
    let subQuery = admin
      .from("capacitacion_evaluaciones_respuestas")
      .select("id, nota, aprobado, etapa")
      .eq("id_osi", osi.id_osi)
      .eq("cedula", cleanCedula);

    if (isPrePost) {
      subQuery = subQuery.eq("etapa", etapa);
    }

    const { data: existingSub } = await subQuery.maybeSingle();

    if (existingSub) {
      return {
        success: true,
        alreadySubmitted: true,
        score: Number(existingSub.nota),
        aprobado: existingSub.aprobado,
        notaAprobatoria: Number(osiEval.nota_aprobatoria) || 14,
      };
    }

    // 2. Auto-grading
    const rawQuestions: EvaluacionPregunta[] = Array.isArray(osiEval.preguntas)
      ? osiEval.preguntas
      : [];

    const questions = isPrePost
      ? rawQuestions.filter((q) => (q.etapa || "post") === etapa)
      : rawQuestions;

    let totalPointsEarned = 0;
    let totalPossiblePoints = 0;
    let correctCount = 0;

    for (const q of questions) {
      const qWeight = Number(q.puntos) || 2;
      totalPossiblePoints += qWeight;

      const userSelectedOptId = payload.respuestas[String(q.id)];
      const correctOpt = (q.opciones || []).find((o) => o.es_correcta);

      if (userSelectedOptId && correctOpt && userSelectedOptId === correctOpt.id) {
        totalPointsEarned += qWeight;
        correctCount += 1;
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

    // 3. Save submission record
    const { error: subErr } = await admin
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

      // Check if participant row exists in ejecucion_osi_participantes
      const { data: existingParticipant } = await admin
        .from("ejecucion_osi_participantes")
        .select("id, score, score_pre, score_post")
        .eq("osi_id", osi.id_osi)
        .eq("cedula", cleanCedula)
        .maybeSingle();

      if (existingParticipant) {
        const updateData: Record<string, any> = {
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
        const insertData: Record<string, any> = {
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

    return {
      success: true,
      score: finalScore,
      aprobado,
      notaAprobatoria,
      totalQuestions: questions.length,
      correctCount,
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

  return (data || []).map((r: any) => ({
    id: r.id,
    osi_evaluacion_id: r.osi_evaluacion_id,
    id_osi: r.id_osi,
    nro_sesion: r.nro_sesion,
    cedula: r.cedula,
    nombre_apellido: r.nombre_apellido,
    respuestas: r.respuestas || {},
    nota: Number(r.nota),
    aprobado: r.aprobado,
    dispositivo: r.dispositivo,
    created_at: r.created_at,
  }));
}

