import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const queryParam = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const suggestionMode = searchParams.get("suggest") === "true";

    if (!queryParam) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Clean ID/Name - detect if it's a cedula (digits only or V-/E- prefixed) or a name
    const trimmed = queryParam.trim();
    const hasCedulaPrefix = /^[VEve]-/.test(trimmed);
    const isNumeric = /^\d+$/.test(trimmed) || hasCedulaPrefix;

    let query = supabase
      .from("participantes_certificados")
      .select("id, nombre, cedula, nacionalidad");

    if (isNumeric) {
      const cleanIdNumber = trimmed
        .replace(/^[VEve]-/, "")
        .replace(/[^0-9]/g, "");
      query = query.eq("cedula", cleanIdNumber);
    } else {
      query = query.ilike("nombre", `%${trimmed}%`);
    }

    if (suggestionMode) {
      query = query.limit(5);
    }

    const { data: participants, error: participantError } = await query;

    if (participantError) {
      console.error("Error fetching participants:", participantError);
      return NextResponse.json(
        { error: "Failed to fetch participants" },
        { status: 500 },
      );
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 },
      );
    }

    if (suggestionMode) {
      return NextResponse.json(participants);
    }

    // Get all certificates for all matching participants
    const participantIds = participants.map((p) => p.id);
    const { data: certificates, error: certificatesError } = await supabase
      .from("certificados")
      .select(
        `
        *,
        cursos!inner (
          id,
          nombre,
          contenido,
          horas_estimadas,
          nota_aprobatoria,
          emite_carnet
        ),
        empresas!certificados_id_empresa_fkey (
          id,
          razon_social,
          rif
        ),
        facilitadores!certificados_id_facilitador_fkey (
          id,
          nombre_apellido,
          cedula,
          email
        )
      `,
      )
      .in("id_participante", participantIds)
      .eq("is_active", true)
      .order("fecha_emision", { ascending: false });

    if (certificatesError) {
      console.error("Error fetching certificates:", certificatesError);
      return NextResponse.json(
        { error: "Failed to fetch certificates" },
        { status: 500 },
      );
    }

    // Parse snapshot content for each certificate
    const certificatesWithParsedData =
      certificates?.map((cert) => {
        let parsedSnapshot = null;
        if (cert.snapshot_contenido) {
          try {
            parsedSnapshot = JSON.parse(cert.snapshot_contenido);
          } catch (error) {
            console.warn("Failed to parse snapshot for certificate:", cert.id);
          }
        }
        return {
          ...cert,
          parsed_snapshot: parsedSnapshot,
        };
      }) || [];

    // Calculate statistics
    const totalCertificates = certificatesWithParsedData.length;
    const totalHours = certificatesWithParsedData.reduce((sum, cert) => {
      return (
        sum +
        (cert.parsed_snapshot?.certificado_detalles?.horas_estimadas ||
          cert.cursos?.horas_estimadas ||
          0)
      );
    }, 0);

    const averageScore =
      certificatesWithParsedData.length > 0
        ? certificatesWithParsedData.reduce(
            (sum, cert) =>
              sum +
              (cert.parsed_snapshot?.participante?.score ||
                cert.calificacion ||
                0),
            0,
          ) / certificatesWithParsedData.length
        : 0;

    // Get unique companies
    const uniqueCompanies = [
      ...new Set(
        certificatesWithParsedData
          .map((cert) => cert.empresas?.razon_social)
          .filter(Boolean),
      ),
    ];

    // Get unique courses
    const uniqueCourses = [
      ...new Set(
        certificatesWithParsedData
          .map((cert) => cert.cursos?.nombre)
          .filter(Boolean),
      ),
    ];

    // Use the first participant as the primary record for display
    const primaryParticipant = participants[0];

    // Normalize nationality to consistent venezolano/extranjero format
    let nationality = (primaryParticipant as any)?.nacionalidad || "";
    if (nationality === "V-") nationality = "venezolano";
    else if (nationality === "E-") nationality = "extranjero";
    else if (!["venezolano", "extranjero"].includes(nationality))
      nationality = "venezolano";

    const response = {
      participant: {
        ...primaryParticipant,
        nacionalidad: nationality,
        total_records: participants.length,
      },
      certificates: certificatesWithParsedData,
      statistics: {
        totalCertificates,
        totalHours,
        averageScore: Math.round(averageScore * 100) / 100,
        uniqueCompaniesCount: uniqueCompanies.length,
        uniqueCoursesCount: uniqueCourses.length,
        uniqueCompanies,
        uniqueCourses,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in participant lookup API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
