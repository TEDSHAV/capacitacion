"use client";

import { useState, useMemo, Fragment } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Hourglass,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Calendar,
  X,
  Pencil,
  Link2,
  Layers,
  ChevronDown,
  ChevronRight,
  Unlink,
} from "lucide-react";
import type { IndicadorEstado, IndicadorOsiRow, IndicadoresAggregates } from "@/types";
import { parseDate } from "@/lib/business-days";
import { useToast } from "@/lib/ui/toast-context";
import { desagruparOsi, desagruparGrupo } from "@/app/actions/indicadores-ajustes";
import { OsiPreviewModal } from "@/components/osi/OsiPreviewModal";
import EditarFechasModal from "./EditarFechasModal";
import AgruparOsisModal from "./AgruparOsisModal";

interface Props {
  aggregates: IndicadoresAggregates;
  rows: IndicadorOsiRow[];
  mesLabel?: string;
  onRefresh?: () => void;
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

function formatDate(s: string | null | undefined): string {
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

export default function Certificados72hView({ aggregates, rows, mesLabel, onRefresh }: Props) {
  const { addToast } = useToast();
  const [filterEstado, setFilterEstado] = useState<
    IndicadorEstado | "ajustadas" | "otra_osi" | "agrupadas" | "all"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("diasHabiles");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Grouping & view mode states
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [selectedOsiIds, setSelectedOsiIds] = useState<Set<number>>(new Set());
  const [isAgruparModalOpen, setIsAgruparModalOpen] = useState(false);

  // Modals state
  const [previewOsi, setPreviewOsi] = useState<{ osiId: number; nroOsi: string } | null>(null);
  const [editModalState, setEditModalState] = useState<{
    isOpen: boolean;
    row: IndicadorOsiRow | null;
    focusField: "ejecucion" | "emision" | "otra_osi";
  }>({
    isOpen: false,
    row: null,
    focusField: "ejecucion",
  });

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

  const adjustedCount = useMemo(
    () => rows.filter((r) => r.fechaEjecucionAjustada || r.fechaEmisionAjustada || r.emitidoEnOtraOsi).length,
    [rows]
  );

  const otraOsiCount = useMemo(
    () => rows.filter((r) => r.emitidoEnOtraOsi).length,
    [rows]
  );

  const groupedCount = useMemo(
    () => rows.filter((r) => r.isParentService || r.isChildService).length,
    [rows]
  );

  // Toggle selection for grouping
  const toggleSelectOsi = (osiId: number) => {
    setSelectedOsiIds((prev) => {
      const next = new Set(prev);
      if (next.has(osiId)) {
        next.delete(osiId);
      } else {
        next.add(osiId);
      }
      return next;
    });
  };

  const toggleSelectAll = (filteredItems: IndicadorOsiRow[]) => {
    if (selectedOsiIds.size >= filteredItems.length && filteredItems.length > 0) {
      setSelectedOsiIds(new Set());
    } else {
      setSelectedOsiIds(new Set(filteredItems.map((r) => r.osiId)));
    }
  };

  const toggleExpandGroup = (parentOsiId: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(parentOsiId)) {
        next.delete(parentOsiId);
      } else {
        next.add(parentOsiId);
      }
      return next;
    });
  };

  // Quick actions: Desvincular single child OSI
  const handleDesvincularOsi = async (osiId: number, nroOsi: string) => {
    if (!confirm(`¿Desea desvincular la OSI ${nroOsi} del servicio? Volverá a computarse individualmente en el SLA.`)) {
      return;
    }
    const res = await desagruparOsi(osiId);
    if (res.success) {
      addToast(`OSI ${nroOsi} desvinculada exitosamente`, "info");
      onRefresh?.();
    } else {
      addToast(res.error || "Error al desvincular la OSI", "error");
    }
  };

  // Quick actions: Desagrupar entire group
  const handleDesagruparGrupo = async (parentOsiId: number, parentNro: string) => {
    if (!confirm(`¿Desea desagrupar todas las OSIs vinculadas al servicio ${parentNro}?`)) {
      return;
    }
    const res = await desagruparGrupo(parentOsiId);
    if (res.success) {
      addToast(`Servicio ${parentNro} desagrupado exitosamente`, "info");
      onRefresh?.();
    } else {
      addToast(res.error || "Error al desagrupar el servicio", "error");
    }
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    let result = rows;

    // In grouped mode, only top-level (non-child) rows are displayed in the main table list
    if (viewMode === "grouped") {
      result = result.filter((r) => !r.isChildService);
    }

    if (filterEstado === "ajustadas") {
      result = result.filter((r) => r.fechaEjecucionAjustada || r.fechaEmisionAjustada || r.emitidoEnOtraOsi);
    } else if (filterEstado === "otra_osi") {
      result = result.filter((r) => r.emitidoEnOtraOsi);
    } else if (filterEstado === "agrupadas") {
      result = result.filter((r) => r.isParentService || r.isChildService);
    } else if (filterEstado !== "all") {
      result = result.filter((r) => r.estado === filterEstado);
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter((r) => {
        const facilitador = (r.facilitadorSesionNombre || r.facilitadorNombre || "").toLowerCase();
        const matchesSelf =
          r.nroOsi.toLowerCase().includes(term) ||
          (r.empresa ?? "").toLowerCase().includes(term) ||
          (r.servicio ?? "").toLowerCase().includes(term) ||
          facilitador.includes(term);

        if (matchesSelf) return true;

        // If in grouped mode, also match if any child OSI matches
        if (r.childOsis && r.childOsis.some((c) =>
          c.nroOsi.toLowerCase().includes(term) ||
          (c.empresa ?? "").toLowerCase().includes(term) ||
          (c.servicio ?? "").toLowerCase().includes(term)
        )) {
          return true;
        }

        return false;
      });
    }

    return result;
  }, [rows, filterEstado, searchTerm, viewMode]);

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

  const selectedRowsForModal = useMemo(
    () => rows.filter((r) => selectedOsiIds.has(r.osiId)),
    [rows, selectedOsiIds]
  );

  return (
    <div className="space-y-6">
      {/* ── 1. Cuatro Tarjetas Ejecutivas de Cumplimiento (Evaluadas por Servicio) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <strong>{aggregates.dentro72}</strong> de <strong>{aggregates.totalEvaluadas}</strong> servicios evaluados cumplieron el plazo de ≤ 3 días hábiles
              {aggregates.totalOsis > (aggregates.totalServicios ?? aggregates.totalOsis) && (
                <span className="block text-[11px] text-gray-400 mt-0.5 font-normal">
                  (Consolidando {aggregates.totalOsis} OSIs en {aggregates.totalServicios} servicios reales)
                </span>
              )}
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
              Plazo reglamentario máximo: <strong>3 días hábiles</strong> tras culminar el servicio (excluyendo fines de semana y feriados).
            </p>
          </div>
        </div>

        {/* Card 3: Demora en Emisión (Servicios Fuera de Plazo + Pendientes de Emisión tras Ejecución) */}
        <div
          onClick={() => {
            if (filterEstado === "fuera" || filterEstado === "pendiente") {
              setFilterEstado("all");
            } else {
              setFilterEstado(aggregates.fuera72 > 0 ? "fuera" : "pendiente");
            }
          }}
          className={`cursor-pointer bg-white hover:bg-gray-50/80 rounded-xl border p-5 flex flex-col justify-between shadow-sm transition-all ${
            filterEstado === "fuera" || filterEstado === "pendiente"
              ? "ring-2 ring-red-500 border-red-300"
              : "border-gray-200"
          }`}
          title="Servicios con capacitación impartida pero con demora o pendientes de emisión de certificados"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Demora en Emisión
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
          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
              {aggregates.fuera72} fuera de plazo
            </span>
            <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              {aggregates.pendientes} pendientes
            </span>
            {aggregates.totalOsis > (aggregates.totalServicios ?? aggregates.totalOsis) && (
              <span className="text-[11px] text-gray-400 font-medium">
                (Por servicios)
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Pendiente por Ejecución (Servicio No Impartido) */}
        <div
          onClick={() => {
            setFilterEstado(filterEstado === "pendiente_ejecucion" ? "all" : "pendiente_ejecucion");
          }}
          className={`cursor-pointer bg-white hover:bg-gray-50/80 rounded-xl border p-5 flex flex-col justify-between shadow-sm transition-all ${
            filterEstado === "pendiente_ejecucion"
              ? "ring-2 ring-violet-500 border-violet-300"
              : "border-gray-200"
          }`}
          title="Servicios planificados en el período cuyo curso no ha sido ejecutado aún"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Pendiente por Ejecución
              </p>
              <h3
                className={`text-3xl font-extrabold mt-1 tracking-tight ${
                  aggregates.pendientesEjecucion > 0 ? "text-violet-700" : "text-gray-900"
                }`}
              >
                {aggregates.pendientesEjecucion}
              </h3>
            </div>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                aggregates.pendientesEjecucion > 0
                  ? "bg-violet-50 text-violet-600"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs">
            <span
              className={`font-semibold px-2 py-0.5 rounded ${
                aggregates.pendientesEjecucion > 0
                  ? "text-violet-700 bg-violet-50 border border-violet-200/60"
                  : "text-gray-500 bg-gray-100"
              }`}
            >
              {aggregates.pendientesEjecucion > 0 ? "Servicios no impartidos" : "Al día"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Floating Action Bar: Agrupar OSIs seleccionadas ──────────────────── */}
      {selectedOsiIds.size > 0 && (
        <div className="sticky top-4 z-30 bg-sky-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-sky-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-sky-800 rounded-lg">
              <Layers className="w-4 h-4 text-sky-300" />
            </div>
            <div>
              <span className="text-sm font-bold">
                {selectedOsiIds.size} {selectedOsiIds.size === 1 ? "OSI seleccionada" : "OSIs seleccionadas"}
              </span>
              {selectedOsiIds.size < 2 && (
                <p className="text-xs text-sky-200">
                  Seleccione al menos 2 OSIs para agruparlas en 1 solo servicio representativo
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedOsiIds.size >= 2 && (
              <button
                type="button"
                onClick={() => setIsAgruparModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Agrupar en 1 solo servicio</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedOsiIds(new Set())}
              className="px-3 py-1.5 rounded-xl bg-sky-800/80 hover:bg-sky-800 text-sky-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Limpiar selección
            </button>
          </div>
        </div>
      )}

      {/* ── 2. Filtros Rápidos + Selector de Vista + Buscador ────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
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
            Todas ({viewMode === "grouped" ? aggregates.totalServicios ?? aggregates.totalOsis : aggregates.totalOsis})
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
            Demora en emisión ({aggregates.pendientes})
          </button>
          <button
            onClick={() => setFilterEstado("pendiente_ejecucion")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              filterEstado === "pendiente_ejecucion"
                ? "bg-violet-600 text-white font-semibold"
                : "bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200/60"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pendiente por ejecución ({aggregates.pendientesEjecucion})
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

          {groupedCount > 0 && (
            <button
              onClick={() =>
                setFilterEstado(filterEstado === "agrupadas" ? "all" : "agrupadas")
              }
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                filterEstado === "agrupadas"
                  ? "bg-sky-600 text-white font-semibold"
                  : "bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/60"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Agrupadas ({aggregates.totalGrupos ?? 0} grupos)
            </button>
          )}

          {adjustedCount > 0 && (
            <button
              onClick={() =>
                setFilterEstado(filterEstado === "ajustadas" ? "all" : "ajustadas")
              }
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                filterEstado === "ajustadas"
                  ? "bg-sky-600 text-white font-semibold"
                  : "bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/60"
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              Ajustadas ({adjustedCount})
            </button>
          )}
        </div>

        {/* Selector de Modo de Vista + Buscador Rápido */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
          {/* Toggle Vista Agrupada / Desglosada */}
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                viewMode === "grouped"
                  ? "bg-white text-sky-700 font-bold shadow-xs"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              title="Consolida OSIs relacionadas en 1 fila por servicio (SLA exacto)"
            >
              Por Servicios
            </button>
            <button
              type="button"
              onClick={() => setViewMode("flat")}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                viewMode === "flat"
                  ? "bg-white text-sky-700 font-bold shadow-xs"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              title="Muestra todas las OSIs de forma individual"
            >
              Todas las OSIs
            </button>
          </div>

          {/* Buscador */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar OSI, empresa, facilitador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
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
      </div>

      {/* ── 3. Tabla de OSIs y Plazos de Emisión ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              Detalle de Servicios y Plazos de Emisión {mesLabel ? `· ${mesLabel}` : ""}
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Mostrando {sortedRows.length} {viewMode === "grouped" ? "servicios" : "OSIs"} de {aggregates.totalOsis} OSIs registradas
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-block w-2 h-2 rounded-full bg-sky-500" />
            <span>Seleccione casillas para agrupar múltiples OSIs en un solo servicio</span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-semibold text-gray-600 border-b border-gray-200">
              <tr>
                {/* Checkbox Select All */}
                <th className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={
                      sortedRows.length > 0 &&
                      sortedRows.every((r) => selectedOsiIds.has(r.osiId))
                    }
                    onChange={() => toggleSelectAll(sortedRows)}
                    className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer"
                    title="Seleccionar todas"
                  />
                </th>

                <th
                  onClick={() => toggleSort("nroOsi")}
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    OSI / Servicio
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
                    Fecha de Ejecución
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
                    Registro Certificado
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
                <th className="px-4 py-3 text-center whitespace-nowrap">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No se encontraron OSIs con los filtros seleccionados
                  </td>
                </tr>
              ) : (
                sortedRows.map((r) => {
                  const facilitador = r.facilitadorSesionNombre || r.facilitadorNombre || "—";
                  const isBreach = r.estado === "fuera";
                  const isPendingIssuance = r.estado === "pendiente";
                  const isPendingExecution = r.estado === "pendiente_ejecucion";
                  const isParent = Boolean(r.isParentService && (r.childOsis?.length ?? 0) > 0);
                  const isChild = Boolean(r.isChildService);
                  const isExpanded = expandedGroups.has(r.osiId);
                  const isSelected = selectedOsiIds.has(r.osiId);

                  return (
                    <Fragment key={r.osiId}>
                      <tr
                        className={`hover:bg-gray-50/80 transition-colors ${
                          isSelected
                            ? "bg-sky-50/50"
                            : isBreach
                              ? "bg-red-50/30"
                              : isPendingIssuance
                                ? "bg-amber-50/20"
                                : isPendingExecution
                                  ? "bg-violet-50/20"
                                  : isParent
                                    ? "bg-sky-50/20"
                                    : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOsi(r.osiId)}
                            className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer"
                          />
                        </td>

                        {/* OSI / Servicio */}
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">
                          {isParent ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => toggleExpandGroup(r.osiId)}
                                className="p-1 rounded-md hover:bg-sky-100 text-sky-700 transition-colors cursor-pointer"
                                title={isExpanded ? "Colapsar grupo" : "Expandir grupo"}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPreviewOsi({ osiId: r.osiId, nroOsi: r.nroOsi })}
                                className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 hover:underline cursor-pointer font-bold"
                                title="Ver formato oficial de la OSI principal"
                              >
                                {r.nroOsi}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleExpandGroup(r.osiId)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 hover:bg-sky-200 transition-colors cursor-pointer"
                                title="Clic para expandir/colapsar las OSIs vinculadas a este servicio"
                              >
                                <Layers className="w-2.5 h-2.5" />
                                <span>Grupo · {r.groupOsiCount} OSIs</span>
                              </button>
                            </div>
                          ) : isChild ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewOsi({ osiId: r.osiId, nroOsi: r.nroOsi })}
                                className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
                                title="Ver formato oficial de la OSI vinculada"
                              >
                                {r.nroOsi}
                              </button>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                                ↳ {r.parentNroOsi || "Vinculada"}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPreviewOsi({ osiId: r.osiId, nroOsi: r.nroOsi })}
                              className="inline-flex items-center gap-1.5 text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
                              title="Ver formato oficial de la OSI"
                            >
                              {r.nroOsi}
                            </button>
                          )}
                        </td>

                        {/* Empresa */}
                        <td className="px-4 py-3 text-gray-900 font-medium max-w-[200px] truncate" title={r.empresa}>
                          {r.empresa || "—"}
                        </td>

                        {/* Curso / Servicio */}
                        <td className="px-4 py-3 text-gray-700 max-w-[240px] truncate" title={r.servicio}>
                          {r.servicio || "—"}
                        </td>

                        {/* Fecha de Ejecución */}
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs group/cell">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`font-medium ${
                                    r.fechaEjecucionAjustada
                                      ? "text-sky-700 font-semibold"
                                      : "text-gray-900"
                                  }`}
                                >
                                  {formatDate(r.fechaEjecucion)}
                                </span>
                                {r.fechaEjecucionAjustada && (
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200"
                                    title={`Fecha real ajustada manualmente (Original: ${formatDate(
                                      r.originalFechaEjecucion
                                    )})${r.motivoAjuste ? ` · Motivo: ${r.motivoAjuste}` : ""}`}
                                  >
                                    Ajustada
                                  </span>
                                )}
                              </div>
                              {r.estado === "pendiente_ejecucion" && !r.fechaEjecucionAjustada && (
                                <span className="text-[10px] text-violet-600 font-medium italic">
                                  (Planificada · Sin impartir)
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setEditModalState({
                                  isOpen: true,
                                  row: r,
                                  focusField: "ejecucion",
                                })
                              }
                              className="p-1 rounded text-gray-400 hover:text-sky-600 hover:bg-sky-50 transition-colors opacity-80 sm:opacity-0 sm:group-hover/cell:opacity-100 cursor-pointer"
                              title="Editar fecha real de ejecución (SLA indicadores)"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Fecha Emisión */}
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs group/cell">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                {r.fechaEmision ? (
                                  <span
                                    className={`font-medium ${
                                      r.fechaEmisionAjustada || r.emitidoEnOtraOsi
                                        ? "text-sky-700 font-semibold"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {formatDate(r.fechaEmision)}
                                  </span>
                                ) : r.estado === "pendiente_ejecucion" ? (
                                  <span className="text-violet-700/90 font-medium italic">
                                    En espera de ejecución
                                  </span>
                                ) : (
                                  <span className="text-amber-700/90 font-medium italic">
                                    Pendiente certificados
                                  </span>
                                )}
                                {r.emitidoEnOtraOsi ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (r.nroOsiReferencia) {
                                        setPreviewOsi({
                                          osiId: r.osiReferenciaId ?? r.osiId,
                                          nroOsi: r.nroOsiReferencia,
                                        });
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 hover:bg-sky-200 transition-colors cursor-pointer"
                                    title={`Certificados emitidos en ${r.nroOsiReferencia || "otra OSI"}`}
                                  >
                                    <Link2 className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                                    <span>{r.nroOsiReferencia || "En otra OSI"}</span>
                                  </button>
                                ) : r.fechaEmisionAjustada ? (
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200"
                                    title={`Fecha ajustada manualmente (Original: ${formatDate(
                                      r.originalFechaEmision
                                    )})`}
                                  >
                                    Ajustada
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditModalState({
                                    isOpen: true,
                                    row: r,
                                    focusField: "otra_osi",
                                  })
                                }
                                className={`p-1 rounded transition-colors cursor-pointer ${
                                  r.emitidoEnOtraOsi
                                    ? "text-sky-700 bg-sky-50 hover:bg-sky-100"
                                    : "text-gray-400 hover:text-sky-600 hover:bg-sky-50 opacity-80 sm:opacity-0 sm:group-hover/cell:opacity-100"
                                }`}
                                title="Vincular a certificados de otra OSI"
                              >
                                <Link2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditModalState({
                                    isOpen: true,
                                    row: r,
                                    focusField: "emision",
                                  })
                                }
                                className="p-1 rounded text-gray-400 hover:text-sky-600 hover:bg-sky-50 transition-colors opacity-80 sm:opacity-0 sm:group-hover/cell:opacity-100 cursor-pointer"
                                title="Editar fecha real de emisión"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
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
                              Demora en emisión ({r.brechaDias != null && r.brechaDias > 0 ? `+${r.brechaDias}d retraso` : "En plazo"})
                            </span>
                          )}
                          {r.estado === "pendiente_ejecucion" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold border border-violet-200">
                              <Clock className="w-3 h-3 text-violet-600" />
                              Pendiente por ejecución (Servicio no impartido)
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

                        {/* Acciones */}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isParent && (
                              <button
                                type="button"
                                onClick={() => handleDesagruparGrupo(r.osiId, r.nroOsi)}
                                className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Desagrupar todas las OSIs de este servicio"
                              >
                                <Unlink className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isChild && (
                              <button
                                type="button"
                                onClick={() => handleDesvincularOsi(r.osiId, r.nroOsi)}
                                className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Desvincular esta OSI del servicio"
                              >
                                <Unlink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ── Sub-rows: OSIs Hijas vinculadas cuando el grupo está expandido ── */}
                      {isParent && isExpanded && r.childOsis && r.childOsis.map((child) => (
                        <tr
                          key={child.osiId}
                          className="bg-sky-50/25 hover:bg-sky-50/50 transition-colors border-l-4 border-l-sky-500 text-xs"
                        >
                          {/* Checkbox de OSI hija */}
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={selectedOsiIds.has(child.osiId)}
                              onChange={() => toggleSelectOsi(child.osiId)}
                              className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer"
                            />
                          </td>

                          {/* OSI Hija */}
                          <td className="px-4 py-2.5 whitespace-nowrap pl-6">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sky-300 font-bold select-none">↳</span>
                              <button
                                type="button"
                                onClick={() => setPreviewOsi({ osiId: child.osiId, nroOsi: child.nroOsi })}
                                className="font-semibold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
                                title="Ver formato oficial de la OSI vinculada"
                              >
                                {child.nroOsi}
                              </button>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">
                                Vinculada
                              </span>
                            </div>
                          </td>

                          {/* Empresa */}
                          <td className="px-4 py-2.5 text-gray-700 truncate max-w-[200px]" title={child.empresa}>
                            {child.empresa || "—"}
                          </td>

                          {/* Curso / Servicio */}
                          <td className="px-4 py-2.5 text-gray-600 truncate max-w-[240px]" title={child.servicio}>
                            {child.servicio || "—"}
                          </td>

                          {/* Fecha de Ejecución */}
                          <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                            <span className="font-medium text-gray-800">{formatDate(child.fechaEjecucion)}</span>
                          </td>

                          {/* Fecha Emisión */}
                          <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                            <span className="font-semibold text-sky-700">
                              {formatDate(child.fechaEmision)}
                            </span>
                          </td>

                          {/* Tiempo de Emisión */}
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className="text-[11px] text-gray-500 italic">
                              Hereda SLA de {r.nroOsi}
                            </span>
                          </td>

                          {/* Facilitador */}
                          <td className="px-4 py-2.5 text-gray-600 text-xs max-w-[180px] truncate">
                            {child.facilitadorSesionNombre || child.facilitadorNombre || "—"}
                          </td>

                          {/* Desvincular Action */}
                          <td className="px-4 py-2.5 whitespace-nowrap text-center">
                            <button
                              type="button"
                              onClick={() => handleDesvincularOsi(child.osiId, child.nroOsi)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-gray-500 hover:text-red-700 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-colors cursor-pointer"
                              title={`Desvincular ${child.nroOsi} de este servicio`}
                            >
                              <Unlink className="w-3 h-3" />
                              <span>Desvincular</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <OsiPreviewModal
        isOpen={Boolean(previewOsi)}
        osiId={previewOsi?.osiId ?? null}
        osiNumber={previewOsi?.nroOsi}
        onClose={() => setPreviewOsi(null)}
      />

      <EditarFechasModal
        isOpen={editModalState.isOpen}
        onClose={() =>
          setEditModalState((prev) => ({ ...prev, isOpen: false, row: null }))
        }
        row={editModalState.row}
        initialFocusField={editModalState.focusField}
        allRows={rows}
        onSuccess={onRefresh}
      />

      <AgruparOsisModal
        isOpen={isAgruparModalOpen}
        onClose={() => setIsAgruparModalOpen(false)}
        selectedRows={selectedRowsForModal}
        onSuccess={() => {
          setSelectedOsiIds(new Set());
          addToast("OSIs agrupadas exitosamente en 1 solo servicio", "success");
          onRefresh?.();
        }}
      />
    </div>
  );
}
