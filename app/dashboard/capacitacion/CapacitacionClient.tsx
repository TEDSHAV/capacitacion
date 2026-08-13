"use client";

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
  Users,
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
}

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
      modules: [
        { id: "gestion-cursos", title: "Gestión de Cursos", icon: BookOpen },
        { id: "gestion-plantillas-cursos", title: "Plantillas", icon: AlignLeft },
      ],
    },
    {
      id: "participantes",
      title: "Participantes",
      gradient: "from-blue-500 to-indigo-600",
      icon: Users,
      modules: [
        { id: "consulta-participantes", title: "Consulta", icon: Search },
      ],
    },
    {
      id: "certificados",
      title: "Certificados",
      gradient: "from-amber-500 to-orange-600",
      icon: Award,
      modules: [
        { id: "generacion-certificado", title: "Generación", icon: Award },
        { id: "gestion-certificados", title: "Gestión", icon: FileStack },
        { id: "configuracion/secuencias-control", title: "Control Secuencia", icon: Calculator },
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

            // Card with subcards: container is not a link, each subcard is.
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

        {/* Category cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cat.gradient} flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className="text-white w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">
                    {cat.title}
                  </h3>
                </div>
                <div className="space-y-1">
                  {cat.modules.map((mod) => {
                    const ModIcon = mod.icon;
                    return (
                      <Link
                        key={mod.id}
                        href={`/dashboard/capacitacion/${mod.id}`}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 text-[13px] text-gray-600 hover:text-gray-900 font-medium transition-colors"
                      >
                        <ModIcon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">{mod.title}</span>
                        <ChevronRight className="w-3 h-3 opacity-40 flex-shrink-0" />
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
  );
}
