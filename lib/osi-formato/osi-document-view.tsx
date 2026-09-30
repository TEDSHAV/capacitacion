"use client";

/* eslint-disable @next/next/no-img-element -- native img for reliable print paint */
import { useEffect, useRef } from "react";
import { cn } from "./utils/cn";
import { formatCalendarDayEsVe, formatTimeAmPmEsVe } from "./utils/calendar-date";
import {
  map_sesiones_planificadas_dia_hora,
  OSI_FECHA_POR_PLANIFICAR_LABEL,
  resolve_osi_sesiones_documento_count,
} from "./osi-session-slots";
import type { OsiStFechasServicioSlice } from "./st-fechas-document";
import { build_st_fechas_ejecutadas_vacias } from "./st-fechas-document";
import { merged_content_to_display_html, RICH_HTML_CONTENT_CLASS } from "./rich-html";
import type { OsiStServicioLine } from "./osi-preview-data";
import { type OsiDocumentAssets, type OsiPreviewData } from "./osi-preview-data";
import {
  build_osi_recursos_layout,
  OsiCapacitacionRecursosBlocks,
  OsiCapDesgloseDiarioRows,
  OsiRecursosVariacionesRows,
  OsiStRecursosBlocks,
} from "./osi-recursos-section";
import {
  build_osi_observaciones_document_items,
  type OsiObservacionDocumentItem,
} from "./osi-observaciones-document";
import { OSI_DOC_ROOT_TEXT_CLASS } from "./osi-document-typography";
import {
  compute_osi_page1_fill_gap,
  distribute_osi_page1_fill,
} from "./osi-print-layout";

/** Fixed header metadata (CÓDIGO / FECHA / REVISIÓN / PÁGINA block). */
const OSI_FORM_META_CAP = {
  codigo: "RG-NEG-003",
  fecha: "14/08/2026",
  revision: "1",
} as const;

const OSI_FORM_META_ST = {
  codigo: "RG-NEG-004",
  fecha: "14/08/2026",
  revision: "1",
} as const;

const OSI_TABLE_CLASS =
  "w-full table-fixed border-collapse border border-black text-[12px] [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-2 [&_td]:align-middle [&_td]:text-center [&_th]:border [&_th]:border-black [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-2 [&_th]:text-center [&_th]:text-[12px] [&_th]:font-bold [&_th]:uppercase";

const OSI_GROW_CELL_CLASS = "osi-print-grow align-top";

