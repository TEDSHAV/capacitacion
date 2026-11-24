"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  MapPin,
  BookOpen,
  Award,
  Building2,
  Clock,
  Search,
  Download,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  ExternalLink,
  X,
  ChevronRight,
  Factory,
  ArrowUpDown,
  AlertTriangle,
  Landmark,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import {
  getCoberturaGeograficaData,
  type CoberturaDataResponse,
  type CoberturaFilters,
  type CoberturaTemaItem,
  type CoberturaOsiItem,
} from "@/app/actions/cobertura-geografica";
import { SALONES_SHA } from "@/lib/constants/salones";
import { OsiPreviewModal } from "@/components/osi/OsiPreviewModal";

interface Props {
  initialData: CoberturaDataResponse | null;
  shellUrl?: string;
}

type TabMode = "temas" | "aulas" | "estados" | "sedes";

const DATE_PRESETS = [
  { label: "1 mes", value: "1m" },
  { label: "3 meses", value: "3m" },
  { label: "6 meses", value: "6m" },
  { label: "Este año", value: "year" },
  { label: "Todo", value: "all" },
  { label: "Personalizado", value: "custom" },
];

function getDateRange(preset: string): { from?: string; to?: string } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];

  if (preset === "1m") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return { from: from.toISOString().split("T")[0], to };
  }
  if (preset === "3m") {
    const from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    return { from: from.toISOString().split("T")[0], to };
  }
  if (preset === "6m") {
    const from = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    return { from: from.toISOString().split("T")[0], to };
  }
  if (preset === "year") {
    const from = `${now.getFullYear()}-01-01`;
    const yearEnd = `${now.getFullYear()}-12-31`;
    return { from, to: yearEnd };
  }
  return {};
}

/**
 * Deterministic number formatter to avoid SSR / Client hydration mismatches
 * across different server and browser locales.
 */
function formatNumber(num: number | undefined | null): string {
  if (num == null || isNaN(num)) return "0";
  const parts = num.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parts.length > 1 ? parts.join(",") : parts[0];
}

