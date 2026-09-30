"use client";

/** Compact TOTAL + “segmentado por sesión” cell used in consolidado. */
export function SegmentadoPorSesionTable({
  title,
  total,
  totalHidden,
}: {
  title?: string;
  total: number;
  totalHidden?: boolean;
}) {
  const show_total = !totalHidden && total > 0;
  return (
    <table className="osi-nested-table w-full table-fixed border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
      <colgroup>
        <col className="w-1/2" />
        <col className="w-1/2" />
      </colgroup>
      <tbody>
        {title ? (
          <tr>
            <th
              colSpan={2}
              className="bg-slate-100 text-black osi-label-md px-0.5 py-0.5 leading-tight"
            >
              {title}
            </th>
          </tr>
        ) : null}
        <tr>
          <th className="osi-label-sm px-0.5 py-0.5 leading-tight">TOTAL</th>
          <th className="osi-label-sm px-0.5 py-0.5 leading-tight">
            SEGMENTADO POR
            <br />
            SESIÓN
          </th>
        </tr>
        <tr>
          <td className="osi-doc-value text-center h-8 font-semibold">
            {show_total ? `$${total.toFixed(2)}` : "N/A"}
          </td>
          <td className="osi-doc-value text-center h-8 leading-tight px-0.5">
            Ver costo por
            <br />
            sesión abajo
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Inline variant for simple header/value cells (impresión, traslado, otros…). */
export function SegmentadoPorSesionInline({
  total,
  totalHidden,
}: {
  total: number;
  totalHidden?: boolean;
}) {
  const show_total = !totalHidden && total > 0;
  return (
    <div className="flex h-full min-h-8 flex-col items-stretch justify-center gap-0.5 px-0.5 py-0.5 text-center">
      <div className="osi-label-md font-bold uppercase leading-tight text-slate-700">
        Total
      </div>
      <div className="osi-doc-value font-semibold leading-tight">
        {show_total ? `$${total.toFixed(2)}` : "N/A"}
      </div>
      <div className="osi-doc-value leading-tight text-slate-600">
        Segmentado por sesión · ver abajo
      </div>
    </div>
  );
}

export function format_money_or_dash(
  value: number,
  hidden?: boolean,
): string {
  if (hidden || !(value > 0)) return "N/A";
  return `$${value.toFixed(2)}`;
}
