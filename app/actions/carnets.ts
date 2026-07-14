"use server";

import { createClient } from '@/utils/supabase/server';
import { Carnet, CarnetGeneration, CarnetFilters, CarnetSearchResult, CarnetRelationships } from '@/types';
import { QRService } from '@/lib/qr-service';

export async function saveCarnetsToDatabase(
  carnetData: CarnetGeneration[],
  certificateIds: number[]
): Promise<{ success: boolean; message: string; carnetIds?: number[] }> {
  try {
    console.log('💾 saveCarnetsToDatabase called with:', {
      carnetCount: carnetData.length,
      certificateCount: certificateIds.length,
      firstCarnet: carnetData[0],
      firstCertificateId: certificateIds[0]
    });

    const supabase = await createClient();
    
    if (carnetData.length !== certificateIds.length) {
      console.error('❌ Mismatch between carnets and certificates');
      return {
        success: false,
        message: "Number of carnets must match number of certificates"
      };
    }

    const carnetIds: number[] = [];

    // Process all carnets in parallel for much faster preparation
    const carnetPromises = carnetData.map(async (carnet, i) => {
      const certificateId = certificateIds[i];
      try {
        // Generate QR code for carnet verification
        const qrData = QRService.generateQRData(certificateId);
        const qrDataURL = await QRService.generateQRDataURL({
          data: qrData,
          size: 150,
          level: 'M',
          includeMargin: true
        });

        // Create snapshot content for carnet
        const snapshotContent = JSON.stringify({
          ...carnet,
          qr_code: qrDataURL,
          generated_at: new Date().toISOString()
        });

        return {
          id_certificado: certificateId,
          id_participante: carnet.id_participante,
          id_empresa: carnet.id_empresa,
          id_curso: carnet.id_curso,
          id_osi: carnet.id_osi,
          titulo_curso: carnet.titulo_curso,
          fecha_emision: carnet.fecha_emision,
          fecha_vencimiento: carnet.fecha_vencimiento,
          nombre_participante: carnet.nombre_participante,
          cedula_participante: carnet.cedula_participante,
          empresa_participante: carnet.empresa_participante,
          qr_code: qrDataURL,
          snapshot_contenido: snapshotContent,
          is_active: true
        };
      } catch (err) {
        console.error(`💥 Error preparing carnet data for participant ${carnet.nombre_participante}:`, err);
        throw err;
      }
    });

    const preparedCarnets = await Promise.all(carnetPromises);

    console.log('💾 Inserting carnets in bulk into database...');
    const { data, error } = await supabase
      .from('carnets')
      .insert(preparedCarnets)
      .select('id');

    if (error) {
      console.error('❌ Database error bulk inserting carnets:', error);
      return {
        success: false,
        message: `Error saving carnets: ${error.message}`
      };
    }

    if (data) {
      // Map returned data to IDs correctly
      const ids = data.map(row => row.id);
      console.log(`✅ ${ids.length} carnets saved with IDs:`, ids);
      
      return {
        success: true,
        message: `Successfully saved ${ids.length} carnets`,
        carnetIds: ids
      };
    }

    return {
      success: true,
      message: `Successfully saved ${preparedCarnets.length} carnets`,
      carnetIds: []
    };

  } catch (error) {
    console.error('💥 Critical error in saveCarnetsToDatabase:', error);
    return {
      success: false,
      message: 'Unexpected error saving carnets to database'
    };
  }
}

