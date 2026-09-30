import type {
  OsiPreviewData,
  OsiRecursosSesionPreview,
} from "./osi-preview-data";
import { compute_st_recursos_totals } from "./st-recursos-types";

export type OsiRecursosGroupKey =
  | "honorarios"
  | "impresion"
  | "traslado"
  | "traslado_externo"
  | "logistica"
  | "hospedaje"
  | "otros"
  | "pop"
  | "st_dias"
  | "st_envios"
  | "st_traslados"
  | "st_impresion_flag"
  | "st_bateria_flag";

export type OsiRecursosCostSlice = {
  label: string | null;
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
  diasLogisticaFacilitador: number;
  diasHospedajeFacilitador: number;
  stDiasCampo: number;
  stDiasInforme: number;
  stDiasRevision: number;
  stAnalistas: number;
  stOtrosTexto: string | null;
  stSeguimientoGarantia: string | null;
  stLogisticaRecursos: number;
  stEnvioFactura: number;
  stEnvioMateriales: number;
  stTraslados: NonNullable<OsiPreviewData["stTraslados"]>;
  impresionMaterialIncluida: boolean;
  bateriaIncluida: boolean;
  certificadoImpreso: boolean;
  carnetImpreso: boolean;
  incluyeRefrigerio: boolean;
  entregaCertificado: "retira_cliente" | "se_envia" | null;
};

export type OsiBadgeTone = "base" | "up" | "down";

export type OsiVariacionCelda = {
  texto: string;
  /** Value used to compare against the baseline (mode). */
  valorComparacion: number | null;
  tone: OsiBadgeTone;
};

export type OsiVariacionColumnaKey = OsiRecursosGroupKey | "sesion" | "total_sesion";

export type OsiVariacionColumna = {
  key: OsiVariacionColumnaKey;
  label: string;
};

export type OsiRecursosVariacionSesion = {
  nroSesion: number | null;
  fecha: string | null;
  celdas: Partial<Record<Exclude<OsiVariacionColumnaKey, "sesion">, OsiVariacionCelda>>;
};

export type OsiVariacionTotalesFila = Partial<
  Record<Exclude<OsiVariacionColumnaKey, "sesion">, number>
>;

/** OSI-level money totals (always summed across sessions). */
export type OsiRecursosTotales = {
  honorarios: number;
  impresion: number;
  traslado: number;
  traslado_externo: number;
  logistica: number;
  hospedaje: number;
  otros: number;
  st_envios: number;
  st_traslados: number;
};

export type OsiRecursosLayout = {
  /** Single OSI consolidated block (common fields summed). */
  consolidado: OsiRecursosCostSlice;
  /** Groups excluded from consolidado because they differ by session. */
  omitidos: Set<OsiRecursosGroupKey>;
  /** Compact per-session differentials for omitted groups. */
  variaciones: OsiRecursosVariacionSesion[];
  /** Column headers for the variaciones table (aligned micro-columns). */
  variacionColumnas: OsiVariacionColumna[];
  /** Footer totals that must match the upper resumen. */
  variacionTotales: OsiVariacionTotalesFila;
  /** True when layout comes from multi-session desglose. */
  esPorSesion: boolean;
  /** Totals usable when a group is segmentado. */
  totales: OsiRecursosTotales;
};

const MONEY_EPS = 0.005;

function money_eq(a: number, b: number): boolean {
  return Math.abs(a - b) <= MONEY_EPS;
}

function nums_uniform(values: number[]): boolean {
  if (values.length <= 1) return true;
  const first = values[0] ?? 0;
  return values.every((v) => money_eq(v, first));
}

function bools_uniform(values: boolean[]): boolean {
  if (values.length <= 1) return true;
  const first = Boolean(values[0]);
  return values.every((v) => Boolean(v) === first);
}

function format_money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function traslados_signature(
  traslados: NonNullable<OsiPreviewData["stTraslados"]>,
): string {
  const sorted = [...traslados].sort((a, b) => a.tipo.localeCompare(b.tipo));
  return JSON.stringify(
    sorted.map((t) => ({
      tipo: t.tipo,
      cantidad: Number(t.cantidad) || 0,
      costo_unidad: Number(t.costo_unidad) || 0,
    })),
  );
}

