import { OSI_PREVIEW_ESTATUS } from "./osi-status-display";
import { count_osi_session_slots } from "./osi-session-slots";

export function count_sesiones_programadas(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const fecha = String((item as Record<string, unknown>).fecha ?? "").trim();
    return fecha.length > 0;
  }).length;
}

/** OSI ya emitida o con recursos guardados: los ceros explícitos no heredan ECC/SOLPED. */
export function osi_recursos_were_persisted(
  row: Record<string, unknown> | null | undefined,
): boolean {
  if (!row) return false;
  if (String(row.fecha_emision ?? "").trim().length > 0) return true;
  const status = Number(row.id_estatus ?? 0);
  return (
    Number.isFinite(status) &&
    status > 0 &&
    status !== OSI_PREVIEW_ESTATUS.PENDIENTE
  );
}

export function resolve_osi_st_engineering_value(
  osi_value: unknown,
  ecc_value: unknown,
  recursos_persistidos: boolean,
): number {
  const osi = Number(osi_value ?? 0);
  if (!Number.isFinite(osi)) {
    return Number(ecc_value ?? 0) || 0;
  }
  if (recursos_persistidos) return osi;
  return osi > 0 ? osi : Number(ecc_value ?? 0) || 0;
}

export function resolve_osi_override_number(
  osi_value: unknown,
  solped_value: number,
  recursos_persistidos = false,
): number {
  if (osi_value !== null && osi_value !== undefined) {
    const parsed = Number(osi_value);
    if (Number.isFinite(parsed)) {
      if (recursos_persistidos) return parsed;
      if (parsed > 0) return parsed;
    }
  }
  const solped = Number(solped_value) || 0;
  return solped > 0 ? solped : 0;
}

export function resolve_osi_sesiones_count(
  row: Record<string, unknown>,
  solped_sesiones: number,
): number {
  const recursos_persistidos = osi_recursos_were_persisted(row);
  const from_column = resolve_osi_override_number(
    row.sesiones_ejecucion,
    solped_sesiones,
    recursos_persistidos,
  );
  if (row.sesiones_ejecucion !== null && row.sesiones_ejecucion !== undefined) {
    return Math.max(
      from_column,
      count_osi_session_slots(row.sesiones_programadas),
      Number(solped_sesiones) || 0,
    );
  }
  const slot_count = count_osi_session_slots(row.sesiones_programadas);
  const from_programadas = count_sesiones_programadas(row.sesiones_programadas);
  return Math.max(
    slot_count,
    from_programadas,
    Number(solped_sesiones) || 0,
  );
}

export function resolve_osi_participantes_count(
  row: Record<string, unknown>,
  solped_participantes: number,
): number {
  return resolve_osi_override_number(
    row.participantes_ejecucion,
    solped_participantes,
    osi_recursos_were_persisted(row),
  );
}

export function resolve_osi_horas_count(
  row: Record<string, unknown>,
  solped_horas: number,
): number {
  return resolve_osi_override_number(
    row.horas_academicas_ejecucion,
    solped_horas,
    osi_recursos_were_persisted(row),
  );
}
