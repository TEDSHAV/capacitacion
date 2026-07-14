"use server";

import { createClient } from "@/utils/supabase/server";

import {
  CertificateGeneration,
  CertificateParticipant,
  CertificateFilters,
  CertificateSearchResult,
  CertificateMetrics,
} from "@/types";

import { QRService } from "@/lib/qr-service";
import { getFacilitatorData } from "./facilitators";
import { certificateService } from "@/lib/certificate-service";

export interface CertificateRecord {
  id_participante?: number | null;

  id_empresa?: number | null;

  id_curso?: number | null;

  fecha_emision?: string | null;

  fecha_vencimiento?: string | null;

  nro_osi?: number | null; // Made optional since it's working in snapshot

  id_estado?: number | null;

  id_facilitador?: number | null;

  id_plantilla_certificado?: number | null;

  calificacion?: number;

  is_active?: boolean;

  snapshot_contenido?: string | null;

  nro_libro?: number; // Control number fields

  nro_hoja?: number;

  nro_linea?: number;

  nro_control?: number;
}

export interface CertificateWithNumbers {
  id: number;

  nro_libro: number;

  nro_hoja: number;

  nro_linea: number;

  nro_control: number;
}

/**

 * Save certificate records to database for all participants

 */

export async function saveCertificatesToDatabase(
  certificateData: CertificateGeneration,

  participants: CertificateParticipant[],
): Promise<{
  success: boolean;
  message: string;
  certificateIds?: number[];
  participantIds?: number[];
  certificateNumbers?: CertificateWithNumbers[];
}> {
  try {
    const startTime = Date.now();
    console.log("=== STARTING CERTIFICATE SAVE PROCESS ===");
    console.log("⏱️  Start time:", new Date(startTime).toISOString());

    console.log("Certificate data:", JSON.stringify(certificateData, null, 2));

    console.log("Participants count:", participants.length);

    console.log("Participants:", JSON.stringify(participants, null, 2));

    // Fetch facilitator and SHA signature in parallel — they are independent

    let updatedCertificateData = { ...certificateData };

    const fetchTasks: Promise<void>[] = [];

    if (certificateData.facilitator_id && !certificateData.facilitator_data) {
      fetchTasks.push(
        (async () => {
          const facilitatorData = await getFacilitatorData(
            certificateData.facilitator_id!,
          );

          if (facilitatorData) {
            updatedCertificateData.facilitator_data = facilitatorData;

            console.log(
              "Successfully fetched facilitator data:",
              facilitatorData.name,
            );
          }
        })().catch((e) => {
          console.warn("Failed to fetch facilitator data:", e);
        }),
      );
    }

    if (
      certificateData.sha_signature_id &&
      !certificateData.sha_signature_data
    ) {
      fetchTasks.push(
        (async () => {
          const shaSignatureData = await certificateService.getSignatureData(
            certificateData.sha_signature_id!,
          );

          if (shaSignatureData) {
            updatedCertificateData.sha_signature_data = shaSignatureData;

            console.log(
              "Successfully fetched SHA signature data:",
              shaSignatureData.nombre,
            );
          }
        })().catch((e) => {
          console.warn("Failed to fetch SHA signature data:", e);
        }),
      );
    }

    if (fetchTasks.length > 0) await Promise.all(fetchTasks);

    const afterFetchTime = Date.now();
    console.log(
      `⏱️  Facilitator/Signature fetch time: ${afterFetchTime - startTime}ms`,
    );

    const supabase = await createClient();

    if (!certificateData.osi_data || !certificateData.course_topic_data) {
      return {
        success: false,
        message: "OSI data and course topic data are required",
      };
    }

    const today = new Date().toLocaleDateString("en-CA"); // en-CA format gives YYYY-MM-DD in local timezone
    const batchEmissionDate = today; // Constant for the whole batch

    const certificateIds: number[] = [];

    const participantIds: number[] = [];

    const certificateNumbers: CertificateWithNumbers[] = [];

    const beforeControlNumbersTime = Date.now();
    // 🚀 USE POSTGRESQL RPC TO GET CONTROL NUMBERS ATOMICALLY - NO MORE RACE CONDITIONS
    let nextControlNumbers = {
      nro_libro: 1,
      nro_hoja: 1,
      nro_linea: 1,
      nro_control: 1,
    };

    try {
      const { data: controlNumbersData, error: rpcError } = await supabase.rpc(
        "get_next_control_numbers",
        {
          batch_size: participants.length,
        },
      );

      if (!rpcError && controlNumbersData) {
        nextControlNumbers = controlNumbersData as any;
        console.log("Generated control numbers via RPC:", nextControlNumbers);
      } else {
        console.warn(
          "RPC error for control numbers, using fallback:",
          rpcError,
        );
      }
    } catch (error) {
      console.warn(
        "Failed to get control numbers via RPC, using defaults:",
        error,
      );
    }
    const afterControlNumbersTime = Date.now();
    console.log(
      `⏱️  Control numbers RPC time: ${afterControlNumbersTime - beforeControlNumbersTime}ms`,
    );

    const beforeParticipantsLoopTime = Date.now();
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];

      console.log(
        `\n--- Processing participant ${i + 1}/${participants.length}: ${participant.name} ---`,
      );

      // 1. Create or find participant record

      console.log("Step 1: Creating/updating participant...");

      const participantId = await createOrUpdateParticipant(participant);

      console.log("Participant ID result:", participantId);

      if (!participantId) {
        console.error(
          "FAILED: Could not create/update participant:",
          participant.name,
        );

        console.error(
          "STOPPING certificate creation process due to participant failure",
        );

        continue; // Skip this participant but continue with others
      }

      console.log(
        "SUCCESS: Participant created/updated with ID:",
        participantId,
      );

      // Verify participant was actually saved to database

      const { data: verifyParticipant, error: verifyError } = await supabase

        .from("participantes_certificados")

        .select("id, nombre, cedula, nacionalidad, is_active")

        .eq("id", participantId)

        .single();

      if (verifyError) {
        console.error(
          "FAILED: Could not verify participant was saved:",
          verifyError,
        );
      } else {
        console.log("VERIFIED: Participant exists in database:", {
          id: verifyParticipant?.id,

          nombre: verifyParticipant?.nombre,

          cedula: verifyParticipant?.cedula,

          nacionalidad: verifyParticipant?.nacionalidad,

          is_active: verifyParticipant?.is_active,
        });

        console.log(
          "DEBUG: Nationality in database:",
          verifyParticipant?.nacionalidad,
        );

        console.log(
          "DEBUG: Type of nationality in database:",
          typeof verifyParticipant?.nacionalidad,
        );
      }

      console.log("Participant details from database:");

      // Store the real database participant ID

      participantIds.push(participantId);

      // Generate unique control numbers for this participant with wrapping logic
      // Assuming 10 lines per page (nro_hoja) and 100 pages per book (nro_libro)
      // This MUST match the logic in the database trigger to keep snapshots consistent
      let currentLine = nextControlNumbers.nro_linea + i;
      let currentSheet = nextControlNumbers.nro_hoja;
      let currentBook = nextControlNumbers.nro_libro;

      // Handle wrapping of lines to sheets
      if (currentLine > 10) {
        const extraLines = currentLine - 1;
        currentLine = (extraLines % 10) + 1;
        currentSheet =
          nextControlNumbers.nro_hoja + Math.floor(extraLines / 10);

        // Handle wrapping of sheets to books
        if (currentSheet > 100) {
          const extraSheets = currentSheet - 1;
          currentSheet = (extraSheets % 100) + 1;
          currentBook =
            nextControlNumbers.nro_libro + Math.floor(extraSheets / 100);
        }
      }

      const currentControlNumbers = {
        nro_libro: currentBook,
        nro_hoja: currentSheet,
        nro_linea: currentLine,
        nro_control: nextControlNumbers.nro_control + i,
      };

      // 2. Prepare certificate record data with proper participant ID

      console.log("Step 2: Preparing certificate record...");

      const certificateRecord: CertificateRecord = {
        id_participante: participantId || null,

        id_empresa: updatedCertificateData.osi_data?.empresa_id || null,

        id_curso: updatedCertificateData.course_topic_data?.cursos_id ?? null, // FK → cursos; cursos_id holds the real cursos.id

        fecha_emision: today,

        fecha_vencimiento: updatedCertificateData.fecha_vencimiento || null,

        nro_osi: updatedCertificateData.osi_data?.nro_osi
          ? typeof updatedCertificateData.osi_data.nro_osi === "string"
            ? parseInt(
                updatedCertificateData.osi_data.nro_osi.replace(/[^\d]/g, ""),
              ) || null
            : updatedCertificateData.osi_data.nro_osi
          : null, // Handle string to number conversion

        id_estado: updatedCertificateData.id_estado || null,

        id_facilitador: updatedCertificateData.facilitator_id
          ? parseInt(updatedCertificateData.facilitator_id)
          : null,

        id_plantilla_certificado:
          updatedCertificateData.id_plantilla_certificado || null,

        calificacion: participant.score || 0,

        is_active: true, // Default value

        nro_libro: currentControlNumbers.nro_libro,

        nro_hoja: currentControlNumbers.nro_hoja,

        nro_linea: currentControlNumbers.nro_linea,

        nro_control: currentControlNumbers.nro_control,
      };

      console.log(
        "Prepared certificate record:",
        JSON.stringify(certificateRecord, null, 2),
      );

      // Validate that we have required fields for OSI certificates

      if (!certificateRecord.id_participante) {
        console.error(
          "FAILED: Missing participant ID for certificate:",
          participant.name,
        );

        continue;
      }

      // Log warning for missing OSI number but don't fail (it's in snapshot)
      if (!certificateRecord.nro_osi) {
        console.warn(
          "WARNING: Missing OSI number for certificate:",
          participant.name,
        );
        console.warn("OSI data available:", certificateData.osi_data);
      }

      // 🚀 GENERATE SNAPSHOT BEFORE INSERT - SAVES 1 DB TRIP PER PARTICIPANT
      const updatedSnapshot = generateContentSnapshotWithControlNumbers(
        updatedCertificateData,
        participant,
        participantId,
        currentControlNumbers.nro_libro,
        currentControlNumbers.nro_hoja,
        currentControlNumbers.nro_linea,
        currentControlNumbers.nro_control,
        batchEmissionDate, // Pass constant date
      );

      // 3. Insert certificate record with snapshot already generated
      console.log(
        "Step 3: Inserting certificate record with pre-generated snapshot...",
      );

      const certificateRecordWithSnapshot = {
        ...certificateRecord,
        snapshot_contenido: updatedSnapshot,
      };

      const { data: certificateInsert, error: certificateError } =
        await supabase
          .from("certificados")
          .insert(certificateRecordWithSnapshot)
          .select("id, nro_libro, nro_hoja, nro_linea, nro_control")
          .single();

      if (certificateError) {
        console.error(
          "FAILED: Certificate insertion error for participant:",
          participant.name,
        );
        console.error("Database error:", certificateError);
        console.error(
          "Error details:",
          JSON.stringify(certificateError, null, 2),
        );
        console.error(
          "Certificate record that failed:",
          JSON.stringify(certificateRecordWithSnapshot, null, 2),
        );
        continue;
      }

      console.log("SUCCESS: Certificate inserted:", certificateInsert);

      if (certificateInsert) {
        certificateIds.push(certificateInsert.id);
        certificateNumbers.push({
          id: certificateInsert.id,
          nro_libro: certificateInsert.nro_libro,
          nro_hoja: certificateInsert.nro_hoja,
          nro_linea: certificateInsert.nro_linea,
          nro_control: certificateInsert.nro_control,
        });

        // 4. Generate QR code with actual certificate ID and update
        console.log("Step 4: Generating QR code with actual certificate ID...");
        try {
          const qrResult = await QRService.generateCertificateQR(
            certificateInsert.id,
            {
              nro_libro: certificateInsert.nro_libro,
              nro_hoja: certificateInsert.nro_hoja,
              nro_linea: certificateInsert.nro_linea,
              nro_control: certificateInsert.nro_control,
            },
          );
          const qrCodeDataUrl = qrResult.dataUrl;
          console.log("QR code generated successfully");

          // Update certificate with QR code only (snapshot already there)
          const { error: updateError } = await supabase
            .from("certificados")
            .update({ qr_code: qrCodeDataUrl || null })
            .eq("id", certificateInsert.id);

          if (updateError) {
            console.warn(
              "WARNING: Failed to update certificate with QR code:",
              updateError,
            );
          } else {
            console.log("SUCCESS: Certificate updated with QR code");
          }
        } catch (error) {
          console.warn(
            "WARNING: Failed to generate QR code for certificate:",
            certificateInsert.id,
            error,
          );
        }
      }
    }

    const afterParticipantsLoopTime = Date.now();
    console.log(
      `⏱️  All participants processing time: ${afterParticipantsLoopTime - beforeParticipantsLoopTime}ms`,
    );

    const endTime = Date.now();
    console.log(
      `⏱️  TOTAL CERTIFICATE GENERATION TIME: ${endTime - startTime}ms`,
    );
    console.log(`⏱️  End time:`, new Date(endTime).toISOString());

    console.log("Certificate IDs:", certificateIds);

    if (certificateIds.length === 0) {
      console.error("FAILED: No certificates were saved to database");

      return {
        success: false,
        message: "No certificates were saved to database",
      };
    }

    return {
      success: true,

      message: `Successfully saved ${certificateIds.length} certificates to database`,

      certificateIds,

      participantIds,

      certificateNumbers,
    };
  } catch (error) {
    console.error("FATAL ERROR in saveCertificatesToDatabase:", error);

    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );

    return {
      success: false,

      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**

 * Create or update participant record

 */

async function createOrUpdateParticipant(
  participant: CertificateParticipant,
): Promise<number | null> {
  try {
    const supabase = await createClient();

    console.log(
      "Creating/updating participant:",
      JSON.stringify(participant, null, 2),
    );

    // Validate required fields
    if (!participant.name || !participant.id_number) {
      console.error("FAILED: Missing required participant fields:", {
        name: participant.name,
        id_number: participant.id_number,
        nationality: participant.nationality,
      });
      return null;
    }

    // First, try to find existing participant by cedula (primary match) - name can vary slightly

    const { data: existingParticipant, error: findError } = await supabase

      .from("participantes_certificados")

      .select("id, nombre, cedula, nacionalidad, is_active")

      .eq("cedula", participant.id_number)

      .maybeSingle();

    if (findError && findError.code !== "PGRST116") {
      // Not found error is ok

      console.error("FAILED: Error finding existing participant:", findError);

      return null;
    }

    if (existingParticipant) {
      console.log("Found existing participant by cedula:", {
        id: existingParticipant.id,

        nombre: existingParticipant.nombre,

        cedula: existingParticipant.cedula,

        nacionalidad: existingParticipant.nacionalidad,

        is_active: existingParticipant.is_active,
      });

      // Update the participant object with authoritative data from database
      // This ensures the snapshot matches the database record
      participant.name = existingParticipant.nombre;

      // If existing participant is inactive, reactivate them

      if (!existingParticipant.is_active) {
        console.log(
          "Reactivating inactive participant:",
          existingParticipant.id,
        );

        const { error: reactivateError } = await supabase

          .from("participantes_certificados")

          .update({ is_active: true })

          .eq("id", existingParticipant.id);

        if (reactivateError) {
          console.error(
            "FAILED: Error reactivating participant:",
            reactivateError,
          );

          return null;
        }

        console.log("SUCCESS: Reactivated participant");
      }

      // Convert old format to new format if needed

      if (
        existingParticipant.nacionalidad === "V-" ||
        existingParticipant.nacionalidad === "E-"
      ) {
        const newNacionalidad =
          existingParticipant.nacionalidad === "V-"
            ? "venezolano"
            : "extranjero";

        console.log(
          "Converting old nacionalidad format:",
          existingParticipant.nacionalidad,
          "->",
          newNacionalidad,
        );

        // Update the database record to use new format

        const { error: updateError } = await supabase

          .from("participantes_certificados")

          .update({ nacionalidad: newNacionalidad })

          .eq("id", existingParticipant.id);

        if (updateError) {
          console.warn(
            "Failed to update participant nacionalidad format:",
            updateError,
          );
        } else {
          console.log(
            "Successfully updated participant nacionalidad format in database",
          );
        }

        // Update the participant object to use the new format for snapshot generation
        participant.nationality = (
          existingParticipant.nacionalidad === "V-" ||
          existingParticipant.nacionalidad === "E-"
            ? existingParticipant.nacionalidad === "V-"
              ? "venezolano"
              : "extranjero"
            : existingParticipant.nacionalidad || "venezolano"
        ) as "venezolano" | "extranjero";

        console.log("Updated participant object for snapshot:", {
          nationality: participant.nationality,
        });

        // Return the ID with updated format for this certificate

        return existingParticipant.id;
      }

      return existingParticipant.id;
    }

    // Normalize nationality to 'venezolano' or 'extranjero'
    const normalizedNationality =
      participant.nationality === "extranjero" ? "extranjero" : "venezolano";

    // Create new participant
    console.log(
      "Creating new participant with nationality:",
      normalizedNationality,
    );
    console.log("Participant data to insert:", {
      nombre: participant.name,
      cedula: participant.id_number,
      nacionalidad: normalizedNationality,
      is_active: true,
    });

    const { data: newParticipant, error: insertError } = await supabase
      .from("participantes_certificados")
      .insert({
        nombre: participant.name,
        cedula: participant.id_number,
        nacionalidad: normalizedNationality,
        is_active: true, // Ensure new participants are active
      })
      .select("id")
      .single();

    console.log("Database insert result:", {
      success: !insertError,

      data: newParticipant,

      error: insertError,
    });

    if (insertError) {
      console.error("FAILED: Error creating new participant:", insertError);

      console.error(
        "Insert error details:",
        JSON.stringify(insertError, null, 2),
      );

      console.error("Supabase error code:", insertError.code);

      console.error("Supabase error message:", insertError.message);

      console.error("Supabase error details:", insertError.details);

      // Check for specific constraint violations

      if (insertError.code === "23505") {
        console.error(
          "DUPLICATE CEDULA DETECTED: Participant with this cedula already exists",
        );

        console.error("Existing participant data being used instead");

        // Try to fetch the existing participant and return their ID

        const { data: existingDupParticipant } = await supabase

          .from("participantes_certificados")

          .select("id, nombre, cedula, nacionalidad, is_active")

          .eq("cedula", participant.id_number)

          .single();

        if (existingDupParticipant) {
          console.log(
            "Returning existing participant ID instead:",
            existingDupParticipant.id,
          );

          return existingDupParticipant.id;
        }
      }

      return null;
    }

    console.log("SUCCESS: Created new participant:", newParticipant?.id);

    console.log("=== PARTICIPANT CREATION COMPLETE ===");

    return newParticipant?.id || null;
  } catch (error) {
    console.error("FAILED: Exception in createOrUpdateParticipant:", error);

    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );

    return null;
  }
}