function session_to_cost_slice(
  session: OsiRecursosSesionPreview,
  data: OsiPreviewData,
): OsiRecursosCostSlice {
  return {
    label: null,
    costoImpresionMaterial: session.costoImpresionMaterial,
    costoLogisticaComida: session.costoLogisticaComida,
    costoTraslado: session.costoTraslado,
    trasladoExterno: session.trasladoExterno,
    costoPop: session.costoPop,
    costoOtros: session.costoOtros,
    horasHonorariosInstructor: session.horasHonorariosInstructor,
    tarifaHoraHonorarios: session.tarifaHoraHonorarios,
    costoHonorariosInstructor: session.costoHonorariosInstructor,
    popIncluido: session.popIncluido,
    costoCarnetizacion: session.costoCarnetizacion,
    costoDiasEspecialista: session.costoDiasEspecialista,
    costoHospedaje: session.costoHospedaje,
    costoBateria: session.costoBateria,
    diasLogisticaFacilitador: session.diasLogisticaFacilitador ?? 0,
    diasHospedajeFacilitador: session.diasHospedajeFacilitador ?? 0,
    stDiasCampo: session.stDiasCampo ?? 0,
    stDiasInforme: session.stDiasInforme ?? 0,
    stDiasRevision: session.stDiasRevision ?? 0,
    stAnalistas: session.stAnalistas ?? 0,
    stOtrosTexto: session.stOtrosTexto ?? null,
    stSeguimientoGarantia: session.stSeguimientoGarantia ?? null,
    stLogisticaRecursos:
      session.stLogisticaRecursos ?? session.stAnalistas ?? 0,
    stEnvioFactura: session.stEnvioFactura ?? 0,
    stEnvioMateriales: session.stEnvioMateriales ?? 0,
    stTraslados: session.stTraslados ?? [],
    impresionMaterialIncluida: session.impresionMaterialIncluida !== false,
    bateriaIncluida: session.bateriaIncluida !== false,
    certificadoImpreso: data.certificadoImpreso,
    carnetImpreso: data.carnetImpreso,
    incluyeRefrigerio: Boolean(data.incluyeRefrigerio),
    entregaCertificado: data.entregaCertificado ?? null,
  };
}

function global_to_cost_slice(data: OsiPreviewData): OsiRecursosCostSlice {
  return {
    label: null,
    costoImpresionMaterial: data.costoImpresionMaterial,
    costoLogisticaComida: data.costoLogisticaComida,
    costoTraslado: data.costoTraslado,
    trasladoExterno: data.trasladoExterno,
    costoPop: data.costoPop,
    costoOtros: data.costoOtros,
    horasHonorariosInstructor: data.horasHonorariosInstructor,
    tarifaHoraHonorarios: data.tarifaHoraHonorarios,
    costoHonorariosInstructor: data.costoHonorariosInstructor,
    popIncluido: data.popIncluido,
    costoCarnetizacion: data.costoCarnetizacion,
    costoDiasEspecialista: data.costoDiasEspecialista,
    costoHospedaje: data.costoHospedaje,
    costoBateria: data.costoBateria,
    diasLogisticaFacilitador: data.diasLogisticaFacilitador ?? 0,
    diasHospedajeFacilitador: data.diasHospedajeFacilitador ?? 0,
    stDiasCampo: data.stDiasCampo ?? 0,
    stDiasInforme: data.stDiasInforme ?? 0,
    stDiasRevision: data.stDiasRevision ?? 0,
    stAnalistas: data.stAnalistas ?? 0,
    stOtrosTexto: data.stOtrosTexto ?? null,
    stSeguimientoGarantia: data.stSeguimientoGarantia ?? null,
    stLogisticaRecursos: data.stLogisticaRecursos ?? data.stAnalistas ?? 0,
    stEnvioFactura: data.stEnvioFactura ?? 0,
    stEnvioMateriales: data.stEnvioMateriales ?? 0,
    stTraslados: data.stTraslados ?? [],
    impresionMaterialIncluida: data.impresionMaterialIncluida !== false,
    bateriaIncluida: data.bateriaIncluida !== false,
    certificadoImpreso: data.certificadoImpreso,
    carnetImpreso: data.carnetImpreso,
    incluyeRefrigerio: Boolean(data.incluyeRefrigerio),
    entregaCertificado: data.entregaCertificado ?? null,
  };
}

