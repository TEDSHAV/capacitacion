// Types for Nuevos Servicios form (solicitudes_diseno_servicio)

export interface DisenoServicioHeader {
  id: number;
  id_servicio_relacionado: number;
  id_solicitante: number;
  cargo_solicitante: string;
  fecha_solicitud: string | null;
  tipo_solicitud: string; // 'creacion' | 'modificacion'
  id_estatus: number;
  nombre_sugerido: string;
  objetivo_proposito: string;
  tipo_servicio: string; // 'Capacitación (CAP)' | 'Servicio Técnico (ST)'
  id_departamento_ejecutante: number | null; // 3 = Capacitación, 4 = Servicios Técnicos
  fecha_aprobacion: string | null;
  id_usuario_aprobador: number | null;
  observaciones_cierre: string | null;
  // Joined fields
  solicitante_nombre?: string;
  estatus_nombre?: string;
  servicio_nombre?: string;
  aprobador_nombre?: string;
}

// Bloque I: Recursos, Requisitos y Antecedentes
export interface BloqueRecursosRequisitos {
  personal_requerido: string;
  equipos_herramientas: string;
  software: string;
  infraestructura: string;
  requisitos_legales: string;
  requisitos_cliente: string;
  criterios_aceptacion: string;
  antecedentes: {
    existe: boolean;
    especificacion: string;
  };
}

// Bloque: Higiene, Seguridad y Ambiente
export interface BloqueHigieneSeguridadAmbiente {
  ambiental: {
    generacion_residuos: boolean;
    consumo_energia: boolean;
    emisiones_vertidos: boolean;
    significancia: string;
  };
  peligros: {
    biologicos: boolean;
    mecanicos: boolean;
    ergonomicos: boolean;
    electricos: boolean;
    quimicos: boolean;
    otros: string;
    descripcion: string;
  };
}

// Bloque II: Factibilidad y Planificación
export interface CostoItem {
  id: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  total: number;
}

export interface BloquePlanificacionFactibilidad {
  recurso_asignado: string;
  equipos_asignados: string;
  software_material_asignado: string;
  estructura_costos: CostoItem[];
  costo_total: number;
  viabilidad_tecnica: "favorable" | "no_favorable" | "";
  viabilidad_economica: "favorable" | "no_favorable" | "";
  tiempo_estimado: string;
  fecha_estimada_finalizacion: string;
  aprobacion: {
    nombre: string;
    cargo: string;
    fecha: string;
    aprobado: boolean;
  };
}

// Bloque III: Controles del Diseño
export interface ControlDisenoEntry {
  descripcion: string;
  responsable: string;
  fecha: string;
  resultado: "conforme" | "no_conforme" | "";
}

export interface BloqueControlesDiseno {
  revision: ControlDisenoEntry;
  verificacion: ControlDisenoEntry;
  validacion: ControlDisenoEntry;
}

// Bloque IV: Salidas del Diseño
export interface SalidaChecklistItem {
  item: string;
  aplica: "aplica" | "no_aplica" | "";
  especifique: string;
}

export interface BloqueSalidasDiseno {
  checklist: SalidaChecklistItem[];
  declaracion_cumplimiento: boolean | null;
  observaciones: string;
}

// Composite full data
export interface DisenoServicioFullData extends DisenoServicioHeader {
  bloque_recursos_requisitos: BloqueRecursosRequisitos | null;
  bloque_higiene_seguridad_ambiente: BloqueHigieneSeguridadAmbiente | null;
  bloque_planificacion_factibilidad: BloquePlanificacionFactibilidad | null;
  bloque_controles_diseno: BloqueControlesDiseno | null;
  bloque_salidas_diseno: BloqueSalidasDiseno | null;
}

// Lightweight for list view
export interface DisenoServicioListItem {
  id: number;
  nombre_sugerido: string;
  tipo_solicitud: string;
  tipo_servicio: string;
  id_departamento_ejecutante: number | null; // 3 = Capacitación, 4 = Servicios Técnicos
  id_estatus: number;
  estatus_nombre: string;
  solicitante_nombre: string;
  solicitante_departamento: string;
  fecha_solicitud: string | null;
}

// Checklist definitions per service type
export const CAP_CHECKLIST_ITEMS = [
  "Ficha de Curso",
  "Presentación y/o Material Didáctico",
  "Manual del Curso",
  "Instrumentos de Evaluación",
  "Material POP",
  "Identificación de Requisitos Legales y Normativos Aplicables",
  "Definición de Competencias Requeridas del Facilitador",
  "Registros y Formularios Necesarios para la Ejecución del Servicio",
];

export const ST_CHECKLIST_ITEMS = [
  "Oferta Técnica",
  "Procedimiento o Instructivo para la Ejecución del Servicio",
  "Formularios para la Recolección de Datos en Campo",
  "Criterios Técnicos de Evaluación o Análisis",
  "Definición de Equipos, Instrumentos o Software Necesarios",
  "Identificación de Requisitos Legales o Normativos Aplicables",
  "Definición de Competencias Requeridas del Personal Técnico",
  "Registros y Formularios Necesarios para la Ejecución del Servicio",
];

// Default empty blocks
export const EMPTY_BLOQUE_RECURSOS: BloqueRecursosRequisitos = {
  personal_requerido: "",
  equipos_herramientas: "",
  software: "",
  infraestructura: "",
  requisitos_legales: "",
  requisitos_cliente: "",
  criterios_aceptacion: "",
  antecedentes: { existe: false, especificacion: "" },
};

export const EMPTY_BLOQUE_HIGIENE: BloqueHigieneSeguridadAmbiente = {
  ambiental: {
    generacion_residuos: false,
    consumo_energia: false,
    emisiones_vertidos: false,
    significancia: "",
  },
  peligros: {
    biologicos: false,
    mecanicos: false,
    ergonomicos: false,
    electricos: false,
    quimicos: false,
    otros: "",
    descripcion: "",
  },
};

export const EMPTY_BLOQUE_PLANIFICACION: BloquePlanificacionFactibilidad = {
  recurso_asignado: "",
  equipos_asignados: "",
  software_material_asignado: "",
  estructura_costos: [],
  costo_total: 0,
  viabilidad_tecnica: "",
  viabilidad_economica: "",
  tiempo_estimado: "",
  fecha_estimada_finalizacion: "",
  aprobacion: { nombre: "", cargo: "", fecha: "", aprobado: false },
};

export const EMPTY_BLOQUE_CONTROLES: BloqueControlesDiseno = {
  revision: { descripcion: "", responsable: "", fecha: "", resultado: "" },
  verificacion: { descripcion: "", responsable: "", fecha: "", resultado: "" },
  validacion: { descripcion: "", responsable: "", fecha: "", resultado: "" },
};

export const EMPTY_BLOQUE_SALIDAS: BloqueSalidasDiseno = {
  checklist: [],
  declaracion_cumplimiento: null,
  observaciones: "",
};
