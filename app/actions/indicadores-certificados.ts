"use server";

import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import type {
  DistribucionBucket,
  IndicadorEstado,
  IndicadorFuente,
  IndicadorFuenteEjecucion,
  IndicadorOsiOption,
  IndicadorOsiRow,
  IndicadoresAggregates,
  IndicadoresFilterOptions,
  IndicadoresFilters,
  IndicadoresResponse,
  PorDimensionItem,
  TendenciaMensual,
} from "@/types";
import { getFeriadosSet } from "@/app/actions/feriados";
import { businessDaysInclusive, parseDate } from "@/lib/business-days";

// SLA threshold in business days (inclusive of execution day).
// Certificates must be issued within 3 business days of the last session
// execution date. Execution day = day 1.
const SLA_BUSINESS_DAYS = 3;

// Rows with business days beyond this threshold are flagged "sospechoso"
// (data quality suspect) — highlighted amber in the table for auditor review.
// 90 business days ≈ ~180 calendar days.
const SOSPECHOSO_DIAS = 90;

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function emptyAggregates(): IndicadoresAggregates {
  return {
    totalEvaluadas: 0,
    dentro72: 0,
    fuera72: 0,
    pendientes: 0,
    noAplica: 0,
    pctCumplimiento: null,
    avgDias: null,
    medianaDias: null,
    maxDias: null,
    maxDiasOsi: null,
    minDias: null,
    enRiesgoPendientes: 0,
    distribucion: [],
    tendenciaMensual: [],
    porEmpresa: [],
    porFacilitador: [],
    porFacilitadorSesion: [],
    backlog: [],
  };
}

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function monthKeyFromDate(dateStr: string): string | null {
  const d = parseDate(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelFromKey(key: string): string {
  const [y, m] = key.split("-");
  const idx = parseInt(m, 10) - 1;
  return `${MONTH_LABELS[idx] ?? m} ${y.slice(2)}`;
}

// Build last 12 months keys ending at the latest data month (or current month)
function buildLast12Months(latestKey: string): string[] {
  const [y, m] = latestKey.split("-").map((n) => parseInt(n, 10));
  const keys: string[] = [];
  const cur = new Date(y, m - 1, 1);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function computeDistribucion(rows: IndicadorOsiRow[]): DistribucionBucket[] {
  // Business-day buckets. The SLA is 3 business days inclusive.
  // Bucket boundaries: [0,1), [1,2), [2,3], (3,4], (4, +inf)
  // Note: the "2-3" bucket includes 3 (<= SLA) to be consistent with estado.
  const buckets = [
    { bucket: "0-1", label: "0–1 días", min: 0, max: 1, dentro: true },
    { bucket: "1-2", label: "1–2 días", min: 1, max: 2, dentro: true },
    { bucket: "2-3", label: "2–3 días", min: 2, max: 3, dentro: true },
    { bucket: "3-4", label: "3–4 días", min: 3, max: 4, dentro: false },
    { bucket: ">4", label: ">4 días", min: 4, max: Infinity, dentro: false },
  ];
  return buckets.map((b) => ({
    bucket: b.bucket,
    label: b.label,
    dentro: b.dentro,
    count: rows.filter((r) => {
      if (r.diasHabiles == null) return false;
      if (b.max === Infinity) return r.diasHabiles > b.min;
      // The "2-3" bucket is inclusive of the upper bound (3 = SLA)
      if (b.bucket === "2-3") return r.diasHabiles >= b.min && r.diasHabiles <= b.max;
      return r.diasHabiles >= b.min && r.diasHabiles < b.max;
    }).length,
  }));
}

function computeTendencia(
  rows: IndicadorOsiRow[],
  fechaFrom?: string,
  fechaTo?: string,
): TendenciaMensual[] {
  // Group evaluadas (dentro+fuera) by month of fechaEjecucion
  const byMonth = new Map<string, { dentro: number; fuera: number }>();
  let earliestKey = "";
  let latestKey = "";
  for (const r of rows) {
    if (r.estado !== "dentro" && r.estado !== "fuera") continue;
    if (!r.fechaEjecucion) continue;
    const key = monthKeyFromDate(r.fechaEjecucion);
    if (!key) continue;
    const entry = byMonth.get(key) ?? { dentro: 0, fuera: 0 };
    if (r.estado === "dentro") entry.dentro += 1;
    else entry.fuera += 1;
    byMonth.set(key, entry);
    if (!earliestKey || key < earliestKey) earliestKey = key;
    if (key > latestKey) latestKey = key;
  }

  // Determine the month range to display:
  // - If date filters are applied, use the filter range (from the start of
  //   fechaFrom's month to the end of fechaTo's month).
  // - Otherwise, default to the last 12 months ending at the latest data
  //   month (or current month if no data).
  let startKey: string;
  let endKey: string;
  if (fechaFrom || fechaTo) {
    if (fechaFrom) {
      const d = parseDate(fechaFrom);
      startKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    } else {
      startKey = earliestKey || (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      })();
    }
    if (fechaTo) {
      const d = parseDate(fechaTo);
      endKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    } else {
      endKey = latestKey || (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      })();
    }
  } else {
    if (!latestKey) {
      const now = new Date();
      latestKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }
    // Last 12 months ending at latestKey
    const keys12 = buildLast12Months(latestKey);
    startKey = keys12[0];
    endKey = keys12[keys12.length - 1];
  }

  // Build the full list of month keys from startKey to endKey
  const keys: string[] = [];
  {
    const [sy, sm] = startKey.split("-").map(Number);
    const [ey, em] = endKey.split("-").map(Number);
    let y = sy, m = sm;
    while (y < ey || (y === ey && m <= em)) {
      keys.push(`${y}-${String(m).padStart(2, "0")}`);
      m++;
      if (m > 12) { m = 1; y++; }
    }
  }

  return keys.map((key) => {
    const e = byMonth.get(key);
    const dentro = e?.dentro ?? 0;
    const fuera = e?.fuera ?? 0;
    const total = dentro + fuera;
    return {
      mes: key,
      label: monthLabelFromKey(key),
      dentro,
      fuera,
      total,
      pct: total > 0 ? Math.round((dentro / total) * 1000) / 10 : null,
    };
  });
}

function computePorDimension(
  rows: IndicadorOsiRow[],
  getKey: (r: IndicadorOsiRow) => string | null,
  getLabel: (r: IndicadorOsiRow) => string,
  topN: number,
): PorDimensionItem[] {
  const map = new Map<string, { label: string; count: number; dentro: number; fuera: number; pendientes: number; diasSum: number; diasCount: number }>();
  for (const r of rows) {
    const key = getKey(r);
    if (key == null) continue;
    const entry = map.get(key) ?? {
      label: getLabel(r),
      count: 0, dentro: 0, fuera: 0, pendientes: 0, diasSum: 0, diasCount: 0,
    };
    entry.count += 1;
    if (r.estado === "dentro") entry.dentro += 1;
    else if (r.estado === "fuera") entry.fuera += 1;
    else if (r.estado === "pendiente") entry.pendientes += 1;
    if (r.diasHabiles != null) {
      entry.diasSum += r.diasHabiles;
      entry.diasCount += 1;
    }
    map.set(key, entry);
  }
  const items: PorDimensionItem[] = Array.from(map.entries()).map(([key, e]) => ({
    key,
    label: e.label,
    count: e.count,
    dentro: e.dentro,
    fuera: e.fuera,
    pendientes: e.pendientes,
    avgDias: e.diasCount > 0 ? Math.round((e.diasSum / e.diasCount) * 10) / 10 : null,
    pct: e.dentro + e.fuera > 0 ? Math.round((e.dentro / (e.dentro + e.fuera)) * 1000) / 10 : null,
  }));
  items.sort((a, b) => b.count - a.count);
  return items.slice(0, topN);
}

type OsiViewRow = {
  id_osi: number | null;
  nro_osi: string | null;
  nombre_empresa: string | null;
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
  fecha: string;
  fecha_ejecutada: string | null;
};

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
    let q = supabase
      .from("v_osi_formato_completo")
      .select(
        "id_osi, nro_osi, nombre_empresa, servicio, fecha_fin_real, fecha_emision, id_empresa, id_estatus, sesiones_ejecucion, tipo_servicio, id_estado_direccion_ejecucion_efectiva",
      )
      .ilike("tipo_servicio", "%capacitacion%")
      .not("nro_osi", "ilike", "%PEN-%");

    if (filters.osiIds?.length) q = q.in("id_osi", filters.osiIds);
    if (filters.empresaId) q = q.eq("id_empresa", filters.empresaId);
    if (filters.estadoId)
      q = q.eq("id_estado_direccion_ejecucion_efectiva", filters.estadoId);

    const { data: osis, error } = await q.order("fecha_fin_real", {
      ascending: false,
      nullsFirst: false,
    });

    if (error) {
      console.error("Error fetching OSIs for indicadores:", error);
      return { data: null, error: error.message };
    }
    if (!osis || osis.length === 0) {
      return { data: { rows: [], aggregates: emptyAggregates() }, error: null };
    }

    const osiIds = osis
      .map((o: OsiViewRow) => o.id_osi)
      .filter((v): v is number => v != null);

    // Map osiId -> numeric nro_osi (for joining certificados.nro_osi).
    // certificados.nro_osi references ejecucion_osi.nro_osi_secuencial (as
    // an integer). Instead of parsing the formatted nro_osi string from the
    // view (which is fragile), we query ejecucion_osi directly using id_osi
    // (the primary key) to get nro_osi_secuencial. This is the exact field
    // that certificados.nro_osi stores.
    const numericOsiByOsiId = new Map<number, number>();
    if (osiIds.length) {
      const { data: ejecucionRows, error: ejecErr } = await supabase
        .from("ejecucion_osi")
        .select("id, nro_osi_secuencial")
        .in("id", osiIds);
      if (ejecErr) {
        console.error("Error fetching ejecucion_osi for nro_osi_secuencial:", ejecErr);
      }
      for (const e of ejecucionRows || []) {
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

    // 2. Batch fetch osi_sesion dates → compute the SLA start date per OSI.
    //    For each session, prefer fecha_ejecutada (actual) and fall back to
    //    fecha (planned) on a PER-SESSION basis. Then take the MAX across all
    //    sessions. This ensures that if only some sessions have
    //    fecha_ejecutada populated, we don't ignore the latest session's
    //    planned date — which would inflate the gap.
    //    Final fallback: fecha_fin_real from the OSI view.
    const maxSesionFechaByOsi = new Map<number, string>();
    const usedFechaEjecutadaByOsi = new Set<number>();
    if (osiIds.length) {
      const { data: sesionRows, error: sesionErr } = await supabase
        .from("osi_sesion")
        .select("id_osi, fecha, fecha_ejecutada")
        .in("id_osi", osiIds);
      if (sesionErr) {
        console.error("Error fetching osi_sesion for indicadores:", sesionErr);
      }
      for (const s of (sesionRows || []) as SesionRow[]) {
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
      }
    >();
    const facilitadorNames = new Map<number, string>();
    if (numericOsis.length) {
      // Paginate through ALL cert rows — Supabase defaults to 1000 rows per
      // request, which is far too few for OSIs with many participants (each
      // participant gets a cert row). Without pagination, we'd only get the
      // first 1000 certs (all for the same few OSIs) and miss the rest.
      const PAGE_SIZE = 1000;
      let pageStart = 0;
      let allCerts: Array<{
        nro_osi: number | null;
        fecha_emision: string | null;
        created_at: string | null;
        id_facilitador: number | null;
        facilitadores: unknown;
      }> = [];
      let fetchError: string | null = null;
      // Safety cap to avoid infinite loops (50 pages = 50,000 certs)
      for (let page = 0; page < 50; page++) {
        const { data: pageData, error: pageErr } = await supabase
          .from("certificados")
          .select(
            "nro_osi, fecha_emision, created_at, id_facilitador, facilitadores!inner(nombre_apellido)",
          )
          .in("nro_osi", numericOsis)
          .range(pageStart, pageStart + PAGE_SIZE - 1);
        if (pageErr) {
          fetchError = pageErr.message;
          console.error("Error fetching certificados page", page, ":", pageErr);
          break;
        }
        allCerts = allCerts.concat(pageData || []);
        if ((pageData || []).length < PAGE_SIZE) break; // last page
        pageStart += PAGE_SIZE;
      }
      if (fetchError) {
        console.error("Error fetching certificados for indicadores:", fetchError);
      }
      const certs = allCerts;
      for (const c of certs || []) {
        if (c.nro_osi == null) continue;
        const ca = c.created_at ?? null;
        const fe = c.fecha_emision ?? null;
        const existing = certByNumericOsi.get(c.nro_osi);
        if (!existing) {
          certByNumericOsi.set(c.nro_osi, {
            minFechaEmision: fe,
            minCreatedAt: ca,
            facilitadorId: c.id_facilitador ?? null,
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

    // 3b. Batch fetch session facilitador assignments (facilitador_osi_assignments)
    //     for the "por facilitador de sesión" dimension.
    const sessionFacilitadorByOsi = new Map<number, string | null>();
    if (osiIds.length) {
      const { data: assignRows, error: assignErr } = await supabase
        .from("facilitador_osi_assignments")
        .select(
          "osi_id, facilitador_id, is_active, facilitadores!inner(nombre_apellido)",
        )
        .in("osi_id", osiIds)
        .eq("is_active", true);
      if (assignErr) {
        console.error("Error fetching facilitador assignments for indicadores:", assignErr);
      }
      for (const a of assignRows || []) {
        const facArr = a.facilitadores as unknown as
          | { nombre_apellido: string | null }
          | { nombre_apellido: string | null }[]
          | null;
        const fac = Array.isArray(facArr) ? facArr[0] : facArr;
        const name = fac?.nombre_apellido ?? null;
        // Only set if not already set (first active assignment wins)
        if (!sessionFacilitadorByOsi.has(a.osi_id)) {
          sessionFacilitadorByOsi.set(a.osi_id, name);
        }
      }
    }

    // 4. Build per-OSI rows
    const facilitadorIdByOsi = new Map<number, number | null>();
    const allRows: IndicadorOsiRow[] = (osis as OsiViewRow[]).map((o) => {
      const osiId = o.id_osi ?? 0;
      const fechaFinReal = o.fecha_fin_real ?? null;

      // SLA start: MAX(per-session fecha_ejecutada ?? fecha) || fecha_fin_real
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

      // SLA end: MIN(fecha_emision) (primary) || MIN(created_at) (fallback)
      const numericOsi = numericOsiByOsiId.get(osiId) ?? null;
      const cert = numericOsi != null ? certByNumericOsi.get(numericOsi) : undefined;
      const minFechaEmision = cert?.minFechaEmision ?? null;
      const minCreatedAt = cert?.minCreatedAt ?? null;
      const facilitadorId = cert?.facilitadorId ?? null;
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
      } else if (!fechaEmision) {
        estado = "pendiente";
      } else {
        const execDate = parseDate(fechaEjecucion);
        const certDate = parseDate(fechaEmision);
        diasHabiles = businessDaysInclusive(execDate, certDate, holidays);

        // Pre-generated cert (created before execution): flag as sospechoso
        if (certDate < execDate) {
          diasHabiles = 0;
          estado = "dentro";
          sospechoso = true;
        } else if (diasHabiles <= SLA_BUSINESS_DAYS) {
          estado = "dentro";
        } else {
          estado = "fuera";
          brechaDias = diasHabiles - SLA_BUSINESS_DAYS;
        }

        // Flag extreme values as sospechoso for auditor review
        if (diasHabiles > SOSPECHOSO_DIAS) {
          sospechoso = true;
        }
      }

      const facilitadorNombre =
        facilitadorId != null ? facilitadorNames.get(facilitadorId) ?? null : null;
      const facilitadorSesionNombre =
        sessionFacilitadorByOsi.get(osiId) ?? null;

      return {
        osiId,
        nroOsi: o.nro_osi ?? "",
        empresa: o.nombre_empresa ?? "",
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
    if (filters.fechaFrom) {
      const fromStart = parseDate(filters.fechaFrom);
      rows = rows.filter(
        (r) => r.fechaEjecucion != null && parseDate(r.fechaEjecucion) >= fromStart,
      );
    }
    if (filters.fechaTo) {
      // End of day: parse the date and set to 23:59:59 local
      const toEnd = parseDate(filters.fechaTo);
      toEnd.setHours(23, 59, 59, 999);
      rows = rows.filter(
        (r) => r.fechaEjecucion != null && parseDate(r.fechaEjecucion) <= toEnd,
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
    const noAplica = rows.filter((r) => r.estado === "no_aplica").length;
    const diasVals = evaluadas
      .map((r) => r.diasHabiles)
      .filter((v): v is number => v != null);
    const avgDias = diasVals.length
      ? Math.round((diasVals.reduce((a, b) => a + b, 0) / diasVals.length) * 10) / 10
      : null;
    const medDias = median(diasVals);
    const maxDias = diasVals.length ? Math.max(...diasVals) : null;
    const minDias = diasVals.length ? Math.min(...diasVals) : null;
    const maxRow = evaluadas.find((r) => r.diasHabiles === maxDias);
    const pct =
      evaluadas.length > 0
        ? Math.round((dentro / evaluadas.length) * 1000) / 10
        : null;

    // Pending in risk: fechaEjecucion more than SLA business days ago and still not issued
    const nowDate = new Date();
    const enRiesgo = pendientes.filter((r) => {
      if (!r.fechaEjecucion) return false;
      const elapsed = businessDaysInclusive(parseDate(r.fechaEjecucion), nowDate, holidays);
      return elapsed > SLA_BUSINESS_DAYS;
    }).length;

    const backlog = pendientes
      .map((r) => ({
        ...r,
        brechaDias:
          r.fechaEjecucion != null
            ? businessDaysInclusive(parseDate(r.fechaEjecucion), nowDate, holidays) - SLA_BUSINESS_DAYS
            : null,
      }))
      .sort((a, b) => (b.brechaDias ?? -Infinity) - (a.brechaDias ?? -Infinity))
      .slice(0, 20);

    const aggregates: IndicadoresAggregates = {
      totalEvaluadas: evaluadas.length,
      dentro72: dentro,
      fuera72: fuera,
      pendientes: pendientes.length,
      noAplica,
      pctCumplimiento: pct,
      avgDias,
      medianaDias: medDias != null ? Math.round(medDias * 10) / 10 : null,
      maxDias,
      maxDiasOsi: maxRow?.nroOsi ?? null,
      minDias,
      enRiesgoPendientes: enRiesgo,
      distribucion: computeDistribucion(rows),
      tendenciaMensual: computeTendencia(rows, filters.fechaFrom, filters.fechaTo),
      porEmpresa: computePorDimension(
        rows,
        (r) => r.empresa || null,
        (r) => r.empresa || "Sin empresa",
        10,
      ),
      porFacilitador: computePorDimension(
        rows,
        (r) => r.facilitadorNombre || null,
        (r) => r.facilitadorNombre || "Sin facilitador",
        10,
      ),
      porFacilitadorSesion: computePorDimension(
        rows,
        (r) => r.facilitadorSesionNombre || null,
        (r) => r.facilitadorSesionNombre || "Sin facilitador",
        10,
      ),
      backlog,
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