function detect_omitidos(
  slices: OsiRecursosCostSlice[],
): Set<OsiRecursosGroupKey> {
  const omitidos = new Set<OsiRecursosGroupKey>();
  if (slices.length <= 1) return omitidos;

  if (
    !nums_uniform(slices.map((s) => s.horasHonorariosInstructor)) ||
    !nums_uniform(slices.map((s) => s.tarifaHoraHonorarios)) ||
    !nums_uniform(slices.map((s) => s.costoHonorariosInstructor))
  ) {
    omitidos.add("honorarios");
  }
  if (!nums_uniform(slices.map((s) => s.costoImpresionMaterial))) {
    omitidos.add("impresion");
  }
  if (!nums_uniform(slices.map((s) => s.costoTraslado))) {
    omitidos.add("traslado");
  }
  if (!nums_uniform(slices.map((s) => s.trasladoExterno))) {
    omitidos.add("traslado_externo");
  }
  if (
    !nums_uniform(slices.map((s) => s.diasLogisticaFacilitador)) ||
    !nums_uniform(slices.map((s) => s.costoLogisticaComida)) ||
    !nums_uniform(slices.map((s) => s.stLogisticaRecursos))
  ) {
    omitidos.add("logistica");
  }
  if (
    !nums_uniform(slices.map((s) => s.diasHospedajeFacilitador)) ||
    !nums_uniform(slices.map((s) => s.costoHospedaje))
  ) {
    omitidos.add("hospedaje");
  }
  if (!nums_uniform(slices.map((s) => s.costoOtros))) {
    omitidos.add("otros");
  }
  if (!bools_uniform(slices.map((s) => s.popIncluido))) {
    omitidos.add("pop");
  }
  if (
    !nums_uniform(slices.map((s) => s.stDiasCampo)) ||
    !nums_uniform(slices.map((s) => s.stDiasInforme)) ||
    !nums_uniform(slices.map((s) => s.stDiasRevision)) ||
    !nums_uniform(slices.map((s) => s.stAnalistas))
  ) {
    omitidos.add("st_dias");
  }
  if (
    !nums_uniform(slices.map((s) => s.stEnvioFactura)) ||
    !nums_uniform(slices.map((s) => s.stEnvioMateriales))
  ) {
    omitidos.add("st_envios");
  }
  const first_traslado_sig = traslados_signature(slices[0]!.stTraslados);
  if (
    !slices.every(
      (s) => traslados_signature(s.stTraslados) === first_traslado_sig,
    )
  ) {
    omitidos.add("st_traslados");
  }
  if (!bools_uniform(slices.map((s) => s.impresionMaterialIncluida))) {
    omitidos.add("st_impresion_flag");
  }
  if (!bools_uniform(slices.map((s) => s.bateriaIncluida))) {
    omitidos.add("st_bateria_flag");
  }

  return omitidos;
}

