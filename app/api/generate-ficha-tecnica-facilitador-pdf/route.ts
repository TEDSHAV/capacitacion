import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requireApiAuth } from "@/utils/api-auth";
import {
  generateFichaTecnicaFacilitadorPdf,
  FichaTecnicaFacilitadorData,
} from "@/lib/ficha-tecnica-facilitador-generator";

function sanitizeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .substring(0, 60) || "ficha_tecnica_facilitador"
  );
}

/**
 * GET /api/generate-ficha-tecnica-facilitador-pdf?id=<facilitadorId>
 * Fetches a saved facilitador from the database and downloads its Ficha Técnica PDF.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if ("unauthorized" in auth) {
    return auth.unauthorized;
  }

  const facilitadorId = parseInt(
    request.nextUrl.searchParams.get("id") || "",
  );

  if (isNaN(facilitadorId)) {
    return NextResponse.json(
      { error: "Invalid facilitador ID" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data: facilitador, error } = await supabase
      .from("facilitadores")
      .select(
        "id, nombre_apellido, cedula, titulo_profesional, formacion_academica, experiencia_laboral, competencias_habilidades, foto_perfil_url, fecha_creacion",
      )
      .eq("id", facilitadorId)
      .single();

    if (error || !facilitador) {
      return NextResponse.json(
        { error: "Facilitador not found" },
        { status: 404 },
      );
    }

    const fichaData: FichaTecnicaFacilitadorData = {
      nombre_apellido: facilitador.nombre_apellido,
      cedula: facilitador.cedula,
      titulo_profesional: facilitador.titulo_profesional,
      formacion_academica: facilitador.formacion_academica,
      experiencia_laboral: facilitador.experiencia_laboral,
      competencias_habilidades: facilitador.competencias_habilidades,
      foto_perfil_url: facilitador.foto_perfil_url,
      facilitadorId: facilitador.id,
      created_at: facilitador.fecha_creacion,
    };

    const pdfBlob = await generateFichaTecnicaFacilitadorPdf(fichaData);

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ficha_tecnica_facilitador_${sanitizeFilename(facilitador.nombre_apellido)}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error generating ficha técnica facilitador PDF:", error);
    return NextResponse.json(
      {
        error: "Failed to generate ficha técnica facilitador PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/generate-ficha-tecnica-facilitador-pdf
 * Accepts JSON body with form data and downloads a Ficha Técnica PDF
 * without requiring the facilitador to be saved first (preview flow).
 * The photo is sent inline as a base64 data URL (foto_base64).
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if ("unauthorized" in auth) {
    return auth.unauthorized;
  }

  try {
    const body = await request.json();

    const fichaData: FichaTecnicaFacilitadorData = {
      nombre_apellido: body.nombre_apellido || body.nombre || "FACILITADOR",
      cedula: body.cedula || null,
      titulo_profesional: body.titulo_profesional || null,
      formacion_academica: body.formacion_academica || null,
      experiencia_laboral: body.experiencia_laboral || null,
      competencias_habilidades: body.competencias_habilidades || null,
      foto_perfil_url: body.foto_perfil_url || null,
      foto_base64: body.foto_base64 || null,
      facilitadorId: body.facilitadorId ?? body.id ?? null,
      created_at: body.created_at || null,
    };

    const pdfBlob = await generateFichaTecnicaFacilitadorPdf(fichaData);

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ficha_tecnica_facilitador_${sanitizeFilename(fichaData.nombre_apellido)}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error generating ficha técnica facilitador PDF from POST:", error);
    return NextResponse.json(
      {
        error: "Failed to generate ficha técnica facilitador PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
