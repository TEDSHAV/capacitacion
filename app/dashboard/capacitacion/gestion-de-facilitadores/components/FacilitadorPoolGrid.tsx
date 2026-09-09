"use client";

import React, { useMemo } from "react";
import { FacilitatorPoolItem } from "@/app/actions/facilitators-pool";
import { FacilitadorCard } from "./FacilitadorCard";
import { ViewMode, SortMode, SkillLevel } from "./FacilitadorMatcherBar";
import { toTitleCase } from "@/utils/string-utils";
import {
  Star,
  MapPin,
  BookOpen,
  Calendar,
  Edit,
  FileText,
  History,
  Users,
  Search,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

interface FacilitadorPoolGridProps {
  facilitadores: FacilitatorPoolItem[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  selectedTopic: string | null;
  selectedCity: string | null;
  selectedLevel: SkillLevel;
  onlyActive: boolean;
  sortMode: SortMode;
  viewMode: ViewMode;
  onAssignOsi: (facilitador: FacilitatorPoolItem) => void;
  onViewProfile: (facilitador: FacilitatorPoolItem) => void;
  onEdit: (facilitador: FacilitatorPoolItem) => void;
  onToggleStatus: (facilitador: FacilitatorPoolItem) => void;
  onShowHistory: (facilitador: FacilitatorPoolItem) => void;
}

export function FacilitadorPoolGrid({
  facilitadores,
  loading,
  error,
  searchTerm,
  selectedTopic,
  selectedCity,
  selectedLevel,
  onlyActive,
  sortMode,
  viewMode,
  onAssignOsi,
  onViewProfile,
  onEdit,
  onToggleStatus,
  onShowHistory,
}: FacilitadorPoolGridProps) {
  // Apply filters + sort
  const { filtered, matchedCount } = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const topicKey = selectedTopic ? selectedTopic.toLowerCase().trim() : null;
    const cityLower = selectedCity ? selectedCity.toLowerCase().trim() : null;

    // Helper: skill level rank (higher = better). Returns -1 if no level for topic.
    const levelRank = (f: FacilitatorPoolItem, key: string): number => {
      // niveles_habilidad is keyed by exact topic name; topicKey is lowercased.
      // Find the matching key case-insensitively.
      const niveles = f.niveles_habilidad || {};
      const matchKey = Object.keys(niveles).find(
        (k) => k.toLowerCase().trim() === key,
      );
      if (!matchKey) return -1;
      const lvl = niveles[matchKey];
      if (lvl === "experto") return 3;
      if (lvl === "intermedio") return 2;
      if (lvl === "basico") return 1;
      return -1;
    };

    let list = facilitadores.filter((f) => {
      // Active filter
      if (onlyActive && !f.is_active) return false;

      // City filter
      if (cityLower) {
        const matchesCity =
          (f.ciudad_nombre || "").toLowerCase().includes(cityLower) ||
          (f.estado_nombre || "").toLowerCase().includes(cityLower);
        if (!matchesCity) return false;
      }

      // Search term filter
      if (term) {
        const matchesTerm =
          (f.nombre_apellido || "").toLowerCase().includes(term) ||
          (f.email || "").toLowerCase().includes(term) ||
          (f.cedula || "").toLowerCase().includes(term) ||
          (f.titulo_profesional || "").toLowerCase().includes(term) ||
          (f.temas_cursos || []).some((t) => t.toLowerCase().includes(term));
        if (!matchesTerm) return false;
      }

      return true;
    });

    // Compute matched count (facilitators who can teach the selected topic)
    let matched = 0;
    if (topicKey) {
      list = list.filter((f) => {
        const teaches =
          !!f.topicRatings[topicKey] ||
          (f.temas_cursos || []).some((t) => t.toLowerCase().trim() === topicKey);
        if (teaches) matched++;

        // Skill level filter (only meaningful when a topic is selected)
        if (teaches && selectedLevel !== "todos") {
          const rank = levelRank(f, topicKey);
          if (rank === -1) return false; // no level recorded -> exclude when filtering by level
          const wantedRank =
            selectedLevel === "experto" ? 3 : selectedLevel === "intermedio" ? 2 : 1;
          if (rank !== wantedRank) return false;
        }

        return true;
      });
    }

    // Sort
    list = [...list].sort((a, b) => {
      // When a topic is selected, prioritize topic match + skill level + topic rating first
      if (topicKey) {
        const aTeaches = !!a.topicRatings[topicKey] || (a.temas_cursos || []).some((t) => t.toLowerCase().trim() === topicKey);
        const bTeaches = !!b.topicRatings[topicKey] || (b.temas_cursos || []).some((t) => t.toLowerCase().trim() === topicKey);
        if (aTeaches !== bTeaches) return aTeaches ? -1 : 1;

        // Skill level: expert (3) > intermediate (2) > basic (1) > none (-1)
        const aLevel = levelRank(a, topicKey);
        const bLevel = levelRank(b, topicKey);
        if (aLevel !== bLevel) return bLevel - aLevel;

        const aRating = a.topicRatings[topicKey]?.avgRating || 0;
        const bRating = b.topicRatings[topicKey]?.avgRating || 0;
        if (aRating !== bRating) return bRating - aRating;
      }

      switch (sortMode) {
        case "rating":
          return b.overallRating - a.overallRating;
        case "topic":
          // Already handled above
          return b.overallRating - a.overallRating;
        case "activity":
          return b.totalOsisCount - a.totalOsisCount;
        case "name":
        default:
          return (a.nombre_apellido || "").localeCompare(b.nombre_apellido || "", "es", { sensitivity: "base" });
      }
    });

    return { filtered: list, matchedCount: matched };
  }, [facilitadores, searchTerm, selectedTopic, selectedCity, selectedLevel, onlyActive, sortMode]);

  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm animate-pulse">
            <div className="h-2 bg-gradient-to-r from-violet-200 to-indigo-200" />
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-13 h-13 rounded-full bg-gray-200" style={{ width: "52px", height: "52px" }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
              <div className="flex gap-1.5">
                <div className="h-5 bg-gray-200 rounded-full w-16" />
                <div className="h-5 bg-gray-200 rounded-full w-20" />
                <div className="h-5 bg-gray-200 rounded-full w-12" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-8 bg-gray-100 rounded" />
                <div className="h-8 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="h-10 bg-gray-50" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-red-900 mb-1">No se pudo cargar el pool de facilitadores</h3>
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  // Empty state
  if (filtered.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
        <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-gray-700 mb-1">No se encontraron facilitadores</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          {selectedTopic || selectedCity || searchTerm
            ? "Prueba ajustando o limpiando los filtros para ver más resultados."
            : "Aún no hay facilitadores registrados en el sistema."}
        </p>
      </div>
    );
  }

  // Cards view
  if (viewMode === "cards") {
    return (
      <>
        {selectedTopic && matchedCount === 0 && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Ningún facilitador está habilitado para dictar <strong>{selectedTopic}</strong>. Considera
              habilitar a un facilitador para este tema o revisar la matriz de competencias.
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((f) => (
            <FacilitadorCard
              key={f.id}
              facilitador={f}
              matchedTopic={selectedTopic}
              matchedCity={selectedCity}
              onAssignOsi={onAssignOsi}
              onViewProfile={onViewProfile}
              onEdit={onEdit}
            />
          ))}
        </div>
      </>
    );
  }

  // List view (compact)
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-12">Foto</th>
            <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Facilitador</th>
            <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-32">Rating</th>
            <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-40">Ubicación</th>
            <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Temas</th>
            <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-24">Acredit.</th>
            <th className="px-3 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-40">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filtered.map((f) => {
            const initials = (f.nombre_apellido || "F")
              .split(" ").filter(Boolean).slice(0, 2)
              .map((n) => n[0].toUpperCase()).join("");
            const cond = f.evaluacion?.condicion_final;
            const isAprobado = cond === "aprobado" || cond === "aceptable";
            const isSupervision = cond === "aprobado_supervision";
            const isNoAprobado = cond === "no_aprobado" || cond === "no_aceptable";
            const topicKey = selectedTopic ? selectedTopic.toLowerCase().trim() : null;
            const matchedRating = topicKey ? f.topicRatings[topicKey] : null;

            return (
              <tr
                key={f.id}
                className="hover:bg-violet-50/60 cursor-pointer transition-colors"
                onClick={() => onViewProfile(f)}
              >
                <td className="px-3 py-3">
                  <div className="relative">
                    {f.foto_perfil_url ? (
                      <img
                        src={f.foto_perfil_url}
                        alt={f.nombre_apellido}
                        className="w-9 h-9 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-[#0c3f69] to-blue-500">
                        {initials}
                      </div>
                    )}
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        f.is_active ? "bg-emerald-500" : "bg-red-400"
                      }`}
                    />
                  </div>
                </td>

                <td className="px-3 py-3">
                  <div className="text-sm font-semibold text-gray-900">{toTitleCase(f.nombre_apellido || "")}</div>
                  <div className="text-xs text-gray-500 truncate max-w-xs">{f.titulo_profesional || "Facilitador"}</div>
                  {selectedTopic && matchedRating && (
                    <div className="mt-0.5 text-[11px] inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-100 text-violet-800 rounded font-medium">
                      <Sparkles className="w-3 h-3" />
                      ★ {matchedRating.avgRating.toFixed(1)} en tema
                    </div>
                  )}
                </td>

                <td className="px-3 py-3">
                  {f.overallRating > 0 ? (
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-bold text-gray-800">{f.overallRating.toFixed(1)}</span>
                      <span className="text-[10px] text-gray-400">({f.reviewCount})</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Sin encuestas</span>
                  )}
                </td>

                <td className="px-3 py-3">
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{f.ciudad_nombre || f.estado_nombre || "Venezuela"}</span>
                  </div>
                  {f.alcance && (
                    <span className="text-[10px] text-gray-400">{f.alcance}</span>
                  )}
                </td>

                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1 max-w-md">
                    {(f.temas_cursos || []).slice(0, 3).map((t, i) => {
                      const isMatched = topicKey === t.toLowerCase().trim();
                      const niveles = f.niveles_habilidad || {};
                      const lvlKey = Object.keys(niveles).find(
                        (k) => k.toLowerCase().trim() === t.toLowerCase().trim(),
                      );
                      const lvl = lvlKey ? niveles[lvlKey] : undefined;
                      const dotClass =
                        lvl === "experto"
                          ? "bg-emerald-500"
                          : lvl === "intermedio"
                            ? "bg-amber-500"
                            : lvl === "basico"
                              ? "bg-slate-400"
                              : "bg-gray-300";
                      return (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                            isMatched
                              ? "bg-violet-100 text-violet-800 border border-violet-300"
                              : "bg-gray-50 text-gray-700 border border-gray-200"
                          }`}
                        >
                          {lvl && <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />}
                          {t.length > 28 ? t.slice(0, 28) + "…" : t}
                        </span>
                      );
                    })}
                    {(f.temas_cursos || []).length > 3 && (
                      <span className="text-[10px] text-gray-400 px-1">+{(f.temas_cursos || []).length - 3}</span>
                    )}
                    {(!f.temas_cursos || f.temas_cursos.length === 0) && (
                      <span className="text-xs text-gray-400 italic">Sin temas</span>
                    )}
                  </div>
                </td>

                <td className="px-3 py-3">
                  {isAprobado && <ShieldCheck className="w-4 h-4 text-emerald-600" />}
                  {isSupervision && <ShieldAlert className="w-4 h-4 text-amber-600" />}
                  {isNoAprobado && <XCircle className="w-4 h-4 text-red-600" />}
                  {!cond && <span className="text-xs text-gray-400 italic">—</span>}
                </td>

                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onAssignOsi(f)}
                      className="inline-flex items-center gap-1 px-2 py-1.5 bg-[#0c3f69] hover:bg-blue-900 text-white text-xs font-semibold rounded-md transition-colors"
                      title="Asignar a OSI"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Asignar</span>
                    </button>
                    <button
                      onClick={() => onEdit(f)}
                      className="p-1.5 text-gray-500 hover:text-gray-800 bg-white border border-gray-200 hover:bg-gray-100 rounded-md transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onShowHistory(f)}
                      className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors"
                      title="Historial de cursos"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={`/api/generate-ficha-tecnica-facilitador-pdf?id=${f.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors"
                      title="Ficha Técnica PDF"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => onToggleStatus(f)}
                      className={`p-1.5 rounded-md transition-colors ${
                        f.is_active
                          ? "text-red-600 hover:text-red-800 bg-red-50 border border-red-200 hover:bg-red-100"
                          : "text-emerald-600 hover:text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                      }`}
                      title={f.is_active ? "Inhabilitar" : "Habilitar"}
                    >
                      {f.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