function sum_slices(
  slices: OsiRecursosCostSlice[],
  data: OsiPreviewData,
  omitidos: Set<OsiRecursosGroupKey>,
): OsiRecursosCostSlice {
  const first = slices[0]!;
  const sum = (picker: (s: OsiRecursosCostSlice) => number) =>
    slices.reduce((acc, s) => acc + picker(s), 0);

  const consolidado: OsiRecursosCostSlice = {
    label: null,
    // Money totals always kept; detail rates/days cleared when segmentado.
    costoImpresionMaterial: sum((s) => s.costoImpresionMaterial),
    costoLogisticaComida: omitidos.has("logistica")
      ? 0
      : first.costoLogisticaComida,
    costoTraslado: sum((s) => s.costoTraslado),
    trasladoExterno: sum((s) => s.trasladoExterno),
    costoPop: sum((s) => s.costoPop),
    costoOtros: sum((s) => s.costoOtros),
    horasHonorariosInstructor: omitidos.has("honorarios")
      ? 0
      : sum((s) => s.horasHonorariosInstructor),
    tarifaHoraHonorarios: omitidos.has("honorarios")
      ? 0
      : first.tarifaHoraHonorarios,
    costoHonorariosInstructor: sum((s) => s.costoHonorariosInstructor),
    popIncluido: omitidos.has("pop") ? false : first.popIncluido,
    costoCarnetizacion: sum((s) => s.costoCarnetizacion),
    costoDiasEspecialista: sum((s) => s.costoDiasEspecialista),
    costoHospedaje: omitidos.has("hospedaje") ? 0 : first.costoHospedaje,
    costoBateria: sum((s) => s.costoBateria),
    diasLogisticaFacilitador: omitidos.has("logistica")
      ? 0
      : sum((s) => s.diasLogisticaFacilitador),
    diasHospedajeFacilitador: omitidos.has("hospedaje")
      ? 0
      : sum((s) => s.diasHospedajeFacilitador),
    stDiasCampo: omitidos.has("st_dias")
      ? 0
      : sum((s) => s.stDiasCampo),
    stDiasInforme: omitidos.has("st_dias")
      ? 0
      : sum((s) => s.stDiasInforme),
    stDiasRevision: omitidos.has("st_dias")
      ? 0
      : sum((s) => s.stDiasRevision),
    stAnalistas: omitidos.has("st_dias") ? 0 : first.stAnalistas,
    stOtrosTexto: first.stOtrosTexto,
    stSeguimientoGarantia: first.stSeguimientoGarantia,
    stLogisticaRecursos: omitidos.has("logistica")
      ? 0
      : first.stLogisticaRecursos,
    stEnvioFactura: sum((s) => s.stEnvioFactura),
    stEnvioMateriales: sum((s) => s.stEnvioMateriales),
    stTraslados: omitidos.has("st_traslados")
      ? []
      : first.stTraslados.map((t) => ({
          ...t,
          cantidad: slices.reduce((acc, s) => {
            const match = s.stTraslados.find((x) => x.tipo === t.tipo);
            return acc + (match?.cantidad ?? 0);
          }, 0),
        })),
    impresionMaterialIncluida: omitidos.has("st_impresion_flag")
      ? false
      : first.impresionMaterialIncluida,
    bateriaIncluida: omitidos.has("st_bateria_flag")
      ? false
      : first.bateriaIncluida,
    certificadoImpreso: data.certificadoImpreso,
    carnetImpreso: data.carnetImpreso,
    incluyeRefrigerio: Boolean(data.incluyeRefrigerio),
    entregaCertificado: data.entregaCertificado ?? null,
  };

  return consolidado;
}

function compute_totales(
  slices: OsiRecursosCostSlice[],
  is_capacitacion: boolean,
): OsiRecursosTotales {
  const sum = (picker: (s: OsiRecursosCostSlice) => number) =>
    slices.reduce((acc, s) => acc + picker(s), 0);

  let logistica = 0;
  let hospedaje = 0;
  let st_traslados = 0;
  for (const s of slices) {
    if (is_capacitacion) {
      logistica += s.diasLogisticaFacilitador * s.costoLogisticaComida;
      hospedaje += s.diasHospedajeFacilitador * s.costoHospedaje;
    } else {
      const st = compute_st_recursos_totals({
        dias_hospedaje_facilitador: s.diasHospedajeFacilitador,
        costo_hospedaje: s.costoHospedaje,
        dias_logistica_facilitador: s.diasLogisticaFacilitador,
        costo_logistica_comida: s.costoLogisticaComida,
        st_logistica_recursos: s.stLogisticaRecursos,
        st_envio_factura: s.stEnvioFactura,
        st_envio_materiales: s.stEnvioMateriales,
        st_traslados: s.stTraslados,
      });
      logistica += st.total_logistica;
      hospedaje += st.total_hospedaje;
      st_traslados += st.costo_traslado + st.traslado_externo;
    }
  }

  return {
    honorarios: sum((s) => s.costoHonorariosInstructor),
    impresion: sum((s) => s.costoImpresionMaterial),
    traslado: sum((s) => s.costoTraslado),
    traslado_externo: sum((s) => s.trasladoExterno),
    logistica,
    hospedaje,
    otros: sum((s) => s.costoOtros),
    st_envios: sum((s) => s.stEnvioFactura + s.stEnvioMateriales),
    st_traslados,
  };
}

