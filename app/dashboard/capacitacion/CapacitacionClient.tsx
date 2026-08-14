"use client";

import Link from "next/link";
import { CapacitacionClientProps } from "@/types";
import {
  BookOpen,
  Award,
  UserCheck,
  Signature,
  FileCheck,
  ChevronRight,
  LayoutGrid,
  AlignLeft,
  BarChart3,
  FileStack,
  CalendarDays,
  Briefcase,
  Sparkles,
  ClipboardList,
  Gauge,
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
  subCards?: SubCard[];
}

interface SubCard {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

interface SubModule {
  id: string;
  title: string;
  icon: LucideIcon;
}

interface Category {
  id: string;
  title: string;
  gradient: string;
  icon: LucideIcon;
  modules: SubModule[];
  /** Tailwind color name used for link hover accents */
  accent: string;
}

/** Maps accent names to the full set of Tailwind classes needed for links.
 *  Defined statically so Tailwind's JIT can detect them. */
const ACCENT_CLASSES: Record<string, {
  border: string;
  bg: string;
  icon: string;
  chevron: string;
}> = {
  emerald: {
    border: "hover:border-emerald-300",
    bg: "hover:bg-emerald-50/40",
    icon: "text-emerald-500",
    chevron: "group-hover/mod:text-emerald-500",
  },
  amber: {
    border: "hover:border-amber-300",
    bg: "hover:bg-amber-50/40",
    icon: "text-amber-500",
    chevron: "group-hover/mod:text-amber-500",
  },
  cyan: {
    border: "hover:border-cyan-300",
    bg: "hover:bg-cyan-50/40",
    icon: "text-cyan-500",
    chevron: "group-hover/mod:text-cyan-500",
  },
  violet: {
    border: "hover:border-violet-300",
    bg: "hover:bg-violet-50/40",
    icon: "text-violet-500",
    chevron: "group-hover/mod:text-violet-500",
  },
  slate: {
    border: "hover:border-slate-300",
    bg: "hover:bg-slate-50/40",
    icon: "text-slate-500",
    chevron: "group-hover/mod:text-slate-500",
  },
};

export default function CapacitacionClient({
  user: _user,
  stats: _stats,
}: CapacitacionClientProps) {
  void _user;
  void _stats;

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
      subCards: [
        {
          id: "kpi",
          title: "KPI",
          description: "KPIs y reportes de capacitación",
          icon: BarChart3,
          href: "/dashboard/capacitacion/reportes",
        },
        {
          id: "indicadores",
          title: "Indicadores",
          description: "Cumplimiento de certificados en 72h",
          icon: Gauge,
          href: "/dashboard/capacitacion/indicadores",
        },
      ],
    },
  ];

  const categories: Category[] = [
    {
      id: "cursos",
      title: "Cursos",
      gradient: "from-emerald-500 to-teal-600",
      icon: BookOpen,
      accent: "emerald",
      modules: [
        { id: "gestion-cursos", title: "Gestión de Cursos", icon: BookOpen },
        { id: "gestion-plantillas-cursos", title: "Plantillas", icon: AlignLeft },
      ],
    },
    {
      id: "certificados",
      title: "Certificados",
      gradient: "from-amber-500 to-orange-600",
      icon: Award,
      accent: "amber",
      modules: [
        { id: "generacion-certificado", title: "Generación", icon: Award },
        { id: "gestion-certificados", title: "Gestión", icon: FileStack },
        ...(process.env.NODE_ENV === "development"
          ? [{ id: "generacion-personalizada", title: "Gen. Personalizada", icon: Sparkles }]
          : []),
      ],
    },
    {
      id: "plantillas",
      title: "Plantillas",
      gradient: "from-cyan-500 to-teal-600",
      icon: LayoutGrid,
      accent: "cyan",
      modules: [
        { id: "plantillas-certificados", title: "Certificados", icon: FileCheck },
        { id: "plantillas-carnets", title: "Carnets", icon: LayoutGrid },
      ],
    },
    {
      id: "facilitadores",
      title: "Facilitadores",
      gradient: "from-violet-500 to-purple-600",
      icon: UserCheck,
      accent: "violet",
      modules: [
        { id: "gestion-de-facilitadores", title: "Gestión", icon: UserCheck },
        { id: "gestion-de-firmas", title: "Firmas", icon: Signature },
      ],
    },
    {
      id: "gestion",
      title: "Gestión",
      gradient: "from-slate-500 to-gray-600",
      icon: Briefcase,
      accent: "slate",
      modules: [
        { id: "gestion-osi", title: "Gestión de OSI", icon: Briefcase },
      ],
    },
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

        {/* Main process cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {mainCards.map((card) => {
            const Icon = card.icon;

            if (card.subCards && card.subCards.length > 0) {
              return (
                <div
                  key={card.id}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full group"
                >
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.gradient} mb-4 flex items-center justify-center group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="text-white w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {card.description}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                    {card.subCards.map((sub) => {
                      const SubIcon = sub.icon;
                      return (
                        <Link
                          key={sub.id}
                          href={sub.href}
                          className="flex flex-col gap-2 p-3 rounded-xl border border-gray-200 hover:border-rose-300 hover:bg-rose-50/40 transition-all group/sub"
                        >
                          <div className="flex items-center gap-2">
                            <SubIcon className="w-4 h-4 text-rose-500 flex-shrink-0" />
                            <span className="text-sm font-semibold text-gray-900">
                              {sub.title}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-400 group-hover/sub:translate-x-0.5 group-hover/sub:text-rose-500 transition-transform" />
                          </div>
                          <p className="text-xs text-gray-500 leading-snug">
                            {sub.description}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

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

        {/* Category bar — compact horizontal bar with 2-column link cards */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.id} className="flex-1 p-4 min-w-0 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cat.gradient} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="text-white w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 whitespace-nowrap">
                      {cat.title}
                    </h3>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    {cat.modules.map((mod) => {
                      const ModIcon = mod.icon;
                      const ac = ACCENT_CLASSES[cat.accent];
                      return (
                        <Link
                          key={mod.id}
                          href={`/dashboard/capacitacion/${mod.id}`}
                          className={`flex flex-col gap-1.5 p-2.5 rounded-xl border border-gray-200 ${ac.border} ${ac.bg} transition-all group/mod`}
                        >
                          <div className="flex items-center gap-1.5">
                            <ModIcon className={`w-3.5 h-3.5 ${ac.icon} flex-shrink-0`} />
                            <span className="text-xs font-semibold text-gray-900 truncate">
                              {mod.title}
                            </span>
                            <ChevronRight className={`w-3 h-3 ml-auto text-gray-400 group-hover/mod:translate-x-0.5 ${ac.chevron} transition-transform flex-shrink-0`} />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
