import { NextRequest, NextResponse } from "next/server";
import { CitizenService } from "@/lib/citizen-service";

export async function POST(request: NextRequest) {
  try {
    const { idNumber, sessionId, answer } = await request.json();

    if (!idNumber) {
      return NextResponse.json(
        { error: "Falta el número de cédula" },
        { status: 400 },
      );
    }

    let result;
    if (sessionId && answer) {
      // Session-based verification
      result = await CitizenService.verifyWithSession(sessionId, idNumber, answer);
    } else {
      // Legacy/Direct lookup (will auto-solve if possible)
      result = await CitizenService.lookupByID(idNumber);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "No se encontró el ciudadano" },
        { status: 200 },
      );
    }

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
