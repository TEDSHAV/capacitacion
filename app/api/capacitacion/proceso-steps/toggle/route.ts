import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";
import { syncOsiEjecutadoToShell } from "@/lib/sync/sync-osi-estatus";
import { isPostServiceOrSubsequentStep } from "@/lib/proceso-steps";

/**
 * POST /api/capacitacion/proceso-steps/toggle
 * Public endpoint for toggling unified steps (used by offline queue).
 * Accepts desired-state payloads (not raw toggles) for idempotent replay.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (
      !body.osiId ||
      !body.stepKey ||
      typeof body.osiId !== "number" ||
      typeof body.stepKey !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing or invalid osiId/stepKey" },
        { status: 400 }
      );
    }

    const osiId = body.osiId as number;
    const stepKey = body.stepKey as string;
    const nroSesion = body.nroSesion ?? 1;
    const phase = body.phase ?? "ejecucion";
    const desiredState = body.desiredState ?? true; // true = completed, false = not completed

    const admin = await createAdminClient();

    // Upsert the step with the desired state (idempotent)
    const { error } = await admin
      .from("capacitacion_proceso_steps")
      .upsert(
        {
          osi_id: osiId,
          nro_sesion: nroSesion,
          phase,
          step_key: stepKey,
          completed: desiredState,
          completed_at: desiredState ? new Date().toISOString() : null,
          completed_by: null,
        },
        { onConflict: "osi_id,nro_sesion,phase,step_key" }
      );

    if (error) {
      console.error("Error toggling step:", error);
      return NextResponse.json(
        { error: error.message || "Failed to toggle step" },
        { status: 500 }
      );
    }

    // Sync `en_proceso` step (En proceso/Ejecutado) to the shell's OSI status tables (best-effort).
    // This handles the offline sync queue replay path.
    if (stepKey === "en_proceso") {
      await syncOsiEjecutadoToShell(osiId, nroSesion, desiredState).catch((err) =>
        console.error("[proceso-steps/toggle] syncOsiEjecutadoToShell failed:", err),
      );
    } else if (desiredState && isPostServiceOrSubsequentStep(stepKey)) {
      // Guard clause: post-service step marked completed -> auto-mark en_proceso
      await admin
        .from("capacitacion_proceso_steps")
        .upsert(
          {
            osi_id: osiId,
            nro_sesion: nroSesion,
            phase: "ejecucion",
            step_key: "en_proceso",
            completed: true,
            completed_at: new Date().toISOString(),
            completed_by: null,
          },
          { onConflict: "osi_id,nro_sesion,phase,step_key" }
        );
      await syncOsiEjecutadoToShell(osiId, nroSesion, true).catch((err) =>
        console.error("[proceso-steps/toggle] guard clause sync failed:", err)
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/capacitacion/proceso-steps/toggle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
