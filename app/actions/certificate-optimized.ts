"use server";

import { createClient } from "@/utils/supabase/server";
import { cache } from "react";

// Optimized cached server action for certificate data
const getOptimizedCertificateData = cache(async () => {
  try {
    const supabase = await createClient();

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_certificate_generation_data",
    );

    if (rpcError) {
      console.error("RPC error in getOptimizedCertificateData:", rpcError);
      throw new Error(`Failed to load certificate data: ${rpcError.message}`);
    }

    const row = rpcData?.[0];
    if (!row) {
      throw new Error("No data returned from get_certificate_generation_data");
    }

    // Build set of OSIs with certificates (as strings for safe comparison)
    const osisWithCertificates = new Set<string>();
    if (row.osis_with_certificates) {
      (row.osis_with_certificates as string[]).forEach((nroOsi: string) => {
        osisWithCertificates.add(nroOsi);
        const cleaned = nroOsi.replace(/[^\d]/g, "");
        if (cleaned) osisWithCertificates.add(cleaned);
      });
    }

    // Transform OSIs from the RPC result
    const transformedOSIs = (row.osis || []).map((osi: any) => ({
      id: osi.id_osi?.toString(),
      nro_osi: osi.nro_osi,
      cliente_nombre_empresa: osi.nombre_empresa || "",
      id_curso: osi.id_servicio,
      id_servicio: osi.id_servicio,
      empresa_id: osi.id_empresa,
      fecha_servicio: osi.fecha_inicio_real,
      is_active: true,
      tipo_servicio: osi.tipo_servicio || "Capacitaci\u00f3n",
      ejecutivo_negocios: osi.ejecutivo_negocios || null,
      direccion_fiscal: osi.direccion_fiscal || "",
      direccion_envio: osi.direccion_envio || "",
      direccion_ejecucion: osi.direccion_ejecucion || "",
      nro_sesiones: osi.sesiones_ejecucion,
      fecha_ejecucion1: osi.fecha_inicio_real,
      fecha_ejecucion2: osi.fecha_fin_real,
      fecha_emision: osi.fecha_emision,
      nro_horas: osi.horas_academicas_ejecucion,
      id_estado: osi.id_estado_direccion_ejecucion_efectiva,
      id_ciudad: osi.id_ciudad_direccion_ejecucion_efectiva,
      detalle_capacitacion: osi.contenido_servicio,
      codigo_cliente: osi.codigo_cliente,
      nro_presupuesto: osi.nro_presupuesto,
      curso_nombre: osi.servicio || null,
      has_certificates: (() => {
        if (!osi.nro_osi) return false;
        const nroOsiStr = osi.nro_osi.toString();
        if (osisWithCertificates.has(nroOsiStr)) return true;
        const cleanedNroOsi = nroOsiStr.replace(/[^\d]/g, "");
        if (cleanedNroOsi && osisWithCertificates.has(cleanedNroOsi))
          return true;
        if (cleanedNroOsi && cleanedNroOsi.length >= 3) {
          for (const certOsi of osisWithCertificates) {
            if (certOsi === cleanedNroOsi) return true;
          }
        }
        return false;
      })(),
    }));

    // Transform courses
    const transformedCourses = (row.courses || []).map((course: any) => ({
      id: course.id?.toString(),
      nombre: course.nombre,
      name: course.nombre,
      description: course.nombre,
      subtitulo: course.subtitulo || null,
      contenido_curso: course.contenido_curso || null,
      horas_estimadas: course.carga_horaria_std,
      nota_aprobatoria: course.nota_aprobatoria ?? 14,
      emite_carnet: course.emite_carnet ?? false,
    }));

    return {
      osis: transformedOSIs,
      courses: transformedCourses,
      signatures: row.signatures || [],
      activeCertificateTemplate: row.active_certificate_template || null,
      activeCarnetTemplate: row.active_carnet_template || null,
      allCertificateTemplates: row.all_certificate_templates || [],
      allCarnetTemplates: row.all_carnet_templates || [],
      error: null,
    };
  } catch (error) {
    console.error("Error in getOptimizedCertificateData:", error);
    return {
      osis: [],
      courses: [],
      signatures: [],
      activeCertificateTemplate: null,
      activeCarnetTemplate: null,
      allCertificateTemplates: [],
      allCarnetTemplates: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
});

export { getOptimizedCertificateData };
