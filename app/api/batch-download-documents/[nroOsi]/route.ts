import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getCertificatesByOSIAction } from "@/app/actions/certificados";
import { generateDocumentsServer } from "@/lib/document-server-actions";
import { requireApiAuth } from "@/utils/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nroOsi: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if ("unauthorized" in auth) {
      return auth.unauthorized;
    }

    const resolvedParams = await params;
    const nroOsi = parseInt(resolvedParams.nroOsi);

    if (isNaN(nroOsi)) {
      return NextResponse.json(
        { error: "Invalid OSI number" },
        { status: 400 },
      );
    }

    const certResult = await getCertificatesByOSIAction(nroOsi);

    if (!certResult.success || !certResult.certificates || certResult.certificates.length === 0) {
      return NextResponse.json(
        { error: "No certificates found for this OSI" },
        { status: 404 },
      );
    }

    const certificates = certResult.certificates;

    if (auth.type === "cliente") {
      const empresaId = (auth.session as { empresa_id?: number }).empresa_id;
      const hasOwnership = certificates.some(
        (cert: any) => cert.id_empresa === empresaId,
      );
      if (!hasOwnership) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 },
        );
      }
      const filtered = certificates.filter(
        (cert: any) => cert.id_empresa === empresaId,
      );
      certificates.length = 0;
      certificates.push(...filtered);
    }

    const firstCert = certificates[0];
    let firstSnapshot: any = null;
    if (firstCert.snapshot_contenido) {
      firstSnapshot = typeof firstCert.snapshot_contenido === "string"
        ? JSON.parse(firstCert.snapshot_contenido)
        : firstCert.snapshot_contenido;
    }

    const courseTitle =
      firstSnapshot?.certificado_detalles?.title ||
      firstCert?.catalogo_servicios?.nombre ||
      "Curso";

    const docRequest = {
      certificates: certificates.map((c: any) => {
        let s: any = null;
        if (c.snapshot_contenido) {
          s = typeof c.snapshot_contenido === "string"
            ? JSON.parse(c.snapshot_contenido)
            : c.snapshot_contenido;
        }

        return {
          participant_name: s?.participante?.name || c.participantes_certificados?.nombre || "Participante",
          participant_id_number: s?.participante?.cedula || c.participantes_certificados?.cedula || "S/N",
          participant_id_type: s?.participante?.idType || (c.participantes_certificados?.nacionalidad === "extranjero" ? "E-" : "V-"),
          participant_nationality: s?.participante?.nacionalidad || c.participantes_certificados?.nacionalidad || "venezolano",
          score: s?.participante?.score || c.calificacion || 0,
          control_number: s?.certificado?.nro_control || c.nro_control,
          course_title: s?.certificado_detalles?.title || courseTitle,
          execution_date: s?.certificado?.fecha_emision || c.fecha_emision,
        };
      }),
      osiData: {
        cliente_nombre_empresa: firstSnapshot?.osi?.cliente_nombre_empresa || firstCert?.empresas?.razon_social || "",
        nro_osi: firstSnapshot?.osi?.nro_osi || nroOsi,
        tema: firstSnapshot?.certificado_detalles?.title || courseTitle,
        id_curso: firstSnapshot?.certificado?.id_curso || firstCert?.id_curso,
        id_ciudad: firstSnapshot?.osi?.id_ciudad || firstCert?.id_ciudad,
        ciudad: firstSnapshot?.certificado_detalles?.location || firstSnapshot?.osi?.ciudad || "",
      },
      firmanteData: {
        nombre: firstSnapshot?.firmas?.sha_signature_data?.nombre || "DPTO. CAPACITACIÓN / SHA DE VENEZUELA, C.A.",
        cargo: "Jefe de Capacitación",
      },
      options: {
        includeCertificacionCompetencias: true,
        includeNotaEntrega: true,
        includeValidacionDatos: false,
      },
    };

    const docResult = await generateDocumentsServer(docRequest);

    if (!docResult.success || !docResult.documents) {
      return NextResponse.json(
        { error: docResult.error || "Failed to generate documents" },
        { status: 500 },
      );
    }

    const zip = new JSZip();
    let filesAdded = 0;

    Object.entries(docResult.documents).forEach(([key, base64]) => {
      const fileName = `${key.replace(/_/g, " ").toUpperCase()}.pdf`;
      zip.file(fileName, base64 as string, { base64: true });
      filesAdded++;
    });

    if (filesAdded === 0) {
      return NextResponse.json(
        { error: "No documents could be generated" },
        { status: 500 },
      );
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const dateStr = new Date().toISOString().split("T")[0];
    const zipFileName = `Documentos_OSI_${nroOsi}_${dateStr}.zip`;

    return new NextResponse(zipBlob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFileName}"`,
      },
    });
  } catch (error) {
    console.error("Error in batch download documents:", error);
    return NextResponse.json(
      { error: "Failed to generate documents" },
      { status: 500 },
    );
  }
}
