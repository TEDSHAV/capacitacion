import JSZip from "jszip";
import { CertificateGenerator } from "./certificate-generator";
import { generateDocumentsServer } from "./document-server-actions";
import { getDocumentFileName } from "./document-client-utils";

export type DownloadChoice = "full" | "certificates" | "carnets" | "documents";

export async function downloadBatchAction(
  choice: DownloadChoice,
  certificates: any[],
  osiData: any,
  courseTitle: string,
  date: string,
) {
  console.log(`[BatchDownload] Starting generation - Choice: ${choice}, Items: ${certificates?.length}`);
  const zip = new JSZip();
  const certificateGenerator = new CertificateGenerator();

  // Folders in ZIP
  const certsFolder = zip.folder("Certificados");
  const carnetsFolder = zip.folder("Carnets");
  const docsFolder = zip.folder("Documentos_Adicionales");

  let filesAddedCount = 0;
  const results: { success: boolean; errors: string[] } = {
    success: true,
    errors: [],
  };

  // 1. Generate Certificates and Carnets
  if (choice === "full" || choice === "certificates" || choice === "carnets") {
    for (const cert of certificates) {
      try {
        console.log(`[BatchDownload] Processing certificate record ID: ${cert.id}`);
        
        let snapshot = null;
        if (cert.snapshot_contenido) {
          snapshot = typeof cert.snapshot_contenido === "string"
            ? JSON.parse(cert.snapshot_contenido)
            : cert.snapshot_contenido;
        }

        if (!snapshot) {
          console.warn(`[BatchDownload] No snapshot for cert ${cert.id}, attempting fallback...`);
          // FALLBACK: Reconstruct minimal snapshot from base columns if available
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
                name: courseTitle,
                emite_carnet: cert.catalogo_servicios?.emite_carnet || false,
              },
              certificado_detalles: {
                title: courseTitle,
                subtitle: "",
              },
              osi: osiData,
              firmas: {
                facilitator_id: cert.id_facilitador,
                facilitator_data: cert.facilitadores,
                sha_signature_id: cert.sha_signature_id || 1, // Fallback to ID 1
              }
            };
          } else {
            console.error(`[BatchDownload] Fallback failed for cert ${cert.id} - missing participant data`);
            continue;
          }
        }

        // Reconstruct necessary data for generation
        const participant = {
          name: snapshot.participante?.name || cert.participantes_certificados?.nombre || "Participante",
          idNumber: snapshot.participante?.cedula || cert.participantes_certificados?.cedula || "S/N",
          idType:
            snapshot.participante?.idType ||
            (snapshot.participante?.nacionalidad === "extranjero" ? "E-" : "V-"),
          nationality: snapshot.participante?.nacionalidad || cert.participantes_certificados?.nacionalidad || "venezolano",
          score: snapshot.participante?.score ?? cert.calificacion ?? 0,
        };

        const certData = {
          ...snapshot.certificado_detalles,
          certificate_title: snapshot.certificado_detalles?.title || courseTitle,
          certificate_subtitle:
            snapshot.certificado_detalles?.subtitle ||
            snapshot.subtitulo_curso ||
            snapshot.certificate_subtitle ||
            "",
          course_topic_data: snapshot.curso || { name: courseTitle },
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

        const controlNumbers = {
          nro_libro: snapshot.certificado?.nro_libro || cert.nro_libro,
          nro_hoja: snapshot.certificado?.nro_hoja || cert.nro_hoja,
          nro_linea: snapshot.certificado?.nro_linea || cert.nro_linea,
          nro_control: snapshot.certificado?.nro_control || cert.nro_control,
        };

        const templateImageUrl = `/templates/${(snapshot.plantilla?.archivo_plantilla_certificado || "certificado.png").toLowerCase()}`;

        // Certificates
        if (choice === "full" || choice === "certificates") {
          console.log(`[BatchDownload] Generating PDF for ${participant.name}`);
          const certBlob = await certificateGenerator.generateCertificate({
            participant,
            certificateData: certData as any,
            templateImage: templateImageUrl,
            controlNumbers,
            certificateId: cert.id,
            paperSize: snapshot.certificado?.paperSize || "half-letter-custom",
          });
          const fileName = `Certificado_${participant.idNumber}_${participant.name.replace(/\s+/g, "_")}.pdf`;
          certsFolder?.file(fileName, certBlob);
          filesAddedCount++;
        }

        // Carnets (only for participants who passed and course emits carnet)
        const shouldEmiteCarnet = cert.catalogo_servicios?.emite_carnet || snapshot.curso?.emite_carnet;
        const passingGrade = snapshot.certificado_detalles?.passing_grade
          ?? snapshot.curso?.nota_aprobatoria
          ?? cert.catalogo_servicios?.nota_aprobatoria
          ?? 14;
        const participantPassed = participant.score != null && participant.score >= passingGrade;
        if (
          (choice === "full" || choice === "carnets") &&
          (cert.id_plantilla_carnet || snapshot.plantilla?.id_plantilla_carnet || shouldEmiteCarnet) &&
          participantPassed
        ) {
          console.log(`[BatchDownload] Generating Carnet for ${participant.name}`);
          const { CarnetGenerator } = await import("./carnet-generator");
          const { QRService } = await import("./qr-service");
          const carnetGenerator = new CarnetGenerator();

          // Re-generate QR for carnet
          const qrResult = await QRService.generateCertificateQR(
            cert.id,
            controlNumbers,
          );

          const carnetBlob = await carnetGenerator.generateCarnet({
            participant,
            carnetData: {
              id_certificado: cert.id,
              id_participante: cert.id_participante || snapshot.participante?.id,
              id_empresa: snapshot.osi?.empresa_id || osiData.empresa_id,
              id_curso: snapshot.certificado?.id_curso || cert.id_curso,
              id_osi: snapshot.osi?.id_osi || osiData.id_osi,
              titulo_curso: certData.certificate_title,
              subtitulo_curso: certData.certificate_subtitle || null,
              fecha_emision: snapshot.certificado?.fecha_emision || cert.fecha_emision,
              fecha_vencimiento: snapshot.certificado?.fecha_vencimiento || cert.fecha_vencimiento,
              nombre_participante: participant.name,
              cedula_participante: participant.idNumber,
              empresa_participante: snapshot.osi?.cliente_nombre_empresa || osiData.nombre_empresa,
              nro_control: snapshot.certificado?.nro_control || cert.nro_control,
            },
            templateImage: "/templates/carnet.png", // Use default carnet template
            qrDataURL: qrResult.dataUrl,
          });

          const fileName = `Carnet_${participant.idNumber}_${participant.name.replace(/\s+/g, "_")}.pdf`;
          carnetsFolder?.file(fileName, carnetBlob);
          filesAddedCount++;
        }
      } catch (err) {
        console.error("[BatchDownload] Error generating item for ZIP:", err);
        results.errors.push(
          `Error con participante ${cert.participantes_certificados?.nombre || cert.id}: ${err instanceof Error ? err.message : "Error desconocido"}`,
        );
        results.success = false;
      }
    }
  }

  // 2. Generate Additional Documents
  if ((choice === "full" || choice === "documents") && certificates.length > 0) {
    try {
      console.log(`[BatchDownload] Generating additional documents...`);
      // Use the first certificate for OSI data consistency
      const firstCert = certificates[0];
      let firstSnapshot = null;
      if (firstCert.snapshot_contenido) {
        firstSnapshot = typeof firstCert.snapshot_contenido === "string"
          ? JSON.parse(firstCert.snapshot_contenido)
          : firstCert.snapshot_contenido;
      }

      const docRequest = {
        certificates: certificates.map((c) => {
          let s = null;
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
          ...osiData,
          cliente_nombre_empresa: firstSnapshot?.osi?.cliente_nombre_empresa || osiData.nombre_empresa,
          nro_osi: firstSnapshot?.osi?.nro_osi || osiData.nro_osi,
          tema: firstSnapshot?.certificado_detalles?.title || courseTitle,
          id_curso: firstSnapshot?.certificado?.id_curso || firstCert.id_curso,
          id_ciudad: firstSnapshot?.osi?.id_ciudad || osiData.id_ciudad,
          ciudad: firstSnapshot?.certificado_detalles?.location || firstSnapshot?.osi?.ciudad || osiData.ciudad,
        },
        firmanteData: {
          nombre: firstSnapshot?.firmas?.sha_signature_data?.nombre || "DPTO. CAPACITACIÓN / SHA DE VENEZUELA, C.A.",
          cargo: "Jefe de Capacitación",
        },
        options: {
          includeCertificacionCompetencias: true,
          includeNotaEntrega: true,
          includeValidacionDatos: true,
        },
      };

      const docResult = await generateDocumentsServer(docRequest);
      if (docResult.success && docResult.documents) {
        Object.entries(docResult.documents).forEach(([key, base64]) => {
          const fileName = `${key.replace(/_/g, " ").toUpperCase()}.pdf`;
          console.log(`[BatchDownload] Adding additional document: ${fileName}`);
          docsFolder?.file(fileName, base64, { base64: true });
          filesAddedCount++;
        });
      }
    } catch (err) {
      console.error("[BatchDownload] Error generating additional documents:", err);
      results.errors.push(
        `Error generando documentos adicionales: ${err instanceof Error ? err.message : "Error desconocido"}`,
      );
      results.success = false;
    }
  }

  console.log(`[BatchDownload] Generation complete. Files to ZIP: ${filesAddedCount}`);
  
  if (filesAddedCount === 0) {
    console.warn("[BatchDownload] No files were added to the ZIP.");
    results.success = false;
    results.errors.push("No se pudieron generar archivos para el ZIP. Verifique los datos de los certificados.");
    return results;
  }

  // 3. Finalize ZIP
  const content = await zip.generateAsync({ type: "blob" });
  const zipFileName = `Lote_${osiData.nro_osi}_${date}_${courseTitle.replace(/\s+/g, "_")}.zip`;

  // Trigger download
  const url = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = zipFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return results;
}
