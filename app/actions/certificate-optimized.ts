"use server";

import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import { getSignaturesForDropdownAction } from "./dropdown-data";

// Optimized cached server action for certificate data
const getOptimizedCertificateData = cache(async () => {
  try {
    const supabase = await createClient();

    // Parallel data fetching for better performance
    const [
      osisResult,
      coursesResult,
      cursosResult,
      signaturesResult,
      certificatesResult,
    ] = await Promise.all([
      // Fetch OSIs from the execution view with all fields needed for certificate generation
      supabase
        .from("v_osi_formato_completo")
        .select(
          `
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
          id_direccion_ejecucion_real,
          id_estado_direccion_ejecucion_efectiva,
          contenido_servicio,
          codigo_cliente,
          nro_presupuesto,
          id_estatus
        `,
        )
        .order("nro_osi", { ascending: false })
        .limit(1000),

      // Fetch courses from catalogo_servicios — matches id_servicio in the view
      supabase
        .from("catalogo_servicios")
        .select(
          `
          id,
          nombre,
          contenido_curso,
          carga_horaria_std,
          esta_activo,
          cliente_asociado
        `,
        )
        .eq("esta_activo", true)
        .order("nombre", { ascending: true })
        .limit(200),

      // Fetch cursos for nota_aprobatoria, emite_carnet, and horas_estimadas (no FK to catalogo_servicios; merged by nombre)
      supabase
        .from("cursos")
        .select(
          `id, nombre, contenido, nota_aprobatoria, emite_carnet, horas_estimadas`,
        )
        .eq("is_active", true),

      // Get signatures for dropdown
      getSignaturesForDropdownAction(),

      // Fetch distinct nro_osi from certificados to identify OSIs with existing certificates
      // We increase the limit to 5000 and order by ID descending to get the most recent ones
      supabase
        .from("certificados")
        .select("nro_osi")
        .not("nro_osi", "is", null)
        .eq("is_active", true)
        .order("id", { ascending: false })
        .limit(5000),
    ]);

    // Handle OSI errors
    if (osisResult.error) {
      console.error("OSI fetch error:", osisResult.error);
      throw new Error(
        `Failed to load OSIs from v_osi_formato_completo: ${osisResult.error.message}`,
      );
    }

    // Handle certificates error
    if (certificatesResult.error) {
      console.error(
        "Certificates fetch error for badge status:",
        certificatesResult.error,
      );
    }

    // Set of OSIs that already have certificates (as strings for safe comparison)
    // We store both the raw value and the cleaned numeric-only value for maximum compatibility
    const osisWithCertificates = new Set<string>();
    if (certificatesResult.data) {
      certificatesResult.data.forEach((c: any) => {
        if (c.nro_osi) {
          const raw = c.nro_osi.toString();
          osisWithCertificates.add(raw);

          const cleaned = raw.replace(/[^\d]/g, "");
          if (cleaned) osisWithCertificates.add(cleaned);
        }
      });
    }

    // Handle courses errors
    if (coursesResult.error) {
      console.error("Courses fetch error:", coursesResult.error);
      throw new Error(`Failed to load courses: ${coursesResult.error.message}`);
    }

    if (cursosResult.error) {
      console.error("Cursos fetch error:", cursosResult.error);
    }

    // Build a nombre-keyed map from cursos for O(1) enrichment lookups
    // Stores cursos.id so FK constraints on certificados and carnets are satisfied
    // Note: If there are multiple cursos with the same nombre, only the last one will be kept
    // cursos.contenido is the authoritative content source; catalogo_servicios.contenido_curso is a fallback
    // cursos.horas_estimadas is the authoritative duration source; catalogo_servicios.carga_horaria_std is a fallback
    const cursosByNombre = new Map<
      string,
      {
        id: number;
        contenido: string | null;
        nota_aprobatoria: number | null;
        emite_carnet: boolean | null;
        horas_estimadas: number | null;
      }
    >(
      (cursosResult.data || []).map((c: any) => [
        (c.nombre as string).toLowerCase(),
        {
          id: c.id,
          contenido: c.contenido,
          nota_aprobatoria: c.nota_aprobatoria,
          emite_carnet: c.emite_carnet,
          horas_estimadas: c.horas_estimadas,
        },
      ]),
    );

    // Log warning if there are duplicate course names
    const nombres = (cursosResult.data || []).map((c: any) =>
      (c.nombre as string).toLowerCase(),
    );
    const uniqueNombres = new Set(nombres);
    if (nombres.length !== uniqueNombres.size) {
      console.warn(
        `⚠️  Found ${nombres.length - uniqueNombres.size} duplicate course names in cursos table. This may cause incorrect content matching.`,
      );
    }

    // Handle signatures errors
    if (signaturesResult.error) {
      console.error("Signatures fetch error:", signaturesResult.error);
      throw new Error(`Failed to load signatures: ${signaturesResult.error}`);
    }

    // Transform v_osi_formato_completo rows into CertificateOSI shape
    const transformedOSIs = (osisResult.data || []).map((osi: any) => ({
      id: osi.id_osi.toString(),
      nro_osi: osi.nro_osi,
      cliente_nombre_empresa: osi.nombre_empresa || "",
      // id_servicio from catalogo_servicios is the direct course identifier
      id_curso: osi.id_servicio,
      id_servicio: osi.id_servicio,
      empresa_id: osi.id_empresa,
      fecha_servicio: osi.fecha_inicio_real,
      is_active: true, // All records returned by the view are valid executions
      tipo_servicio: osi.tipo_servicio || "Capacitación",
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
      detalle_capacitacion: osi.contenido_servicio,
      codigo_cliente: osi.codigo_cliente,
      nro_presupuesto: osi.nro_presupuesto,
      curso_nombre: osi.servicio || null,
      has_certificates: (() => {
        if (!osi.nro_osi) return false;

        const nroOsiStr = osi.nro_osi.toString();

        // 1. Try direct match
        if (osisWithCertificates.has(nroOsiStr)) return true;

        // 2. Try cleaned match (numeric only)
        const cleanedNroOsi = nroOsiStr.replace(/[^\d]/g, "");
        if (cleanedNroOsi && osisWithCertificates.has(cleanedNroOsi))
          return true;

        // 3. Try partial match - if the OSI number in the view starts with or ends with a number in the set
        // (Only for numbers of reasonable length to avoid false positives)
        if (cleanedNroOsi && cleanedNroOsi.length >= 3) {
          for (const certOsi of osisWithCertificates) {
            if (certOsi === cleanedNroOsi) return true;
          }
        }

        return false;
      })(),
    }));

    const transformedCourses = (coursesResult.data || []).map((course: any) => {
      const cursoMatch = cursosByNombre.get(
        (course.nombre as string).toLowerCase(),
      );

      // Log content source for debugging
      const contentSource = cursoMatch?.contenido
        ? "cursos (primary)"
        : course.contenido_curso
          ? "catalogo_servicios (fallback)"
          : "none";

      return {
        id: course.id.toString(), // catalogo_servicios.id — for OSI matching
        cursos_id: cursoMatch?.id ?? null, // cursos.id — for certificados/carnets FK
        nombre: course.nombre,
        name: course.nombre,
        description: course.nombre,
        // Prefer cursos.contenido (authoritative); fall back to catalogo_servicios.contenido_curso
        contenido_curso:
          cursoMatch?.contenido || course.contenido_curso || null,
        horas_estimadas:
          cursoMatch?.horas_estimadas ?? course.carga_horaria_std,
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
    console.error("Error in getOptimizedCertificateData:", error);
    return {
      osis: [],
      courses: [],
      signatures: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
});

export { getOptimizedCertificateData };
