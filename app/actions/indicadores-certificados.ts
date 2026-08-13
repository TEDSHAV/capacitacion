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

// SLA threshold in hours: certificates must be issued within 72h of the last
// session execution date (MAX(osi_sesion.fecha), with fecha_fin_real fallback).
const SLA_HOURS = 72;

// Rows with hours beyond this threshold are flagged "sospechoso" (data quality
// suspect) — highlighted amber in the table for auditor review.
const SOSPECHOSO_HOURS = 4320; // 180 days

// Parse the formatted nro_osi (e.g. "OSI-24-0123") into the numeric value
// stored on certificados.nro_osi (e.g. 123).
function parseNumericOsi(nroOsi: string | null): number | null {
  if (!nroOsi) return null;
  const n = parseInt(nroOsi.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function hoursBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms / 3_600_000;
}

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
    avgHoras: null,
    medianaHoras: null,
    maxHoras: null,
    maxHorasOsi: null,
    minHoras: null,
    enRiesgoPendientes: 0,
    distribucion: [],
    tendenciaMensual: [],
    porEmpresa: [],
    porFacilitador: [],
    backlog: [],
  };
}

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function monthKeyFromDate(dateStr: string): string | null {
  const d = new Date(dateStr);
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
  const buckets = [
    { bucket: "0-24", label: "0–24h", min: 0, max: 24, dentro: true },
    { bucket: "24-48", label: "24–48h", min: 24, max: 48, dentro: true },
    { bucket: "48-72", label: "48–72h", min: 48, max: 72, dentro: true },
    { bucket: "72-96", label: "72–96h", min: 72, max: 96, dentro: false },
    { bucket: ">96", label: ">96h", min: 96, max: Infinity, dentro: false },
  ];
  return buckets.map((b) => ({
    bucket: b.bucket,
    label: b.label,
    dentro: b.dentro,
    count: rows.filter((r) => {
      if (r.horas == null) return false;
      if (b.max === Infinity) return r.horas >= b.min;
      return r.horas >= b.min && r.horas < b.max;
    }).length,
  }));
}

