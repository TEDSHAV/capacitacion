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
  ChevronRight,
  LayoutGrid,
  AlignLeft
} from "lucide-react";

export default function CapacitacionClientMinimal({
  user,
  companies,
}: CapacitacionClientProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>('all');

  const submodules = [
    {
      id: 'gestion-cursos',
      title: 'Gestión de Cursos',
      description: 'Crear y administrar contenidos',
      icon: BookOpen,
      category: 'cursos',
      badge: '12 activos'
    },
    {
      id: 'plantillas-certificados',
      title: 'Plantillas de Certificados',
      description: 'Gestionar plantillas',
      icon: FileCheck,
      category: 'cursos',
      badge: '5 plantillas'
    },
    {
      id: 'participantes',
      title: 'Gestión de Participantes',
      description: 'Gestión de participantes',
      icon: Users,
      category: 'participantes',
      badge: '245 total'
    },
    {
      id: 'consulta-participantes',
      title: 'Consulta de Participantes',
      description: 'Consultar y buscar',
      icon: Search,
      category: 'participantes',
      badge: 'Búsqueda'
    },
    {
      id: 'gestion-de-facilitadores',
      title: 'Gestión de Facilitadores',
      description: 'Administración de instructores',
      icon: UserCheck,
      category: 'participantes',
      badge: '8 activos'
    },
    {
      id: 'generacion-certificado',
      title: 'Generación de Certificados',
      description: 'Crear y generar certificados',
      icon: Award,
      category: 'certificados',
      badge: '89 emitidos'
    },
    {
      id: 'gestion-certificados',
      title: 'Gestión de Certificados',
      description: 'Administrar certificados emitidos',
      icon: FileText,
      category: 'certificados',
      badge: '156 activos'
    },
    {
      id: 'gestion-de-firmas',
      title: 'Gestión de Firmas',
      description: 'Administrar firmas digitales',
      icon: Signature,
      category: 'certificados',
      badge: '4 firmantes'
    },
    {
      id: 'control-secuencia',
      title: 'Control de Secuencia',
      description: 'Control de numeración',
      icon: Calculator,
      category: 'certificados',
      badge: 'Secuencia OK'
    },
    {
      id: 'reportes',
      title: 'Reportes',
      description: 'Estadísticas y reportes',
      icon: ChartBar,
      category: 'certificados',
      badge: '15 reportes'
    }
  ];

  const categories = [
    { id: 'all', name: 'Todos los módulos', count: submodules.length },
    { id: 'cursos', name: 'Cursos', count: submodules.filter(m => m.category === 'cursos').length },
    { id: 'participantes', name: 'Participantes', count: submodules.filter(m => m.category === 'participantes').length },
    { id: 'certificados', name: 'Certificados', count: submodules.filter(m => m.category === 'certificados').length }
  ];

  const filteredModules = activeSection === 'all' 
    ? submodules 
    : submodules.filter(m => m.category === activeSection);

  const handleSubmoduleClick = (submoduleId: string) => {
    router.push(`/dashboard/capacitacion/${submoduleId}`);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      cursos: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      participantes: 'text-blue-600 bg-blue-50 border-blue-200',
      certificados: 'text-amber-600 bg-amber-50 border-amber-200'
    };
    return colors[category] || colors.cursos;
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
    <div className="min-h-screen bg-white">
      {/* Clean Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-light text-gray-900">Capacitación</h1>
              <p className="text-sm text-gray-500 mt-1">Gestión de programas de capacitación</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Usuario</p>
              <p className="text-sm font-medium text-gray-900">{user.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Category Filter */}
        <div className="flex space-x-1 mb-8 border-b border-gray-200">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveSection(category.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSection === category.id
                  ? 'text-gray-900 border-gray-900'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {category.name}
              <span className="ml-2 text-xs text-gray-400">({category.count})</span>
            </button>
          ))}
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map((submodule) => {
            const Icon = submodule.icon;
            return (
              <div
                key={submodule.id}
                onClick={() => handleSubmoduleClick(submodule.id)}
                className="group cursor-pointer border border-gray-200 rounded-lg p-6 transition-all duration-200 hover:border-gray-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg border ${getCategoryColor(submodule.category)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{submodule.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{submodule.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors mt-1" />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(submodule.category)}`}>
                    {submodule.badge}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="grid grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-2xl font-light text-gray-900">12</p>
              <p className="text-xs text-gray-500 mt-1">Cursos Activos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-light text-gray-900">245</p>
              <p className="text-xs text-gray-500 mt-1">Participantes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-light text-gray-900">89</p>
              <p className="text-xs text-gray-500 mt-1">Certificados Emitidos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-light text-gray-900">87%</p>
              <p className="text-xs text-gray-500 mt-1">Tasa de Completación</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
