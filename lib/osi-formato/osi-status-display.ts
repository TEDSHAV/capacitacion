/** IDs alineados con STATUS_CONTRACT ejecucion_osi (SGestion). */
export const OSI_PREVIEW_ESTATUS = {
  PENDIENTE: 10,
  EN_PROCESO: 11,
  EJECUTADO: 12,
  NO_EJECUTADA: 39,
} as const;

/** Step de capacitación que habilita el bloque de cierre en el documento OSI. */
export const OSI_CAP_CIERRE_CERTIFICADOS_STEP_KEY =
  "Elaboración certificados / Disponible en portal";

const OSI_ESTATUS_LABEL_BY_ID: Record<number, string> = {
  [OSI_PREVIEW_ESTATUS.PENDIENTE]: "Pendiente",
  [OSI_PREVIEW_ESTATUS.EN_PROCESO]: "En proceso",
  [OSI_PREVIEW_ESTATUS.EJECUTADO]: "Ejecutada",
  [OSI_PREVIEW_ESTATUS.NO_EJECUTADA]: "OSI no ejecutada",
};

function normalize_step_key(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ");
}

export function is_cap_cierre_certificados_step(step_key: unknown): boolean {
  const normalized = normalize_step_key(String(step_key ?? ""));
  if (!normalized) return false;
  const targets = [
    normalize_step_key(OSI_CAP_CIERRE_CERTIFICADOS_STEP_KEY),
    normalize_step_key("elaboracion_certificados_disponible_portal"),
  ];
  return targets.includes(normalized);
}

export function has_cap_cierre_certificados_step(
  steps: Array<{ step_key?: unknown; completed?: unknown }> | null | undefined,
): boolean {
  return (steps ?? []).some(
    (row) => Boolean(row.completed) && is_cap_cierre_certificados_step(row.step_key),
  );
}

export function resolve_osi_estatus_document_label(
  id_estatus: unknown,
  nombre_estado?: unknown,
): string {
  const nombre = typeof nombre_estado === "string" ? nombre_estado.trim() : "";
  if (nombre) return nombre;
  const id = Number(id_estatus ?? 0);
  return OSI_ESTATUS_LABEL_BY_ID[id] ?? "N/A";
}

/**
 * Muestra el bloque de cierre del documento.
 * Requiere OSI ejecutada + step de certificados completado en capacitacion_proceso_steps.
 */
export function resolve_show_cierre_section(
  id_estatus: unknown,
  cap_cierre_certificados_step_completed?: boolean,
): boolean {
  const id = Number(id_estatus ?? 0);
  return (
    id === OSI_PREVIEW_ESTATUS.EJECUTADO &&
    cap_cierre_certificados_step_completed === true
  );
}
