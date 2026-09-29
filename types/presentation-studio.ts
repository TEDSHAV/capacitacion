export type SlideLayoutType =
  | "portada"
  | "modulo_divider"
  | "objetivos"
  | "normativa"
  | "concepto"
  | "proceso_pasos"
  | "alerta_seguridad"
  | "caso_practico"
  | "video_recurso"
  | "evaluacion";

export interface StepItem {
  numero: number;
  titulo: string;
  descripcion: string;
}

export interface SlideDefinition {
  id: string;
  layout: SlideLayoutType;
  titulo: string;
  subtitulo?: string;
  badge?: string;
  moduloPertenece?: string;
  bullets?: string[];
  pasos?: StepItem[];
  destacado?: string;
  tipoAlerta?: "peligro" | "advertencia" | "precaucion" | "informativo";
  notasFacilitador?: string;
  // Video capabilities
  tieneVideo?: boolean;
  videoTitulo?: string;
  videoUrl?: string;
  videoFileName?: string;
  videoFileBase64?: string; // For client-server transfer if uploading custom video
}

export interface GeneracionPresentacionParams {
  cursoId?: number | null;
  cursoNombre: string;
  contenidoCurso?: string;
  cargaHorariaStd: number;
  alcance: "curso_completo" | "modulo_especifico";
  moduloNombre?: string;
  enfoquesNormativos?: string[];
  enfoqueNormativo?: string;
  audienciaNivel?: string;
  directricesAdicionales?: string;
  cantidadLaminasDeseada?: number;
  // Client-specific standard PDF
  pdfEstandarBase64?: string;
  pdfEstandarNombre?: string;
}

export interface ResultadoGeneracionEstructura {
  success: boolean;
  slides?: SlideDefinition[];
  totalEstimadoMinutos?: number;
  error?: string;
}

export interface CompilacionPresentacionParams {
  cursoId?: number | null;
  cursoNombre: string;
  tituloPresentacion: string;
  slides: SlideDefinition[];
  guardarEnServidor?: boolean;
}
