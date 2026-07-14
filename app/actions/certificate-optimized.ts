"use server";

import { createClient } from '@/utils/supabase/server';
import { cache } from 'react';
import { getSignaturesForDropdownAction } from './dropdown-data';

// Optimized cached server action for certificate data
const getOptimizedCertificateData = cache(async () => {
  try {
    const supabase = await createClient();
    
    // Parallel data fetching for better performance
    const [osisResult, coursesResult, signaturesResult] = await Promise.all([
      // Fetch OSIs with minimal fields needed for dropdown
      supabase
        .from("osi")
        .select(`
          id, 
          nro_osi, 
          cliente_nombre_empresa,
          id_curso,
          empresa_id,
          fecha_ejecucion1,
          is_active
        `)
        .eq("is_active", true)
        .order("nro_osi", { ascending: false })
        .limit(50),
      
      // Fetch courses with essential fields
      supabase
        .from("cursos")
        .select(`
          id, 
          nombre, 
          contenido, 
          nota_aprobatoria, 
          horas_estimadas, 
          emite_carnet,
          is_active
        `)
        .eq("is_active", true)
        .order("nombre", { ascending: true })
        .limit(100),
      
      // Get signatures for dropdown
      getSignaturesForDropdownAction()
    ]);

    // Handle OSI errors
    if (osisResult.error) {
      console.error('OSI fetch error:', osisResult.error);
      throw new Error(`Failed to load OSIs: ${osisResult.error.message}`);
    }

    // Handle courses errors
    if (coursesResult.error) {
      console.error('Courses fetch error:', coursesResult.error);
      throw new Error(`Failed to load courses: ${coursesResult.error.message}`);
    }

    console.log('🔍 Courses Debug:', {
      totalCourses: coursesResult.data?.length || 0,
      sampleCourses: coursesResult.data?.slice(0, 10) || [],
      courseIds: coursesResult.data?.map((c: any) => ({ id: c.id, name: c.nombre })) || [],
      'looking for course ID': 62,
      'course 62 exists': coursesResult.data?.some((c: any) => c.id === 62)
    });

    // Transform data efficiently
    const transformedOSIs = (osisResult.data || []).map((osi: any) => ({
      id: osi.id.toString(),
      nro_osi: osi.nro_osi,
      cliente_nombre_empresa: osi.cliente_nombre_empresa,
      id_curso: osi.id_curso,
      empresa_id: osi.empresa_id,
      fecha_servicio: osi.fecha_ejecucion1,
      is_active: osi.is_active,
      // Minimal additional fields for certificate generation
      tipo_servicio: 'Capacitación',
      ejecutivo_negocios: 0,
      direccion_fiscal: '',
      direccion_envio: '',
      direccion_ejecucion: '',
      nro_sesiones: null,
      fecha_ejecucion1: osi.fecha_ejecucion1,
      fecha_ejecucion2: null,
      fecha_emision: null,
      nro_horas: null,
      costo_total: null,
      detalle_capacitacion: osi.detalle_capacitacion,
      codigo_cliente: null,
      curso_nombre: osi.detalle_capacitacion || 'N/A - Sin curso especificado',
    }));

    const transformedCourses = (coursesResult.data || []).map((course: any) => ({
      id: course.id.toString(),
      nombre: course.nombre,
      name: course.nombre, // For compatibility
      description: course.nombre,
      contenido_curso: course.contenido,
      // cliente_asociado: course.cliente_asociado, // Removed - column doesn't exist
      nota_aprobatoria: course.nota_aprobatoria ?? 14,
      horas_estimadas: course.horas_estimadas,
      emite_carnet: course.emite_carnet,
    }));

    return {
      osis: transformedOSIs,
      courses: transformedCourses,
      signatures: signaturesResult.data || [],
      error: null,
    };

  } catch (error) {
    console.error('Error in getOptimizedCertificateData:', error);
    return {
      osis: [],
      courses: [],
      signatures: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
});

export { getOptimizedCertificateData };
