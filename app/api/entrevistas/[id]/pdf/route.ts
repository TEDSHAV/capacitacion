import { NextRequest, NextResponse } from "next/server";
import { getEntrevistaById } from "@/app/actions/entrevistas-facilitadores";
import { generateEntrevistaPdf } from "@/lib/entrevista-pdf-generator";

function sanitizeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .substring(0, 50) || "facilitador"
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);

    if (isNaN(numId)) {
      return NextResponse.json(
        { error: "ID de entrevista inválido" },
        { status: 400 }
      );
    }

    const { entrevista, error } = await getEntrevistaById(numId);

    if (error || !entrevista) {
      return NextResponse.json(
        { error: error || "Entrevista no encontrada" },
        { status: 404 }
      );
    }

    const pdfBuffer = await generateEntrevistaPdf(entrevista);

    const safeName = sanitizeFilename(entrevista.nombre_apellido || "aspirante");
    const cedula = entrevista.cedula ? `_${entrevista.cedula}` : "";
    const filename = `Formato_Entrevista_${safeName}${cedula}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("Error generating entrevista PDF:", err);
    return NextResponse.json(
      { error: "Error al generar el formato PDF de la entrevista" },
      { status: 500 }
    );
  }
}
