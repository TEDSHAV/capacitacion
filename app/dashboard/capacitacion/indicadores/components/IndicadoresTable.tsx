"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { IndicadorOsiRow } from "@/types";

interface Props {
  rows: IndicadorOsiRow[];
}

type SortKey =
  | "nroOsi"
  | "empresa"
  | "servicio"
  | "fechaEjecucion"
  | "fechaEmision"
  | "horas"
  | "brechaHoras"
  | "facilitadorNombre"
  | "estado";

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  dentro: {
    label: "Dentro",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  fuera: {
    label: "Fuera",
    cls: "bg-red-50 text-red-700 border-red-200",
  },
  pendiente: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  no_aplica: {
    label: "N/A",
    cls: "bg-gray-50 text-gray-500 border-gray-200",
  },
};

const FUENTE_EJECUCION_LABEL: Record<string, string> = {
  sesiones: "Sesiones",
  fecha_fin_real: "fecha_fin_real",
};

const FUENTE_EMISION_LABEL: Record<string, string> = {
  created_at: "DB (creación)",
  fecha_emision: "Fecha emisión",
};

function formatDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function IndicadoresTable({ rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("horas");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: "nroOsi", label: "OSI" },
    { key: "empresa", label: "Empresa" },
    { key: "servicio", label: "Servicio" },
    { key: "fechaEjecucion", label: "Fecha ejecución" },
    { key: "fechaEmision", label: "Fecha emisión" },
    { key: "horas", label: "Horas", className: "text-right" },
    { key: "brechaHoras", label: "Brecha (h)", className: "text-right" },
    { key: "facilitadorNombre", label: "Facilitador" },
    { key: "estado", label: "Estado" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Detalle por OSI
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {sorted.length} OSI(s) · clic en encabezado para ordenar
          </p>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-3 py-2.5 text-left font-medium text-gray-600 text-xs cursor-pointer select-none whitespace-nowrap hover:bg-gray-100 ${
                    col.className ?? ""
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-300" />
                    )}
                  </span>
                </th>
              ))}
              <th className="px-3 py-2.5 text-left font-medium text-gray-600 text-xs whitespace-nowrap">
                F. ejecución
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600 text-xs whitespace-nowrap">
                F. emisión
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="px-3 py-12 text-center text-gray-400 text-sm"
                >
                  Sin OSIs que coincidan con los filtros
                </td>
              </tr>
            ) : (
              sorted.map((r) => {
                const badge = ESTADO_BADGE[r.estado];
                const isBreach = r.estado === "fuera";
                const isSospechoso = r.sospechoso;
                return (
                  <tr
                    key={r.osiId}
                    className={`border-t border-gray-100 hover:bg-gray-50 ${
                      isSospechoso
                        ? "bg-amber-50/60"
                        : isBreach
                          ? "bg-red-50/40"
                          : ""
                    }`}
                  >
                    <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                      <a
                        href={`/dashboard/capacitacion/gestion-osi/${r.osiId}`}
                        className="text-sky-700 hover:underline"
                      >
                        {r.nroOsi}
                      </a>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 max-w-[180px] truncate">
                      {r.empresa || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 max-w-[180px] truncate">
                      {r.servicio || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap text-xs">
                      {formatDate(r.fechaEjecucion)}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap text-xs">
                      {formatDate(r.fechaEmision)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                      {r.horas != null ? `${r.horas}h` : "—"}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-medium whitespace-nowrap ${
                        r.brechaHoras != null && r.brechaHoras > 0
                          ? "text-red-600"
                          : "text-gray-400"
                      }`}
                    >
                      {r.brechaHoras != null ? `${r.brechaHoras}h` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 max-w-[140px] truncate">
                      {r.facilitadorNombre || "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                      {r.fuenteEjecucion
                        ? FUENTE_EJECUCION_LABEL[r.fuenteEjecucion] ?? r.fuenteEjecucion
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                      {r.fuenteEmision
                        ? FUENTE_EMISION_LABEL[r.fuenteEmision] ?? r.fuenteEmision
                        : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
