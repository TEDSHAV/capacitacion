"use server";

import { createClient } from '@/utils/supabase/server';
import { cache } from 'react';
import { getSignaturesForDropdownAction } from './dropdown-data';

// Optimized cached server action for certificate data
const getOptimizedCertificateData = cache(async () => {
  try {
    const supabase = await createClient();
    
    // Parallel data fetching for better performance
    const [osisResult, coursesResult, cursosResult, signaturesResult] = await Promise.all([
      // Fetch OSIs from the execution view with all fields needed for certificate generation
      supabase
        .from("v_osi_formato_completo")
        .select(`
          id_osi,
          nro_osi,
          nombre_empresa,
          id_empresa,
          id_servicio,
          servicio,
          tipo_servicio,
          ejecutivo_negocios,
          fecha_inicio_real,
          fecha_fin_real,
          fecha_emision,
          horas_academicas_ejecucion,
          sesiones_ejecucion,
          direccion_ejecucion,
          direccion_envio,
          direccion_fiscal,
          contenido_servicio,
          codigo_cliente,
          nro_presupuesto,
          id_estatus
        `)
        .order("nro_osi", { ascending: false })
        .limit(100),
      
      // Fetch courses from catalogo_servicios — matches id_servicio in the view
      supabase
        .from("catalogo_servicios")
        .select(`
          id,
          nombre,
          contenido_curso,
          carga_horaria_std,
          esta_activo,
          cliente_asociado
        `)
        .eq("esta_activo", true)
        .order("nombre", { ascending: true })
        .limit(200),
      
      // Fetch cursos for nota_aprobatoria and emite_carnet (no FK to catalogo_servicios; merged by nombre)
      supabase
        .from("cursos")
        .select(`id, nombre, contenido, nota_aprobatoria, emite_carnet`)
        .eq("is_active", true),

      // Get signatures for dropdown
      getSignaturesForDropdownAction()
    ]);

    // Handle OSI errors
    if (osisResult.error) {
      console.error('OSI fetch error:', osisResult.error);
      throw new Error(`Failed to load OSIs from v_osi_formato_completo: ${osisResult.error.message}`);
    }

    // Handle courses errors
    if (coursesResult.error) {
      console.error('Courses fetch error:', coursesResult.error);
      throw new Error(`Failed to load courses: ${coursesResult.error.message}`);
    }

    if (cursosResult.error) {
      console.error('Cursos fetch error:', cursosResult.error);
    }

    // Build a nombre-keyed map from cursos for O(1) enrichment lookups
    // Stores cursos.id so FK constraints on certificados and carnets are satisfied
    const cursosByNombre = new Map<string, { id: number; contenido: string | null; nota_aprobatoria: number | null; emite_carnet: boolean | null }>(
      (cursosResult.data || []).map((c: any) => [
        (c.nombre as string).toLowerCase(),
        { id: c.id, contenido: c.contenido, nota_aprobatoria: c.nota_aprobatoria, emite_carnet: c.emite_carnet },
      ])
    );

    // Handle signatures errors
    if (signaturesResult.error) {
      console.error('Signatures fetch error:', signaturesResult.error);
      throw new Error(`Failed to load signatures: ${signaturesResult.error}`);
    }

    // Transform v_osi_formato_completo rows into CertificateOSI shape
    const transformedOSIs = (osisResult.data || []).map((osi: any) => ({
      id: osi.id_osi.toString(),
      nro_osi: osi.nro_osi,
      cliente_nombre_empresa: osi.nombre_empresa || '',
      // id_servicio from catalogo_servicios is the direct course identifier
      id_curso: osi.id_servicio,
      id_servicio: osi.id_servicio,
      empresa_id: osi.id_empresa,
      fecha_servicio: osi.fecha_inicio_real,
      is_active: true, // All records returned by the view are valid executions
      tipo_servicio: osi.tipo_servicio || 'Capacitación',
      ejecutivo_negocios: osi.ejecutivo_negocios || null,
      direccion_fiscal: osi.direccion_fiscal || '',
      direccion_envio: osi.direccion_envio || '',
      direccion_ejecucion: osi.direccion_ejecucion || '',
      nro_sesiones: osi.sesiones_ejecucion,
      fecha_ejecucion1: osi.fecha_inicio_real,
      fecha_ejecucion2: osi.fecha_fin_real,
      fecha_emision: osi.fecha_emision,
      nro_horas: osi.horas_academicas_ejecucion,
      detalle_capacitacion: osi.contenido_servicio,
      codigo_cliente: osi.codigo_cliente,
      nro_presupuesto: osi.nro_presupuesto,
      curso_nombre: osi.servicio || null,
    }));

    const transformedCourses = (coursesResult.data || []).map((course: any) => {
      const cursoMatch = cursosByNombre.get((course.nombre as string).toLowerCase());
      return {
        id: course.id.toString(),                       // catalogo_servicios.id — for OSI matching
        cursos_id: cursoMatch?.id ?? null,              // cursos.id — for certificados/carnets FK
        nombre: course.nombre,
        name: course.nombre,
        description: course.nombre,
        // Prefer catalogo_servicios.contenido_curso; fall back to cursos.contenido
        contenido_curso: course.contenido_curso || cursoMatch?.contenido || null,
        horas_estimadas: course.carga_horaria_std,
        nota_aprobatoria: cursoMatch?.nota_aprobatoria ?? 14,
        emite_carnet: cursoMatch?.emite_carnet ?? false,
      };
    });

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
