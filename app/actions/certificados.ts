"use server";

import { cache } from "react";
import { createClient } from "@/utils/supabase/server";

import {
  CertificateGeneration,
  CertificateManagement,
  CertificateParticipant,
  CertificateFilters,
  CertificateSearchResult,
  BatchUpdateData,
  BatchUpdateResult,
} from "@/types";

import { QRService } from "@/lib/qr-service";
import { getFacilitatorData } from "./facilitators";
import { certificateService } from "@/lib/certificate-service";

export interface CertificateRecord {
  id_participante?: number | null;

  id_empresa?: number | null;

  id_curso?: number | null;

  id_ciudad?: number | null;

  id_sede?: number | null;

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

    const updatedCertificateData = { ...certificateData };

    const fetchTasks: Promise<void>[] = [];

    // ALWAYS fetch facilitator data if facilitator_id is provided
    if (certificateData.facilitator_id) {
      fetchTasks.push(
        (async () => {
          const facilitatorData = await getFacilitatorData(
            certificateData.facilitator_id!,
          );

          if (facilitatorData) {
            updatedCertificateData.facilitator_data = facilitatorData as any;
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

        id_ciudad: updatedCertificateData.osi_data?.id_ciudad || null,

        id_sede: updatedCertificateData.osi_data?.id_sede || null,

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

        // Fix snapshot with actual DB-returned control numbers (trigger overwrites app-supplied values)
        let correctedSnapshot = updatedSnapshot;
        try {
          const snapshotObj = JSON.parse(updatedSnapshot);
          snapshotObj.certificado.nro_libro = certificateInsert.nro_libro;
          snapshotObj.certificado.nro_hoja = certificateInsert.nro_hoja;
          snapshotObj.certificado.nro_linea = certificateInsert.nro_linea;
          snapshotObj.certificado.nro_control = certificateInsert.nro_control;
          correctedSnapshot = JSON.stringify(snapshotObj, null, 2);
        } catch (parseError) {
          console.warn("Failed to correct snapshot control numbers:", parseError);
        }

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
          let updatedSnapshotWithQR = correctedSnapshot;
          try {
            const snapshotObj = JSON.parse(correctedSnapshot);
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

          // QR failed — still update snapshot with corrected control numbers
          if (correctedSnapshot !== updatedSnapshot) {
            const { error: snapshotFixError } = await supabase
              .from("certificados")
              .update({ snapshot_contenido: correctedSnapshot })
              .eq("id", certificateInsert.id);
            if (snapshotFixError) {
              console.warn("WARNING: Failed to update snapshot with corrected control numbers:", snapshotFixError);
            }
          }
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

        // Only generate carnets for participants who approved (score >= passing_grade)
        const passingGrade = updatedCertificateData.passing_grade || 14;
        const carnetEligibleIndices = participants
          .map((participant, index) => ({ participant, index }))
          .filter(
            ({ participant }) =>
              participant.score !== null &&
              participant.score !== undefined &&
              participant.score >= passingGrade,
          )
          .map(({ index }) => index);

        const carnetDataList = carnetEligibleIndices.map((index) => ({
          id_certificado: certificateIds[index],
          id_participante: participantIds[index],
          id_empresa: updatedCertificateData.osi_data?.empresa_id || null,
          id_curso: updatedCertificateData.course_topic_data?.id
            ? parseInt(updatedCertificateData.course_topic_data.id)
            : null,
          id_osi: updatedCertificateData.osi_data?.id
            ? parseInt(updatedCertificateData.osi_data.id)
            : null,
          titulo_curso: updatedCertificateData.certificate_title || "",
          subtitulo_curso: updatedCertificateData.certificate_subtitle || null,
          fecha_emision: batchEmissionDate,
          fecha_vencimiento: updatedCertificateData.fecha_vencimiento || null,
          nombre_participante: participants[index].name,
          cedula_participante: participants[index].idNumber,
          empresa_participante: null,
          nro_control: certificateNumbers[index]?.nro_control || 0,
        }));

        const carnetCertificateIds = carnetEligibleIndices.map(
          (i) => certificateIds[i],
        );

        if (carnetDataList.length > 0) {
          const carnetResult = await saveCarnetsToDatabase(
            carnetDataList,
            carnetCertificateIds,
          );

          if (carnetResult.success) {
            console.log(
              `✅ Successfully created ${carnetResult.carnetIds?.length || 0} carnets`,
            );
          } else {
            console.warn("⚠️ Failed to create carnets:", carnetResult.message);
          }
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

  const actualParticipantData = participant;

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

      id_sede: updatedCertificateData.osi_data?.id_sede || null,

      sede: updatedCertificateData.osi_data?.sede || null,

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

      id_sede: certificateData.osi_data?.id_sede || null,

      sede: certificateData.osi_data?.sede || null,

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
 * Get all certificates for an OSI including snapshots
 */
export async function getCertificatesByOSIAction(osiId: string | number) {
  try {
    const supabase = await createClient();

    // Extract numeric OSI ID from either string or number input
    let nro_osi: number | null = null;

    if (typeof osiId === "string") {
      const numericPart = parseInt(osiId.replace(/[^\d]/g, ""));
      if (!isNaN(numericPart)) {
        nro_osi = numericPart;
      }
    } else {
      nro_osi = osiId;
    }

    let query = supabase
      .from("certificados")
      .select(
        `
        *,
        participantes_certificados(*),
        catalogo_servicios(nombre, emite_carnet),
        empresas(razon_social)
      `,
      )
      .eq("is_active", true);

    if (nro_osi !== null && !isNaN(nro_osi)) {
      query = query.eq("nro_osi", nro_osi);
    } else {
      return { success: false, message: "Invalid OSI ID" };
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching certificates by OSI:", error);
      return { success: false, message: error.message };
    }

    return { success: true, certificates: data || [] };
  } catch (err) {
    console.error("Unexpected error in getCertificatesByOSIAction:", err);
    return { success: false, message: "Internal server error" };
  }
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

    let { data, error } = await supabase

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

      .maybeSingle();

    // Fallback: If not found by ID, try searching by nro_control
    if (!data && !error) {
      console.log(
        `Certificate not found by ID ${certificateId}, trying nro_control...`,
      );
      const { data: fallbackData, error: fallbackError } = await supabase
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
        .eq("nro_control", certificateId)
        .eq("is_active", true)
        .maybeSingle();

      if (fallbackData) {
        console.log(`✅ Certificate found by nro_control: ${certificateId}`);
        data = fallbackData;
      }
      if (fallbackError) {
        error = fallbackError;
      }
    }

    if (error || !data) {
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
export const getCertificateForEdit = cache(async (certificateId: number) => {
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
});

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
        id_ciudad: certificateData.osi_data?.id_ciudad || null,
        id_sede: certificateData.osi_data?.id_sede || null,
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
          subtitulo_curso: certificateData.certificate_subtitle || null,
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
 * Lightweight inline update of a certificate's score (calificacion).
 * Updates both the `certificados.calificacion` DB column and the score
 * fields stored inside `snapshot_contenido` JSON (`certificado.calificacion`
 * and `participante.score`). Grading scale is 0-20.
 */
export async function updateCertificateScoreAction(
  certificateId: number,
  newScore: number,
): Promise<{ success: boolean; message: string }> {
  try {
    if (
      !Number.isFinite(newScore) ||
      newScore < 0 ||
      newScore > 20
    ) {
      return {
        success: false,
        message: "La calificación debe estar entre 0 y 20.",
      };
    }

    const supabase = await createClient();

    // 1. Fetch existing snapshot to patch score fields
    const { data: existingCert, error: getError } = await supabase
      .from("certificados")
      .select("snapshot_contenido")
      .eq("id", certificateId)
      .single();

    if (getError || !existingCert) {
      throw new Error("Certificate not found");
    }

    const roundedScore = Math.round(newScore * 10) / 10;

    // 2. Patch snapshot JSON score fields (defensive, like batchUpdateCertificatesAction)
    let finalSnapshot = existingCert.snapshot_contenido;
    if (existingCert.snapshot_contenido) {
      try {
        const snapshotObj = JSON.parse(existingCert.snapshot_contenido);
        if (snapshotObj.certificado) {
          snapshotObj.certificado.calificacion = roundedScore;
        }
        if (snapshotObj.participante) {
          snapshotObj.participante.score = roundedScore;
        }
        finalSnapshot = JSON.stringify(snapshotObj, null, 2);
      } catch (e) {
        console.warn(
          `Failed to patch snapshot score for cert ${certificateId}`,
        );
      }
    }

    // 3. Update the DB record
    const { error: updateError } = await supabase
      .from("certificados")
      .update({
        calificacion: roundedScore,
        ...(finalSnapshot !== existingCert.snapshot_contenido
          ? { snapshot_contenido: finalSnapshot }
          : {}),
      })
      .eq("id", certificateId);

    if (updateError) throw updateError;

    return {
      success: true,
      message: "Calificación actualizada correctamente.",
    };
  } catch (error) {
    console.error("Error in updateCertificateScoreAction:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error desconocido",
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

    // Trimmed SELECT: only columns used by the management table UI.
    // Deliberately excludes the heavy `snapshot_contenido` text blob,
    // `qr_code`, unused FK IDs, and the `cat_estados_venezuela` join
    // (state name is never rendered in the table; the state filter uses
    // the base-table `id_estado` column directly). `snapshot_contenido`
    // is still filterable via `.ilike()` below without being selected.
    let query = supabase.from("certificados").select(
      `
        id,
        calificacion,
        fecha_emision,
        fecha_vencimiento,
        nro_osi,
        is_active,
        motivo_anulacion,
        fecha_anulacion,
        anulado_por,
        participantes_certificados!inner (
          id,
          nombre,
          cedula,
          nacionalidad
        ),
        catalogo_servicios!inner (
          id,
          nombre
        ),
        empresas!inner (
          id,
          razon_social,
          rif
        ),
        facilitadores (
          id,
          nombre_apellido
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
      }
    }
    if (filters.courseId) {
      const courseId = Number(filters.courseId);
      if (!isNaN(courseId)) {
        // Use joined table filter for better reliability with !inner joins
        query = query.eq("catalogo_servicios.id", courseId);
      }
    }
    if (filters.facilitatorId) {
      query = query.eq("id_facilitador", filters.facilitatorId);
    }
    if (filters.stateId) {
      query = query.eq("id_estado", filters.stateId);
    }
    if (filters.isActive !== undefined) {
      query = query.eq("is_active", filters.isActive);
    }
    if (filters.dateFrom) {
      query = query.gte("fecha_emision", filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte("fecha_emision", filters.dateTo);
    }

    // Apply search term if present
    if (filters.searchTerm?.trim()) {
      const term = filters.searchTerm.trim();
      const ilikeTerm = `%${term}%`;

      // certificados.nro_osi stores the raw sequential integer
      // (ejecucion_osi.nro_osi_secuencial), while the OSI number users see
      // and type is a formatted string (e.g. "OSI-2024-001"). Extract the
      // digits from anywhere in the input — same convention already used by
      // getCertificatesByOSIAction/checkOSIHasAnyCertificatesAction — so a
      // search by OSI number matches regardless of formatting.
      //
      // A digit-only term is treated purely as an OSI number lookup (exact
      // match only). We deliberately do NOT OR this with a broad ilike over
      // snapshot_contenido (or with a joined-table condition): that opaque
      // text blob contains the whole certificate's rendered content (dates,
      // control numbers, other cédulas, etc.), so a digit search against it
      // spuriously matched unrelated certificates whose blob just happened
      // to contain that digit sequence somewhere — and combining a
      // base-table condition with a joined-table condition in one `.or()`
      // against an `!inner` join proved unreliable. Keeping this path to an
      // exact nro_osi match only is simple and correct.
      const digitsOnly = term.replace(/[^\d]/g, "");
      if (digitsOnly) {
        const nroOsi = parseInt(digitsOnly, 10);
        query = query.eq("nro_osi", nroOsi);
      } else {
        // Non-numeric term: name/empresa/curso search via the snapshot blob.
        // The column is not in the SELECT list, but it remains filterable.
        query = query.ilike("snapshot_contenido", ilikeTerm);
      }
    }

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
      };
    }

    // Map results to standard structure used by the component.
    // Cast through `unknown` because the trimmed SELECT returns a subset of
    // CertificateManagement fields (the table component accesses the joined
    // fields via optional chaining, so missing columns are safe at runtime).
    const certificates = (data || []) as unknown as CertificateManagement[];

    const totalCount = count || 0;

    return {
      certificates,
      totalCount,
    };
  } catch (error) {
    console.error("Error in getCertificatesForManagement:", error);
    return {
      certificates: [],
      totalCount: 0,
    };
  }
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

/**
 * Get unique OSIs that have active certificates
 */
export async function getOSIsWithCertificatesAction(): Promise<{
  nro_osi: number;
  id_curso: number;
  company_name: string;
  course_name: string;
}[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("certificados")
      .select(`
        nro_osi,
        id_curso,
        empresas(razon_social),
        catalogo_servicios(nombre)
      `)
      .not("nro_osi", "is", null)
      .order('id', { ascending: false })
      .limit(10000); // Further increase limit and order by ID to get recent ones first

    if (error) throw error;

    // Use a Map to keep unique OSI-Course pairs
    const osiMap = new Map<string, { nro_osi: number; id_curso: number; company_name: string; course_name: string }>();
    
    data?.forEach((item: any) => {
      const key = `${item.nro_osi}-${item.id_curso}`;
      if (!osiMap.has(key)) {
        const company = Array.isArray(item.empresas) ? item.empresas[0] : item.empresas;
        const course = Array.isArray(item.catalogo_servicios) ? item.catalogo_servicios[0] : item.catalogo_servicios;

        osiMap.set(key, {
          nro_osi: item.nro_osi,
          id_curso: item.id_curso,
          company_name: company?.razon_social || "S/N",
          course_name: course?.nombre || "S/N"
        });
      }
    });

    return Array.from(osiMap.values()).sort((a, b) => b.nro_osi - a.nro_osi);
  } catch (error) {
    console.error("Error in getOSIsWithCertificatesAction:", error);
    return [];
  }
}

/**
 * Get details for a single certificate from a batch to pre-populate edit form
 */
export async function getBatchCertificateDetailsAction(osiNumber: number, courseId?: number) {
  try {
    const supabase = await createClient();

    // Fetch with joins as fallbacks for the snapshot
    let query = supabase
      .from("certificados")
      .select(`
        snapshot_contenido, 
        fecha_emision, 
        fecha_vencimiento,
        id_facilitador,
        catalogo_servicios(nombre)
      `)
      .eq("nro_osi", osiNumber)
      .eq("is_active", true);

    if (courseId) {
      query = query.eq("id_curso", courseId);
    }

    const { data, error } = await query
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, message: "No se encontró el lote" };

    let snapshotData: any = {};
    if (data.snapshot_contenido) {
      try {
        snapshotData = JSON.parse(data.snapshot_contenido);
      } catch (e) {
        console.warn("Failed to parse snapshot in getBatchCertificateDetailsAction");
      }
    }

    // Try multiple levels of nesting for resilience
    const certificate_title = 
      snapshotData.certificado_detalles?.title || 
      snapshotData.certificate_title || 
      snapshotData.titulo_curso ||
      (Array.isArray(data.catalogo_servicios) ? data.catalogo_servicios[0]?.nombre : (data.catalogo_servicios as any)?.nombre) ||
      "";

    const certificate_subtitle = 
      snapshotData.certificado_detalles?.subtitle || 
      snapshotData.certificate_subtitle || 
      snapshotData.subtitulo_curso ||
      "";

    const location = 
      snapshotData.certificado_detalles?.location || 
      snapshotData.location || 
      "";

    const horas_estimadas = 
      snapshotData.certificado_detalles?.horas_estimadas?.toString() || 
      "";

    const id_facilitador = 
      data.id_facilitador?.toString() || 
      snapshotData.firmas?.facilitator_id?.toString() || 
      "";

    // Helper to ensure date is YYYY-MM-DD without timezone shifts
    const formatDate = (dateInput: any) => {
      if (!dateInput) return "";
      // If it's already YYYY-MM-DD string, return it
      if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return dateInput;
      }
      // Otherwise, parse and format to YYYY-MM-DD in UTC to avoid shifts
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return "";
      // Use UTC methods to get the date parts to prevent local timezone from shifting it back/forward
      // especially when the input is just YYYY-MM-DD (which is treated as midnight UTC)
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      success: true,
      data: {
        certificate_title,
        certificate_subtitle,
        date: formatDate(snapshotData.certificado_detalles?.date || data.fecha_emision),
        fecha_vencimiento: formatDate(snapshotData.fecha_vencimiento || data.fecha_vencimiento),
        location,
        horas_estimadas,
        id_facilitador,
      }
    };
  } catch (error) {
    console.error("Error in getBatchCertificateDetailsAction:", error);
    return { success: false, message: error instanceof Error ? error.message : "Error desconocido" };
  }
}

/**
 * Batch update certificates and carnets for a specific OSI number (and optionally a course)
 */
export async function batchUpdateCertificatesAction(
  osiNumber: number,
  updates: BatchUpdateData,
  courseId?: number
): Promise<BatchUpdateResult> {
  try {
    const supabase = await createClient();

    // 1. Fetch all certificates for this OSI (and course if provided)
    let query = supabase
      .from("certificados")
      .select("*")
      .eq("nro_osi", osiNumber)
      .eq("is_active", true);

    if (courseId) {
      query = query.eq("id_curso", courseId);
    }

    const { data: certificates, error: fetchError } = await query;

    if (fetchError) throw fetchError;
    if (!certificates || certificates.length === 0) {
      return {
        success: false,
        message: `No se encontraron certificados activos para la OSI ${osiNumber}`,
        updatedCount: 0,
      };
    }

    let updatedCount = 0;

    // Pre-fetch facilitator data if facilitator is being updated
    let facilitatorData: any = null;
    if (updates.id_facilitador) {
      facilitatorData = await getFacilitatorData(updates.id_facilitador);
    }

    // 2. Process each certificate
    for (const cert of certificates) {
      try {
        // Prepare DB updates (Only fields that actually exist as columns)
        const dbUpdate: any = {};
        if (updates.date) dbUpdate.fecha_emision = updates.date;
        if (updates.fecha_vencimiento) dbUpdate.fecha_vencimiento = updates.fecha_vencimiento;
        if (updates.id_facilitador) dbUpdate.id_facilitador = parseInt(updates.id_facilitador);

        // Update snapshot (Where all fields are stored)
        let finalSnapshot = cert.snapshot_contenido;
        if (cert.snapshot_contenido) {
          try {
            const snapshotObj = JSON.parse(cert.snapshot_contenido);
            
            // Handle both flat and nested structures for robustness
            if ('certificate_title' in updates) {
              if (snapshotObj.certificado_detalles) snapshotObj.certificado_detalles.title = updates.certificate_title;
              snapshotObj.certificate_title = updates.certificate_title;
            }
            if ('certificate_subtitle' in updates) {
              if (snapshotObj.certificado_detalles) snapshotObj.certificado_detalles.subtitle = updates.certificate_subtitle;
              snapshotObj.certificate_subtitle = updates.certificate_subtitle;
            }
            if ('date' in updates) {
              if (snapshotObj.certificado_detalles) snapshotObj.certificado_detalles.date = updates.date;
              if (snapshotObj.certificado) snapshotObj.certificado.fecha_emision = updates.date;
              snapshotObj.date = updates.date;
            }
            if ('fecha_vencimiento' in updates) {
              if (snapshotObj.certificado) snapshotObj.certificado.fecha_vencimiento = updates.fecha_vencimiento;
              snapshotObj.fecha_vencimiento = updates.fecha_vencimiento;
            }
            if ('location' in updates) {
              if (snapshotObj.certificado_detalles) snapshotObj.certificado_detalles.location = updates.location;
              snapshotObj.location = updates.location;
            }
            if ('horas_estimadas' in updates) {
              if (snapshotObj.certificado_detalles) snapshotObj.certificado_detalles.horas_estimadas = updates.horas_estimadas;
            }
            if (updates.id_facilitador) {
              if (snapshotObj.firmas) {
                snapshotObj.firmas.facilitator_id = parseInt(updates.id_facilitador);
                snapshotObj.firmas.facilitator_data = facilitatorData;
              } else {
                snapshotObj.firmas = {
                  facilitator_id: parseInt(updates.id_facilitador),
                  facilitator_data: facilitatorData,
                };
              }
            }
            
            finalSnapshot = JSON.stringify(snapshotObj, null, 2);
            dbUpdate.snapshot_contenido = finalSnapshot;
          } catch (e) {
            console.warn(`Failed to parse snapshot for cert ${cert.id}`);
          }
        }

        // 3. Update certificate record
        const { error: updateError } = await supabase
          .from("certificados")
          .update(dbUpdate)
          .eq("id", cert.id);

        if (updateError) throw updateError;

        // 4. Update associated carnet if it exists
        const { data: carnet } = await supabase
          .from("carnets")
          .select("*")
          .eq("id_certificado", cert.id)
          .maybeSingle();

        if (carnet) {
          const carnetUpdate: any = {};
          if ('certificate_title' in updates) carnetUpdate.titulo_curso = updates.certificate_title;
          if ('certificate_subtitle' in updates) carnetUpdate.subtitulo_curso = updates.certificate_subtitle;
          if ('date' in updates) carnetUpdate.fecha_emision = updates.date;
          if ('fecha_vencimiento' in updates) carnetUpdate.fecha_vencimiento = updates.fecha_vencimiento;

          let carnetSnapshot = carnet.snapshot_contenido;
          if (carnet.snapshot_contenido) {
            try {
              const cSnapshotObj = JSON.parse(carnet.snapshot_contenido);
              if ('certificate_title' in updates) cSnapshotObj.titulo_curso = updates.certificate_title;
              if ('certificate_subtitle' in updates) cSnapshotObj.subtitulo_curso = updates.certificate_subtitle;
              if ('date' in updates) cSnapshotObj.fecha_emision = updates.date;
              if ('fecha_vencimiento' in updates) cSnapshotObj.fecha_vencimiento = updates.fecha_vencimiento;
              
              carnetSnapshot = JSON.stringify(cSnapshotObj, null, 2);
              carnetUpdate.snapshot_contenido = carnetSnapshot;
            } catch (e) {
              console.warn(`Failed to parse snapshot for carnet ${carnet.id}`);
            }
          }

          await supabase
            .from("carnets")
            .update(carnetUpdate)
            .eq("id", carnet.id);
        }

        updatedCount++;
      } catch (err) {
        console.error(`Error updating certificate ${cert.id}:`, err);
      }
    }

    return {
      success: true,
      message: `Se actualizaron ${updatedCount} certificados y sus respectivos carnets para la OSI ${osiNumber}${courseId ? " y el curso seleccionado" : ""}`,
      updatedCount,
    };
  } catch (error) {
    console.error("Error in batchUpdateCertificatesAction:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error desconocido",
      updatedCount: 0,
    };
  }
}

/**
 * Result type for anulación actions.
 */
export interface AnularResult {
  success: boolean;
  message: string;
  annulledCertificates?: number;
  annulledCarnets?: number;
}

/**
 * Soft-delete (anular) a single certificate and its associated carnet.
 * Records motivo_anulacion, anulado_por (auth user id) and fecha_anulacion
 * on both rows for audit. The participant record itself is left untouched.
 */
export async function anularCertificateAction(
  certificateId: number,
  motivo: string,
): Promise<AnularResult> {
  try {
    const trimmedMotivo = (motivo || "").trim();
    if (trimmedMotivo.length < 5) {
      return {
        success: false,
        message:
          "Debe ingresar un motivo de anulación de al menos 5 caracteres.",
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const anuladoPor = user?.id ?? null;
    const ahora = new Date().toISOString();

    // 1. Anular el certificado (solo si está activo)
    const { data: certUpdate, error: certError } = await supabase
      .from("certificados")
      .update({
        is_active: false,
        motivo_anulacion: trimmedMotivo,
        anulado_por: anuladoPor,
        fecha_anulacion: ahora,
      })
      .eq("id", certificateId)
      .eq("is_active", true)
      .select("id")
      .maybeSingle();

    if (certError) {
      console.error("Error anulando certificado:", certError);
      return {
        success: false,
        message: `Error al anular el certificado: ${certError.message}`,
      };
    }

    if (!certUpdate) {
      return {
        success: false,
        message:
          "No se encontró un certificado activo con ese ID (puede que ya haya sido anulado).",
      };
    }

    // 2. Cascada: anular el carnet asociado (one-to-one por id_certificado)
    const { data: carnetUpdate, error: carnetError } = await supabase
      .from("carnets")
      .update({
        is_active: false,
        motivo_anulacion: trimmedMotivo,
        anulado_por: anuladoPor,
        fecha_anulacion: ahora,
      })
      .eq("id_certificado", certificateId)
      .eq("is_active", true)
      .select("id")
      .maybeSingle();

    if (carnetError) {
      // El certificado ya quedó anulado; solo reportamos el fallo del carnet
      console.warn("Error anulando carnet asociado:", carnetError);
      return {
        success: true,
        message:
          "Certificado anulado, pero ocurrió un error al anular el carnet asociado.",
        annulledCertificates: 1,
        annulledCarnets: 0,
      };
    }

    return {
      success: true,
      message: carnetUpdate
        ? "Certificado y carnet anulados correctamente."
        : "Certificado anulado correctamente (no tenía carnet asociado).",
      annulledCertificates: 1,
      annulledCarnets: carnetUpdate ? 1 : 0,
    };
  } catch (error) {
    console.error("Error in anularCertificateAction:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Error desconocido al anular el certificado.",
    };
  }
}
