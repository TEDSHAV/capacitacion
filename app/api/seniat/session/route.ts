import { NextRequest, NextResponse } from "next/server";
import { SeniatService } from "@/lib/seniat-service";

/**
 * GET - Start a new SENIAT session and return captcha image
 * DELETE - Close an existing session
 */

export async function GET() {
  try {
    const result = await SeniatService.startSession();
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "No se pudo iniciar la sesión de SENIAT" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      captchaImage: result.captchaImage,
    });
  } catch (error) {
    console.error("Error starting SENIAT session API:", error);
    return NextResponse.json(
      { error: "Error interno al iniciar sesión de SENIAT" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (sessionId) {
      await SeniatService.closeSession(sessionId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error closing SENIAT session API:", error);
    return NextResponse.json({ success: false, error: "Error closing session" }, { status: 500 });
  }
}
