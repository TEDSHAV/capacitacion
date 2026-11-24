"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  Download,
  RefreshCw,
  SlidersHorizontal,
  X,
  AlertTriangle,
  Landmark,
} from "lucide-react";
import {
  getCoberturaGeograficaData,
  type CoberturaDataResponse,
  type CoberturaFilters,
  type CoberturaOsiItem,
} from "@/app/actions/cobertura-geografica";
import { OsiPreviewModal } from "@/components/osi/OsiPreviewModal";
import SalonesCalendarView from "./SalonesCalendarView";

interface Props {
  initialData: CoberturaDataResponse | null;
  shellUrl?: string;
}

const DATE_PRESETS = [
  { label: "1 mes", value: "1m" },
  { label: "3 meses", value: "3m" },
  { label: "6 meses", value: "6m" },
  { label: "Este año", value: "year" },
  { label: "Todo", value: "all" },
  { label: "Personalizado", value: "custom" },
];

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDateRange(preset: string): { from?: string; to?: string } {
  const now = new Date();
  const to = toLocalYmd(now);

  if (preset === "1m") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return { from: toLocalYmd(from), to };
  }
  if (preset === "3m") {
    const from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    return { from: toLocalYmd(from), to };
  }
  if (preset === "6m") {
    const from = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    return { from: toLocalYmd(from), to };
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

export default function CoberturaGeograficaClient({ initialData }: Props) {
  const [data, setData] = useState<CoberturaDataResponse | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Classroom-focused Filters State
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null);
  const [selectedCursoId, setSelectedCursoId] = useState<number | null>(null);
  const [selectedSalon, setSelectedSalon] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");

  // Modal State for OSI preview
  const [previewOsiId, setPreviewOsiId] = useState<number | null>(null);

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
        empresaId: selectedEmpresaId,
        cursoId: selectedCursoId,
        salon: selectedSalon || "all_sha",
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

  const resetFilters = () => {
    setSelectedEmpresaId(null);
    setSelectedCursoId(null);
    setSelectedSalon("");
    setSearchQuery("");
    setDatePreset("all");
    setCustomDateFrom("");
    setCustomDateTo("");
  };

  const hasActiveFilters = Boolean(
    selectedEmpresaId ||
      selectedCursoId ||
      selectedSalon ||
      searchQuery ||
      datePreset !== "all" ||
      customDateFrom ||
      customDateTo,
  );

  // Flattened all OSIs executed in SHA facilities for the classroom calendar
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

  // Export SHA classroom courses to CSV (Excel-ready UTF-8 with BOM)
  const handleExportCSV = () => {
    if (!allShaOsis.length) return;

    const rows: string[][] = [
      [
        "Nro OSI",
        "Salón SHA",
        "Fecha Inicio",
        "Fecha Fin",
        "Curso / Tema",
        "Cliente / Empresa",
      ],
    ];

    for (const osi of allShaOsis) {
      rows.push([
        `"${osi.nroOsi}"`,
        `"${osi.salon || "Sin asignar / Por confirmar"}"`,
        osi.fechaInicio || "",
        osi.fechaFin || osi.fechaInicio || "",
        `"${osi.servicio.replace(/"/g, '""')}"`,
        `"${osi.empresaNombre.replace(/"/g, '""')}"`,
      ]);
    }

    const csvContent = "\uFEFF" + rows.map((r) => r.join(";")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Disponibilidad_Aulas_SHA_${new Date().toISOString().slice(0, 10)}.csv`;
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
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                  <Landmark className="w-3 h-3 mr-1" />
                  Instalaciones SHA
                </span>
                {data?.timing && (
                  <span className="text-[11px] text-slate-400">
                    Procesado en {data.timing.totalMs}ms
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                Calendario y Disponibilidad de Salones SHA
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Control de ocupación, disponibilidad semanal y asignación de aulas para cursos en sede SHA.
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
                  className={`w-3.5 h-3.5 mr-1.5 ${
                    loading ? "animate-spin text-sky-600" : "text-slate-400"
                  }`}
                />
                Actualizar
              </button>

              <button
                onClick={handleExportCSV}
                disabled={allShaOsis.length === 0}
                className="inline-flex items-center px-3.5 py-2 border border-sky-600 shadow-sm text-xs font-semibold rounded-lg text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Exportar CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-5">
        {/* ─── Streamlined Classroom Filter Bar ──────────────────────────── */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <SlidersHorizontal className="w-4 h-4 text-sky-600" />
              Filtros de Salones y Cursos SHA
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

          {/* Quick Classroom Pills */}
          {data?.aulasSha && (
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
              <button
                onClick={() => setSelectedSalon("")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                  !selectedSalon || selectedSalon === "all_sha"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                Todas las Aulas ({data.aulasSha.totalCursosSha})
              </button>

              {data.aulasSha.salones.map((s) => {
                const targetVal = s.id === "sin_asignar" ? "sin_salon" : s.nombre;
                const isSelected = selectedSalon === targetVal;
                const isUnassigned = s.id === "sin_asignar";

                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSalon(isSelected ? "" : targetVal)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                      isSelected
                        ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                        : isUnassigned && s.totalCursos > 0
                        ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{isUnassigned ? "⚠️" : "🏛️"}</span>
                    {s.shortNombre} ({s.totalCursos})
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Salón SHA Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Salón SHA
              </label>
              <select
                value={selectedSalon}
                onChange={(e) => setSelectedSalon(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition font-medium"
              >
                <option value="">
                  Todas las Aulas SHA{" "}
                  {data?.aulasSha ? `(${data.aulasSha.totalCursosSha})` : ""}
                </option>
                {data?.catalogs?.salonesDetalle ? (
                  data.catalogs.salonesDetalle.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id === "sin_salon" ? "⚠️" : "🏛️"} {s.nombre} ({s.totalCursos})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Salón Principal">🏛️ Salón Principal</option>
                    <option value="Salón Oriente">🏛️ Salón Oriente</option>
                    <option value="Salón Elite">🏛️ Salón Elite</option>
                    <option value="sin_salon">⚠️ Por confirmar / Sin asignar</option>
                  </>
                )}
              </select>
            </div>

            {/* Empresa Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Cliente / Empresa
              </label>
              <select
                value={selectedEmpresaId ?? ""}
                onChange={(e) =>
                  setSelectedEmpresaId(e.target.value ? Number(e.target.value) : null)
                }
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
                Tema / Curso
              </label>
              <select
                value={selectedCursoId ?? ""}
                onChange={(e) =>
                  setSelectedCursoId(e.target.value ? Number(e.target.value) : null)
                }
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
          </div>

          {/* Search bar & Period row */}
          <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por tema, salón (Salón Principal, Oriente, Elite), cliente o nro de OSI..."
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

        {/* ─── MAIN VIEW: CLASSROOM CALENDAR & AVAILABILITY ──────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <SalonesCalendarView
            allShaOsis={allShaOsis}
            salonesSummary={data?.aulasSha.salones || []}
            selectedSalon={selectedSalon}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onSelectSalon={setSelectedSalon}
            onPreviewOsi={setPreviewOsiId}
            onSalonUpdated={loadData}
            formatNumber={formatNumber}
          />
        </div>
      </div>

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
