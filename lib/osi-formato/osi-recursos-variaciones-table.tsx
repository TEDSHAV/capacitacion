"use client";

import type {
  OsiBadgeTone,
  OsiRecursosLayout,
  OsiVariacionCelda,
} from "./osi-recursos-layout";

function badge_class(tone: OsiBadgeTone): string {
  const base =
    "inline-flex max-w-full items-center justify-center gap-0.5 rounded " +
    "px-1.5 py-0.5 osi-doc-value font-semibold whitespace-nowrap";
  if (tone === "up") {
    return `${base} bg-amber-100 text-amber-950 ring-1 ring-amber-300/80`;
  }
  return `${base} bg-sky-100 text-sky-950 ring-1 ring-sky-300/80`;
}

function CellValue({
  celda,
  allow_badge,
}: {
  celda: OsiVariacionCelda;
  allow_badge: boolean;
}) {
  if (celda.texto === "N/A") {
    return <span className="osi-doc-value text-slate-500">N/A</span>;
  }
  // TOTAL SESIÓN y tonos base: siempre texto plano.
  if (!allow_badge || celda.tone === "base") {
    return (
      <span className="osi-doc-value font-medium tabular-nums text-slate-900 whitespace-nowrap">
        {celda.texto}
      </span>
    );
  }
  const arrow = celda.tone === "up" ? "↗" : "↘";
  return (
    <span className={badge_class(celda.tone)}>
      <span className="tabular-nums">{celda.texto}</span>
      <span aria-hidden="true">{arrow}</span>
    </span>
  );
}

function format_footer_money(
  value: number | undefined,
  hidden?: boolean,
): string {
  if (hidden || value == null || !(value > 0)) return "N/A";
  return `$${value.toFixed(2)}`;
}

const NON_MONETARY_VARIATION_KEYS = new Set([
  "sesion",
  "pop",
  "st_dias",
  "st_impresion_flag",
  "st_bateria_flag",
]);

/**
 * Daily detail table: every session cost column + TOTALES footer
 * that mirrors the upper resumen 1:1.
 */
export function OsiRecursosVariacionesTable({
  layout,
  maskMonetary,
}: {
  layout: OsiRecursosLayout;
  maskMonetary?: boolean;
}) {
  const columnas = layout.variacionColumnas;
  const filas = layout.variaciones;
  const footer = layout.variacionTotales;
  if (columnas.length === 0 || filas.length === 0) return null;

  return (
    <table className="w-full border-collapse [&_td]:border [&_td]:border-slate-400 [&_th]:border [&_th]:border-slate-400">
      <thead>
        <tr className="bg-slate-100">
          {columnas.map((col) => (
            <th
              key={col.key}
              className="px-1.5 py-1.5 text-center osi-label-md font-bold uppercase leading-tight tracking-tight text-slate-700"
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((fila, idx) => {
          const nro = fila.nroSesion ? `Sesión ${fila.nroSesion}` : "Sesión";
          const fecha = fila.fecha ? ` (${fila.fecha})` : "";
          return (
            <tr key={`osi-var-row-${idx}`} className="align-middle">
              {columnas.map((col) => {
                if (col.key === "sesion") {
                  return (
                    <td
                      key={col.key}
                      className="px-1.5 py-1.5 text-left osi-doc-value font-semibold leading-snug"
                    >
                      {nro}
                      {fecha}
                    </td>
                  );
                }
                const celda = fila.celdas[col.key];
                const hide_money =
                  Boolean(maskMonetary) &&
                  !NON_MONETARY_VARIATION_KEYS.has(col.key);
                return (
                  <td key={col.key} className="px-1.5 py-1.5 text-center">
                    {celda && !hide_money ? (
                      <CellValue
                        celda={celda}
                        allow_badge={col.key !== "total_sesion"}
                      />
                    ) : (
                      "N/A"
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
        <tr className="bg-slate-50 font-bold">
          {columnas.map((col) => {
            if (col.key === "sesion") {
              return (
                <td
                  key={col.key}
                  className="px-1.5 py-1.5 text-left osi-doc-value uppercase"
                >
                  Totales
                </td>
              );
            }
            const amount = footer[col.key];
            const hide_money =
              Boolean(maskMonetary) &&
              !NON_MONETARY_VARIATION_KEYS.has(col.key);
            return (
              <td
                key={col.key}
                className="px-1.5 py-1.5 text-center osi-doc-value tabular-nums"
              >
                {format_footer_money(amount, hide_money)}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}
