"use client";

import React from "react";
import {
  X,
  GraduationCap,
  Briefcase,
  Award,
  Eye,
  Mail,
  Phone,
  UserCheck,
  Download,
} from "lucide-react";
import type { InterdepartamentalFacilitador } from "@/app/actions/interdepartamental";

interface FacilitadorDetailModalProps {
  facilitador: InterdepartamentalFacilitador | null;
  onClose: () => void;
  onViewPdf?: (facilitador: InterdepartamentalFacilitador) => void;
}

export function FacilitadorDetailModal({
  facilitador,
  onClose,
  onViewPdf,
}: FacilitadorDetailModalProps) {
  if (!facilitador) return null;

  // Format competencies if it's an array or string
  const rawSkills = facilitador.competencias_habilidades;
  const skills: string[] = Array.isArray(rawSkills)
    ? rawSkills
    : typeof rawSkills === "string"
      ? rawSkills
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const initials = facilitador.nombre_apellido
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient bar */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            {facilitador.foto_perfil_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={facilitador.foto_perfil_url}
                alt={facilitador.nombre_apellido}
                className="w-16 h-16 rounded-full object-cover border-2 border-white/60 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold border-2 border-white/60 shadow-md">
                {initials}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {facilitador.nombre_apellido}
                </h3>
                {facilitador.is_active && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <UserCheck className="w-3 h-3" />
                    Activo
                  </span>
                )}
              </div>
              <p className="text-sm text-blue-200 font-medium">
                {facilitador.titulo_profesional || "Facilitador Especialista SHA"}
              </p>
              {facilitador.cedula && (
                <p className="text-xs text-slate-300 mt-0.5">
                  Cédula: <span className="font-mono">{facilitador.cedula}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-700 dark:text-slate-300 text-sm">
          {/* Quick contact if available */}
          {(facilitador.email || facilitador.telefono) && (
            <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
              {facilitador.email && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{facilitador.email}</span>
                </div>
              )}
              {facilitador.telefono && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{facilitador.telefono}</span>
                </div>
              )}
            </div>
          )}

          {/* Formación Académica */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <div className="p-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span>Formación Académica</span>
            </div>
            <div className="pl-7 text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {facilitador.formacion_academica ||
                "Información académica registrada en el expediente de facilitadores de SHA de Venezuela."}
            </div>
          </div>

          {/* Experiencia Laboral */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <div className="p-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <span>Experiencia y Trayectoria Laboral</span>
            </div>
            <div className="pl-7 text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {facilitador.experiencia_laboral ||
                "Amplia experiencia como instructor en programas de formación y seguridad industrial."}
            </div>
          </div>

          {/* Competencias y Habilidades */}
          {skills.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <div className="p-1 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                  <Award className="w-4 h-4" />
                </div>
                <span>Competencias y Temas Destacados</span>
              </div>
              <div className="pl-7 flex flex-wrap gap-1.5 pt-1">
                {skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2.5">
            {onViewPdf && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewPdf(facilitador);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors shadow-2xs"
                title="Visualizar Ficha Técnica en el visor integrado"
              >
                <Eye className="w-4 h-4" />
                <span>Ver Ficha Técnica</span>
              </button>
            )}

            <a
              href={`/api/generate-ficha-tecnica-facilitador-pdf?id=${facilitador.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs hover:shadow transition-all"
              title="Descargar Ficha Técnica Oficial Completa"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Ficha (PDF)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
