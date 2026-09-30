"use client";

import { cn } from "./utils/cn";
import {
  type OsiRecursosCostSlice,
  type OsiRecursosLayout,
  build_osi_recursos_layout,
} from "./osi-recursos-layout";
import {
  compute_st_recursos_totals,
} from "./st-recursos-types";
import { OsiRecursosColGroup } from "./osi-recursos-colgroup";
import type { OsiPreviewData } from "./osi-preview-data";
import {
  format_money_or_dash,
} from "./osi-recursos-segmentado";
import { OsiRecursosVariacionesTable } from "./osi-recursos-variaciones-table";
import { OsiResumenRecursosConsolidado } from "./osi-resumen-recursos";
import {
  format_certificado_entrega_display,
  format_osi_si_no,
  OSI_BOOLEAN_VALUE_CLASS,
  OSI_DOC_VALUE_BOLD_CLASS,
  OSI_DOC_VALUE_CLASS,
} from "./osi-document-typography";
import {
  merged_content_to_display_html,
  RICH_HTML_CONTENT_CLASS,
} from "./rich-html";

function OsiInlineRichText({ content }: { content: string }) {
  const html = merged_content_to_display_html(content);
  if (html === "N/A") {
    return <span>N/A</span>;
  }
  return (
    <div
      className={cn(
        RICH_HTML_CONTENT_CLASS,
        "osi-rich-html text-[12px] leading-snug text-left whitespace-pre-wrap break-words",
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export type { OsiRecursosCostSlice, OsiRecursosLayout };
export { build_osi_recursos_layout };
export { build_osi_recursos_cost_slices } from "./osi-recursos-layout";

type MaskFns = {
  is_hidden: (key: string) => boolean;
  section_header_class: string;
};

function traslado_row_total(
  traslado: { cantidad: number; costo_unidad: number },
  masked: boolean,
): string {
  const total = traslado.cantidad * traslado.costo_unidad;
  if (masked || total <= 0) return "N/A";
  return `$${total.toFixed(2)}`;
}

function find_st_traslado(
  traslados: Array<{ tipo: string; cantidad: number; costo_unidad: number }>,
  tipo: "urbano" | "extraurbano",
) {
  return (
    traslados.find((row) => row.tipo === tipo) ?? {
      tipo,
      cantidad: 0,
      costo_unidad: 0,
    }
  );
}

function OsiStTrasladosHorizontalTable({
  traslados,
  traslado_mask,
  st_traslado_total,
  st_traslado_externo_total,
  inner_table_class,
}: {
  traslados: Array<{ tipo: string; cantidad: number; costo_unidad: number }>;
  traslado_mask: boolean;
  st_traslado_total: number;
  st_traslado_externo_total: number;
  inner_table_class: string;
}) {
  const urbano = find_st_traslado(traslados, "urbano");
  const extraurbano = find_st_traslado(traslados, "extraurbano");
  const has_detailed = traslados.length > 0;

  const render_tipo_block = (
    label: string,
    row: { cantidad: number; costo_unidad: number },
    fallback_total?: number,
  ) => (
    <td className="align-top p-0 w-1/2">
      <table className={inner_table_class}>
        <tbody>
          <tr>
            <th colSpan={3} className="osi-label-sm font-normal bg-slate-50">
              {label}
            </th>
          </tr>
          <tr>
            <th className="osi-label-sm">CANT.</th>
            <th className="osi-label-sm">$/U</th>
            <th className="osi-label-sm">TOTAL</th>
          </tr>
          <tr>
            <td className="osi-doc-value text-center">
              {has_detailed
                ? row.cantidad > 0
                  ? String(row.cantidad)
                  : "N/A"
                : fallback_total != null && fallback_total > 0
                  ? "—"
                  : "N/A"}
            </td>
            <td className="osi-doc-value text-center">
              {has_detailed
                ? !traslado_mask && row.costo_unidad > 0
                  ? `$${row.costo_unidad.toFixed(2)}`
                  : "N/A"
                : "—"}
            </td>
            <td className="osi-doc-value text-center font-semibold">
              {has_detailed
                ? traslado_row_total(row, traslado_mask)
                : fallback_total != null && fallback_total > 0 && !traslado_mask
                  ? `$${fallback_total.toFixed(2)}`
                  : "N/A"}
            </td>
          </tr>
        </tbody>
      </table>
    </td>
  );

  return (
    <table className={inner_table_class}>
      <tbody>
        <tr>
          <th colSpan={2} className="bg-slate-100 osi-label-md px-1 py-0.5">
            TRASLADO(S)
          </th>
        </tr>
        <tr>
          {render_tipo_block(
            "URBANO",
            urbano,
            has_detailed ? undefined : st_traslado_total,
          )}
          {render_tipo_block(
            "EXTRAURBANO",
            extraurbano,
            has_detailed ? undefined : st_traslado_externo_total,
          )}
        </tr>
      </tbody>
    </table>
  );
}

export function OsiRecursosVariacionesRows({
  layout,
  section_header_class,
  maskMonetary,
}: {
  layout: OsiRecursosLayout;
  section_header_class: string;
  maskMonetary?: boolean;
}) {
  if (
    !layout.esPorSesion ||
    layout.variaciones.length === 0 ||
    layout.variacionColumnas.length === 0
  ) {
    return null;
  }

  return (
    <>
      <tr>
        <th colSpan={6} className={section_header_class}>
          DESGLOSE DIARIO POR SESIÓN
        </th>
      </tr>
      <tr>
        <td colSpan={6} className="!text-left align-top p-1 overflow-x-auto">
          <OsiRecursosVariacionesTable
            layout={layout}
            maskMonetary={maskMonetary}
          />
        </td>
      </tr>
    </>
  );
}

export function OsiCapDesgloseDiarioRows({
  layout,
  section_header_class,
  maskMonetary,
}: {
  layout: OsiRecursosLayout;
  section_header_class: string;
  maskMonetary?: boolean;
}) {
  const hasVariaciones =
    layout.esPorSesion &&
    layout.variaciones.length > 0 &&
    layout.variacionColumnas.length > 0;

  return (
    <>
      <tr>
        <th colSpan={6} className={section_header_class}>
          DESGLOSE DIARIO POR SESIÓN
        </th>
      </tr>
      <tr>
        <td colSpan={6} className="!text-left align-top p-1 overflow-x-auto">
          {hasVariaciones ? (
            <OsiRecursosVariacionesTable
              layout={layout}
              maskMonetary={maskMonetary}
            />
          ) : (
            <p className="text-left text-[12px] leading-snug px-1 py-1">
              detalle en el cuadro resumen de recursos del servicio
            </p>
          )}
        </td>
      </tr>
    </>
  );
}

export { format_certificado_entrega_display } from "./osi-document-typography";

export function OsiCapacitacionRecursosBlocks({
  layout,
  is_hidden,
  section_header_class,
  include_desglose = true,
}: {
  layout: OsiRecursosLayout;
  include_desglose?: boolean;
} & MaskFns) {
  if (layout.esPorSesion) {
    return (
      <>
        <OsiResumenRecursosConsolidado
          layout={layout}
          is_hidden={is_hidden}
          section_header_class={section_header_class}
          is_capacitacion
        />
        {include_desglose ? (
          <OsiCapDesgloseDiarioRows
            layout={layout}
            section_header_class={section_header_class}
            maskMonetary={is_hidden("gran_total")}
          />
        ) : null}
      </>
    );
  }

  const slice = layout.consolidado;
  const honorarios_mask_hidden = is_hidden("honorarios_unit_cost");
  const logistica_mask_hidden = is_hidden("logistica_unit_cost");
  const hospedaje_mask_hidden = is_hidden("hospedaje_unit_cost");
  const impresion_mask_hidden = is_hidden("costo_impresion_material");
  const traslado_mask_hidden = is_hidden("costo_traslado");
  const traslado_ext_mask_hidden = is_hidden("traslado_externo");
  const otros_mask_hidden = is_hidden("costo_otros");

  const tarifa_honorarios_view = honorarios_mask_hidden
    ? 0
    : slice.tarifaHoraHonorarios;
  const total_honorarios_view = honorarios_mask_hidden
    ? 0
    : slice.costoHonorariosInstructor;
  const horas_view = honorarios_mask_hidden
    ? 0
    : slice.horasHonorariosInstructor;
  const costo_impresion_material_view = impresion_mask_hidden
    ? 0
    : slice.costoImpresionMaterial;
  const costo_traslado_view = traslado_mask_hidden ? 0 : slice.costoTraslado;
  const traslado_externo_view = traslado_ext_mask_hidden
    ? 0
    : slice.trasladoExterno;
  const costo_otros_view = otros_mask_hidden ? 0 : slice.costoOtros;
  const costo_logistica_view = logistica_mask_hidden
    ? 0
    : slice.costoLogisticaComida;
  const costo_hospedaje_view = hospedaje_mask_hidden
    ? 0
    : slice.costoHospedaje;
  const dias_logistica = slice.diasLogisticaFacilitador;
  const dias_hospedaje = slice.diasHospedajeFacilitador;
  const logistica_total = dias_logistica * costo_logistica_view;
  const hospedaje_total = dias_hospedaje * costo_hospedaje_view;

  return (
    <>
      <tr>
        <th colSpan={6} className={section_header_class}>
          RECURSOS ESTIMADOS PARA EL SERVICIO
        </th>
      </tr>
      <tr>
        <td className="p-0 align-middle w-[34%]" colSpan={2}>
          <table className="osi-nested-table w-full table-fixed border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
            <OsiRecursosColGroup />
            <tbody>
              <tr>
                <th
                  colSpan={3}
                  className="bg-slate-100 text-black osi-label-md px-0.5 py-0.5 leading-tight"
                >
                  HONORARIOS FACILITADOR
                </th>
              </tr>
              <tr>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">HORAS</th>
                <th className="osi-label-sm osi-th-nowrap px-0.5 py-0.5 leading-tight">
                  COSTO
                </th>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">TOTAL</th>
              </tr>
              <tr>
                <td className={cn(OSI_DOC_VALUE_BOLD_CLASS, "h-9")}>
                  {horas_view > 0 ? String(horas_view) : "N/A"}
                </td>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {tarifa_honorarios_view > 0
                    ? `$${tarifa_honorarios_view.toFixed(2)}`
                    : "N/A"}
                </td>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {total_honorarios_view > 0
                    ? `$${total_honorarios_view.toFixed(2)}`
                    : "N/A"}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
        <td className="w-[33%] p-0 align-top" colSpan={2}>
          <table className="osi-nested-table w-full table-fixed border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
            <OsiRecursosColGroup />
            <tbody>
              <tr>
                <th
                  colSpan={3}
                  className="bg-slate-100 text-black osi-label-md px-0.5 py-0.5 leading-tight"
                >
                  HOSPEDAJE
                </th>
              </tr>
              <tr>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">DÍAS</th>
                <th className="osi-label-sm osi-th-nowrap px-0.5 py-0.5 leading-tight">
                  COSTO
                </th>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">TOTAL</th>
              </tr>
              <tr>
                <td className={cn(OSI_DOC_VALUE_BOLD_CLASS, "h-9")}>
                  {dias_hospedaje > 0 ? String(dias_hospedaje) : "N/A"}
                </td>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {costo_hospedaje_view > 0
                    ? `$${costo_hospedaje_view.toFixed(2)}`
                    : "N/A"}
                </td>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {hospedaje_total > 0 ? `$${hospedaje_total.toFixed(2)}` : "N/A"}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
        <td className="w-[33%] p-0 align-top" colSpan={2}>
          <table className="osi-nested-table w-full table-fixed border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
            <OsiRecursosColGroup />
            <tbody>
              <tr>
                <th
                  colSpan={3}
                  className="bg-slate-100 text-black osi-label-md px-0.5 py-0.5 leading-tight"
                >
                  LOGÍSTICA / COMIDA
                </th>
              </tr>
              <tr>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">DÍAS</th>
                <th className="osi-label-sm osi-th-nowrap px-0.5 py-0.5 leading-tight">
                  COSTO
                </th>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">TOTAL</th>
              </tr>
              <tr>
                <td className={cn(OSI_DOC_VALUE_BOLD_CLASS, "h-9")}>
                  {dias_logistica > 0 ? String(dias_logistica) : "N/A"}
                </td>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {costo_logistica_view > 0
                    ? `$${costo_logistica_view.toFixed(2)}`
                    : "N/A"}
                </td>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {logistica_total > 0 ? `$${logistica_total.toFixed(2)}` : "N/A"}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
      <tr>
        <td className="p-0 align-top" colSpan={3}>
          <table className="osi-nested-table w-full table-fixed border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
            <tbody>
              <tr>
                <th className="bg-slate-100 text-black osi-label-md px-0.5 py-0.5 leading-tight">
                  IMPRESIÓN DE MATERIAL
                </th>
              </tr>
              <tr>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {format_money_or_dash(
                    costo_impresion_material_view,
                    impresion_mask_hidden,
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
        <td className="p-0 align-top" colSpan={3}>
          <table className="osi-nested-table w-full table-fixed border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
            <tbody>
              <tr>
                <th
                  colSpan={3}
                  className="bg-slate-100 text-black osi-label-md px-0.5 py-0.5 leading-tight"
                >
                  TRASLADOS
                </th>
              </tr>
              <tr>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">URBANO</th>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">
                  EXTRAURBANO
                </th>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">OTROS</th>
              </tr>
              <tr>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {format_money_or_dash(costo_traslado_view, traslado_mask_hidden)}
                </td>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {format_money_or_dash(
                    traslado_externo_view,
                    traslado_ext_mask_hidden,
                  )}
                </td>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {format_money_or_dash(costo_otros_view, otros_mask_hidden)}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
      <tr>
        <th
          className="osi-cert-label osi-th-nowrap border-b border-black py-1.5 leading-tight osi-label-md"
          colSpan={2}
        >
          CERTIFICADO
        </th>
        <th
          className="osi-th-nowrap border-b border-black py-1.5 leading-tight osi-label-md"
          colSpan={2}
        >
          CARNET
        </th>
        <th className="osi-th-nowrap border-b border-black py-1.5 leading-tight osi-label-md">
          POP
        </th>
        <th className="osi-th-nowrap border-b border-black py-1.5 leading-tight osi-label-md">
          INCLUYE REFRIGERIO
        </th>
      </tr>
      <tr>
        <td className={cn(OSI_BOOLEAN_VALUE_CLASS, "h-9 px-1 leading-tight")} colSpan={2}>
          {format_certificado_entrega_display(
            slice.certificadoImpreso,
            slice.entregaCertificado,
          )}
        </td>
        <td className={cn(OSI_BOOLEAN_VALUE_CLASS, "h-9")} colSpan={2}>
          {format_osi_si_no(slice.carnetImpreso)}
        </td>
        <td className={cn(OSI_BOOLEAN_VALUE_CLASS, "h-9")}>
          {format_osi_si_no(slice.popIncluido)}
        </td>
        <td className={cn(OSI_BOOLEAN_VALUE_CLASS, "h-9")}>
          {format_osi_si_no(slice.incluyeRefrigerio)}
        </td>
      </tr>
      {include_desglose ? (
        <OsiCapDesgloseDiarioRows
          layout={layout}
          section_header_class={section_header_class}
          maskMonetary={is_hidden("gran_total")}
        />
      ) : null}
    </>
  );
}

export function OsiStRecursosBlocks({
  layout,
  is_hidden,
  section_header_class,
  include_desglose = true,
}: {
  layout: OsiRecursosLayout;
  include_desglose?: boolean;
} & MaskFns) {
  if (layout.esPorSesion) {
    return (
      <>
        <OsiResumenRecursosConsolidado
          layout={layout}
          is_hidden={is_hidden}
          section_header_class={section_header_class}
          is_capacitacion={false}
        />
        {include_desglose ? (
          <OsiRecursosVariacionesRows
            layout={layout}
            section_header_class={section_header_class}
            maskMonetary={is_hidden("gran_total")}
          />
        ) : null}
      </>
    );
  }

  const slice = layout.consolidado;
  const logistica_mask_hidden = is_hidden("logistica_unit_cost");
  const hospedaje_mask_hidden = is_hidden("hospedaje_unit_cost");
  const otros_mask_hidden = is_hidden("costo_otros");
  const traslado_mask = is_hidden("costo_traslado");

  const costo_logistica_view = logistica_mask_hidden
    ? 0
    : slice.costoLogisticaComida;
  const costo_hospedaje_view = hospedaje_mask_hidden ? 0 : slice.costoHospedaje;
  const costo_otros_view = otros_mask_hidden ? 0 : slice.costoOtros;
  const dias_logistica = slice.diasLogisticaFacilitador;
  const dias_hospedaje = slice.diasHospedajeFacilitador;
  const st_totals = compute_st_recursos_totals({
    dias_hospedaje_facilitador: dias_hospedaje,
    costo_hospedaje: costo_hospedaje_view,
    dias_logistica_facilitador: dias_logistica,
    costo_logistica_comida: costo_logistica_view,
    st_logistica_recursos: slice.stLogisticaRecursos,
    st_envio_factura: 0,
    st_envio_materiales: 0,
    st_traslados: slice.stTraslados,
  });
  const st_traslado_total = st_totals.costo_traslado;
  const st_traslado_externo_total = st_totals.traslado_externo;
  const impresion_si = slice.impresionMaterialIncluida;
  const bateria_si = slice.bateriaIncluida;
  const st_traslados_list = slice.stTraslados;
  const otros_texto = String(slice.stOtrosTexto ?? "").trim();

  const row_cell_class = "align-top p-1 w-1/3";
  const inner_table_class =
    "w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black";

  return (
    <>
      <tr>
        <th colSpan={6} className={section_header_class}>
          RECURSOS ESTIMADOS PARA EL SERVICIO
        </th>
      </tr>
      <tr>
        <td colSpan={6} className="p-0 align-top">
          <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
            <tbody>
              <tr>
                <td className={row_cell_class}>
                  <table className={inner_table_class}>
                    <tbody>
                      <tr>
                        <th
                          colSpan={3}
                          className="bg-slate-100 osi-label-md px-1 py-0.5"
                        >
                          PLANIFICACIÓN
                        </th>
                      </tr>
                      <tr>
                        <th className="bg-slate-100 osi-label-sm px-1 py-0.5">
                          CAMPO
                        </th>
                        <th className="bg-slate-100 osi-label-sm px-1 py-0.5">
                          INFORME
                        </th>
                        <th className="bg-slate-100 osi-label-sm px-1 py-0.5">
                          REVISIÓN
                        </th>
                      </tr>
                      <tr>
                        <td className="osi-doc-value text-center">
                          {slice.stDiasCampo || "N/A"}
                        </td>
                        <td className="osi-doc-value text-center">
                          {slice.stDiasInforme || "N/A"}
                        </td>
                        <td className="osi-doc-value text-center">
                          {slice.stDiasRevision || "N/A"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td className={row_cell_class}>
                  <table className={inner_table_class}>
                    <tbody>
                      <tr>
                        <th colSpan={4} className="bg-slate-100 osi-label-md px-1 py-0.5">
                          LOGÍSTICA / COMIDA
                        </th>
                      </tr>
                      <tr>
                        <th className="osi-label-sm">DÍAS</th>
                        <th className="osi-label-sm">REC.</th>
                        <th className="osi-label-sm">$/DÍA</th>
                        <th className="osi-label-sm">TOTAL</th>
                      </tr>
                      <tr>
                        <td className="osi-doc-value text-center">
                          {dias_logistica > 0 ? String(dias_logistica) : "N/A"}
                        </td>
                        <td className="osi-doc-value text-center">
                          {(slice.stLogisticaRecursos ?? slice.stAnalistas ?? 0) > 0
                            ? String(slice.stLogisticaRecursos ?? slice.stAnalistas)
                            : "N/A"}
                        </td>
                        <td className="osi-doc-value text-center">
                          {costo_logistica_view > 0
                            ? `$${costo_logistica_view.toFixed(2)}`
                            : "N/A"}
                        </td>
                        <td className="osi-doc-value text-center font-semibold">
                          {st_totals.total_logistica > 0
                            ? `$${st_totals.total_logistica.toFixed(2)}`
                            : "N/A"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td className={row_cell_class}>
                  <table className={inner_table_class}>
                    <tbody>
                      <tr>
                        <th colSpan={3} className="bg-slate-100 osi-label-md px-1 py-0.5">
                          HOSPEDAJE
                        </th>
                      </tr>
                      <tr>
                        <th className="osi-label-sm">DÍAS</th>
                        <th className="osi-label-sm">$/DÍA</th>
                        <th className="osi-label-sm">TOTAL</th>
                      </tr>
                      <tr>
                        <td className="osi-doc-value text-center">
                          {dias_hospedaje > 0 ? String(dias_hospedaje) : "N/A"}
                        </td>
                        <td className="osi-doc-value text-center">
                          {costo_hospedaje_view > 0
                            ? `$${costo_hospedaje_view.toFixed(2)}`
                            : "N/A"}
                        </td>
                        <td className="osi-doc-value text-center">
                          {st_totals.total_hospedaje > 0
                            ? `$${st_totals.total_hospedaje.toFixed(2)}`
                            : "N/A"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="align-top p-1">
                  <OsiStTrasladosHorizontalTable
                    traslados={st_traslados_list}
                    traslado_mask={traslado_mask}
                    st_traslado_total={st_traslado_total}
                    st_traslado_externo_total={st_traslado_externo_total}
                    inner_table_class={inner_table_class}
                  />
                </td>
                <td className="align-top p-1">
                  <table className={inner_table_class}>
                    <tbody>
                      <tr>
                        <th className="bg-slate-100 osi-label-md px-1 py-0.5">
                          BATERÍA (SI APLICA)
                        </th>
                      </tr>
                      <tr>
                        <td className="osi-doc-value text-center font-bold py-1">
                          {format_osi_si_no(bateria_si)}
                        </td>
                      </tr>
                      <tr>
                        <th className="bg-slate-100 osi-label-md px-1 py-0.5">
                          IMPRESIÓN DE MATERIAL
                        </th>
                      </tr>
                      <tr>
                        <td className="osi-doc-value text-center font-bold py-1">
                          {format_osi_si_no(impresion_si)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="p-0 align-top">
                  <table className={inner_table_class}>
                    <tbody>
                      <tr>
                        <th className="bg-slate-100 osi-label-md px-2 py-0.5 text-left">
                          OTROS
                        </th>
                      </tr>
                      <tr>
                        <td className="osi-doc-value !text-left px-2 py-1 align-top min-h-8">
                          {otros_texto.length > 0 ? (
                            <OsiInlineRichText content={otros_texto} />
                          ) : (
                            "N/A"
                          )}
                          {!otros_mask_hidden && costo_otros_view > 0 ? (
                            <div className="mt-1 text-center font-semibold">
                              {format_money_or_dash(costo_otros_view, false)}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </>
  );
}

export function build_layout_from_preview(
  data: OsiPreviewData,
): OsiRecursosLayout {
  return build_osi_recursos_layout(data);
}
