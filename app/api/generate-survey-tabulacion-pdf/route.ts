import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/utils/api-auth";
import { getSurveyTabulacionData } from "@/app/actions/surveys";
import { generateSurveyTabulacionPdf } from "@/lib/survey-tabulacion-generator";

function sanitizeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .substring(0, 60) || "resultado_actividad"
  );
}

/**
 * GET /api/generate-survey-tabulacion-pdf?osiId=<id>
 *
 * Fetches all course_satisfaction_surveys for the given OSI, aggregates them
 * into the weighted tabulation structure, and downloads the "Resultado de la
 * Actividad" PDF report.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if ("unauthorized" in auth) {
    return auth.unauthorized;
  }

  const osiId = parseInt(request.nextUrl.searchParams.get("osiId") || "", 10);

  if (isNaN(osiId)) {
    return NextResponse.json(
      { error: "Invalid or missing osiId parameter" },
      { status: 400 },
    );
  }

  try {
    const data = await getSurveyTabulacionData(osiId);

    if (!data) {
      return NextResponse.json(
        { error: "OSI not found or survey data unavailable" },
        { status: 404 },
      );
    }

    const pdfBlob = await generateSurveyTabulacionPdf(data);

    const filename = `resultado_actividad_osi_${sanitizeFilename(data.nro_osi)}.pdf`;

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error generating survey tabulation PDF:", error);
    return NextResponse.json(
      {
        error: "Failed to generate survey tabulation PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
