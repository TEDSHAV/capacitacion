"use server";

import { createClient } from "@/utils/supabase/server";
import type {
  GestionMesIndicadores,
  GestionMensualResponse,
  IndicadoresGestionFilters,
  OsiCarryRow,
  IndicadorOsiItem,
} from "@/types";
import { OSI_ESTATUS } from "@/lib/sync/sync-osi-estatus";
import { parseDate, toDateStr } from "@/lib/business-days";
import { isMesTracked, trackedMonthIndicesForYear, INDICADORES_START_YEAR } from "@/lib/indicadores-cutoff";

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
  [OSI_ESTATUS.REAGENDADO]: "Reagendada",
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

/** Like fetchAllPages, but splits `ids` into chunks and fetches them concurrently. */
async function fetchChunkedIn<T>(
  ids: number[],
  build: (chunk: number[], from: number, to: number) => PromiseLike<PagedResult<T>>,
  label: string,
): Promise<T[]> {
  if (ids.length === 0) return [];
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + IN_CHUNK_SIZE));
  }
  const results = await Promise.all(
    chunks.map((chunk) => fetchAllPages<T>((from, to) => build(chunk, from, to), label)),
  );
  return results.flat();
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
    osisRecibidasMesesPosteriores: 0,
    osisEjecutadasEnSuMes: 0,
    osisPendientes: 0,
    osisPendientesVencidas: 0,
    osisPendientesProximoMes: 0,
    osisRezagadasEjecutadas: 0,
    osisEjecutadasOtroMes: 0,
    osisPlanificadas: 0,
    participantesPlanificados: 0,
    participantesLista: 0,
    certificados: 0,
    pvc: 0,
    certificadosEmitidos: 0,
    pvcEmitidos: 0,
  };
}

