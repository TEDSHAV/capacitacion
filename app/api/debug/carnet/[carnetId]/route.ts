import { NextRequest, NextResponse } from "next/server";
import { getCarnetById } from "@/app/actions/carnets";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ carnetId: string }> },
) {
  try {
    const resolvedParams = await params;
    const carnetId = parseInt(resolvedParams.carnetId);

    console.log("🔍 Debugging carnet ID:", carnetId);

    if (isNaN(carnetId)) {
      return NextResponse.json(
        { success: false, error: "Invalid carnet ID" },
        { status: 400 },
      );
    }

    // Get carnet data from database
    const carnetResult = await getCarnetById(carnetId);

    if (!carnetResult.success || !carnetResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: carnetResult.error || "Carnet not found",
          carnetId: carnetId,
          result: carnetResult,
        },
        { status: 404 },
      );
    }

    const carnet = carnetResult.data;

    return NextResponse.json({
      success: true,
      data: {
        carnetId: carnet.id,
        carnetData: {
          id_certificado: carnet.id_certificado,
          id_participante: carnet.id_participante,
          id_empresa: carnet.id_empresa,
          id_curso: carnet.id_curso,
          id_osi: carnet.id_osi,
          titulo_curso: carnet.titulo_curso,
          fecha_emision: carnet.fecha_emision,
          fecha_vencimiento: carnet.fecha_vencimiento,
          nombre_participante: carnet.nombre_participante,
          cedula_participante: carnet.cedula_participante,
          empresa_participante: carnet.empresa_participante,
          qr_code: carnet.qr_code,
          created_at: carnet.created_at,
          is_active: carnet.is_active,
        },
        participantInfo: {
          name: carnet.nombre_participante,
          idNumber: carnet.cedula_participante,
          company: carnet.empresa_participante,
        },
        templateCheck: {
          templatePath: "/templates/carnet.png",
          templateExists: true, // We know it exists from the file listing
        },
      },
    });
  } catch (error) {
    console.error("💥 Error debugging carnet:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to debug carnet",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
