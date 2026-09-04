/**
 * Shared types for the facilitador evaluation feature.
 * Extracted so both server actions and scoring helpers can use them
 * without circular dependencies.
 */

export type TipoEvaluacion = "nuevo" | "seguimiento" | "reevaluacion";

export type CondicionFinal =
  | "aprobado"
  | "aprobado_supervision"
  | "no_aprobado"
  | "aceptable"
  | "no_aceptable";

/** Phase 1 — Verificación Inicial criteria selections. */
export interface FaseInicial {
  secciones: {
    nivel_educativo?: { opcion: string | null; observacion?: string };
    competencias_tecnicas?: { opcion: string | null; observacion?: string };
    actualizacion_profesional?: { opcion: string | null; observacion?: string };
    manejo_herramientas?: { opcion: string | null; observacion?: string };
    documentacion_legal?: {
      /** Multi-select: keys of checked documents. */
      opciones: string[];
      observacion?: string;
    };
    experiencia_docente?: { opcion: string | null; observacion?: string };
  };
  total_puntos?: number;
}

/** Phase 2 — Evaluación de Seguimiento. */
export interface FaseSeguimiento {
  docs_iniciales_pct?: number;
  encuestas_pct?: number;
  gestion_actividades?: {
    /** 6 items rated 1-5. */
    items: number[];
    total?: number;
    pct?: number;
  };
  total_pct?: number;
  observaciones?: string;
  oportunidades_mejora?: string;
  metodologias?: string;
}

/** Phase 3 — Reevaluación. */
export interface FaseReevaluacion {
  osis: {
    nro_osi: string;
    docs?: number;
    encuestas?: number;
    gestion?: number;
    total?: number;
  }[];
  condicion?: string;
}

export interface EvaluacionPayload {
  id?: number;
  facilitador_id: number;
  tipo_evaluacion: TipoEvaluacion;
  evaluador_nombre?: string | null;
  evaluador_cargo?: string | null;
  recomendado_por?: string | null;
  tipo_proveedor?: string | null;
  entrevista?: string | null;
  firma?: string | null;
  fecha_evaluacion: string;
  fase_inicial: FaseInicial;
  fase_seguimiento?: FaseSeguimiento | null;
  fase_reevaluacion?: FaseReevaluacion | null;
  observaciones?: string | null;
}

export interface EvaluacionWithFacilitador {
  id: number;
  facilitador_id: number;
  tipo_evaluacion: TipoEvaluacion;
  evaluador_nombre: string | null;
  evaluador_cargo: string | null;
  recomendado_por: string | null;
  tipo_proveedor: string | null;
  entrevista: string | null;
  firma: string | null;
  fecha_evaluacion: string;
  fase_inicial: unknown;
  fase_seguimiento: unknown | null;
  fase_reevaluacion: unknown | null;
  puntaje_total: number | null;
  porcentaje_total: number | null;
  condicion_final: CondicionFinal | null;
  observaciones: string | null;
  creado_por: number | null;
  created_at: string;
  updated_at: string;
  facilitadores: {
    id: number;
    nombre_apellido: string;
    cedula: string | null;
    rif: string | null;
    is_active: boolean;
    id_ciudad: number | null;
  } | null;
}
