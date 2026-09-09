"use client";

import React, { useState } from "react";
import { FacilitatorPoolItem } from "@/app/actions/facilitators-pool";
import { toTitleCase } from "@/utils/string-utils";
import {
  Star,
  StarHalf,
  MapPin,
  BookOpen,
  Calendar,
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Edit,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface FacilitadorCardProps {
  facilitador: FacilitatorPoolItem;
  matchedTopic?: string | null;
  matchedCity?: string | null;
  onAssignOsi: (facilitador: FacilitatorPoolItem) => void;
  onViewProfile: (facilitador: FacilitatorPoolItem) => void;
  onEdit: (facilitador: FacilitatorPoolItem) => void;
}

export function FacilitadorCard({
  facilitador,
  matchedTopic,
  matchedCity,
  onAssignOsi,
  onViewProfile,
  onEdit,
}: FacilitadorCardProps) {
  const [imgError, setImgError] = useState(false);

  // Skill level helpers
  const niveles = facilitador.niveles_habilidad || {};
  const levelForTopic = (topicName: string): string | undefined => {
    const matchKey = Object.keys(niveles).find(
      (k) => k.toLowerCase().trim() === topicName.toLowerCase().trim(),
    );
    return matchKey ? niveles[matchKey] : undefined;
  };
  const levelDotClass = (level: string | undefined): string => {
    switch (level) {
      case "experto":
        return "bg-emerald-500";
      case "intermedio":
        return "bg-amber-500";
      case "basico":
        return "bg-slate-400";
      default:
        return "bg-gray-300";
    }
  };
  const levelLabelShort = (level: string | undefined): string => {
    switch (level) {
      case "experto":
        return "Exp";
      case "intermedio":
        return "Int";
      case "basico":
        return "Bás";
      default:
        return "";
    }
  };

  // Check matched topic rating
  const normalizedMatched = matchedTopic ? matchedTopic.toLowerCase().trim() : null;
  const matchedRating = normalizedMatched ? facilitador.topicRatings[normalizedMatched] : null;
  const teachesMatchedTopic = !!matchedRating || (facilitador.temas_cursos || []).some(
    (t) => t.toLowerCase().trim() === normalizedMatched
  );
  const matchedLevel = matchedTopic ? levelForTopic(matchedTopic) : undefined;

  // Check matched city
  const isCityMatch =
    matchedCity &&
    (facilitador.ciudad_nombre?.toLowerCase().includes(matchedCity.toLowerCase()) ||
      facilitador.estado_nombre?.toLowerCase().includes(matchedCity.toLowerCase()));

  // Render initials
  const initials = (facilitador.nombre_apellido || "F")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");

  // Accreditation badge
  const cond = facilitador.evaluacion?.condicion_final;
  const isAprobado = cond === "aprobado" || cond === "aceptable";
  const isSupervision = cond === "aprobado_supervision";
  const isNoAprobado = cond === "no_aprobado" || cond === "no_aceptable";

  // Render Stars
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

  return (
    <div
      onClick={() => onViewProfile(facilitador)}
      className={`group relative bg-white rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden ${
        teachesMatchedTopic && matchedTopic
          ? "border-violet-300 ring-2 ring-violet-500/10 shadow-sm"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Top Highlight Banner if matching topic selected */}
      {matchedTopic && teachesMatchedTopic && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-1 text-white text-[11px] font-medium flex items-center justify-between">
          <span className="truncate flex items-center gap-1.5">
            {matchedLevel && (
              <span className={`w-2 h-2 rounded-full ${levelDotClass(matchedLevel)}`} />
            )}
            <span>
              {matchedLevel === "experto"
                ? "Experto"
                : matchedLevel === "intermedio"
                  ? "Intermedio"
                  : matchedLevel === "basico"
                    ? "Básico"
                    : "Habilitado"}{" "}
              en: <strong className="font-semibold">{matchedTopic}</strong>
            </span>
          </span>
          <span className="ml-2 font-bold shrink-0">
            {matchedRating && matchedRating.avgRating > 0
              ? `★ ${matchedRating.avgRating.toFixed(1)} (${matchedRating.reviewCount} evals)`
              : "Habilitado"}
          </span>
        </div>
      )}

      {/* Main Card Content */}
      <div className="p-4 flex-1">
        {/* Header: Photo + Name + Status */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            {facilitador.foto_perfil_url && !imgError ? (
              <img
                src={facilitador.foto_perfil_url}
                alt={facilitador.nombre_apellido}
                onError={() => setImgError(true)}
                className="w-13 h-13 rounded-full object-cover border-2 border-white shadow-sm ring-2 ring-gray-100"
                style={{ width: "52px", height: "52px" }}
              />
            ) : (
              <div
                className="w-13 h-13 rounded-full flex items-center justify-center font-bold text-white text-base shadow-sm border-2 border-white ring-2 ring-gray-100 bg-gradient-to-br from-[#0c3f69] to-blue-500"
                style={{ width: "52px", height: "52px" }}
              >
                {initials}
              </div>
            )}
            {/* Status dot */}
            <span
              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                facilitador.is_active ? "bg-emerald-500" : "bg-red-400"
              }`}
              title={facilitador.is_active ? "Facilitador Activo" : "Facilitador Inactivo"}
            />
          </div>

          {/* Name & Title */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                {toTitleCase(facilitador.nombre_apellido || "")}
              </h3>
            </div>

            <p className="text-xs text-gray-500 truncate mt-0.5">
              {facilitador.titulo_profesional || "Facilitador de Capacitación"}
            </p>

            {/* Badges strip: Accreditation + Reach */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {isAprobado && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Aprobado
                </span>
              )}
              {isSupervision && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Bajo supervisión
                </span>
              )}
              {isNoAprobado && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-50 text-red-700 border border-red-200">
                  <XCircle className="w-3 h-3 text-red-600" />
                  No aprobado
                </span>
              )}
              {facilitador.alcance && (
                <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600 border border-gray-200">
                  {facilitador.alcance}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rating and Location Bar */}
        <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          <div>{renderStars(facilitador.overallRating)}</div>

          <div className="flex items-center gap-1 text-gray-500 text-[11px] truncate max-w-[50%]">
            <MapPin className={`w-3.5 h-3.5 shrink-0 ${isCityMatch ? "text-violet-600 font-bold" : "text-gray-400"}`} />
            <span className={`truncate ${isCityMatch ? "font-bold text-violet-700" : ""}`}>
              {facilitador.ciudad_nombre || facilitador.estado_nombre || "Venezuela"}
            </span>
          </div>
        </div>

        {/* Topics Chips */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1.5 font-medium">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-gray-400" /> Temas que dicta:
            </span>
            <span className="text-gray-400 font-mono text-[10px]">
              {(facilitador.temas_cursos || []).length} temas
            </span>
          </div>

          <div className="flex flex-wrap gap-1">
            {(facilitador.temas_cursos || []).slice(0, 3).map((topic, i) => {
              const topRating = facilitador.topicRatings[topic.toLowerCase().trim()];
              const isMatched = normalizedMatched === topic.toLowerCase().trim();
              const lvl = levelForTopic(topic);
              return (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                    isMatched
                      ? "bg-violet-100 text-violet-800 border border-violet-300 font-semibold"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
                  }`}
                >
                  {lvl && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${levelDotClass(lvl)}`}
                      title={`Nivel: ${lvl === "experto" ? "Experto" : lvl === "intermedio" ? "Intermedio" : "Básico"}`}
                    />
                  )}
                  <span className="truncate max-w-[140px]">{topic}</span>
                  {topRating && topRating.avgRating > 0 && (
                    <span className="text-[10px] font-bold text-amber-600">
                      ★{topRating.avgRating.toFixed(1)}
                    </span>
                  )}
                </span>
              );
            })}

            {(facilitador.temas_cursos || []).length > 3 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                +{(facilitador.temas_cursos || []).length - 3}
              </span>
            )}

            {(!facilitador.temas_cursos || facilitador.temas_cursos.length === 0) && (
              <span className="text-xs text-gray-400 italic">Sin temas asignados</span>
            )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 p-2 bg-gray-50/70 rounded-lg border border-gray-100 text-[11px]">
          <div>
            <span className="text-gray-400 block text-[10px]">Servicios (OSIs)</span>
            <span className="font-bold text-gray-800">{facilitador.totalOsisCount} ejecutadas</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">Participantes</span>
            <span className="font-bold text-gray-800">{facilitador.totalCertificadosCount} capacitados</span>
          </div>
        </div>
      </div>

      {/* Card Action Buttons Bar */}
      <div
        className="px-4 py-2.5 bg-gray-50/90 border-t border-gray-100 flex items-center justify-between gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onAssignOsi(facilitador)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#0c3f69] hover:bg-blue-900 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
          title="Asignar facilitador a una OSI"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Asignar</span>
        </button>

        <button
          onClick={() => onViewProfile(facilitador)}
          className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors shadow-2xs"
          title="Ver perfil completo de competencias y calificaciones"
        >
          <span>Perfil</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(facilitador)}
            className="p-1.5 text-gray-500 hover:text-gray-800 bg-white border border-gray-200 hover:bg-gray-100 rounded-md transition-colors shadow-2xs"
            title="Editar Facilitador"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>

          <a
            href={`/api/generate-ficha-tecnica-facilitador-pdf?id=${facilitador.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors shadow-2xs"
            title="Descargar Ficha Técnica PDF"
          >
            <FileText className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