export async function getCarnetsByFilters(
  filters: CarnetFilters = {}
): Promise<{ success: boolean; data?: CarnetSearchResult; error?: string }> {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('carnets')
      .select(`
        *,
        certificado:certificados(
          id,
          calificacion,
          created_at,
          fecha_emision,
          fecha_vencimiento,
          nro_libro,
          nro_hoja,
          nro_linea,
          nro_control,
          qr_code
        ),
        participante:participantes_certificados(
          id,
          nombre,
          cedula,
          nacionalidad,
          empresa_actual
        ),
        empresa:empresas(
          id,
          razon_social,
          rif,
          direccion_fiscal
        ),
        curso:cursos(
          id,
          nombre,
          contenido,
          horas_estimadas,
          emite_carnet
        ),
        osi:osi(
          id,
          nro_osi,
          nro_orden_compra,
          tipo_servicio,
          ejecutivo_negocios,
          cliente_nombre_empresa,
          estado,
          fecha_ejecucion1
        )
      `);

    // Apply filters
    if (filters.searchTerm) {
      query = query.or(`
        nombre_participante.ilike.%${filters.searchTerm}%,
        cedula_participante.ilike.%${filters.searchTerm}%,
        titulo_curso.ilike.%${filters.searchTerm}%,
        empresa_participante.ilike.%${filters.searchTerm}%
      `);
    }

    if (filters.companyId) {
      query = query.eq('id_empresa', filters.companyId);
    }

    if (filters.courseId) {
      query = query.eq('id_curso', filters.courseId);
    }

    if (filters.osiId) {
      query = query.eq('id_osi', filters.osiId);
    }

    if (filters.participantId) {
      query = query.eq('id_participante', filters.participantId);
    }

    if (filters.dateFrom) {
      query = query.gte('fecha_emision', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('fecha_emision', filters.dateTo);
    }

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters.hasExpirationDate) {
      query = query.not('fecha_vencimiento', 'is', null);
    }

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('carnets')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting carnets count:', countError);
      return {
        success: false,
        error: 'Error getting carnets count'
      };
    }

    // Execute main query
    const { data: carnets, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching carnets:', error);
      return {
        success: false,
        error: 'Error fetching carnets'
      };
    }

    return {
      success: true,
      data: {
        carnets: carnets as Carnet[],
        totalCount: totalCount || 0
      }
    };

  } catch (error) {
    console.error('Error in getCarnetsByFilters:', error);
    return {
      success: false,
      error: 'Unexpected error fetching carnets'
    };
  }
}

