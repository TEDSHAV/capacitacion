"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  BookOpen,
  Users,
  MapPin,
  CreditCard,
  Award,
  Clock,
  DollarSign,
  TrendingUp,
  Search,
  ExternalLink,
  Printer,
  AlertCircle,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ChevronRight,
  Filter,
  ClipboardList,
  Star,
  Check,
  Calendar,
  Sparkles,
  Info,
} from "lucide-react";
import { getReportesV2Data, type ReportesV2Data } from "@/app/actions/reportes-v2";

export type DimensionTab =
  | "overview"
  | "cursos"
  | "facilitadores"
  | "empresas"
  | "carnets"
  | "surveys"
  | "tendencias"
  | "ubicaciones";

interface Props {
  activeTab?: string;
  onTabChange?: (tab: any) => void;
  dateFrom?: string;
  dateTo?: string;
  selectedState?: string;
  shellUrl?: string;
}

// Module-level in-memory cache for instant navigation without stuck loading screens
const v2DataCache = new Map<string, { data: ReportesV2Data; timestamp: number }>();

export default function ReportesV2View({
  activeTab = "overview",
  onTabChange,
  dateFrom,
  dateTo,
  selectedState,
  shellUrl = "",
}: Props) {
  const cacheKey = `${dateFrom || "all"}_${dateTo || "all"}_${selectedState || "all"}`;
  const initialCached = v2DataCache.get(cacheKey);

  const [data, setData] = useState<ReportesV2Data | null>(initialCached?.data ?? null);
  const [loading, setLoading] = useState(!initialCached);
  const [error, setError] = useState<string | null>(null);
  const [internalTab, setInternalTab] = useState<DimensionTab>(
    (activeTab as DimensionTab) || "overview",
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Sync internal tab if activeTab prop changes
  useEffect(() => {
    if (activeTab) {
      setInternalTab(activeTab as DimensionTab);
      setSearchTerm("");
    }
  }, [activeTab]);

  const handleTabSelect = (tab: DimensionTab) => {
    setInternalTab(tab);
    setSearchTerm("");
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    const cached = v2DataCache.get(cacheKey);

    if (cached) {
      setData(cached.data);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }

    getReportesV2Data(dateFrom, dateTo, selectedState)
      .then((res) => {
        if (!isCancelled) {
          if (res.error) {
            if (!cached) setError(res.error);
          } else if (res.data) {
            v2DataCache.set(cacheKey, { data: res.data, timestamp: Date.now() });
            setData(res.data);
            setError(null);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          if (!cached) setError(err.message || "Error al cargar datos");
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [cacheKey, dateFrom, dateTo, selectedState]);

  // Search filtering for each dimension
  const filteredCompanies = useMemo(() => {
    if (!data?.companies) return [];
    if (!searchTerm.trim()) return data.companies;
    const term = searchTerm.toLowerCase();
    return data.companies.filter(
      (c) =>
        c.razonSocial.toLowerCase().includes(term) ||
        c.rif.toLowerCase().includes(term) ||
        c.states.some((s) => s.toLowerCase().includes(term)),
    );
  }, [data?.companies, searchTerm]);

  const filteredCourses = useMemo(() => {
    if (!data?.courses) return [];
    if (!searchTerm.trim()) return data.courses;
    const term = searchTerm.toLowerCase();
    return data.courses.filter((c) => c.nombre.toLowerCase().includes(term));
  }, [data?.courses, searchTerm]);

  const filteredFacilitators = useMemo(() => {
    if (!data?.facilitators) return [];
    if (!searchTerm.trim()) return data.facilitators;
    const term = searchTerm.toLowerCase();
    return data.facilitators.filter(
      (f) =>
        f.nombreApellido.toLowerCase().includes(term) ||
        (f.cedula && f.cedula.toLowerCase().includes(term)) ||
        f.estadoNombre.toLowerCase().includes(term),
    );
  }, [data?.facilitators, searchTerm]);

  const filteredLocations = useMemo(() => {
    if (!data?.locations) return [];
    if (!searchTerm.trim()) return data.locations;
    const term = searchTerm.toLowerCase();
    return data.locations.filter((l) => l.nombreEstado.toLowerCase().includes(term));
  }, [data?.locations, searchTerm]);

  const filteredSurveys = useMemo(() => {
    if (!data?.surveysData?.osis) return [];
    if (!searchTerm.trim()) return data.surveysData.osis;
    const term = searchTerm.toLowerCase();
    return data.surveysData.osis.filter(
      (s) =>
        s.nroOsi.toLowerCase().includes(term) ||
        s.empresaNombre.toLowerCase().includes(term) ||
        s.cursoNombre.toLowerCase().includes(term),
    );
  }, [data?.surveysData?.osis, searchTerm]);

  // PDF / Print Preview trigger
  const handlePrintPdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-gray-800">Cargando métricas de reportes...</p>
        <p className="text-xs text-gray-400 mt-1 max-w-md text-center">
          Consultas en paralelo directo a Supabase, resolución relacional sin truncamientos.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-red-900">Error al cargar reportes</h3>
          <p className="text-xs text-red-700 mt-1">{error || "No se pudieron obtener los datos."}</p>
        </div>
      </div>
    );
  }

  const { overview } = data;

  return (
    <div className="space-y-6">
      {/* ── Top Highlights & Accuracy Banner ─────────────────────────────── */}
      <div className="bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-200 text-xs font-semibold mb-2 border border-sky-400/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Métricas Consolidadas y Precisas</span>
              {data.timing && (
                <span className="text-sky-300/80 font-mono text-[11px] ml-1">
                  · {data.timing.totalMs}ms (consulta {data.timing.fetchMs}ms + cómputo {data.timing.processMs}ms)
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold tracking-tight">Panel Ejecutivo de Capacitación</h2>
            <p className="text-xs text-sky-100/80 mt-1 max-w-2xl leading-relaxed">
              Métricas reales consolidadas: {overview.totalCertificates.toLocaleString()} certificados, {overview.totalCarnets.toLocaleString()} carnets y ${overview.totalHonorariosFacilitadores.toLocaleString()} en honorarios pagados a facilitadores vía requisición.
            </p>
          </div>
          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-gray-900 hover:bg-gray-100 font-semibold text-xs transition-colors shadow-sm shrink-0"
            title="Vista previa e impresión / Descargar en PDF"
          >
            <Printer className="w-4 h-4 text-sky-600" />
            Vista Previa / PDF
          </button>
        </div>
      </div>

      {/* ── 6 KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Certificados */}
        <div
          onClick={() => handleTabSelect("overview")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            internalTab === "overview"
              ? "bg-sky-50/70 border-sky-300 shadow-sm ring-1 ring-sky-400"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Certificados</span>
            <Award className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {overview.totalCertificates.toLocaleString()}
            </span>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {overview.activeCertificates.toLocaleString()} activos
            </p>
          </div>
        </div>

        {/* Card 2: Carnets PVC */}
        <div
          onClick={() => handleTabSelect("carnets")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            internalTab === "carnets"
              ? "bg-indigo-50/70 border-indigo-300 shadow-sm ring-1 ring-indigo-400"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Carnets PVC</span>
            <CreditCard className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {overview.totalCarnets.toLocaleString()}
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {overview.carnetsExpiringSoon > 0 ? (
                <span className="text-amber-600 font-medium">
                  {overview.carnetsExpiringSoon} por vencer
                </span>
              ) : (
                <span>{overview.activeCarnets} vigentes</span>
              )}
            </p>
          </div>
        </div>

        {/* Card 3: Horas Académicas */}
        <div
          onClick={() => handleTabSelect("cursos")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            internalTab === "cursos"
              ? "bg-amber-50/70 border-amber-300 shadow-sm ring-1 ring-amber-400"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Horas Dictadas</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {overview.totalHoursDelivered.toLocaleString()}h
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              en {overview.totalOsis} grupos impartidos
            </p>
          </div>
        </div>

        {/* Card 4: Honorarios Facilitadores ($ Pagado Real) */}
        <div
          onClick={() => handleTabSelect("facilitadores")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            internalTab === "facilitadores"
              ? "bg-emerald-50/70 border-emerald-300 shadow-sm ring-1 ring-emerald-400"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Honorarios ($)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-700 tabular-nums">
              ${overview.totalHonorariosFacilitadores.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {overview.totalFacilitatorHours.toLocaleString()}h autorizadas
            </p>
          </div>
        </div>

        {/* Card 5: Empresas */}
        <div
          onClick={() => handleTabSelect("empresas")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            internalTab === "empresas"
              ? "bg-purple-50/70 border-purple-300 shadow-sm ring-1 ring-purple-400"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Empresas</span>
            <Building2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {overview.totalCompanies.toLocaleString()}
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {overview.totalCourses} temas del catálogo
            </p>
          </div>
        </div>

        {/* Card 6: Facilitadores Pagados */}
        <div
          onClick={() => handleTabSelect("facilitadores")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            internalTab === "facilitadores"
              ? "bg-rose-50/70 border-rose-300 shadow-sm ring-1 ring-rose-400"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Facilitadores</span>
            <Users className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {overview.paidFacilitatorsCount}
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              con honorarios procesados
            </p>
          </div>
        </div>
      </div>

      {/* ── Sub-Nav Pills & Filters ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
          {/* Pill selector */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => handleTabSelect("overview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                internalTab === "overview"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Vista General
            </button>

            <button
              onClick={() => handleTabSelect("cursos")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                internalTab === "cursos"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Cursos ({data.courses.length})
            </button>

            <button
              onClick={() => handleTabSelect("facilitadores")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                internalTab === "facilitadores"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Facilitadores ({data.facilitators.length})
            </button>

            <button
              onClick={() => handleTabSelect("empresas")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                internalTab === "empresas"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Empresas ({data.companies.length})
            </button>

            <button
              onClick={() => handleTabSelect("carnets")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                internalTab === "carnets"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Carnets ({data.carnetsData?.total || 0})
            </button>

            <button
              onClick={() => handleTabSelect("surveys")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                internalTab === "surveys"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Satisfacción ({data.surveysData?.totalSurveys || 0})
            </button>

            <button
              onClick={() => handleTabSelect("tendencias")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                internalTab === "tendencias"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Tendencias
            </button>

            <button
              onClick={() => handleTabSelect("ubicaciones")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                internalTab === "ubicaciones"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Estados ({data.locations.length})
            </button>
          </div>

          {/* Quick search input */}
          {internalTab !== "overview" && internalTab !== "tendencias" && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Buscar en ${internalTab}...`}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          )}
        </div>

        {/* ─── TAB 1: OVERVIEW COCKPIT ───────────────────────────────────── */}
        {internalTab === "overview" && (
          <div className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Top Facilitadores con Honorarios */}
              <div className="bg-slate-50/60 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Honorarios por Facilitador
                  </h4>
                  <button
                    onClick={() => handleTabSelect("facilitadores")}
                    className="text-[11px] font-semibold text-sky-600 hover:underline"
                  >
                    Ver todos →
                  </button>
                </div>
                <div className="space-y-2">
                  {data.facilitators.slice(0, 5).map((f, idx) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-gray-100"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-gray-800 mr-1.5">{idx + 1}.</span>
                        <span className="text-gray-700 font-medium">{f.nombreApellido}</span>
                        <span className="block text-[10px] text-gray-400">{f.cedula || "Docente"}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-emerald-700 tabular-nums">
                          ${f.totalHonorarios.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 block tabular-nums">
                          {f.totalHours}h requisición
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Cursos Dictados */}
              <div className="bg-slate-50/60 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    Cursos con Más Horas Dictadas
                  </h4>
                  <button
                    onClick={() => handleTabSelect("cursos")}
                    className="text-[11px] font-semibold text-sky-600 hover:underline"
                  >
                    Ver todos →
                  </button>
                </div>
                <div className="space-y-2">
                  {data.courses.slice(0, 5).map((c, idx) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-gray-100"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-gray-800 mr-1.5">{idx + 1}.</span>
                        <span className="text-gray-700 font-medium">{c.nombre}</span>
                        <span className="block text-[10px] text-gray-400">{c.totalOsis} grupos impartidos ({c.cargaHorariaStd}h c/u)</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-amber-700 tabular-nums">{c.totalHours}h</span>
                        <span className="text-[10px] text-gray-400 block tabular-nums">{c.totalCertificates} certs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Empresas */}
              <div className="bg-slate-50/60 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    Empresas con Mayor Participación
                  </h4>
                  <button
                    onClick={() => handleTabSelect("empresas")}
                    className="text-[11px] font-semibold text-sky-600 hover:underline"
                  >
                    Ver todas →
                  </button>
                </div>
                <div className="space-y-2">
                  {data.companies.slice(0, 5).map((comp, idx) => (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-gray-100"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-gray-800 mr-1.5">{idx + 1}.</span>
                        <span className="text-gray-700 font-medium">{comp.razonSocial}</span>
                        <span className="block text-[10px] text-gray-400">{comp.rif}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-gray-900 tabular-nums">{comp.totalCertificates}</span>
                        <span className="text-[10px] text-gray-400 block tabular-nums">{comp.totalHours}h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Link Card to KPIs / Indicadores */}
            <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-sky-950 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600" />
                  Métricas Operativas: Cumplimiento de 72 Horas y Arrastre de OSIs
                </h4>
                <p className="text-xs text-sky-800 mt-1 max-w-2xl leading-relaxed">
                  Para auditar el plazo de emisión de certificados (dentro de los 3 días hábiles post-ejecución) y el seguimiento de OSIs (ejecutadas, pendientes, arrastradas y planificadas para los próximos meses), consulta la sección de Indicadores.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/dashboard/capacitacion/indicadores?tab=72h"
                  className="px-3 py-1.5 bg-sky-600 text-white hover:bg-sky-700 text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Auditoría 72h →
                </Link>
                <Link
                  href="/dashboard/capacitacion/indicadores?tab=gestion"
                  className="px-3 py-1.5 bg-white border border-sky-300 text-sky-900 hover:bg-sky-50 text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Flujo Mensual OSIs →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: CURSOS ─────────────────────────────────────────────── */}
        {internalTab === "cursos" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Aclaratoria sobre horas académicas:</strong> La columna <em>Horas Dictadas</em> corresponde a la suma real de las sesiones ejecutadas en todos los grupos atendidos (por ejemplo, <em>Excelencia Operacional</em> es un curso de 16h estándar que se ha dictado a 31 grupos distintos, acumulando 545h de docencia efectiva). No debe confundirse con la duración de una sola edición.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] bg-gray-50/70">
                    <th className="py-2.5 px-3 font-semibold">Curso / Tema</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Duración Std</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Grupos (OSIs)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Horas Dictadas</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Participantes</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Empresas</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Facilitadores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCourses.map((c) => (
                    <tr key={c.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-3 px-3 font-medium text-gray-900 max-w-[280px]">
                        {c.nombre}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-500 tabular-nums">
                        {c.cargaHorariaStd}h
                      </td>
                      <td className="py-3 px-3 text-right text-sky-700 font-semibold tabular-nums">
                        {c.totalOsis}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-700 font-bold tabular-nums">
                        {c.totalHours}h
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900 tabular-nums">
                        {c.totalCertificates.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700 tabular-nums">
                        {c.totalCompanies}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700 tabular-nums">
                        {c.totalFacilitators}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>
                * <strong>Horas Dictadas</strong>: Tiempo total acumulado de instrucción impartido en los grupos y OSIs ejecutadas.
              </span>
              <span>
                Mostrando {filteredCourses.length} cursos impartidos
              </span>
            </div>
          </div>
        )}

        {/* ─── TAB 3: FACILITADORES ──────────────────────────────────────── */}
        {internalTab === "facilitadores" && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                <span className="text-xs font-semibold uppercase text-emerald-800 tracking-wider">
                  Total Honorarios Pagados
                </span>
                <p className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
                  ${overview.totalHonorariosFacilitadores.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Procesado por Administración vía requisición
                </p>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                <span className="text-xs font-semibold uppercase text-amber-800 tracking-wider">
                  Horas Totales Pagadas
                </span>
                <p className="text-2xl font-bold text-amber-800 mt-1 tabular-nums">
                  {overview.totalFacilitatorHours.toLocaleString()}h
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Horas académicas registradas en requisiciones
                </p>
              </div>

              <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-4">
                <span className="text-xs font-semibold uppercase text-sky-800 tracking-wider">
                  Docentes Remunerados
                </span>
                <p className="text-2xl font-bold text-sky-900 mt-1 tabular-nums">
                  {overview.paidFacilitatorsCount}
                </p>
                <p className="text-[11px] text-sky-700 mt-0.5">
                  de {overview.totalFacilitators} facilitadores activos
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] bg-gray-50/70">
                    <th className="py-2.5 px-3 font-semibold">Facilitador</th>
                    <th className="py-2.5 px-3 font-semibold">Cédula</th>
                    <th className="py-2.5 px-3 font-semibold">Estado Base</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Horas Requisición</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Honorarios Pagados ($)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Grupos (OSIs)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Certificados</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Temas</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Estatus Requisición</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredFacilitators.map((f) => (
                    <tr key={f.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-3 px-3 font-medium text-gray-900">
                        {f.nombreApellido}
                      </td>
                      <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">{f.cedula || "N/A"}</td>
                      <td className="py-3 px-3 text-gray-600">{f.estadoNombre}</td>
                      <td className="py-3 px-3 text-right text-amber-700 font-bold tabular-nums">
                        {f.totalHours}h
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-600 font-bold text-sm tabular-nums">
                        ${f.totalHonorarios.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-3 text-right text-sky-700 font-semibold tabular-nums">
                        {f.totalOsis}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-gray-900 tabular-nums">
                        {f.totalCertificates.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700 tabular-nums">
                        {f.uniqueCourses}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {f.hasRequisicion ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3" /> Procesada
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                            Sin Requisición
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 4: EMPRESAS ───────────────────────────────────────────── */}
        {internalTab === "empresas" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] bg-gray-50/70">
                  <th className="py-2.5 px-3 font-semibold">Empresa / Cliente</th>
                  <th className="py-2.5 px-3 font-semibold">RIF</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Certificados</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Carnets</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Grupos (OSIs)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Horas Recibidas</th>
                  <th className="py-2.5 px-3 font-semibold">Estados Atendidos</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCompanies.map((c) => (
                  <tr key={c.id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-gray-900">
                      {c.razonSocial}
                    </td>
                    <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">{c.rif}</td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900 tabular-nums">
                      {c.totalCertificates.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 tabular-nums">
                      {c.totalCarnets.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-sky-700 font-semibold tabular-nums">
                      {c.totalOsis}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 tabular-nums">
                      {c.totalHours}h
                    </td>
                    <td className="py-3 px-3 text-gray-500 max-w-[200px] truncate" title={c.states.join(", ")}>
                      {c.states.join(", ") || "—"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/dashboard/capacitacion/gestion-osi?search=${encodeURIComponent(c.razonSocial)}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-800"
                      >
                        OSIs <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── TAB 5: CARNETS ────────────────────────────────────────────── */}
        {internalTab === "carnets" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-gray-200">
                <span className="text-xs font-semibold uppercase text-gray-500">Total Carnets</span>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {data.carnetsData?.total.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Emitidos históricamente</p>
              </div>

              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                <span className="text-xs font-semibold uppercase text-emerald-700">Carnets Vigentes</span>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  {data.carnetsData?.active.toLocaleString()}
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">Válidos para laborar</p>
              </div>

              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                <span className="text-xs font-semibold uppercase text-amber-700">Por Vencer (≤30 días)</span>
                <p className="text-2xl font-bold text-amber-900 mt-1">
                  {data.carnetsData?.expiringSoon.toLocaleString()}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">Requieren renovación</p>
              </div>

              <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200">
                <span className="text-xs font-semibold uppercase text-rose-700">Carnets Vencidos</span>
                <p className="text-2xl font-bold text-rose-900 mt-1">
                  {data.carnetsData?.expired.toLocaleString()}
                </p>
                <p className="text-xs text-rose-700 mt-0.5">Plazo expirado</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Muestra de Carnets Recientes
                </h4>
                <span className="text-xs text-gray-400">Últimos registros</span>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] bg-gray-50/70">
                    <th className="py-2.5 px-3 font-semibold">ID Carnet</th>
                    <th className="py-2.5 px-3 font-semibold">Empresa Asociada</th>
                    <th className="py-2.5 px-3 font-semibold">Fecha Emisión</th>
                    <th className="py-2.5 px-3 font-semibold">Fecha Vencimiento</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(data.carnetsData?.recent || []).map((c) => (
                    <tr key={c.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-gray-900">
                        #{c.id}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-800">
                        {c.empresaNombre}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">{c.fechaEmision || "—"}</td>
                      <td className="py-2.5 px-3 text-gray-600">{c.fechaVencimiento || "—"}</td>
                      <td className="py-2.5 px-3 text-center">
                        {c.status === "vigente" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Vigente
                          </span>
                        )}
                        {c.status === "por_vencer" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Por Vencer
                          </span>
                        )}
                        {c.status === "vencido" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Vencido
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 6: SATISFACCIÓN (SURVEYS) ─────────────────────────────── */}
        {internalTab === "surveys" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10 border border-amber-200 rounded-xl p-5 flex flex-col justify-center">
                <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                  Calificación Global de Satisfacción
                </span>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-4xl font-extrabold text-amber-600">
                    {data.surveysData.averageScore}
                  </span>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[1, 2, 3, 4, 5].map((st) => (
                        <Star
                          key={st}
                          className={`w-4 h-4 ${
                            st <= Math.round(data.surveysData.averageScore)
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 mt-1">
                      Basado en {data.surveysData.totalSurveys} encuestas
                    </span>
                  </div>
                </div>
              </div>

              {/* Breakdown by questions */}
              <div className="md:col-span-2 bg-slate-50/70 border border-gray-200 rounded-xl p-5">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                  Promedio por Dimensiones Evaluadas (Escala 1 a 5)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Q1 Contenido</span>
                    <span className="text-base font-bold text-gray-800 mt-1 block">
                      {data.surveysData.questionAverages.q1} / 5
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Q2 Facilitador</span>
                    <span className="text-base font-bold text-gray-800 mt-1 block">
                      {data.surveysData.questionAverages.q2} / 5
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Q3 Didáctica</span>
                    <span className="text-base font-bold text-gray-800 mt-1 block">
                      {data.surveysData.questionAverages.q3} / 5
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Q4 Organización</span>
                    <span className="text-base font-bold text-gray-800 mt-1 block">
                      {data.surveysData.questionAverages.q4} / 5
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Q5 Utilidad</span>
                    <span className="text-base font-bold text-gray-800 mt-1 block">
                      {data.surveysData.questionAverages.q5} / 5
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Surveys by OSI Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] bg-gray-50/70">
                    <th className="py-2.5 px-3 font-semibold">Nro OSI</th>
                    <th className="py-2.5 px-3 font-semibold">Empresa</th>
                    <th className="py-2.5 px-3 font-semibold">Curso Dictado</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Encuestas</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Rating Medio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSurveys.map((s) => (
                    <tr key={s.idOsi} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-sky-700">
                        {s.nroOsi}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-900">{s.empresaNombre}</td>
                      <td className="py-2.5 px-3 text-gray-700">{s.cursoNombre}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-800 tabular-nums">
                        {s.surveyCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-600 tabular-nums">
                        ★ {s.averageRating}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 7: TENDENCIAS ─────────────────────────────────────────── */}
        {internalTab === "tendencias" && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Evolución Mensual (Últimos 12 Meses)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] bg-gray-50/70">
                    <th className="py-2.5 px-3 font-semibold">Mes</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Certificados</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Carnets PVC</th>
                    <th className="py-2.5 px-3 font-semibold text-right">OSIs Ejecutadas</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Horas Académicas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.monthlyTrends.map((m) => (
                    <tr key={m.monthKey} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-gray-900">{m.label}</td>
                      <td className="py-3 px-3 text-right font-bold text-sky-700 tabular-nums">
                        {m.certificatesCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-indigo-700 tabular-nums">
                        {m.carnetsCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700 font-semibold tabular-nums">
                        {m.osisCount}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-700 font-bold tabular-nums">
                        {m.hoursCount}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 8: UBICACIONES ────────────────────────────────────────── */}
        {internalTab === "ubicaciones" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] bg-gray-50/70">
                  <th className="py-2.5 px-3 font-semibold">Estado de Venezuela</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Certificados</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Carnets PVC</th>
                  <th className="py-2.5 px-3 font-semibold text-right">OSIs</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Empresas</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLocations.map((l) => (
                  <tr key={l.id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-gray-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-600" />
                      {l.nombreEstado}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900 tabular-nums">
                      {l.totalCertificates.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 tabular-nums">
                      {l.totalCarnets.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-sky-700 font-semibold tabular-nums">
                      {l.totalOsis}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 tabular-nums">
                      {l.totalCompanies}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-700 font-medium tabular-nums">
                      {l.totalHours}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
