"use server";

import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import {
  Empresa,
  Usuario,
  Contacto,
  OSI,
  OSIFilters,
  OSISearchResult,
  OSIStatus,
  OSIMetrics,
  OSIManagement,
} from "@/types";

// Cached server actions for better performance
const getCachedOSIUsuarios = cache(async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nombre_apellido")
      .eq("departamento", 2)
      .in("rol", [10, 2])
      .order("nombre_apellido");

    if (error) {
      // Usuarios table not available
      return { usuarios: [] };
    }

    return { usuarios: data || [] };
  } catch (err) {
    return { usuarios: [] };
  }
});

const getCachedOSIEmpresas = cache(async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("empresas")
      .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
      .order("razon_social");

    if (error) {
      // Empresas table not available
      return { empresas: [] };
    }

    return { empresas: data || [] };
  } catch (err) {
    return { empresas: [] };
  }
});

const getCachedOSICursos = cache(async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("catalogo_servicios")
      .select("id, nombre, contenido_curso")
      .eq("tipo_servicio", 1)
      .order("nombre");

    if (error) {
      // Cursos table not available
      return { cursos: [] };
    }

    return { cursos: data || [] };
  } catch (err) {
    return { cursos: [] };
  }
});

const getCachedOSIContactos = cache(async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("contactos_empresas")
      .select("id, nombre_apellido, cargo, email, telefono, id_empresa")
      .order("nombre_apellido");

    if (error) {
      // Contactos table not available
      return { contactos: [] };
    }

    return { contactos: data || [] };
  } catch (err) {
    return { contactos: [] };
  }
});

const getCachedOSIServicios = cache(async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("catalogo_servicios")
      .select("id, nombre, tipo_servicio")
      .order("nombre");

    if (error) {
      // Servicios table not available
      return { servicios: [] };
    }

    return { servicios: data || [] };
  } catch (err) {
    return { servicios: [] };
  }
});

// Get all usuarios for OSI dropdown
export async function getOSIUsuarios() {
  return await getCachedOSIUsuarios();
}

// Get all empresas for OSI dropdown
export async function getOSIEmpresas() {
  return await getCachedOSIEmpresas();
}

// Get all cursos for OSI dropdown
export async function getOSICursos() {
  return await getCachedOSICursos();
}

// Get all contactos for OSI dropdown
export async function getOSIContactos() {
  return await getCachedOSIContactos();
}

// Get all servicios for OSI dropdown
export async function getOSIServicios() {
  return await getCachedOSIServicios();
}

// Get all OSIs with filtering (not cached as it's dynamic)
export async function getOSIs(filters?: {
  search?: string;
  empresa?: string;
  estado?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const supabase = await createClient();
    const { search, empresa, estado, page = 1, limit = 50 } = filters || {};

    // Optimized query without foreign key relationship (doesn't exist in schema)
    let query = supabase.from("osi").select("*", { count: "exact" });

    // Apply filters
    if (search && search.trim()) {
      query = query.or(
        `nro_osi.ilike.%${search}%,cliente_nombre_empresa.ilike.%${search}%,tema.ilike.%${search}%`,
      );
    }

    if (empresa && empresa.trim()) {
      query = query.eq("empresa_id", empresa);
    }

    if (estado && estado.trim()) {
      query = query.eq("id_estatus", estado);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query.order("fecha_emision", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching OSIs:", error);
      return {
        osis: [],
        total: 0,
        page,
        limit,
      };
    }

    return {
      osis: data || [],
      total: count || 0,
      page,
      limit,
    };
  } catch (err) {
    console.error("Unexpected error in getOSIs:", err);
    return {
      osis: [],
      total: 0,
      page: filters?.page || 1,
      limit: filters?.limit || 50,
    };
  }
}

// Get OSI statuses for lifecycle visualization (cached)
const getCachedOSIStatuses = cache(async (): Promise<OSIStatus[]> => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("conf_estatus")
      .select("id, nombre_estado, color_hex, orden, es_estado_final")
      .eq("tabla_referencia", "ejecucion_osi")
      .order("orden", { ascending: true });

    if (error) {
      console.error("Error fetching OSI statuses:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Unexpected error in getCachedOSIStatuses:", err);
    return [];
  }
});

// Get OSI statuses
export async function getOSIStatuses() {
  return await getCachedOSIStatuses();
}

