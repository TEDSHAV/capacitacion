"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Hourglass,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ShieldCheck,
  Calendar,
  X,
} from "lucide-react";
import type { IndicadorEstado, IndicadorOsiRow, IndicadoresAggregates } from "@/types";
import { parseDate } from "@/lib/business-days";

interface Props {
  aggregates: IndicadoresAggregates;
  rows: IndicadorOsiRow[];
  mesLabel?: string;
}

type SortKey =
  | "nroOsi"
  | "empresa"
  | "servicio"
  | "fechaEjecucion"
  | "fechaEmision"
  | "diasHabiles"
  | "facilitador"
  | "estado";

function formatDate(s: string | null): string {
  if (!s) return "—";
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s);
  const d = parseDate(s);
  if (isNaN(d.getTime())) return s;
  if (isDateOnly) {
    return d.toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  return d.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function Certificados72hView({ aggregates, rows, mesLabel }: Props) {
  const [filterEstado, setFilterEstado] = useState<IndicadorEstado | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("diasHabiles");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const pct = aggregates.pctCumplimiento;
  const pctColor =
    pct == null
      ? "text-gray-400"
      : pct >= 90
        ? "text-emerald-600"
        : pct >= 75
          ? "text-amber-600"
          : "text-red-600";

  const pctBg =
    pct == null
      ? "bg-gray-100 text-gray-700"
      : pct >= 90
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : pct >= 75
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-red-50 text-red-700 border-red-200";

  // Filtered rows
  const filteredRows = useMemo(() => {
    let result = rows;

    if (filterEstado !== "all") {
      result = result.filter((r) => r.estado === filterEstado);
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter((r) => {
        const facilitador = (r.facilitadorSesionNombre || r.facilitadorNombre || "").toLowerCase();
        return (
          r.nroOsi.toLowerCase().includes(term) ||
          (r.empresa ?? "").toLowerCase().includes(term) ||
          (r.servicio ?? "").toLowerCase().includes(term) ||
          facilitador.includes(term)
        );
      });
    }

    return result;
  }, [rows, filterEstado, searchTerm]);

  // Sorted rows
  const sortedRows = useMemo(() => {
    const arr = [...filteredRows];
    arr.sort((a, b) => {
      let av: string | number | null = null;
      let bv: string | number | null = null;

      if (sortKey === "facilitador") {
        av = a.facilitadorSesionNombre || a.facilitadorNombre || "";
        bv = b.facilitadorSesionNombre || b.facilitadorNombre || "";
      } else {
        av = a[sortKey] ?? null;
        bv = b[sortKey] ?? null;
      }

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
  }, [filteredRows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Tres Tarjetas Ejecutivas de Cumplimiento ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: % de Cumplimiento */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Cumplimiento en 72 Horas
              </p>
              <h3 className={`text-3xl font-extrabold mt-1 tracking-tight ${pctColor}`}>
                {pct != null ? `${pct}%` : "—"}
              </h3>
            </div>
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${pctBg}`}
            >
              {pct == null
                ? "Sin OSIs"
                : pct >= 90
                  ? "Meta Cumplida"
                  : pct >= 75
                    ? "Requiere Atención"
                    : "Crítico"}
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct == null
                    ? "bg-gray-300"
                    : pct >= 90
                      ? "bg-emerald-500"
                      : pct >= 75
                        ? "bg-amber-500"
                        : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              <strong>{aggregates.dentro72}</strong> de <strong>{aggregates.totalEvaluadas}</strong> OSIs evaluadas emitidas en ≤ 3 días hábiles
            </p>
          </div>
        </div>

        {/* Card 2: Tiempo Promedio */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tiempo Promedio de Emisión
              </p>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-1 tracking-tight">
                {aggregates.avgDias != null ? `${aggregates.avgDias} días` : "—"}
              </h3>
            </div>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500 leading-relaxed">
            <p>
              Plazo reglamentario máximo: <strong>3 días hábiles</strong> tras culminar la última sesión de clase (excluyendo fines de semana y feriados).
            </p>
          </div>
        </div>

        {/* Card 3: Atención Inmediata (Fuera de Plazo + Pendientes) */}
        <div
          onClick={() => setFilterEstado(aggregates.fuera72 > 0 ? "fuera" : "pendiente")}
          className="cursor-pointer bg-white hover:bg-gray-50/80 rounded-xl border border-gray-200 p-5 flex flex-col justify-between shadow-sm transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                OSIs que Requieren Atención
              </p>
              <h3
                className={`text-3xl font-extrabold mt-1 tracking-tight ${
                  aggregates.fuera72 + aggregates.pendientes > 0
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}
              >
                {aggregates.fuera72 + aggregates.pendientes}
              </h3>
            </div>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                aggregates.fuera72 > 0
                  ? "bg-red-50 text-red-600"
                  : aggregates.pendientes > 0
                    ? "bg-amber-50 text-amber-600"
                    : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {aggregates.fuera72 > 0 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : aggregates.pendientes > 0 ? (
                <Hourglass className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
              {aggregates.fuera72} fuera de plazo
            </span>
            <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              {aggregates.pendientes} pendientes
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Filtros Rápidos + Buscador ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Pills de Estado */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <button
            onClick={() => setFilterEstado("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterEstado === "all"
                ? "bg-sky-600 text-white font-semibold"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Todas ({aggregates.totalOsis})
          </button>
          <button
            onClick={() => setFilterEstado("fuera")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              filterEstado === "fuera"
                ? "bg-red-600 text-white font-semibold"
                : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Fuera de plazo ({aggregates.fuera72})
          </button>
          <button
            onClick={() => setFilterEstado("pendiente")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              filterEstado === "pendiente"
                ? "bg-amber-600 text-white font-semibold"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60"
            }`}
          >
            <Hourglass className="w-3.5 h-3.5" />
            Pendientes ({aggregates.pendientes})
          </button>
          <button
            onClick={() => setFilterEstado("dentro")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              filterEstado === "dentro"
                ? "bg-emerald-600 text-white font-semibold"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            A tiempo ({aggregates.dentro72})
          </button>
          {aggregates.programadas > 0 && (
            <button
              onClick={() => setFilterEstado("programada")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterEstado === "programada"
                  ? "bg-indigo-600 text-white font-semibold"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              }`}
            >
              Programadas ({aggregates.programadas})
            </button>
          )}
        </div>

        {/* Buscador Rápido */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar OSI, empresa, facilitador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 3. Tabla Simplificada y Humana ──────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              Detalle de OSIs y Plazos de Emisión {mesLabel ? `· ${mesLabel}` : ""}
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Mostrando {sortedRows.length} de {rows.length} OSIs registradas
            </p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-semibold text-gray-600 border-b border-gray-200">
              <tr>
                <th
                  onClick={() => toggleSort("nroOsi")}
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    OSI
                    {sortKey === "nroOsi" ? (
                      sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-300" />
                    )}
                  </span>
                </th>
                <th
                  onClick={() => toggleSort("empresa")}
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 select-none"
                >
                  <span className="inline-flex items-center gap-1">
                    Empresa
                    {sortKey === "empresa" ? (
                      sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-300" />
                    )}
                  </span>
                </th>
                <th
                  onClick={() => toggleSort("servicio")}
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 select-none"
                >
                  <span className="inline-flex items-center gap-1">
                    Curso / Servicio
                    {sortKey === "servicio" ? (
                      sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-300" />
                    )}
                  </span>
                </th>
                <th
                  onClick={() => toggleSort("fechaEjecucion")}
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Fin de Clase
                    {sortKey === "fechaEjecucion" ? (
                      sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-300" />
                    )}
                  </span>
                </th>
                <th
                  onClick={() => toggleSort("fechaEmision")}
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Fecha Emisión
                    {sortKey === "fechaEmision" ? (
                      sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-300" />
                    )}
                  </span>
                </th>
                <th
                  onClick={() => toggleSort("diasHabiles")}
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Tiempo de Emisión
                    {sortKey === "diasHabiles" ? (
                      sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-300" />
                    )}
                  </span>
                </th>
                <th
                  onClick={() => toggleSort("facilitador")}
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Facilitador
                    {sortKey === "facilitador" ? (
                      sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-300" />
                    )}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No se encontraron OSIs con los filtros seleccionados
                  </td>
                </tr>
              ) : (
                sortedRows.map((r) => {
                  const facilitador = r.facilitadorSesionNombre || r.facilitadorNombre || "—";
                  const isBreach = r.estado === "fuera";
                  const isPending = r.estado === "pendiente";

                  return (
                    <tr
                      key={r.osiId}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isBreach ? "bg-red-50/30" : isPending ? "bg-amber-50/20" : ""
                      }`}
                    >
                      {/* OSI */}
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">
                        <a
                          href={`/dashboard/capacitacion/gestion-osi?id=${r.osiId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sky-700 hover:text-sky-900 hover:underline"
                        >
                          {r.nroOsi}
                          <ExternalLink className="w-3 h-3 text-sky-400" />
                        </a>
                      </td>

                      {/* Empresa */}
                      <td className="px-4 py-3 text-gray-900 font-medium max-w-[200px] truncate" title={r.empresa}>
                        {r.empresa || "—"}
                      </td>

                      {/* Curso / Servicio */}
                      <td className="px-4 py-3 text-gray-700 max-w-[240px] truncate" title={r.servicio}>
                        {r.servicio || "—"}
                      </td>

                      {/* Fin de Clase */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {formatDate(r.fechaEjecucion)}
                      </td>

                      {/* Fecha Emisión */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {r.fechaEmision ? (
                          formatDate(r.fechaEmision)
                        ) : (
                          <span className="text-gray-400 italic">Pendiente</span>
                        )}
                      </td>

                      {/* Tiempo de Emisión con Badge */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {r.estado === "dentro" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {r.diasHabiles} {r.diasHabiles === 1 ? "día hábil" : "días hábiles"} (A tiempo)
                          </span>
                        )}
                        {r.estado === "fuera" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-semibold border border-red-200">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            {r.diasHabiles} días hábiles (+{r.brechaDias}d retraso)
                          </span>
                        )}
                        {r.estado === "pendiente" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                            <Hourglass className="w-3 h-3 text-amber-600" />
                            Sin emitir ({r.brechaDias != null ? `${r.brechaDias}d transcurridos` : "Pendiente"})
                          </span>
                        )}
                        {r.estado === "programada" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                            Programada
                          </span>
                        )}
                        {r.estado === "no_aplica" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                            N/A
                          </span>
                        )}
                      </td>

                      {/* Facilitador */}
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[180px] truncate" title={facilitador}>
                        {facilitador}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
