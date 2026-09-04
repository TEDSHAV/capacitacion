/**
 * Criteria definitions for the RG-CAP-004 facilitador evaluation form.
 * Extracted from the reference Excel file.
 *
 * Each section has a set of options. Sections 1-4 and 6 are single-select
 * (radio). Section 5 (documentación legal) is multi-select (checkbox).
 */

export interface CriterionOption {
  key: string;
  label: string;
  puntos: number;
  /** Percentage weight (from the Excel %B column, for reference). */
  pct?: number;
}

export interface CriterionSection {
  key: string;
  title: string;
  multi?: boolean;
  options: CriterionOption[];
}

export const CRITERIA_SECTIONS: CriterionSection[] = [
  {
    key: "nivel_educativo",
    title: "1. NIVEL EDUCATIVO",
    options: [
      { key: "nivel_tecnico", label: "NIVEL TÉCNICO", puntos: 0.5, pct: 5 },
      { key: "universitario", label: "UNIVERSITARIO", puntos: 1, pct: 10 },
      {
        key: "universitario_especializacion",
        label: "UNIVERSITARIO CON ESPECIALIZACIÓN",
        puntos: 2,
        pct: 15,
      },
    ],
  },
  {
    key: "competencias_tecnicas",
    title: "2. COMPETENCIAS TÉCNICAS",
    options: [
      {
        key: "experiencia_sin_certificacion",
        label: "EXPERIENCIA DE TRABAJO SIN CERTIFICACIÓN",
        puntos: 1,
        pct: 10,
      },
      {
        key: "formacion_teorica_practica_cert",
        label:
          "FORMACIÓN TEÓRICA / PRÁCTICA CON CERTIFICACIÓN NACIONAL Y/O INTERNACIONAL",
        puntos: 5,
        pct: 15,
      },
      {
        key: "formacion_teorica_sin_cert",
        label: "FORMACIÓN TEÓRICA SIN CERTIFICACIÓN",
        puntos: 3,
        pct: 1,
      },
    ],
  },
  {
    key: "actualizacion_profesional",
    title: "3. ACTUALIZACIÓN PROFESIONAL",
    options: [
      {
        key: "6_meses",
        label: "¿Cuándo realizó su último curso? — 6 MESES",
        puntos: 2,
        pct: 15,
      },
      {
        key: "12_meses",
        label: "¿Cuándo realizó su último curso? — 12 MESES",
        puntos: 1,
        pct: 10,
      },
      {
        key: "mas_12_meses",
        label: "¿Cuándo realizó su último curso? — MÁS DE 12 MESES",
        puntos: 0.5,
        pct: 5,
      },
    ],
  },
  {
    key: "manejo_herramientas",
    title: "4. MANEJO DE HERRAMIENTAS",
    options: [
      {
        key: "totalmente",
        label:
          "¿Maneja las herramientas y/o dispositivos audiovisuales? — TOTALMENTE",
        puntos: 5,
        pct: 15,
      },
      {
        key: "si_con_limitacion",
        label: "¿Maneja las herramientas? — SÍ, CON LIMITACIÓN",
        puntos: 3,
        pct: 7,
      },
      {
        key: "en_aprendizaje",
        label: "¿Maneja las herramientas? — EN APRENDIZAJE",
        puntos: 1,
        pct: 1,
      },
      { key: "no", label: "¿Maneja las herramientas? — NO", puntos: 0, pct: 0 },
    ],
  },
  {
    key: "documentacion_legal",
    title: "5. DOCUMENTACIÓN LEGAL",
    multi: true,
    options: [
      {
        key: "resumen_curricular",
        label: "RESUMEN CURRICULAR",
        puntos: 2,
        pct: 1,
      },
      {
        key: "soportes_resumen_curricular",
        label: "SOPORTES DE RESUMEN CURRICULAR",
        puntos: 1,
        pct: 1,
      },
      {
        key: "registro_inpsasel",
        label: "REGISTRO ANTE EL INPSASEL",
        puntos: 4,
        pct: 5,
      },
      {
        key: "titulo_universitario_fondo_negro",
        label: "TÍTULO UNIVERSITARIO O FONDO NEGRO",
        puntos: 1,
        pct: 0.5,
      },
      {
        key: "cedula_rif",
        label: "CÉDULA DE IDENTIDAD / RIF ACTUALIZADO",
        puntos: 1,
        pct: 0.5,
      },
      { key: "factura", label: "FACTURA", puntos: 4, pct: 1 },
    ],
  },
  {
    key: "experiencia_docente",
    title: "6. EXPERIENCIA DOCENTE",
    options: [
      {
        key: "formacion_docente_certificada",
        label: "POSEE FORMACIÓN DOCENTE CERTIFICADA",
        puntos: 3,
        pct: 10,
      },
      {
        key: "experiencia_docente_sin_cert",
        label: "EXPERIENCIA DOCENTE SIN CERTIFICACIÓN",
        puntos: 1,
        pct: 5,
      },
      {
        key: "sin_experiencia",
        label: "SIN EXPERIENCIA DOCENTE",
        puntos: 0,
        pct: 0,
      },
    ],
  },
];

