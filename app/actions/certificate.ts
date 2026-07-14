"use server";

import { createClient } from '@/utils/supabase/server';

// Certificate OSI type matching the actual database schema
export interface CertificateOSI {
  id: string;
  nro_osi: string;
  nro_orden_compra?: string;
  tipo_servicio: string;
  nro_presupuesto?: string;
  ejecutivo_negocios: number;
  cliente_nombre_empresa: string;
  id_curso: number | null;
  fecha_servicio?: string;
  empresa_id: number;
  direccion_fiscal?: string;
  direccion_envio?: string;
  direccion_ejecucion?: string;
  nro_sesiones?: number;
  fecha_ejecucion1?: string;
  fecha_ejecucion2?: string;
  fecha_emision?: string;
  nro_horas?: number;
  costo_total?: number;
  detalle_capacitacion?: string;
  codigo_cliente?: number;
  is_active: boolean;
  curso_nombre?: string; // Added course name from join
}

export async function getCertificateData(options?: { osiLimit?: number; courseLimit?: number }) {
  try {
    console.log('Starting getCertificateData...');
    
    // Check environment variables first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlPrefix: supabaseUrl?.substring(0, 20) + '...'
    });
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    
    const supabase = await createClient();
    console.log('Supabase client created successfully');
    
    const { osiLimit = 50, courseLimit = 100 } = options || {};

    // Test basic table access first
    console.log('Testing osi table access...');
    const { data: osis, error: osiError } = await supabase
      .from("osi")
      .select("id, nro_osi")
      .limit(1);

    console.log('Table test result:', { osis, osiError });

    if (osiError) {
      console.error('Table access failed:', osiError);
      console.error('Error details:', {
        message: osiError.message,
        code: osiError.code,
        details: osiError.details,
        hint: osiError.hint
      });
      
      // Try to list available tables using a different approach
      try {
        console.log('Attempting to check database connection...');
        const { data: connectionTest } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .limit(5);
        
        console.log('Available tables (sample):', connectionTest);
      } catch (schemaError) {
        console.error('Could not check schema:', schemaError);
      }
      
      throw new Error(`Cannot access osi table: ${osiError.message}. This might be due to missing table or insufficient permissions.`);
    }

    console.log('Table access successful, fetching full data...');

    // Now try the full query using the osi table with all relevant fields
    const { data: fullOsis, error: fullOsiError } = await supabase
      .from("osi")
      .select(`
        id, 
        nro_osi, 
        nro_orden_compra,
        tipo_servicio,
        nro_presupuesto,
        ejecutivo_negocios,
        cliente_nombre_empresa,
        id_curso,
        fecha_ejecucion1,
        empresa_id,
        direccion_fiscal,
        direccion_envio,
        direccion_ejecucion,
        nro_sesiones,
        fecha_ejecucion2,
        fecha_emision,
        nro_horas,
        costo_total,
        detalle_capacitacion,
        codigo_cliente,
        is_active
      `)
      .eq("is_active", true)
      .order("nro_osi", { ascending: false })
      .limit(osiLimit);

    console.log('Full OSI Query Result:', { fullOsis, fullOsiError });

    if (fullOsiError) {
      throw fullOsiError;
    }

    console.log('OSI data loaded successfully, count:', fullOsis?.length || 0);

    // Create OSI data with actual table fields
    const transformedOSIs = (fullOsis || []).map((osi: any) => ({
      id: osi.id.toString(),
      nro_osi: osi.nro_osi,
      nro_orden_compra: osi.nro_orden_compra,
      tipo_servicio: osi.tipo_servicio,
      nro_presupuesto: osi.nro_presupuesto,
      ejecutivo_negocios: osi.ejecutivo_negocios,
      cliente_nombre_empresa: osi.cliente_nombre_empresa,
      id_curso: osi.id_curso,
      fecha_servicio: osi.fecha_ejecucion1,
      empresa_id: osi.empresa_id,
      direccion_fiscal: osi.direccion_fiscal || '',
      direccion_envio: osi.direccion_envio || '',
      direccion_ejecucion: osi.direccion_ejecucion || '',
      nro_sesiones: osi.nro_sesiones,
      fecha_ejecucion1: osi.fecha_ejecucion1,
      fecha_ejecucion2: osi.fecha_ejecucion2,
      fecha_emision: osi.fecha_emision,
      nro_horas: osi.nro_horas,
      costo_total: osi.costo_total,
      detalle_capacitacion: osi.detalle_capacitacion,
      detalle_sesion: undefined, // This field doesn't exist in osi table
      codigo_cliente: osi.codigo_cliente,
      is_active: osi.is_active,
      curso_nombre: 'Curso', // Placeholder - would need to join with cursos table
    }));

    // Test cursos table access
    console.log('Testing cursos table access...');
    const { data: cursosData, error: cursosError } = await supabase
      .from("cursos")
      .select("id, nombre")
      .limit(1);

    console.log('Cursos table test:', { cursosData, cursosError });

    if (cursosError) {
      console.error('Cursos table access failed:', cursosError);
      console.error('Error details:', {
        message: cursosError.message,
        code: cursosError.code,
        details: cursosError.details,
        hint: cursosError.hint
      });
      throw new Error(`Cannot access cursos table: ${cursosError.message}. This might be due to missing table or insufficient permissions.`);
    }

    // Fetch full cursos data
    const { data: fullCursosData, error: fullCursosError } = await supabase
      .from("cursos")
      .select("id, nombre, contenido, nota_aprobatoria, horas_estimadas, emite_carnet")
      .eq("is_active", true)
      .order("nombre", { ascending: true })
      .limit(courseLimit);

    console.log('Full Cursos Query Result:', { fullCursosData, fullCursosError });

    if (fullCursosError) {
      throw fullCursosError;
    }

    console.log('Cursos data loaded successfully, count:', fullCursosData?.length || 0);

    return {
      osis: transformedOSIs as CertificateOSI[],
      courseTopics: (fullCursosData || []).map((curso) => ({
        id: curso.id.toString(),
        nombre: curso.nombre,
        name: curso.nombre, // Add name field for compatibility
        description: curso.nombre,
        contenido_curso: curso.contenido,
        // cliente_asociado: curso.cliente_asociado, // Removed - column doesn't exist
        nota_aprobatoria: curso.nota_aprobatoria ?? 14, // Default to 14 if no nota_aprobatoria
        horas_estimadas: curso.horas_estimadas, // Add horas_estimadas from database
        emite_carnet: curso.emite_carnet, // Add emite_carnet field
      }))
    };

  } catch (error) {
    console.error('Detailed error in getCertificateData:', error);
    console.error('Error type:', typeof error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    return { error: error instanceof Error ? error.message : 'Error al cargar los datos' };
  }
}
