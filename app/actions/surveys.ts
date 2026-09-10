"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { CourseSatisfactionSurvey, SurveyOSIData, SurveyTabulacionData, SurveyMode } from "@/types";
import { generateSurveyTabulacionPdf } from "@/lib/survey-tabulacion-renderer";
import { revalidatePath } from "next/cache";
import { getSessionCount } from "@/lib/osi-utils";

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
 * Get the survey QR mode for an OSI ('unique' | 'per_session').
 * Defaults to 'unique' when no setting row exists or on error.
 */
export async function getSurveyMode(osiId: number): Promise<SurveyMode> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("capacitacion_osi_survey_settings")
      .select("survey_mode")
      .eq("osi_id", osiId)
      .maybeSingle();

    if (error || !data) {
      return "unique";
    }
    return data.survey_mode === "per_session" ? "per_session" : "unique";
  } catch (error) {
    console.error("Exception fetching survey mode:", error);
    return "unique";
  }
}

/**
 * Fetch the real session count for an OSI.
 *
 * The gestion-osi list view (v_osi_lista) only exposes sesiones_ejecucion
 * (executed count, 0/null for not-yet-executed OSIs), so callers that need the
 * planned session count (e.g. the survey/QR and assign-facilitador modals) must
 * fetch it here.
 *
 * Priority chain (mirrors resolveSessions / getOSISessions):
 *   1. osi_sesion table row count (authoritative relational source — fast,
 *      indexed by id_osi; populated by the seguimiento system)
 *   2. v_osi_formato_completo: desglose_recursos_sesiones → sesiones_programadas
 *      → sesiones_ejecucion (via getSessionCount)
 *   3. 1 (single-session default)
 */
export async function getOsiSessionCount(osiId: number): Promise<number> {
  try {
    // 1. osi_sesion table — the most reliable source for planned sessions.
    const admin = await createAdminClient();
    const { count, error: sesionError } = await admin
      .from("osi_sesion")
      .select("id", { count: "exact", head: true })
      .eq("id_osi", osiId);

    if (!sesionError && count && count > 0) {
      return count;
    }

    // 2. Fall back to v_osi_formato_completo JSONB fields.
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("v_osi_formato_completo")
      .select("desglose_recursos_sesiones, sesiones_programadas, sesiones_ejecucion")
      .eq("id_osi", osiId)
      .maybeSingle();

    if (error || !data) {
      return 1;
    }
    return getSessionCount(data);
  } catch (error) {
    console.error("Exception fetching OSI session count:", error);
    return 1;
  }
}

/**
 * Persist the survey QR mode for an OSI (upsert into the settings table).
 */
