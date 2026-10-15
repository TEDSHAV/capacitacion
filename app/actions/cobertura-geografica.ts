"use server";

import { createClient } from "@/utils/supabase/server";
interface SupabaseQueryBuilder<T> {
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; count: number | null; error: unknown }>;
}

const PAGE_SIZE = 1000;

/**
 * High-speed parallel table fetcher
 */
async function fetchTableParallel<T>(
  buildQuery: () => SupabaseQueryBuilder<T>,
  label: string,
): Promise<T[]> {
  try {
    const { data: firstPage, count, error } = await buildQuery().range(0, PAGE_SIZE - 1);
    if (error) {
      console.error(`[cobertura-geografica] Error fetching ${label} page 0:`, error);
      return [];
    }
    const all = [...(firstPage || [])];
    const totalCount = count ?? all.length;

    if (totalCount > PAGE_SIZE) {
      const remaining: PromiseLike<{ data: T[] | null }>[] = [];
      for (let from = PAGE_SIZE; from < totalCount; from += PAGE_SIZE) {
        const to = Math.min(from + PAGE_SIZE - 1, totalCount - 1);
        remaining.push(buildQuery().range(from, to));
      }
      const results = await Promise.all(remaining);
      for (const res of results) {
        if (res.data) all.push(...res.data);
      }
    }
    return all;
  } catch (e) {
    console.error(`[cobertura-geografica] Unexpected error fetching ${label}:`, e);
    return [];
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface CoberturaFilters {
  estadoId?: number | null;
  ciudadId?: number | null;
  empresaId?: number | null;
  cursoId?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  searchQuery?: string | null;
}

export interface CoberturaOsiItem {
  idOsi: number;
  nroOsi: string;
  servicio: string;
  idServicio: number | null;
  empresaNombre: string;
  idEmpresa: number | null;
  sede: string | null;
  direccion: string | null;
  estadoNombre: string;
  idEstado: number | null;
  ciudadNombre: string | null;
  idCiudad: number | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  horasAcademicas: number;
  certificadosEmitidos: number;
  participantesEstimados: number;
}

export interface CoberturaTemaItem {
  idCurso: number;
  nombreCurso: string;
  cargaHorariaStd: number;
  totalCursos: number;
  totalCertificados: number;
  promedioParticipantes: number;
  ultimaFecha: string | null;
  empresas: Array<{ id: number; nombre: string; osisCount: number; certsCount: number }>;
  estados: Array<{ id: number; nombre: string; osisCount: number; certsCount: number }>;
  sedes: Array<{ nombre: string; count: number }>;
  osis: CoberturaOsiItem[];
}

export interface CoberturaEstadoSummary {
  idEstado: number;
  nombreEstado: string;
  totalCursos: number;
  totalCertificados: number;
  totalEmpresas: number;
  totalHoras: number;
  temasTop: Array<{ nombre: string; certs: number }>;
}

export interface CoberturaSedeSummary {
  sedeKey: string;
  nombreSede: string;
  estadoNombre: string;
  ciudadNombre: string | null;
  empresaNombre: string;
  totalCursos: number;
  totalCertificados: number;
  temasCount: number;
}

export interface CoberturaDataResponse {
  kpis: {
    totalCursosRealizados: number;
    totalCertificadosEmitidos: number;
    totalTemasUnicos: number;
    totalEmpresasAtendidas: number;
    totalHorasAcademicas: number;
    promedioCertsPorCurso: number;
  };
  temas: CoberturaTemaItem[];
  estadosResumen: CoberturaEstadoSummary[];
  sedesResumen: CoberturaSedeSummary[];
  catalogs: {
    estados: Array<{ id: number; nombre: string }>;
    ciudades: Array<{ id: number; idEstado: number; nombre: string }>;
    empresas: Array<{ id: number; razonSocial: string }>;
    cursos: Array<{ id: number; nombre: string }>;
  };
  timing: {
    fetchMs: number;
    processMs: number;
    totalMs: number;
  };
}

/**
 * Main authoritative server action for Cobertura Geográfica y Cursos por Ubicación
 */
export async function getCoberturaGeograficaData(
  filters: CoberturaFilters = {},
): Promise<{ data: CoberturaDataResponse | null; error: string | null }> {
  const t0 = performance.now();

  try {
    const supabase = await createClient();

    // Parallel fetch of all required lookup and data tables
    const [
      osisRows,
      certsRows,
      ejecucionRows,
      statesRows,
      ciudadesRows,
      serviciosRows,
      empresasRows,
    ] = await Promise.all([
      // 1. All capacitación OSIs with location, execution dates and hours
      fetchTableParallel<{
        id_osi: number | null;
        nro_osi: string | null;
        servicio: string | null;
        id_servicio: number | null;
        nombre_empresa: string | null;
        id_empresa: number | null;
        sede: string | null;
        id_sede: number | null;
        direccion_ejecucion: string | null;
        direccion_ejecucion_real: string | null;
        id_estado_direccion_ejecucion_efectiva: number | null;
        id_ciudad_direccion_ejecucion_efectiva: number | null;
        fecha_inicio_real: string | null;
        fecha_fin_real: string | null;
        fecha_emision: string | null;
        horas_academicas_ejecucion: number | null;
        horas_academicas_solped: number | null;
        participantes_ejecucion: number | null;
        participantes_max_solped: number | null;
      }>(() => {
        return supabase
          .from("v_osi_formato_completo")
          .select(`
            id_osi, nro_osi, servicio, id_servicio, nombre_empresa, id_empresa,
            sede, id_sede, direccion_ejecucion, direccion_ejecucion_real,
            id_estado_direccion_ejecucion_efectiva, id_ciudad_direccion_ejecucion_efectiva,
            fecha_inicio_real, fecha_fin_real, fecha_emision,
            horas_academicas_ejecucion, horas_academicas_solped,
            participantes_ejecucion, participantes_max_solped
          `, { count: "exact" })
          .ilike("tipo_servicio", "%capacitacion%")
          .not("nro_osi", "ilike", "%PEN-%")
          .order("id_osi", { ascending: true });
      }, "v_osi_formato_completo"),

      // 2. Active certificates
      fetchTableParallel<{
        id: number;
        id_curso: number | null;
        id_empresa: number | null;
        id_estado: number | null;
        nro_osi: number | null;
        fecha_emision: string | null;
      }>(() => {
        return supabase
          .from("certificados")
          .select("id, id_curso, id_empresa, id_estado, nro_osi, fecha_emision", { count: "exact" })
          .eq("is_active", true)
          .order("id", { ascending: true });
      }, "certificados"),

      // 3. Mapping of sequential OSI -> id_osi
      fetchTableParallel<{
        id: number;
        nro_osi_secuencial: string | number | null;
      }>(() => {
        return supabase
          .from("ejecucion_osi")
          .select("id, nro_osi_secuencial", { count: "exact" })
          .order("id", { ascending: true });
      }, "ejecucion_osi"),

      // 4. States
      fetchTableParallel<{
        id: number;
        nombre_estado: string;
      }>(() => {
        return supabase
          .from("cat_estados_venezuela")
          .select("id, nombre_estado", { count: "exact" })
          .order("nombre_estado", { ascending: true });
      }, "cat_estados_venezuela"),

      // 5. Cities
      fetchTableParallel<{
        id: number;
        id_estado: number;
        nombre_ciudad: string;
      }>(() => {
        return supabase
          .from("cat_ciudades")
          .select("id, id_estado, nombre_ciudad", { count: "exact" })
          .order("nombre_ciudad", { ascending: true });
      }, "cat_ciudades"),

      // 6. Course catalog
      fetchTableParallel<{
        id: number;
        nombre: string;
        carga_horaria_std: number | null;
      }>(() => {
        return supabase
          .from("catalogo_servicios")
          .select("id, nombre, carga_horaria_std", { count: "exact" })
          .order("nombre", { ascending: true });
      }, "catalogo_servicios"),

      // 7. Companies
      fetchTableParallel<{
        id: number;
        razon_social: string;
      }>(() => {
        return supabase
          .from("empresas")
          .select("id, razon_social", { count: "exact" })
          .order("razon_social", { ascending: true });
      }, "empresas"),
    ]);

    const tFetch = performance.now();

    // ── Build Lookups ────────────────────────────────────────────────────────
    const estadosMap = new Map(statesRows.map((s) => [s.id, s.nombre_estado]));
    const ciudadesMap = new Map(ciudadesRows.map((c) => [c.id, c.nombre_ciudad]));
    const serviciosMap = new Map(serviciosRows.map((s) => [s.id, s]));
    const empresasMap = new Map(empresasRows.map((e) => [e.id, e.razon_social]));

    // Sequential OSI string -> id_osi
    const numericOsiToIdOsi = new Map<string, number>();
    for (const e of ejecucionRows) {
      if (e.nro_osi_secuencial != null) {
        numericOsiToIdOsi.set(String(e.nro_osi_secuencial).trim(), e.id);
      }
    }

    // Certificates counts mapped by id_osi
    const certsByOsiId = new Map<number, number>();
    // Certificates counts mapped by legacy string
    const certsByLegacyOsi = new Map<string, number>();
    // Direct certificates mapped by (id_curso + id_estado) for standalone certs
    const certsByCursoAndEstado = new Map<string, number>();

    for (const cert of certsRows) {
      let linkedOsiId: number | null = null;
      if (cert.nro_osi != null) {
        const secStr = String(cert.nro_osi).trim();
        linkedOsiId = numericOsiToIdOsi.get(secStr) ?? null;
        if (linkedOsiId != null) {
          certsByOsiId.set(linkedOsiId, (certsByOsiId.get(linkedOsiId) ?? 0) + 1);
        } else {
          certsByLegacyOsi.set(secStr, (certsByLegacyOsi.get(secStr) ?? 0) + 1);
        }
      }

      if (cert.id_curso && cert.id_estado) {
        const key = `${cert.id_curso}_${cert.id_estado}`;
        certsByCursoAndEstado.set(key, (certsByCursoAndEstado.get(key) ?? 0) + 1);
      }
    }

    // ── Normalize and Filter OSIs ────────────────────────────────────────────
    const normalizedOsis: CoberturaOsiItem[] = [];

    for (const o of osisRows) {
      if (!o.id_osi) continue;

      const idEstado = o.id_estado_direccion_ejecucion_efectiva;
      const estadoNombre = (idEstado && estadosMap.get(idEstado)) || "Sin Estado Definido";

      const idCiudad = o.id_ciudad_direccion_ejecucion_efectiva;
      const ciudadNombre = (idCiudad && ciudadesMap.get(idCiudad)) || null;

      const certsCount = certsByOsiId.get(o.id_osi) ?? 0;

      const stdHours = o.id_servicio ? (serviciosMap.get(o.id_servicio)?.carga_horaria_std || 0) : 0;
      const horas = Number(o.horas_academicas_ejecucion ?? o.horas_academicas_solped ?? stdHours);

      const partEst = Number(o.participantes_ejecucion ?? o.participantes_max_solped ?? certsCount);

      const direccion = (o.direccion_ejecucion_real || o.direccion_ejecucion || "").trim() || null;
      const sede = (o.sede || "").trim() || null;

      const item: CoberturaOsiItem = {
        idOsi: o.id_osi,
        nroOsi: o.nro_osi || `OSI-${o.id_osi}`,
        servicio: o.servicio || (o.id_servicio ? serviciosMap.get(o.id_servicio)?.nombre || "Servicio no especificado" : "Servicio no especificado"),
        idServicio: o.id_servicio,
        empresaNombre: o.nombre_empresa || (o.id_empresa ? empresasMap.get(o.id_empresa) || "Cliente no especificado" : "Cliente no especificado"),
        idEmpresa: o.id_empresa,
        sede,
        direccion,
        estadoNombre,
        idEstado,
        ciudadNombre,
        idCiudad,
        fechaInicio: o.fecha_inicio_real,
        fechaFin: o.fecha_fin_real ?? o.fecha_inicio_real ?? o.fecha_emision,
        horasAcademicas: horas,
        certificadosEmitidos: certsCount,
        participantesEstimados: partEst,
      };

      // ── Apply Filters ───────────────────────────────────────────────────────
      // 1. Estado
      if (filters.estadoId && item.idEstado !== filters.estadoId) continue;

      // 2. Ciudad
      if (filters.ciudadId && item.idCiudad !== filters.ciudadId) continue;

      // 3. Empresa
      if (filters.empresaId && item.idEmpresa !== filters.empresaId) continue;

      // 4. Curso
      if (filters.cursoId && item.idServicio !== filters.cursoId) continue;

      // 5. Date Range (using fechaFin or fechaInicio)
      const osiDate = item.fechaFin || item.fechaInicio;
      if (filters.dateFrom && (!osiDate || osiDate < filters.dateFrom)) continue;
      if (filters.dateTo && (!osiDate || osiDate > filters.dateTo)) continue;

      // 6. Search query
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase().trim();
        const match =
          item.servicio.toLowerCase().includes(q) ||
          item.empresaNombre.toLowerCase().includes(q) ||
          item.nroOsi.toLowerCase().includes(q) ||
          (item.sede && item.sede.toLowerCase().includes(q)) ||
          (item.direccion && item.direccion.toLowerCase().includes(q)) ||
          item.estadoNombre.toLowerCase().includes(q) ||
          (item.ciudadNombre && item.ciudadNombre.toLowerCase().includes(q));

        if (!match) continue;
      }

      normalizedOsis.push(item);
    }

    // ── Aggregate Data by Topic / Course ─────────────────────────────────────
    const temasMap = new Map<string, {
      idCurso: number;
      nombreCurso: string;
      cargaHorariaStd: number;
      osis: CoberturaOsiItem[];
      totalCerts: number;
      empresasMap: Map<number, { id: number; nombre: string; osisCount: number; certsCount: number }>;
      estadosMap: Map<number, { id: number; nombre: string; osisCount: number; certsCount: number }>;
      sedesMap: Map<string, number>;
      ultimaFecha: string | null;
    }>();

    for (const osi of normalizedOsis) {
      // Group key: by course ID if available, otherwise sanitized course name
      const key = osi.idServicio != null ? `id_${osi.idServicio}` : `name_${osi.servicio.toLowerCase().trim()}`;

      let cur = temasMap.get(key);
      if (!cur) {
        const stdHours = osi.idServicio ? (serviciosMap.get(osi.idServicio)?.carga_horaria_std || osi.horasAcademicas) : osi.horasAcademicas;
        cur = {
          idCurso: osi.idServicio || 0,
          nombreCurso: osi.servicio,
          cargaHorariaStd: stdHours,
          osis: [],
          totalCerts: 0,
          empresasMap: new Map(),
          estadosMap: new Map(),
          sedesMap: new Map(),
          ultimaFecha: null,
        };
        temasMap.set(key, cur);
      }

      cur.osis.push(osi);
      cur.totalCerts += osi.certificadosEmitidos;

      // Track last date
      const d = osi.fechaFin || osi.fechaInicio;
      if (d && (!cur.ultimaFecha || d > cur.ultimaFecha)) {
        cur.ultimaFecha = d;
      }

      // Company agg
      if (osi.idEmpresa) {
        const comp = cur.empresasMap.get(osi.idEmpresa) || {
          id: osi.idEmpresa,
          nombre: osi.empresaNombre,
          osisCount: 0,
          certsCount: 0,
        };
        comp.osisCount++;
        comp.certsCount += osi.certificadosEmitidos;
        cur.empresasMap.set(osi.idEmpresa, comp);
      }

      // State agg
      if (osi.idEstado) {
        const est = cur.estadosMap.get(osi.idEstado) || {
          id: osi.idEstado,
          nombre: osi.estadoNombre,
          osisCount: 0,
          certsCount: 0,
        };
        est.osisCount++;
        est.certsCount += osi.certificadosEmitidos;
        cur.estadosMap.set(osi.idEstado, est);
      }

      // Venue / Sede agg
      const venueLabel = osi.sede || osi.direccion || osi.ciudadNombre || "Sin sede especificada";
      cur.sedesMap.set(venueLabel, (cur.sedesMap.get(venueLabel) ?? 0) + 1);
    }

    const temasList: CoberturaTemaItem[] = Array.from(temasMap.values())
      .map((t) => ({
        idCurso: t.idCurso,
        nombreCurso: t.nombreCurso,
        cargaHorariaStd: t.cargaHorariaStd,
        totalCursos: t.osis.length,
        totalCertificados: t.totalCerts,
        promedioParticipantes: t.osis.length > 0 ? Math.round((t.totalCerts / t.osis.length) * 10) / 10 : 0,
        ultimaFecha: t.ultimaFecha,
        empresas: Array.from(t.empresasMap.values()).sort((a, b) => b.certsCount - a.certsCount),
        estados: Array.from(t.estadosMap.values()).sort((a, b) => b.certsCount - a.certsCount),
        sedes: Array.from(t.sedesMap.entries())
          .map(([nombre, count]) => ({ nombre, count }))
          .sort((a, b) => b.count - a.count),
        osis: t.osis.sort((a, b) => (b.fechaFin || "").localeCompare(a.fechaFin || "")),
      }))
      .sort((a, b) => b.totalCertificados - a.totalCertificados || b.totalCursos - a.totalCursos);

    // ── Aggregate Data by Geographic State ───────────────────────────────────
    const estadosAgg = new Map<number, {
      idEstado: number;
      nombreEstado: string;
      totalCursos: number;
      totalCertificados: number;
      empresasSet: Set<number>;
      totalHoras: number;
      temasCount: Map<string, number>;
    }>();

    for (const osi of normalizedOsis) {
      if (!osi.idEstado) continue;

      let est = estadosAgg.get(osi.idEstado);
      if (!est) {
        est = {
          idEstado: osi.idEstado,
          nombreEstado: osi.estadoNombre,
          totalCursos: 0,
          totalCertificados: 0,
          empresasSet: new Set(),
          totalHoras: 0,
          temasCount: new Map(),
        };
        estadosAgg.set(osi.idEstado, est);
      }

      est.totalCursos++;
      est.totalCertificados += osi.certificadosEmitidos;
      est.totalHoras += osi.horasAcademicas;
      if (osi.idEmpresa) est.empresasSet.add(osi.idEmpresa);

      const tName = osi.servicio;
      est.temasCount.set(tName, (est.temasCount.get(tName) ?? 0) + osi.certificadosEmitidos);
    }

    const estadosResumenList: CoberturaEstadoSummary[] = Array.from(estadosAgg.values())
      .map((e) => ({
        idEstado: e.idEstado,
        nombreEstado: e.nombreEstado,
        totalCursos: e.totalCursos,
        totalCertificados: e.totalCertificados,
        totalEmpresas: e.empresasSet.size,
        totalHoras: Math.round(e.totalHoras),
        temasTop: Array.from(e.temasCount.entries())
          .map(([nombre, certs]) => ({ nombre, certs }))
          .sort((a, b) => b.certs - a.certs)
          .slice(0, 3),
      }))
      .sort((a, b) => b.totalCertificados - a.totalCertificados || b.totalCursos - a.totalCursos);

    // ── Aggregate Data by Specific Venue / Sede ──────────────────────────────
    const sedesAgg = new Map<string, {
      sedeKey: string;
      nombreSede: string;
      estadoNombre: string;
      ciudadNombre: string | null;
      empresaNombre: string;
      totalCursos: number;
      totalCertificados: number;
      temasSet: Set<string>;
    }>();

    for (const osi of normalizedOsis) {
      const sName = osi.sede || osi.direccion || osi.ciudadNombre || "Sede No Especificada";
      const key = `${osi.idEstado || 0}_${sName.toLowerCase().trim()}`;

      let s = sedesAgg.get(key);
      if (!s) {
        s = {
          sedeKey: key,
          nombreSede: sName,
          estadoNombre: osi.estadoNombre,
          ciudadNombre: osi.ciudadNombre,
          empresaNombre: osi.empresaNombre,
          totalCursos: 0,
          totalCertificados: 0,
          temasSet: new Set(),
        };
        sedesAgg.set(key, s);
      }

      s.totalCursos++;
      s.totalCertificados += osi.certificadosEmitidos;
      s.temasSet.add(osi.servicio);
    }

    const sedesResumenList: CoberturaSedeSummary[] = Array.from(sedesAgg.values())
      .map((s) => ({
        sedeKey: s.sedeKey,
        nombreSede: s.nombreSede,
        estadoNombre: s.estadoNombre,
        ciudadNombre: s.ciudadNombre,
        empresaNombre: s.empresaNombre,
        totalCursos: s.totalCursos,
        totalCertificados: s.totalCertificados,
        temasCount: s.temasSet.size,
      }))
      .sort((a, b) => b.totalCertificados - a.totalCertificados || b.totalCursos - a.totalCursos);

    // ── Calculate High-Level KPIs ────────────────────────────────────────────
    const totalCursosRealizados = normalizedOsis.length;
    let totalCertificadosEmitidos = 0;
    let totalHorasAcademicas = 0;
    const uniqueEmpresasSet = new Set<number>();

    for (const osi of normalizedOsis) {
      totalCertificadosEmitidos += osi.certificadosEmitidos;
      totalHorasAcademicas += osi.horasAcademicas;
      if (osi.idEmpresa) uniqueEmpresasSet.add(osi.idEmpresa);
    }

    const promedioCertsPorCurso =
      totalCursosRealizados > 0
        ? Math.round((totalCertificadosEmitidos / totalCursosRealizados) * 10) / 10
        : 0;

    const tEnd = performance.now();

    return {
      data: {
        kpis: {
          totalCursosRealizados,
          totalCertificadosEmitidos,
          totalTemasUnicos: temasList.length,
          totalEmpresasAtendidas: uniqueEmpresasSet.size,
          totalHorasAcademicas: Math.round(totalHorasAcademicas),
          promedioCertsPorCurso,
        },
        temas: temasList,
        estadosResumen: estadosResumenList,
        sedesResumen: sedesResumenList,
        catalogs: {
          estados: statesRows.map((s) => ({ id: s.id, nombre: s.nombre_estado })),
          ciudades: ciudadesRows.map((c) => ({ id: c.id, idEstado: c.id_estado, nombre: c.nombre_ciudad })),
          empresas: empresasRows.map((e) => ({ id: e.id, razonSocial: e.razon_social })),
          cursos: serviciosRows.map((s) => ({ id: s.id, nombre: s.nombre })),
        },
        timing: {
          fetchMs: Math.round(tFetch - t0),
          processMs: Math.round(tEnd - tFetch),
          totalMs: Math.round(tEnd - t0),
        },
      },
      error: null,
    };
  } catch (err) {
    console.error("[cobertura-geografica] Critical error:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Error desconocido al procesar cobertura geográfica",
    };
  }
}