function computeTendencia(rows: IndicadorOsiRow[]): TendenciaMensual[] {
  // Group evaluadas (dentro+fuera) by month of fechaEjecucion
  const byMonth = new Map<string, { dentro: number; fuera: number }>();
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
    if (key > latestKey) latestKey = key;
  }
  if (!latestKey) {
    const now = new Date();
    latestKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  const keys = buildLast12Months(latestKey);
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
  const map = new Map<string, { label: string; count: number; dentro: number; fuera: number; pendientes: number; horasSum: number; horasCount: number }>();
  for (const r of rows) {
    const key = getKey(r);
    if (key == null) continue;
    const entry = map.get(key) ?? {
      label: getLabel(r),
      count: 0, dentro: 0, fuera: 0, pendientes: 0, horasSum: 0, horasCount: 0,
    };
    entry.count += 1;
    if (r.estado === "dentro") entry.dentro += 1;
    else if (r.estado === "fuera") entry.fuera += 1;
    else if (r.estado === "pendiente") entry.pendientes += 1;
    if (r.horas != null) {
      entry.horasSum += r.horas;
      entry.horasCount += 1;
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
    avgHoras: e.horasCount > 0 ? Math.round((e.horasSum / e.horasCount) * 10) / 10 : null,
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

export async function getIndicadoresCertificados72h(
  filters: IndicadoresFilters,
): Promise<{ data: IndicadoresResponse | null; error: string | null }> {
  try {
    const supabase = await createClient();

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

    // Map osiId -> numeric nro_osi (for joining certificados.nro_osi)
    const numericOsiByOsiId = new Map<number, number>();
    for (const o of osis as OsiViewRow[]) {
      if (o.id_osi != null) {
        const n = parseNumericOsi(o.nro_osi);
        if (n != null) numericOsiByOsiId.set(o.id_osi, n);
      }
    }
    const numericOsis = Array.from(new Set(numericOsiByOsiId.values()));

    // 2. Batch fetch osi_sesion dates → compute MAX(fecha) per OSI as
    //    fechaEjecucion (the SLA start point). Falls back to fecha_fin_real.
    const maxSesionFechaByOsi = new Map<number, string>();
    if (osiIds.length) {
      const { data: sesionRows, error: sesionErr } = await supabase
        .from("osi_sesion")
        .select("id_osi, fecha")
        .in("id_osi", osiIds);
      if (sesionErr) {
        console.error("Error fetching osi_sesion for indicadores:", sesionErr);
      }
      for (const s of sesionRows || []) {
        if (s.fecha == null) continue;
        const cur = maxSesionFechaByOsi.get(s.id_osi) ?? null;
        if (!cur || s.fecha > cur) {
          maxSesionFechaByOsi.set(s.id_osi, s.fecha);
        }
      }
    }

    // 3. Batch fetch certificados: MIN(created_at) + MAX(fecha_emision) +
    //    a facilitador per nro_osi.
    //    created_at (TIMESTAMPTZ, auto DEFAULT now()) is the most reliable
    //    issuance timestamp — the exact second the cert record was inserted.
    //    fecha_emision (DATE, user-provided) is the fallback.
    const certByNumericOsi = new Map<
      number,
      {
        minCreatedAt: string | null;
        maxFechaEmision: string | null;
        facilitadorId: number | null;
      }
    >();
    const facilitadorNames = new Map<number, string>();
    if (numericOsis.length) {
      const { data: certs, error: certErr } = await supabase
        .from("certificados")
        .select(
          "nro_osi, fecha_emision, created_at, id_facilitador, facilitadores!inner(nombre_apellido)",
        )
        .in("nro_osi", numericOsis);
      if (certErr) {
        console.error("Error fetching certificados for indicadores:", certErr);
      }
      for (const c of certs || []) {
        if (c.nro_osi == null) continue;
        const ca = c.created_at ?? null;
        const fe = c.fecha_emision ?? null;
        const existing = certByNumericOsi.get(c.nro_osi);
        if (!existing) {
          certByNumericOsi.set(c.nro_osi, {
            minCreatedAt: ca,
            maxFechaEmision: fe,
            facilitadorId: c.id_facilitador ?? null,
          });
        } else {
          // MIN(created_at): earliest cert creation timestamp
          if (ca && (!existing.minCreatedAt || ca < existing.minCreatedAt)) {
            existing.minCreatedAt = ca;
          }
          // MAX(fecha_emision): latest emission date (fallback)
          if (fe && (!existing.maxFechaEmision || fe > existing.maxFechaEmision)) {
            existing.maxFechaEmision = fe;
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

    // 4. Build per-OSI rows
    const facilitadorIdByOsi = new Map<number, number | null>();
    const allRows: IndicadorOsiRow[] = (osis as OsiViewRow[]).map((o) => {
      const osiId = o.id_osi ?? 0;
      const fechaFinReal = o.fecha_fin_real ?? null;

      // SLA start: MAX(osi_sesion.fecha) || fecha_fin_real
      const maxSesion = maxSesionFechaByOsi.get(osiId) ?? null;
      let fechaEjecucion: string | null;
      let fuenteEjecucion: IndicadorFuenteEjecucion | null;
      if (maxSesion) {
        fechaEjecucion = maxSesion;
        fuenteEjecucion = "sesiones";
      } else if (fechaFinReal) {
        fechaEjecucion = fechaFinReal;
        fuenteEjecucion = "fecha_fin_real";
      } else {
        fechaEjecucion = null;
        fuenteEjecucion = null;
      }

      // SLA end: MIN(certificados.created_at) || MAX(fecha_emision)
      const numericOsi = numericOsiByOsiId.get(osiId) ?? null;
      const cert = numericOsi != null ? certByNumericOsi.get(numericOsi) : undefined;
      const minCreatedAt = cert?.minCreatedAt ?? null;
      const maxFechaEmision = cert?.maxFechaEmision ?? null;
      const facilitadorId = cert?.facilitadorId ?? null;
      facilitadorIdByOsi.set(osiId, facilitadorId);

      let fechaEmision: string | null = null;
      let fuenteEmision: IndicadorFuente | null = null;
      if (minCreatedAt) {
        fechaEmision = minCreatedAt;
        fuenteEmision = "created_at";
      } else if (maxFechaEmision) {
        fechaEmision = maxFechaEmision;
        fuenteEmision = "fecha_emision";
      }

      let horas: number | null = null;
      let estado: IndicadorEstado;
      let brechaHoras: number | null = null;

      if (!fechaEjecucion) {
        estado = "no_aplica";
      } else if (!fechaEmision) {
        estado = "pendiente";
      } else {
        horas = hoursBetween(fechaEjecucion, fechaEmision);
        // Clamp negative hours to 0 (cert created before execution ended — pre-generated)
        if (horas < 0) horas = 0;
        if (horas <= SLA_HOURS) {
          estado = "dentro";
        } else {
          estado = "fuera";
          brechaHoras = Math.round((horas - SLA_HOURS) * 10) / 10;
        }
        horas = Math.round(horas * 10) / 10;
      }

      const facilitadorNombre =
        facilitadorId != null ? facilitadorNames.get(facilitadorId) ?? null : null;

      return {
        osiId,
        nroOsi: o.nro_osi ?? "",
        empresa: o.nombre_empresa ?? "",
        servicio: o.servicio ?? "",
        fechaEjecucion,
        fuenteEjecucion,
        fechaEmision,
        fuenteEmision,
        horas,
        estado,
        brechaHoras,
        facilitadorNombre,
        sesiones: o.sesiones_ejecucion ?? null,
        sospechoso: horas != null && horas > SOSPECHOSO_HOURS,
      };
    });

    // Apply post-fetch filters
    let rows = allRows;

    // Date filters on fechaEjecucion (computed, not a DB column on the view)
    if (filters.fechaFrom) {
      rows = rows.filter(
        (r) => r.fechaEjecucion != null && r.fechaEjecucion >= filters.fechaFrom!,
      );
    }
    if (filters.fechaTo) {
      rows = rows.filter(
        (r) => r.fechaEjecucion != null && r.fechaEjecucion <= filters.fechaTo!,
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
    const horasVals = evaluadas
      .map((r) => r.horas)
      .filter((v): v is number => v != null);
    const avgHoras = horasVals.length
      ? Math.round((horasVals.reduce((a, b) => a + b, 0) / horasVals.length) * 10) / 10
      : null;
    const medHoras = median(horasVals);
    const maxHoras = horasVals.length ? Math.max(...horasVals) : null;
    const minHoras = horasVals.length ? Math.min(...horasVals) : null;
    const maxRow = evaluadas.find((r) => r.horas === maxHoras);
    const pct =
      evaluadas.length > 0
        ? Math.round((dentro / evaluadas.length) * 1000) / 10
        : null;

    // Pending in risk: fechaEjecucion more than 72h ago and still not issued
    const nowMs = Date.now();
    const enRiesgo = pendientes.filter((r) => {
      if (!r.fechaEjecucion) return false;
      const elapsed = (nowMs - new Date(r.fechaEjecucion).getTime()) / 3_600_000;
      return elapsed > SLA_HOURS;
    }).length;

    const backlog = pendientes
      .map((r) => ({
        ...r,
        brechaHoras:
          r.fechaEjecucion != null
            ? Math.round(((nowMs - new Date(r.fechaEjecucion).getTime()) / 3_600_000 - SLA_HOURS) * 10) / 10
            : null,
      }))
      .sort((a, b) => (b.brechaHoras ?? -Infinity) - (a.brechaHoras ?? -Infinity))
      .slice(0, 20);

    const aggregates: IndicadoresAggregates = {
      totalEvaluadas: evaluadas.length,
      dentro72: dentro,
      fuera72: fuera,
      pendientes: pendientes.length,
      noAplica,
      pctCumplimiento: pct,
      avgHoras,
      medianaHoras: medHoras != null ? Math.round(medHoras * 10) / 10 : null,
      maxHoras,
      maxHorasOsi: maxRow?.nroOsi ?? null,
      minHoras,
      enRiesgoPendientes: enRiesgo,
      distribucion: computeDistribucion(rows),
      tendenciaMensual: computeTendencia(rows),
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
