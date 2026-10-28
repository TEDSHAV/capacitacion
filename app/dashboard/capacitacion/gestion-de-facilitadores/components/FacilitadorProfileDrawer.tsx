"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FacilitatorPoolItem } from "@/app/actions/facilitators-pool";
import { getVerificacionUsageByFacilitador, type VerificacionUsageStats } from "@/app/actions/verificacion-usage";
import { getFacilitadorHistory } from "@/app/actions/osi-facilitador-assignments";
import type { FacilitadorHistoryEntry } from "@/types";
import { toTitleCase, formatAcademicTitle } from "@/utils/string-utils";
import { useRouter } from "next/navigation";
import { OsiPreviewModal } from "@/components/osi/OsiPreviewModal";
import {
  X,
  Star,
  MapPin,
  FileText,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit,
  ClipboardCheck,
  Briefcase,
  GraduationCap,
  Sparkles,
  History,
  ExternalLink,
  Loader2,
  AlertCircle,
  Building,
} from "lucide-react";

interface FacilitadorProfileDrawerProps {
  facilitador: FacilitatorPoolItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAssignOsi: (facilitador: FacilitatorPoolItem) => void;
  onEdit: (facilitador: FacilitatorPoolItem) => void;
  onShowHistory?: (facilitador: FacilitatorPoolItem) => void;
  readOnly?: boolean;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d + (d.length === 10 ? "T12:00:00" : ""));
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function sessionCount(value: unknown): number | null {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

export function FacilitadorProfileDrawer({
  facilitador,
  isOpen,
  onClose,
  onAssignOsi,
  onEdit,
  onShowHistory,
  readOnly = false,
}: FacilitadorProfileDrawerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"competencias" | "historial" | "trayectoria" | "evaluacion">("competencias");
  const [imgError, setImgError] = useState(false);
  const [verificacionUsage, setVerificacionUsage] = useState<VerificacionUsageStats | null>(null);

  // History state inside drawer
  const [historyRows, setHistoryRows] = useState<FacilitadorHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [prevFacilitadorId, setPrevFacilitadorId] = useState<number | null>(null);
  const [previewOsi, setPreviewOsi] = useState<{ id: number; nroOsi?: string } | null>(null);

  // Sync state cleanly when facilitador changes without useEffect setState cascading renders
  if (facilitador && facilitador.id !== prevFacilitadorId) {
    setPrevFacilitadorId(facilitador.id);
    setHistoryLoaded(false);
    setHistoryRows([]);
    setHistoryError(null);
    setHistoryLoading(false);
    setImgError(false);
    setActiveTab("competencias");
  }

  const loadHistory = useCallback(async (id: number) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await getFacilitadorHistory(id);
      if (res.error) {
        setHistoryError(res.error);
      } else {
        setHistoryRows(res.data ?? []);
        setHistoryLoaded(true);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error inesperado al cargar historial";
      setHistoryError(msg);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleOpenHistoryTab = useCallback(() => {
    setActiveTab("historial");
    if (!historyLoaded && facilitador) {
      loadHistory(facilitador.id);
    }
  }, [historyLoaded, facilitador, loadHistory]);

  // Fetch verification usage stats when the drawer opens for a facilitador
  useEffect(() => {
    if (!isOpen || !facilitador) return;
    let cancelled = false;
    (async () => {
      try {
        const stats = await getVerificacionUsageByFacilitador(facilitador.id);
        if (!cancelled) setVerificacionUsage(stats);
      } catch (err) {
        console.error("Failed to load verification usage stats:", err);
        if (!cancelled) setVerificacionUsage(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, facilitador]);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !facilitador) return null;

  const initials = (facilitador.nombre_apellido || "F")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");

  const cond = facilitador.evaluacion?.condicion_final;
  const isAprobado = cond === "aprobado" || cond === "aceptable";
  const isSupervision = cond === "aprobado_supervision";
  const isNoAprobado = cond === "no_aprobado" || cond === "no_aceptable";

  // Convert topic ratings to array
  const niveles = facilitador.niveles_habilidad || {};
  const levelForTopic = (topicName: string): string | undefined => {
    const matchKey = Object.keys(niveles).find(
      (k) => k.toLowerCase().trim() === topicName.toLowerCase().trim(),
    );
    return matchKey ? niveles[matchKey] : undefined;
  };
  const levelBadgeClasses = (level: string | undefined): { dot: string; chip: string; label: string } => {
    switch (level) {
      case "experto":
        return { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Experto" };
      case "intermedio":
        return { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 border-amber-200", label: "Intermedio" };
      case "basico":
        return { dot: "bg-slate-400", chip: "bg-slate-50 text-slate-700 border-slate-200", label: "Básico" };
      default:
        return { dot: "bg-gray-300", chip: "bg-gray-50 text-gray-500 border-gray-200", label: "Sin nivel" };
    }
  };

  const topicsList = (facilitador.temas_cursos || []).map((topicName) => {
    const key = topicName.toLowerCase().trim();
    const tr = facilitador.topicRatings[key];
    return {
      topicName,
      avgRating: tr?.avgRating || 0,
      reviewCount: tr?.reviewCount || 0,
      sessionsCount: tr?.sessionsCount || 0,
      level: levelForTopic(topicName),
    };
  }).sort((a, b) => {
    // Sort by skill level first (experto > intermedio > basico > none), then by rating
    const rank = (lvl: string | undefined) =>
      lvl === "experto" ? 3 : lvl === "intermedio" ? 2 : lvl === "basico" ? 1 : 0;
    const lvlDiff = rank(b.level) - rank(a.level);
    if (lvlDiff !== 0) return lvlDiff;
    return b.avgRating - a.avgRating || a.topicName.localeCompare(b.topicName);
  });

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact, Unified Header */}
        <div className="px-5 py-3 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-start justify-between gap-3">
            {/* Left: Avatar + Identity */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                {facilitador.foto_perfil_url && !imgError ? (
                  <img
                    src={facilitador.foto_perfil_url}
                    alt={facilitador.nombre_apellido}
                    onError={() => setImgError(true)}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm ring-2 ring-gray-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-base shadow-sm border-2 border-white ring-2 ring-gray-100 bg-gradient-to-br from-[#0c3f69] to-blue-500">
                    {initials}
                  </div>
                )}
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                    facilitador.is_active ? "bg-emerald-500" : "bg-red-400"
                  }`}
                  title={facilitador.is_active ? "Activo" : "Inactivo"}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-gray-900 leading-tight truncate">
                    {toTitleCase(facilitador.nombre_apellido || "")}
                  </h2>
                  <span
                    className={`inline-flex px-1.5 py-0.2 text-[10px] font-semibold rounded-full ${
                      facilitador.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {facilitador.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <p className="text-xs text-gray-600 truncate mt-0.5">
                  {formatAcademicTitle(facilitador.titulo_profesional || "Facilitador de Capacitación")}
                </p>

                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="truncate">{facilitador.ciudad_nombre || facilitador.estado_nombre || "Venezuela"}</span>
                    {facilitador.alcance && (
                      <span className="ml-1 text-[9px] bg-gray-100 text-gray-600 px-1 rounded font-medium capitalize">
                        {toTitleCase(facilitador.alcance)}
                      </span>
                    )}
                  </span>
                  {facilitador.cedula && <span>CI: {facilitador.cedula}</span>}
                  {facilitador.telefono && (
                    <a href={`tel:${facilitador.telefono}`} className="text-blue-600 hover:underline">
                      {facilitador.telefono}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
              title="Cerrar panel (Esc o click afuera)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics Inline Strip */}
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600 flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-gray-900">
                {facilitador.overallRating > 0 ? facilitador.overallRating.toFixed(1) : "—"}
              </span>
              <span className="text-[10px] text-gray-400">({facilitador.reviewCount} evals)</span>
            </div>

            {isAprobado && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> RG-004 Aprobado
              </span>
            )}
            {isSupervision && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-3 h-3 text-amber-600" /> Supervisión
              </span>
            )}
            {isNoAprobado && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-800">
                <XCircle className="w-3 h-3 text-red-600" /> No Aprobado
              </span>
            )}

            <button
              onClick={handleOpenHistoryTab}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors"
              title="Ver cursos dictados"
            >
              <History className="w-3 h-3 text-blue-600" />
              <span>{facilitador.totalOsisCount} OSIs</span>
            </button>

            <span className="text-[11px] text-gray-500 font-medium">
              <strong className="text-gray-800">{facilitador.totalCertificadosCount}</strong> certificados
            </span>
          </div>
        </div>

        {/* Tab Navigation (Equal 4-Column Grid — Zero Horizontal Scroll) */}
        <div className="grid grid-cols-4 bg-gray-100/80 p-1 border-b border-gray-200 shrink-0 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("competencias")}
            className={`py-2 px-1 rounded-md transition-all flex items-center justify-center gap-1.5 text-center ${
              activeTab === "competencias"
                ? "bg-white text-blue-900 shadow-xs font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-600 shrink-0" />
            <span className="truncate">Temas ({topicsList.length})</span>
          </button>

          <button
            onClick={handleOpenHistoryTab}
            className={`py-2 px-1 rounded-md transition-all flex items-center justify-center gap-1.5 text-center ${
              activeTab === "historial"
                ? "bg-white text-blue-900 shadow-xs font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <History className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">Cursos ({facilitador.totalOsisCount})</span>
          </button>

          <button
            onClick={() => setActiveTab("trayectoria")}
            className={`py-2 px-1 rounded-md transition-all flex items-center justify-center gap-1.5 text-center ${
              activeTab === "trayectoria"
                ? "bg-white text-blue-900 shadow-xs font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">Trayectoria</span>
          </button>

          <button
            onClick={() => setActiveTab("evaluacion")}
            className={`py-2 px-1 rounded-md transition-all flex items-center justify-center gap-1.5 text-center ${
              activeTab === "evaluacion"
                ? "bg-white text-blue-900 shadow-xs font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Evaluación</span>
          </button>
        </div>

        {/* Scrollable Tab Content (Maximized Vertical Height) */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* TAB: Historial de Cursos y OSIs */}
          {activeTab === "historial" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    Cursos y Servicios Dictados
                  </h3>
                  <p className="text-xs text-gray-500">
                    {historyRows.length} orden{historyRows.length === 1 ? "" : "es"} de servicio (OSIs) dictadas por este facilitador.
                  </p>
                </div>
                {onShowHistory && historyRows.length > 0 && (
                  <button
                    onClick={() => onShowHistory(facilitador)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors shrink-0"
                    title="Abrir historial en modal ampliado"
                  >
                    <span>Modal Ampliado</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                  <p className="text-xs text-gray-500 mt-2.5 font-medium">Cargando cursos dictados...</p>
                </div>
              ) : historyError ? (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{historyError}</span>
                </div>
              ) : historyRows.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
                  <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">Sin cursos registrados</p>
                  <p className="text-xs text-gray-400 mt-1">Este facilitador no tiene cursos ni servicios asignados en el sistema.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                    {historyRows.map((row) => {
                      const ejecutadas = sessionCount(row.sesiones_ejecucion);
                      const programadas = sessionCount(row.sesiones_programadas);
                      const ejecutada = !!row.fecha_inicio_real;

                      return (
                        <div
                          key={row.osi_id}
                          className="p-3 hover:bg-blue-50/40 transition-colors flex flex-col gap-1"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setPreviewOsi({ id: row.osi_id, nroOsi: row.nro_osi ?? undefined })}
                                  className="inline-flex items-center gap-1 font-bold text-xs text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors cursor-pointer"
                                  title="Ver formato oficial de la OSI"
                                >
                                  {row.nro_osi || `OSI #${row.osi_id}`}
                                </button>

                                {row.source === "requisicion" && (
                                  <span
                                    className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded"
                                    title="OSI registrada mediante requisición procesada"
                                  >
                                    Requisición
                                  </span>
                                )}

                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    ejecutada
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                  }`}
                                >
                                  {ejecutada ? "Ejecutada" : "Pendiente"}
                                </span>
                              </div>

                              <h4 className="text-xs font-semibold text-gray-900 mt-1 leading-snug">
                                {row.servicio || "Servicio no especificado"}
                              </h4>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[11px] font-medium text-gray-600 block">
                                {formatDate(row.fecha_inicio_real)}
                              </span>
                              {(ejecutadas !== null || programadas !== null) && (
                                <span className="text-[10px] text-gray-400 block mt-0.5 font-mono">
                                  {ejecutadas ?? "—"}/{programadas ?? "—"} ses.
                                </span>
                              )}
                            </div>
                          </div>

                          {row.nombre_empresa && (
                            <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                              <Building className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate">{row.nombre_empresa}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: Matriz de Temas y Calificaciones */}
          {activeTab === "competencias" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Cursos y Temas Dictados
                  </h3>
                  <p className="text-xs text-gray-500">
                    Puntuación promedio de los participantes basada en las encuestas de satisfacción.
                  </p>
                </div>
              </div>

              {topicsList.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500 italic">No hay temas asignados a este facilitador.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {topicsList.map((t, idx) => {
                    const scorePct = t.avgRating > 0 ? (t.avgRating / 5) * 100 : 0;
                    const badge = levelBadgeClasses(t.level);
                    return (
                      <div
                        key={idx}
                        className="p-3.5 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">
                                {t.topicName}
                              </h4>
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${badge.chip}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                {badge.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                              <span>
                                {t.sessionsCount > 0 ? `${t.sessionsCount} OSIs dictadas` : "Sin servicios aún"}
                              </span>
                              <span>•</span>
                              <span>
                                {t.reviewCount > 0 ? `${t.reviewCount} encuestas recibidas` : "Sin encuestas registradas"}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {t.avgRating > 0 && (
                              <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span className="text-xs font-bold text-amber-800">{t.avgRating.toFixed(1)}</span>
                                <span className="text-[10px] text-amber-600">/ 5.0</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Progress bar */}
                        {t.avgRating > 0 && (
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mt-2">
                            <div
                              className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all"
                              style={{ width: `${scorePct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Trayectoria y Ficha Técnica */}
          {activeTab === "trayectoria" && (
            <div className="space-y-5">
              {/* Formación Académica */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <h4>Formación Académica</h4>
                </div>
                {facilitador.formacion_academica ? (
                  <div
                    className="text-xs text-gray-700 leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: facilitador.formacion_academica }}
                  />
                ) : (
                  <p className="text-xs text-gray-400 italic">No se ha registrado información académica.</p>
                )}
              </div>

              {/* Experiencia Laboral */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <h4>Experiencia Laboral</h4>
                </div>
                {facilitador.experiencia_laboral ? (
                  <div
                    className="text-xs text-gray-700 leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: facilitador.experiencia_laboral }}
                  />
                ) : (
                  <p className="text-xs text-gray-400 italic">No se ha registrado experiencia laboral.</p>
                )}
              </div>

              {/* Competencias y Habilidades */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h4>Competencias y Habilidades</h4>
                </div>
                {facilitador.competencias_habilidades ? (
                  <div
                    className="text-xs text-gray-700 leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: facilitador.competencias_habilidades }}
                  />
                ) : (
                  <p className="text-xs text-gray-400 italic">No se han registrado competencias adicionales.</p>
                )}
              </div>

              {/* Notas u Observaciones */}
              {facilitador.notas_observaciones && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-xs font-bold text-gray-700 mb-1.5 uppercase">Notas Internas</h4>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap">{facilitador.notas_observaciones}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Evaluación RG-CAP-004 */}
          {activeTab === "evaluacion" && (
            <div className="space-y-4">
              <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
                <h4 className="text-sm font-bold text-violet-900 mb-1">
                  Estado de Evaluación Oficial (RG-CAP-004)
                </h4>
                <p className="text-xs text-violet-700">
                  Evaluación inicial y de seguimiento de facilitadores conforme a la Instrucción de Trabajo SHA-IT-CAP-001.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-md border border-violet-100">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Condición Actual</span>
                    <span className="font-bold text-sm text-gray-900 uppercase">
                      {facilitador.evaluacion?.condicion_final ? facilitador.evaluacion.condicion_final.replace("_", " ") : "Sin evaluar"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Porcentaje Global</span>
                    <span className="font-bold text-sm text-violet-700">
                      {facilitador.evaluacion?.porcentaje_total != null
                        ? `${(facilitador.evaluacion.porcentaje_total * 100).toFixed(1)}%`
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      router.push(`/dashboard/capacitacion/evaluacion-facilitadores/${facilitador.id}`);
                      onClose();
                    }}
                    className="text-xs px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-md shadow-xs transition-colors"
                  >
                    Ver Historial de Evaluaciones
                  </button>
                  <button
                    onClick={() => {
                      router.push(`/dashboard/capacitacion/evaluacion-facilitadores/${facilitador.id}/nueva`);
                      onClose();
                    }}
                    className="text-xs px-3 py-1.5 bg-white border border-violet-300 text-violet-700 hover:bg-violet-50 font-medium rounded-md transition-colors"
                  >
                    + Nueva Evaluación
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Verificación de Participantes */}
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-bold text-blue-900 mb-1">
                Verificación de Participantes
              </h4>
              <p className="text-xs text-blue-700">
                Promedio de generaciones donde el facilitador usó la herramienta de verificación de participantes en su portal.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-md border border-blue-100">
                <div>
                  <span className="text-gray-400 block text-[11px]">Promedio de Uso</span>
                  <span className="font-bold text-sm text-gray-900">
                    {verificacionUsage && verificacionUsage.rate != null
                      ? `${(verificacionUsage.rate * 100).toFixed(0)}%`
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Generaciones</span>
                  <span className="font-bold text-sm text-blue-700">
                    {verificacionUsage
                      ? `${verificacionUsage.verificacionBatches}/${verificacionUsage.totalBatches}`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
          {readOnly ? (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => {
                  if (onShowHistory) {
                    onShowHistory(facilitador);
                  } else {
                    handleOpenHistoryTab();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
                title="Ver historial de cursos y OSIs dictadas"
              >
                <History className="w-4 h-4 text-blue-600" />
                <span>Historial de Cursos ({facilitador.totalOsisCount})</span>
              </button>

              <a
                href={`/api/generate-ficha-tecnica-facilitador-pdf?id=${facilitador.id}&inline=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                title="Ver Ficha Técnica PDF (abre en nueva pestaña)"
              >
                <FileText className="w-4 h-4" />
                <span>Ver Ficha Técnica PDF</span>
              </a>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    onAssignOsi(facilitador);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0c3f69] hover:bg-blue-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Asignar a OSI</span>
                </button>

                <button
                  onClick={() => {
                    onEdit(facilitador);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg shadow-2xs transition-colors"
                >
                  <Edit className="w-4 h-4 text-gray-500" />
                  <span>Editar Perfil</span>
                </button>

                <button
                  onClick={() => {
                    if (onShowHistory) {
                      onShowHistory(facilitador);
                    } else {
                      handleOpenHistoryTab();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors shadow-2xs"
                  title="Ver historial de cursos y OSIs dictadas"
                >
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Historial ({facilitador.totalOsisCount})</span>
                </button>
              </div>

              <a
                href={`/api/generate-ficha-tecnica-facilitador-pdf?id=${facilitador.id}&inline=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 text-xs font-medium rounded-lg transition-colors shadow-2xs"
                title="Ver Ficha Técnica PDF (abre en nueva pestaña)"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Ficha Técnica PDF</span>
              </a>
            </>
          )}
        </div>
      </div>

      <OsiPreviewModal
        isOpen={Boolean(previewOsi)}
        osiId={previewOsi?.id ?? null}
        osiNumber={previewOsi?.nroOsi}
        onClose={() => setPreviewOsi(null)}
      />
    </div>
  );
}
