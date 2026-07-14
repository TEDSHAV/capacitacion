"use server";

import { createClient } from '@/utils/supabase/server';
import { cache } from 'react';

// Get signatures for dropdown
const getSignaturesForDropdown = cache(async () => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('firmas')
      .select('id, nombre, tipo, url_imagen, is_active')
      .eq('is_active', true)
      .order('nombre');
    
    if (error) {
      return { error: error.message, data: [] };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Unknown error',
      data: [] 
    };
  }
});

// Get certificate templates
const getCertificateTemplates = cache(async () => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('plantillas_certificados')
      .select('*')
      .eq('is_active', true)
      .order('nombre');
    
    if (error) {
      return { error: error.message, data: [] };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Unknown error',
      data: [] 
    };
  }
});

// Get carnet templates
const getCarnetTemplates = cache(async () => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('plantillas_carnets')
      .select('*')
      .eq('is_active', true)
      .order('nombre');
    
    if (error) {
      return { error: error.message, data: [] };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Unknown error',
      data: [] 
    };
  }
});

// Get Venezuelan states
const getVenezuelanStates = cache(async () => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('cat_estados_venezuela')
      .select('*')
      .order('nombre_estado');
    
    if (error) {
      return { error: error.message, data: [] };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Unknown error',
      data: [] 
    };
  }
});

// Get course topics
const getCourseTopics = cache(async () => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('temas_cursos')
      .select('*')
      .order('nombre');
    
    if (error) {
      return { error: error.message, data: [] };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Unknown error',
      data: [] 
    };
  }
});

// Get certificate templates filtered by course
const getCertificateTemplatesByCourse = cache(async (courseId?: string) => {
  const supabase = await createClient();
  
  try {
    // For now, get all active templates
    // In the future, this can be enhanced to filter by course when the relationship is established
    let query = supabase
      .from('plantillas_certificados')
      .select('*')
      .eq('is_active', true)
      .order('nombre');
    
    // If courseId is provided, we could add filtering logic here
    // For now, we'll return all templates and let the frontend handle the filtering
    // based on course-specific preferences or business logic
    
    const { data, error } = await query;
    
    if (error) {
      return { error: error.message, data: [] };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Unknown error',
      data: [] 
    };
  }
});

// Test function to check if plantillas_cursos has any data
const getCourseTemplatesTest = cache(async () => {
  const supabase = await createClient();
  
  try {
    console.log('🧪 Testing plantillas_cursos table...');
    
    // Get all records without any filters
    const { data: allData, error: allError } = await supabase
      .from('plantillas_cursos')
      .select('*');
    
    console.log('📊 All plantillas_cursos data:', { allData, allError });
    
    // Get only active records
    const { data: activeData, error: activeError } = await supabase
      .from('plantillas_cursos')
      .select('*')
      .eq('is_active', true);
    
    console.log('📊 Active plantillas_cursos data:', { activeData, activeError });
    
    return { allData, activeData, allError, activeError };
  } catch (err) {
    console.error('💥 Error in test function:', err);
    return { error: err };
  }
});

// Get course templates (plantillas_cursos) filtered by course and client
const getCourseTemplatesByOSI = cache(async (courseId?: string, osiCompanyId?: number) => {
  const supabase = await createClient();
  
  try {
    console.log('🔍 getCourseTemplatesByOSI called with:', { courseId, osiCompanyId });
    
    if (!courseId) {
      // If no course selected, return all active templates
      console.log('📋 Loading all active course templates');
      let query = supabase
        .from('plantillas_cursos')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      console.log('📊 All templates query result:', { data: data?.length || 0, error });
      
      if (error) {
        console.error('❌ Error in all templates query:', error);
        return { error: error.message, data: [] };
      }
      
      console.log('✅ Returning all templates:', data?.length || 0);
      return { data: data || [], error: null };
    }

    // Get course details to find the associated client
    console.log('🔍 Fetching course details for courseId:', courseId);
    const { data: courseData, error: courseError } = await supabase
      .from('cursos')
      .select('cliente_asociado')
      .eq('id', parseInt(courseId))
      .single();
    
    console.log('📊 Course data result:', { courseData, courseError });
    
    if (courseError && courseError.code !== 'PGRST116') {
      console.error('❌ Error fetching course:', courseError);
    }
    
    const clientId = courseData?.cliente_asociado;
    console.log('🎯 Course client ID:', clientId);

    // Build query to get templates that are:
    // 1. Related to this specific course (id_curso = courseId)
    // 2. OR general templates (id_curso IS NULL AND id_empresa IS NULL)
    // 3. OR templates for this specific client (id_empresa = clientId)
    // 4. Must be active
    let query = supabase
      .from('plantillas_cursos')
      .select('*')
      .eq('is_active', true);
    
    const orConditions = [`id_curso.eq.${courseId}`]; // Course-specific templates
    orConditions.push('id_curso.is.null,id_empresa.is.null'); // General templates
    
    if (clientId) {
      orConditions.push(`id_empresa.eq.${clientId}`); // Client-specific templates
    }
    
    console.log('🔧 OR conditions:', orConditions);
    
    query = query.or(orConditions.join(','));
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    console.log('📊 Filtered templates query result:', { data: data?.length || 0, error });
    
    if (error) {
      console.error('❌ Error in filtered templates query:', error);
      return { error: error.message, data: [] };
    }
    
    console.log('✅ Returning filtered templates:', data?.length || 0);
    return { data: data || [], error: null };
  } catch (err) {
    console.error('💥 Unexpected error in getCourseTemplatesByOSI:', err);
    return { 
      error: err instanceof Error ? err.message : 'Unknown error',
      data: [] 
    };
  }
});

// Export server actions
export async function getSignaturesForDropdownAction() {
  return await getSignaturesForDropdown();
}

export async function getCertificateTemplatesAction() {
  return await getCertificateTemplates();
}

export async function getCarnetTemplatesAction() {
  return await getCarnetTemplates();
}

export async function getActiveTemplateAction(templateType: 'certificate' | 'carnet') {
  const { getActiveTemplate } = await import('./template-actions');
  return await getActiveTemplate(templateType);
}

export async function getCertificateTemplatesByCourseAction(courseId?: string) {
  return await getCertificateTemplatesByCourse(courseId);
}

export async function getCourseTemplatesTestAction() {
  return await getCourseTemplatesTest();
}

export async function getCourseTemplatesByOSIAction(courseId?: string, osiCompanyId?: number) {
  return await getCourseTemplatesByOSI(courseId, osiCompanyId);
}

export async function getVenezuelanStatesAction() {
  return await getVenezuelanStates();
}

export async function getCourseTopicsAction() {
  return await getCourseTopics();
}

// Get technical services from catalogo_servicios where id_departamento_ejecutante = 4
const getTechnicalServices = cache(async () => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('catalogo_servicios')
      .select('*')
      .eq('id_departamento_ejecutante', 4)
      .order('nombre');
    
    if (error) {
      return { error: error.message, data: [] };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Unknown error',
      data: [] 
    };
  }
});

export async function getTechnicalServicesAction() {
  return await getTechnicalServices();
}
