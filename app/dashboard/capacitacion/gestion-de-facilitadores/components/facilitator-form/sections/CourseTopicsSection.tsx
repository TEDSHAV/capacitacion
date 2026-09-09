"use client";

import React, { useState } from "react";
import { CourseTopicsSectionProps } from "@/types";
import { SectionCard } from "./SectionCard";
import { BookOpen } from "lucide-react";

type SkillLevel = "experto" | "intermedio" | "basico";

const LEVEL_OPTIONS: { value: SkillLevel; label: string; dot: string }[] = [
  { value: "experto", label: "Experto", dot: "bg-emerald-500" },
  { value: "intermedio", label: "Intermedio", dot: "bg-amber-500" },
  { value: "basico", label: "Básico", dot: "bg-slate-400" },
];

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

const levelLabel = (level: string | undefined): string => {
  switch (level) {
    case "experto":
      return "Experto";
    case "intermedio":
      return "Intermedio";
    case "basico":
      return "Básico";
    default:
      return "Intermedio";
  }
};

export const CourseTopicsSection = ({ formData, handleInputChange, courseTopics, loadingCourseTopics }: CourseTopicsSectionProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTopics = courseTopics.filter(topic =>
    topic.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const niveles = formData.niveles_habilidad || {};

  const handleTopicToggle = (topicName: string) => {
    if (formData.temas_cursos.includes(topicName)) {
      // Uncheck: remove from temas_cursos and niveles_habilidad
      handleInputChange("temas_cursos", formData.temas_cursos.filter((t: string) => t !== topicName));
      const nextNiveles = { ...niveles };
      delete nextNiveles[topicName];
      handleInputChange("niveles_habilidad", nextNiveles);
    } else {
      // Check: add to temas_cursos and default nivel to intermedio
      handleInputChange("temas_cursos", [...formData.temas_cursos, topicName]);
      handleInputChange("niveles_habilidad", {
        ...niveles,
        [topicName]: niveles[topicName] || "intermedio",
      });
    }
  };

  const handleLevelChange = (topicName: string, level: SkillLevel) => {
    handleInputChange("niveles_habilidad", {
      ...niveles,
      [topicName]: level,
    });
  };

  return (
    <SectionCard title="Temas de Curso" icon={<BookOpen className="w-4 h-4" />}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Selecciona los temas que puede dictar el facilitador y su nivel de habilidad
        </label>

        <div className="mb-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar curso por nombre..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {loadingCourseTopics ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto border border-gray-200 rounded-md p-2">
            {filteredTopics.length === 0 ? (
              <p className="text-sm text-gray-500 p-2">
                {searchTerm ? "No se encontraron cursos que coincidan con la búsqueda" : "No hay temas de cursos disponibles"}
              </p>
            ) : (
              filteredTopics.map((topic) => {
                const isChecked = formData.temas_cursos.includes(topic.nombre);
                const nivel = niveles[topic.nombre];
                return (
                  <div
                    key={topic.id}
                    className={`flex items-center gap-2 p-1.5 rounded transition-colors ${
                      isChecked ? "bg-violet-50/60" : "hover:bg-gray-50"
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTopicToggle(topic.nombre)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded shrink-0"
                      />
                      <span className="text-sm text-gray-700 truncate">{topic.nombre}</span>
                    </label>

                    {isChecked && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`w-2 h-2 rounded-full ${levelDotClass(nivel)}`} />
                        <select
                          value={nivel || "intermedio"}
                          onChange={(e) => handleLevelChange(topic.nombre, e.target.value as SkillLevel)}
                          className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                        >
                          {LEVEL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Legend */}
        <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Experto
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Intermedio
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" /> Básico
          </span>
        </div>

        <p className="text-xs text-gray-500 mt-1.5">
          Selecciona los temas y define el nivel de habilidad del facilitador en cada uno. Por defecto, los temas nuevos se marcan como Intermedio.
        </p>
      </div>
    </SectionCard>
  );
};
