/**
 * Types for the Course Digital Evaluation system.
 */

export type TipoPreguntaEvaluacion = "single_choice" | "true_false" | "multiple_choice";

export type TipoEvaluacionCurso = "standard" | "pre_post";
export type EtapaEvaluacion = "pre" | "post";

export interface EvaluacionOpcion {
  id: string;
  texto: string;
  es_correcta: boolean;
}

export interface EvaluacionOpcionPublic {
  id: string;
  texto: string;
}

export interface EvaluacionPregunta {
  id: string;
  enunciado: string;
  tipo: TipoPreguntaEvaluacion;
  puntos: number;
  orden: number;
  opciones: EvaluacionOpcion[];
  etapa?: EtapaEvaluacion;
}

export interface EvaluacionPreguntaPublic {
  id: string;
  enunciado: string;
  tipo: TipoPreguntaEvaluacion;
  puntos: number;
  orden: number;
  opciones: EvaluacionOpcionPublic[];
  etapa?: EtapaEvaluacion;
}

export interface EvaluacionPlantilla {
  id: number;
  id_curso: number | null;
  titulo: string;
  descripcion: string | null;
  nota_aprobatoria: number;
  duracion_minutos: number | null;
  tipo_evaluacion?: TipoEvaluacionCurso;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  preguntas?: EvaluacionPregunta[];
  preguntas_count?: number;
  curso_nombre?: string | null;
}

export interface OSIEvaluacion {
  id: number;
  id_osi: number;
  plantilla_id: number | null;
  titulo: string;
  nota_aprobatoria: number;
  duracion_minutos: number | null;
  tipo_evaluacion?: TipoEvaluacionCurso;
  preguntas: EvaluacionPregunta[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  submissions_count?: number;
}

export interface EvaluacionPublicData {
  osiId: number;
  nroOsi: string;
  servicio: string;
  nombreEmpresa: string;
  evaluacionId: number;
  titulo: string;
  notaAprobatoria: number;
  duracionMinutos: number | null;
  tipoEvaluacion?: TipoEvaluacionCurso;
  preguntas: EvaluacionPreguntaPublic[];
}

export interface EvaluacionRespuestaItem {
  id: number;
  osi_evaluacion_id: number;
  id_osi: number;
  nro_sesion: number;
  cedula: string;
  nombre_apellido: string;
  respuestas: Record<string, string>;
  nota: number;
  aprobado: boolean;
  dispositivo: "mobile_qr" | "kiosk";
  etapa?: EtapaEvaluacion;
  created_at: string;
}

export interface SubmitEvaluacionPayload {
  identifier: string; // osiId or nro_osi
  nroSesion?: number;
  cedula: string;
  nombre_apellido: string;
  respuestas: Record<string, string>; // questionId -> optionId
  dispositivo?: "mobile_qr" | "kiosk";
  etapa?: EtapaEvaluacion;
}

export interface SubmitEvaluacionResult {
  success: boolean;
  score?: number;
  aprobado?: boolean;
  notaAprobatoria?: number;
  totalQuestions?: number;
  correctCount?: number;
  error?: string;
  alreadySubmitted?: boolean;
}

