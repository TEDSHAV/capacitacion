export type ProcesoPhase = "planificacion" | "ejecucion";

export interface StepDef {
  key: string;
  label: string;
  description?: string;
  auto?: boolean;
  autoUnmarkable?: boolean;
  optional?: boolean;
  requiresInput?: boolean;
  inputPlaceholder?: string;
  group?: string;
  phase: ProcesoPhase;
}

export const PLANIFICACION_STEPS: StepDef[] = [
  {
    key: "requisicion_enviada_admin",
    label: "Requisición a Admin",
    description: "La requisición ha sido enviada al departamento de Administración.",
    phase: "planificacion",
  },
  {
    key: "material_enviado_facilitador",
    label: "Material enviado al facilitador / En espera de Ejecución",
    description: "El material del servicio ha sido enviado al facilitador asignado.",
    phase: "planificacion",
  },
];

export const EJECUCION_STEPS: StepDef[] = [
  {
    key: "en_proceso",
    label: "En proceso",
    description: "El servicio está en ejecución (auto-avanzado al llegar la fecha de inicio).",
    auto: true,
    autoUnmarkable: true,
    phase: "ejecucion",
  },
  {
    key: "ejecutado",
    label: "Ejecutado",
    description: "El servicio ha sido ejecutado completamente (auto-avanzado al pasar la fecha).",
    auto: true,
    autoUnmarkable: true,
    phase: "ejecucion",
  },
  {
    key: "lista_asistencia",
    label: "Lista asistencia",
    description: "La lista de asistencia ha sido recibida.",
    group: "post_servicio",
    phase: "ejecucion",
  },
  {
    key: "calificacion",
    label: "Calificación",
    description: "Calificación de los participantes.",
    group: "post_servicio",
    phase: "ejecucion",
  },
  {
    key: "material_fotografico",
    label: "Material fotográfico",
    description: "Material fotográfico del servicio.",
    group: "post_servicio",
    phase: "ejecucion",
  },
  {
    key: "encuestas_satisfaccion_tabulacion",
    label: "Encuestas / Tabulación",
    description: "Encuestas de satisfacción y tabulación.",
    group: "post_servicio",
    phase: "ejecucion",
  },
  {
    key: "elaboracion_certificados",
    label: "Elaboración certificados / Disponible en portal",
    description: "Los certificados están en elaboración y disponibles en el portal de clientes.",
    phase: "ejecucion",
  },
  {
    key: "material_recibido_fisico",
    label: "Material recibido (físico)",
    description: "El material físico ha sido recibido.",
    phase: "ejecucion",
  },
  {
    key: "certificados_impresos",
    label: "Certificados impresos",
    description: "Certificados impresos.",
    optional: true,
    phase: "ejecucion",
  },
  {
    key: "sobre_espera_autorizacion",
    label: "Sobre en espera aut.",
    description: "El sobre está en espera de autorización.",
    optional: true,
    phase: "ejecucion",
  },
  {
    key: "sobre_enviado_zoom",
    label: "Sobre enviado zoom",
    description: "El sobre ha sido enviado por zoom.",
    requiresInput: true,
    inputPlaceholder: "N° guía",
    phase: "ejecucion",
  },
];

// Unified steps: all in order (planificacion first, then ejecucion)
export const ALL_STEPS: StepDef[] = [...PLANIFICACION_STEPS, ...EJECUCION_STEPS];

export const STEPS_BY_PHASE: Record<ProcesoPhase, StepDef[]> = {
  planificacion: PLANIFICACION_STEPS,
  ejecucion: EJECUCION_STEPS,
};

export function getStepKeys(phase: ProcesoPhase): string[] {
  return STEPS_BY_PHASE[phase].map((s) => s.key);
}

export function isAutoStep(phase: ProcesoPhase, stepKey: string): boolean {
  const step = STEPS_BY_PHASE[phase].find((s) => s.key === stepKey);
  return !!step?.auto && !step?.autoUnmarkable;
}

// Find which phase a step key belongs to
export function getPhaseForStep(stepKey: string): ProcesoPhase | null {
  const step = ALL_STEPS.find((s) => s.key === stepKey);
  return step?.phase ?? null;
}

// Check if a step is auto (and not manually toggleable), using the unified steps list
export function isAutoStepUnified(stepKey: string): boolean {
  const step = ALL_STEPS.find((s) => s.key === stepKey);
  return !!step?.auto && !step?.autoUnmarkable;
}

// Check if a step requires a text input when marking complete
export function requiresStepInput(stepKey: string): boolean {
  const step = ALL_STEPS.find((s) => s.key === stepKey);
  return !!step?.requiresInput;
}

// Get step definition by key
export function getStepByKey(stepKey: string): StepDef | undefined {
  return ALL_STEPS.find((s) => s.key === stepKey);
}
