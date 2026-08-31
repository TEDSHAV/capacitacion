"use server";

import { createClient } from "@/utils/supabase/server";
import type {
  GestionMesIndicadores,
  GestionMensualResponse,
  IndicadoresGestionFilters,
  OsiCarryRow,
} from "@/types";
import { OSI_ESTATUS } from "@/lib/sync/sync-osi-estatus";
import { parseDate, toDateStr } from "@/lib/business-days";

// Supabase caps un-ranged selects at 1000 rows, so every fetch here pages
// explicitly. 50 pages = 50,000 rows, enough headroom for a full year while
// still bounding a runaway loop.
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

// `.in()` lists are serialized into the query string, so large id arrays are
// split into chunks to stay well under URL length limits.
const IN_CHUNK_SIZE = 300;

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const ESTATUS_LABELS: Record<number, string> = {
  [OSI_ESTATUS.PENDIENTE]: "Pendiente",
  [OSI_ESTATUS.EN_PROCESO]: "En proceso",
  [OSI_ESTATUS.EJECUTADO]: "Ejecutado",
  [OSI_ESTATUS.NO_EJECUTADA]: "No ejecutada",
};

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
      console.error(`[indicadores-gestion] Error fetching ${label} page ${page}:`, error);
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
    const rows = await fetchAllPages<T>(
      (from, to) => build(chunk, from, to),
      label,
    );
    all.push(...rows);
  }
  return all;
}

