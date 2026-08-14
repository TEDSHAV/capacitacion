import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requireApiAuth } from "@/utils/api-auth";
import {
  generateFichaTecnicaPdf,
  FichaTecnicaData,
} from "@/lib/ficha-tecnica-generator";

function sanitizeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .substring(0, 60) || "ficha_tecnica"
  );
}

/**
 * GET /api/generate-ficha-tecnica-pdf?id=<cursoId>
 * Fetches a saved course from the database and downloads its Ficha Técnica PDF.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if ("unauthorized" in auth) {
    return auth.unauthorized;
  }

  const cursoId = parseInt(request.nextUrl.searchParams.get("id") || "");

  if (isNaN(cursoId)) {
    return NextResponse.json(
      { error: "Invalid course ID" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data: course, error } = await supabase
      .from("catalogo_servicios")
      .select(
        "id, nombre, subtitulo, contenido_curso, carga_horaria_std, created_at, nota_aprobatoria, emite_carnet, para_quien, modalidad, objetivo_general, objetivo_especifico",
      )
      .eq("id", cursoId)
      .single();

    if (error || !course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 },
      );
    }

    const fichaData: FichaTecnicaData = {
      nombre: course.nombre,
      subtitulo: course.subtitulo,
      carga_horaria_std: course.carga_horaria_std,
      para_quien: course.para_quien,
      modalidad: course.modalidad,
      objetivo_general: course.objetivo_general,
      objetivo_especifico: course.objetivo_especifico,
      contenido_curso: course.contenido_curso,
      nota_aprobatoria: course.nota_aprobatoria,
      emite_carnet: course.emite_carnet,
      created_at: course.created_at,
      cursoId: course.id,
    };

    const pdfBlob = await generateFichaTecnicaPdf(fichaData);

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ficha_tecnica_${sanitizeFilename(course.nombre)}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error generating ficha técnica PDF:", error);
    return NextResponse.json(
      {
        error: "Failed to generate ficha técnica PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/generate-ficha-tecnica-pdf
 * Accepts JSON body with form data and downloads a Ficha Técnica PDF
 * without requiring the course to be saved first.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if ("unauthorized" in auth) {
    return auth.unauthorized;
  }

  try {
    const body = await request.json();

    const fichaData: FichaTecnicaData = {
      nombre: body.nombre || body.titulo || "CURSO",
      subtitulo: body.subtitulo || null,
      carga_horaria_std: body.carga_horaria_std ?? body.horas_estimadas ?? null,
      para_quien: body.para_quien || null,
      modalidad: body.modalidad || "Presencial",
      objetivo_general: body.objetivo_general || null,
      objetivo_especifico: body.objetivo_especifico || null,
      contenido_curso: body.contenido_curso || body.contenido || null,
      nota_aprobatoria:
        body.nota_aprobatoria != null ? Number(body.nota_aprobatoria) : null,
      emite_carnet: body.emite_carnet === true || body.emite_carnet === "true",
      created_at: body.created_at || null,
      cursoId: body.cursoId ?? body.id ?? null,
    };

    const pdfBlob = await generateFichaTecnicaPdf(fichaData);

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ficha_tecnica_${sanitizeFilename(fichaData.nombre)}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error generating ficha técnica PDF from POST:", error);
    return NextResponse.json(
      {
        error: "Failed to generate ficha técnica PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
