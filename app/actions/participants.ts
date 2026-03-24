"use server";

import { createClient } from '@/utils/supabase/server';
import { ParticipanteCertificado, ParticipantFormData } from '@/types';

export async function getParticipants(): Promise<{ participants: ParticipanteCertificado[] | null; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: participants, error } = await supabase
      .from("participantes_certificados")
      .select("*");

    if (error) {
      throw error;
    }

    return { participants: participants || [] };

  } catch (error) {
    console.error("Error en participantes:", error);
    return { 
      participants: null, 
      error: error instanceof Error ? error.message : 'Error al cargar los participantes. Por favor intente nuevamente.'
    };
  }
}

export async function createParticipant(formData: ParticipantFormData): Promise<{ success: boolean; error?: string; data?: ParticipanteCertificado }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("participantes_certificados")
      .insert([{
        nombre: formData.nombre.trim(),
        cedula: formData.cedula.trim(),
        nacionalidad: formData.nacionalidad
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al crear el participante' 
    };
  }
}

export async function updateParticipant(id: number, formData: ParticipantFormData): Promise<{ success: boolean; error?: string; data?: ParticipanteCertificado }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("participantes_certificados")
      .update({
        nombre: formData.nombre.trim(),
        cedula: formData.cedula.trim(),
        nacionalidad: formData.nacionalidad
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al actualizar el participante' 
    };
  }
}

export async function deleteParticipant(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("participantes_certificados")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return { success: true };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al eliminar el participante' 
    };
  }
}

export async function getParticipantById(id: number): Promise<{ participant: ParticipanteCertificado | null; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: participant, error } = await supabase
      .from("participantes_certificados")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    return { participant };

  } catch (error) {
    return { 
      participant: null, 
      error: error instanceof Error ? error.message : 'Error al cargar el participante'  
    };
  }
}
