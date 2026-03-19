"use server";

import { createClient } from '@/utils/supabase/server';
import { Facilitador, State } from '@/types';

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
