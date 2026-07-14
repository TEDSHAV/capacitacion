"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Company, CapacitacionClientProps } from "./types";
import { 
  BookOpen, 
  Users, 
  Award, 
  FileText, 
  UserCheck, 
  Signature, 
  Calculator, 
  ChartBar,
  GraduationCap,
  FileCheck,
  UserPlus,
  Search,
  TrendingUp,
  Calendar,
  Clock
} from "lucide-react";

export default function CapacitacionClientEnhanced({
  user,
  companies,
}: CapacitacionClientProps) {
  const router = useRouter();

  const submodules = [
    // Cursos Section
    {
      id: 'gestion-cursos',
      title: 'Gestión de Cursos',
      description: 'Crear y administrar contenidos de cursos',
      icon: BookOpen,
      color: 'from-emerald-400 to-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      stats: '12 cursos',
      section: 'cursos'
    },
    {
      id: 'plantillas-certificados',
      title: 'Plantillas de Certificados',
      description: 'Gestionar plantillas para generación de certificados',
      icon: FileCheck,
      color: 'from-teal-400 to-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      stats: '5 plantillas',
      section: 'cursos'
    },
    // Participantes Section
    {
      id: 'participantes',
      title: 'Gestión de Participantes',
      description: 'Gestión de participantes en capacitaciones',
      icon: Users,
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      stats: '245 participantes',
      section: 'participantes'
    },
    {
      id: 'consulta-participantes',
      title: 'Consulta de Participantes',
      description: 'Consultar y buscar participantes',
      icon: Search,
      color: 'from-sky-400 to-sky-600',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
      stats: 'Búsqueda avanzada',
      section: 'participantes'
    },
    {
      id: 'gestion-de-facilitadores',
      title: 'Gestión de Facilitadores',
      description: 'Administración de facilitadores e instructores',
      icon: UserCheck,
      color: 'from-indigo-400 to-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      stats: '8 facilitadores',
      section: 'participantes'
    },
    // Certificados Section
    {
      id: 'generacion-certificado',
      title: 'Generación de Certificados',
      description: 'Crear y generar certificados de capacitación',
      icon: Award,
      color: 'from-amber-400 to-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      stats: '89 emitidos',
      section: 'certificados'
    },
    {
      id: 'gestion-certificados',
      title: 'Gestión de Certificados',
      description: 'Administrar certificados emitidos',
      icon: FileText,
      color: 'from-yellow-400 to-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      stats: '156 activos',
      section: 'certificados'
    },
    {
      id: 'gestion-de-firmas',
      title: 'Gestión de Firmas',
      description: 'Administrar firmas digitales para certificados',
      icon: Signature,
      color: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      stats: '4 firmantes',
      section: 'certificados'
    },
    {
      id: 'control-secuencia',
      title: 'Control de Secuencia',
      description: 'Control de numeración de certificados',
      icon: Calculator,
      color: 'from-rose-400 to-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      stats: 'Secuencia OK',
      section: 'certificados'
    },
    {
      id: 'reportes',
      title: 'Reportes',
      description: 'Estadísticas y reportes de certificados',
      icon: ChartBar,
      color: 'from-violet-400 to-violet-600',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-200',
      stats: '15 reportes',
      section: 'certificados'
    }
  ];

  // Group submodules by section
  const groupedSubmodules = submodules.reduce((acc, submodule) => {
    if (!acc[submodule.section]) {
      acc[submodule.section] = [];
    }
    acc[submodule.section].push(submodule);
    return acc;
  }, {} as Record<string, typeof submodules>);

  const sectionTitles = {
    cursos: '📚 Gestión de Cursos',
    participantes: '👥 Participantes y Facilitadores',
    certificados: '📜 Certificados y Control'
  };

  const sectionDescriptions = {
    cursos: 'Administra el contenido y estructura de los programas de capacitación',
    participantes: 'Gestiona el personal involucrado en el proceso de capacitación',
    certificados: 'Controla la emisión y seguimiento de certificados'
  };

  const handleSubmoduleClick = (submoduleId: string) => {
    router.push(`/dashboard/capacitacion/${submoduleId}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No autenticado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Enhanced Header */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Módulo de Capacitación
              </h1>
              <p className="mt-2 text-gray-600 text-lg">
                Gestión integral del programa de capacitación corporativa
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Bienvenido</p>
                <p className="font-semibold text-gray-900">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Cursos Activos</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-lg">
                <BookOpen className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Participantes</p>
                <p className="text-2xl font-bold text-gray-900">245</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Certificados Emitidos</p>
                <p className="text-2xl font-bold text-gray-900">89</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-lg">
                <Award className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tasa de Completación</p>
                <p className="text-2xl font-bold text-gray-900">87%</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {Object.entries(groupedSubmodules).map(([section, modules]) => (
            <div key={section} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              {/* Section Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {sectionTitles[section as keyof typeof sectionTitles]}
                </h2>
                <p className="text-gray-600">
                  {sectionDescriptions[section as keyof typeof sectionDescriptions]}
                </p>
              </div>

              {/* Module Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((submodule) => {
                  const Icon = submodule.icon;
                  return (
                    <div
                      key={submodule.id}
                      onClick={() => handleSubmoduleClick(submodule.id)}
                      className="group cursor-pointer"
                    >
                      <div className={`relative overflow-hidden rounded-xl border-2 ${submodule.borderColor} ${submodule.bgColor} transition-all duration-300 hover:shadow-lg hover:scale-105`}>
                        {/* Gradient Overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${submodule.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                        
                        {/* Content */}
                        <div className="relative p-6">
                          {/* Icon Circle */}
                          <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${submodule.color} text-white mb-4`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          
                          {/* Title and Description */}
                          <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-700 group-hover:bg-clip-text transition-all duration-300">
                            {submodule.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {submodule.description}
                          </p>
                          
                          {/* Stats Badge */}
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${submodule.bgColor} ${submodule.borderColor} border`}>
                              {submodule.stats}
                            </span>
                            <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                              <svg className={`w-4 h-4 text-gray-400 group-hover:text-gray-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
