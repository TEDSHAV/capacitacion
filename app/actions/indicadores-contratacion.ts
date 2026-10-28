"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { toTitleCase, normalizePhoneNumber } from "@/utils/string-utils";
import type {
  ContratacionFacilitadoresFilters,
  ContratacionFacilitadoresResponse,
  ContratacionMesBucket,
  FacilitadorContratadoItem,
} from "@/types";
import {
  INDICADORES_START_YEAR,
  isMesTracked,
} from "@/lib/indicadores-cutoff";

const MONTH_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const FUENTE_LABELS: Record<string, string> = {
  recomendacion: "Recomendación",
  entrevista: "Entrevista",
  linkedin: "LinkedIn",
  web: "Página Web",
  rrss: "Redes Sociales",
  interno: "Referencia Interna",
  otro: "Otro",
  sin_especificar: "Sin especificar",
};

function normalizeFuenteKey(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "sin_especificar";
  return raw.trim().toLowerCase();
}

function getFuenteLabel(key: string): string {
  return FUENTE_LABELS[key] || toTitleCase(key);
}

/** Extract "YYYY-MM" from an ISO date string "YYYY-MM-DD" or timestamp */
function toMonthKey(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 7);
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toYear(dateStr: string | null | undefined): number | null {
  const mk = toMonthKey(dateStr);
  if (!mk) return null;
  const y = parseInt(mk.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

export async function getIndicadoresContratacionFacilitadores(
  filters: ContratacionFacilitadoresFilters
): Promise<{
  data: ContratacionFacilitadoresResponse | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { year, estadoId, ciudadId, fuente, soloActivos } = filters;

    const [
      facilitadoresRes,
      entrevistasRes,
      assignmentsRes,
      ciudadesRes,
    ] = await Promise.all([
      supabase
        .from("facilitadores")
        .select(
          `
          id,
          nombre_apellido,
          cedula,
          email,
          telefono,
          fecha_ingreso,
          ano_ingreso,
          fecha_creacion,
          fuente,
          id_estado_geografico,
          id_ciudad,
          is_active,
          temas_cursos,
          titulo_profesional,
          nivel_educacion,
          cat_ciudades!left ( id, nombre_ciudad, id_estado ),
          cat_estados_venezuela!left ( id, nombre_estado )
        `
        )
        .order("fecha_ingreso", { ascending: false, nullsFirst: false }),
      supabase
        .from("facilitador_entrevistas")
        .select(
          "id, nombre_apellido, cedula, fecha_entrevista, estatus, facilitador_id, promovido_at"
        ),
      supabase
        .from("facilitador_osi_assignments")
        .select("facilitador_id, osi_id")
        .eq("is_active", true),
      supabase
        .from("cat_ciudades")
        .select("id, nombre_ciudad, id_estado")
        .order("nombre_ciudad", { ascending: true }),
    ]);

    if (facilitadoresRes.error) {
      throw new Error(facilitadoresRes.error.message);
    }

    const rawFacilitadores = facilitadoresRes.data ?? [];
    const rawEntrevistas = entrevistasRes.data ?? [];
    const rawAssignments = assignmentsRes.data ?? [];
    const rawCiudades = ciudadesRes.data ?? [];

    // Count distinct OSIs assigned per facilitator
    const osiCountByFac = new Map<number, Set<number>>();
    for (const a of rawAssignments) {
      if (a.facilitador_id && a.osi_id) {
        let set = osiCountByFac.get(a.facilitador_id);
        if (!set) {
          set = new Set<number>();
          osiCountByFac.set(a.facilitador_id, set);
        }
        set.add(a.osi_id);
      }
    }

    // Link interview by facilitador_id or fallback by exact normalized name
    const entrevistaByFacId = new Map<
      number,
      { id: number; fecha_entrevista: string | null }
    >();
    const entrevistaByName = new Map<
      string,
      { id: number; fecha_entrevista: string | null }
    >();
    for (const ent of rawEntrevistas) {
      if (ent.facilitador_id) {
        entrevistaByFacId.set(ent.facilitador_id, {
          id: ent.id,
          fecha_entrevista: ent.fecha_entrevista,
        });
      }
      if (ent.nombre_apellido) {
        entrevistaByName.set(ent.nombre_apellido.trim().toLowerCase(), {
          id: ent.id,
          fecha_entrevista: ent.fecha_entrevista,
        });
      }
    }

    const yearsSet = new Set<number>([
      new Date().getFullYear(),
      year,
    ]);

    // Map all facilitators
    const allItems: FacilitadorContratadoItem[] = rawFacilitadores.map((f) => {
      const cityObj = f.cat_ciudades as unknown as {
        id: number;
        nombre_ciudad: string;
        id_estado: number;
      } | null;
      const stateObj = f.cat_estados_venezuela as unknown as {
        id: number;
        nombre_estado: string;
      } | null;

      const normName = (f.nombre_apellido || "").trim().toLowerCase();
      const linkedEnt =
        entrevistaByFacId.get(f.id) || entrevistaByName.get(normName) || null;

      const yIngreso = toYear(f.fecha_ingreso) ?? f.ano_ingreso ?? null;
      if (yIngreso && yIngreso >= 2020) {
        yearsSet.add(yIngreso);
      }

      return {
        id: f.id,
        nombreApellido: toTitleCase(f.nombre_apellido || ""),
        cedula: f.cedula || null,
        email: f.email || null,
        telefono: normalizePhoneNumber(f.telefono) || null,
        fechaIngreso: f.fecha_ingreso || null,
        anoIngreso: f.ano_ingreso || yIngreso,
        fechaCreacion: f.fecha_creacion || null,
        fuente: f.fuente || null,
        idEstado: f.id_estado_geografico || stateObj?.id || null,
        estadoNombre: stateObj?.nombre_estado || null,
        idCiudad: f.id_ciudad || cityObj?.id || null,
        ciudadNombre: cityObj?.nombre_ciudad || null,
        isActive: Boolean(f.is_active),
        temasCursos: Array.isArray(f.temas_cursos) ? f.temas_cursos : [],
        tituloProfesional: f.titulo_profesional || null,
        nivelEducacion: f.nivel_educacion || null,
        entrevistaId: linkedEnt?.id ?? null,
        fechaEntrevista: linkedEnt?.fecha_entrevista ?? null,
        osisAsignadasCount: osiCountByFac.get(f.id)?.size ?? 0,
      };
    });

    // Apply user filters (estado, ciudad, fuente, soloActivos)
    const filteredItems = allItems.filter((item) => {
      if (soloActivos && !item.isActive) return false;
      if (estadoId && String(item.idEstado) !== String(estadoId)) return false;
      if (ciudadId && String(item.idCiudad) !== String(ciudadId)) return false;
      if (fuente) {
        const itemFuente = normalizeFuenteKey(item.fuente);
        if (itemFuente !== fuente.toLowerCase()) return false;
      }
      return true;
    });

    // Calculate baseline pool before the start of `year`
    // A facilitator is part of the baseline prior to `year` if:
    // - they have fechaIngreso < `${year}-01-01`, OR
    // - they have no fechaIngreso, but anoIngreso < year
    let baselineBeforeYear = 0;
    for (const item of filteredItems) {
      if (item.fechaIngreso) {
        const mk = toMonthKey(item.fechaIngreso);
        if (mk && mk < `${year}-01`) {
          baselineBeforeYear++;
        }
      } else if (item.anoIngreso && item.anoIngreso < year) {
        baselineBeforeYear++;
      }
    }

    // Group interviews by month of `year`
    const entrevistasPorMes = new Map<
      string,
      { realizadas: number; aprobadas: number }
    >();
    for (const ent of rawEntrevistas) {
      const mk = toMonthKey(ent.fecha_entrevista);
      if (!mk || !mk.startsWith(`${year}-`)) continue;
      const cur = entrevistasPorMes.get(mk) ?? { realizadas: 0, aprobadas: 0 };
      cur.realizadas += 1;
      if (ent.estatus === "aprobado" || ent.facilitador_id != null) {
        cur.aprobadas += 1;
      }
      entrevistasPorMes.set(mk, cur);
    }

    // Build 12 monthly buckets for `year`, then filter to tracked months if year === INDICADORES_START_YEAR
    const yy = String(year).slice(-2);
    let runningAcumulado = baselineBeforeYear;
    const allTwelveMonths: ContratacionMesBucket[] = [];

    for (let mIdx = 0; mIdx < 12; mIdx++) {
      const mStr = String(mIdx + 1).padStart(2, "0");
      const mesKey = `${year}-${mStr}`;
      const label = `${MONTH_SHORT[mIdx]} ${yy}`;

      const hiredInMonth = filteredItems.filter(
        (item) => toMonthKey(item.fechaIngreso) === mesKey
      );
      // Sort hired in month chronologically by day
      hiredInMonth.sort((a, b) =>
        (a.fechaIngreso || "").localeCompare(b.fechaIngreso || "")
      );

      const prevAcumulado = runningAcumulado;
      const contratados = hiredInMonth.length;
      runningAcumulado += contratados;

      const crecimientoPct =
        prevAcumulado > 0
          ? Math.round(((contratados / prevAcumulado) * 100) * 10) / 10
          : contratados > 0
          ? 100
          : 0;

      const entStats = entrevistasPorMes.get(mesKey) ?? {
        realizadas: 0,
        aprobadas: 0,
      };
      // Ensure interviews conducted / approved in a month are never fewer than
      // the facilitators incorporated in that month (e.g. direct registration without separate interview row).
      const entrevistasRealizadasMes = Math.max(entStats.realizadas, contratados);
      const entrevistasAprobadasMes = contratados;

      allTwelveMonths.push({
        mes: mesKey,
        label,
        contratados,
        acumulado: runningAcumulado,
        crecimientoPct,
        entrevistasRealizadas: entrevistasRealizadasMes,
        entrevistasAprobadas: entrevistasAprobadasMes,
        items: hiredInMonth,
      });
    }

    // Respect INDICADORES_START_MES cutoff for the main monthly table (Ago 2026+),
    // while keeping full year visibility if user selects an earlier year or if there are tracked months
    const trackedMeses = allTwelveMonths.filter((b) => isMesTracked(b.mes));
    const mesesToRender =
      trackedMeses.length > 0 ? trackedMeses : allTwelveMonths;

    // Baseline right before the first rendered month
    const firstRenderedMes = mesesToRender[0]?.mes ?? `${year}-01`;
    const baselineBeforeRendered =
      allTwelveMonths.find((b) => b.mes === firstRenderedMes)
        ? allTwelveMonths
            .filter((b) => b.mes < firstRenderedMes)
            .reduce((acc, b) => acc + b.contratados, baselineBeforeYear)
        : baselineBeforeYear;

    const totalContratadosRendered = mesesToRender.reduce(
      (sum, b) => sum + b.contratados,
      0
    );
    const totalEntrevistasRendered = mesesToRender.reduce(
      (sum, b) => sum + b.entrevistasRealizadas,
      0
    );
    const totalAprobadasRendered = mesesToRender.reduce(
      (sum, b) => sum + b.entrevistasAprobadas,
      0
    );
    const allItemsRendered = mesesToRender.flatMap((b) => b.items);

    const crecimientoPeriodoPct =
      baselineBeforeRendered > 0
        ? Math.round(
            ((totalContratadosRendered / baselineBeforeRendered) * 100) * 10
          ) / 10
        : totalContratadosRendered > 0
        ? 100
        : 0;

    const totalAnio: ContratacionMesBucket = {
      mes: "total",
      label: "Total",
      contratados: totalContratadosRendered,
      acumulado: runningAcumulado,
      crecimientoPct: crecimientoPeriodoPct,
      entrevistasRealizadas: totalEntrevistasRendered,
      entrevistasAprobadas: totalAprobadasRendered,
      items: allItemsRendered,
    };

    // Breakdown by State
    const estadoMap = new Map<
      string,
      { id: number | null; nombre: string; total: number; contratadosAnio: number }
    >();
    // Breakdown by City
    const ciudadMap = new Map<
      string,
      {
        id: number | null;
        nombre: string;
        estadoNombre: string | null;
        total: number;
        contratadosAnio: number;
      }
    >();
    // Breakdown by Fuente
    const fuenteMap = new Map<
      string,
      { fuente: string; label: string; total: number; contratadosAnio: number }
    >();

    const hiredIdsInPeriod = new Set(allItemsRendered.map((i) => i.id));

    for (const item of filteredItems) {
      const isHiredInPeriod = hiredIdsInPeriod.has(item.id);

      // Estado
      const estKey = item.estadoNombre || "Sin estado";
      const curEst = estadoMap.get(estKey) ?? {
        id: item.idEstado,
        nombre: estKey,
        total: 0,
        contratadosAnio: 0,
      };
      curEst.total += 1;
      if (isHiredInPeriod) curEst.contratadosAnio += 1;
      estadoMap.set(estKey, curEst);

      // Ciudad
      const ciuKey = item.ciudadNombre
        ? `${item.ciudadNombre} (${item.estadoNombre || "—"})`
        : "Sin ciudad";
      const curCiu = ciudadMap.get(ciuKey) ?? {
        id: item.idCiudad,
        nombre: item.ciudadNombre || "Sin ciudad",
        estadoNombre: item.estadoNombre,
        total: 0,
        contratadosAnio: 0,
      };
      curCiu.total += 1;
      if (isHiredInPeriod) curCiu.contratadosAnio += 1;
      ciudadMap.set(ciuKey, curCiu);

      // Fuente
      const fKey = normalizeFuenteKey(item.fuente);
      const curFuente = fuenteMap.get(fKey) ?? {
        fuente: fKey,
        label: getFuenteLabel(fKey),
        total: 0,
        contratadosAnio: 0,
      };
      curFuente.total += 1;
      if (isHiredInPeriod) curFuente.contratadosAnio += 1;
      fuenteMap.set(fKey, curFuente);
    }

    const porEstado = Array.from(estadoMap.values()).sort(
      (a, b) => b.contratadosAnio - a.contratadosAnio || b.total - a.total
    );
    const porCiudad = Array.from(ciudadMap.values()).sort(
      (a, b) => b.contratadosAnio - a.contratadosAnio || b.total - a.total
    );
    const porFuente = Array.from(fuenteMap.values()).sort(
      (a, b) => b.contratadosAnio - a.contratadosAnio || b.total - a.total
    );

    const sinFechaIngreso = filteredItems.filter((i) => !i.fechaIngreso).length;
    const contratadosAnio = allTwelveMonths.reduce(
      (sum, b) => sum + b.contratados,
      0
    );

    // Average monthly hires over tracked months that have elapsed up to current month
    const now = new Date();
    const currentMesKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
    const elapsedTrackedMonths = mesesToRender.filter(
      (b) => b.mes <= currentMesKey
    );
    const denomMeses =
      elapsedTrackedMonths.length > 0
        ? elapsedTrackedMonths.length
        : mesesToRender.length || 1;
    const promedioMensualTrackeado =
      Math.round((totalContratadosRendered / denomMeses) * 10) / 10;

    const tasaConversionEntrevistas =
      totalEntrevistasRendered > 0
        ? Math.round(
            ((totalAprobadasRendered / totalEntrevistasRendered) * 100) * 10
          ) / 10
        : null;

    const yearsDisponibles = Array.from(yearsSet)
      .filter((y) => y >= INDICADORES_START_YEAR)
      .sort((a, b) => b - a);

    return {
      data: {
        year,
        meses: mesesToRender,
        totalAnio,
        yearsDisponibles,
        todosFacilitadores: filteredItems,
        kpis: {
          totalPlantilla: filteredItems.length,
          totalActivos: filteredItems.filter((i) => i.isActive).length,
          contratadosAnio,
          contratadosTrackeados: totalContratadosRendered,
          sinFechaIngreso,
          crecimientoAnualPct: crecimientoPeriodoPct,
          promedioMensualTrackeado,
          tasaConversionEntrevistas,
          totalEntrevistasAnio: totalEntrevistasRendered,
          totalEntrevistasAprobadasAnio: totalAprobadasRendered,
        },
        porEstado,
        porCiudad,
        porFuente,
        ciudadesDisponibles: rawCiudades.map((c) => ({
          id: c.id,
          nombre: c.nombre_ciudad,
          idEstado: c.id_estado,
        })),
      },
      error: null,
    };
  } catch (err) {
    console.error(
      "Error in getIndicadoresContratacionFacilitadores:",
      err
    );
    return {
      data: null,
      error:
        err instanceof Error
          ? err.message
          : "Error al calcular indicadores de contratación de facilitadores",
    };
  }
}

/**
 * Quick inline update of a facilitator's hiring date (fecha_ingreso), source (fuente),
 * state (id_estado_geografico) and city (id_ciudad) directly from the Indicadores view.
 */
export async function updateFacilitadorIngresoQuickAction(input: {
  facilitadorId: number;
  fechaIngreso: string | null;
  fuente?: string | null;
  idEstado?: number | null;
  idCiudad?: number | null;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    const cleanFecha = input.fechaIngreso?.trim() || null;
    let anoIngreso: number | null = null;
    if (cleanFecha && /^\d{4}-\d{2}-\d{2}$/.test(cleanFecha)) {
      anoIngreso = parseInt(cleanFecha.slice(0, 4), 10);
    }

    const updatePayload: Record<string, unknown> = {
      fecha_ingreso: cleanFecha,
      ano_ingreso: anoIngreso,
      fecha_actualizacion: new Date().toISOString(),
    };

    if (input.fuente !== undefined) {
      updatePayload.fuente = input.fuente?.trim() || null;
    }
    if (input.idEstado !== undefined) {
      updatePayload.id_estado_geografico = input.idEstado;
    }
    if (input.idCiudad !== undefined) {
      updatePayload.id_ciudad = input.idCiudad;
    }

    const { error } = await supabase
      .from("facilitadores")
      .update(updatePayload)
      .eq("id", input.facilitadorId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/dashboard/capacitacion/indicadores");
    revalidatePath("/dashboard/capacitacion/gestion-de-facilitadores");

    return { success: true, error: null };
  } catch (err) {
    console.error("Error in updateFacilitadorIngresoQuickAction:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la fecha de ingreso",
    };
  }
}
