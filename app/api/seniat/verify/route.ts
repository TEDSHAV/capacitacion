import { NextRequest, NextResponse } from "next/server";
import { SeniatService } from "@/lib/seniat-service";

/**
 * GET /api/seniat/verify
 * Start a new SENIAT session and fetch captcha
 */
export async function GET(request: NextRequest) {
  try {
    const result = await SeniatService.startSession();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Error starting session" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      captchaImage: result.captchaImage,
    });
  } catch (error) {
    console.error("Error in GET /api/seniat/verify:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/seniat/verify
 * Verify RIF against SENIAT database using existing session
 * Body: { sessionId: string, rif: string, captcha: string, ocrName?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, rif, captcha, ocrName } = body;

    if (!sessionId || !rif || !captcha) {
      return NextResponse.json(
        { error: "Session ID, RIF, and captcha are required" },
        { status: 400 },
      );
    }

    // Verify RIF with the session
    const result = await SeniatService.verifyRIFWithSession(
      sessionId,
      rif,
      captcha,
    );

    // Close the session after verification
    await SeniatService.closeSession(sessionId);

    // If ocrName is provided, compare names
    if (result.success && result.seniatName && ocrName) {
      const comparisonStatus = SeniatService.compareNames(
        ocrName,
        result.seniatName,
      );
      return NextResponse.json({
        ...result,
        status: comparisonStatus,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in POST /api/seniat/verify:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
