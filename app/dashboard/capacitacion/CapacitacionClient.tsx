"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Company, CapacitacionClientProps } from "@/types";
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

export default function CapacitacionClient({
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
        {/* Enhanced Horizontal Category Filter with Neon Style */}
        <div className="mb-8">
          <div className="relative">
            {/* Tab container with enhanced styling */}
            <div className="relative bg-gray-100 rounded-t-xl border border-gray-300 shadow-lg">
              <div className="flex gap-4 p-2">
                {categories.map((category) => {
                  const isActive = activeSection === category.id;
                  const categoryColors = {
                    all: 'from-blue-600 to-blue-600',
                    cursos: 'from-blue-600 to-blue-600',
                    participantes: 'from-blue-600 to-blue-600',
                    certificados: 'from-blue-600 to-blue-600'
                  };
                  
                  const categoryBadgeColors = {
                    all: 'bg-gray-200 text-gray-700 border-gray-400',
                    cursos: 'bg-emerald-100 text-emerald-700 border-emerald-300',
                    participantes: 'bg-blue-100 text-blue-700 border-blue-300',
                    certificados: 'bg-amber-100 text-amber-700 border-amber-300'
                  };

                  const neonColors = {
                    all: '#60a5fa',
                    cursos: '#60a5fa',
                    participantes: '#60a5fa',
                    certificados: '#60a5fa'
                  };

                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveSection(category.id)}
                      className={`
                        relative flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 cursor-pointer flex items-center group
                        ${isActive 
                          ? 'bg-blue-600 text-white transform scale-105 sidebar-neon-active' 
                          : 'bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 hover:shadow-md hover:transform hover:scale-105'
                        }`}
                    >
                      {/* Content */}
                      <div className="relative z-10 flex items-center justify-center space-x-2">
                        <span className={`font-medium ${isActive ? 'text-white' : 'text-gray-600'}`}>
                          {category.name}
                        </span>
                        <span className={`
                          px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-300
                          ${isActive 
                            ? `${categoryBadgeColors[category.id as keyof typeof categoryBadgeColors]} border-2 border-white shadow-lg` 
                            : categoryBadgeColors[category.id as keyof typeof categoryBadgeColors]
                          }
                        `}>
                          {category.count}
                        </span>
                      </div>

                      {/* Enhanced hover effect for inactive tabs */}
                      {!isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-600 to-transparent opacity-0 hover:opacity-30 transition-opacity duration-300 rounded-md"></div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Clean separator */}
              <div className="h-px bg-gray-300 opacity-50"></div>
            </div>
          </div>
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
