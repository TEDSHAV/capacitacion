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

/**
 * Save certificate records to database for all participants
 */
export async function saveCertificatesToDatabase(
  certificateData: CertificateGeneration,
  participants: CertificateParticipant[]
): Promise<{ success: boolean; message: string; certificateIds?: number[] }> {
  try {
    const supabase = await createClient();
    
    if (!certificateData.osi_data || !certificateData.course_topic_data) {
      return { success: false, message: "OSI data and course topic data are required" };
    }

    const certificateIds: number[] = [];
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

      // 3. Insert certificate record
      const { data: certificateInsert, error: certificateError } = await supabase
        .from("certificados")
        .insert(certificateRecord)
        .select('id')
        .single();

      if (certificateError) {
        console.error("Error inserting certificate:", certificateError);
        continue;
      }

      if (certificateInsert) {
        certificateIds.push(certificateInsert.id);
      }
    }

    if (certificateIds.length === 0) {
      return { success: false, message: "No certificates were saved to database" };
    }

    return { 
      success: true, 
      message: `Successfully saved ${certificateIds.length} certificates to database`,
      certificateIds 
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
    participant: {
      name: participant.name,
      id_number: participant.id_number,
      score: participant.score
    },
    certificate: {
      title: certificateData.certificate_title,
      subtitle: certificateData.certificate_subtitle,
      course_content: certificateData.course_content,
      date: certificateData.date,
      location: certificateData.location,
      horas_estimadas: certificateData.horas_estimadas
    },
    osi: {
      nro_osi: certificateData.osi_data?.nro_osi,
      cliente: certificateData.osi_data?.cliente_nombre_empresa,
      tema: certificateData.osi_data?.tema
    },
    course: {
      name: certificateData.course_topic_data?.name,
      id: certificateData.course_topic_data?.id
    },
    generated_at: new Date().toISOString()
  };

  return JSON.stringify(snapshot);
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
