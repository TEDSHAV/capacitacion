"use server";

import { createClient } from "@/utils/supabase/server";
import {
  SALONES_SHA,
  SALONES_SHA_CONFIG,
  isShaLocation,
  normalizeSalonName,
  getSalonCanonicalId,
  matchSalonFilter,
} from "@/lib/constants/salones";

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
      // Gracefully ignore missing tables in schema cache (PGRST205)
      const errCode = (error as { code?: string })?.code;
      if (errCode === "PGRST205") {
        return [];
      }
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
  salon?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  searchQuery?: string | null;
}

export interface CoberturaOsiSesion {
  nroSesion: number;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  ejecutada: boolean;
  salon: string | null;
  salonCanonicalId: string | null;
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
  isShaVenue: boolean;
  salon: string | null;
  salonCanonicalId: string | null;
  estadoNombre: string;
  idEstado: number | null;
  ciudadNombre: string | null;
  idCiudad: number | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  horasAcademicas: number;
  certificadosEmitidos: number;
  participantesEstimados: number;
  sesiones: CoberturaOsiSesion[];
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
  empresas?: Array<{
    nombre: string;
    cursosCount: number;
    certsCount: number;
  }>;
  isShaVenue?: boolean;
  salon?: string | null;
  totalCursos: number;
  totalCertificados: number;
  temasCount: number;
}

export interface CoberturaClassroomUsage {
  id: "salon-principal" | "salon-oriente" | "salon-elite" | "sin_asignar";
  nombre: string;
  shortNombre: string;
  badgeColor: "sky" | "amber" | "purple" | "slate";
  totalCursos: number;
  totalCertificados: number;
  totalHorasAcademicas: number;
  totalEmpresas: number;
  promedioCertsPorCurso: number;
  porcentajeUso: number; // % of total SHA courses
  temasTop: Array<{ nombre: string; cursos: number; certs: number }>;
  empresasTop: Array<{ nombre: string; cursos: number; certs: number }>;
  ultimaFecha: string | null;
}

