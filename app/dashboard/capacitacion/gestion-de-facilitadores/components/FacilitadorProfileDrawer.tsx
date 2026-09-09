"use client";

import React, { useState, useEffect } from "react";
import { FacilitatorPoolItem } from "@/app/actions/facilitators-pool";
import { toTitleCase } from "@/utils/string-utils";
import { useRouter } from "next/navigation";
import {
  X,
  Star,
  StarHalf,
  MapPin,
  Mail,
  Phone,
  FileText,
  Calendar,
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit,
  ClipboardCheck,
  Briefcase,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Layers,
} from "lucide-react";

interface FacilitadorProfileDrawerProps {
  facilitador: FacilitatorPoolItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAssignOsi: (facilitador: FacilitatorPoolItem) => void;
  onEdit: (facilitador: FacilitatorPoolItem) => void;
}

export function FacilitadorProfileDrawer({
  facilitador,
  isOpen,
  onClose,
  onAssignOsi,
  onEdit,
}: FacilitadorProfileDrawerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"competencias" | "trayectoria" | "evaluacion">("competencias");
  const [imgError, setImgError] = useState(false);

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

  const renderStars = (rating: number) => {
    if (!rating || rating === 0) {
      return <span className="text-gray-400 text-xs italic">Sin encuestas</span>;
    }
    const full = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const empty = 5 - full - (hasHalf ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(full)].map((_, i) => (
          <Star key={`f-${i}`} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        ))}
        {hasHalf && <StarHalf className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
        {[...Array(empty)].map((_, i) => (
          <Star key={`e-${i}`} className="w-3.5 h-3.5 text-gray-300" />
        ))}
        <span className="ml-1 text-xs font-bold text-gray-800">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Convert topic ratings to array
  const topicsList = (facilitador.temas_cursos || []).map((topicName) => {
    const key = topicName.toLowerCase().trim();
    const tr = facilitador.topicRatings[key];
    return {
      topicName,
      avgRating: tr?.avgRating || 0,
      reviewCount: tr?.reviewCount || 0,
      sessionsCount: tr?.sessionsCount || 0,
    };
  }).sort((a, b) => b.avgRating - a.avgRating || a.topicName.localeCompare(b.topicName));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Strip */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#0c3f69] via-blue-900 to-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-300" />
            <h2 className="text-base font-bold tracking-tight">Perfil de Competencias del Facilitador</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card Header */}
        <div className="p-6 bg-gray-50 border-b border-gray-200 shrink-0">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              {facilitador.foto_perfil_url && !imgError ? (
                <img
                  src={facilitador.foto_perfil_url}
                  alt={facilitador.nombre_apellido}
                  onError={() => setImgError(true)}
                  className="w-20 h-20 rounded-full object-cover border-3 border-white shadow-md ring-2 ring-blue-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-white text-2xl shadow-md border-3 border-white ring-2 ring-blue-100 bg-gradient-to-br from-[#0c3f69] to-blue-500">
                  {initials}
                </div>
              )}
              <span
                className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${
                  facilitador.is_active ? "bg-emerald-500" : "bg-red-400"
                }`}
                title={facilitador.is_active ? "Activo" : "Inactivo"}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 truncate">
                  {toTitleCase(facilitador.nombre_apellido || "")}
                </h1>
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                    facilitador.is_active
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {facilitador.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>

              <p className="text-sm font-medium text-gray-600 mt-0.5">
                {facilitador.titulo_profesional || "Facilitador de Capacitación"}
              </p>

              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>
                    {facilitador.ciudad_nombre || "Ciudad no especificada"}
                    {facilitador.estado_nombre ? `, ${facilitador.estado_nombre}` : ""}
                  </span>
                  {facilitador.alcance && (
                    <span className="ml-1 text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded font-medium">
                      {facilitador.alcance}
                    </span>
                  )}
                </div>

                {facilitador.cedula && <span>CI: {facilitador.cedula}</span>}
                {facilitador.rif && <span>RIF: {facilitador.rif}</span>}
              </div>

              {/* Contact strip */}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                {facilitador.email && (
                  <a href={`mailto:${facilitador.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                    <Mail className="w-3 h-3" />
                    <span>{facilitador.email}</span>
                  </a>
                )}
                {facilitador.telefono && (
                  <a href={`tel:${facilitador.telefono}`} className="flex items-center gap-1 text-gray-600 hover:underline">
                    <Phone className="w-3 h-3" />
                    <span>{facilitador.telefono}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-5 grid grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-gray-200 text-center">
            <div>
              <span className="text-[11px] text-gray-400 block font-medium">Rating Encuestas</span>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-base font-bold text-gray-900">
                  {facilitador.overallRating > 0 ? facilitador.overallRating.toFixed(1) : "—"}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 block">{facilitador.reviewCount} encuestas</span>
            </div>

            <div>
              <span className="text-[11px] text-gray-400 block font-medium">Acreditación RG-004</span>
              <div className="mt-1">
                {isAprobado && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aprobado
                  </span>
                )}
                {isSupervision && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Supervisión
                  </span>
                )}
                {isNoAprobado && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3 text-red-600" /> No Aprobado
                  </span>
                )}
                {!cond && (
                  <span className="text-xs text-gray-400 italic">Sin evaluación</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-gray-400 block font-medium">Servicios (OSIs)</span>
              <span className="text-base font-bold text-gray-900 mt-0.5 block">
                {facilitador.totalOsisCount}
              </span>
              <span className="text-[10px] text-gray-400 block">ejecutadas</span>
            </div>

            <div>
              <span className="text-[11px] text-gray-400 block font-medium">Participantes</span>
              <span className="text-base font-bold text-gray-900 mt-0.5 block">
                {facilitador.totalCertificadosCount}
              </span>
              <span className="text-[10px] text-gray-400 block">certificados</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-gray-200 bg-white flex gap-6 text-sm font-medium shrink-0">
          <button
            onClick={() => setActiveTab("competencias")}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "competencias"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Matriz de Temas ({topicsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("trayectoria")}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "trayectoria"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Trayectoria y Ficha Técnica</span>
          </button>

          <button
            onClick={() => setActiveTab("evaluacion")}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "evaluacion"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Evaluación RG-CAP-004</span>
          </button>
        </div>

        {/* Scrollable Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
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
                    return (
                      <div
                        key={idx}
                        className="p-3.5 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold text-gray-900 truncate">
                              {t.topicName}
                            </h4>
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
                            {t.avgRating > 0 ? (
                              <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span className="text-xs font-bold text-amber-800">{t.avgRating.toFixed(1)}</span>
                                <span className="text-[10px] text-amber-600">/ 5.0</span>
                              </div>
                            ) : (
                              <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                Habilitado
                              </span>
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
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onAssignOsi(facilitador);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0c3f69] hover:bg-blue-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
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
          </div>

          <a
            href={`/api/generate-ficha-tecnica-facilitador-pdf?id=${facilitador.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors shadow-2xs"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Ficha Técnica PDF</span>
          </a>
        </div>
      </div>
    </div>
  );
}