/**

 * Generate content snapshot for certificate

 */

function generateContentSnapshot(
  updatedCertificateData: CertificateGeneration,

  participant: CertificateParticipant,

  participantId: number,
  batchEmissionDate?: string,
): string {
  // Get the actual participant data from database for snapshot

  let actualParticipantData = participant;

  // Note: This function doesn't have access to existingParticipant data,

  // so we'll handle the conversion in the calling function

  const snapshot = {
    // Certificate record fields from certificados table

    certificado: {
      id_participante: participantId, // Use actual participant ID from database

      id_empresa: updatedCertificateData.osi_data?.empresa_id,

      id_curso: updatedCertificateData.course_topic_data?.cursos_id ?? null, // FK → cursos

      fecha_emision:
        batchEmissionDate || new Date().toLocaleDateString("en-CA"), // Use constant date if provided

      fecha_vencimiento: updatedCertificateData.fecha_vencimiento,

      nro_osi: updatedCertificateData.osi_data?.nro_osi,

      id_estado: updatedCertificateData.id_estado,

      id_facilitador: updatedCertificateData.facilitator_id,

      id_plantilla_certificado: updatedCertificateData.id_plantilla_certificado,

      calificacion: participant.score || 0,

      is_active: true, // Default value

      nro_libro: 1, // Placeholder - will be updated after database insert

      nro_hoja: 1, // Placeholder - will be updated after database insert

      nro_linea: 1, // Placeholder - will be updated after database insert

      nro_control: 1, // Placeholder - will be updated after database insert
    },

    // Participant information with proper cédula details

    participante: {
      id: participantId, // Include database participant ID

      name: participant.name,

      cedula: participant.id_number, // Store cédula properly

      nacionalidad: participant.nationality || "venezolano",

      score: participant.score,

      cedula_completa: `${participant.nationality === "extranjero" ? "E" : "V"}-${participant.id_number}`, // Full cédula format with proper prefix
    },

    // Certificate details

    certificado_detalles: {
      title: updatedCertificateData.certificate_title,

      subtitle: updatedCertificateData.certificate_subtitle,

      course_content: updatedCertificateData.course_content,

      date: updatedCertificateData.date,

      location: updatedCertificateData.location,

      horas_estimadas: updatedCertificateData.horas_estimadas,

      passing_grade: updatedCertificateData.passing_grade,
    },

    // OSI information

    osi: {
      nro_osi: updatedCertificateData.osi_data?.nro_osi,

      cliente_nombre_empresa:
        updatedCertificateData.osi_data?.cliente_nombre_empresa,

      tema: updatedCertificateData.osi_data?.tema,

      detalle_capacitacion:
        updatedCertificateData.osi_data?.detalle_capacitacion,

      empresa_id: updatedCertificateData.osi_data?.empresa_id,

      direccion_ejecucion: updatedCertificateData.osi_data?.direccion_ejecucion,
    },

    // Course information

    curso: {
      name: updatedCertificateData.course_topic_data?.name,

      id: updatedCertificateData.course_topic_data?.id,

      contenido: updatedCertificateData.course_topic_data?.contenido_curso,

      nota_aprobatoria:
        updatedCertificateData.course_topic_data?.nota_aprobatoria,

      emite_carnet: updatedCertificateData.course_topic_data?.emite_carnet,
    },

    // Template and signatures

    plantilla: {
      id_plantilla_certificado: updatedCertificateData.id_plantilla_certificado,
    },

    firmas: {
      facilitator_id: updatedCertificateData.facilitator_id,

      facilitator_data: updatedCertificateData.facilitator_data,

      sha_signature_id: updatedCertificateData.sha_signature_id,
    },
  };

  return JSON.stringify(snapshot, null, 2);
}

