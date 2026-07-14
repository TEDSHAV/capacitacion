"use server";

import { createClient } from '@/utils/supabase/server';
import { CertificateGeneration, CertificateParticipant } from '@/types';

export interface CertificateRecord {
  id_participante?: number;
  id_empresa?: number;
  id_curso: number;
  fecha_emision: string;
  fecha_vencimiento?: string;
  nro_osi: number;
  id_estado?: number;
  id_facilitador?: number;
  id_plantilla_certificado?: number;
  calificacion: number;
  snapshot_contenido?: string;
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
    const supabase = await createClient();
    
    if (!certificateData.osi_data || !certificateData.course_topic_data) {
      return { success: false, message: "OSI data and course topic data are required" };
    }

    const certificateIds: number[] = [];
    const certificateNumbers: CertificateWithNumbers[] = [];
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    for (const participant of participants) {
      // 1. Create or find participant record
      const participantId = await createOrUpdateParticipant(participant);
      if (!participantId) {
        console.warn(`Failed to create/find participant: ${participant.name}`);
        continue;
      }

      // 2. Prepare certificate record data
      const certificateRecord: CertificateRecord = {
        id_participante: participantId,
        id_empresa: certificateData.osi_data.empresa_id || undefined,
        id_curso: parseInt(certificateData.course_topic_data.id),
        fecha_emision: today,
        fecha_vencimiento: certificateData.fecha_vencimiento || undefined,
        nro_osi: parseInt(certificateData.osi_data.nro_osi),
        id_estado: certificateData.id_estado || undefined,
        id_facilitador: certificateData.facilitator_id ? parseInt(certificateData.facilitator_id) : undefined,
        id_plantilla_certificado: certificateData.id_plantilla_certificado || undefined,
        calificacion: participant.score || 0,
        snapshot_contenido: generateContentSnapshot(certificateData, participant)
      };

      // 3. Insert certificate record and return the control numbers
      const { data: certificateInsert, error: certificateError } = await supabase
        .from("certificados")
        .insert(certificateRecord)
        .select('id, nro_libro, nro_hoja, nro_linea, nro_control')
        .single();

      if (certificateError) {
        console.error("Error inserting certificate:", certificateError);
        continue;
      }

      if (certificateInsert) {
        certificateIds.push(certificateInsert.id);
        certificateNumbers.push({
          id: certificateInsert.id,
          nro_libro: certificateInsert.nro_libro,
          nro_hoja: certificateInsert.nro_hoja,
          nro_linea: certificateInsert.nro_linea,
          nro_control: certificateInsert.nro_control
        });
      }
    }

    if (certificateIds.length === 0) {
      return { success: false, message: "No certificates were saved to database" };
    }

    return { 
      success: true, 
      message: `Successfully saved ${certificateIds.length} certificates to database`,
      certificateIds,
      certificateNumbers
    };

  } catch (error) {
    console.error("Error saving certificates to database:", error);
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
    
    // First, try to find existing participant by cedula and name
    const { data: existingParticipant, error: findError } = await supabase
      .from("participantes_certificados")
      .select("id")
      .eq("cedula", participant.id_number)
      .eq("nombre", participant.name)
      .maybeSingle();

    if (findError && findError.code !== 'PGRST116') { // Not found error is ok
      console.error("Error finding participant:", findError);
      return null;
    }

    if (existingParticipant) {
      return existingParticipant.id;
    }

    // Create new participant
    const nationality = participant.nacionalidad || 'V';
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
      console.error("Error creating participant:", insertError);
      return null;
    }

    return newParticipant?.id || null;

  } catch (error) {
    console.error("Error in createOrUpdateParticipant:", error);
    return null;
  }
}

/**
 * Generate content snapshot for certificate
 */
function generateContentSnapshot(
  certificateData: CertificateGeneration, 
  participant: CertificateParticipant
): string {
  const snapshot = {
    // Certificate record fields from certificados table
    certificado: {
      id_participante: participant.name, // Will be updated with actual ID after insertion
      id_empresa: certificateData.osi_data?.empresa_id,
      id_curso: certificateData.course_topic_data?.id,
      fecha_emision: new Date().toISOString().split('T')[0], // Current date
      fecha_vencimiento: certificateData.fecha_vencimiento,
      nro_osi: certificateData.osi_data?.nro_osi,
      id_estado: certificateData.id_estado,
      id_facilitador: certificateData.facilitator_id,
      id_plantilla_certificado: certificateData.id_plantilla_certificado,
      calificacion: participant.score || 0,
      is_active: true, // Default value
      nro_libro: 1, // Default value from trigger
      nro_hoja: 1, // Default value from trigger
      nro_linea: 1, // Default value from trigger
      // nro_control is handled by sequence/trigger
    },
    // Participant information
    participante: {
      name: participant.name,
      id_number: participant.id_number,
      nacionalidad: participant.nacionalidad || 'V',
      score: participant.score
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
      console.error("Error fetching certificate templates:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getCertificateTemplates:", error);
    return [];
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
      console.error("Error fetching default certificate template:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getDefaultCertificateTemplate:", error);
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
      console.error("Error fetching Venezuelan states:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getVenezuelanStates:", error);
    return [];
  }
}
