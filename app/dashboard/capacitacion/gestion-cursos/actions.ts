"use server";

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper function to format error messages
function formatSupabaseError(error: any): string {
  if (error?.message) {
    return error.message;
  }
  return 'Error desconocido de la base de datos';
}

export async function createCurso(formData: FormData) {
  try {
    // Get form data with proper type checking
    const titulo = formData.get('titulo') as string;
    // const cliente_asociado = formData.get('cliente_asociado') as string; // Removed - column doesn't exist
    const contenido = formData.get('contenido') as string;
    const horas_estimadas = formData.get('horas_estimadas') as string;
    const nota_aprobatoria = formData.get('nota_aprobatoria') as string;
    const emite_carnet = formData.get('emite_carnet') as string;

    // Validate required fields
    if (!titulo?.trim()) {
      return { error: 'El título es requerido' };
    }

    if (!contenido?.trim()) {
      return { error: 'El contenido es requerido' };
    }

    // Create the course in cursos table
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cursos')
      .insert({
        nombre: titulo.trim(),
        contenido: contenido.trim(),
        horas_estimadas: horas_estimadas ? parseInt(horas_estimadas) : null,
        created_at: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
        is_active: true,
        nota_aprobatoria: nota_aprobatoria ? parseInt(nota_aprobatoria) : 14,
        emite_carnet: emite_carnet === 'true' // Convert string to boolean
      })
      .select('*')
      .single();

    if (error) {
      return { error: `Error al crear el curso: ${formatSupabaseError(error)}` };
    }

    return { success: true, data };
  } catch (err) {
    return { error: `Error al crear el curso: ${err instanceof Error ? err.message : 'Error desconocido'}` };
  }
}

export async function updateCurso(id: string, formData: FormData) {
  try {
    const supabase = await createClient();

    const titulo = formData.get('titulo') as string;
    // const cliente_asociado = formData.get('cliente_asociado') as string; // Removed - column doesn't exist
    const contenido = formData.get('contenido') as string;
    const horas_estimadas = formData.get('horas_estimadas') as string;
    const nota_aprobatoria = formData.get('nota_aprobatoria') as string;
    const emite_carnet = formData.get('emite_carnet') as string;

    // Validate required fields
    if (!titulo || !contenido) {
      return { error: 'El título y contenido son requeridos' };
    }

    // Update the course in cursos table
    const { data, error } = await supabase
      .from('cursos')
      .update({
        nombre: titulo,
        contenido: contenido,
        horas_estimadas: horas_estimadas ? parseInt(horas_estimadas) : null,
        nota_aprobatoria: nota_aprobatoria ? parseInt(nota_aprobatoria) : 14,
        emite_carnet: emite_carnet === 'true' // Convert string to boolean
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return { error: `Error al actualizar el curso: ${formatSupabaseError(error)}` };
    }

    return { success: true, data };

  } catch (error) {
    return { error: 'Error interno del servidor' };
  }
}

export async function duplicateCurso(id: string) {
  try {
    const supabase = await createClient();

    // First, get the original course from cursos table
    const { data: originalCourse, error: fetchError } = await supabase
      .from('cursos')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !originalCourse) {
      console.error('Error fetching original course:', fetchError);
      return { error: 'No se encontró el curso original' };
    }

    console.log('Original course:', originalCourse);

    // Create a duplicate in cursos table
    const { data, error } = await supabase
      .from('cursos')
      .insert({
        nombre: `${originalCourse.nombre} (Copia)`,
        contenido: originalCourse.contenido,
        horas_estimadas: originalCourse.horas_estimadas,
        created_at: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
        is_active: true,
        nota_aprobatoria: originalCourse.nota_aprobatoria || 14,
        emite_carnet: originalCourse.emite_carnet || false
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error duplicating course:', error);
      return { error: `Error al duplicar el curso: ${formatSupabaseError(error)}` };
    }

    console.log('Duplicated course:', data);

    // Revalidate the cursos page to refresh the cache
    revalidatePath('/dashboard/capacitacion/gestion-cursos');

    return { success: true, data };

  } catch (error) {
    console.error('Unexpected error in duplicateCurso:', error);
    return { error: 'Error interno del servidor' };
  }
}

export async function deleteCurso(id: string) {
  try {
    const supabase = await createClient();

    // Soft delete: set is_active to false
    const { error } = await supabase
      .from('cursos')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return { error: `Error al eliminar el curso: ${formatSupabaseError(error)}` };
    }

    return { success: true };

  } catch (error) {
    return { error: 'Error interno del servidor' };
  }
}

export async function getCursos() {
  try {
    const supabase = await createClient();

    // Get all active courses from cursos table
    const { data, error } = await supabase
      .from('cursos')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: false });

    if (error) {
      return { error: `Error al obtener los cursos: ${error.message || 'Error desconocido'}` };
    }

    return { success: true, data: data || [] };

  } catch (error) {
    return { error: 'Error interno del servidor' };
  }
}
