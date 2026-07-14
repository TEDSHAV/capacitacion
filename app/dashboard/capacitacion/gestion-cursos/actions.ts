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
    const cliente_asociado = formData.get('cliente_asociado') as string;
    const contenido = formData.get('contenido') as string;
    const horas_estimadas = formData.get('horas_estimadas') as string;
    const nota_aprobatoria = formData.get('nota_aprobatoria') as string;

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
        cliente_asociado: cliente_asociado?.trim() ? parseInt(cliente_asociado) : null,
        created_at: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
        is_active: true,
        nota_aprobatoria: nota_aprobatoria ? parseInt(nota_aprobatoria) : 14
      })
      .select(`
        *,
        empresas (
          razon_social
        )
      `)
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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'No autorizado' };
    }

    const titulo = formData.get('titulo') as string;
    const cliente_asociado = formData.get('cliente_asociado') as string;
    const contenido = formData.get('contenido') as string;
    const horas_estimadas = formData.get('horas_estimadas') as string;
    const nota_aprobatoria = formData.get('nota_aprobatoria') as string;

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
        cliente_asociado: cliente_asociado && cliente_asociado.trim() ? parseInt(cliente_asociado) : null,
        nota_aprobatoria: nota_aprobatoria ? parseInt(nota_aprobatoria) : 14
      })
      .eq('id', id)
      .select(`
        *,
        empresas (
          razon_social
        )
      `)
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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'No autorizado' };
    }

    // First, get the original course from cursos table with empresa data
    const { data: originalCourse, error: fetchError } = await supabase
      .from('cursos')
      .select(`
        *,
        empresas (
          razon_social
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !originalCourse) {
      return { error: 'No se encontró el curso original' };
    }

    console.log('Original course with empresa:', originalCourse);

    // Create a duplicate in cursos table
    const { data, error } = await supabase
      .from('cursos')
      .insert({
        nombre: `${originalCourse.nombre} (Copia)`,
        contenido: originalCourse.contenido,
        horas_estimadas: originalCourse.horas_estimadas,
        cliente_asociado: originalCourse.cliente_asociado,
        created_at: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
        is_active: true,
        nota_aprobatoria: originalCourse.nota_aprobatoria || 14
      })
      .select(`
        *,
        empresas (
          razon_social
        )
      `)
      .single();

    if (error) {
      return { error: `Error al duplicar el curso: ${formatSupabaseError(error)}` };
    }

    return { success: true, data };

  } catch (error) {
    return { error: 'Error interno del servidor' };
  }
}

export async function deleteCurso(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'No autorizado' };
    }

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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'No autorizado' };
    }

    // Get all active courses from cursos table with company information using the foreign key
    const { data, error } = await supabase
      .from('cursos')
      .select(`
        *,
        empresas (
          razon_social
        )
      `)
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
