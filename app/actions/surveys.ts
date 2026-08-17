"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { CourseSatisfactionSurvey, SurveyOSIData, SurveyTabulacionData } from "@/types";
import { revalidatePath } from "next/cache";

/**
 * Fetch OSI details for the survey form
 */
export async function getOSIDataForSurvey(osiId: number, nroSesion?: number): Promise<SurveyOSIData | null> {
  try {
    const supabase = await createClient();

    // Get basic OSI data from the view
    const { data, error } = await supabase
      .from("v_osi_lista")
      .select(`
        id_osi,
        nro_osi,
        nombre_empresa,
        servicio,
        fecha_inicio_real
      `)
      .eq("id_osi", osiId)
      .single();

    if (error || !data) {
      console.error("Error fetching OSI data for survey:", error);
      return null;
    }

    const sessionNum = nroSesion ?? 1;
    let facilitador_nombre = "";

    // Fetch all active assignments for this OSI, then pick the right one for the session
    const { data: assignments } = await supabase
      .from("facilitador_osi_assignments")
      .select(`
        nro_sesion,
        facilitadores (
          nombre_apellido
        )
      `)
      .eq("osi_id", osiId)
      .eq("is_active", true);

    if (assignments && assignments.length > 0) {
      // Prefer an assignment matching the specific session
      let match = assignments.find((a: any) => a.nro_sesion === sessionNum);
      // Fall back to an all-sessions assignment (nro_sesion = null)
      if (!match) match = assignments.find((a: any) => a.nro_sesion === null);
      // Fall back to the first assignment
      if (!match) match = assignments[0];

      const facilitadorRelation = match?.facilitadores;
      const facilitadorObj = Array.isArray(facilitadorRelation)
        ? facilitadorRelation[0]
        : facilitadorRelation;

      if (facilitadorObj?.nombre_apellido) {
        facilitador_nombre = facilitadorObj.nombre_apellido;
      }
    }

    // Fallback: search in certificates for this OSI
    if (!facilitador_nombre) {
      const { data: certData } = await supabase
        .from("certificados")
        .select("id_facilitador")
        .eq("nro_osi", parseInt(data.nro_osi.replace(/[^\d]/g, "")))
        .limit(1)
        .maybeSingle();

      if (certData?.id_facilitador) {
        const { data: facilitatorData } = await supabase
          .from("facilitadores")
          .select("nombre_apellido")
          .eq("id", certData.id_facilitador)
          .single();

        if (facilitatorData) {
          facilitador_nombre = facilitatorData.nombre_apellido;
        }
      }
    }

    return {
      id_osi: data.id_osi,
      nro_osi: data.nro_osi,
      nombre_empresa: data.nombre_empresa,
      servicio: data.servicio,
      fecha_inicio_real: data.fecha_inicio_real,
      facilitador_nombre,
      nro_sesion: sessionNum,
    };
  } catch (error) {
    console.error("Exception fetching OSI data for survey:", error);
    return null;
  }
}

/**
 * Submit a survey response
 */
