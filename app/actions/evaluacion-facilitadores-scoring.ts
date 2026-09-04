/**
 * Pure scoring helpers for the facilitador evaluation form.
 *
 * Extracted from the server actions file so they can be synchronous
 * (Next.js 16 requires all exports from "use server" files to be async).
 */

import type {
  FaseInicial,
  FaseSeguimiento,
  CondicionFinal,
} from "./evaluacion-facilitadores-types";

/** Phase 1 criteria → points, keyed by section + option key. */
const CRITERIA_POINTS: Record<string, Record<string, number>> = {
  nivel_educativo: {
    nivel_tecnico: 0.5,
    universitario: 1,
    universitario_especializacion: 2,
  },
  competencias_tecnicas: {
    experiencia_sin_certificacion: 1,
    formacion_teorica_practica_cert: 5,
    formacion_teorica_sin_cert: 3,
  },
  actualizacion_profesional: {
    "6_meses": 2,
    "12_meses": 1,
    "mas_12_meses": 0.5,
  },
  manejo_herramientas: {
    totalmente: 5,
    si_con_limitacion: 3,
    en_aprendizaje: 1,
    no: 0,
  },
  documentacion_legal: {
    resumen_curricular: 2,
    soportes_resumen_curricular: 1,
    registro_inpsasel: 4,
    titulo_universitario_fondo_negro: 1,
    cedula_rif: 1,
    factura: 4,
  },
  experiencia_docente: {
    formacion_docente_certificada: 3,
    experiencia_docente_sin_cert: 1,
    sin_experiencia: 0,
  },
};

/** Compute Phase 1 total points from the selected options. */
export function computePuntajeInicial(fase: FaseInicial): number {
  let total = 0;
  const s = fase.secciones;
  if (s.nivel_educativo?.opcion) {
    total += CRITERIA_POINTS.nivel_educativo[s.nivel_educativo.opcion] ?? 0;
  }
  if (s.competencias_tecnicas?.opcion) {
    total += CRITERIA_POINTS.competencias_tecnicas[s.competencias_tecnicas.opcion] ?? 0;
  }
  if (s.actualizacion_profesional?.opcion) {
    total += CRITERIA_POINTS.actualizacion_profesional[s.actualizacion_profesional.opcion] ?? 0;
  }
  if (s.manejo_herramientas?.opcion) {
    total += CRITERIA_POINTS.manejo_herramientas[s.manejo_herramientas.opcion] ?? 0;
  }
  // documentacion_legal is multi-select
  if (s.documentacion_legal?.opciones) {
    for (const opt of s.documentacion_legal.opciones) {
      total += CRITERIA_POINTS.documentacion_legal[opt] ?? 0;
    }
  }
  if (s.experiencia_docente?.opcion) {
    total += CRITERIA_POINTS.experiencia_docente[s.experiencia_docente.opcion] ?? 0;
  }
  return total;
}

/** Classify Phase 1 result from total points. */
export function classifyInicial(puntaje: number): CondicionFinal {
  if (puntaje >= 25) return "aprobado";
  if (puntaje >= 20) return "aprobado_supervision";
  return "no_aprobado";
}

/** Compute Phase 2 total percentage (40% docs + 40% encuestas + 20% gestión). */
export function computeSeguimientoTotal(fase: FaseSeguimiento | null | undefined): number {
  if (!fase) return 0;
  const docs = fase.docs_iniciales_pct ?? 0;
  const encuestas = fase.encuestas_pct ?? 0;
  const gestion = fase.gestion_actividades?.pct ?? 0;
  return docs * 0.4 + encuestas * 0.4 + gestion * 0.2;
}

/** Compute gestión de actividades percentage from 6 items (1-5 scale, max 30 → 100%). */
export function computeGestionPct(items: number[]): number {
  if (!items || items.length === 0) return 0;
  const total = items.reduce((sum, v) => sum + (v || 0), 0);
  return total / 30; // 30 = 6 items × 5 max
}
