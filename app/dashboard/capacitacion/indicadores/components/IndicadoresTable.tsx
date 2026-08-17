"use client";

import { useState, useMemo, useEffect } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { IndicadorOsiRow } from "@/types";
import { parseDate } from "@/lib/business-days";

interface Props {
  rows: IndicadorOsiRow[];
  // When true, default the sort to "most overdue first" (brechaDias desc) —
  // used when the table is drilled down to the pendientes backlog.
  defaultSortByBrecha?: boolean;
}

type SortKey =
  | "nroOsi"
  | "empresa"
  | "servicio"
  | "fechaEjecucion"
  | "fechaEmision"
  | "diasHabiles"
  | "brechaDias"
  | "facilitadorNombre"
  | "facilitadorSesionNombre"
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
  programada: {
    label: "Programada",
    cls: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  no_aplica: {
    label: "N/A",
    cls: "bg-gray-50 text-gray-500 border-gray-200",
  },
};

const FUENTE_EJECUCION_LABEL: Record<string, string> = {
  fecha_ejecutada: "Fecha ejecutada",
  sesiones: "Sesiones (planif.)",
  fecha_fin_real: "fecha_fin_real",
};

const FUENTE_EMISION_LABEL: Record<string, string> = {
  created_at: "DB (creación)",
  fecha_emision: "Fecha emisión",
};

function formatDate(s: string | null): string {
  if (!s) return "—";
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s);
  const d = parseDate(s);
  if (isNaN(d.getTime())) return s;
  if (isDateOnly) {
    // Date-only field (fecha_emision, fecha_ejecucion) — show as DD/MM/YYYY
    return d.toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  // Timestamp (created_at fallback) — show date + time in local timezone
  return d.toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function IndicadoresTable({ rows, defaultSortByBrecha }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("diasHabiles");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // When the drill-down switches to pendientes, default-sort by brecha
  // (most overdue first) so the worst-off backlog items surface immediately.
  useEffect(() => {
    if (defaultSortByBrecha) {
      setSortKey("brechaDias");
      setSortDir("desc");
    }
  }, [defaultSortByBrecha]);

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

  // Breakdown by estado so the footer reconciles with the KPI cards above
  // (this table shows all estados, not just evaluated OSIs).
  const breakdown = useMemo(() => {
    let evaluadas = 0, pendientes = 0, programadas = 0, noAplica = 0;
    for (const r of rows) {
      if (r.estado === "dentro" || r.estado === "fuera") evaluadas += 1;
      else if (r.estado === "pendiente") pendientes += 1;
      else if (r.estado === "programada") programadas += 1;
      else if (r.estado === "no_aplica") noAplica += 1;
    }
    return { evaluadas, pendientes, programadas, noAplica };
  }, [rows]);

  const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: "nroOsi", label: "OSI" },
    { key: "empresa", label: "Empresa" },
    { key: "servicio", label: "Servicio" },
    { key: "fechaEjecucion", label: "Fecha ejecución" },
    { key: "fechaEmision", label: "Fecha emisión" },
    { key: "diasHabiles", label: "Días hábiles", className: "text-right" },
    { key: "brechaDias", label: "Brecha (días)", className: "text-right" },
    { key: "facilitadorNombre", label: "Facilitador emisor" },
    { key: "facilitadorSesionNombre", label: "Facilitador sesión" },
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
            {sorted.length} OSI(s) · {breakdown.evaluadas} evaluadas ·{" "}
            {breakdown.pendientes} pendientes · {breakdown.programadas} programadas
            · {breakdown.noAplica} no aplica · clic en encabezado para ordenar
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
                      {r.diasHabiles != null ? `${r.diasHabiles}d` : "—"}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-medium whitespace-nowrap ${
                        r.brechaDias != null && r.brechaDias > 0
                          ? "text-red-600"
                          : "text-gray-400"
                      }`}
                    >
                      {r.brechaDias != null ? `${r.brechaDias}d` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 max-w-[140px] truncate">
                      {r.facilitadorNombre?.toUpperCase() || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 max-w-[140px] truncate">
                      {r.facilitadorSesionNombre?.toUpperCase() || "—"}
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