export async function submitSurvey(survey: CourseSatisfactionSurvey) {
  try {
    const supabase = await createClient();
    
    const sessionNum = survey.nro_sesion ?? 1;

    const { error } = await supabase
      .from("course_satisfaction_surveys")
      .insert({
        id_osi: survey.id_osi,
        nro_sesion: sessionNum,
        q1: survey.q1,
        q2: survey.q2,
        q3: survey.q3,
        q4: survey.q4,
        q5: survey.q5,
        q6: survey.q6,
        q7: survey.q7,
        q8: survey.q8,
        q9: survey.q9,
        q10: survey.q10,
        attendance_reasons: survey.attendance_reasons
      });

    if (error) {
      console.error("Error submitting survey:", error);
      return { success: false, error: error.message };
    }

    // Auto-mark the encuestas_satisfaccion_tabulacion process step as completed
    // for the specific session only. completed_by is null because the column is UUID type
    // (using a string like "survey_submission" causes a silent PostgreSQL error).
    try {
      const admin = await createAdminClient();
      await admin
        .from("capacitacion_proceso_steps")
        .upsert(
          {
            osi_id: survey.id_osi,
            nro_sesion: sessionNum,
            phase: "ejecucion",
            step_key: "encuestas_satisfaccion_tabulacion",
            completed: true,
            completed_at: new Date().toISOString(),
            completed_by: null,
          },
          { onConflict: "osi_id,nro_sesion,phase,step_key" },
        );
    } catch (stepErr) {
      console.error("Failed to auto-mark encuestas step:", stepErr);
    }

    revalidatePath(`/dashboard/capacitacion/gestion-osi/${survey.id_osi}/survey-view`);
    revalidatePath(`/dashboard/capacitacion/seguimiento-servicios`);
    return { success: true };
  } catch (error) {
    console.error("Exception submitting survey:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get all surveys for a specific OSI
 */
export async function getSurveysByOSI(osiId: number, nroSesion?: number): Promise<CourseSatisfactionSurvey[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("course_satisfaction_surveys")
      .select("*")
      .eq("id_osi", osiId);

    if (nroSesion !== undefined) {
      query = query.eq("nro_sesion", nroSesion);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching surveys for OSI:", error);
      return [];
    }

    return data as CourseSatisfactionSurvey[];
  } catch (error) {
    console.error("Exception fetching surveys for OSI:", error);
    return [];
  }
}

/**
 * Get a single survey by ID
 */
export async function getSurveyById(surveyId: string): Promise<CourseSatisfactionSurvey | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("course_satisfaction_surveys")
      .select("*")
      .eq("id", surveyId)
      .single();

    if (error) {
      console.error("Error fetching survey by ID:", error);
      return null;
    }

    return data as CourseSatisfactionSurvey;
  } catch (error) {
    console.error("Exception fetching survey by ID:", error);
    return null;
  }
}

// ─── Survey Tabulation Report ("Resultado de la Actividad") ───────────────────
//
// Section definitions matching the reference PDF and SurveyForm.tsx.
//   - Desenvolvimiento del Facilitador (60%) → q1–q5
//   - Aspectos de la capacitación (40%)      → q6–q9
//   - Calidad del Entorno (5%)               → q10
const TABULACION_SECTIONS = [
  { key: "facilitador", label: "Desenvolvimiento del Facilitador (60%)", weight: 0.6, question_ids: [1, 2, 3, 4, 5] },
  { key: "capacitacion", label: "Aspectos de la capacitación (40%)", weight: 0.4, question_ids: [6, 7, 8, 9] },
  { key: "entorno", label: "Calidad del Entorno (5%)", weight: 0.05, question_ids: [10] },
] as const;

/**
 * Aggregate all surveys for an OSI into the weighted tabulation structure
 * used by the "Resultado de la Actividad" PDF report.
 *
 * Aggregates across ALL sessions (a single facilitator name is resolved
 * via the primary/most-recent assignment).
 */
