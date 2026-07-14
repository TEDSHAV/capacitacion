"use server";

import { createClient } from '@/utils/supabase/server';

/**
 * Server-side action to fetch signature data by ID
 */
export async function getSignatureDataServer(signatureId: string): Promise<any | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('firmas')
      .select('*')
      .eq('id', parseInt(signatureId))
      .eq('is_active', true)
      .single();
      
    if (error) {
      console.error("Error fetching signature from database:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching signature:", error);
    return null;
  }
}

/**
 * Server-side action to fetch facilitator data by ID
 */
export async function getFacilitatorDataServer(facilitatorId: string): Promise<any | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('facilitadores')
      .select(`
        id,
        nombre_apellido,
        cedula,
        telefono,
        email,
        direccion,
        firma_id,
        firmas (
          id,
          nombre,
          url_imagen,
          tipo,
          is_active
        )
      `)
      .eq('id', parseInt(facilitatorId))
      .eq('is_active', true)
      .single();
      
    if (error) {
      console.error("Error fetching facilitator from database:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching facilitator:", error);
    return null;
  }
}

/**
 * Server-side action to fetch certificate template by ID
 */
export async function getCertificateTemplateServer(templateId: number): Promise<{ id: number; nombre: string; archivo: string } | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('plantillas_certificados')
      .select('id, nombre, archivo')
      .eq('id', templateId)
      .eq('is_active', true)
      .single();
      
    if (error) {
      console.error("Error fetching certificate template from database:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching certificate template:", error);
    return null;
  }
}
