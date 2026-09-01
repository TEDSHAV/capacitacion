"use server";

import { createClient } from "@/utils/supabase/server";
import type {
  FacilitadoresHorasResponse,
  FacilitadorHorasRow,
  IndicadoresGestionFilters,
} from "@/types";
import { parseDate } from "@/lib/business-days";

// Same paging constants as indicadores-gestion.ts — Supabase caps un-ranged
// selects at 1000 rows, and large `.in()` lists are chunked to stay under URL
// length limits.
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;
const IN_CHUNK_SIZE = 300;

type PagedResult<T> = { data: T[] | null; error: { message: string } | null };

async function fetchAllPages<T>(
  build: (from: number, to: number) => PromiseLike<PagedResult<T>>,
  label: string,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(`[indicadores-facilitadores] Error fetching ${label} page ${page}:`, error);
      break;
    }
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
}

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

type OsiRow = {
  id_osi: number | null;
  fecha_inicio_real: string | null;
  horas_honorarios_instructor: number | null;
  tarifa_hora_honorarios: number | null;
  costo_honorarios_instructor: number | null;
};

type AssignmentRow = {
  osi_id: number;
  facilitador_id: number;
  nro_sesion: number | null;
};

type SesionRow = {
  id: number;
  id_osi: number;
  nro_sesion: number | null;
  fecha: string | null;
};

type FacilitadorRow = {
  id: number;
  nombre_apellido: string;
};

// Shape of one entry inside `requisiciones.osi_fixed_items` (JSON array).
// Only the fields we read are typed here. See types/requisiciones.ts:52-74
// for the full OSIFixedItem type.
type OsiFixedItem = {
  id_osi: number;
  honorarios_horas: number | null;
  honorarios_costo_hora: number | null;
  honorarios_total: number | null;
};

type RequisicionRow = {
  id: number;
  cod_facilitador: number | null;
  id_osi: number | null;
  id_sesion: number | null;
  estatus_admin: string | null;
  coordinador_estatus: string | null;
  lider_estatus: string | null;
  osi_fixed_items: OsiFixedItem[] | unknown[] | null;
};

/**
 * Per-facilitador monthly matrix of instructor hours and honorarios.
 *
 * **Two-tier source for hours:**
 * 1. Requisición (primary): `requisiciones.osi_fixed_items[].honorarios_horas`
 *    on rows with `deleted_at IS NULL`, a non-null `cod_facilitador`, and no
 *    rejected status (`estatus_admin`, `coordinador_estatus`, `lider_estatus`
 *    all ≠ "rechazada"). Pendiente requisiciones count.
 * 2. OSI fallback: when no requisición covers a facilitador+OSI pair, the
 *    OSI's `horas_honorarios_instructor` is split evenly across its sessions
 *    (`osi_sesion`), and each session's share is credited to the facilitadores
 *    assigned to that session (session-specific assignments win; general
 *    assignments split evenly among assignees).
 *
 * **Monto = rate × hours first:**
 * - Requisición: `honorarios_costo_hora × honorarios_horas`, falling back to
 *   `honorarios_total` when the rate is missing/zero.
 * - OSI fallback: `tarifa_hora_honorarios × hoursShare`, falling back to
 *   `costo_honorarios_instructor / sessionCount / assigneeCount`.
 *
 * **Month attribution:** the `osi_sesion.fecha` of `requisiciones.id_sesion`
 * when set and matching the item's OSI; otherwise the session's `fecha`, else
 * the OSI's `fecha_inicio_real`.
 *
 * **Cursos (totalCursos):** count of distinct OSIs taught in the year —
 * requisición-covered + fallback-covered. Each OSI counts once per
 * facilitador. `cursosEstimados` is the subset credited via the OSI fallback
 * (data-quality signal).
 *
 * Scope: capacitacion OSIs (excluding provisional `PEN-` numbers), same as
 * the gestion view. Empresa/estado filters apply to the OSI scope.
 */
