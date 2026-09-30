"use client";

import { cn } from "./utils/cn";
import type { OsiRecursosLayout } from "./osi-recursos-layout";
import {
  format_certificado_entrega_display,
  format_osi_si_no,
  OSI_BOOLEAN_VALUE_CLASS,
  OSI_DOC_VALUE_CLASS,
} from "./osi-document-typography";

function money_cell(value: number, hidden?: boolean): string {
  if (hidden || !(value > 0)) return "N/A";
  return `$${value.toFixed(2)}`;
}

/**
 * Clean master resumen for per-session mode — totals only, no "ver abajo".
 */
export function OsiResumenRecursosConsolidado({
  layout,
  is_hidden,
  section_header_class,
  is_capacitacion,
}: {
  layout: OsiRecursosLayout;
  is_hidden: (key: string) => boolean;
  section_header_class: string;
  is_capacitacion: boolean;
}) {
  const t = layout.totales;
  const c = layout.consolidado;
  const gran_total =
    layout.variacionTotales.total_sesion ??
    t.honorarios +
      t.impresion +
      t.traslado +
      t.traslado_externo +
      t.logistica +
      t.hospedaje +
      t.otros +
      t.st_envios +
      t.st_traslados;

  if (is_capacitacion) {
    return (
      <>
        <tr>
          <th colSpan={6} className={section_header_class}>
            RESUMEN DE RECURSOS DEL SERVICIO
          </th>
        </tr>
        <tr>
          <th className="osi-label-md leading-tight" colSpan={2}>HONORARIOS</th>
          <th className="osi-label-md leading-tight" colSpan={2}>HOSPEDAJE</th>
          <th className="osi-label-md leading-tight" colSpan={2}>LOGÍSTICA / COMIDA</th>
        </tr>
        <tr>
          <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")} colSpan={2}>
            {money_cell(t.honorarios, is_hidden("honorarios_unit_cost"))}
          </td>
          <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")} colSpan={2}>
            {money_cell(t.hospedaje, is_hidden("hospedaje_unit_cost"))}
          </td>
          <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")} colSpan={2}>
            {money_cell(t.logistica, is_hidden("logistica_unit_cost"))}
          </td>
        </tr>
        <tr>
          <td className="p-0 align-top" colSpan={3}>
            <table className="w-full table-fixed border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
              <tbody>
                <tr>
                  <th className="bg-slate-100 osi-label-md px-1 py-0.5">
                    IMPRESIÓN DE MATERIAL
                  </th>
                </tr>
                <tr>
                  <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                    {money_cell(
                      t.impresion,
                      is_hidden("costo_impresion_material"),
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
          <td className="p-0 align-top" colSpan={3}>
            <table className="w-full table-fixed border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
              <tbody>
                <tr>
                  <th className="bg-slate-100 osi-label-md px-1 py-0.5">
                    TRASLADOS
                  </th>
                </tr>
                <tr>
                  <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                    {money_cell(
                      t.traslado + t.traslado_externo + t.otros,
                      is_hidden("costo_traslado") &&
                        is_hidden("traslado_externo") &&
                        is_hidden("costo_otros"),
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
        <tr>
          <th className="osi-label-md leading-tight" colSpan={2}>
            CERTIFICADO
          </th>
          <th className="osi-label-md leading-tight" colSpan={2}>
            CARNET
          </th>
          <th className="osi-label-md leading-tight">POP</th>
          <th className="osi-label-md leading-tight">INCLUYE REFRIGERIO</th>
        </tr>
        <tr>
          <td
            className={cn(OSI_BOOLEAN_VALUE_CLASS, "h-9 px-1 leading-tight")}
            colSpan={2}
          >
            {format_certificado_entrega_display(
              c.certificadoImpreso,
              c.entregaCertificado,
            )}
          </td>
          <td className={cn(OSI_BOOLEAN_VALUE_CLASS, "h-9")} colSpan={2}>
            {format_osi_si_no(c.carnetImpreso)}
          </td>
          <td className={cn(OSI_BOOLEAN_VALUE_CLASS, "h-9")}>
            {format_osi_si_no(c.popIncluido)}
          </td>
          <td className={cn(OSI_BOOLEAN_VALUE_CLASS, "h-9")}>
            {format_osi_si_no(c.incluyeRefrigerio)}
          </td>
        </tr>
        <tr>
          <th className="osi-label-md leading-tight bg-slate-100" colSpan={6}>
            TOTAL OSI
          </th>
        </tr>
        <tr>
          <td
            className={cn(OSI_DOC_VALUE_CLASS, "h-9 font-bold bg-slate-50")}
            colSpan={6}
          >
            {money_cell(gran_total, is_hidden("gran_total"))}
          </td>
        </tr>
      </>
    );
  }

  return (
    <>
      <tr>
        <th colSpan={6} className={section_header_class}>
          RESUMEN DE RECURSOS DEL SERVICIO
        </th>
      </tr>
      <tr>
        <th className="osi-label-md leading-tight">HOSPEDAJE</th>
        <th className="osi-label-md leading-tight">LOGÍSTICA</th>
        <th className="osi-label-md leading-tight">IMPRESIÓN / TRASLADOS</th>
        <th className="osi-label-md leading-tight bg-slate-100">TOTAL OSI</th>
      </tr>
      <tr>
        <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
          {money_cell(t.hospedaje, is_hidden("hospedaje_unit_cost"))}
        </td>
        <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
          {money_cell(t.logistica, is_hidden("logistica_unit_cost"))}
        </td>
        <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
          {money_cell(
            t.impresion + t.st_traslados,
            is_hidden("costo_impresion_material") &&
              is_hidden("costo_traslado"),
          )}
        </td>
        <td className={cn(OSI_DOC_VALUE_CLASS, "h-9 font-bold bg-slate-50")}>
          {money_cell(gran_total, is_hidden("gran_total"))}
        </td>
      </tr>
      <tr>
        <th className="osi-label-md leading-tight" colSpan={2}>
          ENVÍOS
        </th>
        <th className="osi-label-md leading-tight" colSpan={2}>
          OTROS
        </th>
      </tr>
      <tr>
        <td
          className={cn(OSI_DOC_VALUE_CLASS, "h-9")}
          colSpan={2}
        >
          {money_cell(
            t.st_envios,
            is_hidden("st_envio_factura") && is_hidden("st_envio_materiales"),
          )}
        </td>
        <td
          className={cn(OSI_DOC_VALUE_CLASS, "h-9")}
          colSpan={2}
        >
          {money_cell(t.otros, is_hidden("costo_otros"))}
        </td>
      </tr>
    </>
  );
}
