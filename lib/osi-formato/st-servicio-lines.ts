import type { OsiStServicioLine } from "./osi-preview-data";

type GenericRow = Record<string, unknown>;

function to_str(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function to_num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}

function format_st_service_detail_subline(
  areas: number,
  trabajadores: number,
  puntos: number,
): string | null {
  if (areas <= 0 && trabajadores <= 0 && puntos <= 0) return null;
  return (
    `Para efectuarse en ${puntos} puntos a evaluar distribuidos en ` +
    `${areas} areas, ocupadas por ${trabajadores} trabajadores.`
  );
}

function is_st_consolidated_encabezado(row: GenericRow): boolean {
  const clase = String(row.clase_ecc ?? "estandar");
  const tipo = String(row.tipo_ecc ?? "").toLowerCase();
  const is_cap = tipo.includes("cap") || tipo.includes("consolidada_cap");
  return clase === "consolidada" && !is_cap;
}

export function build_osi_st_servicio_lines(input: {
  view_row: GenericRow | null | undefined;
  children: GenericRow[];
  servicio_nombre_by_id: Map<number, string> | Record<number, string>;
  fallback_servicio_nombre?: string | null;
}): OsiStServicioLine[] {
  const { view_row, children, fallback_servicio_nombre } = input;
  if (!view_row) return [];

  const name_map =
    input.servicio_nombre_by_id instanceof Map
      ? input.servicio_nombre_by_id
      : new Map(Object.entries(input.servicio_nombre_by_id).map(([k, v]) => [Number(k), v]));

  const build_line = (row: GenericRow): OsiStServicioLine => {
    const svc_id = to_num(row.servicio_id ?? row.id_servicio);
    return {
      nombre:
        (name_map.get(svc_id) ?? to_str(fallback_servicio_nombre)) || "SERVICIO",
      detalle: format_st_service_detail_subline(
        to_num(row.numero_areas),
        to_num(row.numero_trabajadores),
        to_num(row.numero_puntos_evaluar),
      ),
      pretensiones: to_str(row.pretenciones_cliente) || null,
      observaciones: to_str(row.observaciones_cliente) || null,
    };
  };

  if (children.length > 0 || is_st_consolidated_encabezado(view_row)) {
    return children.map(build_line);
  }

  return [
    build_line({
      servicio_id: to_num(view_row.id_servicio),
      numero_areas: to_num(view_row.numero_areas),
      numero_trabajadores: to_num(view_row.numero_trabajadores),
      numero_puntos_evaluar: to_num(view_row.numero_puntos_evaluar),
      pretenciones_cliente: view_row.pretenciones_cliente,
      observaciones_cliente: view_row.observaciones_cliente,
    }),
  ];
}