/**

 * Generate content snapshot for certificate with actual control numbers

 */

function generateContentSnapshotWithControlNumbers(
  certificateData: CertificateGeneration,

  participant: CertificateParticipant,

  participantId: number,

  nro_libro: number,

  nro_hoja: number,

  nro_linea: number,

  nro_control: number,
  batchEmissionDate?: string,
): string {
  const snapshot = {
    // Certificate record fields from certificados table

    certificado: {
      id_participante: participantId, // Use actual participant ID from database

      id_empresa: certificateData.osi_data?.empresa_id,

      id_curso: certificateData.course_topic_data?.cursos_id ?? null, // FK → cursos

      fecha_emision:
        batchEmissionDate || new Date().toLocaleDateString("en-CA"), // Use constant date if provided

      fecha_vencimiento: certificateData.fecha_vencimiento,

      nro_osi: certificateData.osi_data?.nro_osi,

      id_estado: certificateData.id_estado,

      id_facilitador: certificateData.facilitator_id,

      id_plantilla_certificado: certificateData.id_plantilla_certificado,

      calificacion: participant.score || 0,

      is_active: true, // Default value

      nro_libro: nro_libro, // Actual value from database

      nro_hoja: nro_hoja, // Actual value from database

      nro_linea: nro_linea, // Actual value from database

      nro_control: nro_control, // Actual value from database
    },

    // Participant information with proper cédula details

    participante: {
      id: participantId, // Include database participant ID

      name: participant.name,

      cedula: participant.id_number, // Store cédula properly

      nacionalidad: participant.nationality || "venezolano",

      score: participant.score,

      cedula_completa: `${participant.nationality === "extranjero" ? "E" : "V"}-${participant.id_number}`, // Full cédula format with proper prefix
    },

    // Certificate details

    certificado_detalles: {
      title: certificateData.certificate_title,

      subtitle: certificateData.certificate_subtitle,

      course_content: certificateData.course_content,

      date: certificateData.date,

      location: certificateData.location,

      horas_estimadas: certificateData.horas_estimadas,

      passing_grade: certificateData.passing_grade,
    },

    // OSI information (from v_osi_formato_completo)

    osi: {
      id_osi: certificateData.osi_data?.id
        ? parseInt(certificateData.osi_data.id)
        : null, // ejecucion_osi.id integer

      nro_osi: certificateData.osi_data?.nro_osi,

      cliente_nombre_empresa: certificateData.osi_data?.cliente_nombre_empresa,

      tipo_servicio: certificateData.osi_data?.tipo_servicio,

      ejecutivo_negocios: certificateData.osi_data?.ejecutivo_negocios,

      detalle_capacitacion: certificateData.osi_data?.detalle_capacitacion,

      empresa_id: certificateData.osi_data?.empresa_id,

      direccion_ejecucion: certificateData.osi_data?.direccion_ejecucion,

      fecha_ejecucion1: certificateData.osi_data?.fecha_ejecucion1,

      fecha_ejecucion2: certificateData.osi_data?.fecha_ejecucion2,
    },

    // Course information

    curso: {
      name: certificateData.course_topic_data?.name,

      id: certificateData.course_topic_data?.id, // catalogo_servicios.id

      cursos_id: certificateData.course_topic_data?.cursos_id, // cursos.id (FK)

      contenido: certificateData.course_topic_data?.contenido_curso,

      nota_aprobatoria: certificateData.course_topic_data?.nota_aprobatoria,

      emite_carnet: certificateData.course_topic_data?.emite_carnet,
    },

    // Template and signatures

    plantilla: {
      id_plantilla_certificado: certificateData.id_plantilla_certificado,
    },

    firmas: {
      facilitator_id: certificateData.facilitator_id,

      facilitator_data: certificateData.facilitator_data,

      sha_signature_id: certificateData.sha_signature_id,

      sha_signature_data: (certificateData as any).sha_signature_data ?? null, // Full data for PDF recreation
    },

    // Metadata

    metadatos: {
      generated_at: new Date().toISOString(),

      generated_by: "certificate_generation_system",
    },
  };

  return JSON.stringify(snapshot, null, 2);
}

