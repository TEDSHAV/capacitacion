"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  MapPin,
  BookOpen,
  LayoutGrid,
  List,
  X,
  ArrowDownWideNarrow,
  Sparkles,
  Star,
  Users,
  ShieldCheck,
} from "lucide-react";

export type ViewMode = "cards" | "list";
export type SortMode = "rating" | "topic" | "name" | "activity";

interface FacilitadorMatcherBarProps {
  allTopics: string[];
  allCities: string[];
  searchTerm: string;
  selectedTopic: string | null;
  selectedCity: string | null;
  onlyActive: boolean;
  sortMode: SortMode;
  viewMode: ViewMode;
  totalCount: number;
  visibleCount: number;
  matchedCount: number;
  onSearchChange: (value: string) => void;
  onTopicChange: (value: string | null) => void;
  onCityChange: (value: string | null) => void;
  onOnlyActiveChange: (value: boolean) => void;
  onSortChange: (mode: SortMode) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onClearFilters: () => void;
}

export function FacilitadorMatcherBar({
  allTopics,
  allCities,
  searchTerm,
  selectedTopic,
  selectedCity,
  onlyActive,
  sortMode,
  viewMode,
  totalCount,
  visibleCount,
  matchedCount,
  onSearchChange,
  onTopicChange,
  onCityChange,
  onOnlyActiveChange,
  onSortChange,
  onViewModeChange,
  onClearFilters,
}: FacilitadorMatcherBarProps) {
  const [topicQuery, setTopicQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [topicOpen, setTopicOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  const filteredTopics = useMemo(() => {
    const q = topicQuery.toLowerCase().trim();
    const list = q ? allTopics.filter((t) => t.toLowerCase().includes(q)) : allTopics;
    return list.slice(0, 60);
  }, [allTopics, topicQuery]);

  const filteredCities = useMemo(() => {
    const q = cityQuery.toLowerCase().trim();
    const list = q ? allCities.filter((c) => c.toLowerCase().includes(q)) : allCities;
    return list.slice(0, 60);
  }, [allCities, cityQuery]);

  const hasActiveFilters = !!searchTerm || !!selectedTopic || !!selectedCity || onlyActive;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Top row: Search + View toggle */}
      <div className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre, email, cédula o tema..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <ArrowDownWideNarrow className="w-4 h-4 text-gray-400" />
          <select
            value={sortMode}
            onChange={(e) => onSortChange(e.target.value as SortMode)}
            className="text-sm border border-gray-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          >
            <option value="rating">Mejor calificación</option>
            <option value="topic">Mejor en tema seleccionado</option>
            <option value="activity">Mayor actividad</option>
            <option value="name">Nombre (A-Z)</option>
          </select>
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-lg p-0.5 border border-gray-200 bg-white">
          <button
            onClick={() => onViewModeChange("cards")}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === "cards"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            title="Vista de tarjetas"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === "list"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            title="Vista de lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Second row: Smart topic matcher + city filter + active toggle */}
      <div className="px-4 pb-4 flex flex-col lg:flex-row gap-3">
        {/* Topic Matcher */}
        <div className="flex-1 min-w-0">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3 text-violet-500" />
            Matcher de Tema
          </label>
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Selecciona un curso/tema para encontrar al mejor facilitador..."
                  value={selectedTopic || topicQuery}
                  onChange={(e) => {
                    setTopicQuery(e.target.value);
                    onTopicChange(null);
                    setTopicOpen(true);
                  }}
                  onFocus={() => setTopicOpen(true)}
                  onBlur={() => setTimeout(() => setTopicOpen(false), 200)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
                {selectedTopic && (
                  <button
                    onClick={() => {
                      onTopicChange(null);
                      setTopicQuery("");
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                    title="Quitar filtro de tema"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {topicOpen && !selectedTopic && filteredTopics.length > 0 && (
              <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {filteredTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => {
                      onTopicChange(topic);
                      setTopicQuery("");
                      setTopicOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                      {topic}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* City Filter */}
        <div className="lg:w-64">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1">
            <MapPin className="w-3 h-3 text-violet-500" />
            Ciudad / Ubicación
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Filtrar por ciudad..."
              value={selectedCity || cityQuery}
              onChange={(e) => {
                setCityQuery(e.target.value);
                onCityChange(null);
                setCityOpen(true);
              }}
              onFocus={() => setCityOpen(true)}
              onBlur={() => setTimeout(() => setCityOpen(false), 200)}
              className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
            {selectedCity && (
              <button
                onClick={() => {
                  onCityChange(null);
                  setCityQuery("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                title="Quitar filtro de ciudad"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {cityOpen && !selectedCity && filteredCities.length > 0 && (
              <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {filteredCities.map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      onCityChange(city);
                      setCityQuery("");
                      setCityOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {city}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Only Active Toggle */}
        <div className="lg:w-auto flex items-end">
          <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors text-sm">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => onOnlyActiveChange(e.target.checked)}
              className="w-4 h-4 accent-violet-600"
            />
            <ShieldCheck className={`w-4 h-4 ${onlyActive ? "text-violet-600" : "text-gray-400"}`} />
            <span className="font-medium text-gray-700">Solo activos</span>
          </label>
        </div>
      </div>

      {/* Status / Stats Bar */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-gray-600">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span>
              Mostrando <strong className="text-gray-900">{visibleCount}</strong> de{" "}
              <strong className="text-gray-900">{totalCount}</strong> facilitadores
            </span>
          </span>

          {selectedTopic && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-violet-100 text-violet-800 rounded-full font-medium">
              <Sparkles className="w-3 h-3" />
              <span>Tema: {selectedTopic}</span>
              <span className="text-violet-500">•</span>
              <span>{matchedCount} expertos</span>
            </span>
          )}

          {selectedCity && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-medium">
              <MapPin className="w-3 h-3" />
              <span>{selectedCity}</span>
            </span>
          )}

          {onlyActive && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>Solo activos</span>
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>
    </div>
  );
}
