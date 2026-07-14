"use server";

import { createClient } from '@/utils/supabase/server';
import { Signature, Facilitador } from '@/types';

// Get all signatures with facilitator information in a single query
export async function getSignaturesWithFacilitators() {
  try {
    const supabase = await createClient();
    
    // Get signatures with facilitator info in one query
    const { data, error } = await supabase
      .from('firmas')
      .select(`
        *,
        facilitadores!inner(
          id,
          nombre_apellido,
          email,
          firma_id
        )
      `)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;

    return { signatures: data || [] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error al cargar las firmas' };
  }
}

// Alternative: Get signatures and facilitators separately (current approach)
export async function getSignaturesAndFacilitators() {
  try {
    const supabase = await createClient();
    
    // Execute both queries in parallel using RPC or separate calls
    const [signaturesResult, facilitadoresResult] = await Promise.all([
      supabase
        .from('firmas')
        .select('*')
        .order('fecha_creacion', { ascending: false }),
      
      supabase
        .from('facilitadores')
        .select('id, nombre_apellido, email, firma_id')
    ]);

    if (signaturesResult.error || facilitadoresResult.error) {
      throw new Error('Error loading data');
    }

    return { 
      signatures: signaturesResult.data || [],
      facilitadores: facilitadoresResult.data || []
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error al cargar los datos' };
  }
}

// Delete signature
export async function deleteSignature(id: number) {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('firmas')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error al eliminar la firma' };
  }
}
