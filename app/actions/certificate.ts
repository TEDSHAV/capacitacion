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
  tema?: string;
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
}

export async function getCertificateData(options?: { osiLimit?: number; courseLimit?: number }) {
  try {
    const supabase = await createClient();
    const { osiLimit = 50, courseLimit = 100 } = options || {};

    // Fetch OSIs with pagination - include empresa_id and id_curso
    const { data: osis, error: osiError } = await supabase
      .from("osi")
      .select("id, nro_osi, cliente_nombre_empresa, tema, id_curso, is_active, empresa_id")
      .eq("is_active", true)
      .order("nro_osi", { ascending: false })
      .limit(osiLimit);

    console.log('OSI Query Result:', { osis, osiError }); // Debug log

    if (osiError) {
      throw osiError;
    }

    // Fetch cursos with pagination and only necessary fields
    const { data: cursosData, error: cursosError } = await supabase
      .from("cursos")
      .select("id, nombre, contenido, cliente_asociado, nota_aprobatoria, horas_estimadas, emite_carnet")
      .eq("is_active", true)
      .order("nombre", { ascending: true })
      .limit(courseLimit);

    if (cursosError) {
      throw cursosError;
    }

    return {
      osis: (osis || []) as CertificateOSI[],
      courseTopics: (cursosData || []).map((curso) => ({
        id: curso.id.toString(),
        nombre: curso.nombre,
        name: curso.nombre, // Add name field for compatibility
        description: curso.nombre,
        contenido_curso: curso.contenido,
        cliente_asociado: curso.cliente_asociado,
        nota_aprobatoria: curso.nota_aprobatoria ?? 14, // Default to 14 if no nota_aprobatoria
        horas_estimadas: curso.horas_estimadas, // Add horas_estimadas from database
        emite_carnet: curso.emite_carnet, // Add emite_carnet field
      }))
    };

  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error al cargar los datos' };
  }
}