function tone_vs_base(value: number, base: number): OsiBadgeTone {
  if (money_eq(value, base)) return "base";
  return value > base ? "up" : "down";
}

function mode_number(values: number[], fallback: number): number {
  if (values.length === 0) return fallback;
  const counts = new Map<string, { n: number; v: number; first: number }>();
  values.forEach((v, idx) => {
    const key = v.toFixed(4);
    const prev = counts.get(key);
    if (prev) {
      prev.n += 1;
    } else {
      counts.set(key, { n: 1, v, first: idx });
    }
  });
  let best: { n: number; v: number; first: number } | null = null;
  for (const entry of counts.values()) {
    if (
      !best ||
      entry.n > best.n ||
      (entry.n === best.n && entry.first < best.first)
    ) {
      best = entry;
    }
  }
  return best?.v ?? fallback;
}

const GROUP_COLUMN_META: Array<{
  key: OsiRecursosGroupKey;
  label: string;
}> = [
  { key: "honorarios", label: "HONORARIOS FACILITADOR" },
  { key: "hospedaje", label: "HOSPEDAJE" },
  { key: "logistica", label: "LOGÍSTICA / COMIDA" },
  { key: "traslado", label: "TRASLADO URBANO" },
  { key: "traslado_externo", label: "TRASLADO EXTRAURBANO" },
  { key: "otros", label: "TRASLADO OTROS" },
  { key: "impresion", label: "IMPRESIÓN DE MATERIAL" },
  { key: "pop", label: "POP" },
  { key: "st_dias", label: "DÍAS CAMPO / INFORME / REVISIÓN" },
  { key: "st_envios", label: "ENVÍOS" },
  { key: "st_traslados", label: "TRASLADOS" },
  { key: "st_impresion_flag", label: "IMPRESIÓN (SÍ/NO)" },
  { key: "st_bateria_flag", label: "BATERÍA" },
];

function session_group_amount(
  slice: OsiRecursosCostSlice,
  key: OsiRecursosGroupKey,
  is_capacitacion: boolean,
): number {
  switch (key) {
    case "honorarios":
      return slice.costoHonorariosInstructor;
    case "impresion":
      return slice.costoImpresionMaterial;
    case "traslado":
      return slice.costoTraslado;
    case "traslado_externo":
      return slice.trasladoExterno;
    case "logistica":
      if (is_capacitacion) {
        return slice.diasLogisticaFacilitador * slice.costoLogisticaComida;
      }
      return compute_st_recursos_totals({
        dias_logistica_facilitador: slice.diasLogisticaFacilitador,
        costo_logistica_comida: slice.costoLogisticaComida,
        st_logistica_recursos: slice.stLogisticaRecursos,
        dias_hospedaje_facilitador: slice.diasHospedajeFacilitador,
        costo_hospedaje: slice.costoHospedaje,
        st_envio_factura: slice.stEnvioFactura,
        st_envio_materiales: slice.stEnvioMateriales,
        st_traslados: slice.stTraslados,
      }).total_logistica;
    case "hospedaje":
      if (is_capacitacion) {
        return slice.diasHospedajeFacilitador * slice.costoHospedaje;
      }
      return compute_st_recursos_totals({
        dias_hospedaje_facilitador: slice.diasHospedajeFacilitador,
        costo_hospedaje: slice.costoHospedaje,
        dias_logistica_facilitador: slice.diasLogisticaFacilitador,
        costo_logistica_comida: slice.costoLogisticaComida,
        st_logistica_recursos: slice.stLogisticaRecursos,
        st_envio_factura: slice.stEnvioFactura,
        st_envio_materiales: slice.stEnvioMateriales,
        st_traslados: slice.stTraslados,
      }).total_hospedaje;
    case "otros":
      return slice.costoOtros;
    case "st_envios":
      return slice.stEnvioFactura + slice.stEnvioMateriales;
    case "st_traslados": {
      const st = compute_st_recursos_totals({
        st_traslados: slice.stTraslados,
        dias_hospedaje_facilitador: 0,
        costo_hospedaje: 0,
        dias_logistica_facilitador: 0,
        costo_logistica_comida: 0,
        st_logistica_recursos: 0,
        st_envio_factura: 0,
        st_envio_materiales: 0,
      });
      return st.costo_traslado + st.traslado_externo;
    }
    default:
      return 0;
  }
}

