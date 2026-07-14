"use server";

import { createClient } from "@/utils/supabase/server";
import {
  CertificateGeneration,
  CertificateParticipant,
} from "@/types";
import { getFacilitatorData } from "./facilitators";
import { certificateService } from "@/lib/certificate-service";

export interface CustomCertificateRecord {
  id_participante?: number | null;
  id_empresa?: number | null;
  id_curso?: number | null;
  id_ciudad?: number | null;
  fecha_emision?: string | null;
  fecha_vencimiento?: string | null;
  nro_osi?: number | null;
  id_estado?: number | null;
  id_facilitador?: number | null;
  id_plantilla_certificado?: number | null;
  calificacion?: number;
  is_active?: boolean;
  snapshot_contenido?: string | null;
  nro_libro?: number;
  nro_hoja?: number;
  nro_linea?: number;
  nro_control?: number;
}

export interface CustomCertificateWithNumbers {
  id: number;
  nro_libro: number;
  nro_hoja: number;
  nro_linea: number;
  nro_control: number;
}

async function createOrUpdateParticipant(
  participant: CertificateParticipant,
): Promise<number | null> {
  try {
    const supabase = await createClient();

    if (!participant.name || !participant.idNumber) {
      console.error("FAILED: Missing required participant fields:", {
        name: participant.name,
        idNumber: participant.idNumber,
      });
      return null;
    }

    const normalizedName = participant.name.trim().toUpperCase();
    const cleanIdNumber = participant.idNumber.trim();

    const { data: existingParticipant, error: findError } = await supabase
      .from("participantes_certificados")
      .select("id, nombre, cedula, nacionalidad, is_active")
      .eq("cedula", cleanIdNumber)
      .maybeSingle();

    if (findError && findError.code !== "PGRST116") {
      console.error("FAILED: Error finding existing participant:", findError);
      return null;
    }

    if (existingParticipant) {
      if (!existingParticipant.is_active) {
        await supabase
          .from("participantes_certificados")
          .update({ is_active: true })
          .eq("id", existingParticipant.id);
      }

      if (
        existingParticipant.nacionalidad === "V-" ||
        existingParticipant.nacionalidad === "E-"
      ) {
        const newNacionalidad =
          existingParticipant.nacionalidad === "V-" ? "venezolano" : "extranjero";
        await supabase
          .from("participantes_certificados")
          .update({ nacionalidad: newNacionalidad })
          .eq("id", existingParticipant.id);
        participant.nationality = newNacionalidad as "venezolano" | "extranjero";
      }

      participant.name = existingParticipant.nombre;
      return existingParticipant.id;
    }

    const normalizedNationality =
      participant.nationality === "extranjero" ? "extranjero" : "venezolano";

    const { data: newParticipant, error: insertError } = await supabase
      .from("participantes_certificados")
      .insert({
        nombre: normalizedName,
        cedula: cleanIdNumber,
        nacionalidad: normalizedNationality,
        is_active: true,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: existingDupParticipant } = await supabase
          .from("participantes_certificados")
          .select("id, nombre, cedula, nacionalidad, is_active")
          .eq("cedula", cleanIdNumber)
          .single();
        if (existingDupParticipant) {
          return existingDupParticipant.id;
        }
      }
      console.error("FAILED: Error creating new participant:", insertError);
      return null;
    }

    return newParticipant?.id || null;
  } catch (error) {
    console.error("FAILED: Exception in createOrUpdateParticipant:", error);
    return null;
  }
}

