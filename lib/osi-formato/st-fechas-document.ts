import { parseCalendarDayLocal } from "./utils/calendar-date";

export type OsiStFechaRango = {
  inicio: string | null;
  fin: string | null;
};

export type OsiStFechasServicioSlice = {
  reunionPreProyecto: string | null;
  /** Hora de la reunión pre-inicio (desde solicitud OSI / sesión). */
  reunionPreInicioHora: string | null;
  diasCampo: OsiStFechaRango;
  diasInforme: OsiStFechaRango;
  diasRevision: OsiStFechaRango;
  /** Fecha única de entrega del servicio (por ahora vacía hasta definir fuente). */
  fechaEntrega: string | null;
  /** Rango de garantía (por ahora vacío hasta definir fecha de entrega). */
  diasGarantia: OsiStFechaRango;
};

export const OSI_ST_FECHA_RANGO_VACIO: OsiStFechaRango = {
  inicio: null,
  fin: null,
};

export function format_osi_st_garantia_default(dias: number): string {
  const n = Number.isFinite(dias) && dias > 0 ? Math.round(dias) : 15;
  return `${n} días`;
}

export function resolve_osi_st_garantia_display(
  stored: string | null | undefined,
  default_dias?: number,
): string {
  const trimmed = String(stored ?? "").trim();
  if (trimmed) return trimmed;
  return format_osi_st_garantia_default(default_dias ?? 15);
}

export function resolve_st_fecha_reunion_pre_proyecto(
  fecha_inicio_real: string | null | undefined,
  sessions: Array<{ fecha?: string | null }> | undefined,
): string | null {
  const raw_real = String(fecha_inicio_real ?? "").trim();
  if (raw_real) return raw_real;
  for (const session of sessions ?? []) {
    const fecha = String(session?.fecha ?? "").trim();
    if (fecha) return fecha;
  }
  return null;
}

/** Hora de reunión pre-inicio: sesión con fecha, o `hora_inicio_servicio`. */
export function resolve_st_hora_reunion_pre_inicio(
  hora_inicio_servicio: string | null | undefined,
  sessions:
    | Array<{ fecha?: string | null; hora_inicio?: string | null }>
    | undefined,
): string | null {
  for (const session of sessions ?? []) {
    const fecha = String(session?.fecha ?? "").trim();
    const hora = String(session?.hora_inicio ?? "").trim();
    if (fecha && hora) return hora;
  }
  for (const session of sessions ?? []) {
    const hora = String(session?.hora_inicio ?? "").trim();
    if (hora) return hora;
  }
  const fallback = String(hora_inicio_servicio ?? "").trim();
  return fallback || null;
}

export function resolve_st_fecha_entrega(
  fecha_fin_real: string | null | undefined,
): string | null {
  const raw = String(fecha_fin_real ?? "").trim();
  return raw || null;
}

function to_iso_day(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Suma días calendario a una fecha ISO (YYYY-MM-DD). */
export function add_calendar_days_iso(
  iso: string | null | undefined,
  days: number,
): string | null {
  const date = parseCalendarDayLocal(iso);
  if (!date) return null;
  const n = Number.isFinite(days) ? Math.round(days) : 0;
  date.setDate(date.getDate() + n);
  return to_iso_day(date);
}

export function normalize_st_garantia_dias(dias: number | null | undefined): number {
  const n = Number(dias);
  if (Number.isFinite(n) && n > 0) return Math.round(n);
  return 15;
}

/**
 * Rango de garantía: inicio = fecha de entrega, fin = entrega + N días
 * (N desde configuración de visibilidad de costos).
 */
export function build_st_garantia_rango(
  fecha_entrega: string | null | undefined,
  garantia_dias?: number | null,
): OsiStFechaRango {
  const entrega = String(fecha_entrega ?? "").trim() || null;
  if (!entrega) return { ...OSI_ST_FECHA_RANGO_VACIO };
  const n = normalize_st_garantia_dias(garantia_dias);
  return {
    inicio: entrega,
    fin: add_calendar_days_iso(entrega, n),
  };
}

export type BuildStFechasServicioParams = {
  reunion_iso: string | null;
  reunion_hora?: string | null;
  /** Si se omite o es null, fecha entrega y garantía quedan en blanco. */
  fecha_entrega?: string | null;
  garantia_dias?: number | null;
};

export function build_st_fechas_servicio(
  params: BuildStFechasServicioParams,
): OsiStFechasServicioSlice {
  // Entrega / garantía quedan vacíos hasta definir fuente de negocio.
  void params.fecha_entrega;
  void params.garantia_dias;
  return {
    reunionPreProyecto: params.reunion_iso,
    reunionPreInicioHora: String(params.reunion_hora ?? "").trim() || null,
    diasCampo: { ...OSI_ST_FECHA_RANGO_VACIO },
    diasInforme: { ...OSI_ST_FECHA_RANGO_VACIO },
    diasRevision: { ...OSI_ST_FECHA_RANGO_VACIO },
    fechaEntrega: null,
    diasGarantia: { ...OSI_ST_FECHA_RANGO_VACIO },
  };
}

/** @deprecated Prefer build_st_fechas_servicio — se mantiene por compatibilidad. */
export function build_st_fechas_planificadas(
  reunion_iso: string | null,
  fecha_entrega?: string | null,
  garantia_dias?: number | null,
): OsiStFechasServicioSlice {
  return build_st_fechas_servicio({
    reunion_iso,
    fecha_entrega: fecha_entrega ?? null,
    garantia_dias,
  });
}

export function build_st_fechas_ejecutadas_vacias(): OsiStFechasServicioSlice {
  return {
    reunionPreProyecto: null,
    reunionPreInicioHora: null,
    diasCampo: { ...OSI_ST_FECHA_RANGO_VACIO },
    diasInforme: { ...OSI_ST_FECHA_RANGO_VACIO },
    diasRevision: { ...OSI_ST_FECHA_RANGO_VACIO },
    fechaEntrega: null,
    diasGarantia: { ...OSI_ST_FECHA_RANGO_VACIO },
  };
}

export function has_st_sesiones_ejecutadas(
  sessions: Array<{ fecha?: string | null }> | undefined,
): boolean {
  return (sessions ?? []).some((session) =>
    String(session?.fecha ?? "").trim(),
  );
}
