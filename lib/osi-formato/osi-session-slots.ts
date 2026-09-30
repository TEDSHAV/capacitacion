import { formatTimeAmPmEsVe } from "./utils/calendar-date";

export type OsiSessionSlotRow = {
  fecha: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
};

export const OSI_FECHA_POR_PLANIFICAR_LABEL = "Por planificar";

/** Lee todas las filas de sesión del JSON, conservando fechas vacías. */
export function parse_osi_session_slots(value: unknown): OsiSessionSlotRow[] {
  if (!Array.isArray(value)) return [];
  const result: OsiSessionSlotRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    result.push({
      fecha: typeof row.fecha === "string" ? row.fecha : "",
      hora_inicio:
        row.hora_inicio == null || row.hora_inicio === ""
          ? null
          : String(row.hora_inicio).trim() || null,
      hora_fin:
        row.hora_fin == null || row.hora_fin === ""
          ? null
          : String(row.hora_fin).trim() || null,
    });
  }
  return result;
}

export function count_osi_session_slots(value: unknown): number {
  return parse_osi_session_slots(value).length;
}

/** Rellena hasta `target_count` con filas vacías (sin inventar fechas). */
export function pad_osi_session_slots(
  slots: OsiSessionSlotRow[],
  target_count: number,
): OsiSessionSlotRow[] {
  const safe_target = Math.max(0, Math.floor(target_count));
  const result: OsiSessionSlotRow[] = [];
  for (let index = 0; index < safe_target; index += 1) {
    const row = slots[index];
    result.push(
      row ?? {
        fecha: "",
        hora_inicio: null,
        hora_fin: null,
      },
    );
  }
  return result;
}

export function resolve_osi_sesiones_documento_count(params: {
  sesiones_solped: number | null | undefined;
  sesiones_programadas: unknown;
  sesiones_ejecucion?: unknown;
}): number | null {
  const solped = Number(params.sesiones_solped ?? 0);
  const slots = count_osi_session_slots(params.sesiones_programadas);
  const with_fecha = parse_osi_session_slots(params.sesiones_programadas).filter(
    (row) => String(row.fecha ?? "").trim().length > 0,
  ).length;
  const ejecucion = Number(params.sesiones_ejecucion ?? 0);
  const total = Math.max(
    solped > 0 ? solped : 0,
    slots,
    with_fecha,
    ejecucion > 0 ? ejecucion : 0,
  );
  return total > 0 ? total : null;
}

/** Filas DÍA/HORA para FECHA PLANIFICADA (incluye «Por planificar»). */
export function map_sesiones_planificadas_dia_hora(
  sessions: OsiSessionSlotRow[] | undefined,
  target_count?: number,
): Array<{ fecha: string; hora: string }> {
  const padded =
    target_count != null && target_count > 0
      ? pad_osi_session_slots(sessions ?? [], target_count)
      : (sessions ?? []);

  return padded.map((session) => {
    const fecha =
      typeof session?.fecha === "string" ? session.fecha.trim() : "";
    const hora_txt = formatTimeAmPmEsVe(
      session.hora_inicio || session.hora_fin || null,
    );
    if (!fecha) {
      return {
        fecha: OSI_FECHA_POR_PLANIFICAR_LABEL,
        hora: hora_txt !== "—" ? hora_txt : "—",
      };
    }
    return {
      fecha,
      hora: hora_txt,
    };
  });
}
