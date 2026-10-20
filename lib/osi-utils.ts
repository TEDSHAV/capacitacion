/**
 * Shared utilities for OSI session count computation.
 * Used by admin assignment modals, facilitador portal, and seguimiento-servicios.
 */

export interface OSISessionCountData {
  desglose_recursos_sesiones?: unknown[] | null;
  sesiones_programadas?: unknown[] | null;
  sesiones_ejecucion?: number | null;
  sesiones_solped?: number | null;
}

/**
 * Compute the total number of sessions for an OSI by taking the maximum count
 * found across all sources (desglose, sesiones_programadas including unconfirmed dates,
 * sesiones_solped, sesiones_ejecucion). This prevents truncating session counts when
 * one or more sessions lack a confirmed planned date.
 */
export function getSessionCount(osi?: OSISessionCountData | null): number {
  if (!osi) return 1;
  const desgloseLen = Array.isArray(osi.desglose_recursos_sesiones) ? osi.desglose_recursos_sesiones.length : 0;
  const progLen = Array.isArray(osi.sesiones_programadas) ? osi.sesiones_programadas.length : 0;
  const solped = typeof osi.sesiones_solped === "number" && !isNaN(osi.sesiones_solped) ? osi.sesiones_solped : 0;
  const ejecucion = typeof osi.sesiones_ejecucion === "number" && !isNaN(osi.sesiones_ejecucion) ? osi.sesiones_ejecucion : 0;

  const maxVal = Math.max(desgloseLen, progLen, solped, ejecucion);
  return maxVal > 0 ? maxVal : 1;
}

