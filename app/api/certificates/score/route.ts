import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";

/**
 * POST /api/certificates/score
 * Public endpoint for updating certificate scores (used by offline queue).
 * Accepts set-state payloads for idempotent replay.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (
      !body.certificateId ||
      typeof body.certificateId !== "number" ||
      typeof body.newScore !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing or invalid certificateId/newScore" },
        { status: 400 }
      );
    }

    const certificateId = body.certificateId as number;
    const newScore = body.newScore as number;

    // Validate score range
    if (newScore < 0 || newScore > 100) {
      return NextResponse.json(
        { error: "Score must be between 0 and 100" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

    // Update the certificate score (idempotent set operation)
    const { error } = await admin
      .from("certificados")
      .update({ calificacion: newScore })
      .eq("id", certificateId);

    if (error) {
      console.error("Error updating certificate score:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update certificate score" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/certificates/score:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
