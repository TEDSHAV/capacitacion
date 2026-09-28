"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell,
  X,
  RefreshCw,
  Award,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  ArrowRight,
  Search,
  FileCheck2,
  FileText,
  Layers,
} from "lucide-react";
import Link from "next/link";
import {
  getAlertasCertificadosPendientes,
  type AlertasCertificadosResumen,
  type OsiAlertaCertificado,
  type CategoriaAlerta,
} from "@/app/actions/alertas-certificados";

export function CertificadosAlertCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AlertasCertificadosResumen | null>(null);
  const [selectedTab, setSelectedTab] = useState<"todas" | CategoriaAlerta>("todas");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setLoading(true);
      const res = await getAlertasCertificadosPendientes();
      setData(res);
    } catch (err) {
      console.error("[CertificadosAlertCenter] Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen to custom events to open drawer
  useEffect(() => {
    const handleOpen = (e?: Event) => {
      setIsOpen(true);
      if (e && (e as CustomEvent).detail?.tab) {
        setSelectedTab((e as CustomEvent).detail.tab);
      }
    };
    window.addEventListener("open-cert-notifications", handleOpen);
    return () => {
      window.removeEventListener("open-cert-notifications", handleOpen);
    };
  }, []);

  // Keyboard shortcut: Alt+N to toggle, Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];

    let list = data.items;

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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.nroOsi.toLowerCase().includes(q) ||
          i.nombreEmpresa.toLowerCase().includes(q) ||
          i.servicio.toLowerCase().includes(q) ||
          (i.facilitadorNombre && i.facilitadorNombre.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [data, selectedTab, searchQuery]);

  const totalPendientes = data?.totalPendientes ?? 0;
  const totalListas = data?.totalListasParaEmitir ?? 0;
  const totalVencidas = data?.totalVencidas72h ?? 0;
  const hasAlerts = totalPendientes > 0;

  return (
    <>
      {/* ─── Floating Trigger Pill (Bottom Right - Clean Light Design with Neon Gradient Border) ─── */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 print:hidden group">
        {hasAlerts && !isOpen && (
          <div className="relative">
            {/* Ambient subtle glow */}
            <div
              className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 via-purple-600 via-sky-500 to-emerald-400 opacity-25 group-hover:opacity-55 blur-xs transition duration-300 pointer-events-none"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="relative flex items-center gap-3 px-4 py-2.5 rounded-full bg-white text-slate-800 shadow-lg hover:shadow-xl border-[1.5px] border-transparent transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              style={{
                backgroundImage: "linear-gradient(white, white), linear-gradient(to right, #f59e0b, #f43f5e, #9333ea, #0ea5e9, #10b981)",
                backgroundOrigin: "border-box",
                backgroundClip: "padding-box, border-box",
              }}
              title="Centro de Notificaciones de Emisión (Alt+N)"
            >
            {/* Pulsing indicator icon */}
            <div className="relative flex items-center justify-center">
              <span className="relative flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    totalVencidas > 0
                      ? "bg-rose-400"
                      : totalListas > 0
                      ? "bg-emerald-400"
                      : "bg-amber-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    totalVencidas > 0
                      ? "bg-rose-500"
                      : totalListas > 0
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }`}
                />
              </span>
            </div>

            {/* Badges / Text */}
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide">
              <span className="text-slate-800">Notificaciones de Emisión</span>

              {totalListas > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold">
                  <FileCheck2 className="w-3 h-3 text-emerald-600" />
                  {totalListas} listas
                </span>
              )}

              {totalVencidas > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-bold">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  {totalVencidas} vencidas
                </span>
              )}
            </div>

            <span className="text-blue-600 group-hover:text-blue-800 transition-colors text-xs font-bold ml-0.5">
              Ver →
            </span>
          </button>
        </div>
      )}
      </div>

      {/* ─── Slide-Over Drawer & Backdrop ─── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden print:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-fadeOverlay"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 animate-slideLeft">
              {/* ─── Header (Light Theme) ─── */}
              <div className="p-5 bg-white border-b border-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
                      <Bell className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                          Centro de Notificaciones
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                          Indicador 72 Horas
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Emisión de certificados pendientes por servicio
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => loadData(true)}
                      disabled={loading}
                      title="Actualizar datos"
                      className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Cerrar panel (Esc)"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* KPI Pill Summary Bar */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div
                    onClick={() => setSelectedTab("lista_para_emitir")}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedTab === "lista_para_emitir"
                        ? "bg-emerald-100/70 border-emerald-400 text-emerald-950 shadow-xs"
                        : "bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-100/50 text-emerald-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                        <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" /> Listas
                      </span>
                      <span className="text-base font-bold text-emerald-900">
                        {totalListas}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700 block mt-0.5">
                      Datos recibidos
                    </span>
                  </div>

                  <div
                    onClick={() => setSelectedTab("vencida_72h")}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedTab === "vencida_72h"
                        ? "bg-rose-100/70 border-rose-400 text-rose-950 shadow-xs"
                        : "bg-rose-50/50 border-rose-200/80 hover:bg-rose-100/50 text-rose-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-rose-800 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Vencidas
                      </span>
                      <span className="text-base font-bold text-rose-900">
                        {totalVencidas}
                      </span>
                    </div>
                    <span className="text-[10px] text-rose-700 block mt-0.5">
                      &gt; 3 días hábiles
                    </span>
                  </div>

                  <div
                    onClick={() => setSelectedTab("esperando_facilitador")}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedTab === "esperando_facilitador"
                        ? "bg-amber-100/70 border-amber-400 text-amber-950 shadow-xs"
                        : "bg-amber-50/50 border-amber-200/80 hover:bg-amber-100/50 text-amber-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> En Espera
                      </span>
                      <span className="text-base font-bold text-amber-900">
                        {data?.totalEsperandoFacilitador ?? 0}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-700 block mt-0.5">
                      Falta lista facilitador
                    </span>
                  </div>
                </div>
              </div>

              {/* ─── Search & Tab Filters ─── */}
              <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col gap-3">
                {/* Search input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por OSI, empresa, servicio o facilitador..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-slate-400 shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedTab("todas")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                      selectedTab === "todas"
                        ? "bg-slate-800 text-white shadow-2xs"
                        : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                    }`}
                  >
                    Todas ({totalPendientes})
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTab("lista_para_emitir")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      selectedTab === "lista_para_emitir"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200"
                    }`}
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    Listas para Emitir ({totalListas})
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTab("vencida_72h")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      selectedTab === "vencida_72h"
                        ? "bg-rose-600 text-white shadow-2xs"
                        : "bg-white text-rose-800 hover:bg-rose-50 border border-rose-200"
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Vencidas ({totalVencidas})
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTab("esperando_facilitador")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      selectedTab === "esperando_facilitador"
                        ? "bg-amber-600 text-white shadow-2xs"
                        : "bg-white text-amber-800 hover:bg-amber-50 border border-amber-200"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Esperando Facilitador ({data?.totalEsperandoFacilitador ?? 0})
                  </button>
                </div>
              </div>

              {/* ─── List of Pending OSIs ─── */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {loading && !data ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                    <p className="text-sm font-medium">Analizando estado de OSIs y certificados...</p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="py-16 text-center px-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">
                      {searchQuery
                        ? "No se encontraron coincidencias"
                        : "¡Todo al día en esta categoría!"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {searchQuery
                        ? "Intenta con otro término de búsqueda o cambia la pestaña seleccionada."
                        : "No hay órdenes de servicio pendientes por emisión de certificados en este filtro."}
                    </p>
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <OsiAlertCard
                      key={item.osiId}
                      item={item}
                      onNavigate={() => setIsOpen(false)}
                    />
                  ))
                )}
              </div>

              {/* ─── Footer ─── */}
              <div className="p-3.5 bg-white border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                <span>
                  Mostrando <strong className="text-slate-800">{filteredItems.length}</strong> de{" "}
                  <strong className="text-slate-800">{totalPendientes}</strong> pendientes
                </span>
                <Link
                  href="/dashboard/capacitacion/indicadores?tab=72h"
                  onClick={() => setIsOpen(false)}
                  className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
                >
                  Ver Indicadores 72h →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface OsiAlertCardProps {
  item: OsiAlertaCertificado;
  onNavigate: () => void;
}

function OsiAlertCard({ item, onNavigate }: OsiAlertCardProps) {
  const isReady = item.dataRecibidaFacilitador;
  const isOverdue = item.plazoVencido;

  return (
    <div
      className={`group bg-white rounded-xl p-4 border transition-all duration-200 shadow-2xs hover:shadow-md ${
        isReady && isOverdue
          ? "border-rose-300 ring-1 ring-rose-200 hover:border-rose-400"
          : isReady
          ? "border-emerald-300 ring-1 ring-emerald-200 hover:border-emerald-400"
          : isOverdue
          ? "border-amber-300 ring-1 ring-amber-200 hover:border-amber-400"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {/* Top badges row */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Main Status Tag */}
          {isReady ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
              Lista para Emitir
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Esperando Facilitador
            </span>
          )}

          {/* Overdue / Indicador Badge */}
          {isOverdue ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
              <AlertCircle className="w-3 h-3 text-rose-600" />
              Fuera de Plazo (+{item.brechaDias}d hábiles)
            </span>
          ) : item.enRiesgo ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              <Clock className="w-3 h-3 text-amber-600" />
              {item.diasHabiles === 3 ? "Vence hoy (Día 3)" : "En riesgo (Día 2)"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
              Día {item.diasHabiles} de 3
            </span>
          )}
        </div>

        {/* OSI Number Pill */}
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
          OSI {item.nroOsi}
        </span>
      </div>

      {/* Company & Course Details */}
      <div className="mb-3">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 line-clamp-1">
          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate">{item.nombreEmpresa}</span>
        </h4>
        <p className="text-xs text-slate-600 mt-0.5 font-medium line-clamp-2">
          {item.servicio}
        </p>
      </div>

      {/* Meta info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2 px-2.5 rounded-lg bg-slate-50 border border-slate-150 text-[11px] mb-3">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>
            Ejecución:{" "}
            <strong className="text-slate-800">
              {item.fechaEjecucion.split("-").reverse().join("/")}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-600">
          <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate">
            Facilitador:{" "}
            <strong className="text-slate-800 truncate">
              {item.facilitadorNombre || "No asignado"}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-600">
          <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>
            Asistencia / Calificaciones:{" "}
            {item.dataRecibidaFacilitador ? (
              <span className="text-emerald-700 font-semibold">
                Recibida ({item.archivosSubidosCount > 0 ? `${item.archivosSubidosCount} arch.` : "Confirmada"})
              </span>
            ) : (
              <span className="text-amber-700 font-medium">No cargada</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-600">
          <Layers className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>
            Sesiones: <strong className="text-slate-800">{item.sesionesCount}</strong>
          </span>
        </div>
      </div>

      {/* Direct Action Buttons */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <Link
          href={`/dashboard/capacitacion/seguimiento-servicios?search=${item.nroOsi}`}
          onClick={onNavigate}
          className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          Ver Seguimiento
        </Link>

        <Link
          href={`/dashboard/capacitacion/generacion-certificado?osi=${encodeURIComponent(item.nroOsi)}`}
          onClick={onNavigate}
          className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shadow-2xs ${
            isReady
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          <span>Generar Certificados</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
