"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Building2,
  User,
  MapPin,
  CalendarClock,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Loader2,
  Sparkles,
  Calendar,
} from "lucide-react";
import {
  getOsisDeHoy,
  confirmarEjecucionHoy,
  restaurarServicioHoy,
  type ResumenOsisHoy,
  type OsiHoyItem,
} from "@/app/actions/alertas-servicios-hoy";
import { OsiHoyAccionModal } from "./OsiHoyAccionModal";
import { OsiPreviewModal } from "@/components/osi/OsiPreviewModal";
import { useToast } from "@/lib/ui/toast-context";

/**
 * Format time strings like "08:00:00" or "14:30:00" to "08:00 AM" / "02:30 PM".
 */
function formatTime12h(timeStr: string | null): string | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const hoursFormatted = hours < 10 ? `0${hours}` : `${hours}`;
  return `${hoursFormatted}:${minutes} ${ampm}`;
}

/**
 * Format date string "YYYY-MM-DD" to Spanish readable "13 Oct 2026".
 */
function formatDateHuman(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const raw = dateStr.split("T")[0];
    const parts = raw.split("-");
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    const months = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
    ];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${parseInt(d, 10)} ${monthName} ${y}`;
  } catch {
    return dateStr;
  }
}

export function OsisHoyBanner() {
  const { addToast } = useToast();
  const [data, setData] = useState<ResumenOsisHoy | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [actionLoadingOsiId, setActionLoadingOsiId] = useState<string | null>(null);

  // Modal states
  const [selectedItemForModal, setSelectedItemForModal] = useState<OsiHoyItem | null>(null);
  const [modalMode, setModalMode] = useState<"reagendar" | "cancelar">("reagendar");
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  // Osi Preview Modal state
  const [previewOsi, setPreviewOsi] = useState<{ id: number; nro: string } | null>(null);

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await getOsisDeHoy();
      setData(res);
      // If there are zero pending items and some confirmed, start collapsed by default
      if (res.total > 0 && res.pendientes === 0 && !isManualRefresh) {
        setIsExpanded(false);
      }
    } catch (err) {
      console.error("[OsisHoyBanner] Error loading today's courses:", err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle 1-click execution confirmation
  const handleConfirmarEjecucion = async (item: OsiHoyItem) => {
    const key = `${item.osiId}:${item.nroSesion}`;
    setActionLoadingOsiId(key);

    try {
      const res = await confirmarEjecucionHoy(item.osiId, item.nroSesion);
      if (!res.success) {
        addToast(res.error || "No se pudo confirmar la ejecución", "error");
        return;
      }

      // Optimistic local state update
      setData((prev) => {
        if (!prev) return prev;
        const updatedItems = prev.items.map((i) =>
          i.osiId === item.osiId && i.nroSesion === item.nroSesion
            ? { ...i, status: "en_proceso" as const }
            : i,
        );
        const pendientes = updatedItems.filter((i) => i.status === "pendiente").length;
        const enProceso = updatedItems.filter((i) => i.status === "en_proceso").length;
        return {
          ...prev,
          pendientes,
          enProceso,
          items: updatedItems,
        };
      });

      addToast(
        `¡Servicio confirmado! OSI ${item.nroOsi} registrado en ejecución.`,
        "success",
      );
    } catch (err) {
      console.error("[OsisHoyBanner] handleConfirmarEjecucion error:", err);
      addToast("Error al confirmar el servicio", "error");
    } finally {
      setActionLoadingOsiId(null);
    }
  };

  // Handle restoring rescheduled / cancelled item back to active
  const handleRestaurar = async (item: OsiHoyItem) => {
    const key = `${item.osiId}:${item.nroSesion}`;
    setActionLoadingOsiId(key);

    try {
      const res = await restaurarServicioHoy({
        osiId: item.osiId,
        nroSesion: item.nroSesion,
      });

      if (!res.success) {
        addToast(res.error || "No se pudo restaurar el servicio", "error");
        return;
      }

      setData((prev) => {
        if (!prev) return prev;
        const updatedItems = prev.items.map((i) =>
          i.osiId === item.osiId && i.nroSesion === item.nroSesion
            ? { ...i, status: "pendiente" as const, rescheduledDate: null }
            : i,
        );
        const pendientes = updatedItems.filter((i) => i.status === "pendiente").length;
        const reagendados = updatedItems.filter((i) => i.status === "reagendado").length;
        const noEjecutados = updatedItems.filter((i) => i.status === "no_ejecutado").length;
        return {
          ...prev,
          pendientes,
          reagendados,
          noEjecutados,
          items: updatedItems,
        };
      });

      addToast(`OSI ${item.nroOsi} restaurada a estado activo.`, "info");
    } catch (err) {
      console.error("[OsisHoyBanner] handleRestaurar error:", err);
      addToast("Error al restaurar el servicio", "error");
    } finally {
      setActionLoadingOsiId(null);
    }
  };

  // Callback from modal when rescheduled or cancelled
  const handleModalSuccess = (
    updatedStatus: "reagendado" | "no_ejecutado",
    newDate?: string | null,
  ) => {
    if (!selectedItemForModal) return;
    const targetOsiId = selectedItemForModal.osiId;
    const targetSesion = selectedItemForModal.nroSesion;

    setData((prev) => {
      if (!prev) return prev;
      const updatedItems = prev.items.map((i) =>
        i.osiId === targetOsiId && i.nroSesion === targetSesion
          ? { ...i, status: updatedStatus, rescheduledDate: newDate || null }
          : i,
      );
      const pendientes = updatedItems.filter((i) => i.status === "pendiente").length;
      const reagendados = updatedItems.filter((i) => i.status === "reagendado").length;
      const noEjecutados = updatedItems.filter((i) => i.status === "no_ejecutado").length;
      return {
        ...prev,
        pendientes,
        reagendados,
        noEjecutados,
        items: updatedItems,
      };
    });
  };

  // ── Skeleton Loader ──
  if (loading) {
    return (
      <div className="relative mb-8 rounded-2xl bg-white border border-slate-200 p-6 shadow-xs animate-pulse" aria-hidden="true">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-4 w-20 rounded-full bg-slate-200" />
              <div className="h-4 w-40 rounded bg-slate-100" />
            </div>
            <div className="h-7 w-80 rounded-lg bg-slate-200" />
          </div>
          <div className="h-9 w-32 rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  // ── No Courses Today ──
  if (!data || data.total === 0) {
    return (
      <div className="mb-8 rounded-2xl bg-white border border-slate-200/90 p-4 shadow-2xs flex items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-800">{data?.todayFormatted || "Hoy"}: </span>
            <span className="text-slate-500">Sin servicios de capacitación programados para la fecha.</span>
          </div>
        </div>
        <Link
          href="/dashboard/capacitacion/seguimiento-servicios"
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
        >
          <span>Ver planificación</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  const { total, pendientes, enProceso, reagendados, noEjecutados, items, todayFormatted } = data;
  const hasPending = pendientes > 0;
  const allCompleted = pendientes === 0 && total > 0;

  return (
    <>
      <div
        className={`relative mb-8 rounded-2xl bg-white overflow-hidden transition-all duration-500 ${
          hasPending
            ? "border border-amber-300 ring-4 ring-amber-400/20 shadow-lg shadow-amber-500/10"
            : "border border-slate-200/90 shadow-xs"
        }`}
      >
        {/* Top vibrant accent stripe */}
        <div
          className={`h-1.5 w-full bg-gradient-to-r transition-colors ${
            hasPending
              ? "from-amber-400 via-emerald-500 to-sky-500"
              : "from-emerald-500 via-teal-400 to-sky-400"
          }`}
        />

        {/* Distinct Light Header: Soft slate-50 background with crisp border */}
        <div
          className={`border-b px-6 py-4.5 transition-colors ${
            hasPending
              ? "bg-amber-50/30 border-amber-200/70"
              : "bg-slate-50/70 border-slate-200/80"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {/* Live Pill, Action Required & Date */}
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>EN VIVO</span>
                </div>

                {hasPending && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                    <span>Acción requerida hoy</span>
                  </div>
                )}

                <span className="text-xs text-slate-500 font-medium">
                  {todayFormatted}
                </span>
              </div>

              {/* Main Headline */}
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {hasPending
                  ? `Tienes ${pendientes} ${
                      pendientes === 1 ? "servicio programado" : "servicios programados"
                    } para hoy por confirmar`
                  : "¡Todo al día! Servicios de hoy confirmados"}
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                {hasPending
                  ? "Confirma la ejecución del servicio o reporta reprogramaciones con un clic para mantener actualizado el seguimiento."
                  : `Los ${total} servicios del día han sido confirmados o gestionados oportunamente.`}
              </p>
            </div>

            {/* Badges & Actions Strip */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {pendientes > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>{pendientes} por confirmar</span>
                </span>
              )}

              {enProceso > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{enProceso} en ejecución</span>
                </span>
              )}

              {reagendados > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold shadow-2xs">
                  <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{reagendados} reagendados</span>
                </span>
              )}

              {noEjecutados > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold shadow-2xs">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>{noEjecutados} cancelados</span>
                </span>
              )}

              {/* Refresh button */}
              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={refreshing}
                title="Refrescar estado en vivo"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white bg-slate-100 border border-slate-200 transition-colors shadow-2xs"
              >
                <RotateCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`}
                />
              </button>

              {/* Collapse / Expand Toggle */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-colors shadow-2xs"
              >
                <span>{isExpanded ? "Ocultar" : `Ver (${total})`}</span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Course Cards List (Light Flight Board) */}
        {isExpanded && (
          <div className="p-6 space-y-3 bg-white">
            <div className="grid grid-cols-1 gap-3">
              {items.map((item) => {
                const key = `${item.osiId}:${item.nroSesion}`;
                const isItemLoading = actionLoadingOsiId === key;
                const formattedTime = formatTime12h(item.horaInicio);
                const sessionDateHuman = formatDateHuman(item.fecha);
                const rangeStart = formatDateHuman(item.fechaInicioReal);
                const rangeEnd = formatDateHuman(item.fechaFinReal);
                const hasMultiDayRange =
                  item.fechaInicioReal &&
                  item.fechaFinReal &&
                  item.fechaInicioReal !== item.fechaFinReal;

                const isPending = item.status === "pendiente";
                const isEnProceso = item.status === "en_proceso";
                const isReagendado = item.status === "reagendado";
                const isNoEjecutado = item.status === "no_ejecutado";

                return (
                  <div
                    key={key}
                    className={`rounded-xl p-4 border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isPending
                        ? "bg-amber-50/40 hover:bg-amber-50/60 border-amber-300/90 border-l-4 border-l-amber-500 shadow-xs ring-1 ring-amber-300/50"
                        : isEnProceso
                        ? "bg-emerald-50/20 hover:bg-emerald-50/40 border-slate-200 border-l-4 border-l-emerald-500 shadow-2xs"
                        : isReagendado
                        ? "bg-indigo-50/15 border-slate-200 border-l-4 border-l-indigo-500 shadow-2xs"
                        : "bg-slate-50/40 border-slate-200 border-l-4 border-l-rose-500 shadow-2xs"
                    }`}
                  >
                    {/* Left column: OSI tags, Planned Date, Course Info */}
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Top Badges Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* OSI Button that opens preview modal */}
                        <button
                          type="button"
                          onClick={() => setPreviewOsi({ id: item.osiId, nro: item.nroOsi })}
                          className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1 transition-colors group/osi shadow-2xs"
                          title="Ver ficha técnica de la OSI"
                        >
                          <span>OSI {item.nroOsi}</span>
                          <ExternalLink className="w-3 h-3 text-sky-500 group-hover/osi:translate-x-0.5 transition-transform" />
                        </button>

                        {/* Session badge */}
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          Sesión {item.nroSesion} de {item.totalSesiones}
                        </span>

                        {/* Prominent Planned Date Badge */}
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {hasMultiDayRange
                              ? `Período: ${rangeStart} al ${rangeEnd} (Hoy: ${sessionDateHuman})`
                              : `Pautado: Hoy, ${sessionDateHuman}`}
                          </span>
                        </span>

                        {/* Time badge */}
                        {formattedTime && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formattedTime}</span>
                          </span>
                        )}

                        {/* Status Indicator Pill */}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Pendiente por confirmar</span>
                          </span>
                        )}

                        {isEnProceso && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>En ejecución / Confirmado</span>
                          </span>
                        )}

                        {isReagendado && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                            <CalendarClock className="w-3 h-3 text-indigo-600" />
                            <span>
                              Reagendado {item.rescheduledDate ? `para ${formatDateHuman(item.rescheduledDate)}` : ""}
                            </span>
                          </span>
                        )}

                        {isNoEjecutado && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>No ejecutado</span>
                          </span>
                        )}
                      </div>

                      {/* Course Title */}
                      <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                        {item.servicio}
                      </h3>

                      {/* Client & Facilitator Strip */}
                      <div className="flex items-center gap-x-4 gap-y-1 text-xs text-slate-600 flex-wrap">
                        <div className="flex items-center gap-1.5 truncate max-w-sm">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">
                            {item.nombreEmpresa}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>
                            Facilitador:{" "}
                            <strong className="text-slate-900">
                              {item.facilitadorNombre || "Por asignar"}
                            </strong>
                          </span>
                        </div>

                        {(item.ciudad || item.direccion) && (
                          <div className="flex items-center gap-1.5 truncate max-w-xs text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">
                              {item.ciudad || item.direccion}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right column: Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      {/* Pending state: Primary 1-Click Action */}
                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleConfirmarEjecucion(item)}
                            disabled={isItemLoading}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50 ring-2 ring-emerald-400/50 hover:ring-emerald-500"
                          >
                            {isItemLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Confirmar Ejecución</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedItemForModal(item);
                              setModalMode("reagendar");
                              setIsActionModalOpen(true);
                            }}
                            disabled={isItemLoading}
                            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 transition-colors shadow-2xs flex-shrink-0"
                          >
                            <span>Reagendar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedItemForModal(item);
                              setModalMode("cancelar");
                              setIsActionModalOpen(true);
                            }}
                            disabled={isItemLoading}
                            className="px-2.5 py-2 rounded-xl text-xs font-medium bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 transition-colors shadow-2xs flex-shrink-0"
                            title="Reportar como no ejecutado o cancelado"
                          >
                            <span>No Ejecutada</span>
                          </button>
                        </>
                      )}

                      {/* Executed state: Checkmark with modify option */}
                      {isEnProceso && (
                        <>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Confirmado</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedItemForModal(item);
                              setModalMode("reagendar");
                              setIsActionModalOpen(true);
                            }}
                            disabled={isItemLoading}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            Modificar
                          </button>
                        </>
                      )}

                      {/* Rescheduled or cancelled state: Option to restore */}
                      {(isReagendado || isNoEjecutado) && (
                        <button
                          type="button"
                          onClick={() => handleRestaurar(item)}
                          disabled={isItemLoading}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          {isItemLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>↺ Restaurar a Activo</span>
                          )}
                        </button>
                      )}

                      {/* Direct link to Seguimiento */}
                      <Link
                        href={`/dashboard/capacitacion/seguimiento-servicios?search=${encodeURIComponent(
                          item.nroOsi,
                        )}`}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100"
                        title="Abrir en el timeline de Seguimiento de Servicios"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer info & link */}
            <div className="pt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  Las confirmaciones se sincronizan en tiempo real con el estatus de la orden.
                </span>
              </span>

              <Link
                href="/dashboard/capacitacion/seguimiento-servicios"
                className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                <span>Ir a Seguimiento de Servicios</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Reagendar / Cancelar Modal */}
      <OsiHoyAccionModal
        isOpen={isActionModalOpen}
        item={selectedItemForModal}
        mode={modalMode}
        onClose={() => setIsActionModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      {/* OSI Technical Preview Modal */}
      {previewOsi && (
        <OsiPreviewModal
          osiId={previewOsi.id}
          osiNumber={previewOsi.nro}
          isOpen={true}
          onClose={() => setPreviewOsi(null)}
        />
      )}
    </>
  );
}
