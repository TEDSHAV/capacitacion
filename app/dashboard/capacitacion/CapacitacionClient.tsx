"use client";

import { useState } from "react";
import Link from "next/link";
import { CapacitacionClientProps } from "@/types";
import {
  BookOpen,
  Award,
  UserCheck,
  Signature,
  Calculator,
  FileCheck,
  Search,
  ChevronRight,
  LayoutGrid,
  AlignLeft,
  BarChart3,
  FileStack,
  CalendarDays,
  Briefcase,
  Sparkles,
  ClipboardList,
  ChevronDown,
} from "lucide-react";

type LucideIcon = typeof BookOpen;

interface MainCard {
  id: string;
  title: string;
  description: string;
  gradient: string;
  icon: LucideIcon;
  href: string;
  external?: boolean;
}

interface OtherModule {
  id: string;
  title: string;
  icon: LucideIcon;
  href?: string;
}

export default function CapacitacionClient({
  user: _user,
  stats: _stats,
}: CapacitacionClientProps) {
  void _user;
  void _stats;

  const [otrosExpanded, setOtrosExpanded] = useState(true);

  const mainCards: MainCard[] = [
    {
      id: "seguimiento",
      title: "Planificación y Ejecución de Servicios",
      description: "Seguimiento completo del proceso de servicios de capacitación",
      gradient: "from-blue-600 to-emerald-500",
      icon: CalendarDays,
      href: "/dashboard/capacitacion/seguimiento-servicios",
    },
    {
      id: "diseno",
      title: "Diseño y Desarrollo de Servicios",
      description: "Solicitudes de diseño de nuevos servicios",
      gradient: "from-indigo-500 to-blue-600",
      icon: ClipboardList,
      href: `${process.env.NEXT_PUBLIC_SHELL_URL || ""}/nuevo-servicio`,
      external: true,
    },
    {
      id: "reportes",
      title: "Reportes",
      description: "Estadísticas y reportes de capacitación",
      gradient: "from-rose-500 to-pink-600",
      icon: BarChart3,
      href: "/dashboard/capacitacion/reportes",
    },
  ];

  const otherModules: OtherModule[] = [
    { id: "gestion-osi", title: "Gestión de OSI", icon: Briefcase },
    { id: "gestion-cursos", title: "Gestión de Cursos", icon: BookOpen },
    { id: "gestion-plantillas-cursos", title: "Plantillas de Cursos", icon: AlignLeft },
    { id: "consulta-participantes", title: "Consulta de Participantes", icon: Search },
    { id: "generacion-certificado", title: "Generación de Certificados", icon: Award },
    { id: "gestion-certificados", title: "Gestión de Certificados", icon: FileStack },
    { id: "plantillas-certificados", title: "Plantillas de Certificados", icon: FileCheck },
    { id: "plantillas-carnets", title: "Plantillas de Carnets", icon: LayoutGrid },
    { id: "configuracion/secuencias-control", title: "Control de Secuencia", icon: Calculator },
    { id: "gestion-de-facilitadores", title: "Gestión de Facilitadores", icon: UserCheck },
    { id: "gestion-de-firmas", title: "Gestión de Firmas", icon: Signature },
    ...(process.env.NODE_ENV === "development"
      ? [{ id: "generacion-personalizada", title: "Generación Personalizada (Dev)", icon: Sparkles }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Capacitación
          </h1>
          <p className="text-gray-500 mt-1">
            Gestión centralizada de procesos académicos
          </p>
        </div>

        {/* Main process cards — 4 primary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {mainCards.map((card) => {
            const Icon = card.icon;
            const content = (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full group cursor-pointer">
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.gradient} mb-4 flex items-center justify-center group-hover:scale-105 transition-transform`}
                >
                  <Icon className="text-white w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-500 flex-1">
                  {card.description}
                </p>
                <div className="flex items-center gap-1 mt-4 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  Acceder
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );

            if (card.external) {
              return (
                <a
                  key={card.id}
                  href={card.href}
                  target="_parent"
                  className="block h-full"
                >
                  {content}
                </a>
              );
            }

            return (
              <Link
                key={card.id}
                href={card.href}
                className="block h-full"
              >
                {content}
              </Link>
            );
          })}
        </div>

        {/* Otros card — expandable with sub-links */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setOtrosExpanded(!otrosExpanded)}
            className="w-full p-6 flex items-center gap-4 hover:bg-gray-50/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center flex-shrink-0">
              <LayoutGrid className="text-white w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-xl font-bold text-gray-900">
                Otros
              </h3>
              <p className="text-sm text-gray-500">
                Gestión de OSI, cursos, participantes, certificados, facilitadores y más
              </p>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform ${
                otrosExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          {otrosExpanded && (
            <div className="px-6 pb-6 pt-2 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {otherModules.map((mod) => {
                  const ModIcon = mod.icon;
                  const linkClass =
                    "flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors border border-gray-100";
                  if (mod.href) {
                    return (
                      <a
                        key={mod.id}
                        href={mod.href}
                        target="_parent"
                        className={linkClass}
                      >
                        <ModIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 truncate">{mod.title}</span>
                        <ChevronRight className="w-3 h-3 opacity-50 flex-shrink-0" />
                      </a>
                    );
                  }
                  return (
                    <Link
                      key={mod.id}
                      href={`/dashboard/capacitacion/${mod.id}`}
                      className={linkClass}
                    >
                      <ModIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{mod.title}</span>
                      <ChevronRight className="w-3 h-3 opacity-50 flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