/** "YYYY-MM" month key for a date-only string or timestamp, null if unusable. */
function monthKey(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = parseDate(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function yearOf(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = parseDate(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.getFullYear();
}

function emptyBucket(mes: string, label: string): GestionMesIndicadores {
  return {
    mes,
    label,
    osisRecibidas: 0,
    osisEjecutadasEnSuMes: 0,
    osisPendientes: 0,
    osisPendientesVencidas: 0,
    osisRezagadasEjecutadas: 0,
    osisPlanificadas: 0,
    participantesPlanificados: 0,
    participantesLista: 0,
    certificados: 0,
    participantesCertificados: 0,
    pvc: 0,
  };
}

type OsiRow = {
  id_osi: number | null;
  nro_osi: string | null;
  fecha_emision: string | null;
  fecha_inicio_real: string | null;
  fecha_fin_real: string | null;
  participantes_ejecucion: number | null;
  id_empresa: number | null;
  id_estatus: number | null;
  nombre_empresa: string | null;
};

type SesionRow = {
  id_osi: number;
  fecha: string | null;
  fecha_ejecutada: string | null;
};

type SesionAgg = {
  minFecha: string | null;
  maxFecha: string | null;
  total: number;
  ejecutadas: number;
  maxEjecutada: string | null;
};

/**
 * Monthly management indicators for the capacitacion pipeline.
 *
 * Scope is the same as every other screen in the module: only capacitacion
 * OSIs, excluding provisional `PEN-` numbers.
 *
 * OSIs are fetched for ALL years (not just `filters.year`) because an OSI
 * planned in a previous year can still be executed inside the selected year
 * — that's exactly what `osisRezagadasEjecutadas` measures. Certificates and
 * carnets, on the other hand, are counted by their own issuance month, so
 * they're queried against the selected year only.
 */
export async function getIndicadoresGestionMensual(
  filters: IndicadoresGestionFilters,
): Promise<{ data: GestionMensualResponse | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { year } = filters;
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const todayStr = toDateStr(new Date());

    // ── 1. OSIs ───────────────────────────────────────────────────────────
    const osis = await fetchAllPages<OsiRow>((from, to) => {
      let q = supabase
        .from("v_osi_formato_completo")
        .select(
          "id_osi, nro_osi, fecha_emision, fecha_inicio_real, fecha_fin_real, participantes_ejecucion, id_empresa, id_estatus, nombre_empresa",
        )
        .ilike("tipo_servicio", "%capacitacion%")
        .not("nro_osi", "ilike", "%PEN-%");
      if (filters.empresaId) q = q.eq("id_empresa", filters.empresaId);
      if (filters.estadoId)
        q = q.eq("id_estado_direccion_ejecucion_efectiva", filters.estadoId);
      return q.order("id_osi", { ascending: true }).range(from, to);
    }, "v_osi_formato_completo");

    // ── 2. Facilitador filter (OSI side) ─────────────────────────────────
    // Resolved from the CURRENT active assignments, unlike the 72h indicator
    // which filters by the facilitador who issued the certificate.
    let osiRows = osis;
    if (filters.facilitadorId) {
      const fid = parseInt(filters.facilitadorId, 10);
      const assigned = await fetchAllPages<{ osi_id: number }>(
        (from, to) =>
          supabase
            .from("facilitador_osi_assignments")
            .select("osi_id")
            .eq("facilitador_id", fid)
            .eq("is_active", true)
            .order("osi_id", { ascending: true })
            .range(from, to),
        "facilitador_osi_assignments",
      );
      const assignedIds = new Set(assigned.map((a) => a.osi_id));
      osiRows = osiRows.filter((o) => o.id_osi != null && assignedIds.has(o.id_osi));
    }

    const osiIds = osiRows
      .map((o) => o.id_osi)
      .filter((v): v is number => v != null);

    // ── 3. Sessions → planned / executed dates per OSI ───────────────────
    const sesiones = await fetchChunkedIn<SesionRow>(
      osiIds,
      (chunk, from, to) =>
        supabase
          .from("osi_sesion")
          .select("id_osi, fecha, fecha_ejecutada")
          .in("id_osi", chunk)
          .order("id", { ascending: true })
          .range(from, to),
      "osi_sesion",
    );

    const aggByOsi = new Map<number, SesionAgg>();
    for (const s of sesiones) {
      const agg =
        aggByOsi.get(s.id_osi) ??
        { minFecha: null, maxFecha: null, total: 0, ejecutadas: 0, maxEjecutada: null };
      agg.total += 1;
      if (s.fecha) {
        if (!agg.minFecha || s.fecha < agg.minFecha) agg.minFecha = s.fecha;
        if (!agg.maxFecha || s.fecha > agg.maxFecha) agg.maxFecha = s.fecha;
      }
      if (s.fecha_ejecutada) {
        agg.ejecutadas += 1;
        if (!agg.maxEjecutada || s.fecha_ejecutada > agg.maxEjecutada) {
          agg.maxEjecutada = s.fecha_ejecutada;
        }
      }
      aggByOsi.set(s.id_osi, agg);
    }

    // ── 4. Attendance list submitted by facilitadores ────────────────────
    const listaRows = await fetchChunkedIn<{ osi_id: number; cedula: string }>(
      osiIds,
      (chunk, from, to) =>
        supabase
          .from("ejecucion_osi_participantes")
          .select("osi_id, cedula")
          .in("osi_id", chunk)
          .order("id", { ascending: true })
          .range(from, to),
      "ejecucion_osi_participantes",
    );
    const cedulasByOsi = new Map<number, Set<string>>();
    for (const r of listaRows) {
      if (!r.cedula) continue;
      const set = cedulasByOsi.get(r.osi_id) ?? new Set<string>();
      set.add(r.cedula.trim().toUpperCase());
      cedulasByOsi.set(r.osi_id, set);
    }

    // ── 5. Certificates issued during the selected year ──────────────────
    const certs = await fetchAllPages<{
      id: number;
      fecha_emision: string | null;
      id_participante: number | null;
    }>((from, to) => {
      let q = supabase
        .from("certificados")
        .select("id, fecha_emision, id_participante")
        .eq("is_active", true)
        .gte("fecha_emision", yearStart)
        .lte("fecha_emision", yearEnd);
      if (filters.empresaId) q = q.eq("id_empresa", filters.empresaId);
      if (filters.estadoId) q = q.eq("id_estado", filters.estadoId);
      if (filters.facilitadorId) q = q.eq("id_facilitador", filters.facilitadorId);
      return q.order("id", { ascending: true }).range(from, to);
    }, "certificados");

    // ── 6. Carnets (PVC) issued during the selected year ─────────────────
    // carnets has no id_estado/id_facilitador, so those two filters are
    // applied indirectly through the already-filtered certificate ids.
    const certIds = new Set(certs.map((c) => c.id));
    const needsCertJoin = !!(filters.estadoId || filters.facilitadorId);
    const carnets = await fetchAllPages<{
      id: number;
      fecha_emision: string | null;
      id_certificado: number | null;
    }>((from, to) => {
      let q = supabase
        .from("carnets")
        .select("id, fecha_emision, id_certificado")
        .eq("is_active", true)
        .gte("fecha_emision", yearStart)
        .lte("fecha_emision", yearEnd);
      if (filters.empresaId) q = q.eq("id_empresa", filters.empresaId);
      return q.order("id", { ascending: true }).range(from, to);
    }, "carnets");

    // ── 7. Buckets ───────────────────────────────────────────────────────
    const buckets = new Map<string, GestionMesIndicadores>();
    const meses: GestionMesIndicadores[] = [];
    const yearSuffix = String(year).slice(2);
    for (let i = 0; i < 12; i++) {
      const key = `${year}-${String(i + 1).padStart(2, "0")}`;
      const bucket = emptyBucket(key, `${MONTH_LABELS[i]} ${yearSuffix}`);
      buckets.set(key, bucket);
      meses.push(bucket);
    }
    // Distinct participants per month (and for the whole year) — a person
    // certified twice in the same month must only count once.
    const participantesCertByMes = new Map<string, Set<number>>();
    const participantesCertYear = new Set<number>();
    const yearsSet = new Set<number>([year]);
    const osisList: OsiCarryRow[] = [];

    for (const o of osiRows) {
      const osiId = o.id_osi;
      if (osiId == null) continue;
      const agg = aggByOsi.get(osiId);

      // Recibidas — by the OSI's own issue date
      const mesRecepcion = monthKey(o.fecha_emision);
      const anioRecepcion = yearOf(o.fecha_emision);
      if (anioRecepcion != null) yearsSet.add(anioRecepcion);
      if (mesRecepcion) {
        const b = buckets.get(mesRecepcion);
        if (b) b.osisRecibidas += 1;
      }

      // Planned month — earliest session date, fallback fecha_inicio_real
      const fechaPlanificadaInicio = agg?.minFecha ?? o.fecha_inicio_real;
      const mesPlanificado = monthKey(fechaPlanificadaInicio);
      const anioPlanificado = yearOf(fechaPlanificadaInicio);
      if (anioPlanificado != null) yearsSet.add(anioPlanificado);

      // Execution date — only when EVERY session is marked as executed.
      // Legacy OSIs with no osi_sesion rows fall back to fecha_fin_real when
      // the OSI itself is flagged EJECUTADO.
      let fechaEjecucionFinal: string | null = null;
      if (agg && agg.total > 0) {
        if (agg.ejecutadas === agg.total) fechaEjecucionFinal = agg.maxEjecutada;
      } else if (o.id_estatus === OSI_ESTATUS.EJECUTADO) {
        fechaEjecucionFinal = o.fecha_fin_real;
      }
      const mesEjecucion = monthKey(fechaEjecucionFinal);

      if (mesPlanificado) {
        const b = buckets.get(mesPlanificado);
        if (b) {
          b.osisPlanificadas += 1;
          b.participantesPlanificados += o.participantes_ejecucion ?? 0;
          b.participantesLista += cedulasByOsi.get(osiId)?.size ?? 0;
          if (mesEjecucion === mesPlanificado) {
            b.osisEjecutadasEnSuMes += 1;
          } else if (!fechaEjecucionFinal) {
            b.osisPendientes += 1;
            const ultimaPlanificada =
              agg?.maxFecha ?? o.fecha_inicio_real ?? o.fecha_fin_real ?? null;
            if (ultimaPlanificada && ultimaPlanificada < todayStr) {
              b.osisPendientesVencidas += 1;
            }
          }
        }
      }

      // Rezagadas: planned in an earlier month, executed in this one.
      // Month keys are zero-padded "YYYY-MM", so string comparison is a
      // valid chronological comparison across years.
      if (mesEjecucion && mesPlanificado && mesPlanificado < mesEjecucion) {
        const b = buckets.get(mesEjecucion);
        if (b) b.osisRezagadasEjecutadas += 1;
      }

      // Carry-over detail: only include OSIs with a planned month in the
      // selected year (the matrix only shows that year, so the panel should
      // too). OSIs planned in other years are still counted in the buckets
      // above but excluded from the detail list to keep the payload small.
      if (mesPlanificado && yearOf(fechaPlanificadaInicio) === year) {
        const pendiente = !fechaEjecucionFinal;
        const ultimaPlanificada =
          agg?.maxFecha ?? o.fecha_inicio_real ?? o.fecha_fin_real ?? null;
        const vencida =
          pendiente && ultimaPlanificada != null && ultimaPlanificada < todayStr;
        const diasAtraso =
          vencida && ultimaPlanificada != null
            ? Math.floor(
                (new Date(todayStr).getTime() -
                  parseDate(ultimaPlanificada).getTime()) /
                  86_400_000,
              )
            : null;
        osisList.push({
          id: osiId,
          nroOsi: o.nro_osi ?? "—",
          empresa: o.nombre_empresa?.trim() || null,
          mesPlanificado,
          mesEjecucion: mesEjecucion,
          ultimaFechaPlanificada: ultimaPlanificada,
          pendiente,
          vencida,
          diasAtraso,
          estatus: o.id_estatus != null
            ? ESTATUS_LABELS[o.id_estatus] ?? String(o.id_estatus)
            : "—",
        });
      }
    }

    for (const c of certs) {
      const mes = monthKey(c.fecha_emision);
      if (!mes) continue;
      const b = buckets.get(mes);
      if (!b) continue;
      b.certificados += 1;
      if (c.id_participante != null) {
        const set = participantesCertByMes.get(mes) ?? new Set<number>();
        set.add(c.id_participante);
        participantesCertByMes.set(mes, set);
        participantesCertYear.add(c.id_participante);
      }
    }
    for (const [mes, set] of participantesCertByMes.entries()) {
      const b = buckets.get(mes);
      if (b) b.participantesCertificados = set.size;
    }

    for (const c of carnets) {
      if (needsCertJoin && (c.id_certificado == null || !certIds.has(c.id_certificado))) {
        continue;
      }
      const mes = monthKey(c.fecha_emision);
      if (!mes) continue;
      const b = buckets.get(mes);
      if (b) b.pvc += 1;
    }

    // ── 8. Year totals ───────────────────────────────────────────────────
    const total = emptyBucket("total", "Total");
    for (const m of meses) {
      total.osisRecibidas += m.osisRecibidas;
      total.osisEjecutadasEnSuMes += m.osisEjecutadasEnSuMes;
      total.osisPendientes += m.osisPendientes;
      total.osisPendientesVencidas += m.osisPendientesVencidas;
      total.osisRezagadasEjecutadas += m.osisRezagadasEjecutadas;
      total.osisPlanificadas += m.osisPlanificadas;
      total.participantesPlanificados += m.participantesPlanificados;
      total.participantesLista += m.participantesLista;
      total.certificados += m.certificados;
      total.pvc += m.pvc;
    }
    // Distinct across the whole year — deliberately NOT the sum of the
    // monthly columns, since the same person can be certified in two months.
    total.participantesCertificados = participantesCertYear.size;

    const yearsDisponibles = Array.from(yearsSet).sort((a, b) => b - a);

    return {
      data: { year, meses, total, yearsDisponibles, osisList },
      error: null,
    };
  } catch (err) {
    console.error("Unexpected error in getIndicadoresGestionMensual:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
