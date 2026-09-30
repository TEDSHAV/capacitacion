import type {
  OsiPreviewData,
  OsiRecursosSesionPreview,
} from "./osi-preview-data";
import {
  osi_recursos_were_persisted,
  resolve_osi_horas_count,
  resolve_osi_participantes_count,
  resolve_osi_sesiones_count,
  resolve_osi_st_engineering_value,
} from "./operational-display";
import { formatOsiSecuencialNro } from "./secuencial-display";
import { parse_st_traslados_json } from "./st-recursos-types";
import { build_osi_st_servicio_lines } from "./st-servicio-lines";
import {
  OSI_PREVIEW_ESTATUS,
  resolve_show_cierre_section,
  resolve_osi_estatus_document_label,
} from "./osi-status-display";
import {
  build_st_fechas_ejecutadas_vacias,
  build_st_fechas_servicio,
  resolve_osi_st_garantia_display,
  resolve_st_fecha_reunion_pre_proyecto,
  resolve_st_hora_reunion_pre_inicio,
} from "./st-fechas-document";
import { extract_osi_solicitud_observacion_text } from "./rich-html";
import {
  parse_osi_session_slots,
  pad_osi_session_slots,
  resolve_osi_sesiones_documento_count,
} from "./osi-session-slots";

type GenericRow = Record<string, unknown>;

export type BuildOsiPreviewInput = {
  view_row: GenericRow;
  osi_base_row?: GenericRow | null;
  ecc_children?: GenericRow[];
  servicio_nombre_by_id?: Map<number, string> | Record<number, string>;
  public_cost_mask?: Record<string, boolean>;
  can_see_private_costs?: boolean;
  /** Admin / superadmin / gestor_financiero (SGestion): puede activar vista privada con montos ST. */
  can_reveal_st_monetary?: boolean;
  /** ST: true = vista pública sin montos (default). false = vista privada con montos (solo si can_reveal). */
  st_monetary_public_view?: boolean;
  /** Step completado en capacitacion_proceso_steps para habilitar cierre del documento. */
  cap_cierre_certificados_step_completed?: boolean;
  /** Filas osi_sesion para fechas planificada / ejecutada en documento Cap. */
  osi_sesiones?: GenericRow[];
  /** ST: días por defecto para seguimiento de garantía (reglas OSI). */
  st_default_garantia_dias?: number;
};

function to_num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function to_str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

function to_text(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return to_str(value);
}

function to_sessions(
  value: unknown,
): ReturnType<typeof parse_osi_session_slots> {
  return parse_osi_session_slots(value);
}

function format_date_for_doc(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return new Intl.DateTimeFormat("es-VE").format(new Date());
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("es-VE").format(new Date());
  }
  return new Intl.DateTimeFormat("es-VE").format(parsed);
}

