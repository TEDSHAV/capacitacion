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
      .select("id, nombre")
      .eq("esta_activo", true)
      .order("nombre");

    if (error) {
      // Catalogo_servicios table not available
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

    // Query ejecucion_osi table with proper filtering
    let query = supabase.from("ejecucion_osi").select("*", { count: "exact" });

    // Apply filters
    if (search && search.trim()) {
      query = query.or(
        `nro_osi.ilike.%${search}%,nombre_empresa.ilike.%${search}%,tema.ilike.%${search}%`,
      );
    }

    if (empresa && empresa.trim()) {
      query = query.eq("id_empresa", empresa);
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

    // Filter by tipo_servicio - only capacitacion
    query = query.ilike("tipo_servicio", "%capacitacion%");

    // Exclude pending OSIs
    query = query.not("nro_osi", "ilike", "%PEN-%");

    // Apply other filters
    if (filters.tipoServicio) {
      query = query.eq("tipo_servicio", filters.tipoServicio);
    }

    // Apply other filters
    if (filters.companyName) {
      query = query.ilike("nombre_empresa", `%${filters.companyName}%`);
    }

    if (filters.nroOsi) {
      query = query.ilike("nro_osi", `%${filters.nroOsi}%`);
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      query = query.or(`nro_osi.ilike.%${q}%,nombre_empresa.ilike.%${q}%`);
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

    if (filters.servicio) {
      query = query.ilike("servicio", `%${filters.servicio}%`);
    }

    if (filters.monthIssued) {
      // Filter by month issued (YYYY-MM format)
      query = query.like("fecha_emision", `${filters.monthIssued}%`);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Run main query — sort by fecha_emision desc, then id_osi desc as fallback for nulls
    const { data, error, count } = await query
      .order("fecha_emision", { ascending: false, nullsFirst: false })
      .order("id_osi", { ascending: false });

    if (error) {
      console.error("Error fetching OSIs for management:", error);
      return {
        osis: [],
        totalCount: 0,
      };
    }

    // Fetch statuses and acknowledgments in parallel
    const osiIds = (data || []).map((osi: any) => osi.id_osi);
    const [
      statuses,
      ackResult,
    ] = await Promise.all([
      getOSIStatuses(),
      osiIds.length > 0
        ? supabase
            .from("facilitador_acknowledgments")
            .select("osi_id")
            .in("osi_id", osiIds)
        : Promise.resolve({ data: null }),
    ]);

    const statusMap = new Map(statuses.map((s) => [s.id, s]));
    let acknowledgedOsiIds = new Set<number>();
    if (ackResult.data) {
      acknowledgedOsiIds = new Set(ackResult.data.map((a: any) => a.osi_id as number));
    }

    const enrichedOSIs = (data || []).map((osi: any) => {
      const status = statusMap.get(osi.id_estatus);
      return {
        ...osi,
        status_name: status?.nombre_estado || "Desconocido",
        status_color: status?.color_hex || "#gray",
        status_order: status?.orden || 0,
        has_acknowledgment: acknowledgedOsiIds.has(osi.id_osi),
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

/**
 * Lightweight OSI list for the Gestión OSI dashboard.
 *
 * Uses `v_osi_lista` (~20 columns) instead of `v_osi_formato_completo`
 * (~80 columns including heavy JSONB) to drastically reduce payload and
 * query time. The details modal fetches full data on-demand if needed.
 *
 * Does NOT fetch `facilitador_acknowledgments` (the list badge was removed)
 * or `conf_estatus` enrichment (the table doesn't display status_name/color).
 */
export async function getOSIsForGestionOSI(
  filters: OSIFilters = {},
  page = 1,
  limit = 20,
): Promise<OSISearchResult> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("v_osi_lista")
      .select(
        "id_osi, nro_osi, nombre_empresa, id_empresa, id_estatus, servicio, tipo_servicio, ejecutivo_negocios, fecha_emision, fecha_inicio_real, fecha_fin_real, horas_academicas_ejecucion, sesiones_ejecucion, direccion_ejecucion, codigo_cliente, participantes_ejecucion, id_ciudad_direccion_ejecucion_efectiva",
        { count: "exact" },
      );

    // Only capacitacion
    query = query.ilike("tipo_servicio", "%capacitacion%");

    // Exclude pending OSIs
    query = query.not("nro_osi", "ilike", "%PEN-%");

    // Apply filters (same as getOSIsForManagement — all compatible with v_osi_lista)
    if (filters.companyName) {
      query = query.ilike("nombre_empresa", `%${filters.companyName}%`);
    }

    if (filters.nroOsi) {
      query = query.ilike("nro_osi", `%${filters.nroOsi}%`);
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      query = query.or(`nro_osi.ilike.%${q}%,nombre_empresa.ilike.%${q}%`);
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

    if (filters.ejecutivo) {
      query = query.ilike("ejecutivo_negocios", `%${filters.ejecutivo}%`);
    }

    if (filters.servicio) {
      query = query.ilike("servicio", `%${filters.servicio}%`);
    }

    if (filters.monthIssued) {
      query = query.like("fecha_emision", `${filters.monthIssued}%`);
    }

    if (filters.location) {
      query = query.ilike("direccion_ejecucion", `%${filters.location}%`);
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

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query
      .order("fecha_emision", { ascending: false, nullsFirst: false })
      .order("id_osi", { ascending: false });

    if (error) {
      console.error("Error fetching OSIs for gestion-osi:", error);
      return { osis: [], totalCount: 0 };
    }

    // Map v_osi_lista rows to OSIManagement with defaults for missing fields.
    // batch-download-utils uses certificate snapshots for OSI data (id_empresa,
    // id_ciudad, etc.); the OSIManagement object only needs id_osi, nro_osi,
    // nombre_empresa for the download flow.
    const enrichedOSIs = (data || []).map((osi: any) => ({
      id_osi: osi.id_osi,
      nro_osi: osi.nro_osi || "",
      nombre_empresa: osi.nombre_empresa || "",
      id_empresa: osi.id_empresa || 0,
      id_servicio: 0,
      servicio: osi.servicio || "",
      tipo_servicio: osi.tipo_servicio || "",
      ejecutivo_negocios: osi.ejecutivo_negocios || "",
      fecha_inicio_real: osi.fecha_inicio_real,
      fecha_fin_real: osi.fecha_fin_real,
      fecha_emision: osi.fecha_emision,
      horas_academicas_ejecucion: osi.horas_academicas_ejecucion || 0,
      sesiones_ejecucion: osi.sesiones_ejecucion || 0,
      direccion_ejecucion: osi.direccion_ejecucion || "",
      contenido_servicio: "",
      codigo_cliente: osi.codigo_cliente || 0,
      id_estatus: osi.id_estatus || 0,
      participantes_ejecucion: osi.participantes_ejecucion,
      // Fields not in v_osi_lista — defaults
      desglose_recursos_sesiones: null,
      sesiones_programadas: null,
    }) as OSIManagement);

    return {
      osis: enrichedOSIs,
      totalCount: count || 0,
    };
  } catch (err) {
    console.error("Unexpected error in getOSIsForGestionOSI:", err);
    return { osis: [], totalCount: 0 };
  }
}

/**
 * Batch-check which OSIs have certificate records in the `certificados` table.
 *
 * `certificados.nro_osi` stores the raw sequential integer, while
 * `v_osi_lista.nro_osi` is a formatted string (e.g. "OSI-2024-001"). We parse
 * the digits from each OSI's nro_osi string and query `certificados` for
 * matching records — one lightweight IN-clause query on ~20 integer values,
 * selecting a single column.
 *
 * Returns a Map<id_osi, boolean> where true = has certificates issued.
 */
export async function getCertificadoImpresoBatch(
  osis: { id_osi: number; nro_osi: string }[],
): Promise<Map<number, boolean>> {
  const map = new Map<number, boolean>();
  if (osis.length === 0) return map;

  // Parse the sequential integer from each OSI's formatted nro_osi string
  const nroOsiIntToId = new Map<number, number>();
  const nroOsiInts: number[] = [];
  for (const osi of osis) {
    map.set(osi.id_osi, false);
    const digits = osi.nro_osi.replace(/[^\d]/g, "");
    if (digits) {
      const nroOsiInt = parseInt(digits, 10);
      if (!nroOsiIntToId.has(nroOsiInt)) {
        nroOsiIntToId.set(nroOsiInt, osi.id_osi);
        nroOsiInts.push(nroOsiInt);
      }
    }
  }
  if (nroOsiInts.length === 0) return map;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("certificados")
      .select("nro_osi")
      .in("nro_osi", nroOsiInts);
    if (error) return map;

    for (const row of data || []) {
      if (row.nro_osi == null) continue;
      const osiId = nroOsiIntToId.get(row.nro_osi);
      if (osiId !== undefined) {
        map.set(osiId, true);
      }
    }
  } catch (err) {
    console.error("Error in getCertificadoImpresoBatch:", err);
  }
  return map;
}

// Get filter options for OSI management (cached 5 minutes — reference data
// that changes rarely: companies, ejecutivos, statuses)
//
// Note: We can't use Next.js `unstable_cache` here because `createClient()`
// calls `cookies()` (a dynamic data source), which is disallowed inside a
// cache scope in Next.js 16+. Instead we use a simple module-level TTL cache.
let _filterOptionsCache: { data: any; expiresAt: number } | null = null;
const FILTER_OPTIONS_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getOSIFilterOptions() {
  // Return cached data if still fresh
  if (_filterOptionsCache && Date.now() < _filterOptionsCache.expiresAt) {
    return _filterOptionsCache.data;
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_osi_filter_options");

    if (error || !data || data.length === 0) {
      console.error("Error fetching OSI filter options:", error);
      return {
        companies: [],
        ejecutivos: [],
        statuses: [],
      };
    }

    const row = data[0];
    const result = {
      companies: row.companies || [],
      ejecutivos: row.ejecutivos || [],
      statuses: row.statuses || [],
    };

    _filterOptionsCache = {
      data: result,
      expiresAt: Date.now() + FILTER_OPTIONS_TTL_MS,
    };

    return result;
  } catch (err) {
    console.error("Error fetching OSI filter options:", err);
    return {
      companies: [],
      ejecutivos: [],
      statuses: [],
    };
  }
}

/**
 * Get manual OSI batches (certificates not linked to a real OSI record)
 */
export async function getManualOSIBatchesAction(
  filters: OSIFilters = {},
  page = 1,
  limit = 20,
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_manual_osi_batches", {
      p_page: page,
      p_limit: limit,
      p_nro_osi: filters.nroOsi ?? null,
      p_company_name: filters.companyName ?? null,
    });

    if (error) throw error;

    const row = data?.[0];
    if (!row) {
      return {
        osis: [],
        totalCount: 0,
        metrics: { total_hours: 0, total_sesiones: 0, unique_companies: 0 },
      };
    }

    return {
      osis: (row.batches || []) as OSIManagement[],
      totalCount: row.total_count ?? 0,
      metrics: {
        total_hours: 0,
        total_sesiones: 0,
        unique_companies: row.unique_companies ?? 0,
      },
    };
  } catch (err) {
    console.error("Error in getManualOSIBatchesAction:", err);
    return {
      osis: [],
      totalCount: 0,
      metrics: { total_hours: 0, total_sesiones: 0, unique_companies: 0 },
    };
  }
}
