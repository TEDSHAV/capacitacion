export type OsiStTrasladoTipo = "urbano" | "extraurbano";

export type OsiStTrasladoRow = {
  tipo: OsiStTrasladoTipo;
  cantidad: number;
  costo_unidad: number;
};

export type OsiStRecursosPayload = {
  st_dias_campo: number;
  st_dias_informe: number;
  st_analistas: number;
  st_logistica_recursos: number;
  st_envio_factura: number;
  st_envio_materiales: number;
  st_traslados: OsiStTrasladoRow[];
  impresion_material_incluida: boolean;
  bateria_incluida: boolean;
  dias_hospedaje_facilitador: number;
  costo_hospedaje: number;
  dias_logistica_facilitador: number;
  costo_logistica_comida: number;
  costo_otros: number;
};

export const OSI_ST_TRASLADO_LABELS: Record<OsiStTrasladoTipo, string> = {
  urbano: "Urbano",
  extraurbano: "Extraurbano",
};

export function round_osi_money(value: number): number {
  return Math.round(value * 100) / 100;
}

export function aggregate_st_traslados(
  traslados: OsiStTrasladoRow[],
): { costo_traslado: number; traslado_externo: number } {
  let costo_traslado = 0;
  let traslado_externo = 0;
  for (const row of traslados) {
    const total = round_osi_money(
      (Number(row.cantidad) || 0) * (Number(row.costo_unidad) || 0),
    );
    if (row.tipo === "urbano") {
      costo_traslado = round_osi_money(costo_traslado + total);
    } else {
      traslado_externo = round_osi_money(traslado_externo + total);
    }
  }
  return { costo_traslado, traslado_externo };
}

export function parse_st_traslados_json(value: unknown): OsiStTrasladoRow[] {
  if (!Array.isArray(value)) return [];
  const valid: OsiStTrasladoTipo[] = ["urbano", "extraurbano"];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const row = raw as Record<string, unknown>;
      let tipo = String(row.tipo ?? "").trim();
      if (tipo === "rutas") tipo = "extraurbano";
      if (!valid.includes(tipo as OsiStTrasladoTipo)) return null;
      return {
        tipo: tipo as OsiStTrasladoTipo,
        cantidad: Number(row.cantidad ?? 0) || 0,
        costo_unidad: Number(row.costo_unidad ?? 0) || 0,
      };
    })
    .filter((row): row is OsiStTrasladoRow => row != null);
}

export function compute_st_recursos_totals(
  payload: Partial<OsiStRecursosPayload>,
): {
  total_hospedaje: number;
  total_logistica: number;
  total_envio: number;
  costo_traslado: number;
  traslado_externo: number;
} {
  const dias_hosp = Number(payload.dias_hospedaje_facilitador ?? 0) || 0;
  const costo_hosp_dia = Number(payload.costo_hospedaje ?? 0) || 0;
  const dias_log = Number(payload.dias_logistica_facilitador ?? 0) || 0;
  const costo_log_dia = Number(payload.costo_logistica_comida ?? 0) || 0;
  const recursos = Number(payload.st_logistica_recursos ?? 0) || 0;
  const traslados = aggregate_st_traslados(payload.st_traslados ?? []);
  return {
    total_hospedaje: round_osi_money(dias_hosp * costo_hosp_dia),
    total_logistica: round_osi_money(dias_log * costo_log_dia * recursos),
    total_envio: round_osi_money(
      (Number(payload.st_envio_factura ?? 0) || 0) +
        (Number(payload.st_envio_materiales ?? 0) || 0),
    ),
    ...traslados,
  };
}