function session_group_compare_value(
  slice: OsiRecursosCostSlice,
  key: OsiRecursosGroupKey,
  is_capacitacion: boolean,
): number | null {
  switch (key) {
    case "honorarios":
      return slice.tarifaHoraHonorarios;
    case "impresion":
    case "traslado":
    case "traslado_externo":
    case "otros":
    case "logistica":
    case "hospedaje":
    case "st_envios":
    case "st_traslados":
      return session_group_amount(slice, key, is_capacitacion);
    case "pop":
      return slice.popIncluido ? 1 : 0;
    case "st_impresion_flag":
      return slice.impresionMaterialIncluida ? 1 : 0;
    case "st_bateria_flag":
      return slice.bateriaIncluida ? 1 : 0;
    case "st_dias":
      return (
        slice.stDiasCampo * 10000 +
        slice.stDiasInforme * 100 +
        slice.stDiasRevision
      );
    default:
      return null;
  }
}

function session_group_texto(
  slice: OsiRecursosCostSlice,
  key: OsiRecursosGroupKey,
  is_capacitacion: boolean,
): string {
  switch (key) {
    case "honorarios": {
      const horas = slice.horasHonorariosInstructor;
      const tarifa = slice.tarifaHoraHonorarios;
      const total = slice.costoHonorariosInstructor;
      if (!(horas > 0 || tarifa > 0 || total > 0)) {
        return "N/A";
      }
      return `${horas}h × ${format_money(tarifa)}/h = ${format_money(total)}`;
    }
    case "impresion":
    case "traslado":
    case "traslado_externo":
    case "otros": {
      const amount = session_group_amount(slice, key, is_capacitacion);
      return amount > 0 ? format_money(amount) : "N/A";
    }
    case "logistica": {
      const dias = slice.diasLogisticaFacilitador;
      const unit = slice.costoLogisticaComida;
      const total = session_group_amount(slice, key, is_capacitacion);
      if (!(dias > 0 || unit > 0 || total > 0)) return "N/A";
      return `${dias}d · ${format_money(unit)}/d = ${format_money(total)}`;
    }
    case "hospedaje": {
      const dias = slice.diasHospedajeFacilitador;
      const unit = slice.costoHospedaje;
      const total = session_group_amount(slice, key, is_capacitacion);
      if (!(dias > 0 || unit > 0 || total > 0)) return "N/A";
      return `${dias}d · ${format_money(unit)}/d = ${format_money(total)}`;
    }
    case "pop":
      return slice.popIncluido ? "SÍ" : "NO";
    case "st_dias":
      return `C${slice.stDiasCampo} · I${slice.stDiasInforme} · R${slice.stDiasRevision}`;
    case "st_envios": {
      const total = session_group_amount(slice, key, is_capacitacion);
      return total > 0 ? format_money(total) : "N/A";
    }
    case "st_traslados": {
      const total = session_group_amount(slice, key, is_capacitacion);
      return total > 0 ? format_money(total) : "N/A";
    }
    case "st_impresion_flag":
      return slice.impresionMaterialIncluida ? "SÍ" : "NO";
    case "st_bateria_flag":
      return slice.bateriaIncluida ? "SÍ" : "NO";
    default:
      return "N/A";
  }
}

function session_full_cost_total(
  slice: OsiRecursosCostSlice,
  is_capacitacion: boolean,
): number {
  const logistica = session_group_amount(slice, "logistica", is_capacitacion);
  const hospedaje = session_group_amount(slice, "hospedaje", is_capacitacion);
  const st_envios = session_group_amount(slice, "st_envios", is_capacitacion);
  const st_traslados = session_group_amount(
    slice,
    "st_traslados",
    is_capacitacion,
  );
  return (
    slice.costoHonorariosInstructor +
    slice.costoImpresionMaterial +
    slice.costoTraslado +
    slice.trasladoExterno +
    logistica +
    hospedaje +
    slice.costoOtros +
    slice.costoPop +
    slice.costoCarnetizacion +
    slice.costoDiasEspecialista +
    slice.costoBateria +
    st_envios +
    (is_capacitacion ? 0 : st_traslados)
  );
}

