import { NextRequest, NextResponse } from "next/server";
import { CitizenService } from "@/lib/citizen-service";

/**
 * GET - Start a new PNP session and return math challenge
 * DELETE - Close an existing session
 */

export async function GET() {
  try {
    const result = await CitizenService.startSession();
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "No se pudo iniciar la sesión de PNP" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      challenge: result.challenge,
      autoSolved: result.autoSolved,
      answer: result.answer,
    });
  } catch (error) {
    console.error("Error starting PNP session API:", error);
    return NextResponse.json(
      { error: "Error interno al iniciar sesión de PNP" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (sessionId) {
      await CitizenService.closeSession(sessionId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error closing PNP session API:", error);
    return NextResponse.json({ success: false, error: "Error closing session" }, { status: 500 });
  }
}
