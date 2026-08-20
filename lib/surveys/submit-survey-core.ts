import "server-only";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { CourseSatisfactionSurvey } from "@/types";

/**
 * Core survey submission logic, shared by both the server action and the API route.
 * Handles inserting the survey and auto-marking the process step.
 */
export async function submitSurveyCore(survey: CourseSatisfactionSurvey) {
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
        attendance_reasons: survey.attendance_reasons,
      });

    if (error) {
      console.error("Error submitting survey:", error);
      return { success: false, error: error.message };
    }

    // Auto-mark the encuestas_satisfaccion_tabulacion process step as completed
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

    return { success: true };
  } catch (error) {
    console.error("Exception submitting survey:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