function generateCustomSnapshot(
  certificateData: CertificateGeneration,
  participant: CertificateParticipant,
  participantId: number,
  nro_libro: number,
  nro_hoja: number,
  nro_linea: number,
  nro_control: number,
  batchEmissionDate: string,
): string {
  const snapshot = {
    certificado: {
      id_participante: participantId,
      id_empresa: certificateData.osi_data?.empresa_id,
      id_curso: certificateData.course_topic_data?.id
        ? parseInt(certificateData.course_topic_data.id)
        : null,
      fecha_emision: batchEmissionDate,
      fecha_vencimiento: certificateData.fecha_vencimiento,
      nro_osi: certificateData.osi_data?.nro_osi,
      id_estado: certificateData.id_estado,
      id_facilitador: certificateData.facilitator_id,
      id_plantilla_certificado: certificateData.id_plantilla_certificado,
      calificacion: participant.score || 0,
      is_active: true,
      nro_libro,
      nro_hoja,
      nro_linea,
      nro_control,
    },
    participante: {
      id: participantId,
      name: participant.name.toUpperCase(),
      cedula: participant.idNumber,
      nacionalidad: participant.nationality || "venezolano",
      score: participant.score,
      cedula_completa: `cedula: ${participant.nationality === "extranjero" ? "e-" : "V-"}${participant.idNumber}`,
    },
    certificado_detalles: {
      title: certificateData.certificate_title,
      subtitle: certificateData.certificate_subtitle,
      course_content: certificateData.course_content,
      date: certificateData.date,
      location: certificateData.location,
      horas_estimadas: certificateData.horas_estimadas,
      passing_grade: certificateData.passing_grade,
    },
    osi: {
      id_osi: certificateData.osi_data?.id
        ? parseInt(certificateData.osi_data.id)
        : null,
      nro_osi: certificateData.osi_data?.nro_osi,
      cliente_nombre_empresa: certificateData.osi_data?.cliente_nombre_empresa,
      tipo_servicio: certificateData.osi_data?.tipo_servicio,
      id_ciudad: certificateData.osi_data?.id_ciudad || null,
      empresa_id: certificateData.osi_data?.empresa_id,
      direccion_ejecucion: certificateData.osi_data?.direccion_ejecucion,
    },
    curso: {
      name: certificateData.course_topic_data?.name,
      id: certificateData.course_topic_data?.id,
      contenido: certificateData.course_topic_data?.contenido_curso,
      nota_aprobatoria: certificateData.course_topic_data?.nota_aprobatoria,
      emite_carnet: certificateData.course_topic_data?.emite_carnet,
    },
    plantilla: {
      id_plantilla_certificado: certificateData.id_plantilla_certificado,
      archivo_plantilla_certificado: certificateData.plantilla_certificado_archivo,
    },
    firmas: {
      facilitator_id: certificateData.facilitator_id,
      facilitator_data: certificateData.facilitator_data,
      sha_signature_id: certificateData.sha_signature_id,
      sha_signature_data: (certificateData as any).sha_signature_data ?? null,
    },
    metadatos: {
      generated_at: new Date().toISOString(),
      generated_by: "custom_certificate_generation",
    },
  };

  return JSON.stringify(snapshot, null, 2);
}

