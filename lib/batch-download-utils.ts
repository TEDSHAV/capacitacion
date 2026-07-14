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
  const zip = new JSZip();
  const certificateGenerator = new CertificateGenerator();

  // Folders in ZIP
  const certsFolder = zip.folder("Certificados");
  const carnetsFolder = zip.folder("Carnets");
  const docsFolder = zip.folder("Documentos_Adicionales");

  const results: { success: boolean; errors: string[] } = {
    success: true,
    errors: [],
  };

  // 1. Generate Certificates and Carnets
  if (choice === "full" || choice === "certificates" || choice === "carnets") {
    for (const cert of certificates) {
      try {
        const snapshot =
          typeof cert.snapshot_contenido === "string"
            ? JSON.parse(cert.snapshot_contenido)
            : cert.snapshot_contenido;

        if (!snapshot) continue;

        // Reconstruct necessary data for generation
        const participant = {
          name: snapshot.participante.name,
          idNumber: snapshot.participante.cedula,
          idType:
            snapshot.participante.idType ||
            (snapshot.participante.nacionalidad === "extranjero" ? "E-" : "V-"),
          nationality: snapshot.participante.nacionalidad,
          score: snapshot.participante.score,
        };

        const certData = {
          ...snapshot.certificado_detalles,
          certificate_title: snapshot.certificado_detalles.title,
          course_topic_data: snapshot.curso,
          osi_data: snapshot.osi,
          facilitator_data: snapshot.firmas.facilitator_data,
          facilitator_id: snapshot.firmas.facilitator_id,
          sha_signature_data: snapshot.firmas.sha_signature_data,
          plantilla_certificado_archivo:
            snapshot.plantilla.archivo_plantilla_certificado,
          id_plantilla_certificado: snapshot.plantilla.id_plantilla_certificado,
          fecha_vencimiento: snapshot.certificado.fecha_vencimiento,
          complemento_empresa: snapshot.osi.complemento_empresa,
        };

        const controlNumbers = {
          nro_libro: snapshot.certificado.nro_libro,
          nro_hoja: snapshot.certificado.nro_hoja,
          nro_linea: snapshot.certificado.nro_linea,
          nro_control: snapshot.certificado.nro_control,
        };

        // Pre-fetch assets if they were remote, but usually snapshots contain everything needed
        // For simplicity, we assume assets like templates are in /public and accessible via URL
        const templateImageUrl = `/templates/${snapshot.plantilla.archivo_plantilla_certificado?.toLowerCase() || "certificado.png"}`;

        // Certificates
        if (choice === "full" || choice === "certificates") {
          const certBlob = await certificateGenerator.generateCertificate({
            participant,
            certificateData: certData,
            templateImage: templateImageUrl,
            controlNumbers,
            certificateId: cert.id,
            paperSize: snapshot.certificado.paperSize || "half-letter-custom",
          });
          const fileName = `Certificado_${participant.idNumber}_${participant.name.replace(/\s+/g, "_")}.pdf`;
          certsFolder?.file(fileName, certBlob);
        }

        // Carnets (if applicable)
        if (
          (choice === "full" || choice === "carnets") &&
          cert.id_plantilla_carnet
        ) {
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
              id_participante: cert.id_participante,
              id_empresa: snapshot.osi.empresa_id,
              id_curso: snapshot.certificado.id_curso,
              id_osi: snapshot.osi.id_osi,
              titulo_curso: certData.certificate_title,
              fecha_emision: snapshot.certificado.fecha_emision,
              fecha_vencimiento: snapshot.certificado.fecha_vencimiento,
              nombre_participante: participant.name,
              cedula_participante: participant.idNumber,
              empresa_participante: snapshot.osi.cliente_nombre_empresa,
              nro_control: snapshot.certificado.nro_control,
            },
            templateImage: "", // Optional if using default or embedded logic
            qrDataURL: qrResult.dataUrl,
          });

          const fileName = `Carnet_${participant.idNumber}_${participant.name.replace(/\s+/g, "_")}.pdf`;
          carnetsFolder?.file(fileName, carnetBlob);
        }
      } catch (err) {
        console.error("Error generating item for ZIP:", err);
        results.errors.push(
          `Error con participante ${cert.participantes_certificados?.nombre}: ${err instanceof Error ? err.message : "Error desconocido"}`,
        );
        results.success = false;
      }
    }
  }

  // 2. Generate Additional Documents
  if (choice === "full" || choice === "documents") {
    try {
      // Use the first certificate's snapshot for OSI data consistency
      const firstSnapshot =
        typeof certificates[0].snapshot_contenido === "string"
          ? JSON.parse(certificates[0].snapshot_contenido)
          : certificates[0].snapshot_contenido;

      if (firstSnapshot) {
        const docRequest = {
          certificates: certificates.map((c) => {
            const s =
              typeof c.snapshot_contenido === "string"
                ? JSON.parse(c.snapshot_contenido)
                : c.snapshot_contenido;
            return {
              participant_name: s.participante.name,
              participant_id_number: s.participante.cedula,
              participant_id_type: s.participante.idType,
              participant_nationality: s.participante.nacionalidad,
              score: s.participante.score,
              control_number: s.certificado.nro_control,
              course_title: s.certificado_detalles.title,
              execution_date: s.certificado.fecha_emision,
            };
          }),
          osiData: {
            ...firstSnapshot.osi,
            cliente_nombre_empresa: firstSnapshot.osi.cliente_nombre_empresa,
            nro_osi: firstSnapshot.osi.nro_osi,
            tema: firstSnapshot.certificado_detalles.title,
            id_curso: firstSnapshot.certificado.id_curso,
            id_ciudad: firstSnapshot.osi.id_ciudad,
          },
          firmanteData: {
            nombre:
              firstSnapshot.firmas.sha_signature_data?.nombre ||
              "DPTO. CAPACITACIÓN / SHA DE VENEZUELA, C.A.",
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
            docsFolder?.file(fileName, base64, { base64: true });
          });
        }
      }
    } catch (err) {
      console.error("Error generating additional documents for ZIP:", err);
      results.errors.push(
        `Error generando documentos adicionales: ${err instanceof Error ? err.message : "Error desconocido"}`,
      );
      results.success = false;
    }
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
