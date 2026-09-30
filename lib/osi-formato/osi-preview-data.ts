import type { OsiStFechasServicioSlice } from "./st-fechas-document";

export type OsiPreviewData = {
  sesionesProgramadas?: Array<{
    fecha: string;
    hora_inicio?: string | null;
    hora_fin?: string | null;
  }>;
  nroOsi: string;
  nroTrato?: string | null;
  nroSolped?: string | null;
  fechaEmisionPresupuesto: string | null;
  nroPresupuesto: string | null;
  nroOrdenCompra: string | null;
  codigoCliente: string | null;
  fechaDocumento?: string | null;
  fechaSugerida?: string | null;
  /** Fase 2: fecha al marcar ejecución en Shell. */
  fechaPlanificada?: string | null;
  /** Sesiones propuestas al solicitar la OSI (fecha sugerida). */
  sesionesFechaSugerida?: Array<{
    fecha: string;
    hora_inicio?: string | null;
    hora_fin?: string | null;
  }>;
  /** Fase 2: sesiones confirmadas al planificar ejecución. */
  sesionesFechaPlanificada?: Array<{
    fecha: string;
    hora_inicio?: string | null;
    hora_fin?: string | null;
  }>;
  /** Fase 2: fechas reales de ejecución por sesión (osi_sesion). */
  sesionesFechaEjecutada?: Array<{
    fecha: string;
    hora_inicio?: string | null;
    hora_fin?: string | null;
  }>;
  revisionDocumento?: string | null;
  detalleServicio: string | null;
  servicio: string | null;
  tipoServicio: string | null;
  nombreEmpresa: string | null;
  sede?: string | null;
  clienteRif: string | null;
  direccionFiscal: string | null;
  personaContacto: string | null;
  contactoTelefono: string | null;
  contactoEmail: string | null;
  direccionEjecucion: string | null;
  direccionEnvio: string | null;
  ejecutivoNegocios: string | null;
  responsableRecepcion: string | null;
  fechaInicioReal: string | null;
  fechaFinReal: string | null;
  horaInicioServicio: string | null;
  participantesMaxSolped: number | null;
  horasAcademicasSolped: number | null;
  sesionesSolped: number | null;
  pretensionesTotales: string | null;
  observacionesTotales: string | null;
  pretensionesSolped?: string | null;
  pretensionesOsi?: string | null;
  observacionesSolped?: string | null;
  costoImpresionMaterial: number;
  costoLogisticaComida: number;
  costoTraslado: number;
  trasladoExterno: number;
  costoPop: number;
  costoOtros: number;
  horasHonorariosInstructor: number;
  diasLogisticaFacilitador?: number;
  diasHospedajeFacilitador?: number;
  tarifaHoraHonorarios: number;
  costoHonorariosInstructor: number;
  popIncluido: boolean;
  costoCarnetizacion: number;
  costoDiasEspecialista: number;
  costoHospedaje: number;
  costoBateria: number;
  /** Per-session resource blocks (modo por sesión). Empty = bloque global. */
  desgloseRecursosSesiones?: OsiRecursosSesionPreview[];
  certificadoImpreso: boolean;
  carnetImpreso: boolean;
  incluyeRefrigerio?: boolean;
  entregaCertificado?: "retira_cliente" | "se_envia" | null;
  audiovisuales: boolean;
  isCapacitacion: boolean;
  stServicios?: Array<{
    nombre: string;
    detalle: string | null;
    pretensiones?: string | null;
    observaciones?: string | null;
  }>;
  observacionesOsiSolicitud?: string | null;
  observacionesOsi?: string | null;
  stDiasCampo?: number;
  stDiasInforme?: number;
  stDiasRevision?: number;
  stAnalistas?: number;
  stOtrosTexto?: string | null;
  stSeguimientoGarantia?: string | null;
  stFechasPlanificadas?: OsiStFechasServicioSlice;
  stFechasEjecutadas?: OsiStFechasServicioSlice;
  stServicioEjecutado?: boolean;
  stLogisticaRecursos?: number;
  stEnvioFactura?: number;
  stEnvioMateriales?: number;
  stTraslados?: Array<{
    tipo: "urbano" | "extraurbano";
    cantidad: number;
    costo_unidad: number;
  }>;
  impresionMaterialIncluida?: boolean;
  bateriaIncluida?: boolean;
  participantesDocumento?: number | null;
  previewHighlights?: {
    participantes?: boolean;
    detalle?: boolean;
    direccionEjecucion?: boolean;
    fechaServicio?: boolean;
  };
  publicCostMask?: Record<string, boolean>;
  isPublicView?: boolean;
  /** Servicios técnicos: oculta montos USD para vista pública (resto de usuarios). */
  hideStMonetary?: boolean;
  /** Bloque de cierre (departamento ejecutante). Solo si la OSI está cerrada/ejecutada. */
  showCierreSection?: boolean;
  /** Etiqueta legible del estatus operativo de la OSI. */
  estatusOsiLabel?: string | null;
};


export type OsiRecursosSesionPreview = {
  nroSesion?: number | null;
  fecha?: string | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  costoImpresionMaterial: number;
  costoLogisticaComida: number;
  costoTraslado: number;
  trasladoExterno: number;
  costoPop: number;
  costoOtros: number;
  horasHonorariosInstructor: number;
  tarifaHoraHonorarios: number;
  costoHonorariosInstructor: number;
  popIncluido: boolean;
  costoCarnetizacion: number;
  costoDiasEspecialista: number;
  costoHospedaje: number;
  costoBateria: number;
  diasLogisticaFacilitador?: number;
  diasHospedajeFacilitador?: number;
  stDiasCampo?: number;
  stDiasInforme?: number;
  stDiasRevision?: number;
  stAnalistas?: number;
  stOtrosTexto?: string | null;
  stSeguimientoGarantia?: string | null;
  stLogisticaRecursos?: number;
  stEnvioFactura?: number;
  stEnvioMateriales?: number;
  stTraslados?: OsiPreviewData["stTraslados"];
  impresionMaterialIncluida?: boolean;
  bateriaIncluida?: boolean;
  incluyeRefrigerio?: boolean;
};

export type OsiStServicioLine = {
  nombre: string;
  detalle: string | null;
  pretensiones?: string | null;
  observaciones?: string | null;
};

export type OsiDocumentAssets = {
  logoSrc: string;
  footerSrc: string;
};
