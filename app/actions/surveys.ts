"use server";

import { createClient } from "@/utils/supabase/server";
import { CourseSatisfactionSurvey, SurveyOSIData } from "@/types";
import { revalidatePath } from "next/cache";

/**
 * Fetch OSI details for the survey form
 */
export async function getOSIDataForSurvey(osiId: number): Promise<SurveyOSIData | null> {
  try {
    const supabase = await createClient();
    
    // Get basic OSI data from the view
    const { data, error } = await supabase
      .from("v_osi_formato_completo")
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

    let facilitador_nombre = "";
    
    // Attempt to fetch facilitator from control_servicios_ejecutados
    const { data: controlData } = await supabase
      .from("control_servicios_ejecutados")
      .select("facilitador, cod_facilitador")
      .eq("id_osi", osiId)
      .maybeSingle();

    if (controlData?.facilitador) {
      facilitador_nombre = controlData.facilitador;
    } else {
      // Fallback: search in certificates for this OSI
      const { data: certData } = await supabase
        .from("certificados")
        .select("id_facilitador")
        .eq("nro_osi", parseInt(data.nro_osi.replace(/[^\d]/g, ""))) // Use numeric part of OSI
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
      facilitador_nombre
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
    
    const { error } = await supabase
      .from("course_satisfaction_surveys")
      .insert({
        id_osi: survey.id_osi,
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

    revalidatePath(`/dashboard/capacitacion/gestion-osi/${survey.id_osi}/survey-view`);
    return { success: true };
  } catch (error) {
    console.error("Exception submitting survey:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get all surveys for a specific OSI
 */
export async function getSurveysByOSI(osiId: number): Promise<CourseSatisfactionSurvey[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("course_satisfaction_surveys")
      .select("*")
      .eq("id_osi", osiId)
      .order("created_at", { ascending: false });

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
