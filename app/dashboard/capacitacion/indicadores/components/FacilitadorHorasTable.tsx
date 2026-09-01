"use client";

import { Download } from "lucide-react";
import type { FacilitadoresHorasResponse } from "@/types";

interface Props {
  data: FacilitadoresHorasResponse;
}

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

/** Format hours: integers as-is, decimals with up to 2 decimal places. */
function formatHoras(v: number): string {
  if (v === 0) return "—";
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/\.?0+$/, "");
}

/** Format a USD amount with thousands separators and a `$` prefix. */
function formatMonto(v: number): string {
  if (v === 0) return "—";
  return `$${v.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function escapeCsv(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(lines: string[], filename: string) {
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportCsv(data: FacilitadoresHorasResponse) {
  const headers = [
    "Facilitador",
    ...MONTH_LABELS,
    "NRO TOTAL DE CURSOS EN EL AÑO",
    "NRO TOTAL DE HORAS EN EL AÑO",
    "MONTO TOTAL EN $",
  ];
  const lines = [headers.map(escapeCsv).join(",")];
  for (const f of data.facilitadores) {
    lines.push(
      [
        f.nombre,
        ...f.horasPorMes,
        f.totalCursos,
        f.totalHoras,
        f.totalMonto.toFixed(2),
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  downloadCsv(lines, `indicadores-facilitadores-${data.year}.csv`);
}

export default function FacilitadorHorasTable({ data }: Props) {
  const totalHorasGeneral = data.facilitadores.reduce(
    (sum, f) => sum + f.totalHoras,
    0,
  );
  const totalMontoGeneral = data.facilitadores.reduce(
    (sum, f) => sum + f.totalMonto,
    0,
  );
  const totalCursosGeneral = data.facilitadores.reduce(
    (sum, f) => sum + f.totalCursos,
    0,
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Horas y honorarios por facilitador · {data.year}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Horas según requisición · OSI como respaldo · monto = tarifa × horas
          </p>
        </div>
        <button
          onClick={() => exportCsv(data)}
          disabled={data.facilitadores.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
      </div>
      <div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="bg-gray-50 text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Facilitador
              </th>
              {MONTH_LABELS.map((label) => (
                <th
                  key={label}
                  className="px-2 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  {label}
                </th>
              ))}
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide border-l border-gray-200">
                Cursos
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Horas
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Monto $
              </th>
            </tr>
          </thead>
          <tbody>
            {data.facilitadores.map((f) => (
              <tr key={f.facilitadorId} className="border-t border-gray-100">
                <th
                  scope="row"
                  className="bg-white text-left px-4 py-2 font-medium text-gray-700"
                >
                  {f.nombre}
                  {f.cursosEstimados > 0 && (
                    <span
                      className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 align-middle"
                      title={`Horas estimadas desde el OSI — sin requisición para ${f.cursosEstimados} curso(s)`}
                    >
                      {f.cursosEstimados} según OSI
                    </span>
                  )}
                </th>
                {f.horasPorMes.map((horas, i) => (
                  <td
                    key={i}
                    className={`px-2 py-2 text-center tabular-nums ${
                      horas === 0 ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {horas === 0 ? "—" : formatHoras(horas)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900 border-l border-gray-200">
                  {f.totalCursos}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900">
                  {formatHoras(f.totalHoras)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900">
                  {formatMonto(f.totalMonto)}
                </td>
              </tr>
            ))}
            {data.facilitadores.length === 0 && (
              <tr>
                <td
                  colSpan={16}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  No hay requisiciones ni OSIs con horas en {data.year} con
                  facilitador asignado.
                </td>
              </tr>
            )}
          </tbody>
          {data.facilitadores.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold text-gray-900">
                <th
                  scope="row"
                  className="bg-gray-50 text-left px-4 py-2.5 text-xs uppercase tracking-wide"
                >
                  Total
                </th>
                {MONTH_LABELS.map((_, i) => {
                  const monthTotal = data.facilitadores.reduce(
                    (sum, f) => sum + f.horasPorMes[i],
                    0,
                  );
                  return (
                    <td
                      key={i}
                      className={`px-2 py-2.5 text-center tabular-nums ${
                        monthTotal === 0 ? "text-gray-300" : ""
                      }`}
                    >
                      {monthTotal === 0 ? "—" : formatHoras(monthTotal)}
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 text-right tabular-nums border-l border-gray-200">
                  {totalCursosGeneral}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatHoras(totalHorasGeneral)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatMonto(totalMontoGeneral)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="px-5 py-3 text-[11px] text-gray-400 border-t border-gray-100">
        Horas según requisición (no rechazada): osi_fixed_items[].honorarios_horas.
        Cuando no hay requisición para un OSI, se usan las horas del OSI
        (horas_honorarios_instructor) divididas entre sesiones y asignadas
        según facilitador_osi_assignments (sesión específica primero; asignación
        general dividida entre co-facilitadores). Monto = tarifa × horas
        (honorarios_costo_hora / tarifa_hora_honorarios), con el total almacenado
        como respaldo. Cursos = total de OSIs dictados en el año. La etiqueta
        &quot;según OSI&quot; indica cursos cuya horas vienen del respaldo, no de
        una requisición.
      </p>
    </div>
  );
}
