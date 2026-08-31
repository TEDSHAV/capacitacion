"use server";

import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import {
  type IndicadorEstado,
  type IndicadorFuente,
  type IndicadorFuenteEjecucion,
  type IndicadorOsiOption,
  type IndicadorOsiRow,
  type IndicadoresAggregates,
  type IndicadoresFilterOptions,
  type IndicadoresFilters,
  type IndicadoresResponse,
} from "@/types";
import { getFeriadosSet } from "@/app/actions/feriados";
import { businessDaysInclusive, parseDate } from "@/lib/business-days";

// Issuance deadline expressed in business days, inclusive of the execution
// day. Communicated to users as "72 horas": certificates must be issued
// within 3 business days of the last session execution date, excluding
// weekends and Venezuelan holidays. Execution day = day 1.
const PLAZO_BUSINESS_DAYS = 3;

// Rows with business days beyond this threshold are flagged "sospechoso"
// (data quality suspect) — highlighted amber in the table for auditor review.
// 90 business days ≈ ~180 calendar days.
const SOSPECHOSO_DIAS = 90;

// Supabase caps un-ranged selects at 1000 rows, so every batch fetch below
// pages explicitly. 50 pages = 50,000 rows, enough headroom while still
// bounding a runaway loop.
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

// `.in()` lists are serialized into the query string, so large id arrays are
// split into chunks to stay well under URL length limits.
const IN_CHUNK_SIZE = 300;

type PagedResult<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Page through a Supabase select until a short page comes back.
 * `build` must apply a stable `.order()` so pages don't overlap or skip rows.
 */
async function fetchAllPages<T>(
  build: (from: number, to: number) => PromiseLike<PagedResult<T>>,
  label: string,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(`[indicadores] Error fetching ${label} page ${page}:`, error);
      break;
    }
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
}

/** Like fetchAllPages, but splits `ids` into chunks for the `.in()` filter. */
async function fetchChunkedIn<T>(
  ids: number[],
  build: (chunk: number[], from: number, to: number) => PromiseLike<PagedResult<T>>,
  label: string,
): Promise<T[]> {
  const all: T[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + IN_CHUNK_SIZE);
    const rows = await fetchAllPages<T>((from, to) => build(chunk, from, to), label);
    all.push(...rows);
  }
  return all;
}

function emptyAggregates(): IndicadoresAggregates {
  return {
    totalOsis: 0,
    totalEvaluadas: 0,
    dentro72: 0,
    fuera72: 0,
    pendientes: 0,
    programadas: 0,
    noAplica: 0,
    pctCumplimiento: null,
    avgDias: null,
    maxDias: null,
    maxDiasOsi: null,
    minDias: null,
    enRiesgoPendientes: 0,
  };
}

type OsiViewRow = {
  id_osi: number | null;
  nro_osi: string | null;
  nombre_empresa: string | null;
  sede: string | null;
  id_sede: number | null;
  servicio: string | null;
  fecha_fin_real: string | null;
  fecha_emision: string | null;
  id_empresa: number | null;
  id_estatus: number | null;
  sesiones_ejecucion: number | null;
  tipo_servicio: string | null;
  id_estado_direccion_ejecucion_efectiva: number | null;
};

type SesionRow = {
  id_osi: number;
  nro_sesion: number;
  fecha: string;
  fecha_ejecutada: string | null;
};

type AssignmentRow = {
  osi_id: number;
  facilitador_id: number;
  nro_sesion: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  facilitadores: unknown;
};

/**
 * Resolve, per OSI, the distinct facilitador(es) who actually taught its
 * sessions — reconstructed historically from the full assignment log rather
 * than the current `is_active` state. This matters because reassigning or
 * unassigning a facilitador only soft-deactivates the old row
 * (facilitador_osi_assignments is never hard-deleted), so filtering on
 * `is_active = true` at report time reflects *today's* assignment, not who
 * taught the session when it happened — and retroactively rewrites history
 * every time an assignment changes.
 *
 * For each session, we pick whichever assignment (session-specific, or the
 * `nro_sesion IS NULL` "all sessions" one as fallback) was in effect on the
 * session's execution date: created_at <= sessionDate AND
 * (is_active OR updated_at > sessionDate). An OSI with multiple sessions
 * taught by different facilitadores is credited to all of them (deduped),
 * not just one.
 */
