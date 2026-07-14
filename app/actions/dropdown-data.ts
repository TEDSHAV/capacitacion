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

// Export server actions
export async function getSignaturesForDropdownAction() {
  return await getSignaturesForDropdown();
}

export async function getCertificateTemplatesAction() {
  return await getCertificateTemplates();
}

export async function getCertificateTemplatesByCourseAction(courseId?: string) {
  return await getCertificateTemplatesByCourse(courseId);
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
