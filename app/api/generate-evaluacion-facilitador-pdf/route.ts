import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requireApiAuth } from "@/utils/api-auth";
import {
  generateEvaluacionFacilitadorPdf,
  type EvaluacionPdfData,
} from "@/lib/evaluacion-facilitador-pdf-generator";
import type { EvaluacionPayload } from "@/app/actions/evaluacion-facilitadores";

function sanitizeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .substring(0, 60) || "evaluacion_facilitador"
  );
}

/**
 * GET /api/generate-evaluacion-facilitador-pdf?id=<evaluacionId>
 * Fetches a saved evaluation from the database and downloads its PDF.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if ("unauthorized" in auth) {
    return auth.unauthorized;
  }

  const evaluacionId = parseInt(
    request.nextUrl.searchParams.get("id") || "",
  );

  if (isNaN(evaluacionId)) {
    return NextResponse.json(
      { error: "Invalid evaluation ID" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();

    // Fetch the evaluation
    const { data: evaluacion, error } = await supabase
      .from("facilitador_evaluaciones")
      .select(
        `
        *,
        facilitadores (
          id,
          nombre_apellido,
          cedula,
          rif
        )
      `,
      )
      .eq("id", evaluacionId)
      .single();

    if (error || !evaluacion) {
      return NextResponse.json(
        { error: "Evaluation not found" },
        { status: 404 },
      );
    }

    const facData = evaluacion.facilitadores as any;
    const pdfData: EvaluacionPdfData = {
      id: evaluacion.id,
      facilitador_id: evaluacion.facilitador_id,
      tipo_evaluacion: evaluacion.tipo_evaluacion,
      evaluador_nombre: evaluacion.evaluador_nombre,
      evaluador_cargo: evaluacion.evaluador_cargo,
      recomendado_por: evaluacion.recomendado_por,
      tipo_proveedor: evaluacion.tipo_proveedor,
      entrevista: evaluacion.entrevista,
      firma: evaluacion.firma,
      fecha_evaluacion: evaluacion.fecha_evaluacion,
      fase_inicial: evaluacion.fase_inicial as any,
      fase_seguimiento: evaluacion.fase_seguimiento as any,
      fase_reevaluacion: evaluacion.fase_reevaluacion as any,
      observaciones: evaluacion.observaciones,
      facilitador_nombre: facData?.nombre_apellido || "",
      facilitador_cedula: facData?.cedula || null,
      facilitador_rif: facData?.rif || null,
    };

    const pdfBlob = await generateEvaluacionFacilitadorPdf(pdfData);

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="evaluacion_facilitador_${sanitizeFilename(facData?.nombre_apellido || "evaluacion")}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error generating evaluación facilitador PDF:", error);
    return NextResponse.json(
      {
        error: "Failed to generate evaluación facilitador PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/generate-evaluacion-facilitador-pdf
 * Accepts JSON body with form data and generates the PDF without requiring
 * the evaluation to be saved first (preview/download flow).
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if ("unauthorized" in auth) {
    return auth.unauthorized;
  }

  try {
    const body = await request.json();

    const pdfData: EvaluacionPdfData = {
      id: body.id,
      facilitador_id: body.facilitador_id,
      tipo_evaluacion: body.tipo_evaluacion || "nuevo",
      evaluador_nombre: body.evaluador_nombre || null,
      evaluador_cargo: body.evaluador_cargo || null,
      recomendado_por: body.recomendado_por || null,
      tipo_proveedor: body.tipo_proveedor || null,
      entrevista: body.entrevista || null,
      firma: body.firma || null,
      fecha_evaluacion: body.fecha_evaluacion || new Date().toISOString().split("T")[0],
      fase_inicial: body.fase_inicial || { secciones: {} },
      fase_seguimiento: body.fase_seguimiento || null,
      fase_reevaluacion: body.fase_reevaluacion || null,
      observaciones: body.observaciones || null,
      facilitador_nombre: body.facilitador_nombre || "",
      facilitador_cedula: body.facilitador_cedula || null,
      facilitador_rif: body.facilitador_rif || null,
    };

    const pdfBlob = await generateEvaluacionFacilitadorPdf(pdfData);

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="evaluacion_facilitador_${sanitizeFilename(pdfData.facilitador_nombre || "facilitador")}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error generating evaluación facilitador PDF from POST:", error);
    return NextResponse.json(
      {
        error: "Failed to generate evaluación facilitador PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
