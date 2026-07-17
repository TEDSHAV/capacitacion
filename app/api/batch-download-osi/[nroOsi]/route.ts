import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getCertificatesByOSIAction } from "@/app/actions/certificados";
import { CertificateGenerator } from "@/lib/certificate-generator";
import { QRService } from "@/lib/qr-service";
import { createClient } from "@/utils/supabase/server";
import { requireApiAuth } from "@/utils/api-auth";
import { registerCustomCoordinates } from "@/lib/custom-certificate-generator";
import {
  getFacilitatorDataServer,
  getSignatureDataServer,
  getCarnetTemplateServer,
} from "@/app/actions/certificate-data";

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

    // Fetch all certificates for this OSI
    const certResult = await getCertificatesByOSIAction(nroOsi);

    if (!certResult.success || !certResult.certificates || certResult.certificates.length === 0) {
      return NextResponse.json(
        { error: "No certificates found for this OSI" },
        { status: 404 },
      );
    }

    const certificates = certResult.certificates;

    // If accessed via cliente portal, verify at least one certificate belongs to their empresa
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
      // Filter to only this empresa's certificates
      const filtered = certificates.filter(
        (cert: any) => cert.id_empresa === empresaId,
      );
      certificates.length = 0;
      certificates.push(...filtered);
    }

    // Fetch OSI data for metadata
    const supabase = await createClient();
    const { data: osiData } = await supabase
      .from("osi")
      .select("*")
      .eq("nro_osi", nroOsi)
      .single();

    const zip = new JSZip();
    const certsFolder = zip.folder("Certificados");
    const carnetsFolder = zip.folder("Carnets");
    const certificateGenerator = new CertificateGenerator();
    let filesAdded = 0;
    const errors: string[] = [];

    for (const cert of certificates) {
      try {
        let snapshot = null;
        if (cert.snapshot_contenido) {
          snapshot = typeof cert.snapshot_contenido === "string"
            ? JSON.parse(cert.snapshot_contenido)
            : cert.snapshot_contenido;
        }

        if (!snapshot) {
          if (cert.participantes_certificados) {
            snapshot = {
              participante: {
                name: cert.participantes_certificados.nombre,
                cedula: cert.participantes_certificados.cedula,
                nacionalidad: cert.participantes_certificados.nacionalidad,
              },
              certificado: {
                nro_libro: cert.nro_libro,
                nro_hoja: cert.nro_hoja,
                nro_linea: cert.nro_linea,
                nro_control: cert.nro_control,
                fecha_emision: cert.fecha_emision,
                fecha_vencimiento: cert.fecha_vencimiento,
              },
              plantilla: {
                archivo_plantilla_certificado: "certificado.png",
                id_plantilla_certificado: cert.id_plantilla_certificado,
                id_plantilla_carnet: cert.id_plantilla_carnet,
              },
              curso: {
                name: cert.catalogo_servicios?.nombre || "Curso",
                emite_carnet: cert.catalogo_servicios?.emite_carnet || false,
              },
              certificado_detalles: {
                title: cert.catalogo_servicios?.nombre || "Curso",
                subtitle: "",
              },
              osi: osiData,
              firmas: {
                facilitator_id: cert.id_facilitador,
                facilitator_data: cert.facilitadores,
                sha_signature_id: cert.sha_signature_id || 1,
              },
            };
          } else {
            errors.push(`Certificate ${cert.id}: missing participant data`);
            continue;
          }
        }

        const participant = {
          name: snapshot.participante?.name || cert.participantes_certificados?.nombre || "Participante",
          idNumber: snapshot.participante?.cedula || cert.participantes_certificados?.cedula || "S/N",
          idType:
            snapshot.participante?.idType ||
            (snapshot.participante?.nacionalidad === "extranjero" ? "E-" : "V-"),
          nationality: snapshot.participante?.nacionalidad || cert.participantes_certificados?.nacionalidad || "venezolano",
          score: snapshot.participante?.score || cert.calificacion || 0,
        };

        const certData = {
          ...snapshot.certificado_detalles,
          certificate_title: snapshot.certificado_detalles?.title || cert.catalogo_servicios?.nombre || "Curso",
          certificate_subtitle:
            snapshot.certificado_detalles?.subtitle ||
            snapshot.subtitulo_curso ||
            snapshot.certificate_subtitle ||
            "",
          course_topic_data: snapshot.curso || { name: cert.catalogo_servicios?.nombre || "Curso" },
          osi_data: snapshot.osi || osiData,
          facilitator_data: snapshot.firmas?.facilitator_data || cert.facilitadores,
          facilitator_id: snapshot.firmas?.facilitator_id || cert.id_facilitador,
          sha_signature_id: snapshot.firmas?.sha_signature_id || 1,
          sha_signature_data: snapshot.firmas?.sha_signature_data,
          plantilla_certificado_archivo:
            snapshot.plantilla?.archivo_plantilla_certificado || "certificado.png",
          id_plantilla_certificado: snapshot.plantilla?.id_plantilla_certificado || cert.id_plantilla_certificado,
          fecha_vencimiento: snapshot.certificado?.fecha_vencimiento || cert.fecha_vencimiento,
          complemento_empresa: snapshot.osi?.complemento_empresa,
        };

        // Check if this is a custom-generated certificate and register coordinates if available
        const isCustomCert = snapshot.metadatos?.generated_by === "custom_certificate_generation";
        (certData as any).is_custom = isCustomCert;
        if (isCustomCert && snapshot.coordenadas) {
          const customKey = registerCustomCoordinates(snapshot.coordenadas);
          (certData as any).plantilla_certificado_archivo = customKey;
        }

        // Enrich missing facilitator data from database (same as generate-certificate-pdf route)
        if (certData.facilitator_id && !certData.facilitator_data) {
          try {
            const facilitatorRaw = await getFacilitatorDataServer(
              certData.facilitator_id.toString(),
            );
            if (facilitatorRaw) {
              const facilitatorSignature =
                Array.isArray(facilitatorRaw.firmas) && facilitatorRaw.firmas.length > 0
                  ? facilitatorRaw.firmas[0]
                  : facilitatorRaw.firmas;

              (certData as any).facilitator_data = {
                id: facilitatorRaw.id,
                name: facilitatorRaw.nombre_apellido,
                nombre_apellido: facilitatorRaw.nombre_apellido,
                facilitator: facilitatorRaw.nombre_apellido,
                cargo: "Facilitador",
                firma: facilitatorSignature?.url_imagen,
                firma_id: facilitatorRaw.firma_id,
                sha_signature_id: facilitatorRaw.firma_id?.toString(),
                signature_data: facilitatorSignature
                  ? {
                      id: facilitatorSignature.id,
                      representante_sha: facilitatorSignature.nombre,
                      firma: facilitatorSignature.url_imagen,
                      url_imagen: facilitatorSignature.url_imagen,
                      imagen_base64: facilitatorSignature.imagen_base64,
                    }
                  : undefined,
              };
            }
          } catch (e) {
            console.warn(`[BatchDownload] Failed to fetch facilitator for cert ${cert.id}:`, e);
          }
        }

        // Enrich missing SHA signature data from database
        if (certData.sha_signature_id && !certData.sha_signature_data) {
          try {
            const shaData = await getSignatureDataServer(
              certData.sha_signature_id.toString(),
            );
            if (shaData) {
              (certData as any).sha_signature_data = shaData;
            }
          } catch (e) {
            console.warn(`[BatchDownload] Failed to fetch SHA signature for cert ${cert.id}:`, e);
          }
        }

        const controlNumbers = {
          nro_libro: snapshot.certificado?.nro_libro || cert.nro_libro,
          nro_hoja: snapshot.certificado?.nro_hoja || cert.nro_hoja,
          nro_linea: snapshot.certificado?.nro_linea || cert.nro_linea,
          nro_control: snapshot.certificado?.nro_control || cert.nro_control,
        };

        const templateImageUrl = `/templates/${(snapshot.plantilla?.archivo_plantilla_certificado || "certificado.png").toLowerCase()}`;

        // Generate certificate PDF
        const certBlob = await certificateGenerator.generateCertificate({
          participant,
          certificateData: certData as any,
          templateImage: templateImageUrl,
          controlNumbers,
          certificateId: cert.id,
          paperSize: snapshot.certificado?.paperSize || "half-letter-custom",
        });
        const certFileName = `Certificado_${participant.idNumber}_${participant.name.replace(/\s+/g, "_")}.pdf`;
        const certArrayBuffer = await certBlob.arrayBuffer();
        certsFolder?.file(certFileName, certArrayBuffer);
        filesAdded++;

        // Generate carnet if applicable (only for participants who passed)
        const shouldEmiteCarnet = cert.catalogo_servicios?.emite_carnet || snapshot.curso?.emite_carnet;
        const passingGrade = snapshot.certificado_detalles?.passing_grade
          ?? snapshot.curso?.nota_aprobatoria
          ?? cert.catalogo_servicios?.nota_aprobatoria
          ?? 14;
        const participantPassed = participant.score != null && participant.score >= passingGrade;
        if ((cert.id_plantilla_carnet || snapshot.plantilla?.id_plantilla_carnet || shouldEmiteCarnet) && participantPassed) {
          const { CarnetGenerator } = await import("@/lib/carnet-generator");
          const carnetGenerator = new CarnetGenerator();

          // Resolve carnet template: DB column first, snapshot as fallback
          let batchCarnetTemplateImage = "/templates/carnet.png";
          const batchCarnetTemplateId =
            cert.id_plantilla_carnet ||
            snapshot.plantilla?.id_plantilla_carnet ||
            null;
          if (batchCarnetTemplateId) {
            const batchCarnetTemplate = await getCarnetTemplateServer(batchCarnetTemplateId).catch(() => null);
            if (batchCarnetTemplate?.archivo) {
              batchCarnetTemplateImage = batchCarnetTemplate.archivo.startsWith("/")
                ? batchCarnetTemplate.archivo
                : `/templates/${batchCarnetTemplate.archivo}`;
            }
          }

          const qrResult = await QRService.generateCertificateQR(
            cert.id,
            controlNumbers,
          );

          const carnetBlob = await carnetGenerator.generateCarnet({
            participant,
            carnetData: {
              id_certificado: cert.id,
              id_participante: cert.id_participante || snapshot.participante?.id,
              id_empresa: snapshot.osi?.empresa_id || osiData?.empresa_id,
              id_curso: snapshot.certificado?.id_curso || cert.id_curso,
              id_osi: snapshot.osi?.id_osi || osiData?.id_osi,
              titulo_curso: certData.certificate_title,
              subtitulo_curso: certData.certificate_subtitle || null,
              fecha_emision: snapshot.certificado?.fecha_emision || cert.fecha_emision,
              fecha_vencimiento: snapshot.certificado?.fecha_vencimiento || cert.fecha_vencimiento,
              nombre_participante: participant.name,
              cedula_participante: participant.idNumber,
              empresa_participante: snapshot.osi?.cliente_nombre_empresa || osiData?.nombre_empresa,
              nro_control: snapshot.certificado?.nro_control || cert.nro_control,
            },
            templateImage: batchCarnetTemplateImage,
            qrDataURL: qrResult.dataUrl,
          });

          const carnetFileName = `Carnet_${participant.idNumber}_${participant.name.replace(/\s+/g, "_")}.pdf`;
          const carnetArrayBuffer = await carnetBlob.arrayBuffer();
          carnetsFolder?.file(carnetFileName, carnetArrayBuffer);
          filesAdded++;
        }
      } catch (err) {
        console.error(`[BatchDownloadOSI] Error for cert ${cert.id}:`, err);
        errors.push(`Cert ${cert.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    if (filesAdded === 0) {
      return NextResponse.json(
        { error: "No files could be generated", details: errors },
        { status: 500 },
      );
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const dateStr = new Date().toISOString().split("T")[0];
    const courseName = certificates[0]?.catalogo_servicios?.nombre || "Curso";
    const zipFileName = `Lote_${nroOsi}_${dateStr}_${courseName.replace(/\s+/g, "_")}.zip`;

    return new NextResponse(zipBlob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFileName}"`,
      },
    });
  } catch (error) {
    console.error("Error in batch download:", error);
    return NextResponse.json(
      { error: "Failed to generate batch download" },
      { status: 500 },
    );
  }
}
