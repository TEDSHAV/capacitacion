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
    if (!participant.name || !participant.idNumber) {
      console.error("FAILED: Missing required participant fields:", {
        name: participant.name,
        idNumber: participant.idNumber,
        nationality: participant.nationality,
      });
      return null;
    }

    const normalizedName = participant.name.trim().toLowerCase();
    const cleanIdNumber = participant.idNumber.trim();

    // First, try to find existing participant by cedula (primary match) - name can vary slightly

    const { data: existingParticipant, error: findError } = await supabase

      .from("participantes_certificados")

      .select("id, nombre, cedula, nacionalidad, is_active")

      .eq("cedula", cleanIdNumber)

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
      nombre: normalizedName,
      cedula: cleanIdNumber,
      nacionalidad: normalizedNationality,
      is_active: true,
    });

    const { data: newParticipant, error: insertError } = await supabase
      .from("participantes_certificados")
      .insert({
        nombre: normalizedName,
        cedula: cleanIdNumber,
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

          .eq("cedula", cleanIdNumber)

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

      cedula: participant.idNumber, // Store cédula properly

      nacionalidad: participant.nationality || "venezolano",

      score: participant.score,

      cedula_completa: `Cédula: ${participant.nationality === "extranjero" ? "e-" : "v-"}${participant.idNumber}`, // Full cédula format with proper prefix and lowercase label
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

      archivo_plantilla_certificado:
        updatedCertificateData.plantilla_certificado_archivo,

      id_plantilla_curso: updatedCertificateData.course_template_id,
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

      cedula: participant.idNumber, // Store cédula properly

      nacionalidad: participant.nationality || "venezolano",

      score: participant.score,

      cedula_completa: `cedula: ${participant.nationality === "extranjero" ? "e-" : "V-"}${participant.idNumber}`, // Full cédula format with proper prefix and lowercase label
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

      archivo_plantilla_certificado:
        certificateData.plantilla_certificado_archivo,
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
 * Update content snapshot for certificate with actual control numbers
 */
function updateContentSnapshotWithControlNumbers(
  existingSnapshot: string,
  controlNumbers: CertificateWithNumbers,
): string {
  try {
    const snapshot = JSON.parse(existingSnapshot);

    // Update certificate record fields
    if (snapshot.certificado) {
      snapshot.certificado.nro_libro = controlNumbers.nro_libro;
      snapshot.certificado.nro_hoja = controlNumbers.nro_hoja;
      snapshot.certificado.nro_linea = controlNumbers.nro_linea;
      snapshot.certificado.nro_control = controlNumbers.nro_control;
    }

    return JSON.stringify(snapshot);
  } catch (error) {
    console.error("Error updating snapshot with control numbers:", error);
    return existingSnapshot;
  }
}

/**
 * Get certificate by ID for editing
 */
export async function getCertificateForEdit(certificateId: number) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("certificados")
      .select(
        `
        *,
        participantes_certificados!inner(*),
        cursos!inner(*),
        empresas!inner(*)
      `,
      )
      .eq("id", certificateId)
      .single();

    if (error) throw error;

    // Parse snapshot to get original generation data if available
    let snapshotData = null;
    if (data.snapshot_contenido) {
      try {
        snapshotData = JSON.parse(data.snapshot_contenido);
      } catch (e) {
        console.warn("Failed to parse snapshot for edit:", certificateId);
      }
    }

    return {
      certificate: data,
      snapshot: snapshotData,
    };
  } catch (error) {
    console.error("Error fetching certificate for edit:", error);
    return null;
  }
}

/**
 * Update an existing certificate record
 */