function resolveHistoricalFacilitadoresPorOsi(
  sessionsByOsi: Map<number, { nroSesion: number; sessionDate: string }[]>,
  assignmentsByOsi: Map<number, AssignmentRow[]>,
): Map<number, string[]> {
  const result = new Map<number, string[]>();
  for (const [osiId, sessions] of sessionsByOsi.entries()) {
    const assignments = assignmentsByOsi.get(osiId) ?? [];
    if (!assignments.length || !sessions.length) continue;
    const names = new Set<string>();
    for (const session of sessions) {
      const isValidAt = (a: AssignmentRow) =>
        (!a.created_at || a.created_at <= session.sessionDate) &&
        (a.is_active || (!!a.updated_at && a.updated_at > session.sessionDate));
      // Prefer a session-specific assignment; fall back to the "all
      // sessions" (nro_sesion IS NULL) one, mirroring
      // getAssignmentByOSIAndSession's existing fallback behavior.
      let candidates = assignments.filter(
        (a) => a.nro_sesion === session.nroSesion && isValidAt(a),
      );
      if (!candidates.length) {
        candidates = assignments.filter(
          (a) => a.nro_sesion == null && isValidAt(a),
        );
      }
      if (!candidates.length) continue;
      // Most recently created candidate that was valid on the session date.
      const winner = candidates.reduce((best, cur) =>
        (cur.created_at ?? "") > (best.created_at ?? "") ? cur : best,
      );
      const facArr = winner.facilitadores as unknown as
        | { nombre_apellido: string | null }
        | { nombre_apellido: string | null }[]
        | null;
      const fac = Array.isArray(facArr) ? facArr[0] : facArr;
      if (fac?.nombre_apellido) names.add(fac.nombre_apellido);
    }
    if (names.size) result.set(osiId, Array.from(names));
  }
  return result;
}

