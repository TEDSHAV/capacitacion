"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Building2,
  ChevronRight,
  CheckCircle2,
  Clock,
  Search,
  Sparkles,
  BookOpen,
  UserCheck,
  MapPin,
  FileCheck,
  Star,
  ShieldCheck,
  IdCard,
} from "lucide-react";
import { DashboardTour } from "./DashboardTour";
import { DashboardTourAutoStart as AutoStart } from "./DashboardTourAutoStart";
import { toTitleCase } from "@/utils/string-utils";
import type { FacilitadorFullData } from "@/app/actions/facilitador-portal";

interface OSIItem {
  id_osi: number;
  nro_osi: string | number;
  nombre_empresa: string;
  servicio?: string;
  cliente_rif?: string;
  ciudad?: string;
  estado?: string;
  direccion_servicio?: string;
  fecha_emision?: string;
  session_count?: number;
  assigned_all_sessions?: boolean;
  assigned_sessions?: number[];
  has_material?: boolean;
  material_count?: number;
  participant_status?: "final" | "draft" | null;
}

interface FacilitadorDashboardClientProps {
  nombre: string;
  initialData?: FacilitadorFullData | null;
  osis?: OSIItem[];
}

export default function FacilitadorDashboardClient({
  nombre,
  initialData,
  osis = [],
}: FacilitadorDashboardClientProps) {
  const [mainView, setMainView] = useState<"servicios" | "perfil">("servicios");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<"todos" | "pendientes" | "finalizados">("todos");

  const facilitador = initialData?.facilitador;
  const stats = initialData?.stats || {
    totalServicios: osis.length,
    totalFinalizados: osis.filter((o) => o.participant_status === "final").length,
    totalPendientes: osis.filter((o) => o.participant_status !== "final").length,
    totalEmpresas: new Set(osis.map((o) => o.nombre_empresa)).size,
    totalHoras: osis.length * 8,
    cursosUnicos: new Set(osis.map((o) => o.servicio)).size,
  };

  // Metrics calculation
  const totalCount = osis.length;
  const finalizadosCount = osis.filter((o) => o.participant_status === "final").length;
  const pendientesCount = totalCount - finalizadosCount;

  // Filtered active OSIs list
  const filteredOSIs = useMemo(() => {
    return osis.filter((osi) => {
      // Tab filter
      if (filterTab === "pendientes" && osi.participant_status === "final") return false;
      if (filterTab === "finalizados" && osi.participant_status !== "final") return false;

      // Search query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const nro = String(osi.nro_osi || "").toLowerCase();
        const emp = (osi.nombre_empresa || "").toLowerCase();
        const serv = (osi.servicio || "").toLowerCase();
        const ciudad = (osi.ciudad || "").toLowerCase();
        const estado = (osi.estado || "").toLowerCase();
        return nro.includes(query) || emp.includes(query) || serv.includes(query) || ciudad.includes(query) || estado.includes(query);
      }

      return true;
    });
  }, [osis, filterTab, searchTerm]);

  const formatDateDayMonth = (dateStr?: string) => {
    if (!dateStr) return { day: "--", month: "---" };
    try {
      const d = new Date(dateStr);
      const day = d.getDate().toString().padStart(2, "0");
      const month = d.toLocaleString("es-VE", { month: "short" }).toUpperCase().replace(".", "");
      return { day, month };
    } catch {
      return { day: "--", month: "---" };
    }
  };

  const getInitials = (nameStr: string) => {
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (nameStr[0] || "F").toUpperCase();
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Identity Header with Navigation Tabs Integrated */}
      <header
        className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-5"
        id="tour-welcome"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* Facilitator Avatar */}
            <div className="relative shrink-0">
              {facilitador?.foto_perfil_url ? (
                <img
                  src={facilitador.foto_perfil_url}
                  alt={nombre}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                />
              ) : (
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-800 text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-2xs border border-slate-200">
                  {getInitials(nombre)}
                </div>
              )}
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-2xs"
                title="Facilitador Activo"
              >
                <CheckCircle2 className="w-3 h-3 text-white stroke-[3]" />
              </div>
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Facilitador Autorizado
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                {toTitleCase(nombre)}
              </h1>

              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                {facilitador?.cedula && (
                  <span className="inline-flex items-center gap-1 font-mono text-slate-600">
                    <IdCard className="w-3.5 h-3.5 text-slate-400" />
                    CI: {facilitador.cedula}
                  </span>
                )}
                {(facilitador?.ciudad_nombre || facilitador?.estado_nombre) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {[facilitador.ciudad_nombre, facilitador.estado_nombre].filter(Boolean).join(", ")}
                  </span>
                )}
                {facilitador?.tiene_firma && (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <FileCheck className="w-3.5 h-3.5" />
                    Firma Vinculada
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            {/* Clean Segmented Navigation (White Active Card on Light Gray Track) */}
            <div
              className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs"
              id="tour-nav-tabs"
            >
              <button
                type="button"
                onClick={() => setMainView("servicios")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${mainView === "servicios"
                    ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/40"
                  }`}
              >
                <ClipboardList className="w-4 h-4 text-slate-500" />
                <span>Mis Servicios</span>
                {pendientesCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                    {pendientesCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMainView("perfil")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${mainView === "perfil"
                    ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/40"
                  }`}
              >
                <UserCheck className="w-4 h-4 text-slate-500" />
                <span>Mi Perfil</span>
              </button>
            </div>

            <DashboardTour />
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* VIEW 1: MIS SERVICIOS */}
      {/* ========================================================================= */}
      {mainView === "servicios" && (
        <div className="space-y-5">
          {/* 3 Interactive KPI Filter Cards (Clean Light Aesthetics with subtle active state) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5" id="tour-kpi-filters">
            {/* Total Asignados */}
            <button
              type="button"
              onClick={() => setFilterTab("todos")}
              className={`p-4 sm:p-5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-4 bg-white ${filterTab === "todos"
                  ? "border-slate-400 shadow-xs ring-2 ring-slate-200/80 bg-slate-50/40"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/30"
                }`}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 text-slate-700 border border-slate-200">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Servicios</p>
                <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
              </div>
            </button>

            {/* Pendientes por Cargar */}
            <button
              type="button"
              onClick={() => setFilterTab("pendientes")}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3.5 bg-white ${filterTab === "pendientes"
                  ? "border-amber-400 shadow-xs ring-2 ring-amber-200/80 bg-amber-50/30"
                  : "border-slate-200 hover:border-amber-300 hover:bg-slate-50/30"
                }`}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pendientes Carga</p>
                <p className="text-xl font-bold text-amber-900">{pendientesCount}</p>
              </div>
            </button>

            {/* Finalizados */}
            <button
              type="button"
              onClick={() => setFilterTab("finalizados")}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3.5 bg-white ${filterTab === "finalizados"
                  ? "border-emerald-400 shadow-xs ring-2 ring-emerald-200/80 bg-emerald-50/30"
                  : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50/30"
                }`}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Finalizados / Enviados</p>
                <p className="text-xl font-bold text-emerald-900">{finalizadosCount}</p>
              </div>
            </button>
          </div>

          {/* Filter Pills & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Segmented Filter Pills (White Active Pill on Light Gray Track) */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs self-start">
              <button
                type="button"
                onClick={() => setFilterTab("todos")}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${filterTab === "todos"
                    ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/40 font-medium"
                  }`}
              >
                Todos ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("pendientes")}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${filterTab === "pendientes"
                    ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/40 font-medium"
                  }`}
              >
                Pendientes ({pendientesCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("finalizados")}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${filterTab === "finalizados"
                    ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/40 font-medium"
                  }`}
              >
                Finalizados ({finalizadosCount})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar servicio, OSI o empresa..."
                className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Services Cards List */}
          {filteredOSIs.length > 0 ? (
            <div className="grid gap-3.5" id="tour-osi-cards">
              {filteredOSIs.map((osi, idx) => {
                const isFirst = idx === 0;
                const dateInfo = formatDateDayMonth(osi.fecha_emision);
                const isFinal = osi.participant_status === "final";

                return (
                  <Link
                    key={osi.id_osi}
                    href={`/portal/facilitador/osi/${osi.id_osi}`}
                    className="block bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 hover:border-slate-300 hover:shadow-2xs transition-all group relative overflow-hidden"
                    id={isFirst ? "tour-osi-card" : undefined}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {/* Left Calendar Date Badge */}
                        <div className="hidden sm:flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 text-center shrink-0 group-hover:border-slate-400 transition-colors">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-none">
                            {dateInfo.month}
                          </span>
                          <span className="text-base font-black text-slate-800 leading-none mt-0.5">
                            {dateInfo.day}
                          </span>
                        </div>

                        {/* Main Service Details */}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200">
                              OSI #{osi.nro_osi}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold truncate">
                              {osi.servicio || "Servicio General"}
                            </span>
                          </div>

                          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug group-hover:text-slate-700 transition-colors">
                            {osi.nombre_empresa}
                          </h3>

                          {/* Session & Metadata Badges */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-500">
                            {osi.session_count === 1 ? (
                              <span className="inline-flex items-center text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md">
                                Sesión 1
                              </span>
                            ) : osi.assigned_all_sessions ? (
                              <span className="inline-flex items-center text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md">
                                Todas las sesiones
                              </span>
                            ) : osi.assigned_sessions && osi.assigned_sessions.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {osi.assigned_sessions.sort((a, b) => a - b).map((s) => (
                                  <span
                                    key={s}
                                    className="inline-flex items-center text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md"
                                  >
                                    Sesión {s}
                                  </span>
                                ))}
                              </div>
                            ) : null}

                            {(() => {
                              const ubicacion =
                                [osi.ciudad, osi.estado].filter(Boolean).join(", ") ||
                                osi.direccion_servicio;
                              if (!ubicacion) return null;
                              return (
                                <>
                                  <span className="hidden sm:inline-block text-xs text-slate-300">•</span>
                                  <div className="flex items-center gap-1 text-xs text-slate-500">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{ubicacion}</span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          {/* Mobile Status Badge */}
                          <div
                            className="sm:hidden pt-1"
                            id={isFirst ? "tour-status-badge-mobile" : undefined}
                          >
                            {isFinal ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Listado Enviado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Pendiente de Carga
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Status Badge & Arrow */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div
                          className="text-right hidden sm:block"
                          id={isFirst ? "tour-status-badge" : undefined}
                        >
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight mb-1">
                            Estado
                          </p>
                          {isFinal ? (
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Listado Enviado</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                              <Clock className="w-4 h-4 text-amber-600" />
                              <span>Pendiente Datos</span>
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-14 flex flex-col items-center justify-center text-center p-6 space-y-2">
              <ClipboardList className="w-10 h-10 text-slate-300 stroke-1" />
              <p className="text-sm font-semibold text-slate-700">
                {searchTerm
                  ? `No se encontraron servicios que coincidan con "${searchTerm}"`
                  : "No tienes servicios en esta categoría"}
              </p>
              <p className="text-xs text-slate-400">
                {searchTerm
                  ? "Intenta buscar con otro término o limpia el filtro."
                  : "Tus servicios asignados aparecerán aquí tan pronto sean programados."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: MI PERFIL (CLEAN PROFILE DETAILS WITHOUT HERO REPETITION) */}
      {/* ========================================================================= */}
      {mainView === "perfil" && (
        <div className="space-y-5">
          {/* Career Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Servicios</span>
              <span className="text-xl font-bold text-slate-900 mt-0.5 block">{stats.totalServicios}</span>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Finalizados</span>
              <span className="text-xl font-bold text-emerald-800 mt-0.5 block">{stats.totalFinalizados}</span>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Horas Dictadas</span>
              <span className="text-xl font-bold text-slate-900 mt-0.5 block">{stats.totalHoras} hrs</span>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Empresas Atendidas</span>
              <span className="text-xl font-bold text-slate-900 mt-0.5 block">{stats.totalEmpresas}</span>
            </div>
          </div>

          {/* Profile Details Container */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-6 shadow-2xs">
            {/* Rating & Education level bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Ficha Técnica del Facilitador</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {facilitador?.nivel_educacion || "Instructor Técnico Especialista"} • ID #{facilitador?.id || "---"}
                </p>
              </div>

              {facilitador?.calificacion && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl self-start sm:self-auto">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold text-slate-800">
                    Calificación: {facilitador.calificacion.toFixed(1)} / 5.0
                  </span>
                </div>
              )}
            </div>

            {/* Personal and Contact Data */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Datos de Contacto y Ubicación
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Cédula / Documento</span>
                  <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block">
                    {facilitador?.cedula || "No registrada"}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">RIF</span>
                  <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block">
                    {facilitador?.rif || "No registrado"}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Teléfono</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                    {facilitador?.telefono || "No registrado"}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Correo Electrónico</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                    {facilitador?.email || "No registrado"}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Ubicación / Ciudad</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                    {[facilitador?.ciudad_nombre, facilitador?.estado_nombre].filter(Boolean).join(", ") || "No definida"}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Fecha de Ingreso</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                    {facilitador?.fecha_ingreso || "Activo"}
                  </span>
                </div>
              </div>
            </div>

            {/* Authorized Courses / Topics */}
            {facilitador?.temas_cursos && facilitador.temas_cursos.length > 0 && (
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Cursos y Temas Acreditados ({facilitador.temas_cursos.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {facilitador.temas_cursos.map((tema: any, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                      {typeof tema === "string" ? tema : tema?.nombre || `Tema ${i + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Digital Signature Status */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Firma Digital para Certificados</h5>
                  <p className="text-[11px] text-slate-500">
                    {facilitador?.tiene_firma
                      ? "Tu firma digital está registrada y verificada para la emisión de certificados oficiales."
                      : "No posees firma digital vinculada. Comunícate con el departamento de Capacitación para digitalizar tu firma."}
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-lg border shrink-0 self-start sm:self-auto ${facilitador?.tiene_firma
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
              >
                {facilitador?.tiene_firma ? "Firma Activa" : "Pendiente"}
              </span>
            </div>
          </div>
        </div>
      )}

      <AutoStart />
    </div>
  );
}
