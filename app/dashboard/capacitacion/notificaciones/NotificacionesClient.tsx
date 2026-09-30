"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  FileCheck2,
  FileText,
  Building2,
  User,
  ArrowLeft,
  ExternalLink,
  Hourglass,
  Calendar,
  Filter,
  X,
  SlidersHorizontal,
  Info,
  MapPin,
} from "lucide-react";
import {
  type AlertasCertificadosResumen,
  type CategoriaAlerta,
  getAlertasCertificadosPendientes,
} from "@/app/actions/alertas-certificados";
import { OsiPreviewModal } from "@/components/osi/OsiPreviewModal";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length < 3) return dateStr;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

interface Props {
  initialResumen: AlertasCertificadosResumen;
}

type TabType = "todas" | CategoriaAlerta;
type DatePreset = "all" | "7d" | "30d" | "este_mes";

export default function NotificacionesClient({ initialResumen }: Props) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<AlertasCertificadosResumen>(initialResumen);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabType>("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewOsi, setPreviewOsi] = useState<{ id: number; number: string } | null>(null);

  // Enhanced filters
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("");
  const [selectedFacilitador, setSelectedFacilitador] = useState<string>("");
  const [selectedCiudad, setSelectedCiudad] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);

  // Sync tab from URL params if present
  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabType | null;
    if (
      tabParam &&
      ["todas", "lista_para_emitir", "vencida_72h", "en_riesgo", "esperando_facilitador"].includes(tabParam)
    ) {
      setSelectedTab(tabParam);
    }
  }, [searchParams]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await getAlertasCertificadosPendientes();
      setData(res);
    } catch (err) {
      console.error("[NotificacionesClient] Error refreshing data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Distinct list of empresas and facilitadores from current items
  const uniqueEmpresas = useMemo(() => {
    const set = new Set<string>();
    data.items.forEach((item) => {
      if (item.nombreEmpresa) set.add(item.nombreEmpresa.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.items]);

  const uniqueFacilitadores = useMemo(() => {
    const set = new Set<string>();
    data.items.forEach((item) => {
      if (item.facilitadorNombre) set.add(item.facilitadorNombre.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.items]);

  const uniqueCiudades = useMemo(() => {
    const set = new Set<string>();
    data.items.forEach((item) => {
      if (item.ciudad) set.add(item.ciudad.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.items]);

  // Handle Quick Date Presets
  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();

    if (preset === "all") {
      setFechaDesde("");
      setFechaHasta("");
      return;
    }

    if (preset === "7d") {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      setFechaDesde(past.toISOString().split("T")[0]);
      setFechaHasta(today.toISOString().split("T")[0]);
    } else if (preset === "30d") {
      const past = new Date(today);
      past.setDate(past.getDate() - 30);
      setFechaDesde(past.toISOString().split("T")[0]);
      setFechaHasta(today.toISOString().split("T")[0]);
    } else if (preset === "este_mes") {
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      setFechaDesde(`${y}-${m}-01`);
      setFechaHasta(today.toISOString().split("T")[0]);
    }
  };

  const handleClearFilters = () => {
    setSelectedTab("todas");
    setSearchQuery("");
    setSelectedEmpresa("");
    setSelectedFacilitador("");
    setSelectedCiudad("");
    setFechaDesde("");
    setFechaHasta("");
    setDatePreset("all");
  };

  const hasActiveFilters = Boolean(
    selectedTab !== "todas" ||
    searchQuery.trim() ||
    selectedEmpresa ||
    selectedFacilitador ||
    selectedCiudad ||
    fechaDesde ||
    fechaHasta
  );

  const filteredItems = useMemo(() => {
    let list = data.items;

    // Tab filter
    if (selectedTab !== "todas") {
      if (selectedTab === "vencida_72h") {
        list = list.filter((i) => i.plazoVencido);
      } else if (selectedTab === "lista_para_emitir") {
        list = list.filter((i) => i.categoriaAlerta === "lista_para_emitir");
      } else if (selectedTab === "esperando_facilitador") {
        list = list.filter((i) => !i.dataRecibidaFacilitador);
      } else if (selectedTab === "en_riesgo") {
        list = list.filter((i) => i.enRiesgo);
      }
    }

    // Empresa filter
    if (selectedEmpresa) {
      list = list.filter((i) => i.nombreEmpresa?.trim() === selectedEmpresa);
    }

    // Facilitador filter
    if (selectedFacilitador) {
      list = list.filter((i) => i.facilitadorNombre?.trim() === selectedFacilitador);
    }

    // Ciudad filter
    if (selectedCiudad) {
      list = list.filter((i) => i.ciudad?.trim() === selectedCiudad);
    }

    // Execution Date range filter
    if (fechaDesde) {
      list = list.filter((i) => i.fechaEjecucion >= fechaDesde);
    }
    if (fechaHasta) {
      list = list.filter((i) => i.fechaEjecucion <= fechaHasta);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.nroOsi.toLowerCase().includes(q) ||
          i.nombreEmpresa.toLowerCase().includes(q) ||
          i.servicio.toLowerCase().includes(q) ||
          (i.facilitadorNombre && i.facilitadorNombre.toLowerCase().includes(q)) ||
          (i.ciudad && i.ciudad.toLowerCase().includes(q))
      );
    }

    return list;
  }, [
    data.items,
    selectedTab,
    selectedEmpresa,
    selectedFacilitador,
    selectedCiudad,
    fechaDesde,
    fechaHasta,
    searchQuery,
  ]);

  const {
    totalPendientes,
    totalListasParaEmitir,
    totalVencidas72h,
    totalEnRiesgo,
    totalEsperandoFacilitador,
  } = data;

  return (
    <div className="space-y-6">
      {/* ─── Page Header & Navigation Breadcrumb ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <Link
            href="/dashboard/capacitacion"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a Capacitación
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Centro de Notificaciones
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Seguimiento de emisión de certificados pendientes e indicador de 72 horas hábiles
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
            <span>{loading ? "Actualizando..." : "Actualizar"}</span>
          </button>
        </div>
      </div>

      {/* ─── Explicit Operational Clarification Banner ─── */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 text-sky-900 text-xs shadow-2xs">
        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-sky-950">
            Control Exclusivo: Emisión de Certificados Pendientes
          </p>
          <p className="text-sky-800 leading-relaxed">
            Todos los servicios listados en este panel fueron <strong>ejecutados</strong> en sus fechas programadas, pero <strong>tienen pendiente la emisión y generación formal de sus certificados</strong> en el sistema PRISMA.
          </p>
        </div>
      </div>

      {/* ─── Interactive Summary Cards (KPIs) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Listas para emitir */}
        <button
          type="button"
          onClick={() => setSelectedTab("lista_para_emitir")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${selectedTab === "lista_para_emitir"
              ? "bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-200/80 shadow-xs"
              : "bg-white hover:bg-emerald-50/40 border-slate-200 hover:border-emerald-300"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-emerald-600" /> Listas para Emitir
            </span>
            <span className="text-2xl font-extrabold text-emerald-900">
              {totalListasParaEmitir}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Servicios con asistencia y notas cargadas por el facilitador
          </p>
        </button>

        {/* Vencidas >72h */}
        <button
          type="button"
          onClick={() => setSelectedTab("vencida_72h")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${selectedTab === "vencida_72h"
              ? "bg-rose-50/80 border-rose-400 ring-2 ring-rose-200/80 shadow-xs"
              : "bg-white hover:bg-rose-50/40 border-slate-200 hover:border-rose-300"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" /> Vencidas (&gt;72h)
            </span>
            <span className="text-2xl font-extrabold text-rose-900">
              {totalVencidas72h}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Servicios ejecutados hace más de 3 días hábiles sin certificados
          </p>
        </button>

        {/* En Riesgo */}
        <button
          type="button"
          onClick={() => setSelectedTab("en_riesgo")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${selectedTab === "en_riesgo"
              ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-200/80 shadow-xs"
              : "bg-white hover:bg-amber-50/40 border-slate-200 hover:border-amber-300"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" /> En Riesgo
            </span>
            <span className="text-2xl font-extrabold text-amber-900">
              {totalEnRiesgo}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Aproximándose al plazo límite (día 2 o 3 de 3)
          </p>
        </button>

        {/* Esperando facilitador */}
        <button
          type="button"
          onClick={() => setSelectedTab("esperando_facilitador")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${selectedTab === "esperando_facilitador"
              ? "bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-200/80 shadow-xs"
              : "bg-white hover:bg-indigo-50/40 border-slate-200 hover:border-indigo-300"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-600" /> Esperando Facilitador
            </span>
            <span className="text-2xl font-extrabold text-indigo-900">
              {totalEsperandoFacilitador}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Pendiente carga de asistencias y notas por el instructor
          </p>
        </button>
      </div>

      {/* ─── Complete Filtering Section ─── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        {/* Row 1: Primary Category Tabs & Quick Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setSelectedTab("todas")}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${selectedTab === "todas"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
            >
              Todas ({totalPendientes})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab("lista_para_emitir")}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${selectedTab === "lista_para_emitir"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100/70 border border-emerald-200/80"
                }`}
            >
              Listas ({totalListasParaEmitir})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab("vencida_72h")}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${selectedTab === "vencida_72h"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "bg-rose-50 text-rose-800 hover:bg-rose-100/70 border border-rose-200/80"
                }`}
            >
              Vencidas (&gt;72h) ({totalVencidas72h})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab("en_riesgo")}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${selectedTab === "en_riesgo"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100/70 border border-amber-200/80"
                }`}
            >
              En Riesgo ({totalEnRiesgo})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab("esperando_facilitador")}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${selectedTab === "esperando_facilitador"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100/70 border border-indigo-200/80"
                }`}
            >
              Esperando Facilitador ({totalEsperandoFacilitador})
            </button>
          </div>

          {/* Quick Search Input */}
          <div className="relative min-w-[240px] md:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar OSI, empresa, curso..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Row 2: Secondary Dropdown Filters (Empresa, Facilitador, Ciudad, Execution Date Range) */}
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 flex-1">
            {/* Empresa Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" /> Empresa
              </label>
              <select
                value={selectedEmpresa}
                onChange={(e) => setSelectedEmpresa(e.target.value)}
                className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white"
              >
                <option value="">Todas las empresas ({uniqueEmpresas.length})</option>
                {uniqueEmpresas.map((emp) => (
                  <option key={emp} value={emp}>
                    {emp}
                  </option>
                ))}
              </select>
            </div>

            {/* Facilitador Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" /> Facilitador
              </label>
              <select
                value={selectedFacilitador}
                onChange={(e) => setSelectedFacilitador(e.target.value)}
                className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white"
              >
                <option value="">Todos los facilitadores ({uniqueFacilitadores.length})</option>
                {uniqueFacilitadores.map((fac) => (
                  <option key={fac} value={fac}>
                    {fac}
                  </option>
                ))}
              </select>
            </div>

            {/* Ciudad Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" /> Ciudad
              </label>
              <select
                value={selectedCiudad}
                onChange={(e) => setSelectedCiudad(e.target.value)}
                className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white"
              >
                <option value="">Todas las ciudades ({uniqueCiudades.length})</option>
                {uniqueCiudades.map((ciudad) => (
                  <option key={ciudad} value={ciudad}>
                    {ciudad}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha Ejecución Desde */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Ejecución Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => {
                  setFechaDesde(e.target.value);
                  setDatePreset("all");
                }}
                className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white"
              />
            </div>

            {/* Fecha Ejecución Hasta */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Ejecución Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => {
                  setFechaHasta(e.target.value);
                  setDatePreset("all");
                }}
                className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white"
              />
            </div>
          </div>

          {/* Quick Date Presets + Clear Filter */}
          <div className="flex items-center gap-1.5 self-end lg:self-center flex-wrap pt-2 lg:pt-4">
            <button
              type="button"
              onClick={() => applyDatePreset("7d")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${datePreset === "7d"
                  ? "bg-sky-50 text-sky-800 border-sky-300 font-bold"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
            >
              Últimos 7d
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("30d")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${datePreset === "30d"
                  ? "bg-sky-50 text-sky-800 border-sky-300 font-bold"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
            >
              Últimos 30d
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("este_mes")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${datePreset === "este_mes"
                  ? "bg-sky-50 text-sky-800 border-sky-300 font-bold"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
            >
              Este Mes
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer ml-1"
                title="Restablecer todos los filtros"
              >
                <X className="w-3 h-3" />
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Counter footer bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span className="font-medium">
            Mostrando <strong>{filteredItems.length}</strong> de <strong>{data.items.length}</strong> servicios pendientes de emisión
          </span>
          <span className="text-[11px] text-slate-400">
            Plazo estándar: 3 días hábiles (72h) tras ejecución
          </span>
        </div>
      </div>

      {/* ─── Notification Items List ─── */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            No hay notificaciones con los filtros seleccionados
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {hasActiveFilters
              ? "Prueba modificando o limpiando los filtros para ver otros servicios pendientes."
              : "Todos los servicios dentro de este filtro están al día."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer mt-2"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const isReady = item.dataRecibidaFacilitador;
            const isOverdue = item.plazoVencido;

            return (
              <div
                key={item.osiId}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
              >
                {/* Header Row: OSI Number + Badges */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-900 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                        OSI {item.nroOsi}
                      </span>

                      {/* Explicit Certificate Status */}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Certificados: Pendientes por emitir
                      </span>

                      {/* Data Readiness Badge */}
                      {isReady ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <FileCheck2 className="w-3 h-3 text-emerald-600" />
                          Lista para emitir
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                          <Hourglass className="w-3 h-3 text-slate-400" />
                          Esperando facilitador
                        </span>
                      )}
                    </div>

                    {/* SLA Badge */}
                    {isOverdue ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        +{item.brechaDias}d hábiles de retraso
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${item.enRiesgo
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                      >
                        <Clock className="w-3 h-3 text-amber-500" />
                        Día {item.diasHabiles}/3 hábiles
                      </span>
                    )}
                  </div>

                  {/* Main Info */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-1">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{item.nombreEmpresa}</span>
                    </h4>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.servicio}</span>
                    </p>
                  </div>

                  {/* Secondary Info: Execution Date, Facilitator & City */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Ejecución: <strong>{formatDate(item.fechaEjecucion)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 truncate">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Fac.: <strong>{item.facilitadorNombre || "—"}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Ciudad: <strong>{item.ciudad || "—"}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPreviewOsi({ id: item.osiId, number: item.nroOsi })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                    title="Ver formato oficial de la OSI"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ver OSI</span>
                  </button>

                  <Link
                    href={`/dashboard/capacitacion/generacion-certificado?osi=${encodeURIComponent(item.nroOsi)}`}
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${isReady
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
                      }`}
                  >
                    <span>Generar Certificados</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── In-place Official OSI Preview Modal ─── */}
      <OsiPreviewModal
        isOpen={Boolean(previewOsi)}
        osiId={previewOsi?.id ?? null}
        osiNumber={previewOsi?.number}
        onClose={() => setPreviewOsi(null)}
      />
    </div>
  );
}
