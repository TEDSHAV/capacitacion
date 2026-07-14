"use server";

import { createClient } from '@/utils/supabase/server';
import { cache } from 'react';

// Get facilitator hours stats
const getFacilitatorHoursStats = cache(async (stateId?: string) => {
  const supabase = await createClient();
  
  try {
    let query = supabase
      .from('certificados')
      .select(`
        id_facilitador,
        id_curso,
        horas_estimadas,
        fecha_emision,
        cursos!inner(nombre),
        facilitadores!inner(nombre_apellido)
      `)
      .eq('estatus', 'emitido');
    
    if (stateId) {
      query = query.eq('facilitadores.id_estado_base', stateId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return { error: error.message, data: [] };
    }
    
    // Process data to calculate hours
    const facilitatorHoursMap = new Map();
    const facilitatorCourseMap = new Map();
    
    data?.forEach(cert => {
      const facilitatorId = cert.id_facilitador;
      const hours = cert.horas_estimadas || 0;
      
      // Accumulate hours per facilitator
      const currentHours = facilitatorHoursMap.get(facilitatorId) || 0;
      facilitatorHoursMap.set(facilitatorId, currentHours + hours);
      
      // Store course info
      if (!facilitatorCourseMap.has(facilitatorId)) {
        facilitatorCourseMap.set(facilitatorId, new Map());
      }
      const courseMap = facilitatorCourseMap.get(facilitatorId);
      courseMap.set(cert.id_curso, cert.cursos?.nombre || 'Unknown');
    });
    
    // Transform to expected format
    const result = Array.from(facilitatorHoursMap.entries()).map(([facilitatorId, totalHours]) => {
      const facilitatorRecord = data?.find(cert => cert.id_facilitador === facilitatorId);
      const facilitatorName = facilitatorRecord?.facilitadores?.[0]?.nombre_apellido || "Desconocido";
      const courses = Array.from(facilitatorCourseMap.get(facilitatorId)?.entries() || [])
        .map(([courseId, courseName]) => ({ courseId, courseName }));
      
      return {
        facilitatorId,
        facilitatorName,
        totalHours,
        totalCourses: courses.length,
        courses,
        certificateInfo: [] // Will be populated if needed
      };
    });
    
    return { data: result, error: null };
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Unknown error',
      data: [] 
    };
  }
});

// Get facilitator state stats
const getFacilitatorStateStats = cache(async (stateId?: string) => {
  const supabase = await createClient();
  
  try {
    // First get facilitadores with their basic info
    let query = supabase
      .from('facilitadores')
      .select(`
        id,
        id_estado_base,
        id_estado_geografico,
        nombre_apellido,
        cedula,
        email,
        is_active
      `);
    
    if (stateId) {
      query = query.eq('id_estado_base', stateId);
    }
    
    const { data: facilitadoresData, error } = await query;
    
    if (error) {
      return { error: error.message, data: [] };
    }
    
    // Get all states for complete list
    const { data: allStates } = await supabase
      .from('cat_estados_venezuela')
      .select('id, nombre_estado')
      .order('nombre_estado');
    
    // Process state statistics
    const stateStats = new Map();
    const geoStateStats = new Map();
    
    facilitadoresData?.forEach(facilitador => {
      // Count by base state
      if (facilitador.id_estado_base) {
        const current = stateStats.get(facilitador.id_estado_base) || 0;
        stateStats.set(facilitador.id_estado_base, current + 1);
      }
      
      // Count by geographic state
      if (facilitador.id_estado_geografico) {
        const current = geoStateStats.get(facilitador.id_estado_geografico) || 0;
        geoStateStats.set(facilitador.id_estado_geografico, current + 1);
      }
    });
    
    const statesWithCounts = (allStates || []).map(state => ({
      id: state.id,
      nombre_estado: state.nombre_estado,
      count: stateStats.get(state.id) || 0
    }));
    
    return { 
      data: {
        facilitadores: facilitadoresData || [],
        estadoStats: statesWithCounts
      }, 
      error: null 
    };
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Unknown error',
      data: { facilitadores: [], estadoStats: [] }
    };
  }
});

// Export server actions
export async function getFacilitatorHoursStatsAction(stateId?: string) {
  return await getFacilitatorHoursStats(stateId);
}

export async function getFacilitatorStateStatsAction(stateId?: string) {
  return await getFacilitatorStateStats(stateId);
}