function OsiRichHtmlContent({
  content,
  className,
}: {
  content: string | null | undefined;
  className?: string;
}) {
  const html = merged_content_to_display_html(String(content ?? ""));
  if (html === "N/A") {
    return <span>N/A</span>;
  }
  return (
    <div
      className={cn(
        RICH_HTML_CONTENT_CLASS,
        "osi-rich-html text-[12px] leading-snug text-left",
        "whitespace-pre-wrap break-words",
        "[&_strong]:font-bold [&_em]:italic",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function st_lines_with_field(
  lines: OsiStServicioLine[] | undefined,
  field: "pretensiones" | "observaciones",
): OsiStServicioLine[] {
  return (lines ?? []).filter((line) => String(line[field] ?? "").trim().length > 0);
}

function OsiPretensionesRows({
  items,
  section_text_class,
}: {
  items: Array<{
    servicio?: string;
    fuente: "SOLPED" | "OSI";
    contenido: string;
  }>;
  section_text_class: string;
}) {
  return (
    <>
      <tr>
        <th colSpan={6} className={section_text_class}>
          PRETENSIONES DEL CLIENTE
        </th>
      </tr>
      <tr>
        <td
          colSpan={6}
          className={cn(
            OSI_GROW_CELL_CLASS,
            "osi-long-text min-h-12 max-w-0 relative !text-left px-2 py-2 text-black",
          )}
          data-osi-grow-weight="0.2"
          data-osi-grow-base="48"
        >
          {items.length > 0 ? (
            <div className="space-y-2 text-black">
              {items.map((item, idx) => (
                <div
                  key={`pret-item-${idx}`}
                  className="border-b border-dashed pb-2 last:border-b-0 last:pb-0"
                >
                  <div className="text-[12px] font-bold uppercase text-black">
                    {item.servicio
                      ? `${item.servicio} — ${item.fuente}`
                      : item.fuente}
                  </div>
                  <OsiRichHtmlContent
                    content={item.contenido}
                    className="text-black"
                  />
                </div>
              ))}
            </div>
          ) : (
            <span className="text-black">Sin pretensiones</span>
          )}
        </td>
      </tr>
    </>
  );
}

function OsiObservacionesContent({
  items,
}: {
  items: OsiObservacionDocumentItem[];
}) {
  if (items.length === 0) {
    return <span className="text-black">N/A</span>;
  }
  return (
    <div className="space-y-0 text-black">
      {items.map((item, idx) => (
        <div
          key={`obs-item-${idx}`}
          className={cn(
            idx < items.length - 1 ? "border-b border-dashed pb-2 mb-2" : "",
          )}
        >
          <div className="text-[12px] font-bold uppercase text-black">
            {item.servicio
              ? `${item.servicio} — ${item.etiqueta}`
              : item.etiqueta}
          </div>
          <OsiRichHtmlContent content={item.contenido} className="text-black" />
        </div>
      ))}
    </div>
  );
}

function OsiObservacionesRows({
  items,
  section_text_class,
}: {
  items: OsiObservacionDocumentItem[];
  section_text_class: string;
}) {
  return (
    <>
      <tr>
        <th colSpan={6} className={section_text_class}>
          OBSERVACIONES ADICIONALES
        </th>
      </tr>
      <tr>
        <td
          colSpan={6}
          className={cn(
            OSI_GROW_CELL_CLASS,
            "osi-long-text min-h-12 max-w-0 relative !text-left px-2 py-2 text-black",
          )}
          data-osi-grow-weight="0.5"
          data-osi-grow-base="48"
        >
          {items.length > 0 ? (
            <OsiObservacionesContent items={items} />
          ) : (
            <span className="text-black">N/A</span>
          )}
        </td>
      </tr>
    </>
  );
}

function map_sesiones_ejecutada_dia_hora(
  sessions:
    | Array<{
        fecha: string;
        hora_inicio?: string | null;
        hora_fin?: string | null;
      }>
    | undefined,
): Array<{ fecha: string; hora: string }> {
  return (sessions ?? []).map((session) => {
    const fecha =
      typeof session?.fecha === "string" ? session.fecha.trim() : "";
    if (!fecha) {
      return { fecha: "", hora: "—" };
    }
    return {
      fecha,
      hora: formatTimeAmPmEsVe(
        session.hora_inicio || session.hora_fin || null,
      ),
    };
  });
}

function format_st_fecha_celda(
  value: string | null | undefined,
  vacio: boolean,
): string {
  if (vacio || !String(value ?? "").trim()) return "— —";
  return formatCalendarDayEsVe(value);
}

function format_st_reunion_pre_inicio(
  fecha: string | null | undefined,
  hora: string | null | undefined,
  vacio: boolean,
): string {
  if (vacio) return "— —";
  const fecha_txt = String(fecha ?? "").trim()
    ? formatCalendarDayEsVe(fecha)
    : "";
  const hora_txt = String(hora ?? "").trim()
    ? formatTimeAmPmEsVe(hora)
    : "";
  if (!fecha_txt && !hora_txt) return "— —";
  if (fecha_txt && hora_txt) return `${fecha_txt} ${hora_txt}`;
  return fecha_txt || hora_txt;
}

function OsiStFechasCategoriaTable({
  fechas,
  vacio,
  highlight,
  hora_fallback,
}: {
  fechas: OsiStFechasServicioSlice;
  vacio: boolean;
  highlight?: boolean;
  hora_fallback?: string | null;
}) {
  const inner_class =
    "w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black";
  const row_class = highlight ? "bg-amber-50 ring-2 ring-amber-300 ring-inset" : "";
  const reunion_hora =
    String(fechas.reunionPreInicioHora ?? "").trim() ||
    String(hora_fallback ?? "").trim() ||
    null;

  return (
    <table className={inner_class}>
      <tbody>
        <tr className={row_class}>
          <th className="px-1 py-0.5 text-left text-[10px] font-normal">
            REUNIÓN PRE-INICIO
          </th>
          <td colSpan={2} className="px-1 py-0.5 text-[11px]">
            {format_st_reunion_pre_inicio(
              fechas.reunionPreProyecto,
              reunion_hora,
              vacio,
            )}
          </td>
        </tr>
        <tr>
          <th className="px-1 py-0.5 text-left text-[10px] font-normal">
            DÍAS DE CAMPO
          </th>
          <th className="px-1 py-0.5 text-[10px] font-normal">INICIO</th>
          <th className="px-1 py-0.5 text-[10px] font-normal">FIN</th>
        </tr>
        <tr>
          <td className="px-1 py-0.5 text-[10px] text-muted-foreground"> </td>
          <td className="px-1 py-0.5 text-[11px]">
            {format_st_fecha_celda(fechas.diasCampo.inicio, vacio)}
          </td>
          <td className="px-1 py-0.5 text-[11px]">
            {format_st_fecha_celda(fechas.diasCampo.fin, vacio)}
          </td>
        </tr>
        <tr>
          <th className="px-1 py-0.5 text-left text-[10px] font-normal">
            DÍAS DE INFORME
          </th>
          <th className="px-1 py-0.5 text-[10px] font-normal">INICIO</th>
          <th className="px-1 py-0.5 text-[10px] font-normal">FIN</th>
        </tr>
        <tr>
          <td className="px-1 py-0.5 text-[10px] text-muted-foreground"> </td>
          <td className="px-1 py-0.5 text-[11px]">
            {format_st_fecha_celda(fechas.diasInforme.inicio, vacio)}
          </td>
          <td className="px-1 py-0.5 text-[11px]">
            {format_st_fecha_celda(fechas.diasInforme.fin, vacio)}
          </td>
        </tr>
        <tr>
          <th className="px-1 py-0.5 text-left text-[10px] font-normal">
            DÍAS DE REVISIÓN
          </th>
          <th className="px-1 py-0.5 text-[10px] font-normal">INICIO</th>
          <th className="px-1 py-0.5 text-[10px] font-normal">FIN</th>
        </tr>
        <tr>
          <td className="px-1 py-0.5 text-[10px] text-muted-foreground"> </td>
          <td className="px-1 py-0.5 text-[11px]">
            {format_st_fecha_celda(fechas.diasRevision.inicio, vacio)}
          </td>
          <td className="px-1 py-0.5 text-[11px]">
            {format_st_fecha_celda(fechas.diasRevision.fin, vacio)}
          </td>
        </tr>
        <tr>
          <th className="px-1 py-0.5 text-left text-[10px] font-normal">
            FECHA ENTREGA
          </th>
          <td colSpan={2} className="px-1 py-0.5 text-[11px]">
            {/* Por ahora siempre en blanco hasta definir fuente de fecha entrega. */}
            {format_st_fecha_celda(null, true)}
          </td>
        </tr>
        <tr>
          <th className="px-1 py-0.5 text-left text-[10px] font-normal">
            DÍAS DE GARANTÍA
          </th>
          <th className="px-1 py-0.5 text-[10px] font-normal">INICIO</th>
          <th className="px-1 py-0.5 text-[10px] font-normal">FIN</th>
        </tr>
        <tr>
          <td className="px-1 py-0.5 text-[10px] text-muted-foreground"> </td>
          <td className="px-1 py-0.5 text-[11px]">
            {format_st_fecha_celda(null, true)}
          </td>
          <td className="px-1 py-0.5 text-[11px]">
            {format_st_fecha_celda(null, true)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function OsiStFechasServicioRows({
  planificadas,
  ejecutadas,
  servicio_ejecutado,
  highlight,
  hora_fallback,
}: {
  planificadas: OsiStFechasServicioSlice;
  ejecutadas: OsiStFechasServicioSlice;
  servicio_ejecutado: boolean;
  highlight?: boolean;
  hora_fallback?: string | null;
}) {
  return (
    <>
      <tr>
        <th className="text-left" colSpan={3}>
          FECHAS PLANIFICADAS DEL SERVICIO
        </th>
        <th className="text-left" colSpan={3}>
          FECHAS DE EJECUCIÓN DEL SERVICIO
        </th>
      </tr>
      <tr>
        <td
          colSpan={3}
          className={cn(
            "align-top p-1",
            highlight ? "bg-amber-50 ring-2 ring-amber-300 ring-inset" : "",
          )}
        >
          <OsiStFechasCategoriaTable
            fechas={planificadas}
            vacio={false}
            highlight={highlight}
            hora_fallback={hora_fallback}
          />
        </td>
        <td colSpan={3} className="align-top p-1">
          <OsiStFechasCategoriaTable
            fechas={ejecutadas}
            vacio={!servicio_ejecutado}
            hora_fallback={hora_fallback}
          />
        </td>
      </tr>
    </>
  );
}

function OsiSesionesDiaHoraTable({
  sessions,
  emptyFallback = "N/A",
}: {
  sessions: Array<{ fecha: string; hora: string }>;
  emptyFallback?: string;
}) {
  return (
    <table className="w-full table-fixed border-collapse">
      <tbody>
        <tr>
          <th className="border-b border-black px-1 py-0.5 text-left text-[12px]">
            DÍA
          </th>
          <th className="border-b border-black px-1 py-0.5 text-right text-[12px]">
            HORA
          </th>
        </tr>
        {sessions.length > 0 ? (
          sessions.map((session, idx) => (
            <tr key={`${session.fecha}-${idx}`}>
              <td className="border-b border-black px-1 py-0.5 text-[12px]">
                {session.fecha === OSI_FECHA_POR_PLANIFICAR_LABEL
                  ? session.fecha
                  : session.fecha
                    ? formatCalendarDayEsVe(session.fecha)
                    : "—"}
              </td>
              <td className="border-b border-black px-1 py-0.5 text-right text-[12px]">
                {session.hora}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={2} className="px-1 py-1 text-[12px]">
              {emptyFallback}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function OsiEstatusOsiRows({
  label,
  section_header_class,
}: {
  label: string;
  section_header_class: string;
}) {
  return (
    <>
      <tr>
        <th colSpan={6} className={section_header_class}>
          ESTATUS DE OSI
        </th>
      </tr>
      <tr>
        <td
          colSpan={6}
          className="py-2 text-center text-[12px] font-bold uppercase text-black"
        >
          {label}
        </td>
      </tr>
    </>
  );
}

function OsiQuejasClienteRows({
  section_header_class,
}: {
  section_header_class: string;
}) {
  return (
    <>
      <tr>
        <th colSpan={6} className={section_header_class}>
          QUEJAS, OBSERVACIONES O RECLAMOS RECIBIDOS POR EL CLIENTE
        </th>
      </tr>
      <tr>
        <td
          colSpan={6}
          className="osi-quejas-body-cell h-10 text-center text-black"
        >
          —
        </td>
      </tr>
    </>
  );
}

function OsiCierreServicioRows({
  section_header_class,
}: {
  section_header_class: string;
}) {
  return (
    <>
      <tr>
        <th colSpan={6} className={section_header_class}>
          CIERRE DEL SERVICIO EJECUTADO / LLENAR POR EL DEPARTAMENTO EJECUTANTE
        </th>
      </tr>
      <tr>
        <th className="text-[8px]">DEPARTAMENTO EJECUTANTE / NOMBRE</th>
        <th className="p-0" colSpan={3}>
          <table className="w-full h-full border-collapse">
            <tbody>
              <tr>
                <th className="w-1/3 border-r border-black border-b text-[8px] px-1 py-1 h-10">
                  OSI NOTIFICADA EL
                </th>
                <th className="w-1/3 border-r border-black border-b text-[8px] px-1 py-1 h-10">
                  FECHA DE RECEPCIÓN DE OSI
                </th>
                <th className="w-1/3 border-black border-b text-[8px] px-1 py-1 h-10">
                  FECHA DE INICIO DEL SERVICIO
                </th>
              </tr>
              <tr>
                <td className="border-r border-black text-center text-[9px] py-1">—</td>
                <td className="border-r border-black" />
                <td />
              </tr>
              <tr>
                <th
                  className="w-1/3 border-r border-black border-b text-[8px] px-1 py-1 h-10"
                  colSpan={1}
                >
                  FECHA DE FINALIZACIÓN DEL SERVICIO
                </th>
                <th colSpan={2} className="border-black border-b text-[8px] px-1 py-1 h-10" />
              </tr>
              <tr>
                <td
                  colSpan={3}
                  className="text-center font-bold text-[9px] py-1 border-b border-black"
                >
                  ¿SU DPTO. CUENTA CON TODOS LOS SOPORTES REQUERIDOS INDICADOS EN ESTA OSI?
                </td>
              </tr>
              <tr>
                <th
                  colSpan={3}
                  className="text-left px-2 py-1 text-[8px] font-bold"
                  style={{ background: "transparent" }}
                >
                  DE SER NO, JUSTIFIQUE
                </th>
              </tr>
            </tbody>
          </table>
        </th>
        <th className="p-0" colSpan={2}>
          <table className="w-full h-full border-collapse">
            <tbody>
              <tr>
                <th colSpan={2} className="border-b border-black text-[9px] py-1">
                  RESPONSABLE DEL DPTO.
                </th>
              </tr>
              <tr>
                <th
                  className="w-1/2 border-r border-b border-black text-[9px] py-1 h-8"
                  style={{ background: "transparent" }}
                >
                  NOMBRE Y APELLIDO
                </th>
                <th
                  className="w-1/2 border-b border-black text-[9px] py-1 h-8"
                  style={{ background: "transparent" }}
                >
                  FIRMA
                </th>
              </tr>
              <tr>
                <td colSpan={2} className="h-10" />
              </tr>
            </tbody>
          </table>
        </th>
      </tr>
      <tr>
        <th className="h-8 align-middle text-left bg-transparent">REQUISICIONES</th>
        <th className="p-0" colSpan={5}>
          <table className="w-full h-full border-collapse">
            <tbody>
              <tr>
                <th
                  className="w-[15%] text-[9px] border-r border-black"
                  style={{ background: "transparent" }}
                >
                  CANTIDAD
                </th>
                <th
                  className="w-[35%] text-[9px] border-r border-black"
                  style={{ background: "transparent" }}
                >
                  DETALLE
                </th>
                <th
                  className="w-[20%] text-[9px] border-r border-black"
                  style={{ background: "transparent" }}
                >
                  N° SOLICITUD(ES) DE ORDEN DE COMPRA
                </th>
                <th
                  className="w-[15%] text-[9px] border-r border-black"
                  style={{ background: "transparent" }}
                >
                  CANTIDAD
                </th>
                <th className="w-[15%] text-[9px]" style={{ background: "transparent" }}>
                  DETALLE
                </th>
              </tr>
            </tbody>
          </table>
        </th>
      </tr>
      <tr>
        <td className="p-0 border-0" colSpan={6}>
          <table className="w-full border-collapse h-full [&_td]:border [&_td]:border-black [&_td]:px-1 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1 [&_th]:py-1">
            <tbody>
              <tr>
                <th className="w-[15%] bg-transparent border-t-0 border-l-0 border-b-0 border-r-0" />
                <th className="w-[25%] bg-slate-100">GENERACIÓN DE SOPORTE</th>
                <th className="w-[40%] bg-slate-100" colSpan={2}>
                  VALIDACIÓN DE SOPORTES
                </th>
                <th className="w-[20%] bg-slate-100">VERIFICACIÓN DE SOPORTES</th>
              </tr>
              <tr>
                <th className="text-left text-[9px] bg-transparent font-bold">
                  NOMBRE Y APELLIDO:
                </th>
                <td className="h-6" />
                <td className="h-6 w-[20%]" />
                <td className="h-6 w-[20%]" />
                <td className="h-6" />
              </tr>
              <tr>
                <th className="text-left text-[9px] bg-transparent font-bold">CARGO:</th>
                <td className="text-center font-bold text-[8px]">[DEPARTAMENTO SOLICITANTE]</td>
                <td className="text-center font-bold text-[8px]">[QHSE]</td>
                <td className="text-center font-bold text-[8px]">[NEGOCIOS]</td>
                <td className="text-center font-bold text-[8px]">DIRECTOR GERENTE</td>
              </tr>
              <tr>
                <th className="text-left text-[9px] bg-transparent font-bold">FIRMA:</th>
                <td className="h-8" />
                <td className="h-8" />
                <td className="h-8" />
                <td className="h-8" />
              </tr>
              <tr>
                <th className="text-left text-[9px] bg-transparent font-bold">FECHA:</th>
                <td className="h-6" />
                <td className="h-6" />
                <td className="h-6" />
                <td className="h-6" />
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </>
  );
}

function OsiStDetalleUnificadoRows({
  stServicios,
  servicio,
  detalleServicio,
  pretensionesItems,
  observacionesItems,
}: {
  stServicios?: OsiPreviewData["stServicios"];
  servicio: string | null;
  detalleServicio: string | null;
  pretensionesItems: Array<{
    servicio?: string;
    fuente: "SOLPED" | "OSI";
    contenido: string;
  }>;
  observacionesItems: OsiObservacionDocumentItem[];
}) {
  const has_st_servicios = (stServicios ?? []).length > 0;
  return (
    <>
      <tr>
        <td
          colSpan={6}
          className={cn(
            OSI_GROW_CELL_CLASS,
            "osi-long-text min-h-12 max-w-0 relative !text-left px-2 py-2 text-black",
          )}
          data-osi-grow-weight="0.3"
          data-osi-grow-base="72"
        >
          <div className="space-y-3 text-black">
            <div className="border-b border-dashed pb-2">
              <div className="text-[12px] font-bold uppercase text-black">
                SERVICIO / DETALLE
              </div>
              {has_st_servicios ? (
                <div className="mt-1 space-y-2">
                  {stServicios!.map((svc, idx) => (
                    <div key={`st-detalle-${idx}`}>
                      <div className="font-semibold">{svc.nombre}</div>
                      {svc.detalle ? (
                        <OsiRichHtmlContent
                          content={svc.detalle}
                          className="text-black"
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-1 space-y-1">
                  <div className="font-semibold">{servicio || "N/A"}</div>
                  {detalleServicio ? (
                    <OsiRichHtmlContent
                      content={detalleServicio}
                      className="text-black"
                    />
                  ) : null}
                </div>
              )}
            </div>
            <div className="border-b border-dashed pb-2">
              <div className="text-[12px] font-bold uppercase text-black">
                PRETENSIONES DEL CLIENTE
              </div>
              {pretensionesItems.length > 0 ? (
                <div className="mt-1 space-y-2">
                  {pretensionesItems.map((item, idx) => (
                    <div key={`st-pret-${idx}`}>
                      <div className="text-[11px] font-bold uppercase text-black">
                        {item.servicio
                          ? `${item.servicio} — ${item.fuente}`
                          : item.fuente}
                      </div>
                      <OsiRichHtmlContent
                        content={item.contenido}
                        className="text-black"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-black">Sin pretensiones</span>
              )}
            </div>
            <div>
              <div className="text-[12px] font-bold uppercase text-black">
                OBSERVACIONES ADICIONALES
              </div>
              {observacionesItems.length > 0 ? (
                <OsiObservacionesContent items={observacionesItems} />
              ) : (
                <span className="text-black">N/A</span>
              )}
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

export function OsiDocumentView({ data, assets }: { data: OsiPreviewData; assets: OsiDocumentAssets }) {
  const section_header_class =
    "py-2 text-center text-[12px] font-bold text-[#002b5c] bg-slate-200";
  const section_text_black_class =
    "py-2 text-center text-[12px] font-bold text-black bg-slate-200";
  const sesiones_programadas_raw = Array.isArray(data.sesionesProgramadas)
    ? data.sesionesProgramadas
    : [];
  const sesionesDoc = resolve_osi_sesiones_documento_count({
    sesiones_solped: data.sesionesSolped,
    sesiones_programadas: sesiones_programadas_raw,
  });
  const hl = data.previewHighlights ?? {};
  const is_public_view = Boolean(data.isPublicView);
  const hide_st_monetary = Boolean(data.hideStMonetary);
  const is_hidden = (key: string) =>
    hide_st_monetary ||
    (is_public_view && Boolean(data.publicCostMask?.[key]));
  const recursos_layout = build_osi_recursos_layout(data);
  const participantesDoc =
    data.participantesDocumento != null && data.participantesDocumento >= 0
      ? data.participantesDocumento
      : data.participantesMaxSolped;
  const form_meta = data.isCapacitacion ? OSI_FORM_META_CAP : OSI_FORM_META_ST;
  const cellHl = (on: boolean | undefined) =>
    on ? "bg-amber-50 ring-2 ring-amber-300 ring-inset" : "";
  const pretensiones_por_servicio = st_lines_with_field(
    data.stServicios,
    "pretensiones",
  );
  const content_hidden = (key: string) => Boolean(data.publicCostMask?.[key]);
  const pretensiones_items: Array<{
    servicio?: string;
    fuente: "SOLPED" | "OSI";
    contenido: string;
    maskKey?: string;
  }> = [];
  for (const svc of pretensiones_por_servicio) {
    const contenido = String(svc.pretensiones ?? "").trim();
    if (!contenido) continue;
    const maskKey = `osi_content_hidden:pret:${pretensiones_items.length}`;
    pretensiones_items.push({
      servicio: svc.nombre,
      fuente: "SOLPED",
      contenido,
      maskKey,
    });
  }
  if (pretensiones_items.length === 0) {
    const pret_solped = String(data.pretensionesSolped ?? "").trim();
    if (pret_solped.length > 0) {
      pretensiones_items.push({
        fuente: "SOLPED",
        contenido: pret_solped,
        maskKey: "osi_content_hidden:pret:base",
      });
    }
  }
  const pretensiones_items_visible = pretensiones_items.filter(
    (item) => !item.maskKey || !content_hidden(item.maskKey),
  );

  const observaciones_items = build_osi_observaciones_document_items({
    stServicios: data.stServicios,
    observacionesSolped: data.observacionesSolped,
    observacionesOsiSolicitud: data.observacionesOsiSolicitud,
    observacionesOsi: data.observacionesOsi,
    hideOsiSolicitud: content_hidden("osi_content_hidden:osi_solicitud_obs"),
  });
  const observaciones_items_visible = observaciones_items.filter(
    (item) => !item.maskKey || !content_hidden(item.maskKey),
  );

  const sesiones_fecha_planificada_detalle = map_sesiones_planificadas_dia_hora(
    data.sesionesFechaPlanificada ?? data.sesionesProgramadas,
    sesionesDoc ?? undefined,
  );
  const sesiones_fecha_ejecutada_detalle = map_sesiones_ejecutada_dia_hora(
    data.sesionesFechaEjecutada,
  );

  const show_desglose_tail =
    recursos_layout.esPorSesion &&
    recursos_layout.variaciones.length > 0 &&
    recursos_layout.variacionColumnas.length > 0;

  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reset_print_fill = () => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      distribute_osi_page1_fill(sheet, 0);
    };

    const apply_print_fill = () => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      reset_print_fill();
      const gap = compute_osi_page1_fill_gap(sheet);
      if (gap > 0) {
        distribute_osi_page1_fill(sheet, Math.round(gap * 0.88));
      }
    };

    reset_print_fill();
    window.addEventListener("beforeprint", apply_print_fill);
    window.addEventListener("afterprint", reset_print_fill);
    return () => {
      window.removeEventListener("beforeprint", apply_print_fill);
      window.removeEventListener("afterprint", reset_print_fill);
      reset_print_fill();
    };
  }, [data, recursos_layout]);

  return (
    <div className={cn("print-document-palette osi-document-root mx-auto mt-4 box-border w-[210mm] max-w-full overflow-hidden bg-white print:mt-3 print:w-full text-black shadow-sm print:shadow-none", OSI_DOC_ROOT_TEXT_CLASS)}>
      <style>{`
        @page {
          size: letter;
          margin: 10mm;
          @top-right {
            content: "PÁGINA " counter(page) " DE " counter(pages);
            font-size: 8pt;
            font-family: Arial, sans-serif;
          }
        }
        [data-osi-table] {
          table-layout: fixed;
          width: 100%;
        }
        [data-osi-table] td,
        [data-osi-table] th {
          overflow-wrap: normal;
          word-break: normal;
          hyphens: none;
          box-sizing: border-box;
        }
        [data-osi-table] table {
          table-layout: fixed;
          width: 100%;
        }
        [data-osi-table] table th,
        [data-osi-table] table td {
          overflow-wrap: normal;
          word-break: normal;
          white-space: normal;
          hyphens: none;
          text-align: center;
          vertical-align: middle;
          padding: 4px 2px;
          box-sizing: border-box;
          font-size: 12px;
          line-height: 1.3;
          text-transform: uppercase;
        }
        [data-osi-table] .osi-nested-table col.osi-col-dias { width: 44%; }
        [data-osi-table] .osi-nested-table col.osi-col-costo { width: 22%; }
        [data-osi-table] .osi-nested-table col.osi-col-total { width: 34%; }
        [data-osi-table] .osi-label-xs,
        [data-osi-table] .osi-label-sm,
        [data-osi-table] .osi-label-md {
          font-size: 12px;
          line-height: 1.3;
        }
        [data-osi-table] .osi-doc-value {
          font-size: 12px;
          line-height: 1.3;
        }
        [data-osi-table] .osi-boolean-value {
          font-size: 12px;
          line-height: 1.3;
          font-weight: 700;
          text-transform: uppercase;
        }
        [data-osi-table] .osi-cert-table th,
        [data-osi-table] .osi-cert-table td {
          font-size: 12px;
          line-height: 1.3;
          font-weight: 700;
        }
        [data-osi-table] .osi-cert-table th.osi-cert-label {
          font-size: 12px;
          line-height: 1.3;
          padding: 4px 2px;
        }
        [data-osi-table] .osi-th-nowrap {
          white-space: nowrap;
        }
        [data-osi-table] .osi-long-text {
          white-space: pre-wrap;
          overflow-wrap: break-word;
          word-break: break-word;
          text-transform: uppercase;
        }
        [data-osi-table] .osi-rich-html,
        [data-osi-table] .rich-html-content {
          text-transform: uppercase;
        }
        @media print {
          html, body { margin: 0; padding: 0; background: #fff; }
          .osi-print-sheet {
            width: 100%;
            box-sizing: border-box;
            padding: 0;
          }
          .osi-print-sheet img {
            max-width: 100%;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .osi-print-unit {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .osi-print-unit + .osi-print-unit {
            margin-top: -1px;
          }
          .osi-print-grow {
            vertical-align: top;
          }
          .osi-print-footer-flow {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          [data-osi-table] td,
          [data-osi-table] th {
            padding-top: 2px !important;
            padding-bottom: 2px !important;
          }
          [data-osi-table] td.osi-quejas-body-cell {
            height: 2.5rem !important;
            min-height: 2.5rem !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
        }
      `}</style>
      <div ref={sheetRef} className="osi-print-sheet p-0.5 print:p-0">
        {/* Header section */}
        <div className="osi-print-header mb-2 flex items-start justify-between gap-2">
          <div className="flex w-[170px] items-center">
            <img
              src={assets.logoSrc}
              alt="SHA DE VENEZUELA" 
              width={170}
              height={40}
              loading="eager"
              decoding="async"
              className="block h-10 w-auto object-contain"
            />
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-[16px] font-bold tracking-wide text-[#002b5c] leading-none">
              ORDEN DE SERVICIO INTERNA
            </h1>
          </div>
          <div className="w-[170px] text-[11px] text-slate-700">
            <div className="grid grid-cols-[60px_1fr] gap-x-2">
              <span className="font-bold">CÓDIGO</span>
              <span>{form_meta.codigo}</span>
              <span className="font-bold">FECHA</span>
              <span>{form_meta.fecha}</span>
              <span className="font-bold">REVISIÓN</span>
              <span>{form_meta.revision}</span>
            </div>
          </div>
        </div>

        {/* Bloque 1: inicio — detalle del servicio */}
        <table
          data-osi-table
          className={cn(OSI_TABLE_CLASS, "osi-print-unit")}
        >
          <tbody>
            <tr>
              <th>FECHA</th>
              <th>N° TRATO</th>
              <th>N° SOLPED</th>
              <th>N° PPTO</th>
              <th>N° DE ORDEN DE COMPRA</th>
              <th>N° OSI</th>
            </tr>
            <tr>
              <td className="text-center">
                {data.fechaDocumento || data.fechaEmisionPresupuesto || "N/A"}
              </td>
              <td className="text-center">{data.nroTrato || "N/A"}</td>
              <td className="text-center">{data.nroSolped || "N/A"}</td>
              <td className="text-center">{data.nroPresupuesto || "N/A"}</td>
              <td className="text-center">{data.nroOrdenCompra || "N/A"}</td>
              <td className="text-center font-bold text-red-600">
                {data.nroOsi || "N/A"}
              </td>
            </tr>

            <tr>
              <th colSpan={3}>EJECUTIVO DE NEGOCIOS</th>
              <th colSpan={3}>TIPO DE SERVICIO</th>
            </tr>
            <tr>
              <td colSpan={3}>{data.ejecutivoNegocios || "N/A"}</td>
              <td colSpan={3}>{data.tipoServicio || "N/A"}</td>
            </tr>

            <tr>
              <th
                colSpan={6}
                className="py-2 text-center text-[12px] font-bold text-[#002b5c] bg-slate-200"
              >
                DATOS DEL CLIENTE
              </th>
            </tr>

            <tr>
              <th className="text-left" colSpan={3}>NOMBRE DE LA EMPRESA</th>
              <th className="text-left">SEDE</th>
              <th className="text-left" colSpan={2}>RIF</th>
            </tr>
            <tr>
              <td colSpan={3}>{data.nombreEmpresa || "N/A"}</td>
              <td>{data.sede?.trim() ? data.sede : "—"}</td>
              <td colSpan={2}>{data.clienteRif || "N/A"}</td>
            </tr>
            <tr>
              <th className="text-left" colSpan={2}>DIRECCIÓN DE EJECUCIÓN DEL SERVICIO</th>
              <td
                colSpan={4}
                className={cn("!text-left", cellHl(hl.direccionEjecucion))}
              >
                {data.direccionEjecucion || "N/A"}
              </td>
            </tr>
            <tr>
              <th className="text-left" colSpan={2}>DIRECCIÓN DE ENVÍO DEL SERVICIO</th>
              <td colSpan={4} className="!text-left">{data.direccionEnvio || "N/A"}</td>
            </tr>

            <tr>
              <th className="text-center" colSpan={3}>PERSONA CONTACTO</th>
              <th className="text-center">NÚMERO TELEFÓNICO</th>
              <th className="text-center" colSpan={2}>CORREO ELECTRÓNICO</th>
            </tr>
            <tr>
              <td className="text-center" colSpan={3}>{data.personaContacto || "N/A"}</td>
              <td className="text-center">{data.contactoTelefono || "N/A"}</td>
              <td className="break-all text-center text-[12px]" colSpan={2}>
                {data.contactoEmail || "N/A"}
              </td>
            </tr>

            <tr>
              <th colSpan={6} className={section_header_class}>
                DETALLE DEL SERVICIO
              </th>
            </tr>

            {data.isCapacitacion ? (
              <>
                <tr>
                  <td
                    colSpan={6}
                    className={cn(
                      OSI_GROW_CELL_CLASS,
                      "relative !text-left",
                      cellHl(hl.detalle),
                    )}
                    data-osi-grow-weight="0.3"
                    data-osi-grow-base="56"
                  >
                    <div className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center opacity-10">
                      <img
                        src={assets.logoSrc}
                        alt=""
                        width={64}
                        height={64}
                        loading="eager"
                        decoding="async"
                        className="h-16 w-16 object-contain opacity-10"
                      />
                    </div>
                    <span className="relative z-10">
                      {data.detalleServicio || data.servicio || "N/A"}
                    </span>
                  </td>
                </tr>
                <OsiPretensionesRows
                  items={pretensiones_items_visible}
                  section_text_class={section_text_black_class}
                />
                <OsiObservacionesRows
                  items={observaciones_items_visible}
                  section_text_class={section_text_black_class}
                />
                <tr>
                  <th className="text-left" colSpan={3}>SERVICIO</th>
                  <th className="text-left">N° PARTICIPANTES</th>
                  <th className="text-left">N SESIONES</th>
                  <th className="text-left">N HORAS</th>
                </tr>
                <tr>
                  <td colSpan={3} className="!text-left text-[12px] leading-snug">
                    {data.servicio || "N/A"}
                  </td>
                  <td
                    className={cn(
                      "text-center font-bold text-[12px]",
                      cellHl(hl.participantes),
                    )}
                  >
                    {participantesDoc != null ? String(participantesDoc) : "N/A"}
                  </td>
                  <td
                    className={cn("text-center", cellHl(hl.fechaServicio))}
                  >
                    {sesionesDoc != null ? String(sesionesDoc) : "N/A"}
                  </td>
                  <td className="text-center">
                    {data.horasAcademicasSolped ?? "N/A"}
                  </td>
                </tr>
                <tr>
                  <th className="text-left" colSpan={3}>FECHA PLANIFICADA</th>
                  <th className="text-left" colSpan={3}>FECHA EJECUTADA</th>
                </tr>
                <tr>
                  <td
                    colSpan={3}
                    className={cn("align-top", cellHl(hl.fechaServicio))}
                  >
                    <OsiSesionesDiaHoraTable
                      sessions={sesiones_fecha_planificada_detalle}
                    />
                  </td>
                  <td colSpan={3} className="align-top">
                    <OsiSesionesDiaHoraTable
                      sessions={sesiones_fecha_ejecutada_detalle}
                      emptyFallback="—"
                    />
                  </td>
                </tr>
              </>
            ) : (
              <>
                <OsiStDetalleUnificadoRows
                  stServicios={data.stServicios}
                  servicio={data.servicio}
                  detalleServicio={data.detalleServicio}
                  pretensionesItems={pretensiones_items_visible}
                  observacionesItems={observaciones_items_visible}
                />
                <OsiStFechasServicioRows
                  planificadas={
                    data.stFechasPlanificadas ??
                    build_st_fechas_ejecutadas_vacias()
                  }
                  ejecutadas={
                    data.stFechasEjecutadas ??
                    build_st_fechas_ejecutadas_vacias()
                  }
                  servicio_ejecutado={Boolean(data.stServicioEjecutado)}
                  highlight={hl.fechaServicio}
                  hora_fallback={
                    data.horaInicioServicio ||
                    data.sesionesProgramadas?.find((s) =>
                      String(s.hora_inicio ?? "").trim(),
                    )?.hora_inicio ||
                    null
                  }
                />
              </>
            )}
          </tbody>
        </table>

        {/* Bloque 2: recursos estimados para el servicio */}
        <table
          data-osi-table
          className={cn(OSI_TABLE_CLASS, "osi-print-unit")}
        >
          <tbody>
            {data.isCapacitacion ? (
              <OsiCapacitacionRecursosBlocks
                layout={recursos_layout}
                is_hidden={is_hidden}
                section_header_class={section_header_class}
                include_desglose={false}
              />
            ) : (
              <OsiStRecursosBlocks
                layout={recursos_layout}
                is_hidden={is_hidden}
                section_header_class={section_header_class}
                include_desglose={false}
              />
            )}
          </tbody>
        </table>

        {/* Cola: cada sub-bloque evita corte interno pero puede empezar en pág. 1 si cabe */}
        {data.isCapacitacion || show_desglose_tail ? (
          <table
            data-osi-table
            className={cn(OSI_TABLE_CLASS, "osi-print-unit", "osi-print-tail")}
          >
            <tbody>
              {data.isCapacitacion ? (
                <OsiCapDesgloseDiarioRows
                  layout={recursos_layout}
                  section_header_class={section_header_class}
                  maskMonetary={is_hidden("gran_total")}
                />
              ) : (
                <OsiRecursosVariacionesRows
                  layout={recursos_layout}
                  section_header_class={section_header_class}
                  maskMonetary={is_hidden("gran_total")}
                />
              )}
            </tbody>
          </table>
        ) : null}

        <table
          data-osi-table
          className={cn(OSI_TABLE_CLASS, "osi-print-unit", "osi-print-tail")}
        >
          <tbody>
            <OsiQuejasClienteRows section_header_class={section_header_class} />
          </tbody>
        </table>

        <table
          data-osi-table
          className={cn(OSI_TABLE_CLASS, "osi-print-unit", "osi-print-tail")}
        >
          <tbody>
            <OsiEstatusOsiRows
              label={data.estatusOsiLabel || "N/A"}
              section_header_class={section_header_class}
            />

            {data.showCierreSection ? (
              <OsiCierreServicioRows section_header_class={section_header_class} />
            ) : null}
          </tbody>
        </table>

        {/* Pie pegado al contenido (pantalla e impresión) */}
        <div className="osi-print-footer-flow mt-0 w-full">
          <img
            src={assets.footerSrc}
            alt="Pie institucional"
            width={1280}
            height={120}
            loading="eager"
            decoding="async"
            className="mx-auto block h-auto w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}

