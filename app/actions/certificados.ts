"use server";

import { createClient } from '@/utils/supabase/server';
import { CertificateGeneration, CertificateParticipant } from '@/types';
import { QRService } from '@/lib/qr-service';

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
  participants: CertificateParticipant[]
): Promise<{ success: boolean; message: string; certificateIds?: number[]; certificateNumbers?: CertificateWithNumbers[] }> {
  try {
    console.log('=== STARTING CERTIFICATE SAVE PROCESS ===');
    console.log('Certificate data:', JSON.stringify(certificateData, null, 2));
    console.log('Participants count:', participants.length);
    console.log('Participants:', JSON.stringify(participants, null, 2));

    const supabase = await createClient();
    
    if (!certificateData.osi_data || !certificateData.course_topic_data) {
      return { success: false, message: "OSI data and course topic data are required" };
    }

    const today = new Date().toLocaleDateString('en-CA'); // en-CA format gives YYYY-MM-DD in local timezone
    const certificateIds: number[] = [];
    const certificateNumbers: CertificateWithNumbers[] = [];

    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      console.log(`\n--- Processing participant ${i + 1}/${participants.length}: ${participant.name} ---`);
      
      // 1. Create or find participant record
      console.log('Step 1: Creating/updating participant...');
      const participantId = await createOrUpdateParticipant(participant);
      console.log('Participant ID result:', participantId);
      
      if (!participantId) {
        console.error('FAILED: Could not create/update participant:', participant.name);
        continue;
      }

      // 2. Prepare certificate record data with proper participant ID
      console.log('Step 2: Preparing certificate record...');
      const certificateRecord: CertificateRecord = {
        id_participante: participantId || null,
        id_empresa: certificateData.osi_data?.empresa_id || null,
        id_curso: certificateData.course_topic_data?.id ? parseInt(certificateData.course_topic_data.id) : null,
        fecha_emision: today,
        fecha_vencimiento: certificateData.fecha_vencimiento || null,
        nro_osi: certificateData.osi_data?.nro_osi ? parseInt(certificateData.osi_data.nro_osi.toString()) : null, // REQUIRED for OSI certificates
        id_estado: certificateData.id_estado || null,
        id_facilitador: certificateData.facilitator_id ? parseInt(certificateData.facilitator_id) : null,
        id_plantilla_certificado: certificateData.id_plantilla_certificado || null,
        calificacion: participant.score || 0,
        is_active: true,
        snapshot_contenido: generateContentSnapshot(certificateData, participant, participantId)
      };

      console.log('Prepared certificate record:', JSON.stringify(certificateRecord, null, 2));

      // Validate that we have required fields for OSI certificates
      if (!certificateRecord.id_participante) {
        console.error('FAILED: Missing participant ID for certificate:', participant.name);
        continue;
      }
      
      // Log warning for missing OSI number but don't fail (it's in snapshot)
      if (!certificateRecord.nro_osi) {
        console.warn('WARNING: Missing OSI number for certificate:', participant.name);
        console.warn('OSI data available:', certificateData.osi_data);
      }

      // 3. Insert certificate record and return the control numbers
      console.log('Step 3: Inserting certificate record...');
      const { data: certificateInsert, error: certificateError } = await supabase
        .from("certificados")
        .insert(certificateRecord)
        .select('id, nro_libro, nro_hoja, nro_linea, nro_control')
        .single();

      if (certificateError) {
        console.error('FAILED: Certificate insertion error for participant:', participant.name);
        console.error('Database error:', certificateError);
        console.error('Error details:', JSON.stringify(certificateError, null, 2));
        console.error('Certificate record that failed:', JSON.stringify(certificateRecord, null, 2));
        continue;
      }

      console.log('SUCCESS: Certificate inserted:', certificateInsert);

      if (certificateInsert) {
        certificateIds.push(certificateInsert.id);
        certificateNumbers.push({
          id: certificateInsert.id,
          nro_libro: certificateInsert.nro_libro,
          nro_hoja: certificateInsert.nro_hoja,
          nro_linea: certificateInsert.nro_linea,
          nro_control: certificateInsert.nro_control
        });

        // Update the snapshot_contenido with actual control numbers
        const updatedSnapshot = generateContentSnapshotWithControlNumbers(
          certificateData, 
          participant, 
          participantId,
          certificateInsert.nro_libro,
          certificateInsert.nro_hoja,
          certificateInsert.nro_linea,
          certificateInsert.nro_control
        );

        // Generate QR code for this certificate
        console.log('Step 4: Generating QR code...');
        let qrCodeDataUrl = '';
        try {
          const qrResult = await QRService.generateCertificateQR(
            certificateInsert.id,
            {
              nro_libro: certificateInsert.nro_libro,
              nro_hoja: certificateInsert.nro_hoja,
              nro_linea: certificateInsert.nro_linea,
              nro_control: certificateInsert.nro_control
            }
          );
          qrCodeDataUrl = qrResult.dataUrl;
          console.log('QR code generated successfully');
        } catch (error) {
          console.warn('WARNING: Failed to generate QR code for certificate:', certificateInsert.id, error);
        }

        // Update certificate with snapshot and QR code
        console.log('Step 5: Updating certificate with snapshot and QR code...');
        const { error: updateError } = await supabase
          .from("certificados")
          .update({ 
            snapshot_contenido: updatedSnapshot,
            qr_code: qrCodeDataUrl || null
          })
          .eq("id", certificateInsert.id);

        if (updateError) {
          console.warn('WARNING: Failed to update certificate with snapshot/QR:', updateError);
        } else {
          console.log('SUCCESS: Certificate updated with snapshot and QR code');
        }
      }
    }

    console.log('\n=== CERTIFICATE SAVE PROCESS COMPLETE ===');
    console.log('Total certificates saved:', certificateIds.length);
    console.log('Certificate IDs:', certificateIds);

    if (certificateIds.length === 0) {
      console.error('FAILED: No certificates were saved to database');
      return { success: false, message: "No certificates were saved to database" };
    }

    return { 
      success: true, 
      message: `Successfully saved ${certificateIds.length} certificates to database`,
      certificateIds,
      certificateNumbers
    };

  } catch (error) {
    console.error('FATAL ERROR in saveCertificatesToDatabase:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
}

/**
 * Create or update participant record
 */
async function createOrUpdateParticipant(participant: CertificateParticipant): Promise<number | null> {
  try {
    const supabase = await createClient();
    
    console.log('Creating/updating participant:', JSON.stringify(participant, null, 2));
    
    // Validate required fields
    if (!participant.name || !participant.id_number) {
      console.error('FAILED: Missing required participant fields:', {
        name: participant.name,
        id_number: participant.id_number,
        nacionalidad: participant.nacionalidad
      });
      return null;
    }
    
    // First, try to find existing participant by cedula (primary match) - name can vary slightly
    const { data: existingParticipant, error: findError } = await supabase
      .from("participantes_certificados")
      .select("id, nombre, cedula, nacionalidad")
      .eq("cedula", participant.id_number)
      .maybeSingle();

    if (findError && findError.code !== 'PGRST116') { // Not found error is ok
      console.error('FAILED: Error finding existing participant:', findError);
      return null;
    }

    if (existingParticipant) {
      console.log('Found existing participant by cedula:', {
        id: existingParticipant.id,
        nombre: existingParticipant.nombre,
        cedula: existingParticipant.cedula,
        nacionalidad: existingParticipant.nacionalidad
      });
      return existingParticipant.id;
    }

    // Create new participant
    const nationality = participant.nacionalidad === 'V' ? 'venezolano' : 
                       participant.nacionalidad === 'E' ? 'extranjero' : 'venezolano'; // Default to venezolano
    
    console.log('Creating new participant with nationality:', nationality);
    
    const { data: newParticipant, error: insertError } = await supabase
      .from("participantes_certificados")
      .insert({
        nombre: participant.name,
        cedula: participant.id_number,
        nacionalidad: nationality
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('FAILED: Error creating new participant:', insertError);
      console.error('Insert error details:', JSON.stringify(insertError, null, 2));
      return null;
    }

    console.log('SUCCESS: Created new participant:', newParticipant?.id);
    return newParticipant?.id || null;

  } catch (error) {
    console.error('FAILED: Exception in createOrUpdateParticipant:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return null;
  }
}

/**
 * Generate content snapshot for certificate
 */
function generateContentSnapshot(
  certificateData: CertificateGeneration, 
  participant: CertificateParticipant,
  participantId: number
): string {
  const snapshot = {
    // Certificate record fields from certificados table
    certificado: {
      id_participante: participantId, // Use actual participant ID from database
      id_empresa: certificateData.osi_data?.empresa_id,
      id_curso: certificateData.course_topic_data?.id,
      fecha_emision: new Date().toLocaleDateString('en-CA'), // Current date in local timezone
      fecha_vencimiento: certificateData.fecha_vencimiento,
      nro_osi: certificateData.osi_data?.nro_osi,
      id_estado: certificateData.id_estado,
      id_facilitador: certificateData.facilitator_id,
      id_plantilla_certificado: certificateData.id_plantilla_certificado,
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
      nacionalidad: participant.nacionalidad || 'V',
      score: participant.score,
      cedula_completa: `${participant.nacionalidad || 'V'}-${participant.id_number}` // Full cédula format
    },
    // Certificate details
    certificado_detalles: {
      title: certificateData.certificate_title,
      subtitle: certificateData.certificate_subtitle,
      course_content: certificateData.course_content,
      date: certificateData.date,
      location: certificateData.location,
      horas_estimadas: certificateData.horas_estimadas,
      passing_grade: certificateData.passing_grade
    },
    // OSI information
    osi: {
      nro_osi: certificateData.osi_data?.nro_osi,
      cliente_nombre_empresa: certificateData.osi_data?.cliente_nombre_empresa,
      tema: certificateData.osi_data?.tema,
      detalle_capacitacion: certificateData.osi_data?.detalle_capacitacion,
      empresa_id: certificateData.osi_data?.empresa_id,
      direccion_ejecucion: certificateData.osi_data?.direccion_ejecucion
    },
    // Course information
    curso: {
      name: certificateData.course_topic_data?.name,
      id: certificateData.course_topic_data?.id,
      contenido: certificateData.course_topic_data?.contenido_curso,
      nota_aprobatoria: certificateData.course_topic_data?.nota_aprobatoria,
      emite_carnet: certificateData.course_topic_data?.emite_carnet
    },
    // Template and signatures
    plantilla: {
      id_plantilla_certificado: certificateData.id_plantilla_certificado
    },
    firmas: {
  facilitator_id: certificateData.facilitator_id,
  facilitator_data: certificateData.facilitator_data, 
  sha_signature_id: certificateData.sha_signature_id
},
    // Metadata
    metadatos: {
      generated_at: new Date().toISOString(),
      generated_by: "certificate_generation_system"
    }
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
  nro_control: number
): string {
  const snapshot = {
    // Certificate record fields from certificados table
    certificado: {
      id_participante: participantId, // Use actual participant ID from database
      id_empresa: certificateData.osi_data?.empresa_id,
      id_curso: certificateData.course_topic_data?.id,
      fecha_emision: new Date().toLocaleDateString('en-CA'), // Current date in local timezone
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
      nacionalidad: participant.nacionalidad || 'V',
      score: participant.score,
      cedula_completa: `${participant.nacionalidad || 'V'}-${participant.id_number}` // Full cédula format
    },
    // Certificate details
    certificado_detalles: {
      title: certificateData.certificate_title,
      subtitle: certificateData.certificate_subtitle,
      course_content: certificateData.course_content,
      date: certificateData.date,
      location: certificateData.location,
      horas_estimadas: certificateData.horas_estimadas,
      passing_grade: certificateData.passing_grade
    },
    // OSI information
    osi: {
      nro_osi: certificateData.osi_data?.nro_osi,
      cliente_nombre_empresa: certificateData.osi_data?.cliente_nombre_empresa,
      tema: certificateData.osi_data?.tema,
      detalle_capacitacion: certificateData.osi_data?.detalle_capacitacion,
      empresa_id: certificateData.osi_data?.empresa_id,
      direccion_ejecucion: certificateData.osi_data?.direccion_ejecucion
    },
    // Course information
    curso: {
      name: certificateData.course_topic_data?.name,
      id: certificateData.course_topic_data?.id,
      contenido: certificateData.course_topic_data?.contenido_curso,
      nota_aprobatoria: certificateData.course_topic_data?.nota_aprobatoria,
      emite_carnet: certificateData.course_topic_data?.emite_carnet
    },
    // Template and signatures
    plantilla: {
      id_plantilla_certificado: certificateData.id_plantilla_certificado
    },
    firmas: {
      facilitator_id: certificateData.facilitator_id,
      facilitator_data: certificateData.facilitator_data,
      sha_signature_id: certificateData.sha_signature_id
    },
    // Metadata
    metadatos: {
      generated_at: new Date().toISOString(),
      generated_by: "certificate_generation_system"
    }
  };

  return JSON.stringify(snapshot, null, 2);
}

/**
 * Get available certificate templates
 */
export async function getCertificateTemplates(): Promise<{ id: number; nombre: string }[]> {
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
export async function getCertificateById(certificateId: number): Promise<any | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("certificados")
      .select(`
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
      `)
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
        console.warn('Failed to parse snapshot content for certificate:', certificateId);
      }
    }

    return {
      ...data,
      parsed_snapshot: parsedSnapshot
    };

  } catch (error) {
    console.error('Error fetching certificate:', error);
    return null;
  }
}

/**
 * Verify certificate by ID using QR service
 */
export async function verifyCertificate(certificateId: number): Promise<{ isValid: boolean; certificate?: any; error?: string }> {
  try {
    const certificate = await getCertificateById(certificateId);
    
    if (!certificate) {
      return {
        isValid: false,
        error: 'Certificate not found or inactive'
      };
    }

    // Use QR service to create verification data
    const verificationData = QRService.createVerificationData(true, certificate);
    
    return {
      isValid: verificationData.isValid,
      certificate: verificationData.certificate
    };

  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Verification failed'
    };
  }
}

/**
 * Get default active certificate template (first active template)
 */
export async function getDefaultCertificateTemplate(): Promise<{ id: number; nombre: string } | null> {
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
export async function getVenezuelanStates(): Promise<{ id: number; nombre_estado: string }[]> {
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