export async function getIndicadoresFacilitadores(
  filters: IndicadoresGestionFilters,
): Promise<{ data: FacilitadoresHorasResponse | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { year, mes: filterMes } = filters;

    // ── 1. OSIs (capacitacion, non-Pen) — scope + costing columns ─────────
    const osis = await fetchAllPages<OsiRow>((from, to) => {
      let q = supabase
        .from("v_osi_formato_completo")
        .select(
          "id_osi, fecha_inicio_real, horas_honorarios_instructor, tarifa_hora_honorarios, costo_honorarios_instructor",
        )
        .ilike("tipo_servicio", "%capacitacion%")
        .not("nro_osi", "ilike", "%PEN-%");
      if (filters.empresaId) q = q.eq("id_empresa", filters.empresaId);
      if (filters.estadoId)
        q = q.eq("id_estado_direccion_ejecucion_efectiva", filters.estadoId);
      return q.order("id_osi", { ascending: true }).range(from, to);
    }, "v_osi_formato_completo");

    const osiIds = osis
      .map((o) => o.id_osi)
      .filter((v): v is number => v != null);

    // OSI lookup: id_osi → row (attribution fallback + costing)
    const osiById = new Map<number, OsiRow>();
    for (const o of osis) {
      if (o.id_osi != null) osiById.set(o.id_osi, o);
    }

    if (osiIds.length === 0) {
      return {
        data: { year, facilitadores: [], yearsDisponibles: [year] },
        error: null,
      };
    }

    const inScopeOsiIds = new Set(osiIds);

    // ── 2. osi_sesion rows — attribution + fallback session enumeration ───
    const sesiones = await fetchChunkedIn<SesionRow>(
      osiIds,
      (chunk, from, to) =>
        supabase
          .from("osi_sesion")
          .select("id, id_osi, nro_sesion, fecha")
          .in("id_osi", chunk)
          .order("id", { ascending: true })
          .range(from, to),
      "osi_sesion",
    );
    // Keyed by session PK so requisiciones.id_sesion resolves directly.
    const sesionById = new Map<number, SesionRow>();
    // Grouped by OSI for fallback session enumeration.
    const sesionesByOsi = new Map<number, SesionRow[]>();
    for (const s of sesiones) {
      sesionById.set(s.id, s);
      const arr = sesionesByOsi.get(s.id_osi);
      if (arr) arr.push(s);
      else sesionesByOsi.set(s.id_osi, [s]);
    }

    // ── 3. Facilitador assignments (attribution + roster) ─────────────────
    let assignments = await fetchChunkedIn<AssignmentRow>(
      osiIds,
      (chunk, from, to) =>
        supabase
          .from("facilitador_osi_assignments")
          .select("osi_id, facilitador_id, nro_sesion")
          .in("osi_id", chunk)
          .order("id", { ascending: true })
          .range(from, to),
      "facilitador_osi_assignments",
    );
    if (filters.facilitadorId) {
      const fid = parseInt(filters.facilitadorId, 10);
      assignments = assignments.filter((a) => a.facilitador_id === fid);
    }
    const assignedFacilitadorIds = new Set<number>(
      assignments.map((a) => a.facilitador_id),
    );
    // Group assignments by OSI, then by nro_sesion (null = general).
    const assignmentsByOsi = new Map<
      number,
      Map<number | null, number[]>
    >();
    for (const a of assignments) {
      let bySesion = assignmentsByOsi.get(a.osi_id);
      if (!bySesion) {
        bySesion = new Map<number | null, number[]>();
        assignmentsByOsi.set(a.osi_id, bySesion);
      }
      const key = a.nro_sesion;
      const arr = bySesion.get(key);
      if (arr) arr.push(a.facilitador_id);
      else bySesion.set(key, [a.facilitador_id]);
    }

    // ── 4. Requisiciones (primary hours source) ───────────────────────────
    // Fetch all non-deleted, non-rejected requisiciones with a facilitador.
    // We do NOT chunk on id_osi here because a multi-OSI requisición's primary
    // id_osi may be out of scope while a secondary OSI in osi_fixed_items is
    // in scope — chunking on the primary would miss those. Requisiciones
    // volume is low relative to certificates, so the unfiltered fetch is fine.
    const requisiciones = await fetchAllPages<RequisicionRow>(
      (from, to) =>
        supabase
          .from("requisiciones")
          .select(
            "id, cod_facilitador, id_osi, id_sesion, estatus_admin, coordinador_estatus, lider_estatus, osi_fixed_items",
          )
          .is("deleted_at", null)
          .not("cod_facilitador", "is", null)
          .neq("estatus_admin", "rechazada")
          .order("id", { ascending: true })
          .range(from, to),
      "requisiciones",
    );

    // Drop rows rejected at the coordinador or lider stage (client-side —
    // combining three .neq() with .or() is awkward and volume is low).
    const activeRequisiciones = requisiciones.filter(
      (r) =>
        r.coordinador_estatus !== "rechazada" &&
        r.lider_estatus !== "rechazada",
    );

    // Apply facilitador filter on the requisición side too.
    let scopedRequisiciones = activeRequisiciones;
    if (filters.facilitadorId) {
      const fid = parseInt(filters.facilitadorId, 10);
      scopedRequisiciones = activeRequisiciones.filter(
        (r) => r.cod_facilitador === fid,
      );
    }

    // ── 5. Facilitadores (row labels) ──────────────────────────────────────
    // Include ALL facilitadores (not just is_active = true) since this is
    // historical reporting — deactivated facilitadores may still have
    // requisiciones attributed to them.
    const facilitadoresRows = await fetchAllPages<FacilitadorRow>(
      (from, to) =>
        supabase
          .from("facilitadores")
          .select("id, nombre_apellido")
          .order("nombre_apellido", { ascending: true })
          .range(from, to),
      "facilitadores",
    );
    const facilitadorNombre = new Map<number, string>(
      facilitadoresRows.map((f) => [f.id, f.nombre_apellido]),
    );

    // ── 6. Aggregate per facilitador ───────────────────────────────────────
    const yearsSet = new Set<number>([year]);
    // facilitadorId → { horas: number[12], cursos: Set<number>, monto: number,
    //                    cursosEstimados: number }
    const agg = new Map<
      number,
      {
        horas: number[];
        cursos: Set<number>;
        monto: number;
        cursosEstimados: number;
      }
    >();

    function ensureAgg(fid: number) {
      let entry = agg.get(fid);
      if (!entry) {
        entry = {
          horas: new Array(12).fill(0),
          cursos: new Set<number>(),
          monto: 0,
          cursosEstimados: 0,
        };
        agg.set(fid, entry);
      }
      return entry;
    }

    const round2 = (v: number) => Math.round(v * 100) / 100;

    // Track which (facilitador, OSI) pairs are covered by a requisición so
    // the OSI fallback doesn't double-count them.
    const covered = new Set<string>(); // `${fid}:${idOsi}`

    // ── Pass A: requisición (primary source) ──────────────────────────────
    for (const req of scopedRequisiciones) {
      const fid = req.cod_facilitador;
      if (fid == null) continue; // defensive — query already filters nulls

      const items = Array.isArray(req.osi_fixed_items) ? req.osi_fixed_items : [];
      for (const raw of items) {
        const item = raw as OsiFixedItem;
        const idOsi = item.id_osi;
        if (idOsi == null || !inScopeOsiIds.has(idOsi)) continue;

        const horas = item.honorarios_horas ?? 0;
        if (horas <= 0) continue;

        // Monto = rate × hours first; stored total as fallback.
        const rate = item.honorarios_costo_hora;
        const monto =
          rate != null && rate > 0
            ? rate * horas
            : (item.honorarios_total ?? 0);

        // Attribution date: session fecha when id_sesion matches this OSI,
        // else the OSI's fecha_inicio_real.
        let fecha: string | null = null;
        if (req.id_sesion != null) {
          const ses = sesionById.get(req.id_sesion);
          if (ses && ses.id_osi === idOsi) {
            fecha = ses.fecha;
          }
        }
        if (!fecha) fecha = osiById.get(idOsi)?.fecha_inicio_real ?? null;
        if (!fecha) continue;

        const sessionYear = yearOf(fecha);
        if (sessionYear != null) yearsSet.add(sessionYear);
        if (sessionYear !== year) continue;

        const mes = monthKey(fecha);
        if (!mes) continue;
        if (filterMes && mes !== filterMes) continue;
        const monthIdx = parseInt(mes.slice(5), 10) - 1; // 0-11
        if (monthIdx < 0 || monthIdx > 11) continue;

        const entry = ensureAgg(fid);
        entry.horas[monthIdx] = round2(entry.horas[monthIdx] + horas);
        entry.monto = round2(entry.monto + monto);
        entry.cursos.add(idOsi);
        covered.add(`${fid}:${idOsi}`);
      }
    }

    // ── Pass B: OSI fallback (no requisición for this facilitador+OSI) ─────
    for (const idOsi of inScopeOsiIds) {
      const osi = osiById.get(idOsi);
      if (!osi) continue;
      const osiHoras = osi.horas_honorarios_instructor;
      const osiTarifa = osi.tarifa_hora_honorarios;
      const osiCosto = osi.costo_honorarios_instructor;
      // Skip OSIs with no hours AND no costo — nothing to credit.
      if ((!osiHoras || osiHoras <= 0) && (!osiCosto || osiCosto <= 0)) continue;

      const osiSesiones = sesionesByOsi.get(idOsi);
      // Enumerate sessions: real osi_sesion rows, or a synthetic single
      // session using fecha_inicio_real when none exist.
      const sessions: { nroSesion: number | null; fecha: string | null }[] =
        osiSesiones && osiSesiones.length > 0
          ? osiSesiones.map((s) => ({ nroSesion: s.nro_sesion, fecha: s.fecha }))
          : [{ nroSesion: null, fecha: osi.fecha_inicio_real }];

      const sessionCount = sessions.length;
      const horasPerSession = osiHoras && osiHoras > 0 ? osiHoras / sessionCount : 0;
      const costoPerSession = osiCosto && osiCosto > 0 ? osiCosto / sessionCount : 0;

      const bySesion = assignmentsByOsi.get(idOsi);
      if (!bySesion) continue; // no facilitadores assigned to this OSI

      for (const session of sessions) {
        const fecha = session.fecha ?? osi.fecha_inicio_real;
        if (!fecha) continue;

        const sessionYear = yearOf(fecha);
        if (sessionYear != null) yearsSet.add(sessionYear);
        if (sessionYear !== year) continue;

        const mes = monthKey(fecha);
        if (!mes) continue;
        if (filterMes && mes !== filterMes) continue;
        const monthIdx = parseInt(mes.slice(5), 10) - 1;
        if (monthIdx < 0 || monthIdx > 11) continue;

        // Facilitadores for this session: session-specific assignees first,
        // else general assignees (nro_sesion IS NULL).
        let fids: number[] = [];
        if (session.nroSesion != null) {
          fids = bySesion.get(session.nroSesion) ?? [];
        }
        if (fids.length === 0) {
          fids = bySesion.get(null) ?? [];
        }
        if (fids.length === 0) continue;

        const assigneeCount = fids.length;
        const horasShare = horasPerSession / assigneeCount;
        // Monto share: tarifa × hours first; costo ÷ sessions ÷ assignees fallback.
        const montoShare =
          osiTarifa != null && osiTarifa > 0
            ? osiTarifa * horasShare
            : costoPerSession / assigneeCount;

        for (const fid of fids) {
          // Skip if this facilitador already has a requisición for this OSI.
          if (covered.has(`${fid}:${idOsi}`)) continue;

          const entry = ensureAgg(fid);
          entry.horas[monthIdx] = round2(entry.horas[monthIdx] + horasShare);
          entry.monto = round2(entry.monto + montoShare);
          if (!entry.cursos.has(idOsi)) {
            entry.cursos.add(idOsi);
            entry.cursosEstimados += 1;
          }
        }
      }
    }

    // ── 7. Build response rows ─────────────────────────────────────────────
    const allFids = new Set<number>([
      ...agg.keys(),
      ...assignedFacilitadorIds,
    ]);

    const facilitadores: FacilitadorHorasRow[] = [];
    for (const fid of allFids) {
      const entry = agg.get(fid);
      const totalHoras = entry ? entry.horas.reduce((sum, h) => sum + h, 0) : 0;
      facilitadores.push({
        facilitadorId: fid,
        nombre: facilitadorNombre.get(fid) ?? `Facilitador ${fid}`,
        horasPorMes: entry ? entry.horas : new Array(12).fill(0),
        totalCursos: entry ? entry.cursos.size : 0,
        totalHoras,
        totalMonto: entry ? entry.monto : 0,
        cursosEstimados: entry ? entry.cursosEstimados : 0,
      });
    }
    facilitadores.sort((a, b) => b.totalHoras - a.totalHoras);

    const yearsDisponibles = Array.from(yearsSet).sort((a, b) => b - a);

    return {
      data: { year, facilitadores, yearsDisponibles },
      error: null,
    };
  } catch (err) {
    console.error("Unexpected error in getIndicadoresFacilitadores:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