export async function updateCertificateAction(
  certificateId: number,
  certificateData: CertificateGeneration,
  participant: CertificateParticipant,
) {
  try {
    const supabase = await createClient();

    // 1. Get existing certificate to keep control numbers
    const { data: existingCert, error: getError } = await supabase
      .from("certificados")
      .select("nro_libro, nro_hoja, nro_linea, nro_control, id_participante")
      .eq("id", certificateId)
      .single();

    if (getError || !existingCert) {
      throw new Error("Certificate not found");
    }

    // 2. Update participant details if they changed
    const { error: participantUpdateError } = await supabase
      .from("participantes_certificados")
      .update({
        nombre: participant.name.trim().toLowerCase(),
        cedula: participant.idNumber.trim(),
        nacionalidad: participant.nationality || "venezolano",
      })
      .eq("id", existingCert.id_participante);

    if (participantUpdateError) {
      console.warn(
        "Non-fatal: Failed to update participant details:",
        participantUpdateError,
      );
    }

    // 3. Generate updated snapshot
    // We use the existing participant ID
    const updatedSnapshot = generateContentSnapshot(
      certificateData,
      participant,
      existingCert.id_participante,
    );

    // 4. Update the snapshot with the actual control numbers (which we want to preserve)
    const finalSnapshot = updateContentSnapshotWithControlNumbers(
      updatedSnapshot,
      {
        id: certificateId,
        nro_libro: existingCert.nro_libro,
        nro_hoja: existingCert.nro_hoja,
        nro_linea: existingCert.nro_linea,
        nro_control: existingCert.nro_control,
      },
    );

    // 5. Update the record
    const { error: updateError } = await supabase
      .from("certificados")
      .update({
        id_empresa: certificateData.osi_data?.empresa_id || null,
        id_curso: certificateData.course_topic_data?.cursos_id || null,
        fecha_emision: certificateData.date,
        fecha_vencimiento: certificateData.fecha_vencimiento || null,
        nro_osi: certificateData.osi_data?.nro_osi
          ? typeof certificateData.osi_data.nro_osi === "string"
            ? parseInt(
                certificateData.osi_data.nro_osi.replace(/[^\d]/g, ""),
              ) || null
            : certificateData.osi_data.nro_osi
          : null,
        id_facilitador: certificateData.facilitator_id
          ? parseInt(certificateData.facilitator_id)
          : null,
        id_plantilla_certificado:
          certificateData.id_plantilla_certificado || null,
        calificacion: participant.score || 0,
        snapshot_contenido: finalSnapshot,
      })
      .eq("id", certificateId);

    if (updateError) throw updateError;

    // 6. Regenerate QR code if needed
    try {
      const qrResult = await QRService.generateCertificateQR(certificateId, {
        nro_libro: existingCert.nro_libro,
        nro_hoja: existingCert.nro_hoja,
        nro_linea: existingCert.nro_linea,
        nro_control: existingCert.nro_control,
      });

      await supabase
        .from("certificados")
        .update({ qr_code: qrResult.dataUrl || null })
        .eq("id", certificateId);
    } catch (qrErr) {
      console.warn("Non-fatal: Failed to regenerate QR during update", qrErr);
    }

    return { success: true, message: "Certificate updated successfully" };
  } catch (error) {
    console.error("Error updating certificate:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get certificates with comprehensive data for management interface
 */
export async function getCertificatesForManagement(
  filters: CertificateFilters = {},
  page: number = 1,
  limit: number = 50,
) {
  try {
    const supabase = await createClient();

    const rpcParams = {
      p_search_term: filters.searchTerm?.trim() || null,
      p_company_id: filters.companyId || null,
      p_course_id: filters.courseId || null,
      p_facilitator_id: filters.facilitatorId || null,
      p_state_id: filters.stateId || null,
      p_is_active: filters.isActive !== undefined ? filters.isActive : null,
      p_date_from: filters.dateFrom || null,
      p_date_to: filters.dateTo || null,
      p_page: page,
      p_limit: limit,
    };

    // Use RPC function for efficient server-side search
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "search_certificates",
      rpcParams,
    );

    if (rpcError) {
      console.error("Error fetching certificates via RPC:", rpcError);
      return {
        certificates: [],
        totalCount: 0,
        metrics: getEmptyMetrics(),
      };
    }

    if (!rpcData || rpcData.length === 0) {
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
          nombre_apellido: cert.facilitator_nombre_apellido,
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

    // 1. ALWAYS perform a live query for accuracy.
    // We join the tables to allow filtering by search term and to get names for charts.
    let query = supabase.from("certificados").select(
      `
        id, 
        is_active, 
        fecha_emision,
        fecha_vencimiento, 
        calificacion, 
        id_empresa, 
        id_curso, 
        id_participante,
        id_plantilla_carnet,
        participantes_certificados!inner(nombre, cedula),
        cursos!inner(nombre),
        empresas!inner(razon_social)
      `,
      { count: "exact" },
    );

    // Apply the same filters as search_certificates RPC
    if (filters.companyId) query = query.eq("id_empresa", filters.companyId);
    if (filters.courseId) query = query.eq("id_curso", filters.courseId);
    if (filters.facilitatorId)
      query = query.eq("id_facilitador", filters.facilitatorId);
    if (filters.stateId) query = query.eq("id_estado", filters.stateId);

    // Default to only active certificates if not specified,
    // or respect the filter if provided
    if (filters.isActive !== undefined) {
      query = query.eq("is_active", filters.isActive);
    }

    if (filters.dateFrom) query = query.gte("fecha_emision", filters.dateFrom);
    if (filters.dateTo) query = query.lte("fecha_emision", filters.dateTo);

    // Apply search term across joined tables if present
    if (filters.searchTerm?.trim()) {
      const term = `%${filters.searchTerm.trim()}%`;
      query = query.or(
        `nro_osi.ilike.${term},participantes_certificados.nombre.ilike.${term},participantes_certificados.cedula.ilike.${term},cursos.nombre.ilike.${term},empresas.razon_social.ilike.${term}`,
      );
    }

    // Fetch the live data for aggregation
    // We order by emission date descending to get the most recent ones for the metrics sample
    // Safe limit for management dashboard
    const {
      data: filteredData,
      count: totalCount,
      error: liveError,
    } = await query.order("fecha_emision", { ascending: false }).limit(1000);

    if (liveError) {
      console.error("Error fetching live metrics:", liveError);
      return getEmptyMetrics();
    }

    // 2. Aggregate metrics from the actual data returned
    const now = new Date();

    // Get current month and year for robust comparison
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let activeCount = 0;
    let expiredCount = 0;
    let totalScore = 0;
    let certificatesThisMonth = 0;
    let certificatesThisYear = 0;
    const uniqueCompanies = new Set();
    const uniqueCourses = new Set();
    const uniqueParticipants = new Set();

    // Aggregation maps for charts
    const companyStats: Record<number, { name: string; count: number }> = {};
    const courseStats: Record<number, { name: string; count: number }> = {};

    filteredData?.forEach((cert: any) => {
      // Certificate state - if Carnet is available, state refers to the Carnet validity
      if (cert.is_active) activeCount++;

      // Expirados: only when available Carnets (id_plantilla_carnet is present)
      if (cert.id_plantilla_carnet && cert.fecha_vencimiento) {
        const expiryDate = new Date(cert.fecha_vencimiento + "T12:00:00");
        if (expiryDate < now) expiredCount++;
      }

      // Este mes: count certificates emitted in the current month
      if (cert.fecha_emision) {
        // Robust month/year check to avoid timezone shift issues with YYYY-MM-DD strings
        const emissionDate = new Date(cert.fecha_emision + "T12:00:00");
        if (
          emissionDate.getMonth() === currentMonth &&
          emissionDate.getFullYear() === currentYear
        ) {
          certificatesThisMonth++;
        }

        if (emissionDate.getFullYear() === currentYear) {
          certificatesThisYear++;
        }
      }

      totalScore += cert.calificacion || 0;

      if (cert.id_empresa) {
        uniqueCompanies.add(cert.id_empresa);
        if (cert.empresas?.razon_social) {
          if (!companyStats[cert.id_empresa]) {
            companyStats[cert.id_empresa] = {
              name: cert.empresas.razon_social,
              count: 0,
            };
          }
          companyStats[cert.id_empresa].count++;
        }
      }

      if (cert.id_curso) {
        uniqueCourses.add(cert.id_curso);
        if (cert.cursos?.nombre) {
          if (!courseStats[cert.id_curso]) {
            courseStats[cert.id_curso] = { name: cert.cursos.nombre, count: 0 };
          }
          courseStats[cert.id_curso].count++;
        }
      }

      if (cert.id_participante) uniqueParticipants.add(cert.id_participante);
    });

    const averageScore = totalCount ? totalScore / totalCount : 0;

    // Convert stats maps to arrays for the charts
    const certificatesByCompany = Object.entries(companyStats)
      .map(([id, stats]) => ({
        companyId: parseInt(id),
        companyName: stats.name,
        count: stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const certificatesByCourse = Object.entries(courseStats)
      .map(([id, stats]) => ({
        courseId: parseInt(id),
        courseName: stats.name,
        count: stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalCertificates: totalCount || 0,
      activeCertificates: activeCount,
      expiredCertificates: expiredCount,
      certificatesThisMonth,
      certificatesThisYear,
      totalCompanies: uniqueCompanies.size,
      totalCourses: uniqueCourses.size,
      totalParticipants: uniqueParticipants.size,
      averageScore: Math.round(averageScore * 100) / 100,
      certificatesByCompany,
      certificatesByCourse,
      certificatesByMonth: [], // Monthly trend is usually global only
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

    certificatesThisMonth: 0,

    certificatesThisYear: 0,

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
