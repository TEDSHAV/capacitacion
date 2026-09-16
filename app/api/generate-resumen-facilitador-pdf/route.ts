import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/utils/api-auth";
import { getFacilitadorResumen } from "@/app/actions/facilitador-resumen";
import { generateResumenFacilitadorPdf } from "@/lib/resumen-facilitador-generator";

function sanitizeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .substring(0, 60) || "resumen_facilitador"
  );
}

/**
 * GET /api/generate-resumen-facilitador-pdf?id=<facilitadorId>
 *
 * Generates a one-page "Resumen de Facilitador" PDF intended to be shared
 * internally with the Negocios department. Reads from the
 * v_facilitador_resumen view (must be applied via migration first).
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if ("unauthorized" in auth) {
    return auth.unauthorized;
  }

  const facilitadorId = parseInt(
    request.nextUrl.searchParams.get("id") || "",
    10,
  );

  if (isNaN(facilitadorId)) {
    return NextResponse.json(
      { error: "Invalid facilitador ID" },
      { status: 400 },
    );
  }

  try {
    const data = await getFacilitadorResumen(facilitadorId);
    if (!data) {
      return NextResponse.json(
        { error: "Facilitador not found" },
        { status: 404 },
      );
    }

    const pdfBlob = await generateResumenFacilitadorPdf(data);

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resumen_facilitador_${sanitizeFilename(data.nombre_apellido)}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error generating resumen facilitador PDF:", error);
    return NextResponse.json(
      {
        error: "Failed to generate resumen facilitador PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
