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

    // Fetch facilitator and SHA signature in parallel — they are independent

    let updatedCertificateData = { ...certificateData };

    const fetchTasks: Promise<void>[] = [];

    // ALWAYS fetch facilitator data if facilitator_id is provided
    if (certificateData.facilitator_id) {
      fetchTasks.push(
        (async () => {
          const facilitatorData = await getFacilitatorData(
            certificateData.facilitator_id!,
          );

          if (facilitatorData) {
            updatedCertificateData.facilitator_data = facilitatorData;
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
          }
        })().catch((e) => {
          console.warn("Failed to fetch SHA signature data:", e);
        }),
      );
    }

    if (fetchTasks.length > 0) await Promise.all(fetchTasks);

    const afterFetchTime = Date.now();

    console.log("After fetching facilitator and SHA data:");
    console.log(
      "facilitator_data present?",
      !!updatedCertificateData.facilitator_data,
    );
    console.log(
      "facilitator_data value:",
      JSON.stringify(updatedCertificateData.facilitator_data, null, 2),
    );
    console.log(
      "sha_signature_data present?",
      !!updatedCertificateData.sha_signature_data,
    );

    const supabase = await createClient();

    if (!certificateData.osi_data || !certificateData.course_topic_data) {
      return {
        success: false,
        message: "OSI data and course topic data are required",
      };
    }

    const emissionDate =
      certificateData.date || new Date().toLocaleDateString("en-CA");
    const batchEmissionDate = emissionDate; // Constant for the whole batch

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
      // First, check if there's an active control sequence configuration
      const { data: configData, error: configError } = await supabase
        .from("control_sequences")
        .select("*")
        .eq("is_active", true)
        .single();

      if (configData && !configError) {
        // Check for the absolute LAST certificate created
        const { data: lastCert, error: lastCertError } = await supabase
          .from("certificados")
          .select("nro_libro, nro_hoja, nro_linea, nro_control")
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastCertError || !lastCert) {
          // No certificates exist yet, use the initial configuration values
          nextControlNumbers = {
            nro_libro: configData.nro_libro,
            nro_hoja: configData.nro_hoja,
            nro_linea: configData.nro_linea,
            nro_control: configData.nro_control,
          };
          console.log(
            "Using initial configuration (First Batch):",
            nextControlNumbers,
          );
        } else {
          // Certificates exist! Calculate the NEXT numbers based on the last one
          // using your 10 lines/sheet and 100 sheets/book rule
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
          console.log(
            "Calculated next sequence from last certificate:",
            nextControlNumbers,
          );
        }
      } else {
        // Fallback to RPC only if no sequence configuration exists
        const { data: controlNumbersData, error: rpcError } =
          await supabase.rpc("get_next_control_numbers", {
            batch_size: participants.length,
          });

        if (!rpcError && controlNumbersData) {
          nextControlNumbers = controlNumbersData as any;
        }
      }
    } catch (error) {
      console.warn(
        "Failed to determine next control numbers, using defaults:",
        error,
      );
    }
    const afterControlNumbersTime = Date.now();

    const beforeParticipantsLoopTime = Date.now();
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];

      const participantId = await createOrUpdateParticipant(participant);

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

        id_curso: updatedCertificateData.course_topic_data?.id
          ? parseInt(updatedCertificateData.course_topic_data.id)
          : null, // FK → catalogo_servicios

        fecha_emision: batchEmissionDate,

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

          // Update snapshot with QR code for self-contained reproducibility
          let updatedSnapshotWithQR = updatedSnapshot;
          try {
            const snapshotObj = JSON.parse(updatedSnapshot);
            snapshotObj.qr_code = qrCodeDataUrl;
            snapshotObj.qr_data = qrResult.data;
            updatedSnapshotWithQR = JSON.stringify(snapshotObj, null, 2);
          } catch (parseError) {
            console.warn("Failed to update snapshot with QR code:", parseError);
          }

          // Update certificate with QR code and updated snapshot
          const { error: updateError } = await supabase
            .from("certificados")
            .update({
              qr_code: qrCodeDataUrl || null,
              snapshot_contenido: updatedSnapshotWithQR,
            })
            .eq("id", certificateInsert.id);

          if (updateError) {
            console.warn(
              "WARNING: Failed to update certificate with QR code:",
              updateError,
            );
          } else {
            console.log(
              "SUCCESS: Certificate updated with QR code and snapshot",
            );
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

    // Create carnets if the course requires them
    if (
      updatedCertificateData.course_topic_data?.emite_carnet &&
      certificateIds.length > 0
    ) {
      try {
        const { saveCarnetsToDatabase } = await import("./carnets");

        // Build carnet data for each certificate
        const carnetDataList = participants.map((participant, index) => ({
          id_certificado: certificateIds[index],
          id_participante: participantIds[index],
          id_empresa: updatedCertificateData.osi_data?.empresa_id || null,
          id_curso: updatedCertificateData.course_topic_data?.id
            ? parseInt(updatedCertificateData.course_topic_data.id)
            : null,
          id_osi: updatedCertificateData.osi_data?.id
            ? parseInt(updatedCertificateData.osi_data.id)
            : null,
          titulo_curso: updatedCertificateData.course_topic_data?.nombre || "",
          fecha_emision: batchEmissionDate,
          fecha_vencimiento: updatedCertificateData.fecha_vencimiento || null,
          nombre_participante: participant.name,
          cedula_participante: participant.idNumber,
          empresa_participante: null,
          nro_control: certificateNumbers[index]?.nro_control || 0,
        }));

        const carnetResult = await saveCarnetsToDatabase(
          carnetDataList,
          certificateIds,
        );

        if (carnetResult.success) {
          console.log(
            `✅ Successfully created ${carnetResult.carnetIds?.length || 0} carnets`,
          );
        } else {
          console.warn("⚠️ Failed to create carnets:", carnetResult.message);
        }
      } catch (carnetError) {
        console.warn("⚠️ Error creating carnets:", carnetError);
      }
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

    const normalizedName = participant.name.trim().toUpperCase();
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

      id_curso: updatedCertificateData.course_topic_data?.id
        ? parseInt(updatedCertificateData.course_topic_data.id)
        : null, // FK → catalogo_servicios

      fecha_emision:
        batchEmissionDate ||
        updatedCertificateData.date ||
        new Date().toLocaleDateString("en-CA"), // Use provided date

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

      name: participant.name.toUpperCase(),

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

      id_ciudad: updatedCertificateData.osi_data?.id_ciudad || null,

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

      id_curso: certificateData.course_topic_data?.id
        ? parseInt(certificateData.course_topic_data.id)
        : null, // FK → catalogo_servicios

      fecha_emision:
        batchEmissionDate ||
        certificateData.date ||
        new Date().toLocaleDateString("en-CA"), // Use provided date

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

      name: participant.name.toUpperCase(),

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

      id_ciudad: certificateData.osi_data?.id_ciudad || null,

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
 * Get previous participants for an OSI and course
 */
export async function getPreviousParticipantsByOSIAction(
  nro_osi: number,
  courseId: number,
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("certificados")
      .select(
        `
        calificacion,
        nro_control,
        participantes_certificados!inner (
          nombre,
          cedula,
          nacionalidad
        )
      `,
      )
      .eq("nro_osi", nro_osi)
      .eq("id_curso", courseId)
      .eq("is_active", true)
      .order("nro_control", { ascending: true });

    if (error) {
      console.error("Error fetching previous participants:", error);
      return { success: false, message: error.message };
    }

    const participants = (data || []).map((cert: any) => ({
      participant_name: cert.participantes_certificados?.nombre || "",
      participant_id_number: cert.participantes_certificados?.cedula || "",
      participant_id_type:
        cert.participantes_certificados?.nacionalidad === "extranjero" ||
        cert.participantes_certificados?.cedula?.startsWith("E")
          ? "E-"
          : "V-",
      participant_nationality: cert.participantes_certificados?.nacionalidad,
      score: cert.calificacion || 0,
      control_number: cert.nro_control?.toString() || "",
    }));

    return { success: true, data: participants };
  } catch (error) {
    console.error(
      "Unexpected error in getPreviousParticipantsByOSIAction:",
      error,
    );
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if OSI has any certificates (for immediate badge display in manual mode)
 */
export async function checkOSIHasAnyCertificatesAction(osiNumber: string) {
  try {
    const supabase = await createClient();
    const nroOsiNum = parseInt(osiNumber.replace(/[^\d]/g, ""));

    if (isNaN(nroOsiNum)) {
      return {
        success: false,
        has_certificates: false,
        count: 0,
      };
    }

    const { data, error } = await supabase
      .from("certificados")
      .select("id")
      .eq("nro_osi", nroOsiNum)
      .eq("is_active", true);

    if (error) {
      console.error("Error checking OSI certificates:", error);
      return {
        success: false,
        has_certificates: false,
        count: 0,
      };
    }

    return {
      success: true,
      has_certificates: data && data.length > 0,
      count: data?.length || 0,
    };
  } catch (error) {
    console.error(
      "Unexpected error in checkOSIHasAnyCertificatesAction:",
      error,
    );
    return {
      success: false,
      has_certificates: false,
      count: 0,
    };
  }
}

/**
 * Check if OSI has certificates for a specific course (for refined warning in manual mode)
 */
export async function checkOSIHasCertificatesForCourseAction(
  osiNumber: string,
  courseId: number,
) {
  try {
    const supabase = await createClient();
    const nroOsiNum = parseInt(osiNumber.replace(/[^\d]/g, ""));

    if (isNaN(nroOsiNum) || isNaN(courseId)) {
      return {
        success: false,
        has_certificates: false,
        count: 0,
      };
    }

    const { data, error } = await supabase
      .from("certificados")
      .select("id")
      .eq("nro_osi", nroOsiNum)
      .eq("id_curso", courseId)
      .eq("is_active", true);

    if (error) {
      console.error("Error checking OSI course certificates:", error);
      return {
        success: false,
        has_certificates: false,
        count: 0,
      };
    }

    return {
      success: true,
      has_certificates: data && data.length > 0,
      count: data?.length || 0,
    };
  } catch (error) {
    console.error(
      "Unexpected error in checkOSIHasCertificatesForCourseAction:",
      error,
    );
    return {
      success: false,
      has_certificates: false,
      count: 0,
    };
  }
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

        catalogo_servicios (

          id,

          nombre,

          contenido_curso,

          carga_horaria_std,

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
        catalogo_servicios!inner(*),
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
        nombre: participant.name.trim().toUpperCase(),
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
        id_curso: certificateData.course_topic_data?.id
          ? parseInt(certificateData.course_topic_data.id)
          : null,
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

    // 5b. Update carnet if course emits it
    if (certificateData.course_topic_data?.emite_carnet) {
      try {
        const { updateCarnetAction } = await import("./carnets");
        await updateCarnetAction(certificateId, {
          id_certificado: certificateId,
          id_participante: existingCert.id_participante,
          id_empresa: certificateData.osi_data?.empresa_id || null,
          id_curso: certificateData.course_topic_data?.id
            ? parseInt(certificateData.course_topic_data.id)
            : null,
          id_osi: certificateData.osi_data?.id
            ? parseInt(certificateData.osi_data.id)
            : null,
          titulo_curso: certificateData.certificate_title || "",
          fecha_emision: certificateData.date || "",
          fecha_vencimiento: certificateData.fecha_vencimiento || null,
          nombre_participante: participant.name.toUpperCase(),
          cedula_participante: participant.idNumber,
          empresa_participante: participant.company || null,
          nro_control: existingCert.nro_control,
          id_plantilla_carnet: certificateData.id_plantilla_carnet,
        });
      } catch (carnetErr) {
        console.warn(
          "Non-fatal: Failed to update carnet during certificate edit",
          carnetErr,
        );
      }
    }

    // 6. Regenerate QR code if needed
    try {
      const qrResult = await QRService.generateCertificateQR(certificateId, {
        nro_libro: existingCert.nro_libro,
        nro_hoja: existingCert.nro_hoja,
        nro_linea: existingCert.nro_linea,
        nro_control: existingCert.nro_control,
      });

      // Update snapshot with QR code for self-contained reproducibility
      let snapshotWithQR = finalSnapshot;
      try {
        const snapshotObj = JSON.parse(finalSnapshot);
        snapshotObj.qr_code = qrResult.dataUrl;
        snapshotObj.qr_data = qrResult.data;
        snapshotWithQR = JSON.stringify(snapshotObj, null, 2);
      } catch (parseError) {
        console.warn(
          "Failed to update snapshot with QR code during edit:",
          parseError,
        );
      }

      await supabase
        .from("certificados")
        .update({
          qr_code: qrResult.dataUrl || null,
          snapshot_contenido: snapshotWithQR,
        })
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

    // Calculate range for pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Use direct query instead of RPC to ensure we use catalogo_servicios and get accurate data
    let query = supabase.from("certificados").select(
      `
        *,
        participantes_certificados!inner (
          id,
          nombre,
          cedula,
          nacionalidad
        ),
        catalogo_servicios!inner (
          id,
          nombre,
          contenido_curso,
          carga_horaria_std,
          nota_aprobatoria,
          emite_carnet
        ),
        empresas!inner (
          id,
          razon_social,
          rif
        ),
        facilitadores (
          id,
          nombre_apellido
        ),
        cat_estados_venezuela (
          id,
          nombre_estado
        )
      `,
      { count: "exact" },
    );

    // Apply filters
    if (filters.companyId) {
      const companyId = Number(filters.companyId);
      if (!isNaN(companyId)) {
        // Use joined table filter for better reliability with !inner joins
        query = query.eq("empresas.id", companyId);
        console.log(`[FILTER DEBUG] Applied companyId filter: ${companyId}`);
      }
    }
    if (filters.courseId) {
      const courseId = Number(filters.courseId);
      if (!isNaN(courseId)) {
        // Use joined table filter for better reliability with !inner joins
        query = query.eq("catalogo_servicios.id", courseId);
        console.log(`[FILTER DEBUG] Applied courseId filter: ${courseId}`);
      }
    }
    if (filters.facilitatorId) {
      query = query.eq("id_facilitador", filters.facilitatorId);
      console.log(
        `[FILTER DEBUG] Applied facilitatorId filter: ${filters.facilitatorId}`,
      );
    }
    if (filters.stateId) {
      query = query.eq("id_estado", filters.stateId);
      console.log(`[FILTER DEBUG] Applied stateId filter: ${filters.stateId}`);
    }
    if (filters.isActive !== undefined) {
      query = query.eq("is_active", filters.isActive);
      console.log(
        `[FILTER DEBUG] Applied isActive filter: ${filters.isActive}`,
      );
    }
    if (filters.dateFrom) {
      query = query.gte("fecha_emision", filters.dateFrom);
      console.log(
        `[FILTER DEBUG] Applied dateFrom filter: ${filters.dateFrom}`,
      );
    }
    if (filters.dateTo) {
      query = query.lte("fecha_emision", filters.dateTo);
      console.log(`[FILTER DEBUG] Applied dateTo filter: ${filters.dateTo}`);
    }

    // Apply search term across joined tables if present
    if (filters.searchTerm?.trim()) {
      const term = `%${filters.searchTerm.trim()}%`;
      // Use explicit table names for joins
      query = query.or(
        `participantes_certificados.nombre.ilike.${term},participantes_certificados.cedula.ilike.${term},catalogo_servicios.nombre.ilike.${term},empresas.razon_social.ilike.${term}`,
      );
      console.log(
        `[FILTER DEBUG] Applied search term filter: ${filters.searchTerm}`,
      );
    }

    console.log("[FILTER DEBUG] Final filters object:", filters);

    // Execution of query with pagination and ordering
    const { data, count, error } = await query
      .order("fecha_emision", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching certificates:", error);
      return {
        certificates: [],
        totalCount: 0,
        metrics: getEmptyMetrics(),
      };
    }

    // Map results to standard structure used by the component
    const certificates = data || [];

    const totalCount = count || 0;

    // Debug: Log returned certificates
    if (certificates.length > 0) {
      console.log(
        `[FILTER DEBUG] Returned ${certificates.length} certificates with filters:`,
        filters,
      );
      console.log("[FILTER DEBUG] First 3 returned certificates:");
      certificates.slice(0, 3).forEach((cert: any) => {
        const course = Array.isArray(cert.catalogo_servicios)
          ? cert.catalogo_servicios[0]
          : cert.catalogo_servicios;
        console.log(
          `  - Cert ${cert.id}: id_curso=${cert.id_curso}, course name=${course?.nombre}`,
        );
      });
    }

    // Calculate metrics
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
    // We use !inner joins to ensure we only get certificates with valid references and to allow filtering
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
        catalogo_servicios!inner(nombre),
        empresas!inner(razon_social)
      `,
      { count: "exact" },
    );

    // Apply the same filters as search_certificates RPC
    if (filters.companyId) {
      const companyId = Number(filters.companyId);
      if (!isNaN(companyId)) {
        query = query.eq("empresas.id", companyId);
      }
    }
    if (filters.courseId) {
      const courseId = Number(filters.courseId);
      if (!isNaN(courseId)) {
        query = query.eq("catalogo_servicios.id", courseId);
      }
    }
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
      // Use explicit table names for joins and cast nro_osi to text if it's numeric
      query = query.or(
        `participantes_certificados.nombre.ilike.${term},participantes_certificados.cedula.ilike.${term},catalogo_servicios.nombre.ilike.${term},empresas.razon_social.ilike.${term}`,
      );
    }

    // Fetch the live data for aggregation
    // We order by emission date descending to get the most recent ones for the metrics sample
    // Safe limit for management dashboard - increased to 5000 for better accuracy
    const {
      data: filteredData,
      count: totalCount,
      error: liveError,
    } = await query.order("fecha_emision", { ascending: false }).limit(5000);

    if (liveError) {
      console.error("Error fetching live metrics:", liveError);
      return getEmptyMetrics();
    }

    // Debug: Log first few certificates to inspect data structure
    if (filteredData && filteredData.length > 0) {
      console.log("[METRICS DEBUG] First 3 certificates structure:");
      filteredData.slice(0, 3).forEach((cert: any, idx: number) => {
        console.log(`Certificate ${idx}:`, {
          id: cert.id,
          id_curso: cert.id_curso,
          catalogo_servicios: cert.catalogo_servicios,
          isArray: Array.isArray(cert.catalogo_servicios),
        });
      });
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
        // Handle both object and array response from Supabase join
        const companyData = Array.isArray(cert.empresas)
          ? cert.empresas[0]
          : cert.empresas;
        if (companyData?.razon_social) {
          if (!companyStats[cert.id_empresa]) {
            companyStats[cert.id_empresa] = {
              name: companyData.razon_social,
              count: 0,
            };
          }
          companyStats[cert.id_empresa].count++;
        }
      }

      if (cert.id_curso) {
        uniqueCourses.add(cert.id_curso);
        // Handle both object and array response from Supabase join
        const courseData = Array.isArray(cert.catalogo_servicios)
          ? cert.catalogo_servicios[0]
          : cert.catalogo_servicios;
        if (courseData?.nombre) {
          if (!courseStats[cert.id_curso]) {
            courseStats[cert.id_curso] = {
              name: courseData.nombre,
              count: 0,
            };
          }
          courseStats[cert.id_curso].count++;
        } else {
          // Debug: log when course data is missing
          console.warn(
            `[METRICS DEBUG] Certificate ${cert.id} has id_curso=${cert.id_curso} but courseData is missing:`,
            {
              courseData,
              catalogo_servicios: cert.catalogo_servicios,
              isArray: Array.isArray(cert.catalogo_servicios),
            },
          );
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

    // Debug: Log final course stats
    console.log(
      "[METRICS DEBUG] Final certificatesByCourse:",
      certificatesByCourse,
    );
    console.log("[METRICS DEBUG] All courseStats:", courseStats);

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

    // Only return companies that have actual certificates
    const { data, error } = await supabase
      .from("certificados")
      .select("empresas!inner(id, razon_social)", { count: "exact" })
      .order("empresas(razon_social)");

    if (error) {
      return [];
    }

    // Extract unique companies from certificates
    const uniqueCompanies = new Map<number, string>();
    data?.forEach((cert: any) => {
      const company = Array.isArray(cert.empresas)
        ? cert.empresas[0]
        : cert.empresas;
      if (company?.id && company?.razon_social) {
        uniqueCompanies.set(company.id, company.razon_social);
      }
    });

    // Convert to array and sort by name
    return Array.from(uniqueCompanies, ([id, razon_social]) => ({
      id,
      razon_social,
    })).sort((a, b) => a.razon_social.localeCompare(b.razon_social));
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

    // Only return courses that have actual certificates
    const { data, error } = await supabase
      .from("certificados")
      .select("id_curso, catalogo_servicios!inner(id, nombre)", {
        count: "exact",
      })
      .order("catalogo_servicios(nombre)");

    if (error) {
      console.error("[COURSES FILTER DEBUG] Error fetching courses:", error);
      return [];
    }

    // Extract unique courses from certificates
    const uniqueCourses = new Map<number, string>();
    data?.forEach((cert: any) => {
      const course = Array.isArray(cert.catalogo_servicios)
        ? cert.catalogo_servicios[0]
        : cert.catalogo_servicios;
      if (course?.id && course?.nombre) {
        uniqueCourses.set(course.id, course.nombre);
      }
    });

    const result = Array.from(uniqueCourses, ([id, nombre]) => ({
      id,
      nombre,
    })).sort((a, b) => a.nombre.localeCompare(b.nombre));

    console.log(
      "[COURSES FILTER DEBUG] Unique courses from certificates:",
      result,
    );
    console.log(
      "[COURSES FILTER DEBUG] Raw data sample (first 5):",
      data?.slice(0, 5),
    );

    return result;
  } catch (error) {
    console.error("[COURSES FILTER DEBUG] Exception:", error);
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