export async function getCarnetById(
  id: number
): Promise<{ success: boolean; data?: Carnet; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('carnets')
      .select(`
        *,
        certificado:certificados(
          id,
          calificacion,
          created_at,
          fecha_emision,
          fecha_vencimiento,
          nro_libro,
          nro_hoja,
          nro_linea,
          nro_control,
          qr_code
        ),
        participante:participantes_certificados(
          id,
          nombre,
          cedula,
          nacionalidad,
          empresa_actual
        ),
        empresa:empresas(
          id,
          razon_social,
          rif,
          direccion_fiscal
        ),
        curso:cursos(
          id,
          nombre,
          contenido,
          horas_estimadas,
          emite_carnet
        ),
        osi:osi(
          id,
          nro_osi,
          nro_orden_compra,
          tipo_servicio,
          ejecutivo_negocios,
          cliente_nombre_empresa,
          estado,
          fecha_ejecucion1
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching carnet:', error);
      return {
        success: false,
        error: 'Error fetching carnet'
      };
    }

    return {
      success: true,
      data: data as Carnet
    };

  } catch (error) {
    console.error('Error in getCarnetById:', error);
    return {
      success: false,
      error: 'Unexpected error fetching carnet'
    };
  }
}

export async function getCarnetsByCertificateId(
  certificateId: number
): Promise<{ success: boolean; data?: Carnet[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('carnets')
      .select(`
        *,
        certificado:certificados(
          id,
          calificacion,
          created_at,
          fecha_emision,
          fecha_vencimiento,
          nro_libro,
          nro_hoja,
          nro_linea,
          nro_control,
          qr_code
        ),
        participante:participantes_certificados(
          id,
          nombre,
          cedula,
          nacionalidad,
          empresa_actual
        ),
        empresa:empresas(
          id,
          razon_social,
          rif,
          direccion_fiscal
        ),
        curso:cursos(
          id,
          nombre,
          contenido,
          horas_estimadas,
          emite_carnet
        ),
        osi:osi(
          id,
          nro_osi,
          nro_orden_compra,
          tipo_servicio,
          ejecutivo_negocios,
          cliente_nombre_empresa,
          estado,
          fecha_ejecucion1
        )
      `)
      .eq('id_certificado', certificateId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching carnets by certificate ID:', error);
      return {
        success: false,
        error: 'Error fetching carnets by certificate ID'
      };
    }

    return {
      success: true,
      data: data as Carnet[]
    };

  } catch (error) {
    console.error('Error in getCarnetsByCertificateId:', error);
    return {
      success: false,
      error: 'Unexpected error fetching carnets by certificate ID'
    };
  }
}

export async function getCarnetsRelationships(
  osiId: number
): Promise<{ success: boolean; data?: CarnetRelationships; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get all related data for the OSI
    const [certificatesResult, carnetsResult, osiResult, participantsResult, companiesResult, coursesResult] = await Promise.all([
      // Get certificates for this OSI
      supabase
        .from('certificados')
        .select(`
          *,
          participante:participantes_certificados(
            id,
            nombre,
            cedula,
            nacionalidad,
            empresa_actual
          ),
          empresa:empresas(
            id,
            razon_social,
            rif,
            direccion_fiscal
          ),
          curso:cursos(
            id,
            nombre,
            contenido,
            horas_estimadas,
            emite_carnet
          )
        `)
        .eq('nro_osi', osiId)
        .order('created_at', { ascending: false }),
      
      // Get carnets for this OSI
      supabase
        .from('carnets')
        .select(`
          *,
          participante:participantes_certificados(
            id,
            nombre,
            cedula,
            nacionalidad,
            empresa_actual
          ),
          empresa:empresas(
            id,
            razon_social,
            rif,
            direccion_fiscal
          ),
          curso:cursos(
            id,
            nombre,
            contenido,
            horas_estimadas,
            emite_carnet
          )
        `)
        .eq('id_osi', osiId)
        .order('created_at', { ascending: false }),
      
      // Get OSI details
      supabase
        .from('osi')
        .select(`
          *,
          empresa:empresas(
            id,
            razon_social,
            rif,
            direccion_fiscal
          ),
          curso:cursos(
            id,
            nombre,
            contenido,
            horas_estimadas,
            emite_carnet
          )
        `)
        .eq('id', osiId)
        .single(),
      
      // Get all participants for this OSI
      supabase
        .from('participantes_certificados')
        .select('*')
        .order('nombre'),
      
      // Get all companies
      supabase
        .from('empresas')
        .select('*')
        .order('razon_social'),
      
      // Get all courses
      supabase
        .from('cursos')
        .select('*')
        .order('nombre')
    ]);

    if (certificatesResult.error || carnetsResult.error || osiResult.error || 
        participantsResult.error || companiesResult.error || coursesResult.error) {
      return {
        success: false,
        error: 'Error fetching relationship data'
      };
    }

    const relationships: CarnetRelationships = {
      certificates: certificatesResult.data || [],
      carnets: carnetsResult.data || [],
      osi: osiResult.data,
      participants: participantsResult.data || [],
      companies: companiesResult.data || [],
      courses: coursesResult.data || []
    };

    return {
      success: true,
      data: relationships
    };

  } catch (error) {
    console.error('Error in getCarnetsRelationships:', error);
    return {
      success: false,
      error: 'Unexpected error fetching relationship data'
    };
  }
}

export async function updateCarnetStatus(
  id: number,
  isActive: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('carnets')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      console.error('Error updating carnet status:', error);
      return {
        success: false,
        message: `Error updating carnet status: ${error.message}`
      };
    }

    return {
      success: true,
      message: `Carnet ${isActive ? 'activated' : 'deactivated'} successfully`
    };

  } catch (error) {
    console.error('Error in updateCarnetStatus:', error);
    return {
      success: false,
      message: 'Unexpected error updating carnet status'
    };
  }
}

export async function deleteCarnet(
  id: number
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('carnets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting carnet:', error);
      return {
        success: false,
        message: `Error deleting carnet: ${error.message}`
      };
    }

    return {
      success: true,
      message: 'Carnet deleted successfully'
    };

  } catch (error) {
    console.error('Error in deleteCarnet:', error);
    return {
      success: false,
      message: 'Unexpected error deleting carnet'
    };
  }
}
