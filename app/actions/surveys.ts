"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { CourseSatisfactionSurvey, SurveyOSIData } from "@/types";
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