type OsiRow = {
  id_osi: number | null;
  nro_osi: string | null;
  servicio: string | null;
  fecha_emision: string | null;
  fecha_inicio_real: string | null;
  fecha_fin_real: string | null;
  participantes_ejecucion: number | null;
  participantes_max_solped: number | null;
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
  lastUnexecutedFecha: string | null;
  total: number;
  ejecutadas: number;
  maxEjecutada: string | null;
  minEjecutada: string | null;
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
 * carnets follow their OSI's execution month; the separate "emitidos"
 * counters (by issuance date) are queried against the selected year only.
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
          "id_osi, nro_osi, servicio, fecha_emision, fecha_inicio_real, fecha_fin_real, participantes_ejecucion, participantes_max_solped, id_empresa, id_estatus, nombre_empresa",
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
        { minFecha: null, maxFecha: null, lastUnexecutedFecha: null, total: 0, ejecutadas: 0, maxEjecutada: null, minEjecutada: null };
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
        if (!agg.minEjecutada || s.fecha_ejecutada < agg.minEjecutada) {
          agg.minEjecutada = s.fecha_ejecutada;
        }
      } else if (s.fecha) {
        if (!agg.lastUnexecutedFecha || s.fecha > agg.lastUnexecutedFecha) {
          agg.lastUnexecutedFecha = s.fecha;
        }
      }
      aggByOsi.set(s.id_osi, agg);
    }

    // ── 4. Certified participants per OSI (replaces facilitador-uploaded  ─
    //    attendance list). The old source (ejecucion_osi_participantes) was
    //    unreliable — facilitadores don't always upload the list. Certificates
    //    are the authoritative record of who actually attended and was
    //    certified. We fetch ejecucion_osi to map id_osi → numeric nro_osi
    //    (the key certificados.nro_osi stores), then fetch all active certs
    //    for those OSIs (no year filter — an OSI planned in the selected
    //    year may have certs issued in a different year).
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
          const n = typeof seq === "number" ? seq : parseInt(String(seq), 10);
          if (Number.isFinite(n)) numericOsiByOsiId.set(e.id, n);
        }
      }
    }
    const numericOsis = Array.from(new Set(numericOsiByOsiId.values()));

    const osiIdByNumeric = new Map<number, number>();
    for (const [osiId, num] of numericOsiByOsiId) {
      osiIdByNumeric.set(num, osiId);
    }

    // osiId → raw count of certificates issued for that OSI (not distinct
    // participants — the user doesn't care about uniqueness, just how many
    // certificates were issued = how many people attended).
    const certCountByOsi = new Map<number, number>();
    const certOsiIdMap = new Map<number, number>();
    {
      const certRows = await fetchChunkedIn<{
        id: number;
        nro_osi: number | null;
        id_participante: number | null;
      }>(
        numericOsis,
        (chunk, from, to) =>
          supabase
            .from("certificados")
            .select("id, nro_osi, id_participante")
            .eq("is_active", true)
            .in("nro_osi", chunk)
            .order("id", { ascending: true })
            .range(from, to),
        "certificados (by nro_osi)",
      );

      for (const c of certRows) {
        if (c.nro_osi == null || c.id_participante == null) continue;
        const osiId = osiIdByNumeric.get(c.nro_osi);
        if (osiId == null) continue;
        certCountByOsi.set(osiId, (certCountByOsi.get(osiId) ?? 0) + 1);
        certOsiIdMap.set(c.id, osiId);
      }
    }

    // osiId → carnets linked to that OSI's certificates (any issue date), so
    // carnets follow the OSI's execution month just like certificates do.
    const carnetCountByOsi = new Map<number, number>();
    {
      const carnetRows = await fetchChunkedIn<{ id: number; id_certificado: number | null }>(
        Array.from(certOsiIdMap.keys()),
        (chunk, from, to) =>
          supabase
            .from("carnets")
            .select("id, id_certificado")
            .eq("is_active", true)
            .in("id_certificado", chunk)
            .order("id", { ascending: true })
            .range(from, to),
        "carnets (by id_certificado)",
      );
      for (const c of carnetRows) {
        const osiId = c.id_certificado != null ? certOsiIdMap.get(c.id_certificado) : undefined;
        if (osiId != null) carnetCountByOsi.set(osiId, (carnetCountByOsi.get(osiId) ?? 0) + 1);
      }
    }

    // ── 5. Certificates issued during the selected year ──────────────────
    const certs = await fetchAllPages<{
      id: number;
      fecha_emision: string | null;
      id_participante: number | null;
      nro_osi: number | null;
    }>((from, to) => {
      let q = supabase
        .from("certificados")
        .select("id, fecha_emision, id_participante, nro_osi")
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

    const osiById = new Map<number, OsiRow>();
    for (const o of osiRows) {
      if (o.id_osi != null) osiById.set(o.id_osi, o);
    }


    // ── 7. Buckets & Metric OSI Details ──────────────────────────────────
    // Only build buckets for tracked months. The seguimiento system went
    // live in Ago 2026; months before that have no reliable session data, so
    // they're hidden entirely (matrix columns, carry panel, facilitadores).
    const buckets = new Map<string, GestionMesIndicadores>();
    const meses: GestionMesIndicadores[] = [];
    const yearSuffix = String(year).slice(2);
    for (const i of trackedMonthIndicesForYear(year)) {
      const key = `${year}-${String(i + 1).padStart(2, "0")}`;
      const bucket = emptyBucket(key, `${MONTH_LABELS[i]} ${yearSuffix}`);
      buckets.set(key, bucket);
      meses.push(bucket);
    }
    const yearsSet = new Set<number>([year]);
    const osisList: OsiCarryRow[] = [];
    const metricOsis: Record<string, IndicadorOsiItem[]> = {};

    function addOsiToMetric(metricKey: string, mesKey: string, o: OsiRow) {
      const osiId = o.id_osi;
      if (osiId == null) return;
      const agg = aggByOsi.get(osiId);
      // For multi-session OSIs with pending execution, show the date of the
      // session not marked as executed (last unexecuted session date).
      const fechaPlanificadaDisplay =
        agg && agg.ejecutadas < agg.total && agg.lastUnexecutedFecha
          ? agg.lastUnexecutedFecha
          : (agg?.minFecha ?? o.fecha_inicio_real);
      let fechaEjecucionFinal: string | null = null;
      if (agg && agg.total > 0) {
        if (agg.ejecutadas === agg.total) fechaEjecucionFinal = agg.maxEjecutada;
      } else if (o.id_estatus === OSI_ESTATUS.EJECUTADO) {
        fechaEjecucionFinal = o.fecha_fin_real;
      }

      const isCertMetric = metricKey === "certificadosEmitidos";
      const isPvcMetric = metricKey === "pvcEmitidos";

      const baseItem: IndicadorOsiItem = {
        id: osiId,
        nroOsi: o.nro_osi ?? `OSI-${osiId}`,
        empresa: o.nombre_empresa?.trim() || "—",
        servicio: o.servicio?.trim() || "—",
        fechaEmision: o.fecha_emision,
        fechaPlanificada: fechaPlanificadaDisplay,
        fechaEjecutada: fechaEjecucionFinal,
        participantesPlanificados: o.participantes_ejecucion ?? o.participantes_max_solped ?? 0,
        participantesCertificados: certCountByOsi.get(osiId) ?? 0,
        certificadosCount: isCertMetric ? 1 : (certCountByOsi.get(osiId) ?? 0),
        carnetsCount: isPvcMetric ? 1 : (carnetCountByOsi.get(osiId) ?? 0),
        estatus: o.id_estatus != null ? ESTATUS_LABELS[o.id_estatus] ?? String(o.id_estatus) : "—",
        sesionesTotal: agg?.total ?? 0,
        sesionesEjecutadas: agg?.ejecutadas ?? 0,
        fechaPrimeraSesion: agg?.minFecha ?? null,
        fechaUltimaSesion: agg?.maxFecha ?? null,
      };

      const registerInList = (listKey: string) => {
        if (!metricOsis[listKey]) metricOsis[listKey] = [];
        const existing = metricOsis[listKey].find((x) => x.id === baseItem.id);
        if (existing) {
          if (isCertMetric) existing.certificadosCount = (existing.certificadosCount || 0) + 1;
          if (isPvcMetric) existing.carnetsCount = (existing.carnetsCount || 0) + 1;
        } else {
          metricOsis[listKey].push({ ...baseItem });
        }
      };

      registerInList(`${metricKey}_${mesKey}`);
      registerInList(`${metricKey}_total`);
    }

    for (const o of osiRows) {
      const osiId = o.id_osi;
      if (osiId == null) continue;
      const agg = aggByOsi.get(osiId);

      // Planned month — earliest session date, fallback fecha_inicio_real
      const fechaPlanificadaInicio = agg?.minFecha ?? o.fecha_inicio_real;
      const mesPlanificado = monthKey(fechaPlanificadaInicio);
      const anioPlanificado = yearOf(fechaPlanificadaInicio);
      if (anioPlanificado != null) yearsSet.add(anioPlanificado);

      // Recibidas — by the OSI's own issue date
      const mesRecepcion = monthKey(o.fecha_emision);
      const anioRecepcion = yearOf(o.fecha_emision);
      if (anioRecepcion != null) yearsSet.add(anioRecepcion);
      if (mesRecepcion) {
        const b = buckets.get(mesRecepcion);
        if (b) {
          b.osisRecibidas += 1;
          addOsiToMetric("recibidas", mesRecepcion, o);

          if (mesPlanificado && mesPlanificado > mesRecepcion) {
            b.osisRecibidasMesesPosteriores += 1;
            addOsiToMetric("recibidasMesesPosteriores", mesRecepcion, o);
          }
        }
      }

      // Skip OSIs whose planned month predates the tracking cutoff. Those
      // legacy OSIs weren't followed through this app, so counting them as
      // "rezagadas" / "arrastradas" in tracked months would be misleading.
      if (!isMesTracked(mesPlanificado)) continue;

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
      // Month the OSI actually STARTED executing (first executed session).
      // Multi-month courses start on time but finish later; they shouldn't
      // be flagged as "rezagadas" just because their last session spills over.
      const mesInicioEjecucion = monthKey(agg?.minEjecutada ?? fechaEjecucionFinal);

      if (mesPlanificado) {
        const b = buckets.get(mesPlanificado);
        if (b) {
          b.osisPlanificadas += 1;
          addOsiToMetric("planificadas", mesPlanificado, o);
          if (mesEjecucion === mesPlanificado) {
            b.osisEjecutadasEnSuMes += 1;
            addOsiToMetric("ejecutadasEnSuMes", mesPlanificado, o);
          } else {
            b.osisPendientesProximoMes += 1;
            addOsiToMetric("pendientesProximoMes", mesPlanificado, o);

            if (fechaEjecucionFinal) {
              b.osisEjecutadasOtroMes += 1;
              addOsiToMetric("ejecutadasOtroMes", mesPlanificado, o);
            } else {
              b.osisPendientes += 1;
              addOsiToMetric("pendientes", mesPlanificado, o);
              const ultimaPlanificada =
                agg?.maxFecha ?? o.fecha_inicio_real ?? o.fecha_fin_real ?? null;
              if (ultimaPlanificada && ultimaPlanificada < todayStr) {
                b.osisPendientesVencidas += 1;
                addOsiToMetric("pendientesVencidas", mesPlanificado, o);
              }
            }
          }
        }
      }

      // Participant metrics (planificados + certificados), certificates and
      // carnets are attributed to the OSI's EXECUTION month, not the planned
      // month nor the document issue date. This keeps every per-course column
      // describing the same population: OSIs executed in that month.
      // Pending OSIs (no execution date) don't contribute to these rows.
      if (mesEjecucion) {
        const b = buckets.get(mesEjecucion);
        if (b) {
          // Prefer participantes_ejecucion (execution-phase, most accurate),
          // fall back to participantes_max_solped (SOLPED/purchase request,
          // set earlier and more reliably populated), then 0.
          b.participantesPlanificados +=
            o.participantes_ejecucion ?? o.participantes_max_solped ?? 0;
          b.participantesLista += certCountByOsi.get(osiId) ?? 0;
          b.certificados += certCountByOsi.get(osiId) ?? 0;
          b.pvc += carnetCountByOsi.get(osiId) ?? 0;
          addOsiToMetric("participantesPlanificados", mesEjecucion, o);
          addOsiToMetric("participantesLista", mesEjecucion, o);
          if ((certCountByOsi.get(osiId) ?? 0) > 0) addOsiToMetric("certificados", mesEjecucion, o);
          if ((carnetCountByOsi.get(osiId) ?? 0) > 0) addOsiToMetric("pvc", mesEjecucion, o);
        }
      }

      // Rezagadas: planned in an earlier month, and execution STARTED after
      // that month. Multi-month courses that began on schedule are excluded.
      // Month keys are zero-padded "YYYY-MM", so string comparison is a
      // valid chronological comparison across years.
      if (
        mesEjecucion &&
        mesPlanificado &&
        mesPlanificado < mesEjecucion &&
        mesInicioEjecucion != null &&
        mesInicioEjecucion > mesPlanificado
      ) {
        const b = buckets.get(mesEjecucion);
        if (b) {
          b.osisRezagadasEjecutadas += 1;
          addOsiToMetric("rezagadas", mesEjecucion, o);
        }
      }

      // Carry-over detail: include OSIs planned in the selected year, OR
      // planned in earlier years but still open (mesEjecucion null or >= year).
      // This allows cross-year carry to be visible (e.g., Dic 2026 OSI dragging
      // into Ene 2027). The panel filters by selectedMes at the client.
      if (mesPlanificado) {
        const anioPlanificado = yearOf(fechaPlanificadaInicio);
        const anioEjecucion = mesEjecucion ? yearOf(mesEjecucion) : null;
        const isInSelectedYear = anioPlanificado === year;
        const isStillOpenInYear =
          anioPlanificado != null &&
          anioPlanificado < year &&
          (mesEjecucion == null || (anioEjecucion != null && anioEjecucion >= year));

        if (isInSelectedYear || isStillOpenInYear) {
          const ultimaPlanificada =
            agg?.maxFecha ?? o.fecha_inicio_real ?? o.fecha_fin_real ?? null;
          osisList.push({
            id: osiId,
            nroOsi: o.nro_osi ?? "—",
            empresa: o.nombre_empresa?.trim() || null,
            mesPlanificado,
            mesEjecucion: mesEjecucion,
            mesInicioEjecucion,
            ultimaFechaPlanificada: ultimaPlanificada,
            fechaPrimeraSesion: agg?.minFecha ?? null,
            sesionesTotal: agg?.total ?? 0,
            estatus: o.id_estatus != null
              ? ESTATUS_LABELS[o.id_estatus] ?? String(o.id_estatus)
              : "—",
          });
        }
      }
    }

    for (const c of certs) {
      const mes = monthKey(c.fecha_emision);
      if (!mes) continue;
      const b = buckets.get(mes);
      if (!b) continue;
      b.certificadosEmitidos += 1;
      if (c.nro_osi != null) {
        const osiId = osiIdByNumeric.get(c.nro_osi);
        const osi = osiId != null ? osiById.get(osiId) : null;
        if (osi) {
          addOsiToMetric("certificadosEmitidos", mes, osi);
        }
      }
    }

    for (const c of carnets) {
      if (needsCertJoin && (c.id_certificado == null || !certIds.has(c.id_certificado))) {
        continue;
      }
      const mes = monthKey(c.fecha_emision);
      if (!mes) continue;
      const b = buckets.get(mes);
      if (b) b.pvcEmitidos += 1;
      if (c.id_certificado != null) {
        const osiId = certOsiIdMap.get(c.id_certificado);
        const osi = osiId != null ? osiById.get(osiId) : null;
        if (osi) {
          addOsiToMetric("pvcEmitidos", mes, osi);
        }
      }
    }

    // ── 8. Year totals ───────────────────────────────────────────────────
    const total = emptyBucket("total", "Total");
    for (const m of meses) {
      total.osisRecibidas += m.osisRecibidas;
      total.osisRecibidasMesesPosteriores += m.osisRecibidasMesesPosteriores;
      total.osisEjecutadasEnSuMes += m.osisEjecutadasEnSuMes;
      total.osisPendientes += m.osisPendientes;
      total.osisPendientesVencidas += m.osisPendientesVencidas;
      total.osisPendientesProximoMes += m.osisPendientesProximoMes;
      total.osisRezagadasEjecutadas += m.osisRezagadasEjecutadas;
      total.osisEjecutadasOtroMes += m.osisEjecutadasOtroMes;
      total.osisPlanificadas += m.osisPlanificadas;
      total.participantesPlanificados += m.participantesPlanificados;
      total.participantesLista += m.participantesLista;
      total.certificados += m.certificados;
      total.pvc += m.pvc;
      total.certificadosEmitidos += m.certificadosEmitidos;
      total.pvcEmitidos += m.pvcEmitidos;
    }

    const yearsDisponibles = Array.from(yearsSet)
      .filter((y) => y >= INDICADORES_START_YEAR)
      .sort((a, b) => b - a);

    return {
      data: { year, meses, total, yearsDisponibles, osisList, metricOsis },
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
