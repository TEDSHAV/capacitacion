export type UltimoCursoTiempo = "6_meses" | "12_meses" | "mas_12_meses";

export type ManejoHerramientasAudiovisuales =
  | "totalmente"
  | "con_limitacion"
  | "en_aprendizaje"
  | "no_se_manejarlos";

export type CaracteristicaEsencial =
  | "empatia"
  | "introversion"
  | "autoritarismo"
  | "indiferencia";

export type EntrevistaEstatus = "pendiente" | "aprobado" | "rechazado";

export type ItemCumplimiento = "cumple" | "cumple_parcial" | "no_cumple";

export interface EntrevistaEvaluacionItem {
  item_nro: number;
  criterio: string;
  cumplimiento: ItemCumplimiento;
  observacion: string;
}

export interface FacilitadorEntrevista {
  id: number;
  // Datos del aspirante
  nombre_apellido: string;
  cedula: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  posee_vehiculo: boolean;
  posee_laptop: boolean;
  disponibilidad_viajar: boolean;

  // Nivel Educativo
  nivel_tecnico: string | null;
  universitario: string | null;
  posee_especializacion: string | null;
  ultimo_curso_tiempo: UltimoCursoTiempo | null;
  ultimo_curso_descripcion: string | null;
  manejo_herramientas_audiovisuales: ManejoHerramientasAudiovisuales | null;

  // Documentación legal y soportes
  doc_resumen_curricular: boolean;
  doc_cedula_identidad: boolean;
  doc_soportes_resumen_curricular: boolean;
  doc_rif_actualizado: boolean;
  doc_registro_inpsasel: boolean;
  doc_factura_fiscal: boolean;
  doc_titulo_universitario: boolean;
  doc_declaracion_islr: boolean;
  doc_formacion_docente: boolean;
  doc_posee_laptop: boolean;

  // Desenvolvimiento y competencias
  retos_facilitador: string | null;
  logros_formacion: string | null;
  caracteristica_esencial: string | null;
  ejemplo_liderazgo: string | null;
  fortalezas: string | null;
  debilidades: string | null;
  motivo_trabajar_aqui: string | null;
  por_que_contratarte: string | null;
  temas_capacidades: string[];

  // Evaluación de la entrevista
  fecha_entrevista: string;
  entrevistado_por: string | null;
  evaluacion_items: EntrevistaEvaluacionItem[];
  observaciones: string | null;
  estatus: EntrevistaEstatus;

  // Promoción
  facilitador_id: number | null;
  promovido_at: string | null;
  facilitadores?: {
    id: number;
    nombre_apellido: string;
    cedula: string | null;
    is_active: boolean;
  } | null;

  // Metadata
  creado_por: number | null;
  created_at: string;
  updated_at: string;
}

export type FacilitadorEntrevistaPayload = Omit<
  FacilitadorEntrevista,
  "id" | "facilitador_id" | "promovido_at" | "facilitadores" | "creado_por" | "created_at" | "updated_at"
> & {
  id?: number;
};

export interface EntrevistaMetrics {
  total: number;
  pendientes: number;
  aprobados: number;
  rechazados: number;
  promovidos: number;
}

export interface EntrevistaMonthOption {
  key: string; // e.g. "2026-09"
  label: string; // e.g. "Septiembre 2026"
  count: number;
}

// ─── Default 6 Checklist Items from Formato de Entrevista Excel ──────────────
export const DEFAULT_EVALUACION_ITEMS: { item_nro: number; criterio: string }[] = [
  { item_nro: 1, criterio: "Prepara un CV detallado y bien organizado." },
  { item_nro: 2, criterio: "Apariencia impecable y profesional." },
  { item_nro: 3, criterio: "Practica tu postura para hablar." },
  { item_nro: 4, criterio: "Acompaña tus palabras con gestos y movimientos." },
  { item_nro: 5, criterio: "Investiga qué hace la empresa que te entrevistará." },
  { item_nro: 6, criterio: "Llegó puntual a la hora de su entrevista." },
];

export const ESTATUS_CONFIG: Record<
  EntrevistaEstatus,
  { label: string; bg: string; text: string; border: string; badgeCls: string }
> = {
  pendiente: {
    label: "Pendiente",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badgeCls: "bg-amber-100 text-amber-800 border-amber-300",
  },
  aprobado: {
    label: "Aprobado",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    badgeCls: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  rechazado: {
    label: "Rechazado",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    badgeCls: "bg-rose-100 text-rose-800 border-rose-300",
  },
};
