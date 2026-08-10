/**
 * Shared utilities for OSI session count computation.
 * Used by admin assignment modals, facilitador portal, and seguimiento-servicios.
 */

interface OSISessionCountData {
  desglose_recursos_sesiones?: unknown[] | null;
  sesiones_programadas?: unknown[] | null;
  sesiones_ejecucion?: number | null;
}

/**
 * Compute the total number of sessions for an OSI using a consistent priority chain:
 *   1. desglose_recursos_sesiones (array length — most reliable, from the view)
 *   2. sesiones_programadas (JSONB array length — set during planificacion)
 *   3. sesiones_ejecucion (integer column — fallback)
 *   4. 1 (single session default)
 */
export function getSessionCount(osi: OSISessionCountData): number {
  if (Array.isArray(osi.desglose_recursos_sesiones) && osi.desglose_recursos_sesiones.length > 0) {
    return osi.desglose_recursos_sesiones.length;
  }
  if (Array.isArray(osi.sesiones_programadas) && osi.sesiones_programadas.length > 0) {
    return osi.sesiones_programadas.length;
  }
  return osi.sesiones_ejecucion || 1;
}
