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
  FileCheck,
  Search,
  TrendingUp,
  ArrowRight,
  Grid3x3,
  List
} from "lucide-react";

export default function CapacitacionClientModern({
  user,
  companies,
}: CapacitacionClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const submodules = [
    // Cursos Section
    {
      id: 'gestion-cursos',
      title: 'Gestión de Cursos',
      description: 'Crear y administrar contenidos de cursos',
      icon: BookOpen,
      color: 'emerald',
      section: 'cursos',
      priority: 'high',
      quickAction: 'Nuevo curso'
    },
    {
      id: 'plantillas-certificados',
      title: 'Plantillas de Certificados',
      description: 'Gestionar plantillas para generación de certificados',
      icon: FileCheck,
      color: 'teal',
      section: 'cursos',
      priority: 'medium',
      quickAction: 'Crear plantilla'
    },
    // Participantes Section
    {
      id: 'participantes',
      title: 'Gestión de Participantes',
      description: 'Gestión de participantes en capacitaciones',
      icon: Users,
      color: 'blue',
      section: 'participantes',
      priority: 'high',
      quickAction: 'Agregar participante'
    },
    {
      id: 'consulta-participantes',
      title: 'Consulta de Participantes',
      description: 'Consultar y buscar participantes',
      icon: Search,
      color: 'sky',
      section: 'participantes',
      priority: 'medium',
      quickAction: 'Buscar'
    },
    {
      id: 'gestion-de-facilitadores',
      title: 'Gestión de Facilitadores',
      description: 'Administración de facilitadores e instructores',
      icon: UserCheck,
      color: 'indigo',
      section: 'participantes',
      priority: 'medium',
      quickAction: 'Nuevo facilitador'
    },
    // Certificados Section
    {
      id: 'generacion-certificado',
      title: 'Generación de Certificados',
      description: 'Crear y generar certificados de capacitación',
      icon: Award,
      color: 'amber',
      section: 'certificados',
      priority: 'high',
      quickAction: 'Generar'
    },
    {
      id: 'gestion-certificados',
      title: 'Gestión de Certificados',
      description: 'Administrar certificados emitidos',
      icon: FileText,
      color: 'yellow',
      section: 'certificados',
      priority: 'medium',
      quickAction: 'Ver todos'
    },
    {
      id: 'gestion-de-firmas',
      title: 'Gestión de Firmas',
      description: 'Administrar firmas digitales para certificados',
      icon: Signature,
      color: 'purple',
      section: 'certificados',
      priority: 'low',
      quickAction: 'Añadir firma'
    },
    {
      id: 'control-secuencia',
      title: 'Control de Secuencia',
      description: 'Control de numeración de certificados',
      icon: Calculator,
      color: 'rose',
      section: 'certificados',
      priority: 'low',
      quickAction: 'Ver secuencia'
    },
    {
      id: 'reportes',
      title: 'Reportes',
      description: 'Estadísticas y reportes de certificados',
      icon: ChartBar,
      color: 'violet',
      section: 'certificados',
      priority: 'medium',
      quickAction: 'Generar reporte'
    }
  ];

  const handleSubmoduleClick = (submoduleId: string) => {
    router.push(`/dashboard/capacitacion/${submoduleId}`);
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; hover: string; text: string; light: string }> = {
      emerald: { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50' },
      teal: { bg: 'bg-teal-500', hover: 'hover:bg-teal-600', text: 'text-teal-600', light: 'bg-teal-50' },
      blue: { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50' },
      sky: { bg: 'bg-sky-500', hover: 'hover:bg-sky-600', text: 'text-sky-600', light: 'bg-sky-50' },
      indigo: { bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600', text: 'text-indigo-600', light: 'bg-indigo-50' },
      amber: { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', text: 'text-amber-600', light: 'bg-amber-50' },
      yellow: { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', text: 'text-yellow-600', light: 'bg-yellow-50' },
      purple: { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50' },
      rose: { bg: 'bg-rose-500', hover: 'hover:bg-rose-600', text: 'text-rose-600', light: 'bg-rose-50' },
      violet: { bg: 'bg-violet-500', hover: 'hover:bg-violet-600', text: 'text-violet-600', light: 'bg-violet-50' }
    };
    return colors[color] || colors.emerald;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No autenticado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Módulo de Capacitación</h1>
              <p className="mt-1 text-gray-500">Gestión centralizada de capacitaciones corporativas</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Priority Section - High Priority Modules */}
        <div className="mb-12">
          <div className="flex items-center mb-6">
            <div className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium mr-3">
              Prioridad Alta
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Accesos Rápidos</h2>
          </div>
          
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {submodules.filter(m => m.priority === 'high').map((submodule) => {
                const Icon = submodule.icon;
                const colors = getColorClasses(submodule.color);
                return (
                  <div
                    key={submodule.id}
                    onClick={() => handleSubmoduleClick(submodule.id)}
                    className="group cursor-pointer"
                  >
                    <div className="bg-white rounded-xl border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg hover:border-gray-300">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`${colors.bg} ${colors.hover} text-white p-3 rounded-lg transition-colors`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{submodule.title}</h3>
                      <p className="text-sm text-gray-600 mb-4">{submodule.description}</p>
                      <button className={`text-sm ${colors.text} font-medium hover:underline`}>
                        {submodule.quickAction} →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {submodules.filter(m => m.priority === 'high').map((submodule, index) => {
                const Icon = submodule.icon;
                const colors = getColorClasses(submodule.color);
                return (
                  <div
                    key={submodule.id}
                    onClick={() => handleSubmoduleClick(submodule.id)}
                    className={`flex items-center justify-between p-4 cursor-pointer transition-colors hover:bg-gray-50 ${index !== 0 ? 'border-t border-gray-200' : ''}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`${colors.bg} ${colors.hover} text-white p-2 rounded-lg transition-colors`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{submodule.title}</h3>
                        <p className="text-sm text-gray-600">{submodule.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button className={`text-sm ${colors.text} font-medium hover:underline`}>
                        {submodule.quickAction}
                      </button>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* All Modules by Section */}
        {['cursos', 'participantes', 'certificados'].map((section) => (
          <div key={section} className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 capitalize">
              {section === 'cursos' ? '📚 Cursos y Contenido' : 
               section === 'participantes' ? '👥 Participantes' : 
               '📜 Certificados y Control'}
            </h2>
            
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {submodules.filter(m => m.section === section).map((submodule) => {
                  const Icon = submodule.icon;
                  const colors = getColorClasses(submodule.color);
                  return (
                    <div
                      key={submodule.id}
                      onClick={() => handleSubmoduleClick(submodule.id)}
                      className="group cursor-pointer"
                    >
                      <div className={`${colors.light} rounded-xl border border-gray-200 p-4 transition-all duration-200 hover:shadow-md hover:border-gray-300`}>
                        <div className={`${colors.bg} ${colors.hover} text-white p-2 rounded-lg mb-3 transition-colors`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{submodule.title}</h3>
                        <p className="text-xs text-gray-600 line-clamp-2">{submodule.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {submodules.filter(m => m.section === section).map((submodule, index) => {
                  const Icon = submodule.icon;
                  const colors = getColorClasses(submodule.color);
                  return (
                    <div
                      key={submodule.id}
                      onClick={() => handleSubmoduleClick(submodule.id)}
                      className={`flex items-center justify-between p-4 cursor-pointer transition-colors hover:bg-gray-50 ${index !== 0 ? 'border-t border-gray-200' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`${colors.bg} ${colors.hover} text-white p-1.5 rounded transition-colors`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{submodule.title}</h3>
                          <p className="text-xs text-gray-600">{submodule.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