export async function getIndicadoresCertificados72h(
  filters: IndicadoresFilters,
): Promise<{ data: IndicadoresResponse | null; error: string | null }> {
  try {
    const supabase = await createClient();

    // Fetch the holiday set for business-day calculations
    const holidays = await getFeriadosSet();

    // 1. Fetch capacitacion OSIs (exclude pending PEN-)
    // Date filters are applied post-fetch on fechaEjecucion (computed from
    // osi_sesion + fecha_fin_real), so we don't filter on fecha_fin_real here.
    const osis = await fetchAllPages<OsiViewRow>((from, to) => {
      let q = supabase
        .from("v_osi_formato_completo")
        .select(
          "id_osi, nro_osi, nombre_empresa, sede, id_sede, servicio, fecha_fin_real, fecha_emision, id_empresa, id_estatus, sesiones_ejecucion, tipo_servicio, id_estado_direccion_ejecucion_efectiva",
        )
        .ilike("tipo_servicio", "%capacitacion%")
        .not("nro_osi", "ilike", "%PEN-%");

      if (filters.osiIds?.length) q = q.in("id_osi", filters.osiIds);
      if (filters.empresaId) q = q.eq("id_empresa", filters.empresaId);
      if (filters.estadoId)
        q = q.eq("id_estado_direccion_ejecucion_efectiva", filters.estadoId);

      // id_osi is the stable tiebreaker that keeps pages from overlapping.
      return q
        .order("fecha_fin_real", { ascending: false, nullsFirst: false })
        .order("id_osi", { ascending: false })
        .range(from, to);
    }, "v_osi_formato_completo");

    if (osis.length === 0) {
      return { data: { rows: [], aggregates: emptyAggregates() }, error: null };
    }

    const osiIds = osis
      .map((o) => o.id_osi)
      .filter((v): v is number => v != null);

    // Map osiId -> numeric nro_osi (for joining certificados.nro_osi).
    // certificados.nro_osi references ejecucion_osi.nro_osi_secuencial (as
    // an integer). Instead of parsing the formatted nro_osi string from the
    // view (which is fragile), we query ejecucion_osi directly using id_osi
    // (the primary key) to get nro_osi_secuencial. This is the exact field
    // that certificados.nro_osi stores.
    const numericOsiByOsiId = new Map<number, number>();
    {
      const ejecucionRows = await fetchChunkedIn<{
        id: number;
        nro_osi_secuencial: string | number | null;
      }>(
        osiIds,
        (chunk, from, to) =>
          supabase
            .from("ejecucion_osi")
            .select("id, nro_osi_secuencial")
            .in("id", chunk)
            .order("id", { ascending: true })
            .range(from, to),
        "ejecucion_osi",
      );
      for (const e of ejecucionRows) {
        const seq = e.nro_osi_secuencial;
        if (seq != null) {
          // nro_osi_secuencial is a string; parse to int (matches
          // certificados.nro_osi which is integer)
          const n = typeof seq === "number" ? seq : parseInt(String(seq), 10);
          if (Number.isFinite(n)) numericOsiByOsiId.set(e.id, n);
        }
      }
    }
    const numericOsis = Array.from(new Set(numericOsiByOsiId.values()));

    // 2. Batch fetch osi_sesion dates → compute the clock start date per OSI.
    //    For each session, prefer fecha_ejecutada (actual) and fall back to
    //    fecha (planned) on a PER-SESSION basis. Then take the MAX across all
    //    sessions. This ensures that if only some sessions have
    //    fecha_ejecutada populated, we don't ignore the latest session's
    //    planned date — which would inflate the gap.
    //    Final fallback: fecha_fin_real from the OSI view.
    const maxSesionFechaByOsi = new Map<number, string>();
    const usedFechaEjecutadaByOsi = new Set<number>();
    // Per-session dates (nro_sesion + effective date), used below to
    // historically resolve which facilitador taught each session.
    const sessionsByOsi = new Map<number, { nroSesion: number; sessionDate: string }[]>();
    {
      const sesionRows = await fetchChunkedIn<SesionRow>(
        osiIds,
        (chunk, from, to) =>
          supabase
            .from("osi_sesion")
            .select("id_osi, nro_sesion, fecha, fecha_ejecutada")
            .in("id_osi", chunk)
            .order("id", { ascending: true })
            .range(from, to),
        "osi_sesion",
      );
      for (const s of sesionRows) {
        // Per-session: prefer fecha_ejecutada, fall back to fecha
        const sessionDate = s.fecha_ejecutada ?? s.fecha;
        if (!sessionDate) continue;
        const cur = maxSesionFechaByOsi.get(s.id_osi) ?? null;
        if (!cur || sessionDate > cur) {
          maxSesionFechaByOsi.set(s.id_osi, sessionDate);
          // Track whether the winning session used fecha_ejecutada
          if (s.fecha_ejecutada) {
            usedFechaEjecutadaByOsi.add(s.id_osi);
          } else {
            usedFechaEjecutadaByOsi.delete(s.id_osi);
          }
        }
        const list = sessionsByOsi.get(s.id_osi) ?? [];
        list.push({ nroSesion: s.nro_sesion, sessionDate });
        sessionsByOsi.set(s.id_osi, list);
      }
    }

    // 3. Batch fetch certificados: MIN(fecha_emision) + MIN(created_at) +
    //    a facilitador per nro_osi.
    //    fecha_emision (DATE, user-provided) is the PRIMARY source — it's the
    //    actual date the certificate was issued. created_at (TIMESTAMPTZ, auto
    //    DEFAULT now()) is the FALLBACK — it's when the DB row was inserted,
    //    which can be much later than the actual issuance (e.g. bulk backfills).
    const certByNumericOsi = new Map<
      number,
      {
        minFechaEmision: string | null;
        minCreatedAt: string | null;
        facilitadorId: number | null;
        sedeId: number | null;
      }
    >();
    const facilitadorNames = new Map<number, string>();
    {
      // Pages through ALL cert rows: an OSI with many participants produces
      // one cert row per participant, so the default 1000-row cap would
      // silently drop most OSIs' certificates.
      const certs = await fetchChunkedIn<{
        nro_osi: number | null;
        fecha_emision: string | null;
        created_at: string | null;
        id_facilitador: number | null;
        id_sede: number | null;
        facilitadores: unknown;
      }>(
        numericOsis,
        (chunk, from, to) =>
          supabase
            .from("certificados")
            .select(
              "nro_osi, fecha_emision, created_at, id_facilitador, id_sede, facilitadores!inner(nombre_apellido)",
            )
            .in("nro_osi", chunk)
            .order("id", { ascending: true })
            .range(from, to),
        "certificados",
      );
      for (const c of certs) {
        if (c.nro_osi == null) continue;
        const ca = c.created_at ?? null;
        const fe = c.fecha_emision ?? null;
        const existing = certByNumericOsi.get(c.nro_osi);
        if (!existing) {
          certByNumericOsi.set(c.nro_osi, {
            minFechaEmision: fe,
            minCreatedAt: ca,
            facilitadorId: c.id_facilitador ?? null,
            sedeId: c.id_sede ?? null,
          });
        } else {
          // MIN(fecha_emision): earliest actual emission date (primary)
          if (fe && (!existing.minFechaEmision || fe < existing.minFechaEmision)) {
            existing.minFechaEmision = fe;
          }
          // MIN(created_at): earliest DB insert timestamp (fallback)
          if (ca && (!existing.minCreatedAt || ca < existing.minCreatedAt)) {
            existing.minCreatedAt = ca;
          }
          if (existing.facilitadorId == null && c.id_facilitador != null) {
            existing.facilitadorId = c.id_facilitador;
          }
          if (existing.sedeId == null && c.id_sede != null) {
            existing.sedeId = c.id_sede;
          }
        }
        if (c.id_facilitador != null) {
          const facArr = c.facilitadores as unknown as
            | { nombre_apellido: string | null }
            | { nombre_apellido: string | null }[]
            | null;
          const fac = Array.isArray(facArr) ? facArr[0] : facArr;
          if (fac?.nombre_apellido) {
            facilitadorNames.set(c.id_facilitador, fac.nombre_apellido);
          }
        }
      }
    }

    // 3b. Batch fetch ALL facilitador_osi_assignments rows (not just
    //     is_active=true) for the "por facilitador de sesión" dimension, so
    //     we can reconstruct who was actually assigned at each session's
    //     execution time rather than who is currently assigned. Rows are
    //     never hard-deleted (reassignment/unassignment only flips
    //     is_active), so the full history is available.
    const assignmentsByOsi = new Map<number, AssignmentRow[]>();
    {
      const assignRows = await fetchChunkedIn<AssignmentRow>(
        osiIds,
        (chunk, from, to) =>
          supabase
            .from("facilitador_osi_assignments")
            .select(
              "osi_id, facilitador_id, nro_sesion, is_active, created_at, updated_at, facilitadores!inner(nombre_apellido)",
            )
            .in("osi_id", chunk)
            .order("id", { ascending: true })
            .range(from, to),
        "facilitador_osi_assignments",
      );
      for (const a of assignRows) {
        const list = assignmentsByOsi.get(a.osi_id) ?? [];
        list.push(a);
        assignmentsByOsi.set(a.osi_id, list);
      }
    }
    const sessionFacilitadorNamesByOsi = resolveHistoricalFacilitadoresPorOsi(
      sessionsByOsi,
      assignmentsByOsi,
    );

    // 3c. Batch fetch sede names from empresa_sedes. The sede is stored on
    //     certificados.id_sede (set when certificates are issued), not
    //     reliably on the OSI view. We collect id_sede from both the view
    //     and the certificados fetch above, then resolve names via
    //     empresa_sedes.nombre_sede.
    const sedeNameById = new Map<number, string>();
    const sedeIdsFromView = osis
      .map((o) => o.id_sede)
      .filter((v): v is number => v != null);
    const sedeIdsFromCerts = Array.from(certByNumericOsi.values())
      .map((c) => c.sedeId)
      .filter((v): v is number => v != null);
    const sedeIds = Array.from(new Set([...sedeIdsFromView, ...sedeIdsFromCerts]));
    {
      const sedeRows = await fetchChunkedIn<{ id: number; nombre_sede: string }>(
        sedeIds,
        (chunk, from, to) =>
          supabase
            .from("empresa_sedes")
            .select("id, nombre_sede")
            .in("id", chunk)
            .order("id", { ascending: true })
            .range(from, to),
        "empresa_sedes",
      );
      for (const s of sedeRows) {
        sedeNameById.set(s.id, s.nombre_sede);
      }
    }

    // 4. Build per-OSI rows
    const facilitadorIdByOsi = new Map<number, number | null>();
    const nowDate = new Date();
    const allRows: IndicadorOsiRow[] = osis.map((o) => {
      const osiId = o.id_osi ?? 0;
      const fechaFinReal = o.fecha_fin_real ?? null;

      // Clock start: MAX(per-session fecha_ejecutada ?? fecha) || fecha_fin_real
      const maxSesionFecha = maxSesionFechaByOsi.get(osiId) ?? null;
      const usedFechaEjecutada = usedFechaEjecutadaByOsi.has(osiId);
      let fechaEjecucion: string | null;
      let fuenteEjecucion: IndicadorFuenteEjecucion | null;
      if (maxSesionFecha) {
        fechaEjecucion = maxSesionFecha;
        fuenteEjecucion = usedFechaEjecutada ? "fecha_ejecutada" : "sesiones";
      } else if (fechaFinReal) {
        fechaEjecucion = fechaFinReal;
        fuenteEjecucion = "fecha_fin_real";
      } else {
        fechaEjecucion = null;
        fuenteEjecucion = null;
      }

      // Clock end: MIN(fecha_emision) (primary) || MIN(created_at) (fallback)
      const numericOsi = numericOsiByOsiId.get(osiId) ?? null;
      const cert = numericOsi != null ? certByNumericOsi.get(numericOsi) : undefined;
      const minFechaEmision = cert?.minFechaEmision ?? null;
      const minCreatedAt = cert?.minCreatedAt ?? null;
      const facilitadorId = cert?.facilitadorId ?? null;
      const certSedeId = cert?.sedeId ?? null;
      facilitadorIdByOsi.set(osiId, facilitadorId);

      let fechaEmision: string | null = null;
      let fuenteEmision: IndicadorFuente | null = null;
      if (minFechaEmision) {
        fechaEmision = minFechaEmision;
        fuenteEmision = "fecha_emision";
      } else if (minCreatedAt) {
        fechaEmision = minCreatedAt;
        fuenteEmision = "created_at";
      }

      let diasHabiles: number | null = null;
      let estado: IndicadorEstado;
      let brechaDias: number | null = null;
      let sospechoso = false;

      if (!fechaEjecucion) {
        estado = "no_aplica";
      } else {
        const execDate = parseDate(fechaEjecucion);
        // "programada": execution date is in the future — the 72h clock
        // hasn't started yet. These OSIs are NOT pending cert issuance
        // (they haven't been executed), so they must be classified
        // separately from "pendiente" to avoid inflating the pending
        // count and the "en riesgo" metric.
        if (execDate > nowDate) {
          estado = "programada";
        } else if (!fechaEmision) {
          estado = "pendiente";
          // Business days elapsed since execution, relative to today, minus
          // the deadline. Positive = already past the 72h plazo and still
          // waiting on a certificate (useful for sorting the pending
          // backlog worst-first); can be negative/zero if still on time.
          brechaDias =
            businessDaysInclusive(execDate, nowDate, holidays) - PLAZO_BUSINESS_DAYS;
        } else {
          const certDate = parseDate(fechaEmision);
          diasHabiles = businessDaysInclusive(execDate, certDate, holidays);

          // Pre-generated cert (created before execution): flag as sospechoso
          if (certDate < execDate) {
            diasHabiles = 0;
            estado = "dentro";
            sospechoso = true;
          } else if (diasHabiles <= PLAZO_BUSINESS_DAYS) {
            estado = "dentro";
          } else {
            estado = "fuera";
            brechaDias = diasHabiles - PLAZO_BUSINESS_DAYS;
          }

          // Flag extreme values as sospechoso for auditor review
          if (diasHabiles > SOSPECHOSO_DIAS) {
            sospechoso = true;
          }
        }
      }

      const facilitadorNombre =
        facilitadorId != null ? facilitadorNames.get(facilitadorId) ?? null : null;
      // Historically-resolved facilitador(es) who taught this OSI's
      // sessions, joined into a single display string (may list more than
      // one if the sessions had different facilitadores).
      const facilitadorSesionNombres = sessionFacilitadorNamesByOsi.get(osiId) ?? [];
      const facilitadorSesionNombre =
        facilitadorSesionNombres.length ? facilitadorSesionNombres.join(", ") : null;

      return {
        osiId,
        nroOsi: o.nro_osi ?? "",
        empresa: o.nombre_empresa ?? "",
        // Resolve sede name in priority order:
        // 1. certificados.id_sede → empresa_sedes.nombre_sede (most reliable,
        //    set when certificates are issued)
        // 2. v_osi_formato_completo.id_sede → empresa_sedes.nombre_sede
        //    (fallback if OSI view has it but certs don't)
        // 3. v_osi_formato_completo.sede (manual text field, last resort)
        sede:
          (certSedeId != null ? sedeNameById.get(certSedeId) : null) ??
          (o.id_sede != null ? sedeNameById.get(o.id_sede) : null) ??
          o.sede ??
          null,
        servicio: o.servicio ?? "",
        fechaEjecucion,
        fuenteEjecucion,
        fechaEmision,
        fuenteEmision,
        diasHabiles,
        estado,
        brechaDias,
        facilitadorNombre,
        facilitadorSesionNombre,
        sesiones: o.sesiones_ejecucion ?? null,
        sospechoso,
      };
    });

    // Apply post-fetch filters
    let rows = allRows;

    // Date filters on fechaEjecucion (computed, not a DB column on the view).
    // Use parseDate for consistent timezone handling — fechaEjecucion is
    // always a date-only string, and parseDate handles it as local midnight.
    //
    // "no_aplica" rows have fechaEjecucion === null by definition (they have
    // no session/execution date at all), so they can never fall inside or
    // outside a date range — they're left untouched by these filters instead
    // of being dropped, so aggregates.noAplica stays stable regardless of
    // which date preset is selected.
    if (filters.fechaFrom) {
      const fromStart = parseDate(filters.fechaFrom);
      rows = rows.filter(
        (r) => r.fechaEjecucion == null || parseDate(r.fechaEjecucion) >= fromStart,
      );
    }
    if (filters.fechaTo) {
      // End of day: parse the date and set to 23:59:59 local
      const toEnd = parseDate(filters.fechaTo);
      toEnd.setHours(23, 59, 59, 999);
      rows = rows.filter(
        (r) => r.fechaEjecucion == null || parseDate(r.fechaEjecucion) <= toEnd,
      );
    }

    if (filters.facilitadorId) {
      const fid = parseInt(filters.facilitadorId, 10);
      rows = rows.filter((r) => facilitadorIdByOsi.get(r.osiId) === fid);
    }
    if (filters.soloIncumplimientos) {
      rows = rows.filter((r) => r.estado === "fuera" || r.estado === "pendiente");
    }

    // 5. Aggregates
    const evaluadas = rows.filter((r) => r.estado === "dentro" || r.estado === "fuera");
    const dentro = evaluadas.filter((r) => r.estado === "dentro").length;
    const fuera = evaluadas.filter((r) => r.estado === "fuera").length;
    const pendientes = rows.filter((r) => r.estado === "pendiente");
    const programadas = rows.filter((r) => r.estado === "programada").length;
    const noAplica = rows.filter((r) => r.estado === "no_aplica").length;
    const diasVals = evaluadas
      .map((r) => r.diasHabiles)
      .filter((v): v is number => v != null);
    const avgDias = diasVals.length
      ? Math.round((diasVals.reduce((a, b) => a + b, 0) / diasVals.length) * 10) / 10
      : null;
    const maxDias = diasVals.length ? Math.max(...diasVals) : null;
    const minDias = diasVals.length ? Math.min(...diasVals) : null;
    const maxRow = evaluadas.find((r) => r.diasHabiles === maxDias);
    const pct =
      evaluadas.length > 0
        ? Math.round((dentro / evaluadas.length) * 1000) / 10
        : null;

    // Pending in risk: already past the 72h plazo and still not issued. Each
    // pendiente row now carries its own brechaDias (computed at row-build
    // time above), so we just count the ones already overdue instead of
    // recomputing it here.
    const enRiesgo = pendientes.filter((r) => (r.brechaDias ?? -Infinity) > 0).length;

    const aggregates: IndicadoresAggregates = {
      totalOsis: evaluadas.length + pendientes.length + programadas + noAplica,
      totalEvaluadas: evaluadas.length,
      dentro72: dentro,
      fuera72: fuera,
      pendientes: pendientes.length,
      programadas,
      noAplica,
      pctCumplimiento: pct,
      avgDias,
      maxDias,
      maxDiasOsi: maxRow?.nroOsi ?? null,
      minDias,
      enRiesgoPendientes: enRiesgo,
    };

    return { data: { rows, aggregates }, error: null };
  } catch (err) {
    console.error("Unexpected error in getIndicadoresCertificados72h:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Filter options: OSIs (for the multi-select), empresas, facilitadores, estados
const getCachedIndicadoresFilterOptions = cache(
  async (): Promise<IndicadoresFilterOptions> => {
    const supabase = await createClient();

    const [
      { data: osis, error: osiErr },
      { data: empresas, error: empErr },
      { data: facilitadores, error: facErr },
      { data: states, error: stateErr },
    ] = await Promise.all([
      supabase
        .from("v_osi_formato_completo")
        .select("id_osi, nro_osi, nombre_empresa, servicio, tipo_servicio")
        .ilike("tipo_servicio", "%capacitacion%")
        .not("nro_osi", "ilike", "%PEN-%")
        .order("nro_osi", { ascending: false }),
      supabase
        .from("empresas")
        .select("id, razon_social")
        .eq("es_cliente", true)
        .order("razon_social", { ascending: true }),
      supabase
        .from("facilitadores")
        .select("id, nombre_apellido")
        .order("nombre_apellido", { ascending: true }),
      supabase
        .from("cat_estados_venezuela")
        .select("id, nombre_estado, capital_estado")
        .order("nombre_estado", { ascending: true }),
    ]);

    if (osiErr) console.error("Error fetching OSI options:", osiErr);
    if (empErr) console.error("Error fetching empresa options:", empErr);
    if (facErr) console.error("Error fetching facilitador options:", facErr);
    if (stateErr) console.error("Error fetching state options:", stateErr);

    const osiOptions: IndicadorOsiOption[] = (osis || []).map(
      (o: { id_osi: number; nro_osi: string | null; nombre_empresa: string | null; servicio: string | null }) => ({
        id: o.id_osi,
        nro_osi: o.nro_osi ?? "",
        nombre_empresa: o.nombre_empresa ?? null,
        servicio: o.servicio ?? null,
      }),
    );

    return {
      osis: osiOptions,
      empresas: (empresas || []).map(
        (e: { id: number; razon_social: string }) => ({
          id: e.id,
          razon_social: e.razon_social,
        }),
      ),
      facilitadores: (facilitadores || []).map(
        (f: { id: number; nombre_apellido: string }) => ({
          id: f.id,
          nombre_apellido: f.nombre_apellido,
        }),
      ),
      estados: (states || []).map(
        (s: { id: number | string; nombre_estado: string; capital_estado: string | null }) => ({
          id: Number(s.id),
          nombre_estado: s.nombre_estado,
          capital_estado: s.capital_estado,
        }),
      ),
    };
  },
);

export async function getIndicadoresFilterOptionsAction(): Promise<IndicadoresFilterOptions> {
  return await getCachedIndicadoresFilterOptions();
}