/** Gestión de actividades items (Phase 2, 1-5 scale). */
export const GESTION_ITEMS: { label: string; max: number }[] = [
  {
    label:
      "1. Cumplimiento en la entrega de facturación conforme a la Orden de Compra.",
    max: 5,
  },
  {
    label:
      "2. Presentación personal y manejo del lenguaje verbal y corporal.",
    max: 5,
  },
  {
    label:
      "3. Comunicación con el Coordinador de Capacitación antes, durante y después de la actividad.",
    max: 5,
  },
  {
    label:
      "4. Entrega oportuna de las fotografías de la actividad al Coordinador de Capacitación.",
    max: 5,
  },
  {
    label:
      "5. Entrega oportuna del Control de Asistencia, Calificación de los Participantes (firmada) y Encuesta de Satisfacción de los Participantes.",
    max: 5,
  },
  {
    label: "6. Proactividad durante la prestación del servicio.",
    max: 5,
  },
];

/** Classification table for Phase 1 (Verificación Inicial). */
export const CLASIFICACION_INICIAL = [
  {
    rango: "ENTRE 25 Y 30 PUNTOS",
    resultado: "APROBADO",
    descripcion:
      "El facilitador cumple satisfactoriamente con los criterios establecidos y puede ser incorporado a la Lista de Proveedores Aprobados.",
    color: "green",
  },
  {
    rango: "ENTRE 20 Y 24 PUNTOS",
    resultado: "APROBADO BAJO SUPERVISIÓN",
    descripcion:
      "El facilitador presenta algunas brechas que requieren seguimiento. Podrá ser utilizado bajo condiciones controladas.",
    color: "amber",
  },
  {
    rango: "MENOS DE 20 PUNTOS",
    resultado: "NO APROBADO",
    descripcion:
      "El facilitador no cumple con los requisitos mínimos establecidos y no podrá ser seleccionado.",
    color: "red",
  },
];

/** Classification table for Phase 3 (Reevaluación). */
export const CLASIFICACION_REEVALUACION = [
  {
    rango: "≥ 80 %",
    resultado: "ACEPTABLE",
    descripcion:
      "El facilitador mantiene un desempeño satisfactorio, pudiendo conservar su condición como aprobado o aprobado bajo supervisión, según el análisis del Coordinador de Capacitación.",
    color: "green",
  },
  {
    rango: "< 80 %",
    resultado: "NO ACEPTABLE",
    descripcion:
      "El facilitador presenta desviaciones o incumplimientos en su desempeño, siendo clasificado como no aprobado y sujeto a acciones de mejora o restricción en su utilización.",
    color: "red",
  },
];
