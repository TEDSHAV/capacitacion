"use server";

import { createClient } from "@/utils/supabase/server";
import { cache } from "react";

// Get all plantillas de cursos with pagination and search
const getPlantillaCursos = cache(async (page: number = 1, limit: number = 10, search: string = "") => {
  const supabase = await createClient();
  
  try {
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('plantillas_cursos')
      .select(`
        *,
        cursos(id, nombre),
        empresas(id, razon_social)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`descripcion.ilike.%${search}%,contenido.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching plantillas:', error);
      return { success: false, error: error.message };
    }

    const plantillas = data?.map(plantilla => ({
      ...plantilla,
      curso_nombre: plantilla.cursos?.nombre,
      empresa_nombre: plantilla.empresas?.razon_social
    })) || [];

    return { 
      success: true, 
      data: plantillas, 
      total: count || 0 
    };
  } catch (error) {
    console.error('Error in getPlantillaCursos:', error);
    return { success: false, error: 'Failed to fetch plantillas' };
  }
});

// Create new plantilla de curso
const createPlantillaCurso = cache(async (plantillaData: any) => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('plantillas_cursos')
      .insert({
        descripcion: plantillaData.descripcion,
        contenido: plantillaData.contenido,
        id_curso: plantillaData.id_curso || null,
        id_empresa: plantillaData.id_empresa || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating plantilla:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in createPlantillaCurso:', error);
    return { success: false, error: 'Failed to create plantilla' };
  }
});

// Update plantilla de curso
const updatePlantillaCurso = cache(async (id: number, plantillaData: any) => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('plantillas_cursos')
      .update({
        descripcion: plantillaData.descripcion,
        contenido: plantillaData.contenido,
        id_curso: plantillaData.id_curso || null,
        id_empresa: plantillaData.id_empresa || null,
        is_active: plantillaData.is_active
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating plantilla:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in updatePlantillaCurso:', error);
    return { success: false, error: 'Failed to update plantilla' };
  }
});

// Delete plantilla de curso (soft delete by setting is_active to false)
const deletePlantillaCurso = cache(async (id: number) => {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase
      .from('plantillas_cursos')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting plantilla:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deletePlantillaCurso:', error);
    return { success: false, error: 'Failed to delete plantilla' };
  }
});

// Get all courses for dropdown
const getCourses = cache(async () => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('cursos')
      .select('id, nombre')
      .eq('is_active', true)
      .order('nombre');

    if (error) {
      console.error('Error fetching courses:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getCourses:', error);
    return { success: false, error: 'Failed to fetch courses' };
  }
});

// Get all empresas for dropdown
const getEmpresas = cache(async () => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('empresas')
      .select('id, razon_social')
      .order('razon_social');

    if (error) {
      console.error('Error fetching empresas:', error);
      return { success: false, error: error.message };
    }

    const transformedData = data?.map(empresa => ({
      id: empresa.id,
      nombre: empresa.razon_social
    })) || [];

    return { success: true, data: transformedData };
  } catch (error) {
    console.error('Error in getEmpresas:', error);
    return { success: false, error: 'Failed to fetch empresas' };
  }
});

// Export server actions
export async function getPlantillaCursosAction(page: number = 1, limit: number = 10, search: string = "") {
  return await getPlantillaCursos(page, limit, search);
}

export async function createPlantillaCursoAction(plantillaData: any) {
  return await createPlantillaCurso(plantillaData);
}

export async function updatePlantillaCursoAction(id: number, plantillaData: any) {
  return await updatePlantillaCurso(id, plantillaData);
}

export async function deletePlantillaCursoAction(id: number) {
  return await deletePlantillaCurso(id);
}

export async function getCoursesAction() {
  return await getCourses();
}

export async function getEmpresasAction() {
  return await getEmpresas();
}