function column_has_activity(
  slices: OsiRecursosCostSlice[],
  key: OsiRecursosGroupKey,
  is_capacitacion: boolean,
): boolean {
  for (const slice of slices) {
    if (key === "pop") {
      if (slice.popIncluido) return true;
      continue;
    }
    if (key === "st_impresion_flag" || key === "st_bateria_flag") {
      return true; // show if present in ST detail once other activity exists; skipped by allowlist
    }
    if (key === "st_dias") {
      if (
        slice.stDiasCampo > 0 ||
        slice.stDiasInforme > 0 ||
        slice.stDiasRevision > 0
      ) {
        return true;
      }
      continue;
    }
    if (session_group_amount(slice, key, is_capacitacion) > MONEY_EPS) {
      return true;
    }
  }
  return false;
}

function select_detail_group_keys(
  slices: OsiRecursosCostSlice[],
  omitidos: Set<OsiRecursosGroupKey>,
  is_capacitacion: boolean,
): OsiRecursosGroupKey[] {
  const allow = is_capacitacion
    ? ([
        "honorarios",
        "hospedaje",
        "logistica",
        "traslado",
        "traslado_externo",
        "otros",
        "impresion",
        "pop",
      ] as OsiRecursosGroupKey[])
    : ([
        "st_dias",
        "hospedaje",
        "logistica",
        "impresion",
        "st_traslados",
        "st_envios",
        "otros",
        "st_impresion_flag",
        "st_bateria_flag",
      ] as OsiRecursosGroupKey[]);

  return allow.filter(
    (key) =>
      omitidos.has(key) || column_has_activity(slices, key, is_capacitacion),
  );
}

function build_variacion_columnas(
  group_keys: OsiRecursosGroupKey[],
): OsiVariacionColumna[] {
  const cols: OsiVariacionColumna[] = [{ key: "sesion", label: "SESIÓN / FECHA" }];
  for (const meta of GROUP_COLUMN_META) {
    if (group_keys.includes(meta.key)) {
      cols.push({ key: meta.key, label: meta.label });
    }
  }
  cols.push({ key: "total_sesion", label: "TOTAL SESIÓN" });
  return cols;
}

function build_variaciones(
  sessions: OsiRecursosSesionPreview[],
  slices: OsiRecursosCostSlice[],
  omitidos: Set<OsiRecursosGroupKey>,
  is_capacitacion: boolean,
): {
  variaciones: OsiRecursosVariacionSesion[];
  variacionColumnas: OsiVariacionColumna[];
  variacionTotales: OsiVariacionTotalesFila;
} {
  if (slices.length === 0) {
    return {
      variaciones: [],
      variacionColumnas: [],
      variacionTotales: {},
    };
  }

  const group_keys = select_detail_group_keys(
    slices,
    omitidos,
    is_capacitacion,
  );
  const variacionColumnas = build_variacion_columnas(group_keys);

  const baselines = new Map<OsiRecursosGroupKey, number>();
  for (const key of group_keys) {
    const values = slices
      .map((s) => session_group_compare_value(s, key, is_capacitacion))
      .filter((v): v is number => v != null);
    baselines.set(key, mode_number(values, values[0] ?? 0));
  }

  const totales_sesion = slices.map((slice) =>
    session_full_cost_total(slice, is_capacitacion),
  );

  const variaciones: OsiRecursosVariacionSesion[] = slices.map(
    (slice, index) => {
      const session = sessions[index];
      const celdas: OsiRecursosVariacionSesion["celdas"] = {};
      for (const key of group_keys) {
        const compare = session_group_compare_value(
          slice,
          key,
          is_capacitacion,
        );
        const base = baselines.get(key) ?? 0;
        const texto = session_group_texto(slice, key, is_capacitacion);
        // Badge only when the group actually varies across sessions.
        const tone =
          !omitidos.has(key) ||
          compare == null ||
          texto === "N/A"
            ? "base"
            : tone_vs_base(compare, base);
        celdas[key] = {
          texto,
          valorComparacion: compare,
          tone,
        };
      }
      const total = totales_sesion[index] ?? 0;
      celdas.total_sesion = {
        texto: total > 0 ? format_money(total) : "N/A",
        valorComparacion: total,
        tone: "base",
      };
      return {
        nroSesion: session?.nroSesion ?? index + 1,
        fecha: session?.fecha ?? null,
        celdas,
      };
    },
  );

  const variacionTotales: OsiVariacionTotalesFila = {};
  for (const key of group_keys) {
    if (
      key === "pop" ||
      key === "st_dias" ||
      key === "st_impresion_flag" ||
      key === "st_bateria_flag"
    ) {
      continue;
    }
    variacionTotales[key] = slices.reduce(
      (acc, s) => acc + session_group_amount(s, key, is_capacitacion),
      0,
    );
  }
  variacionTotales.total_sesion = totales_sesion.reduce((a, b) => a + b, 0);

  return { variaciones, variacionColumnas, variacionTotales };
}