export async function saveCustomCertificatesToDatabase(
  certificateData: CertificateGeneration,
  participants: CertificateParticipant[],
): Promise<{
  success: boolean;
  message: string;
  certificateIds?: number[];
  participantIds?: number[];
  certificateNumbers?: CustomCertificateWithNumbers[];
}> {
  try {
    const updatedCertificateData = { ...certificateData };

    if (certificateData.facilitator_id) {
      try {
        const facilitatorData = await getFacilitatorData(certificateData.facilitator_id);
        if (facilitatorData) {
          updatedCertificateData.facilitator_data = facilitatorData as any;
        }
      } catch (e) {
        console.warn("Failed to fetch facilitator data:", e);
      }
    }

    if (certificateData.sha_signature_id && !(certificateData as any).sha_signature_data) {
      try {
        const shaSignatureData = await certificateService.getSignatureData(
          certificateData.sha_signature_id,
        );
        if (shaSignatureData) {
          (updatedCertificateData as any).sha_signature_data = shaSignatureData;
        }
      } catch (e) {
        console.warn("Failed to fetch SHA signature data:", e);
      }
    }

    const supabase = await createClient();

    if (!certificateData.osi_data || !certificateData.course_topic_data) {
      return {
        success: false,
        message: "OSI data and course topic data are required",
      };
    }

    const emissionDate =
      certificateData.date || new Date().toLocaleDateString("en-CA");
    const batchEmissionDate = emissionDate;

    const certificateIds: number[] = [];
    const participantIds: number[] = [];
    const certificateNumbers: CustomCertificateWithNumbers[] = [];

    let nextControlNumbers = {
      nro_libro: 1,
      nro_hoja: 1,
      nro_linea: 1,
      nro_control: 1,
    };

    try {
      const { data: configData, error: configError } = await supabase
        .from("control_sequences")
        .select("*")
        .eq("is_active", true)
        .single();

      if (configData && !configError) {
        const { data: lastCert, error: lastCertError } = await supabase
          .from("certificados")
          .select("nro_libro, nro_hoja, nro_linea, nro_control")
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastCertError || !lastCert) {
          nextControlNumbers = {
            nro_libro: configData.nro_libro,
            nro_hoja: configData.nro_hoja,
            nro_linea: configData.nro_linea,
            nro_control: configData.nro_control,
          };
        } else {
          let nextLine = lastCert.nro_linea + 1;
          let nextSheet = lastCert.nro_hoja;
          let nextBook = lastCert.nro_libro;

          if (nextLine > 10) {
            nextLine = 1;
            nextSheet += 1;
            if (nextSheet > 100) {
              nextSheet = 1;
              nextBook += 1;
            }
          }

          nextControlNumbers = {
            nro_libro: nextBook,
            nro_hoja: nextSheet,
            nro_linea: nextLine,
            nro_control: (lastCert.nro_control || 0) + 1,
          };
        }
      } else {
        const { data: controlNumbersData, error: rpcError } = await supabase.rpc(
          "get_next_control_numbers",
          { batch_size: participants.length },
        );
        if (!rpcError && controlNumbersData) {
          nextControlNumbers = controlNumbersData as any;
        }
      }
    } catch (error) {
      console.warn("Failed to determine next control numbers, using defaults:", error);
    }

    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];

      const participantId = await createOrUpdateParticipant(participant);

      if (!participantId) {
        console.error("FAILED: Could not create/update participant:", participant.name);
        continue;
      }

      participantIds.push(participantId);

      let currentLine = nextControlNumbers.nro_linea + i;
      let currentSheet = nextControlNumbers.nro_hoja;
      let currentBook = nextControlNumbers.nro_libro;

      if (currentLine > 10) {
        const extraLines = currentLine - 1;
        currentLine = (extraLines % 10) + 1;
        currentSheet = nextControlNumbers.nro_hoja + Math.floor(extraLines / 10);
        if (currentSheet > 100) {
          const extraSheets = currentSheet - 1;
          currentSheet = (extraSheets % 100) + 1;
          currentBook = nextControlNumbers.nro_libro + Math.floor(extraSheets / 100);
        }
      }

      const currentControlNumbers = {
        nro_libro: currentBook,
        nro_hoja: currentSheet,
        nro_linea: currentLine,
        nro_control: nextControlNumbers.nro_control + i,
      };

      const certificateRecord: CustomCertificateRecord = {
        id_participante: participantId || null,
        id_empresa: updatedCertificateData.osi_data?.empresa_id || null,
        id_curso: updatedCertificateData.course_topic_data?.id
          ? parseInt(updatedCertificateData.course_topic_data.id)
          : null,
        id_ciudad: updatedCertificateData.osi_data?.id_ciudad || null,
        fecha_emision: batchEmissionDate,
        fecha_vencimiento: updatedCertificateData.fecha_vencimiento || null,
        nro_osi: updatedCertificateData.osi_data?.nro_osi
          ? typeof updatedCertificateData.osi_data.nro_osi === "string"
            ? parseInt(updatedCertificateData.osi_data.nro_osi.replace(/[^\d]/g, "")) || null
            : updatedCertificateData.osi_data.nro_osi
          : null,
        id_estado: updatedCertificateData.id_estado || null,
        id_facilitador: updatedCertificateData.facilitator_id
          ? parseInt(updatedCertificateData.facilitator_id)
          : null,
        id_plantilla_certificado: updatedCertificateData.id_plantilla_certificado || null,
        calificacion: participant.score || 0,
        is_active: true,
        nro_libro: currentControlNumbers.nro_libro,
        nro_hoja: currentControlNumbers.nro_hoja,
        nro_linea: currentControlNumbers.nro_linea,
        nro_control: currentControlNumbers.nro_control,
      };

      if (!certificateRecord.id_participante) {
        console.error("FAILED: Missing participant ID for certificate:", participant.name);
        continue;
      }

      const snapshot = generateCustomSnapshot(
        updatedCertificateData,
        participant,
        participantId,
        currentControlNumbers.nro_libro,
        currentControlNumbers.nro_hoja,
        currentControlNumbers.nro_linea,
        currentControlNumbers.nro_control,
        batchEmissionDate,
      );

      const { data: certificateInsert, error: certificateError } = await supabase
        .from("certificados")
        .insert({ ...certificateRecord, snapshot_contenido: snapshot })
        .select("id, nro_libro, nro_hoja, nro_linea, nro_control")
        .single();

      if (certificateError) {
        console.error("FAILED: Certificate insertion error for participant:", participant.name, certificateError);
        continue;
      }

      if (certificateInsert) {
        certificateIds.push(certificateInsert.id);
        certificateNumbers.push({
          id: certificateInsert.id,
          nro_libro: certificateInsert.nro_libro,
          nro_hoja: certificateInsert.nro_hoja,
          nro_linea: certificateInsert.nro_linea,
          nro_control: certificateInsert.nro_control,
        });
      }
    }

    if (certificateIds.length === 0) {
      return {
        success: false,
        message: "No certificates were saved to database",
      };
    }

    return {
      success: true,
      message: `Successfully saved ${certificateIds.length} certificates`,
      certificateIds,
      participantIds,
      certificateNumbers,
    };
  } catch (error) {
    console.error("Critical error in saveCustomCertificatesToDatabase:", error);
    return {
      success: false,
      message: "Unexpected error saving certificates",
    };
  }
}
