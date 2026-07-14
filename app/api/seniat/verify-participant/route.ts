import { NextRequest, NextResponse } from "next/server";
import { SeniatService } from "@/lib/seniat-service";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, rif, captcha } = await request.json();

    if (!sessionId || !rif || !captcha) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos (sessionId, rif, captcha)" },
        { status: 400 },
      );
    }

    // Call SeniatService to verify RIF
    const result = await SeniatService.verifyRIFWithSession(
      sessionId,
      rif,
      captcha,
    );

    if (result.status === "error" && result.error === "Captcha incorrecto") {
      return NextResponse.json(
        { success: false, error: "Captcha incorrecto", status: "error" },
        { status: 200 }, // Return 200 so the client can handle it as a validation error
      );
    }

    if (result.status === "not_found") {
      return NextResponse.json({
        success: true,
        status: "not_found",
        rif: result.rif,
        error: "RIF no encontrado en SENIAT",
      });
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Error en la verificación", status: result.status },
        { status: 200 },
      );
    }

    return NextResponse.json({
      success: true,
      status: "verified",
      rif: result.rif,
      seniatName: result.seniatName,
    });
  } catch (error) {
    console.error("SENIAT verification API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}
