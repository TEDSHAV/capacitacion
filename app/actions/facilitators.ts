"use server";

import { createClient } from '@/utils/supabase/server';

// Type for certificate generation (minimal facilitator data)
export interface CertificateFacilitator {
  id: number;
  name: string;
  facilitator: string;
  cargo?: string;
  firma?: string;
  sha_signature_id?: number;
  signature_data?: {
    id: number;
    representante_sha: string;
    firma: string;
  };
}

// Full Facilitador type from the types file
import { Facilitador } from '@/types';

// Get all facilitators
export async function getFacilitators() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('facilitadores')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;

    return { facilitadores: data || [] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error al cargar los facilitadores' };
  }
}

// Get all states
export async function getStates() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('cat_estados_venezuela')
      .select(`
        id,
        nombre_estado,
        capital_estado
      `)
      .order('nombre_estado', { ascending: true });

    if (error) throw error;

    return { states: data || [] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error al cargar los estados' };
  }
}

// Update facilitator
export async function updateFacilitator(id: number, updatedData: Partial<Facilitador>) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('facilitadores')
      .update({
        ...updatedData,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { facilitador: data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error al actualizar el facilitador' };
  }
}

// Delete facilitator
export async function deleteFacilitator(id: number) {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('facilitadores')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error al eliminar el facilitador' };
  }
}

/**
 * Get facilitator data by ID using server action
 */
export async function getFacilitatorData(facilitatorId: string): Promise<CertificateFacilitator | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('facilitadores')
      .select(`
        id,
        name,
        facilitator,
        cargo,
        firma,
        sha_signature_id,
        firmas (
          id,
          representante_sha,
          firma
        )
      `)
      .eq('id', parseInt(facilitatorId))
      .single();

    if (error) {
      console.error('Error fetching facilitator:', error);
      return null;
    }

    return data as CertificateFacilitator;
  } catch (error) {
    console.error('Error in getFacilitatorData:', error);
    return null;
  }
}

/**
 * Get certificate template by ID using server action
 */
export async function getCertificateTemplate(templateId: number): Promise<{ id: number; nombre: string; archivo: string } | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('plantillas_certificados')
      .select('id, nombre, archivo')
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('Error fetching template:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getCertificateTemplate:', error);
    return null;
  }
}
