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
        fecha_emision,
        cursos!inner(
          nombre,
          horas_estimadas
        ),
        facilitadores!inner(
          nombre_apellido,
          id_estado_base,
          id_estado_geografico,
          is_active
        )
      `)
      .not('id_facilitador', 'is', null);
    
    if (stateId) {
      query = query.eq('facilitadores.id_estado_base', stateId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return { error: error.message, data: [] };
    }
    
    // Get all states for name lookup
    const { data: allStates } = await supabase
      .from('cat_estados_venezuela')
      .select('id, nombre_estado')
      .order('nombre_estado');
    
    // Process data to calculate hours
    const facilitatorHoursMap = new Map<number, number>();
    const facilitatorCourseMap = new Map<number, Map<number, { courseName: string; hours: number }>>();
    const facilitatorInfoMap = new Map<number, { nombre_apellido: string; id_estado_base: number | null; id_estado_geografico: number | null; is_active: boolean }>();
    
    // Helper function to get state name by ID
    const getStateName = (stateId: number | null) => {
      if (!stateId) return "No definido";
      const state = allStates?.find(s => s.id === stateId);
      return state?.nombre_estado || "No definido";
    };
    
    data?.forEach((cert: any) => {
      const facilitatorId = cert.id_facilitador;
      const courseData = cert.cursos;
      const facilitatorData = cert.facilitadores;
      const hours = courseData?.horas_estimadas || 0;
      
      // Store facilitator info
      if (!facilitatorInfoMap.has(facilitatorId) && facilitatorData) {
        facilitatorInfoMap.set(facilitatorId, {
          nombre_apellido: facilitatorData.nombre_apellido || "Desconocido",
          id_estado_base: facilitatorData.id_estado_base,
          id_estado_geografico: facilitatorData.id_estado_geografico,
          is_active: facilitatorData.is_active ?? true
        });
      }
      
      // Accumulate hours per facilitator
      const currentHours = facilitatorHoursMap.get(facilitatorId) || 0;
      facilitatorHoursMap.set(facilitatorId, currentHours + hours);
      
      // Store course info
      if (!facilitatorCourseMap.has(facilitatorId)) {
        facilitatorCourseMap.set(facilitatorId, new Map());
      }
      const courseMap = facilitatorCourseMap.get(facilitatorId);
      if (courseMap) {
        courseMap.set(cert.id_curso, {
          courseName: courseData?.nombre || 'Unknown',
          hours: hours
        });
      }
    });
    
    // Transform to expected format
    const result = Array.from(facilitatorHoursMap.entries()).map(([facilitatorId, totalHours]) => {
      const facilitatorInfo = facilitatorInfoMap.get(facilitatorId);
      const courseEntries = Array.from(facilitatorCourseMap.get(facilitatorId)?.entries() || []) as [number, { courseName: string; hours: number }][];
      
      return {
        facilitatorId,
        nombre_apellido: facilitatorInfo?.nombre_apellido || "Desconocido",
        is_active: facilitatorInfo?.is_active ?? true,
        estado_nombre: getStateName(facilitatorInfo?.id_estado_base || facilitatorInfo?.id_estado_geografico),
        estatus_nombre: facilitatorInfo?.is_active ? "Activo" : "Inactivo",
        totalHours: totalHours,
        totalCertificates: courseEntries.length,
        osiHours: 0, // OSI hours are calculated in the API route, not here
        totalCombinedHours: totalHours, // This will be updated with OSI hours if needed
        certificates: courseEntries.map(([courseId, courseData]) => ({
          nro_osi: 0, // Will be populated if needed
          course_name: courseData.courseName,
          hours: courseData.hours
        }))
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
    
    // Process state statistics - count ALL facilitadores first
    const stateStats = new Map();
    const geoStateStats = new Map();
    
    facilitadoresData?.forEach(facilitador => {
      // Always count by base state (even if null)
      const baseStateId = facilitador.id_estado_base || 0; // Default to 0 for null
      const current = stateStats.get(baseStateId) || 0;
      stateStats.set(baseStateId, current + 1);
      
      // Always count by geographic state (even if null)  
      const geoStateId = facilitador.id_estado_geografico || 0; // Default to 0 for null
      const currentGeo = geoStateStats.get(geoStateId) || 0;
      geoStateStats.set(geoStateId, currentGeo + 1);
    });
    
    // Combine counts for states that appear in both base and geographic
    const combinedStateStats = new Map();
    (allStates || []).forEach(state => {
      const baseCount = stateStats.get(state.id) || 0;
      const geoCount = geoStateStats.get(state.id) || 0;
      combinedStateStats.set(state.id, Math.max(baseCount, geoCount));
    });
    
    const statesWithCounts = (allStates || []).map(state => ({
      id: state.id,
      nombre_estado: state.nombre_estado,
      count: combinedStateStats.get(state.id) || 0
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