export default function CoberturaGeograficaClient({
  initialData,
}: Props) {
  const [data, setData] = useState<CoberturaDataResponse | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active view tab (now includes "aulas" for SHA classroom metrics)
  const [activeTab, setActiveTab] = useState<TabMode>("temas");

  // Filters State
  const [selectedEstadoId, setSelectedEstadoId] = useState<number | null>(null);
  const [selectedCiudadId, setSelectedCiudadId] = useState<number | null>(null);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null);
  const [selectedCursoId, setSelectedCursoId] = useState<number | null>(null);
  const [selectedSalon, setSelectedSalon] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");

  // Sort State for Temas
  const [sortField, setSortField] = useState<"certs" | "cursos" | "nombre">("certs");
  const [sortAsc, setSortAsc] = useState(false);

  // Modal State for OSI details drill-down
  const [detailModalTema, setDetailModalTema] = useState<CoberturaTemaItem | null>(null);
  const [previewOsiId, setPreviewOsiId] = useState<number | null>(null);

  // Filtered Cities list based on selected state
  const availableCities = useMemo(() => {
    if (!data?.catalogs?.ciudades) return [];
    if (!selectedEstadoId) return data.catalogs.ciudades;
    return data.catalogs.ciudades.filter((c) => c.idEstado === selectedEstadoId);
  }, [data?.catalogs?.ciudades, selectedEstadoId]);

  // Compute effective date range
  const { from: dateFrom, to: dateTo } = useMemo(() => {
    if (datePreset === "custom") {
      return { from: customDateFrom || undefined, to: customDateTo || undefined };
    }
    return getDateRange(datePreset);
  }, [datePreset, customDateFrom, customDateTo]);

  // Fetch updated data from server action
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: CoberturaFilters = {
        estadoId: selectedEstadoId,
        ciudadId: selectedCiudadId,
        empresaId: selectedEmpresaId,
        cursoId: selectedCursoId,
        salon: selectedSalon || undefined,
        searchQuery: searchQuery.trim() || undefined,
        dateFrom,
        dateTo,
      };

      const res = await getCoberturaGeograficaData(filters);
      if (res.error) {
        setError(res.error);
      } else {
        setData(res.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [
    selectedEstadoId,
    selectedCiudadId,
    selectedEmpresaId,
    selectedCursoId,
    selectedSalon,
    searchQuery,
    dateFrom,
    dateTo,
  ]);

  // Refetch when filters change (debounced for search)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  // Handle resetting filters
  const resetFilters = () => {
    setSelectedEstadoId(null);
    setSelectedCiudadId(null);
    setSelectedEmpresaId(null);
    setSelectedCursoId(null);
    setSelectedSalon("");
    setSearchQuery("");
    setDatePreset("all");
    setCustomDateFrom("");
    setCustomDateTo("");
  };

  const hasActiveFilters = Boolean(
    selectedEstadoId ||
      selectedCiudadId ||
      selectedEmpresaId ||
      selectedCursoId ||
      selectedSalon ||
      searchQuery ||
      datePreset !== "all" ||
      customDateFrom ||
      customDateTo
  );

  // Sorted temas list
  const sortedTemas = useMemo(() => {
    if (!data?.temas) return [];
    return [...data.temas].sort((a, b) => {
      if (sortField === "certs") {
        return sortAsc
          ? a.totalCertificados - b.totalCertificados
          : b.totalCertificados - a.totalCertificados;
      }
      if (sortField === "cursos") {
        return sortAsc
          ? a.totalCursos - b.totalCursos
          : b.totalCursos - a.totalCursos;
      }
      if (sortField === "nombre") {
        return sortAsc
          ? a.nombreCurso.localeCompare(b.nombreCurso)
          : b.nombreCurso.localeCompare(a.nombreCurso);
      }
      return 0;
    });
  }, [data?.temas, sortField, sortAsc]);

  // Flattened all OSIs executed in SHA facilities for the classroom view
  const allShaOsis = useMemo(() => {
    if (!data?.temas) return [];
    const list: CoberturaOsiItem[] = [];
    const seen = new Set<number>();
    for (const t of data.temas) {
      for (const osi of t.osis) {
        if (osi.isShaVenue && !seen.has(osi.idOsi)) {
          seen.add(osi.idOsi);
          list.push(osi);
        }
      }
    }
    return list.sort((a, b) => (b.fechaFin || "").localeCompare(a.fechaFin || ""));
  }, [data?.temas]);

  const handleSortToggle = (field: "certs" | "cursos" | "nombre") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Export current view data to CSV (Excel-ready UTF-8 with BOM)
  const handleExportCSV = () => {
    if (!data || !data.temas.length) return;

    const rows: string[][] = [
      [
        "Tema / Curso",
        "Carga Horaria (Std)",
        "Nro OSI",
        "Fecha",
        "Cliente / Empresa",
        "Estado",
        "Ciudad",
        "Sede / Lugar de Ejecución",
        "Salón SHA",
        "Instalaciones SHA",
        "Certificados Emitidos",
        "Participantes Estimados",
        "Horas Totales",
      ],
    ];

    for (const t of data.temas) {
      for (const osi of t.osis) {
        rows.push([
          `"${t.nombreCurso.replace(/"/g, '""')}"`,
          `${t.cargaHorariaStd}h`,
          `"${osi.nroOsi}"`,
          osi.fechaFin || osi.fechaInicio || "",
          `"${osi.empresaNombre.replace(/"/g, '""')}"`,
          `"${osi.estadoNombre.replace(/"/g, '""')}"`,
          `"${(osi.ciudadNombre || "").replace(/"/g, '""')}"`,
          `"${(osi.sede || osi.direccion || "").replace(/"/g, '""')}"`,
          `"${osi.isShaVenue ? (osi.salon || "Sin asignar / Por confirmar") : "N/A (Planta/Cliente)"}"`,
          osi.isShaVenue ? "Sede Propia SHA" : "In-Company",
          String(osi.certificadosEmitidos),
          String(osi.participantesEstimados),
          `${osi.horasAcademicas}h`,
        ]);
      }
    }

    const csvContent = "\uFEFF" + rows.map((r) => r.join(";")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const estadoName = selectedEstadoId
      ? data.catalogs.estados.find((e) => e.id === selectedEstadoId)?.nombre || "Estado"
      : "Nacional";
    link.href = url;
    link.download = `Cobertura_Cursos_${estadoName}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* ─── Page Header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
                  <MapPin className="w-3 h-3 mr-1" />
                  Módulo Gerencial
                </span>
                {data?.timing && (
                  <span className="text-[11px] text-slate-400">
                    Procesado en {data.timing.totalMs}ms
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                Cobertura Geográfica y Sedes
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Auditoría gerencial de cursos impartidos, temas capacitados, sedes y uso de aulas SHA.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={loadData}
                disabled={loading}
                title="Actualizar datos"
                className="inline-flex items-center px-3 py-2 border border-slate-200 shadow-sm text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin text-sky-600" : "text-slate-400"}`}
                />
                Actualizar
              </button>

              <button
                onClick={handleExportCSV}
                disabled={!data || data.temas.length === 0}
                className="inline-flex items-center px-3.5 py-2 border border-sky-600 shadow-sm text-xs font-semibold rounded-lg text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Exportar CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ─── Managerial Filter Bar ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <SlidersHorizontal className="w-4 h-4 text-sky-600" />
              Filtros de Ubicación y Auditoría
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-sky-600 hover:text-sky-800 font-medium inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Estado Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Estado Geográfico
              </label>
              <select
                value={selectedEstadoId ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setSelectedEstadoId(val);
                  setSelectedCiudadId(null);
                }}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              >
                <option value="">Todos los Estados (Nacional)</option>
                {data?.catalogs?.estados.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Ciudad Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Ciudad / Municipio
              </label>
              <select
                value={selectedCiudadId ?? ""}
                onChange={(e) => setSelectedCiudadId(e.target.value ? Number(e.target.value) : null)}
                disabled={availableCities.length === 0}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white disabled:opacity-50 transition"
              >
                <option value="">
                  {selectedEstadoId ? "Todas las Ciudades del Estado" : "Todas las Ciudades"}
                </option>
                {availableCities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Empresa Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Cliente / Empresa
              </label>
              <select
                value={selectedEmpresaId ?? ""}
                onChange={(e) => setSelectedEmpresaId(e.target.value ? Number(e.target.value) : null)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              >
                <option value="">Todos los Clientes</option>
                {data?.catalogs?.empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.razonSocial}
                  </option>
                ))}
              </select>
            </div>

            {/* Curso / Tema Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Tema / Curso Específico
              </label>
              <select
                value={selectedCursoId ?? ""}
                onChange={(e) => setSelectedCursoId(e.target.value ? Number(e.target.value) : null)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              >
                <option value="">Todos los Cursos</option>
                {data?.catalogs?.cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Salón SHA / Sede Selector (Now dynamically populated with counts) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Salón / Sede SHA
              </label>
              <select
                value={selectedSalon}
                onChange={(e) => setSelectedSalon(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition font-medium"
              >
                <option value="">Todas las Sedes (Nacional)</option>
                <option value="all_sha">
                  🏛️ Todas las Sedes SHA {data?.aulasSha ? `(${data.aulasSha.totalCursosSha})` : ""}
                </option>
                {data?.catalogs?.salonesDetalle ? (
                  data.catalogs.salonesDetalle.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id === "sin_salon" ? "⚠️" : "🏛️"} {s.nombre} ({s.totalCursos})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Salón 1 (Principal)">🏛️ SHA — Salón 1 (Principal)</option>
                    <option value="Salón Oriente">🏛️ SHA — Salón Oriente</option>
                    <option value="Salón Elite">🏛️ SHA — Salón Elite</option>
                    <option value="sin_salon">⚠️ SHA — Salón por confirmar</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Search bar & Period row */}
          <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por tema, aula SHA (Salón 1, Oriente, Elite), cliente, nro de OSI..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Period presets */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
                Período:
              </span>
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setDatePreset(p.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    datePreset === p.value
                      ? "bg-sky-600 text-white font-semibold shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Pickers */}
          {datePreset === "custom" && (
            <div className="pt-2 flex items-center gap-3 bg-sky-50/50 p-3 rounded-lg border border-sky-100">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600 font-medium">Desde:</span>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600 font-medium">Hasta:</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Error Notification Banner */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* ─── Executive KPI Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* KPI 1: Cursos Impartidos */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Cursos Realizados
              </span>
              <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums" suppressHydrationWarning>
                {formatNumber(data?.kpis.totalCursosRealizados)}
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                OSIs técnicas ejecutadas
              </span>
            </div>
          </div>

          {/* KPI 2: Certificados Emitidos */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Certificados Emitidos
              </span>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-emerald-600 tabular-nums" suppressHydrationWarning>
                {formatNumber(data?.kpis.totalCertificadosEmitidos)}
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Participantes aprobados
              </span>
            </div>
          </div>

          {/* KPI 3: Temas Únicos */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Temas Distintos
              </span>
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-indigo-700 tabular-nums" suppressHydrationWarning>
                {formatNumber(data?.kpis.totalTemasUnicos)}
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Cursos del catálogo impartidos
              </span>
            </div>
          </div>

          {/* KPI 4: Empresas Atendidas */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Empresas Atendidas
              </span>
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums" suppressHydrationWarning>
                {formatNumber(data?.kpis.totalEmpresasAtendidas)}
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Clientes capacitados en la zona
              </span>
            </div>
          </div>

          {/* KPI 5: Horas Académicas */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Horas Académicas
              </span>
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-purple-700 tabular-nums" suppressHydrationWarning>
                {formatNumber(data?.kpis.totalHorasAcademicas)}h
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5" suppressHydrationWarning>
                Promedio: {formatNumber(data?.kpis.promedioCertsPorCurso)} certs/curso
              </span>
            </div>
          </div>
        </div>

        {/* ─── SHA CLASSROOMS EXECUTIVE SUMMARY & QUICK FILTER PILLS ───────── */}
        {data?.aulasSha && (
          <div className="bg-linear-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-md border border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30 uppercase tracking-wider">
                    <Landmark className="w-3 h-3 mr-1 text-purple-300" />
                    Instalaciones SHA
                  </span>
                  <span className="text-xs text-slate-400">
                    Métricas de Aulas y Sedes Propias
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">
                  Uso de Salones de Capacitación SHA
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1">
                  <span>
                    <strong className="text-white font-bold">{data.aulasSha.totalCursosSha}</strong> cursos ({data.aulasSha.porcentajeCursosEnSha}% del total)
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-emerald-400 font-bold">{formatNumber(data.aulasSha.totalCertificadosSha)}</strong> certificados ({data.aulasSha.porcentajeCertsEnSha}%)
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-purple-300 font-bold">{formatNumber(data.aulasSha.totalHorasAcademicasSha)}h</strong> de aula utilizadas
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-amber-300 font-bold">{data.aulasSha.totalEmpresasSha}</strong> empresas atendidas
                  </span>
                </div>
              </div>

              {/* Classroom Quick Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedSalon(selectedSalon === "all_sha" ? "" : "all_sha");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    selectedSalon === "all_sha"
                      ? "bg-purple-500 text-white shadow-md ring-2 ring-purple-300"
                      : "bg-white/10 text-slate-200 hover:bg-white/20"
                  }`}
                >
                  <Landmark className="w-3.5 h-3.5" />
                  Todas las Aulas SHA ({data.aulasSha.totalCursosSha})
                </button>

                {data.aulasSha.salones.map((s) => {
                  const isSelected = selectedSalon === s.nombre || selectedSalon === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        const targetVal = s.id === "sin_asignar" ? "sin_salon" : s.nombre;
                        setSelectedSalon(selectedSalon === targetVal ? "" : targetVal);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-sky-500 text-white shadow-md ring-2 ring-sky-300"
                          : "bg-white/10 text-slate-200 hover:bg-white/20"
                      }`}
                    >
                      <span>{s.id === "sin_asignar" ? "⚠️" : "🏛️"}</span>
                      {s.shortNombre} ({s.totalCursos})
                    </button>
                  );
                })}

                <button
                  onClick={() => setActiveTab("aulas")}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-purple-200 bg-purple-600/40 hover:bg-purple-600/60 border border-purple-400/40 transition-colors ml-auto sm:ml-0"
                >
                  Ver Auditoría de Aulas →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Tabs Navigation ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between overflow-x-auto">
            <div className="flex gap-6 whitespace-nowrap">
              <button
                onClick={() => setActiveTab("temas")}
                className={`py-3.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "temas"
                    ? "border-sky-600 text-sky-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Desglose por Tema y Certificados ({sortedTemas.length})
              </button>

              <button
                onClick={() => setActiveTab("aulas")}
                className={`py-3.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "aulas"
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Landmark className="w-3.5 h-3.5 text-purple-600" />
                Uso de Aulas SHA ({data?.aulasSha?.totalCursosSha ?? 0} cursos)
              </button>

              <button
                onClick={() => setActiveTab("estados")}
                className={`py-3.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "estados"
                    ? "border-sky-600 text-sky-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Distribución por Estado ({data?.estadosResumen.length ?? 0})
              </button>

              <button
                onClick={() => setActiveTab("sedes")}
                className={`py-3.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "sedes"
                    ? "border-sky-600 text-sky-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Factory className="w-3.5 h-3.5" />
                Sedes e Instalaciones ({data?.sedesResumen.length ?? 0})
              </button>
            </div>

            {loading && (
              <span className="text-xs text-sky-600 font-medium flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Cargando...
              </span>
            )}
          </div>

          {/* ─── TAB 1: DESGLOSE POR TEMA / CURSO ─────────────────────────── */}
          {activeTab === "temas" && (
            <div className="overflow-x-auto">
              {sortedTemas.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No se encontraron cursos con los filtros seleccionados.</p>
                  <p className="text-xs text-slate-400 mt-1">Prueba seleccionando otro estado, aula o limpiando los filtros.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] bg-slate-50/80">
                      <th
                        onClick={() => handleSortToggle("nombre")}
                        className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-900 select-none"
                      >
                        <div className="flex items-center gap-1">
                          Tema / Curso Impartido
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortToggle("cursos")}
                        className="py-3 px-3 font-semibold text-center cursor-pointer hover:text-slate-900 select-none"
                      >
                        <div className="flex items-center justify-center gap-1">
                          Cursos (OSIs)
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortToggle("certs")}
                        className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900 select-none"
                      >
                        <div className="flex items-center justify-end gap-1">
                          Certificados
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3 px-3 font-semibold text-center">Prom. Asistentes</th>
                      <th className="py-3 px-4 font-semibold">Empresas Capacitadas</th>
                      <th className="py-3 px-4 font-semibold">Ubicaciones / Aulas</th>
                      <th className="py-3 px-3 font-semibold text-center">Última Fecha</th>
                      <th className="py-3 px-4 font-semibold text-right">Auditoría</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedTemas.map((tema) => (
                      <tr key={tema.idCurso ? `crs-${tema.idCurso}` : `nm-${tema.nombreCurso}`} className="hover:bg-sky-50/40 transition-colors">
                        {/* Topic Name */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 text-xs">
                            {tema.nombreCurso}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center text-[10px] text-slate-500 font-medium">
                              <Clock className="w-2.5 h-2.5 mr-0.5 text-slate-400" />
                              {tema.cargaHorariaStd}h académicas
                            </span>
                            {tema.idCurso > 0 && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID: #{tema.idCurso}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Courses Held Count */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 tabular-nums">
                            {tema.totalCursos}
                          </span>
                        </td>

                        {/* Certificates Issued */}
                        <td className="py-3 px-3 text-right">
                          <span className="text-sm font-extrabold text-emerald-600 tabular-nums" suppressHydrationWarning>
                            {formatNumber(tema.totalCertificados)}
                          </span>
                        </td>

                        {/* Average attendees per course */}
                        <td className="py-3 px-3 text-center text-slate-600 tabular-nums font-medium">
                          {tema.promedioParticipantes}
                        </td>

                        {/* Companies */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {tema.empresas.slice(0, 2).map((emp) => (
                              <span
                                key={emp.id}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium truncate max-w-[130px]"
                                title={`${emp.nombre} (${emp.certsCount} certs)`}
                              >
                                {emp.nombre}
                              </span>
                            ))}
                            {tema.empresas.length > 2 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-600 font-bold">
                                +{tema.empresas.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Locations / Aulas */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {tema.sedes.slice(0, 2).map((sd, sIdx) => (
                              <span
                                key={sIdx}
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[140px] ${
                                  sd.nombre.includes("SHA")
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : "bg-sky-50 text-sky-700 border border-sky-100"
                                }`}
                                title={`${sd.nombre} (${sd.count} cursos)`}
                              >
                                <MapPin className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                                {sd.nombre} ({sd.count})
                              </span>
                            ))}
                            {tema.sedes.length > 2 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-bold">
                                +{tema.sedes.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Last Session Date */}
                        <td className="py-3 px-3 text-center text-[11px] text-slate-600 tabular-nums">
                          {tema.ultimaFecha || "—"}
                        </td>

                        {/* Audit Details Button */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setDetailModalTema(tema)}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                          >
                            Ver Cursos ({tema.totalCursos})
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ─── TAB 2: AUDITORÍA DE AULAS SHA (New Dedicated Section) ──────── */}
          {activeTab === "aulas" && (
            <div className="p-5 space-y-6">
              {/* Classroom Comparative Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data?.aulasSha.salones.map((s) => {
                  const isUnassigned = s.id === "sin_asignar";
                  const isFiltered = selectedSalon === s.nombre || (isUnassigned && selectedSalon === "sin_salon");

                  return (
                    <div
                      key={s.id}
                      className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                        isFiltered
                          ? "bg-purple-50/50 border-purple-300 ring-2 ring-purple-400/40 shadow-md"
                          : "bg-white border-slate-200 hover:shadow-md"
                      }`}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${
                              isUnassigned
                                ? "bg-amber-100 text-amber-700"
                                : s.id === "salon-principal"
                                ? "bg-sky-100 text-sky-700"
                                : s.id === "salon-oriente"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-purple-100 text-purple-700"
                            }`}>
                              <Landmark className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm">{s.nombre}</h3>
                              <span className="text-[10px] text-slate-400 block font-medium">
                                {isUnassigned ? "Instalaciones SHA — Pendiente" : "Instalaciones SHA"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar (% of usage) */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              isUnassigned
                                ? "bg-amber-400"
                                : s.id === "salon-principal"
                                ? "bg-sky-600"
                                : s.id === "salon-oriente"
                                ? "bg-amber-500"
                                : "bg-purple-600"
                            }`}
                            style={{ width: `${Math.min(s.porcentajeUso, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                          <span>{s.porcentajeUso}% de cursos SHA</span>
                          <span>Promedio: {s.promedioCertsPorCurso} certs</span>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cursos</span>
                            <span className="text-base font-extrabold text-slate-900 tabular-nums">{s.totalCursos}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Certificados</span>
                            <span className="text-base font-extrabold text-emerald-600 tabular-nums" suppressHydrationWarning>
                              {formatNumber(s.totalCertificados)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Horas</span>
                            <span className="text-base font-extrabold text-purple-700 tabular-nums">{s.totalHorasAcademicas}h</span>
                          </div>
                        </div>

                        {/* Top Courses */}
                        {s.temasTop.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Temas más dictados:
                            </span>
                            <div className="space-y-1">
                              {s.temasTop.map((tp, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-700 truncate pr-2" title={tp.nombre}>
                                    • {tp.nombre}
                                  </span>
                                  <span className="font-semibold text-emerald-600 shrink-0 tabular-nums">
                                    {tp.certs} certs
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Top Companies */}
                        {s.empresasTop.length > 0 && (
                          <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Principales Clientes:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {s.empresasTop.map((ep, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium truncate max-w-[140px]"
                                  title={`${ep.nombre} (${ep.cursos} cursos)`}
                                >
                                  {ep.nombre}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => {
                            const targetVal = isUnassigned ? "sin_salon" : s.nombre;
                            setSelectedSalon(selectedSalon === targetVal ? "" : targetVal);
                          }}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                            isFiltered
                              ? "bg-purple-600 text-white hover:bg-purple-700"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {isFiltered ? "Quitar filtro de aula" : `Filtrar cursos (${s.totalCursos})`}
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Table of all OSIs in SHA classrooms */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-purple-600" />
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Cursos Realizados en Instalaciones SHA ({allShaOsis.length})
                    </h3>
                  </div>
                  {selectedSalon && (
                    <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-md">
                      Filtro activo: {selectedSalon}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  {allShaOsis.length === 0 ? (
                    <div className="py-10 text-center text-slate-400">
                      <Landmark className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-400" />
                      <p className="text-xs font-medium">No hay servicios registrados en instalaciones SHA para los filtros seleccionados.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] bg-slate-50">
                          <th className="py-2.5 px-3 font-semibold">Nro OSI</th>
                          <th className="py-2.5 px-3 font-semibold">Aula / Salón</th>
                          <th className="py-2.5 px-3 font-semibold">Fecha</th>
                          <th className="py-2.5 px-3 font-semibold">Curso / Tema</th>
                          <th className="py-2.5 px-3 font-semibold">Cliente / Empresa</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Horas</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Certificados</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allShaOsis.map((osi) => (
                          <tr key={osi.idOsi} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-sky-700">
                              {osi.nroOsi}
                            </td>
                            <td className="py-2.5 px-3">
                              {osi.salon ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                                  🏛️ {osi.salon}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                  ⚠️ Por confirmar
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 tabular-nums">
                              {osi.fechaFin || osi.fechaInicio || "—"}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-900 max-w-xs truncate" title={osi.servicio}>
                              {osi.servicio}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 truncate max-w-[180px]" title={osi.empresaNombre}>
                              {osi.empresaNombre}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-700 tabular-nums">
                              {osi.horasAcademicas}h
                            </td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600 tabular-nums">
                              {osi.certificadosEmitidos}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => setPreviewOsiId(osi.idOsi)}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition"
                              >
                                Ver OSI
                                <ExternalLink className="w-2.5 h-2.5 ml-1" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 3: DISTRIBUCIÓN POR ESTADO ───────────────────────────── */}
          {activeTab === "estados" && (
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data?.estadosResumen.map((est) => {
                  const maxCerts = data.estadosResumen[0]?.totalCertificados || 1;
                  const pct = Math.round((est.totalCertificados / maxCerts) * 100);

                  return (
                    <div
                      key={est.idEstado}
                      className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-slate-900 text-sm">{est.nombreEstado}</h3>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedEstadoId(est.idEstado);
                              setActiveTab("temas");
                            }}
                            className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 inline-flex items-center gap-0.5"
                          >
                            Filtrar
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                          <div className="bg-sky-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cursos</span>
                            <span className="text-sm font-bold text-slate-800">{est.totalCursos}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Certificados</span>
                            <span className="text-sm font-bold text-emerald-600" suppressHydrationWarning>{formatNumber(est.totalCertificados)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Empresas</span>
                            <span className="text-sm font-bold text-slate-800">{est.totalEmpresas}</span>
                          </div>
                        </div>

                        {/* Top Topics in that State */}
                        {est.temasTop.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                              Temas más solicitados:
                            </span>
                            <div className="space-y-1">
                              {est.temasTop.map((tp, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-slate-700 truncate pr-2 max-w-[200px]" title={tp.nombre}>
                                    • {tp.nombre}
                                  </span>
                                  <span className="font-semibold text-emerald-600 text-[11px] tabular-nums">
                                    {tp.certs} certs
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── TAB 4: SEDES E INSTALACIONES ─────────────────────────────── */}
          {activeTab === "sedes" && (
            <div className="overflow-x-auto">
              {data?.sedesResumen.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Factory className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No se encontraron sedes con los filtros seleccionados.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] bg-slate-50/80">
                      <th className="py-3 px-4 font-semibold">Sede / Dirección de Ejecución</th>
                      <th className="py-3 px-3 font-semibold">Estado y Ciudad</th>
                      <th className="py-3 px-4 font-semibold">Cliente Principal</th>
                      <th className="py-3 px-3 font-semibold text-center">Cursos Impartidos</th>
                      <th className="py-3 px-3 font-semibold text-right">Certificados Emitidos</th>
                      <th className="py-3 px-3 font-semibold text-center">Temas Distintos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.sedesResumen.map((s) => (
                      <tr key={s.sedeKey} className="hover:bg-sky-50/40 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900 max-w-sm">
                          <div className="flex items-start gap-1.5">
                            {s.isShaVenue ? (
                              <Building2 className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
                            ) : (
                              <Factory className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                            )}
                            <div>
                              <span className="line-clamp-2">{s.nombreSede}</span>
                              {s.isShaVenue && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 mt-0.5">
                                  🏛️ Sede Propia SHA {s.salon ? `• ${s.salon}` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-slate-800">{s.estadoNombre}</span>
                          {s.ciudadNombre && (
                            <span className="block text-[11px] text-slate-400">{s.ciudadNombre}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <div className="font-medium text-slate-900 line-clamp-1" title={s.empresaNombre}>
                            {s.empresaNombre}
                          </div>
                          {s.empresas && s.empresas.length > 1 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium border border-slate-200"
                                title={s.empresas.map((e) => `${e.nombre} (${e.cursosCount} cursos, ${e.certsCount} certs)`).join("\n")}
                              >
                                +{s.empresas.length - 1} {s.empresas.length - 1 === 1 ? "empresa más" : "empresas más"}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 tabular-nums">
                            {s.totalCursos}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-emerald-600 tabular-nums" suppressHydrationWarning>
                          {formatNumber(s.totalCertificados)}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600 font-medium tabular-nums">
                          {s.temasCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── DRILL-DOWN AUDIT MODAL (OSIs of selected course) ───────────── */}
      {detailModalTema && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/70">
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 uppercase tracking-wider">
                  Auditoría de Cursos Impartidos
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {detailModalTema.nombreCurso}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>
                    <strong>{detailModalTema.totalCursos}</strong> servicios impartidos
                  </span>
                  <span>•</span>
                  <span>
                    <strong>{detailModalTema.totalCertificados}</strong> certificados emitidos
                  </span>
                  <span>•</span>
                  <span>
                    <strong>{detailModalTema.cargaHorariaStd}h</strong> carga académica
                  </span>
                </div>
              </div>

              <button
                onClick={() => setDetailModalTema(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: List of OSIs */}
            <div className="p-5 overflow-y-auto flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] bg-slate-50">
                      <th className="py-2.5 px-3 font-semibold">Nro OSI</th>
                      <th className="py-2.5 px-3 font-semibold">Fecha</th>
                      <th className="py-2.5 px-3 font-semibold">Empresa / Cliente</th>
                      <th className="py-2.5 px-3 font-semibold">Ubicación / Sede</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Horas</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Certificados</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailModalTema.osis.map((osi) => (
                      <tr key={osi.idOsi} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-700">
                          {osi.nroOsi}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 tabular-nums">
                          {osi.fechaFin || osi.fechaInicio || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {osi.empresaNombre}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs">
                          <span className="font-semibold text-slate-800">{osi.estadoNombre}</span>
                          {osi.ciudadNombre && <span className="text-slate-500">, {osi.ciudadNombre}</span>}
                          {osi.sede && (
                            <span className="block text-[11px] text-slate-400 truncate" title={osi.sede}>
                              {osi.sede}
                            </span>
                          )}

                          {/* Salón SHA badge */}
                          {osi.isShaVenue && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Salón:
                              </span>
                              {osi.salon ? (
                                <span className="text-[11px] font-semibold rounded px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">
                                  🏛️ {osi.salon}
                                </span>
                              ) : (
                                <span
                                  className="text-[10px] font-medium rounded px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200"
                                  title="Servicio en sede SHA pendiente de asignación específica de salón"
                                >
                                  ⚠️ Por confirmar
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-700 tabular-nums font-medium">
                          {osi.horasAcademicas}h
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600 tabular-nums">
                          {osi.certificadosEmitidos}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setPreviewOsiId(osi.idOsi)}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100"
                          >
                            Ver OSI
                            <ExternalLink className="w-2.5 h-2.5 ml-1" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setDetailModalTema(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── IN-APP OSI PREVIEW MODAL ────────────────────────────────────── */}
      {previewOsiId && (
        <OsiPreviewModal
          osiId={previewOsiId}
          isOpen={true}
          onClose={() => setPreviewOsiId(null)}
        />
      )}
    </div>
  );
}