/**
 * Build consolidated OSI resources + compact per-session differentials.
 * Uniform fields are summed into one block; differing groups are omitted
 * from the consolidado and listed under "Ajustes / Variaciones por Sesión".
 */
export function build_osi_recursos_layout(
  data: OsiPreviewData,
): OsiRecursosLayout {
  const desglose = data.desgloseRecursosSesiones ?? [];
  if (desglose.length === 0) {
    const consolidado = global_to_cost_slice(data);
    return {
      consolidado,
      omitidos: new Set(),
      variaciones: [],
      variacionColumnas: [],
      variacionTotales: {},
      esPorSesion: false,
      totales: {
        honorarios: consolidado.costoHonorariosInstructor,
        impresion: consolidado.costoImpresionMaterial,
        traslado: consolidado.costoTraslado,
        traslado_externo: consolidado.trasladoExterno,
        logistica: data.isCapacitacion
          ? consolidado.diasLogisticaFacilitador *
            consolidado.costoLogisticaComida
          : compute_st_recursos_totals({
              dias_hospedaje_facilitador:
                consolidado.diasHospedajeFacilitador,
              costo_hospedaje: consolidado.costoHospedaje,
              dias_logistica_facilitador:
                consolidado.diasLogisticaFacilitador,
              costo_logistica_comida: consolidado.costoLogisticaComida,
              st_logistica_recursos: consolidado.stLogisticaRecursos,
              st_envio_factura: consolidado.stEnvioFactura,
              st_envio_materiales: consolidado.stEnvioMateriales,
              st_traslados: consolidado.stTraslados,
            }).total_logistica,
        hospedaje: data.isCapacitacion
          ? consolidado.diasHospedajeFacilitador * consolidado.costoHospedaje
          : compute_st_recursos_totals({
              dias_hospedaje_facilitador:
                consolidado.diasHospedajeFacilitador,
              costo_hospedaje: consolidado.costoHospedaje,
              dias_logistica_facilitador:
                consolidado.diasLogisticaFacilitador,
              costo_logistica_comida: consolidado.costoLogisticaComida,
              st_logistica_recursos: consolidado.stLogisticaRecursos,
              st_envio_factura: consolidado.stEnvioFactura,
              st_envio_materiales: consolidado.stEnvioMateriales,
              st_traslados: consolidado.stTraslados,
            }).total_hospedaje,
        otros: consolidado.costoOtros,
        st_envios:
          consolidado.stEnvioFactura + consolidado.stEnvioMateriales,
        st_traslados: 0,
      },
    };
  }

  const slices = desglose.map((session) =>
    session_to_cost_slice(session, data),
  );
  const omitidos = detect_omitidos(slices);
  const consolidado = sum_slices(slices, data, omitidos);
  const { variaciones, variacionColumnas, variacionTotales } = build_variaciones(
    desglose,
    slices,
    omitidos,
    data.isCapacitacion,
  );
  const totales = compute_totales(slices, data.isCapacitacion);

  return {
    consolidado,
    omitidos,
    variaciones,
    variacionColumnas,
    variacionTotales,
    esPorSesion: true,
    totales,
  };
}

/** @deprecated Prefer build_osi_recursos_layout. */
export function build_osi_recursos_cost_slices(
  data: OsiPreviewData,
): OsiRecursosCostSlice[] {
  return [build_osi_recursos_layout(data).consolidado];
}