/**

 * Get available certificate templates

 */

export async function getCertificateTemplates(): Promise<
  { id: number; nombre: string }[]
> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase

      .from("plantillas_certificados")

      .select("id, nombre")

      .eq("is_active", true)

      .order("nombre");

    if (error) {
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
}

/**

 * Get certificate by ID for verification

 */

export async function getCertificateById(
  certificateId: number,
): Promise<any | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase

      .from("certificados")

      .select(
        `

        *,

        participantes_certificados (

          id,

          nombre,

          cedula,

          nacionalidad

        ),

        cursos (

          id,

          nombre,

          contenido,

          horas_estimadas,

          nota_aprobatoria,

          emite_carnet

        ),

        empresas (

          id,

          razon_social,

          rif

        )

      `,
      )

      .eq("id", certificateId)

      .eq("is_active", true)

      .single();

    if (error) {
      return null;
    }

    // Parse snapshot_contenido if it exists

    let parsedSnapshot = null;

    if (data.snapshot_contenido) {
      try {
        parsedSnapshot = JSON.parse(data.snapshot_contenido);
      } catch (parseError) {
        console.warn(
          "Failed to parse snapshot content for certificate:",
          certificateId,
        );
      }
    }

    return {
      ...data,

      parsed_snapshot: parsedSnapshot,
    };
  } catch (error) {
    console.error("Error fetching certificate:", error);

    return null;
  }
}