export async function getSurveyTabulacionData(
  osiId: number,
): Promise<SurveyTabulacionData | null> {
  try {
    const supabase = await createClient();

    // 1. OSI metadata from v_osi_lista (includes ejecutivo_negocios and
    //    participantes_ejecucion which are not in SurveyOSIData).
    const { data: osi, error: osiError } = await supabase
      .from("v_osi_lista")
      .select(`
        id_osi,
        nro_osi,
        nombre_empresa,
        servicio,
        fecha_inicio_real,
        ejecutivo_negocios,
        participantes_ejecucion
      `)
      .eq("id_osi", osiId)
      .single();

    if (osiError || !osi) {
      console.error("Error fetching OSI for tabulation:", osiError);
      return null;
    }

    // 2. Facilitator name (reuse the existing resolver so the logic stays
    //    consistent with the survey form / document view).
    const osiSurveyData = await getOSIDataForSurvey(osiId);
    const facilitador_nombre = osiSurveyData?.facilitador_nombre || "";

    // 3. All surveys for this OSI (every session).
    const surveys = await getSurveysByOSI(osiId);
    if (surveys.length === 0) {
      // Return a zeroed-out structure so the PDF can still render (empty).
      return {
        id_osi: osi.id_osi!,
        nro_osi: osi.nro_osi || "",
        nombre_empresa: osi.nombre_empresa || "",
        servicio: osi.servicio || "",
        facilitador_nombre,
        ejecutivo_negocios: osi.ejecutivo_negocios || "",
        fecha_inicio_real: osi.fecha_inicio_real || "",
        total_participantes: osi.participantes_ejecucion ?? 0,
        total_encuestas: 0,
        sections: {
          facilitador: { label: TABULACION_SECTIONS[0].label, weight: TABULACION_SECTIONS[0].weight, question_ids: [1, 2, 3, 4, 5], distributions: {}, total: 0 },
          capacitacion: { label: TABULACION_SECTIONS[1].label, weight: TABULACION_SECTIONS[1].weight, question_ids: [6, 7, 8, 9], distributions: {}, total: 0 },
          entorno: { label: TABULACION_SECTIONS[2].label, weight: TABULACION_SECTIONS[2].weight, question_ids: [10], distributions: {}, total: 0 },
        },
        resultados_servicio: {},
        attendance_reasons: {},
      };
    }

    // 4. Aggregate per-section distributions and attendance reasons.
    const sectionAgg: Record<string, { distributions: { [level: number]: number }; total: number }> = {
      facilitador: { distributions: {}, total: 0 },
      capacitacion: { distributions: {}, total: 0 },
      entorno: { distributions: {}, total: 0 },
    };
    const attendance_reasons: { [reason: string]: number } = {};

    for (const s of surveys) {
      for (const sec of TABULACION_SECTIONS) {
        for (const qNum of sec.question_ids) {
          const score = (s as any)[`q${qNum}`] as number | null | undefined;
          if (score == null) continue;
          sectionAgg[sec.key].distributions[score] = (sectionAgg[sec.key].distributions[score] || 0) + 1;
          sectionAgg[sec.key].total += 1;
        }
      }
      if (Array.isArray(s.attendance_reasons)) {
        for (const r of s.attendance_reasons) {
          if (typeof r === "string") {
            attendance_reasons[r] = (attendance_reasons[r] || 0) + 1;
          }
        }
      }
    }

    // 5. Build the typed sections.
    const sections = {
      facilitador: {
        label: TABULACION_SECTIONS[0].label,
        weight: TABULACION_SECTIONS[0].weight,
        question_ids: [1, 2, 3, 4, 5],
        distributions: sectionAgg.facilitador.distributions,
        total: sectionAgg.facilitador.total,
      },
      capacitacion: {
        label: TABULACION_SECTIONS[1].label,
        weight: TABULACION_SECTIONS[1].weight,
        question_ids: [6, 7, 8, 9],
        distributions: sectionAgg.capacitacion.distributions,
        total: sectionAgg.capacitacion.total,
      },
      entorno: {
        label: TABULACION_SECTIONS[2].label,
        weight: TABULACION_SECTIONS[2].weight,
        question_ids: [10],
        distributions: sectionAgg.entorno.distributions,
        total: sectionAgg.entorno.total,
      },
    };

    // 6. Resultados del servicio = weighted % per level for sections 1+2
    //    (Facilitador 60% + Capacitación 40% = 100%). Entorno (5%) is shown
    //    separately and does not factor into the overall result.
    //    Total (%) = (count * weight) / section_total_responses, summed
    //    across the two sections per level.
    const resultados_servicio: { [level: number]: number } = {};
    for (const level of [5, 4, 3, 2, 1]) {
      const fCount = sections.facilitador.distributions[level] || 0;
      const cCount = sections.capacitacion.distributions[level] || 0;
      const fPct = sections.facilitador.total > 0
        ? (fCount * sections.facilitador.weight) / sections.facilitador.total
        : 0;
      const cPct = sections.capacitacion.total > 0
        ? (cCount * sections.capacitacion.weight) / sections.capacitacion.total
        : 0;
      resultados_servicio[level] = fPct + cPct;
    }

    return {
      id_osi: osi.id_osi!,
      nro_osi: osi.nro_osi || "",
      nombre_empresa: osi.nombre_empresa || "",
      servicio: osi.servicio || "",
      facilitador_nombre,
      ejecutivo_negocios: osi.ejecutivo_negocios || "",
      fecha_inicio_real: osi.fecha_inicio_real || "",
      total_participantes: osi.participantes_ejecucion ?? surveys.length,
      total_encuestas: surveys.length,
      sections,
      resultados_servicio,
      attendance_reasons,
    };
  } catch (error) {
    console.error("Exception building survey tabulation data:", error);
    return null;
  }
}