// Get OSIs for management page with comprehensive filters
export async function getOSIsForManagement(
  filters: OSIFilters = {},
  page = 1,
  limit = 20,
): Promise<OSISearchResult> {
  try {
    const supabase = await createClient();

    // Build query with filters
    let query = supabase
      .from("v_osi_formato_completo")
      .select("*", { count: "exact" });

    // Filter by tipo_servicio - only capacitacion (assuming tipo_servicio = 1 or 'Capacitación')
    // Based on the view, tipo_servicio appears to be a string or number
    if (filters.tipoServicio) {
      query = query.eq("tipo_servicio", filters.tipoServicio);
    } else {
      // Default to only capacitacion - filter by tipo_servicio that contains 'capacitacion' or equals 1
      query = query.or("tipo_servicio.ilike.%capacitacion%,tipo_servicio.eq.1");
    }

    // Apply other filters
    if (filters.companyName) {
      query = query.ilike("nombre_empresa", `%${filters.companyName}%`);
    }

    if (filters.nroOsi) {
      query = query.ilike("nro_osi", `%${filters.nroOsi}%`);
    }

    if (filters.status) {
      query = query.eq("id_estatus", parseInt(filters.status));
    }

    if (filters.dateServiceFrom) {
      query = query.gte("fecha_inicio_real", filters.dateServiceFrom);
    }

    if (filters.dateServiceTo) {
      query = query.lte("fecha_inicio_real", filters.dateServiceTo);
    }

    if (filters.dateIssuedFrom) {
      query = query.gte("fecha_emision", filters.dateIssuedFrom);
    }

    if (filters.dateIssuedTo) {
      query = query.lte("fecha_emision", filters.dateIssuedTo);
    }

    if (filters.numSesionesMin !== undefined) {
      query = query.gte("sesiones_ejecucion", filters.numSesionesMin);
    }

    if (filters.numSesionesMax !== undefined) {
      query = query.lte("sesiones_ejecucion", filters.numSesionesMax);
    }

    if (filters.numHoursMin !== undefined) {
      query = query.gte("horas_academicas_ejecucion", filters.numHoursMin);
    }

    if (filters.numHoursMax !== undefined) {
      query = query.lte("horas_academicas_ejecucion", filters.numHoursMax);
    }

    if (filters.location) {
      query = query.ilike("direccion_ejecucion", `%${filters.location}%`);
    }

    if (filters.ejecutivo) {
      query = query.ilike("ejecutivo_negocios", `%${filters.ejecutivo}%`);
    }

    if (filters.monthIssued) {
      // Filter by month issued (YYYY-MM format)
      query = query.like("fecha_emision", `${filters.monthIssued}%`);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Order by fecha_emision descending
    const { data, error, count } = await query.order("fecha_emision", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching OSIs for management:", error);
      return {
        osis: [],
        totalCount: 0,
      };
    }

    // Fetch statuses to enrich data
    const statuses = await getOSIStatuses();
    const statusMap = new Map(statuses.map((s) => [s.id, s]));

    // Enrich OSI data with status information
    const enrichedOSIs = (data || []).map((osi: any) => {
      const status = statusMap.get(osi.id_estatus);
      return {
        ...osi,
        status_name: status?.nombre_estado || "Desconocido",
        status_color: status?.color_hex || "#gray",
        status_order: status?.orden || 0,
      } as OSIManagement;
    });

    return {
      osis: enrichedOSIs,
      totalCount: count || 0,
    };
  } catch (err) {
    console.error("Unexpected error in getOSIsForManagement:", err);
    return {
      osis: [],
      totalCount: 0,
    };
  }
}

// Get filter options for OSI management
export async function getOSIFilterOptions() {
  try {
    const supabase = await createClient();

    const [companiesResult, ejecutivosResult, statusesResult] =
      await Promise.all([
        // Get unique companies
        supabase
          .from("v_osi_formato_completo")
          .select("id_empresa, nombre_empresa")
          .not("nombre_empresa", "is", null)
          .order("nombre_empresa"),

        // Get unique ejecutivos
        supabase
          .from("v_osi_formato_completo")
          .select("ejecutivo_negocios")
          .not("ejecutivo_negocios", "is", null)
          .order("ejecutivo_negocios"),

        // Get statuses
        getOSIStatuses(),
      ]);

    const companies = Array.from(
      new Map(
        (companiesResult.data || []).map((c: any) => [c.id_empresa, c]),
      ).values(),
    );

    const ejecutivos = Array.from(
      new Set(
        (ejecutivosResult.data || []).map((e: any) => e.ejecutivo_negocios),
      ),
    )
      .filter(Boolean)
      .sort();

    return {
      companies,
      ejecutivos,
      statuses: statusesResult,
    };
  } catch (err) {
    console.error("Error fetching OSI filter options:", err);
    return {
      companies: [],
      ejecutivos: [],
      statuses: [],
    };
  }
}
