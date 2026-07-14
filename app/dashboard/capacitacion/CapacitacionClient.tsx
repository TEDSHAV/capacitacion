"use client";

import Link from "next/link";
import { CapacitacionClientProps } from "@/types";
import {
  BookOpen,
  Users,
  Award,
  FileText,
  UserCheck,
  Signature,
  Calculator,
  ChartBar,
  FileCheck,
  Search,
  ChevronRight,
  LayoutGrid,
  AlignLeft,
  BarChart3,
  FileStack,
  TrendingUp,
  CalendarDays,
  Briefcase,
  Wrench,
  FileSpreadsheet,
} from "lucide-react";

export default function CapacitacionClient({
  user,
  stats,
}: CapacitacionClientProps) {
  const categories = [
    {
      id: "planificacion",
      title: "Planificación de Servicios",
      gradient: "from-blue-600 to-cyan-500",
      icon: CalendarDays,
      modules: [
        {
          id: "planificacion-servicios",
          title: "Planificación de Servicios",
          icon: CalendarDays,
        },
      ],
    },
    {
      id: "osi",
      title: "OSI",
      gradient: "from-amber-600 to-yellow-500",
      icon: Briefcase,
      modules: [
        {
          id: "gestion-osi",
          title: "Gestión de OSI",
          icon: Briefcase,
        },
      ],
    },
    {
      id: "cursos",
      title: "Cursos",
      gradient: "from-emerald-500 to-teal-600",
      icon: BookOpen,
      modules: [
        { id: "gestion-cursos", title: "Gestión de Cursos", icon: BookOpen },
        {
          id: "gestion-plantillas-cursos",
          title: "Plantillas de Cursos",
          icon: AlignLeft,
        },
      ],
    },
    {
      id: "participantes",
      title: "Participantes",
      gradient: "from-blue-500 to-indigo-600",
      icon: Users,
      modules: [
        {
          id: "consulta-participantes",
          title: "Consulta de Participantes",
          icon: Search,
        },
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
        { id: "plantillas-certificados", title: "Plantillas", icon: FileCheck },
        { id: "plantillas-carnets", title: "Carnets", icon: LayoutGrid },
        {
          id: "control-secuencia",
          title: "Control Secuencia",
          icon: Calculator,
        },
      ],
    },
    {
      id: "facilitadores",
      title: "Facilitadores",
      gradient: "from-violet-500 to-purple-600",
      icon: UserCheck,
      modules: [
        {
          id: "gestion-de-facilitadores",
          title: "Gestión de Facilitadores",
          icon: UserCheck,
        },
        {
          id: "gestion-de-firmas",
          title: "Gestión de Firmas",
          icon: Signature,
        },
      ],
    },
    {
      id: "reportes",
      title: "Reportes",
      gradient: "from-rose-500 to-pink-600",
      icon: BarChart3,
      modules: [
        { id: "reportes", title: "Estadísticas y Reportes", icon: BarChart3 },
      ],
    },
    {
      id: "herramientas",
      title: "Herramientas",
      gradient: "from-slate-600 to-gray-500",
      icon: Wrench,
      modules: [
        {
          id: "herramientas/img-to-xls",
          title: "Img to xls",
          icon: FileSpreadsheet,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              Capacitación
            </h1>
            <p className="text-gray-500 mt-1">
              Gestión centralizada de procesos académicos
            </p>
          </div>
          <div className="flex gap-4">
            {[
              { label: "Cursos Activos", val: stats?.cursosActivos },
              { label: "Participantes", val: stats?.participantes },
              { label: "Certificados", val: stats?.certificados },
              { label: "Facilitadores", val: stats?.facilitadores },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-white px-5 py-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center"
              >
                <span className="text-xl font-bold">{s.val ?? 0}</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="p-4 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">
                Actividad Reciente
              </h4>
              <p className="text-sm text-gray-500">
                Certificados emitidos este mes: {stats?.certificadosMes || 0}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="p-4 rounded-xl bg-emerald-50 text-emerald-600">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">
                Cursos en Progreso
              </h4>
              <p className="text-sm text-gray-500">
                Total de cursos disponibles: {stats?.cursosActivos || 0}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="p-4 rounded-xl bg-purple-50 text-purple-600">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">
                Facilitadores activos
              </h4>
              <p className="text-sm text-gray-500">
                Facilitadores activos: {stats?.facilitadores || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.gradient} mb-4 flex items-center justify-center`}
                >
                  <Icon className="text-white w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  {cat.title}
                </h3>
                <div className="space-y-3">
                  {cat.modules.map((mod) => {
                    const ModIcon = mod.icon;
                    return (
                      <Link
                        key={mod.id}
                        href={`/dashboard/capacitacion/${mod.id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
                      >
                        <ModIcon className="w-4 h-4" />
                        {mod.title}
                        <ChevronRight className="w-3 h-3 ml-auto opacity-50" />
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