function map_desglose_recursos_sesiones(
  value: unknown,
): OsiRecursosSesionPreview[] {
  if (!Array.isArray(value)) return [];
  const result: OsiRecursosSesionPreview[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id_sesion_raw = row.id_sesion;
    const id_sesion_num = to_num(id_sesion_raw);
    const has_sesion =
      (id_sesion_raw != null && id_sesion_num > 0) ||
      to_num(row.nro_sesion) > 0;
    if (!has_sesion) continue;
    const horas = to_num(row.horas_honorarios_instructor);
    const tarifa = to_num(row.tarifa_hora_honorarios);
    const honorarios =
      to_num(row.costo_honorarios_instructor) ||
      Math.round(horas * tarifa * 100) / 100;
    result.push({
      nroSesion: to_num(row.nro_sesion) || null,
      fecha: to_str(row.fecha),
      horaInicio: to_str(row.hora_inicio),
      horaFin: to_str(row.hora_fin),
      costoImpresionMaterial: to_num(row.costo_impresion_material),
      costoLogisticaComida: to_num(row.costo_logistica_comida),
      costoTraslado: to_num(row.costo_traslado),
      trasladoExterno: to_num(row.traslado_externo),
      costoPop: to_num(row.costo_pop),
      costoOtros: to_num(row.costo_otros),
      horasHonorariosInstructor: horas,
      tarifaHoraHonorarios: tarifa,
      costoHonorariosInstructor: honorarios,
      popIncluido: Boolean(row.pop_incluido),
      costoCarnetizacion: to_num(row.costo_carnetizacion),
      costoDiasEspecialista: to_num(row.costo_dias_especialista),
      costoHospedaje: to_num(row.costo_hospedaje),
      costoBateria: to_num(row.costo_bateria),
      diasLogisticaFacilitador: to_num(row.dias_logistica_facilitador),
      diasHospedajeFacilitador: to_num(row.dias_hospedaje_facilitador),
      stDiasCampo: to_num(row.st_dias_campo),
      stDiasInforme: to_num(row.st_dias_informe),
      stDiasRevision: to_num(row.st_dias_revision),
      stAnalistas: to_num(row.st_analistas),
      stOtrosTexto:
        typeof row.st_otros_texto === "string" ? row.st_otros_texto : null,
      stSeguimientoGarantia:
        typeof row.st_seguimiento_garantia === "string"
          ? row.st_seguimiento_garantia
          : null,
      stLogisticaRecursos: to_num(row.st_logistica_recursos),
      stEnvioFactura: to_num(row.st_envio_factura),
      stEnvioMateriales: to_num(row.st_envio_materiales),
      stTraslados: parse_st_traslados_json(row.st_traslados),
      impresionMaterialIncluida: row.impresion_material_incluida !== false,
      bateriaIncluida: row.bateria_incluida !== false,
      incluyeRefrigerio: Boolean(row.incluye_refrigerio),
    });
  }
  return result;
}

function split_empresa_sede(
  nombre_empresa: string | null,
  sede: string | null,
): { nombreEmpresa: string | null; sede: string | null } {
  const sede_trim = sede?.trim() || null;
  const nombre = nombre_empresa?.trim() || null;
  if (!nombre) {
    return { nombreEmpresa: null, sede: sede_trim };
  }
  if (!sede_trim) {
    return { nombreEmpresa: nombre, sede: null };
  }
  const suffix = `  ${sede_trim}`;
  if (nombre.endsWith(suffix)) {
    return {
      nombreEmpresa: nombre.slice(0, -suffix.length).trim() || nombre,
      sede: sede_trim,
    };
  }
  if (nombre.endsWith(sede_trim)) {
    return {
      nombreEmpresa: nombre.slice(0, -sede_trim.length).trim() || nombre,
      sede: sede_trim,
    };
  }
  return { nombreEmpresa: nombre, sede: sede_trim };
}

function build_detalle_servicio(params: {
  participantes: number;
  sesiones: number;
  horasTotales: number;
  certificado: boolean;
  carnet: boolean;
}): string {
  const participantes = Math.max(0, params.participantes);
  const sesiones = Math.max(1, params.sesiones);
  const horas_totales = Math.max(0, params.horasTotales);
  const horas_por_sesion =
    sesiones > 0 ? Math.round((horas_totales / sesiones) * 100) / 100 : 0;
  const certificado_txt = params.certificado ? "incluye" : "no incluye";
  const carnet_txt = params.carnet ? "incluye" : "no incluye";
  return (
    `Para un grupo de hasta ${participantes} participantes en ${sesiones} ` +
    `sesiones de ${horas_totales} horas academicas, ${horas_por_sesion} horas ` +
    `academicas c/u. ${certificado_txt} certificado y ${carnet_txt} carnet en ` +
    "formato digital e impreso."
  );
}

function resolve_is_capacitacion(view_row: GenericRow): boolean {
  const tipo = String(view_row.tipo_servicio ?? "").toLowerCase();
  if (
    tipo.includes("tecnico") ||
    tipo.includes("servicio tecnico") ||
    tipo.includes("servicios tecnico")
  ) {
    return false;
  }
  if (
    to_num(view_row.st_dias_campo) > 0 ||
    to_num(view_row.st_analistas) > 0 ||
    to_num(view_row.cantidad_dias_campo) > 0
  ) {
    return false;
  }
  return (
    tipo.includes("capacitacion") ||
    tipo.includes("curso") ||
    tipo.includes("diplomado") ||
    tipo === ""
  );
}

