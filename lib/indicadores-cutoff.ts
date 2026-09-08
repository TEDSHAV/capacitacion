/**
 * First month with trustworthy indicadores data.
 *
 * The capacitacion seguimiento system went live in August 2026. OSIs and
 * sessions before that month were not tracked through this app, so the
 * indicadores that depend on `osi_sesion.fecha_ejecutada` / process steps
 * are not reliable for Ene–Jul 2026. The indicadores page hides those
 * months entirely (matrix columns, month selector, carry panel, and
 * facilitadores table) so legacy data doesn't pollute the tracked months.
 *
 * Implemented as an absolute cutoff (not "August of the selected year") so
 * that 2027+ isn't wrongly truncated. Change this single constant when the
 * cutoff no longer applies.
 */
export const INDICADORES_START_MES = "2026-08";
export const INDICADORES_START_YEAR = 2026;
export const INDICADORES_START_MONTH = 8; // 1-indexed

/**
 * "YYYY-MM" comparison — zero-padded keys sort chronologically as strings,
 * so a plain `>=` is a valid chronological check across years.
 */
export function isMesTracked(mes: string | null | undefined): boolean {
  return !!mes && mes >= INDICADORES_START_MES;
}

/**
 * Visible month indices (0-indexed) for a given year, respecting the cutoff.
 * 2026 → [7, 8, 9, 10, 11] (Ago–Dic); 2027+ → [0..11]; ≤2025 → [].
 */
export function trackedMonthIndicesForYear(year: number): number[] {
  if (year < INDICADORES_START_YEAR) return [];
  if (year === INDICADORES_START_YEAR) {
    return Array.from({ length: 12 - (INDICADORES_START_MONTH - 1) }, (_, i) => INDICADORES_START_MONTH - 1 + i);
  }
  return Array.from({ length: 12 }, (_, i) => i);
}