/**

 * Verify certificate by ID using QR service

 */

export async function verifyCertificate(
  certificateId: number,
): Promise<{ isValid: boolean; certificate?: any; error?: string }> {
  try {
    const certificate = await getCertificateById(certificateId);

    if (!certificate) {
      return {
        isValid: false,

        error: "Certificate not found or inactive",
      };
    }

    // Use QR service to create verification data

    const verificationData = QRService.createVerificationData(
      true,
      certificate,
    );

    return {
      isValid: verificationData.isValid,

      certificate: verificationData.certificate,
    };
  } catch (error) {
    return {
      isValid: false,

      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

/**

 * Get default active certificate template (first active template)

 */

export async function getDefaultCertificateTemplate(): Promise<{
  id: number;
  nombre: string;
} | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase

      .from("plantillas_certificados")

      .select("id, nombre")

      .eq("is_active", true)

      .order("created_at", { ascending: true })

      .limit(1)

      .single();

    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

/**

 * Get Venezuelan states for certificate records

 */

export async function getVenezuelanStates(): Promise<
  { id: number; nombre_estado: string }[]
> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase

      .from("cat_estados_venezuela")

      .select("id, nombre_estado")

      .order("nombre_estado");

    if (error) {
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
}

/**

 * Get certificates with comprehensive data for management interface

 */

export async function getCertificatesForManagement(
  filters: CertificateFilters = {},

  page: number = 1,

  limit: number = 50,
): Promise<CertificateSearchResult> {
  try {
    const supabase = await createClient();

    // Use RPC function for efficient server-side search
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "search_certificates",
      {
        p_search_term: filters.searchTerm || null,
        p_company_id: filters.companyId || null,
        p_course_id: filters.courseId || null,
        p_facilitator_id: filters.facilitatorId || null,
        p_state_id: filters.stateId || null,
        p_is_active: filters.isActive !== undefined ? filters.isActive : null,
        p_date_from: filters.dateFrom || null,
        p_date_to: filters.dateTo || null,
        p_page: page,
        p_limit: limit,
      },
    );

    if (rpcError) {
      console.error("Error fetching certificates via RPC:", rpcError);
      console.error("RPC Error details:", JSON.stringify(rpcError, null, 2));
      return {
        certificates: [],
        totalCount: 0,
        metrics: getEmptyMetrics(),
      };
    }

    if (!rpcData || rpcData.length === 0) {
      console.log("No certificates found via RPC");
      return {
        certificates: [],
        totalCount: 0,
        metrics: getEmptyMetrics(),
      };
    }

    // Map RPC results to certificate structure
    const certificates = (rpcData || []).map((cert: any) => ({
      id: cert.id,
      nro_osi: cert.nro_osi,
      fecha_emision: cert.fecha_emision,
      fecha_vencimiento: cert.fecha_vencimiento,
      calificacion: cert.calificacion,
      is_active: cert.is_active,
      created_at: cert.created_at,
      id_participante: cert.participant_id,
      participantes_certificados: [
        {
          id: cert.participant_id,
          nombre: cert.participant_nombre,
          cedula: cert.participant_cedula,
          nacionalidad: cert.participant_nacionalidad,
        },
      ],
      id_curso: cert.course_id,
      cursos: [
        {
          id: cert.course_id,
          nombre: cert.course_nombre,
          contenido: cert.course_contenido,
          horas_estimadas: cert.course_horas_estimadas,
          nota_aprobatoria: cert.course_nota_aprobatoria,
          emite_carnet: cert.course_emite_carnet,
        },
      ],
      id_empresa: cert.company_id,
      empresas: [
        {
          id: cert.company_id,
          razon_social: cert.company_razon_social,
          rif: cert.company_rif,
        },
      ],
      id_facilitador: cert.facilitator_id,
      facilitadores: [
        {
          id: cert.facilitator_id,
          nombre_apellido: cert.facilitador_nombre_apellido,
        },
      ],
      id_estado: cert.state_id,
      cat_estados_venezuela: [
        {
          id: cert.state_id,
          nombre_estado: cert.state_nombre_estado,
        },
      ],
    }));

    const totalCount = rpcData.length > 0 ? rpcData[0].total_count : 0;

    // Calculate metrics (these are global statistics from analytics_metrics view)
    const metrics = await calculateCertificateMetrics(filters);

    return {
      certificates,
      totalCount,
      metrics,
    };
  } catch (error) {
    console.error("Error in getCertificatesForManagement:", error);
    return {
      certificates: [],
      totalCount: 0,
      metrics: getEmptyMetrics(),
    };
  }
}

/**
 * Calculate comprehensive certificate metrics
 */

async function calculateCertificateMetrics(
  filters: CertificateFilters = {},
): Promise<CertificateMetrics> {
  try {
    const supabase = await createClient();

    // Use the analytics_metrics view instead of RPC
    const { data: metricsData, error: viewError } = await supabase
      .from("analytics_metrics")
      .select("*")
      .single();

    if (viewError || !metricsData) {
      console.error("Error fetching analytics_metrics:", viewError);
      return getEmptyMetrics();
    }

    // Map analytics_metrics fields to CertificateMetrics interface
    const metrics = metricsData as any;

    return {
      totalCertificates: metrics.total_certificates || 0,
      activeCertificates: metrics.active_certificates || 0,
      expiredCertificates: metrics.expired_certificates || 0,
      totalCompanies: metrics.unique_companies_with_certificates || 0,
      totalCourses: metrics.unique_courses_with_certificates || 0,
      totalParticipants: metrics.unique_participants_with_certificates || 0,
      averageScore: Math.round((metrics.average_score || 0) * 100) / 100,
      certificatesByCompany: (metrics.top_companies || []).map(
        (company: any) => ({
          companyId: company.company_id,
          companyName: company.company_name,
          count: company.certificate_count,
        }),
      ),
      certificatesByCourse: (metrics.top_courses || []).map((course: any) => ({
        courseId: course.course_id,
        courseName: course.course_name,
        count: course.certificate_count,
      })),
      certificatesByMonth: (metrics.monthly_emissions || []).map(
        (month: any) => ({
          month: month.month,
          count: month.count,
        }),
      ),
    };
  } catch (error) {
    console.error("Error calculating metrics:", error);
    return getEmptyMetrics();
  }
}

/**
 * Get empty metrics structure
 */

function getEmptyMetrics(): CertificateMetrics {
  return {
    totalCertificates: 0,

    activeCertificates: 0,

    expiredCertificates: 0,

    totalCompanies: 0,

    totalCourses: 0,

    totalParticipants: 0,

    averageScore: 0,

    certificatesByCompany: [],

    certificatesByCourse: [],

    certificatesByMonth: [],
  };
}

/**

 * Get companies for filter dropdown

 */

export async function getCompaniesForFilters(): Promise<
  { id: number; razon_social: string }[]
> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase

      .from("empresas")

      .select("id, razon_social")

      .eq("is_active", true)

      .order("razon_social");

    if (error) {
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
}

/**

 * Get courses for filter dropdown

 */

export async function getCoursesForFilters(): Promise<
  { id: number; nombre: string }[]
> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase

      .from("cursos")

      .select("id, nombre")

      .eq("is_active", true)

      .order("nombre");

    if (error) {
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
}

/**

 * Get facilitators for filter dropdown

 */

export async function getFacilitatorsForFilters(): Promise<
  { id: number; nombre_apellido: string }[]
> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase

      .from("facilitadores")

      .select("id, nombre_apellido")

      .eq("is_active", true)

      .order("nombre_apellido");
    if (error) {
      return [];
    }
    return data || [];
  } catch (error) {
    return [];
  }
}