export interface CoberturaShaMetrics {
  totalCursosSha: number;
  totalCertificadosSha: number;
  totalHorasAcademicasSha: number;
  totalEmpresasSha: number;
  porcentajeCursosEnSha: number;
  porcentajeCertsEnSha: number;
  cursosConSalonAsignado: number;
  cursosSinSalonAsignado: number;
  salones: CoberturaClassroomUsage[];
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
  aulasSha: CoberturaShaMetrics;
  temas: CoberturaTemaItem[];
  estadosResumen: CoberturaEstadoSummary[];
  sedesResumen: CoberturaSedeSummary[];
  catalogs: {
    estados: Array<{ id: number; nombre: string }>;
    ciudades: Array<{ id: number; idEstado: number; nombre: string }>;
    empresas: Array<{ id: number; razonSocial: string }>;
    cursos: Array<{ id: number; nombre: string }>;
    salones: string[];
    salonesDetalle: Array<{
      id: string;
      nombre: string;
      shortNombre: string;
      color: string;
      totalCursos: number;
    }>;
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
      stepsRows,
      empresaSedesRows,
      evalsRows,
      notasRows,
      sesionesRows,
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

      // 8. Execution steps metadata (authoritative Salón SHA tracking)
      fetchTableParallel<{
        osi_id: number;
        nro_sesion: number | null;
        step_metadata: Record<string, unknown> | null;
      }>(() => {
        return supabase
          .from("capacitacion_proceso_steps")
          .select("osi_id, nro_sesion, step_metadata", { count: "exact" })
          .or("step_metadata->>salon.not.is.null,step_metadata->>salon_id.not.is.null")
          .order("osi_id", { ascending: true });
      }, "capacitacion_proceso_steps_with_salon"),

      // 9. Empresa sedes catalog (resolve id_sede to readable name)
      fetchTableParallel<{
        id: number;
        nombre_sede: string;
      }>(() => {
        return supabase
          .from("empresa_sedes")
          .select("id, nombre_sede", { count: "exact" })
          .order("id", { ascending: true });
      }, "empresa_sedes"),

      // 10. Course digital evaluations (where salon was assigned during exam setup)
      fetchTableParallel<{
        id_osi: number;
        preguntas: unknown;
      }>(() => {
        return supabase
          .from("capacitacion_osi_evaluaciones")
          .select("id_osi, preguntas", { count: "exact" })
          .order("id_osi", { ascending: true });
      }, "capacitacion_osi_evaluaciones"),

      // 11. Audit notes (where salon was confirmed or updated via modal)
      fetchTableParallel<{
        osi_id: number;
        nota: string;
      }>(() => {
        return supabase
          .from("capacitacion_osi_notas")
          .select("osi_id, nota", { count: "exact" })
          .ilike("nota", "%Salón SHA%")
          .order("osi_id", { ascending: true });
      }, "capacitacion_osi_notas_salon"),

      // 12. OSI sessions (dates, times, execution status for classroom calendar)
      fetchTableParallel<{
        id_osi: number | null;
        nro_sesion: number | null;
        fecha: string | null;
        hora_inicio: string | null;
        hora_fin: string | null;
        fecha_ejecutada: string | null;
      }>(() => {
        return supabase
          .from("osi_sesion")
          .select("id_osi, nro_sesion, fecha, hora_inicio, hora_fin, fecha_ejecutada", { count: "exact" })
          .order("id_osi", { ascending: true })
          .order("nro_sesion", { ascending: true });
      }, "osi_sesion"),
    ]);

    const tFetch = performance.now();

    // ── Build Lookups ────────────────────────────────────────────────────────
    const estadosMap = new Map(statesRows.map((s) => [s.id, s.nombre_estado]));
    const ciudadesMap = new Map(ciudadesRows.map((c) => [c.id, c.nombre_ciudad]));
    const serviciosMap = new Map(serviciosRows.map((s) => [s.id, s]));
    const empresasMap = new Map(empresasRows.map((e) => [e.id, e.razon_social]));
    const empresaSedesMap = new Map(empresaSedesRows.map((s) => [s.id, s.nombre_sede]));

    // Reverse lookup maps for course and company names (fallback when ID is null)
    const cursoIdByName = new Map<string, number>();
    for (const s of serviciosRows) {
      if (s.nombre) {
        cursoIdByName.set(s.nombre.toLowerCase().trim(), s.id);
      }
    }
    const empresaIdByName = new Map<string, number>();
    for (const e of empresasRows) {
      if (e.razon_social) {
        empresaIdByName.set(e.razon_social.toLowerCase().trim(), e.id);
      }
    }

    // Salon mapping: Proceso steps metadata + Course Evaluations + Audit notes
    const salonByOsiId = new Map<number, string>();
    const salonByOsiSession = new Map<string, string>();

    // 1. Proceso steps (tracking or live confirmation)
    for (const step of stepsRows) {
      if (step.osi_id && step.step_metadata && typeof step.step_metadata === "object") {
        const val = step.step_metadata.salon ?? step.step_metadata.salon_id;
        if (typeof val === "string") {
          const clean = val.trim();
          if (clean && clean !== "null" && clean !== "undefined") {
            salonByOsiId.set(step.osi_id, clean);
            if (step.nro_sesion != null) {
              salonByOsiSession.set(`${step.osi_id}_${step.nro_sesion}`, clean);
            }
          }
        }
      }
    }

    // 2. Evaluaciones (classroom assigned during digital evaluation setup)
    for (const ev of evalsRows) {
      if (ev.id_osi && !salonByOsiId.has(ev.id_osi)) {
        const rawPreguntas = Array.isArray(ev.preguntas) ? ev.preguntas : [];
        const meta = rawPreguntas.find(
          (p: unknown): p is { _is_salon_meta?: boolean; salon_id?: string } =>
            typeof p === "object" && p !== null && (p as Record<string, unknown>)._is_salon_meta === true,
        );
        if (meta?.salon_id && typeof meta.salon_id === "string") {
          const clean = meta.salon_id.trim();
          if (clean && clean !== "null" && clean !== "undefined") {
            salonByOsiId.set(ev.id_osi, clean);
          }
        }
      }
    }

    // 3. Audit notes (historical confirmation logs: "Salón SHA: Salón 1", etc.)
    for (const n of notasRows) {
      if (n.osi_id && !salonByOsiId.has(n.osi_id) && n.nota) {
        const lowerNota = n.nota.toLowerCase();
        if (lowerNota.includes("removido") || lowerNota.includes("desasignado")) {
          continue;
        }
        const match = n.nota.match(/Salón SHA:?\s*([^.\n|]+)/i);
        if (match && match[1]) {
          const clean = match[1].trim();
          const cleanLower = clean.toLowerCase();
          if (
            clean &&
            clean !== "null" &&
            clean !== "undefined" &&
            !cleanLower.includes("sin asignar") &&
            !cleanLower.includes("por confirmar")
          ) {
            salonByOsiId.set(n.osi_id, clean);
          }
        }
      }
    }

    // Sequential OSI string -> id_osi & ID set
    const numericOsiToIdOsi = new Map<string, number>();
    const ejecucionIdSet = new Set<number>();
    for (const e of ejecucionRows) {
      ejecucionIdSet.add(e.id);
      if (e.nro_osi_secuencial != null) {
        numericOsiToIdOsi.set(String(e.nro_osi_secuencial).trim(), e.id);
      }
    }

    // Certificates counts & State fallback mapped by id_osi
    const certsByOsiId = new Map<number, number>();
    const certStateByOsiId = new Map<number, number>();
    const certsByLegacyOsi = new Map<string, number>();

    for (const cert of certsRows) {
      let linkedOsiId: number | null = null;
      if (cert.nro_osi != null) {
        const secStr = String(cert.nro_osi).trim();
        linkedOsiId = numericOsiToIdOsi.get(secStr) ?? null;

        // Fallback: Check if nro_osi is already directly the execution ID
        if (linkedOsiId == null) {
          const numId = parseInt(secStr, 10);
          if (Number.isFinite(numId) && ejecucionIdSet.has(numId)) {
            linkedOsiId = numId;
          }
        }

        if (linkedOsiId != null) {
          certsByOsiId.set(linkedOsiId, (certsByOsiId.get(linkedOsiId) ?? 0) + 1);
          if (cert.id_estado && !certStateByOsiId.has(linkedOsiId)) {
            certStateByOsiId.set(linkedOsiId, cert.id_estado);
          }
        } else {
          certsByLegacyOsi.set(secStr, (certsByLegacyOsi.get(secStr) ?? 0) + 1);
        }
      }
    }

    // Group sessions by id_osi
    const sesionesByOsiId = new Map<number, typeof sesionesRows>();
    for (const s of sesionesRows) {
      if (!s.id_osi || !s.fecha) continue;
      const list = sesionesByOsiId.get(s.id_osi);
      if (list) list.push(s);
      else sesionesByOsiId.set(s.id_osi, [s]);
    }

    // ── Normalize and Filter OSIs ────────────────────────────────────────────
    const normalizedOsis: CoberturaOsiItem[] = [];
    const shaOsisAllRooms: CoberturaOsiItem[] = [];

    for (const o of osisRows) {
      if (!o.id_osi) continue;

      // Resolve state: effective execution state -> certificate state fallback
      let idEstado = o.id_estado_direccion_ejecucion_efectiva;
      if (!idEstado && certStateByOsiId.has(o.id_osi)) {
        idEstado = certStateByOsiId.get(o.id_osi) ?? null;
      }
      const estadoNombre = (idEstado && estadosMap.get(idEstado)) || "Sin Estado Definido";

      const idCiudad = o.id_ciudad_direccion_ejecucion_efectiva;
      const ciudadNombre = (idCiudad && ciudadesMap.get(idCiudad)) || null;

      const certsCount = certsByOsiId.get(o.id_osi) ?? 0;

      const stdHours = o.id_servicio ? (serviciosMap.get(o.id_servicio)?.carga_horaria_std || 0) : 0;
      const horas = Number(o.horas_academicas_ejecucion ?? o.horas_academicas_solped ?? stdHours);

      const partEst = Number(o.participantes_ejecucion ?? o.participantes_max_solped ?? certsCount);

      const direccion = (o.direccion_ejecucion_real || o.direccion_ejecucion || "").trim() || null;
      const sede = (o.id_sede ? empresaSedesMap.get(o.id_sede) : null) || (o.sede || "").trim() || null;

      // 1. Did capacitacion users explicitly mark a salon for this course?
      const rawSalon = salonByOsiId.get(o.id_osi) || null;
      let salon: string | null = null;
      let salonCanonicalId: string | null = null;
      let isSha = false;

      if (rawSalon) {
        // Explicit user assignment from tracking steps, exams or live confirmation
        salon = normalizeSalonName(rawSalon);
        salonCanonicalId = getSalonCanonicalId(salon);
        isSha = true;
      } else {
        // Physical venue check for courses held at SHA facilities awaiting room assignment vs in-company client locations
        isSha = isShaLocation(direccion, sede);
      }

      // Course and Company with name fallback if ID was null
      let idServicio = o.id_servicio;
      if (!idServicio && o.servicio) {
        idServicio = cursoIdByName.get(o.servicio.toLowerCase().trim()) ?? null;
      }

      let idEmpresa = o.id_empresa;
      if (!idEmpresa && o.nombre_empresa) {
        idEmpresa = empresaIdByName.get(o.nombre_empresa.toLowerCase().trim()) ?? null;
      }

      const rawSesiones = sesionesByOsiId.get(o.id_osi) || [];
      const sesiones: CoberturaOsiSesion[] = rawSesiones
        .filter((s) => Boolean(s.fecha))
        .map((s) => {
          const nro = s.nro_sesion ?? 1;
          const rawSesSalon = salonByOsiSession.get(`${o.id_osi}_${nro}`);
          const sesSalon = rawSesSalon ? normalizeSalonName(rawSesSalon) : salon;
          const sesCanon = sesSalon ? getSalonCanonicalId(sesSalon) : salonCanonicalId;
          return {
            nroSesion: nro,
            fecha: (s.fecha || "").slice(0, 10),
            horaInicio: s.hora_inicio || null,
            horaFin: s.hora_fin || null,
            ejecutada: Boolean(s.fecha_ejecutada),
            salon: sesSalon,
            salonCanonicalId: sesCanon,
          };
        });

      const sesionDates = sesiones.map((s) => s.fecha).filter(Boolean).sort();
      const effectiveStart = o.fecha_inicio_real || sesionDates[0] || null;
      const effectiveEnd =
        o.fecha_fin_real ??
        (sesionDates.length > 0 ? sesionDates[sesionDates.length - 1] : null) ??
        o.fecha_inicio_real ??
        o.fecha_emision;

      const item: CoberturaOsiItem = {
        idOsi: o.id_osi,
        nroOsi: o.nro_osi || `OSI-${o.id_osi}`,
        servicio: o.servicio || (idServicio ? serviciosMap.get(idServicio)?.nombre || "Servicio no especificado" : "Servicio no especificado"),
        idServicio,
        empresaNombre: o.nombre_empresa || (idEmpresa ? empresasMap.get(idEmpresa) || "Cliente no especificado" : "Cliente no especificado"),
        idEmpresa,
        sede,
        direccion,
        isShaVenue: isSha,
        salon,
        salonCanonicalId,
        estadoNombre,
        idEstado,
        ciudadNombre,
        idCiudad,
        fechaInicio: effectiveStart,
        fechaFin: effectiveEnd,
        horasAcademicas: horas,
        certificadosEmitidos: certsCount,
        participantesEstimados: partEst,
        sesiones,
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

      // 5. Date Range (check session dates first if available, else OSI date)
      if (filters.dateFrom || filters.dateTo) {
        const fromStr = filters.dateFrom ? filters.dateFrom.slice(0, 10) : null;
        const toStr = filters.dateTo ? filters.dateTo.slice(0, 10) : null;
        const candidateDates =
          sesionDates.length > 0
            ? sesionDates
            : [(item.fechaFin || item.fechaInicio || "").slice(0, 10)].filter(Boolean);

        const matchesDate = candidateDates.some((d) => {
          if (fromStr && d < fromStr) return false;
          if (toStr && d > toStr) return false;
          return true;
        });
        if (!matchesDate) continue;
      }

      // 6. Search query (now includes salon name)
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase().trim();
        const match =
          item.servicio.toLowerCase().includes(q) ||
          item.empresaNombre.toLowerCase().includes(q) ||
          item.nroOsi.toLowerCase().includes(q) ||
          (item.sede && item.sede.toLowerCase().includes(q)) ||
          (item.direccion && item.direccion.toLowerCase().includes(q)) ||
          item.estadoNombre.toLowerCase().includes(q) ||
          (item.ciudadNombre && item.ciudadNombre.toLowerCase().includes(q)) ||
          (item.salon && item.salon.toLowerCase().includes(q));

        if (!match) continue;
      }

      if (item.isShaVenue) {
        shaOsisAllRooms.push(item);
      }

      // 7. Salón / Instalaciones SHA (using robust canonical matcher)
      if (filters.salon && !matchSalonFilter(item.salon, filters.salon, item.isShaVenue)) {
        continue;
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

      const d = osi.fechaFin || osi.fechaInicio;
      if (d && (!cur.ultimaFecha || d > cur.ultimaFecha)) {
        cur.ultimaFecha = d;
      }

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

      const venueLabel = osi.isShaVenue
        ? (osi.salon ? `🏛️ SHA — ${osi.salon}` : "🏛️ SHA — Sede Principal")
        : (osi.sede || osi.direccion || osi.ciudadNombre || "Sin sede especificada");
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
    interface SedeAggItem {
      sedeKey: string;
      nombreSede: string;
      estadoNombre: string;
      ciudadNombre: string | null;
      empresaNombre: string;
      empresasMap: Map<string, { cursosCount: number; certsCount: number }>;
      isShaVenue?: boolean;
      salon?: string | null;
      totalCursos: number;
      totalCertificados: number;
      temasSet: Set<string>;
    }
    const sedesAgg = new Map<string, SedeAggItem>();

    for (const osi of normalizedOsis) {
      const sName = osi.isShaVenue
        ? (osi.salon ? `Instalaciones SHA — ${osi.salon}` : "Instalaciones SHA — Sede Principal")
        : (osi.sede || osi.direccion || osi.ciudadNombre || "Sede No Especificada");

      const key = `${osi.idEstado || 0}_${sName.toLowerCase().trim()}`;

      let s = sedesAgg.get(key);
      if (!s) {
        s = {
          sedeKey: key,
          nombreSede: sName,
          estadoNombre: osi.estadoNombre,
          ciudadNombre: osi.ciudadNombre,
          empresaNombre: osi.empresaNombre,
          empresasMap: new Map(),
          isShaVenue: osi.isShaVenue,
          salon: osi.salon,
          totalCursos: 0,
          totalCertificados: 0,
          temasSet: new Set(),
        };
        sedesAgg.set(key, s);
      }

      s.totalCursos++;
      s.totalCertificados += osi.certificadosEmitidos;
      s.temasSet.add(osi.servicio);

      const empName = (osi.empresaNombre || "").trim() || "Empresa No Especificada";
      const empStat = s.empresasMap.get(empName) ?? { cursosCount: 0, certsCount: 0 };
      empStat.cursosCount++;
      empStat.certsCount += osi.certificadosEmitidos;
      s.empresasMap.set(empName, empStat);
    }

    const sedesResumenList: CoberturaSedeSummary[] = Array.from(sedesAgg.values())
      .map((s) => {
        const sortedEmpresas = Array.from(s.empresasMap.entries())
          .map(([nombre, stat]) => ({
            nombre,
            cursosCount: stat.cursosCount,
            certsCount: stat.certsCount,
          }))
          .sort((a, b) => b.certsCount - a.certsCount || b.cursosCount - a.cursosCount);

        const primaryEmpresa = sortedEmpresas[0]?.nombre || s.empresaNombre;

        return {
          sedeKey: s.sedeKey,
          nombreSede: s.nombreSede,
          estadoNombre: s.estadoNombre,
          ciudadNombre: s.ciudadNombre,
          empresaNombre: primaryEmpresa,
          empresas: sortedEmpresas,
          isShaVenue: s.isShaVenue,
          salon: s.salon,
          totalCursos: s.totalCursos,
          totalCertificados: s.totalCertificados,
          temasCount: s.temasSet.size,
        };
      })
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

    // ── Calculate SHA Classroom Usage Metrics (Aulas SHA) ────────────────────
    // Computed over shaOsisAllRooms so pill counts remain accurate when filtering by a specific classroom
    const shaOsis = shaOsisAllRooms;
    const totalCursosSha = shaOsis.length;
    let totalCertificadosSha = 0;
    let totalHorasAcademicasSha = 0;
    const shaEmpresasSet = new Set<string>();

    for (const o of shaOsis) {
      totalCertificadosSha += o.certificadosEmitidos;
      totalHorasAcademicasSha += o.horasAcademicas;
      if (o.empresaNombre) {
        shaEmpresasSet.add(o.empresaNombre.toLowerCase().trim());
      }
    }

    // Classroom Buckets initialized
    interface ClassroomBucket {
      id: "salon-principal" | "salon-oriente" | "salon-elite" | "sin_asignar";
      nombre: string;
      shortNombre: string;
      badgeColor: "sky" | "amber" | "purple" | "slate";
      totalCursos: number;
      totalCertificados: number;
      totalHorasAcademicas: number;
      empresasSet: Set<string>;
      temasMap: Map<string, { nombre: string; cursos: number; certs: number }>;
      empresasMap: Map<string, { nombre: string; cursos: number; certs: number }>;
      ultimaFecha: string | null;
    }

    const classroomBuckets: Record<string, ClassroomBucket> = {
      "salon-principal": {
        id: "salon-principal",
        nombre: "Salón Principal",
        shortNombre: "Salón Principal",
        badgeColor: "sky",
        totalCursos: 0,
        totalCertificados: 0,
        totalHorasAcademicas: 0,
        empresasSet: new Set(),
        temasMap: new Map(),
        empresasMap: new Map(),
        ultimaFecha: null,
      },
      "salon-oriente": {
        id: "salon-oriente",
        nombre: "Salón Oriente",
        shortNombre: "Salón Oriente",
        badgeColor: "amber",
        totalCursos: 0,
        totalCertificados: 0,
        totalHorasAcademicas: 0,
        empresasSet: new Set(),
        temasMap: new Map(),
        empresasMap: new Map(),
        ultimaFecha: null,
      },
      "salon-elite": {
        id: "salon-elite",
        nombre: "Salón Elite",
        shortNombre: "Salón Elite",
        badgeColor: "purple",
        totalCursos: 0,
        totalCertificados: 0,
        totalHorasAcademicas: 0,
        empresasSet: new Set(),
        temasMap: new Map(),
        empresasMap: new Map(),
        ultimaFecha: null,
      },
      sin_asignar: {
        id: "sin_asignar",
        nombre: "Por confirmar / Sin asignar",
        shortNombre: "Por confirmar",
        badgeColor: "slate",
        totalCursos: 0,
        totalCertificados: 0,
        totalHorasAcademicas: 0,
        empresasSet: new Set(),
        temasMap: new Map(),
        empresasMap: new Map(),
        ultimaFecha: null,
      },
    };

    let cursosConSalonAsignado = 0;
    let cursosSinSalonAsignado = 0;

    for (const o of shaOsis) {
      const canonId = o.salonCanonicalId;
      const bucketKey = canonId && classroomBuckets[canonId] ? canonId : "sin_asignar";
      const bucket = classroomBuckets[bucketKey];

      if (bucketKey !== "sin_asignar") {
        cursosConSalonAsignado++;
      } else {
        cursosSinSalonAsignado++;
      }

      bucket.totalCursos++;
      bucket.totalCertificados += o.certificadosEmitidos;
      bucket.totalHorasAcademicas += o.horasAcademicas;

      const empName = o.empresaNombre.trim() || "Cliente no especificado";
      bucket.empresasSet.add(empName);

      const empStat = bucket.empresasMap.get(empName) ?? { nombre: empName, cursos: 0, certs: 0 };
      empStat.cursos++;
      empStat.certs += o.certificadosEmitidos;
      bucket.empresasMap.set(empName, empStat);

      const temaName = o.servicio.trim() || "Tema no especificado";
      const temaStat = bucket.temasMap.get(temaName) ?? { nombre: temaName, cursos: 0, certs: 0 };
      temaStat.cursos++;
      temaStat.certs += o.certificadosEmitidos;
      bucket.temasMap.set(temaName, temaStat);

      const d = o.fechaFin || o.fechaInicio;
      if (d && (!bucket.ultimaFecha || d > bucket.ultimaFecha)) {
        bucket.ultimaFecha = d;
      }
    }

    const salonesUsageList: CoberturaClassroomUsage[] = Object.values(classroomBuckets).map((b) => ({
      id: b.id,
      nombre: b.nombre,
      shortNombre: b.shortNombre,
      badgeColor: b.badgeColor,
      totalCursos: b.totalCursos,
      totalCertificados: b.totalCertificados,
      totalHorasAcademicas: Math.round(b.totalHorasAcademicas),
      totalEmpresas: b.empresasSet.size,
      promedioCertsPorCurso: b.totalCursos > 0 ? Math.round((b.totalCertificados / b.totalCursos) * 10) / 10 : 0,
      porcentajeUso: totalCursosSha > 0 ? Math.round((b.totalCursos / totalCursosSha) * 1000) / 10 : 0,
      temasTop: Array.from(b.temasMap.values()).sort((x, y) => y.cursos - x.cursos || y.certs - x.certs).slice(0, 4),
      empresasTop: Array.from(b.empresasMap.values()).sort((x, y) => y.cursos - x.cursos || y.certs - x.certs).slice(0, 4),
      ultimaFecha: b.ultimaFecha,
    }));

    const porcentajeCursosEnSha =
      totalCursosRealizados > 0 ? Math.round((totalCursosSha / totalCursosRealizados) * 1000) / 10 : 0;
    const porcentajeCertsEnSha =
      totalCertificadosEmitidos > 0 ? Math.round((totalCertificadosSha / totalCertificadosEmitidos) * 1000) / 10 : 0;

    const aulasShaMetrics: CoberturaShaMetrics = {
      totalCursosSha,
      totalCertificadosSha,
      totalHorasAcademicasSha: Math.round(totalHorasAcademicasSha),
      totalEmpresasSha: shaEmpresasSet.size,
      porcentajeCursosEnSha,
      porcentajeCertsEnSha,
      cursosConSalonAsignado,
      cursosSinSalonAsignado,
      salones: salonesUsageList,
    };

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
        aulasSha: aulasShaMetrics,
        temas: temasList,
        estadosResumen: estadosResumenList,
        sedesResumen: sedesResumenList,
        catalogs: {
          estados: statesRows.map((s) => ({ id: s.id, nombre: s.nombre_estado })),
          ciudades: ciudadesRows.map((c) => ({ id: c.id, idEstado: c.id_estado, nombre: c.nombre_ciudad })),
          empresas: empresasRows.map((e) => ({ id: e.id, razonSocial: e.razon_social })),
          cursos: serviciosRows.map((s) => ({ id: s.id, nombre: s.nombre })),
          salones: [...SALONES_SHA],
          salonesDetalle: [
            ...SALONES_SHA_CONFIG.map((s) => ({
              id: s.nombre,
              nombre: s.nombre,
              shortNombre: s.shortNombre,
              color: s.color,
              totalCursos: classroomBuckets[s.id]?.totalCursos || 0,
            })),
            {
              id: "sin_salon",
              nombre: "Por confirmar / Sin asignar",
              shortNombre: "Por confirmar",
              color: "slate",
              totalCursos: classroomBuckets["sin_asignar"]?.totalCursos || 0,
            },
          ],
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
