import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";

/**
 * POST /api/capacitacion/proceso-steps/attachment
 * Public endpoint for toggling attachment received status (used by offline queue).
 * Accepts desired-state payloads for idempotent replay.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.osiId || typeof body.osiId !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid osiId" },
        { status: 400 }
      );
    }

    const osiId = body.osiId as number;
    const nroSesion = body.nroSesion ?? null;
    const desiredState = body.desiredState ?? true; // true = received, false = not received

    const admin = await createAdminClient();

    // Upsert the attachment_received step with the desired state (idempotent)
    const { error } = await admin
      .from("capacitacion_proceso_steps")
      .upsert(
        {
          osi_id: osiId,
          nro_sesion: nroSesion,
          phase: "ejecucion",
          step_key: "attachment_received",
          completed: desiredState,
          completed_at: desiredState ? new Date().toISOString() : null,
          completed_by: null,
        },
        { onConflict: "osi_id,nro_sesion,phase,step_key" }
      );

    if (error) {
      console.error("Error toggling attachment_received:", error);
      return NextResponse.json(
        { error: error.message || "Failed to toggle attachment status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(
      "Error in POST /api/capacitacion/proceso-steps/attachment:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
