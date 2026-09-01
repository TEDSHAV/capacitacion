"use client";

import type { GestionMesIndicadores, GestionMensualResponse } from "@/types";

interface Props {
  data: GestionMensualResponse;
  /** "YYYY-MM" of the highlighted column. */
  selectedMes: string;
  onSelectMes: (mes: string) => void;
}

type RowDef = {
  key: string;
  label: string;
  get: (m: GestionMesIndicadores) => number;
  /** Renders indented and muted — a breakdown of the row above it. */
  sub?: boolean;
  /** Draws a thicker top border, opening a new block of indicators. */
  groupStart?: boolean;
  /** Footnote marker appended to the label. */
  note?: string;
};

const ROWS: RowDef[] = [
  {
    key: "recibidas",
    label: "OSIs recibidas",
    get: (m) => m.osisRecibidas,
  },
  {
    key: "planificadas",
    label: "OSIs planificadas",
    get: (m) => m.osisPlanificadas,
  },
  {
    key: "ejecutadasEnSuMes",
    label: "Ejecutadas en su mes",
    get: (m) => m.osisEjecutadasEnSuMes,
  },
  {
    key: "pendientes",
    label: "Pendientes del mes",
    get: (m) => m.osisPendientes,
  },
  {
    key: "pendientesVencidas",
    label: "con fecha ya pasada",
    get: (m) => m.osisPendientesVencidas,
    sub: true,
  },
  {
    key: "rezagadas",
    label: "Ejecutadas de meses anteriores",
    get: (m) => m.osisRezagadasEjecutadas,
  },
  {
    key: "participantesPlanificados",
    label: "Participantes planificados",
    get: (m) => m.participantesPlanificados,
    groupStart: true,
  },
  {
    key: "participantesLista",
    label: "Participantes asistidos (por mes de ejecución)",
    get: (m) => m.participantesLista,
  },
  {
    key: "certificados",
    label: "Certificados emitidos (por mes de emisión)",
    get: (m) => m.certificados,
    groupStart: true,
  },
  {
    key: "pvc",
    label: "PVC (carnets) emitidos",
    get: (m) => m.pvc,
  },
];

export default function GestionMensualTable({
  data,
  selectedMes,
  onSelectMes,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          Matriz mensual · {data.year}
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Clic en un mes para ver sus tarjetas arriba
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[240px]">
                Indicador
              </th>
              {data.meses.map((m) => {
                const active = m.mes === selectedMes;
                return (
                  <th key={m.mes} className="px-1 py-1.5">
                    <button
                      onClick={() => onSelectMes(m.mes)}
                      className={`w-full px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                        active
                          ? "bg-sky-600 text-white"
                          : "text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {m.label}
                    </button>
                  </th>
                );
              })}
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide border-l border-gray-200">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr
                key={row.key}
                className={`border-t ${
                  row.groupStart ? "border-gray-300" : "border-gray-100"
                }`}
              >
                <th
                  scope="row"
                  className={`sticky left-0 z-10 bg-white text-left px-4 py-2 font-medium ${
                    row.sub
                      ? "pl-8 text-xs text-gray-500 font-normal"
                      : "text-gray-700"
                  }`}
                >
                  {row.sub && <span className="text-gray-300 mr-1.5">↳</span>}
                  {row.label}
                  {row.note && (
                    <sup className="text-gray-400 ml-0.5">{row.note}</sup>
                  )}
                </th>
                {data.meses.map((m) => {
                  const value = row.get(m);
                  const active = m.mes === selectedMes;
                  return (
                    <td
                      key={m.mes}
                      className={`px-2 py-2 text-center tabular-nums ${
                        active ? "bg-sky-50 font-semibold text-gray-900" : ""
                      } ${value === 0 ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {value}
                    </td>
                  );
                })}
                <td className="px-4 py-2 text-right tabular-nums font-semibold text-gray-900 border-l border-gray-200">
                  {row.get(data.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 text-[11px] text-gray-400 border-t border-gray-100">
        <sup>1</sup> El total anual cuenta participantes distintos en todo el
        año, por lo que no es la suma de las columnas: una misma persona puede
        certificarse en más de un mes.
      </p>
    </div>
  );
}
