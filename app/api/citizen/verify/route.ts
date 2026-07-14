import { NextRequest, NextResponse } from "next/server";
import { CitizenService } from "@/lib/citizen-service";

export async function POST(request: NextRequest) {
  try {
    const { idNumber, sessionId, answer } = await request.json();
    console.log(`[Citizen API] Verify request: ID=${idNumber}, sessionId=${sessionId}, answer=${answer}`);

    if (!idNumber) {
      return NextResponse.json(
        { error: "Falta el número de cédula" },
        { status: 400 },
      );
    }

    let result;
    if (sessionId) {
      // Session-based verification (uses the new API)
      result = await CitizenService.verifyWithSession(sessionId, idNumber, answer || "API");
    } else {
      // Direct lookup
      result = await CitizenService.lookupByID(idNumber);
    }

    if (!result.success) {
      console.log(`[Citizen API] Verification failed: ${result.error}`);
      return NextResponse.json(
        { success: false, error: result.error || "No se encontró el ciudadano" },
        { status: 200 },
      );
    }

    console.log(`[Citizen API] Verification success: ${result.name}`);
    return NextResponse.json({
      success: true,
      name: result.name,
    });
  } catch (error) {
    console.error("Citizen lookup API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}