export async function setSurveyMode(
  osiId: number,
  mode: SurveyMode,
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await createAdminClient();
    const { error } = await admin
      .from("capacitacion_osi_survey_settings")
      .upsert({ osi_id: osiId, survey_mode: mode }, { onConflict: "osi_id" });

    if (error) {
      console.error("Error setting survey mode:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/capacitacion/gestion-osi`);
    revalidatePath(`/dashboard/capacitacion/gestion-osi/${osiId}/survey-view`);
    return { success: true };
  } catch (error) {
    console.error("Exception setting survey mode:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Submit a survey response
 */
export async function submitSurvey(survey: CourseSatisfactionSurvey) {
  const { submitSurveyCore } = await import("@/lib/surveys/submit-survey-core");
  const result = await submitSurveyCore(survey);

  if (result.success) {
    revalidatePath(`/dashboard/capacitacion/gestion-osi/${survey.id_osi}/survey-view`);
    revalidatePath(`/dashboard/capacitacion/seguimiento-servicios`);
  }

  return result;
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
  nroSesion?: number,
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

    // 2. Facilitator name (scoped to session if provided).
    const osiSurveyData = await getOSIDataForSurvey(osiId, nroSesion);
    const facilitador_nombre = osiSurveyData?.facilitador_nombre || "";

    // If specific session requested, resolve session date from osi_sesion
    let fechaInicio = osi.fecha_inicio_real;
    if (nroSesion !== undefined) {
      const { data: sesionData } = await supabase
        .from("osi_sesion")
        .select("fecha")
        .eq("id_osi", osiId)
        .eq("nro_sesion", nroSesion)
        .maybeSingle();

      if (sesionData?.fecha) {
        fechaInicio = sesionData.fecha;
      }
    }

    // 3. Surveys for this OSI (all or filtered by session).
    const surveys = await getSurveysByOSI(osiId, nroSesion);
    if (surveys.length === 0) {
      // Return a zeroed-out structure so the PDF can still render (empty).
      return {
        id_osi: osi.id_osi!,
        nro_osi: osi.nro_osi || "",
        nombre_empresa: osi.nombre_empresa || "",
        servicio: osi.servicio || "",
        facilitador_nombre,
        ejecutivo_negocios: osi.ejecutivo_negocios || "",
        fecha_inicio_real: fechaInicio || "",
        total_participantes: nroSesion !== undefined ? surveys.length : (osi.participantes_ejecucion ?? 0),
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

function sanitizeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .substring(0, 60) || "resultado_actividad"
  );
}

export interface ResultadoActividadFile {
  fileName: string;
  base64: string;
}

/**
 * Fetch and generate all applicable "Resultado de la Actividad" PDF report files for an OSI.
 * - If survey_mode is 'per_session' and sessions have surveys: generates one PDF per session with surveys.
 * - If survey_mode is 'unique' (or default): generates one combined PDF for the OSI.
 * - If no surveys exist: returns an empty array.
 */
export async function getResultadoActividadFilesAction(
  osiId: number,
): Promise<{ success: boolean; files: ResultadoActividadFile[]; error?: string }> {
  try {
    const supabase = await createClient();
    const mode = await getSurveyMode(osiId);

    if (mode === "per_session") {
      const { data: sessionRows, error } = await supabase
        .from("course_satisfaction_surveys")
        .select("nro_sesion")
        .eq("id_osi", osiId);

      if (error) {
        console.error("Error fetching survey sessions:", error);
        return { success: false, files: [], error: error.message };
      }

      if (!sessionRows || sessionRows.length === 0) {
        return { success: true, files: [] };
      }

      const distinctSessions = Array.from(
        new Set(sessionRows.map((r) => r.nro_sesion ?? 1)),
      ).sort((a, b) => a - b);

      const files: ResultadoActividadFile[] = [];
      for (const sessionNum of distinctSessions) {
        const tabData = await getSurveyTabulacionData(osiId, sessionNum);
        if (tabData && tabData.total_encuestas > 0) {
          const buffer = await generateSurveyTabulacionPdf(tabData);
          const safeOsi = sanitizeFilename(tabData.nro_osi);
          files.push({
            fileName: `Resultado_Actividad_OSI_${safeOsi}_Sesion_${sessionNum}.pdf`,
            base64: buffer.toString("base64"),
          });
        }
      }

      return { success: true, files };
    } else {
      const { count, error } = await supabase
        .from("course_satisfaction_surveys")
        .select("*", { count: "exact", head: true })
        .eq("id_osi", osiId);

      if (error) {
        console.error("Error counting surveys:", error);
        return { success: false, files: [], error: error.message };
      }

      if (!count || count === 0) {
        return { success: true, files: [] };
      }

      const tabData = await getSurveyTabulacionData(osiId);
      if (!tabData || tabData.total_encuestas === 0) {
        return { success: true, files: [] };
      }

      const buffer = await generateSurveyTabulacionPdf(tabData);
      const safeOsi = sanitizeFilename(tabData.nro_osi);
      return {
        success: true,
        files: [
          {
            fileName: `Resultado_Actividad_OSI_${safeOsi}.pdf`,
            base64: buffer.toString("base64"),
          },
        ],
      };
    }
  } catch (error) {
    console.error("Error in getResultadoActividadFilesAction:", error);
    return {
      success: false,
      files: [],
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