/** Canonical OSI preview payload builder (SGestion + Shell). */
export function build_osi_preview_data(input: BuildOsiPreviewInput): OsiPreviewData {
  const view_row = input.view_row;
  const osi_base_row = input.osi_base_row ?? null;
  const ecc_children = input.ecc_children ?? [];
  const servicio_nombre_by_id = input.servicio_nombre_by_id ?? {};
  const public_cost_mask = input.public_cost_mask ?? {};
  const can_see_private_costs = input.can_see_private_costs !== false;
  const can_reveal_st_monetary = input.can_reveal_st_monetary === true;
  const st_monetary_public_view = input.st_monetary_public_view !== false;

  const is_capacitacion = resolve_is_capacitacion(view_row);
  const recursos_persistidos = osi_recursos_were_persisted(view_row);
  const hide_st_monetary =
    !is_capacitacion &&
    (!can_reveal_st_monetary || st_monetary_public_view);
  const st_servicios_preview = is_capacitacion
    ? []
    : build_osi_st_servicio_lines({
        view_row,
        children: ecc_children,
        servicio_nombre_by_id,
        fallback_servicio_nombre: to_str(view_row.servicio),
      });

  const certificado_impreso = Boolean(view_row.certificado_impreso);
  const carnet_impreso = Boolean(view_row.carnet_impreso);
  const participantes_contrato = to_num(view_row.participantes_max_solped);
  const sesiones_contrato = to_num(view_row.sesiones_solped);
  const horas_contrato = to_num(view_row.horas_academicas_solped);

  const participantes = resolve_osi_participantes_count(
    view_row,
    participantes_contrato,
  );
  const sesiones = resolve_osi_sesiones_count(view_row, sesiones_contrato);
  const horas_totales = resolve_osi_horas_count(view_row, horas_contrato);

  const detalle_servicio = build_detalle_servicio({
    participantes,
    sesiones,
    horasTotales: horas_totales,
    certificado: certificado_impreso,
    carnet: carnet_impreso,
  });
  const detalle_contrato = build_detalle_servicio({
    participantes: participantes_contrato,
    sesiones: sesiones_contrato,
    horasTotales: horas_contrato,
    certificado: certificado_impreso,
    carnet: carnet_impreso,
  });

  const sesiones_programadas_exec = to_sessions(view_row.sesiones_programadas);
  const sesiones_fecha_sugerida = sesiones_programadas_exec;
  const sesiones_target_count = Math.max(
    sesiones,
    sesiones_contrato,
    sesiones_programadas_exec.length,
  );

  const osi_sesiones_rows = Array.isArray(input.osi_sesiones)
    ? input.osi_sesiones
    : [];
  let sesiones_fecha_planificada = pad_osi_session_slots(
    sesiones_programadas_exec,
    sesiones_target_count,
  );
  if (osi_sesiones_rows.length > 0) {
    sesiones_fecha_planificada = sesiones_fecha_planificada.map((slot, index) => {
      const db_row = osi_sesiones_rows[index];
      if (!db_row || typeof db_row !== "object") return slot;
      const fecha_db =
        typeof db_row.fecha === "string" ? db_row.fecha.trim() : "";
      return {
        fecha: fecha_db || slot.fecha,
        hora_inicio:
          typeof db_row.hora_inicio === "string"
            ? db_row.hora_inicio
            : slot.hora_inicio,
        hora_fin: slot.hora_fin ?? null,
      };
    });
  }

  const sesiones_fecha_ejecutada: ReturnType<typeof to_sessions> =
    osi_sesiones_rows.map((row) => ({
      fecha:
        typeof row.fecha_ejecutada === "string" ? row.fecha_ejecutada : "",
      hora_inicio:
        typeof row.hora_ejecutada === "string" ? row.hora_ejecutada : null,
      hora_fin: null,
    }));
  const sesiones_exec_st = is_capacitacion
    ? sesiones_programadas_exec
    : sesiones_programadas_exec.slice(0, 1);
  const sesiones_exec_normalizadas = pad_osi_session_slots(
    sesiones_exec_st,
    is_capacitacion ? sesiones_target_count : 1,
  );
  const sesiones_contrato_normalizadas = pad_osi_session_slots(
    [],
    sesiones_contrato,
  );

  const direccion_contrato = to_str(view_row.direccion_ejecucion) ?? "";
  const direccion_real = to_str(view_row.direccion_ejecucion_real);
  const direccion_ejecucion = direccion_real ?? direccion_contrato;
  const id_dir_contrato = to_num(view_row.id_direccion_ejecucion_solped);
  const id_dir_real = to_num(view_row.id_direccion_ejecucion_real);

  const has_operational_changes =
    participantes !== participantes_contrato ||
    sesiones !== sesiones_contrato ||
    horas_totales !== horas_contrato ||
    direccion_ejecucion.trim() !== direccion_contrato.trim() ||
    JSON.stringify(sesiones_exec_normalizadas) !==
      JSON.stringify(sesiones_contrato_normalizadas);

  const preview_highlights = has_operational_changes
    ? {
        participantes: participantes !== participantes_contrato,
        detalle: detalle_servicio !== detalle_contrato,
        direccionEjecucion:
          (id_dir_real > 0 && id_dir_contrato > 0 && id_dir_real !== id_dir_contrato) ||
          direccion_ejecucion.trim() !== direccion_contrato.trim(),
        fechaServicio:
          JSON.stringify(sesiones_exec_normalizadas) !==
          JSON.stringify(sesiones_contrato_normalizadas),
      }
    : undefined;

  const fecha_documento = to_str(view_row.fecha_emision)
    ? format_date_for_doc(view_row.fecha_emision)
    : format_date_for_doc(new Date().toISOString());

  const dias_logistica = (() => {
    const stored = to_num(view_row.dias_logistica_facilitador);
    if (stored > 0) return stored;
    if (!is_capacitacion) {
      if (recursos_persistidos) return 0;
      return resolve_osi_st_engineering_value(
        view_row.st_dias_campo,
        view_row.cantidad_dias_campo,
        false,
      );
    }
    return 0;
  })();

  const dias_hospedaje = (() => {
    const stored = to_num(view_row.dias_hospedaje_facilitador);
    if (stored > 0) return stored;
    if (!is_capacitacion) {
      if (recursos_persistidos) return 0;
      return resolve_osi_st_engineering_value(
        view_row.st_dias_campo,
        view_row.cantidad_dias_campo,
        false,
      );
    }
    return 0;
  })();

  const st_traslados = parse_st_traslados_json(view_row.st_traslados);
  const id_trato = to_num(view_row.id_trato);
  const id_solped =
    to_num(view_row.id_ecc_origen) || to_num(view_row.id_ecc_actual);
  const entrega_raw = to_str(view_row.entrega_certificado);
  const entrega_certificado =
    entrega_raw === "retira_cliente" || entrega_raw === "se_envia"
      ? entrega_raw
      : null;
  const empresa_sede = split_empresa_sede(
    to_str(view_row.nombre_empresa),
    to_str(view_row.sede),
  );
  const fecha_sugerida = to_str(view_row.fecha_emision)
    ? format_date_for_doc(view_row.fecha_emision)
    : fecha_documento;

  const st_default_garantia_dias =
    Number.isFinite(input.st_default_garantia_dias) &&
    Number(input.st_default_garantia_dias) > 0
      ? Math.round(Number(input.st_default_garantia_dias))
      : 15;
  const st_garantia_display = resolve_osi_st_garantia_display(
    to_str(view_row.st_seguimiento_garantia),
    st_default_garantia_dias,
  );
  const reunion_pre_proyecto = resolve_st_fecha_reunion_pre_proyecto(
    to_str(view_row.fecha_inicio_real),
    sesiones_programadas_exec,
  );
  const reunion_pre_inicio_hora = resolve_st_hora_reunion_pre_inicio(
    to_str(view_row.hora_inicio_servicio),
    sesiones_programadas_exec,
  );
  const st_fechas_planificadas = build_st_fechas_servicio({
    reunion_iso: reunion_pre_proyecto,
    reunion_hora: reunion_pre_inicio_hora,
  });
  const st_servicio_ejecutado =
    to_num(view_row.id_estatus) === OSI_PREVIEW_ESTATUS.EJECUTADO;
  const st_fechas_ejecutadas = st_servicio_ejecutado
    ? build_st_fechas_servicio({
        reunion_iso: reunion_pre_proyecto,
        reunion_hora: reunion_pre_inicio_hora,
      })
    : build_st_fechas_ejecutadas_vacias();

  return {
    nroOsi: formatOsiSecuencialNro(view_row.nro_osi),
    nroTrato: id_trato > 0 ? String(id_trato) : null,
    nroSolped: id_solped > 0 ? String(id_solped) : null,
    fechaEmisionPresupuesto: to_str(view_row.fecha_emision_presupuesto),
    nroPresupuesto: to_text(view_row.nro_presupuesto),
    nroOrdenCompra: (() => {
      const raw = String(view_row.nro_orden_compra ?? "").trim();
      return raw && raw !== "—" && raw !== "-" ? raw : "N/A";
    })(),
    codigoCliente: to_text(view_row.id_empresa) ?? to_text(view_row.codigo_cliente),
    fechaDocumento: fecha_documento,
    fechaSugerida: fecha_sugerida,
    fechaPlanificada: null,
    sesionesFechaSugerida: sesiones_fecha_sugerida,
    sesionesFechaPlanificada: sesiones_fecha_planificada,
    sesionesFechaEjecutada: sesiones_fecha_ejecutada,
    revisionDocumento: "1",
    detalleServicio: detalle_servicio,
    servicio: to_str(view_row.servicio),
    tipoServicio: to_str(view_row.tipo_servicio),
    nombreEmpresa: empresa_sede.nombreEmpresa,
    sede: empresa_sede.sede,
    clienteRif: to_str(view_row.cliente_rif),
    direccionFiscal: to_str(view_row.direccion_fiscal),
    personaContacto: to_str(view_row.persona_contacto),
    contactoTelefono: to_str(view_row.contacto_telefono),
    contactoEmail: to_str(view_row.contacto_email),
    direccionEjecucion: direccion_ejecucion,
    direccionEnvio: to_str(view_row.direccion_envio),
    ejecutivoNegocios: to_str(view_row.ejecutivo_negocios),
    responsableRecepcion: to_str(view_row.responsable_recepcion),
    fechaInicioReal: to_str(view_row.fecha_inicio_real),
    fechaFinReal: to_str(view_row.fecha_fin_real),
    horaInicioServicio: to_str(view_row.hora_inicio_servicio),
    sesionesProgramadas: sesiones_exec_normalizadas,
    participantesMaxSolped: to_num(view_row.participantes_max_solped) || null,
    horasAcademicasSolped: to_num(view_row.horas_academicas_solped) || null,
    sesionesSolped: resolve_osi_sesiones_documento_count({
      sesiones_solped: sesiones_contrato,
      sesiones_programadas: sesiones_exec_normalizadas,
      sesiones_ejecucion: view_row.sesiones_ejecucion,
    }),
    participantesDocumento: participantes,
    previewHighlights: preview_highlights,
    pretensionesTotales: to_str(view_row.pretensiones_totales),
    observacionesTotales: to_str(view_row.observaciones_totales),
    pretensionesSolped: to_str(view_row.pretenciones_cliente),
    pretensionesOsi: null,
    observacionesSolped: to_str(view_row.observaciones_cliente),
    observacionesOsiSolicitud: extract_osi_solicitud_observacion_text(
      to_str(osi_base_row?.observaciones_adicionales_osi),
    ) || null,
    observacionesOsi: to_str(
      osi_base_row?.pretenciones_adicionales_osi ??
        view_row.pretenciones_adicionales_osi,
    ),
    costoImpresionMaterial: to_num(view_row.costo_impresion_material),
    costoLogisticaComida: to_num(view_row.costo_logistica_comida),
    costoTraslado: to_num(view_row.costo_traslado),
    trasladoExterno: to_num(view_row.traslado_externo),
    costoPop: to_num(view_row.costo_pop),
    costoOtros: to_num(view_row.costo_otros),
    horasHonorariosInstructor: to_num(view_row.horas_honorarios_instructor),
    diasLogisticaFacilitador: dias_logistica > 0 ? dias_logistica : undefined,
    diasHospedajeFacilitador: dias_hospedaje > 0 ? dias_hospedaje : undefined,
    tarifaHoraHonorarios: to_num(view_row.tarifa_hora_honorarios),
    costoHonorariosInstructor: to_num(view_row.costo_honorarios_instructor),
    popIncluido: Boolean(view_row.pop_incluido),
    costoCarnetizacion: to_num(view_row.costo_carnetizacion),
    costoDiasEspecialista: to_num(view_row.costo_dias_especialista),
    costoHospedaje: to_num(view_row.costo_hospedaje),
    costoBateria: to_num(view_row.costo_bateria),
    certificadoImpreso: certificado_impreso,
    carnetImpreso: carnet_impreso,
    incluyeRefrigerio: Boolean(view_row.incluye_refrigerio),
    entregaCertificado: entrega_certificado,
    audiovisuales: Boolean(view_row.requiere_audiovisuales),
    isCapacitacion: is_capacitacion,
    stServicios: st_servicios_preview,
    stDiasCampo: resolve_osi_st_engineering_value(
      view_row.st_dias_campo,
      view_row.cantidad_dias_campo,
      recursos_persistidos,
    ),
    stDiasInforme: resolve_osi_st_engineering_value(
      view_row.st_dias_informe,
      view_row.cantidad_dias_informe,
      recursos_persistidos,
    ),
    stDiasRevision: resolve_osi_st_engineering_value(
      view_row.st_dias_revision,
      view_row.cantidad_dias_revision_interna,
      recursos_persistidos,
    ),
    stAnalistas: resolve_osi_st_engineering_value(
      view_row.st_analistas,
      view_row.cantidad_analistas,
      recursos_persistidos,
    ),
    stOtrosTexto: to_str(view_row.st_otros_texto) || null,
    stSeguimientoGarantia: st_garantia_display,
    stFechasPlanificadas: is_capacitacion ? undefined : st_fechas_planificadas,
    stFechasEjecutadas: is_capacitacion ? undefined : st_fechas_ejecutadas,
    stServicioEjecutado: is_capacitacion ? undefined : st_servicio_ejecutado,
    stLogisticaRecursos: recursos_persistidos
      ? to_num(view_row.st_logistica_recursos)
      : to_num(view_row.st_logistica_recursos) ||
        to_num(view_row.st_analistas) ||
        to_num(view_row.cantidad_analistas),
    stEnvioFactura: to_num(view_row.st_envio_factura),
    stEnvioMateriales: to_num(view_row.st_envio_materiales),
    stTraslados: st_traslados,
    impresionMaterialIncluida: view_row.impresion_material_incluida !== false,
    bateriaIncluida: view_row.bateria_incluida !== false,
    desgloseRecursosSesiones: map_desglose_recursos_sesiones(
      view_row.desglose_recursos_sesiones,
    ),
    publicCostMask: public_cost_mask,
    isPublicView: !can_see_private_costs,
    hideStMonetary: hide_st_monetary,
    showCierreSection: resolve_show_cierre_section(
      view_row.id_estatus,
      input.cap_cierre_certificados_step_completed,
    ),
    estatusOsiLabel: resolve_osi_estatus_document_label(
      view_row.id_estatus,
      view_row.nombre_estado ?? view_row.estatus_nombre,
    ),
  };
}
