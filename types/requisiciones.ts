
export type RequisicionMode = "general" | "capacitacion" | "servicios tecnicos";

export type VerificacionStatus = "listo" | "pendiente";

export type EstatusAdmin = "pendiente" | "procesada" | "rechazada";

export type CoordinadorEstatus = "pendiente" | "aprobada" | "rechazada" | null;

export type LiderEstatus = "pendiente" | "aprobada" | "rechazada" | null;

// Per-session cost breakdown from v_osi_formato_completo.desglose_recursos_sesiones
export interface OSISesion {
  id: number;
  id_sesion: number;
  nro_sesion: number | null;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  costo_traslado: number | null;
  costo_impresion_material: number | null;
  horas_honorarios_instructor: number | null;
  tarifa_hora_honorarios: number | null;
  costo_honorarios_instructor: number | null;
}

export interface RequisicionItem {
  id: string;
  cant: number;
  unidad: string;
  descripcion: string;
  costo_unitario: number;
  total: number;
  id_osi?: number | null;
  verificacion?: VerificacionStatus;
  verificado_por?: string | null;
  verificado_en?: string | null;
}

export interface RequisicionFilters {
  tab: "todas" | "internas" | "externas" | "historial";
  gerencia: string;
  estatus: "" | EstatusAdmin;
  fechaDesde: string;
  fechaHasta: string;
  search: string;
  osi: string;
  empresa: string;
  curso: string;
}

export interface OSIFixedItem {
  id_osi: number;
  nro_osi: string | null;
  dias_traslado: number;
  costo_traslado: number;
  impresion_total: number;
  honorarios_horas: number;
  honorarios_costo_hora: number;
  honorarios_total: number;
  informe_final_total: number;
  verificacion_traslado: VerificacionStatus;
  verificacion_impresion: VerificacionStatus;
  verificacion_honorarios: VerificacionStatus;
  verificacion_informe_final: VerificacionStatus;
  verificado_por_traslado?: string | null;
  verificado_en_traslado?: string | null;
  verificado_por_impresion?: string | null;
  verificado_en_impresion?: string | null;
  verificado_por_honorarios?: string | null;
  verificado_en_honorarios?: string | null;
  verificado_por_informe_final?: string | null;
  verificado_en_informe_final?: string | null;
}

export interface RequisicionFormData {
  selectedOSIs: OSIFullData[];
  is_general: boolean;
  corresponde_a: string;
  fecha_solicitud: string;
  tipo_solicitud: "Interno" | "Externo" | "";
  nro_correlativo: string;
  tipo_servicio: "Servicio Técnico" | "Capacitación" | "";
  gerencia_solicitante: string;
  departamento: string;
  solicitante: string;
  prioridad: "Alta" | "Media" | "Baja" | "";
  id_sesion: number | null;
  selectedSesion?: OSISesion | null;

  // Details - Fixed Items Quantities
  cant_traslado: number;
  cant_impresion: number;
  cant_honorarios: number;
  cant_informe_final: number;

  // Details - Values (legacy single-value, kept for backward compat)
  dias_traslado: number | null;
  costo_traslado: number | null;
  impresion_total: number | null;
  honorarios_horas: number | null;
  honorarios_costo_hora: number | null;
  honorarios_total: number | null;
  informe_final_total: number | null;

  // Per-OSI fixed items (Capacitación mode)
  osi_fixed_items: OSIFixedItem[];

  // Additional dynamic items
  additional_items: RequisicionItem[];

  // Facilitator
  cod_facilitador: string;
  facilitador: string;
  cedula_facilitador: string;
  rif_facilitador: string;
  telefono_facilitador: string;
  banco: string;
  nro_cuenta: string;

  observaciones: string;
}

// Full OSI data from v_osi_formato_completo view for control servicios
export interface OSIFullData {
  id_osi: number;
  nro_osi: string | null;
  fecha_emision?: string | null;
  fecha_inicio_real?: string | null;
  codigo_cliente?: number | null;
  participantes_ejecucion?: number | null;
  servicio: string | null;
  costo_traslado: number | null;
  horas_honorarios_instructor: number | null;
  tarifa_hora_honorarios: number | null;
  costo_honorarios_instructor: number | null;
  costo_impresion_material: number | null;
  tipo_servicio?: string | null;
  nombre_empresa?: string | null;
  desglose_recursos_sesiones?: OSISesion[] | null;
}
