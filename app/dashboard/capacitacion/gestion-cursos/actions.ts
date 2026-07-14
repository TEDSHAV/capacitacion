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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'No autorizado' };
    }

    const titulo = formData.get('titulo') as string;
    const cliente_asociado = formData.get('empresa_id') as string;
    const contenido = formData.get('contenido') as string;
    const horas_estimadas = formData.get('horas_estimadas') as string;

    // Validate required fields
    if (!titulo || !contenido) {
      return { error: 'El título y contenido son requeridos' };
    }

    // Create the course in catalogo_servicios table
    const { data, error } = await supabase
      .from('catalogo_servicios')
      .insert({
        nombre: titulo,
        cliente_asociado: cliente_asociado && cliente_asociado.trim() ? cliente_asociado : null,
        contenido_curso: contenido,
        horas_estimadas: horas_estimadas ? parseFloat(horas_estimadas) : null,
        tipo_servicio: 1
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return { error: `Error al crear el curso: ${formatSupabaseError(error)}` };
    }

    // Revalidate the page to show updated data
    revalidatePath('/dashboard/capacitacion/gestion-cursos');

    return { success: true, data };

  } catch (error) {
    return { error: 'Error interno del servidor' };
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
    const cliente_asociado = formData.get('empresa_id') as string;
    const contenido = formData.get('contenido') as string;
    const horas_estimadas = formData.get('horas_estimadas') as string;

    // Validate required fields
    if (!titulo || !contenido) {
      return { error: 'El título y contenido son requeridos' };
    }

    // Update the course in catalogo_servicios table
    const { data, error } = await supabase
      .from('catalogo_servicios')
      .update({
        nombre: titulo,
        cliente_asociado: cliente_asociado && cliente_asociado.trim() ? cliente_asociado : null,
        contenido_curso: contenido,
        horas_estimadas: horas_estimadas ? parseFloat(horas_estimadas) : null,
        tipo_servicio: 1
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return { error: `Error al actualizar el curso: ${formatSupabaseError(error)}` };
    }

    // Revalidate the page to show updated data
    revalidatePath('/dashboard/capacitacion/gestion-cursos');

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

    // First, get the original course
    const { data: originalCourse, error: fetchError } = await supabase
      .from('catalogo_servicios')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !originalCourse) {
      return { error: 'No se encontró el curso original' };
    }

    // Create a duplicate with " (Copia)" suffix
    const { data, error } = await supabase
      .from('catalogo_servicios')
      .insert({
        nombre: `${originalCourse.nombre} (Copia)`,
        cliente_asociado: originalCourse.cliente_asociado,
        contenido_curso: originalCourse.contenido_curso,
        tipo_servicio: 1
      })
      .select()
      .single();

    if (error) {
      return { error: `Error al duplicar el curso: ${formatSupabaseError(error)}` };
    }

    // Revalidate the page to show updated data
    revalidatePath('/dashboard/capacitacion/gestion-cursos');

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

    // Delete the course from catalogo_servicios table
    const { error } = await supabase
      .from('catalogo_servicios')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: `Error al eliminar el curso: ${formatSupabaseError(error)}` };
    }

    // Revalidate the page to show updated data
    revalidatePath('/dashboard/capacitacion/gestion-cursos');

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

    // Get all courses from catalogo_servicios with company information where tipo_servicio = 1
    const { data, error } = await supabase
      .from('catalogo_servicios')
      .select(`
        *,
        empresas (razon_social)
      `)
      .eq('tipo_servicio', 1)
      .order('created_at', { ascending: false });

    if (error) {
      return { error: 'Error al obtener los cursos' };
    }

    return { success: true, data: data || [] };

  } catch (error) {
    return { error: 'Error interno del servidor' };
  }
}
