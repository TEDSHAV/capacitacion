"use client";

import { useRouter } from "next/navigation";
import { memo, useCallback } from "react";
import { CapacitacionClientProps } from "./types";
import LoadingSpinner from "@/components/ui/loading-spinner";

// Memoized submodule card component
const SubmoduleCard = memo(({ 
  submodule, 
  onClick 
}: { 
  submodule: any
  onClick: () => void 
}) => (
  <div
    onClick={onClick}
    className="cursor-pointer transform transition-all duration-200 hover:scale-105"
  >
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg min-h-[150px] flex flex-col">
      <div className={`${submodule.color} h-2`}></div>
      <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {submodule.title}
        </h3>
        <p className="text-sm text-gray-600">
          {submodule.description}
        </p>
      </div>
    </div>
  </div>
))

SubmoduleCard.displayName = 'SubmoduleCard'

// Memoized loading state
const LoadingState = memo(() => (
  <LoadingSpinner message="Cargando..." color="blue" />
))

LoadingState.displayName = 'LoadingState'

// Memoized unauthorized state
const UnauthorizedState = memo(() => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="text-center">
      <p className="text-gray-600">No autenticado</p>
    </div>
  </div>
))

UnauthorizedState.displayName = 'UnauthorizedState'

export default memo(function OptimizedCapacitacionClient({
  user,
  companies,
}: CapacitacionClientProps) {
  const router = useRouter();

  // Memoized submodules array to prevent recreation
  const submodules = [
    // Cursos Section
    {
      id: 'gestion-cursos',
      title: 'Gestión de Cursos',
      description: 'Crear y administrar contenidos de cursos',
      color: 'bg-green-500',
      section: 'cursos'
    },
    {
      id: 'plantillas-certificados',
      title: 'Plantillas de Certificados',
      description: 'Gestionar plantillas para generación de certificados',
      color: 'bg-emerald-500',
      section: 'cursos'
    },
    // Participantes Section
    {
      id: 'participantes',
      title: 'Gestión de Participantes',
      description: 'Gestión de participantes en capacitaciones',
      color: 'bg-blue-500',
      section: 'participantes'
    },
    {
      id: 'consulta-participantes',
      title: 'Consulta de Participantes',
      description: 'Consultar y buscar participantes',
      color: 'bg-sky-500',
      section: 'participantes'
    },
    {
      id: 'gestion-de-facilitadores',
      title: 'Gestión de Facilitadores',
      description: 'Administración de facilitadores e instructores',
      color: 'bg-cyan-500',
      section: 'participantes'
    },
    // Certificados Section
    {
      id: 'generacion-certificado',
      title: 'Generación de Certificados',
      description: 'Crear y generar certificados de capacitación',
      color: 'bg-yellow-500',
      section: 'certificados'
    },
    {
      id: 'gestion-certificados',
      title: 'Gestión de Certificados',
      description: 'Administrar certificados emitidos',
      color: 'bg-amber-500',
      section: 'certificados'
    },
    {
      id: 'gestion-de-firmas',
      title: 'Gestión de Firmas',
      description: 'Administrar firmas digitales para certificados',
      color: 'bg-purple-500',
      section: 'certificados'
    },
    {
      id: 'control-secuencia',
      title: 'Control de Secuencia',
      description: 'Control de numeración de certificados',
      color: 'bg-red-500',
      section: 'certificados'
    },
    {
      id: 'reportes',
      title: 'Reportes',
      description: 'Estadísticas y reportes de certificados',
      color: 'bg-indigo-500',
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
    cursos: '📚 Cursos',
    participantes: '👥 Participantes y Facilitadores',
    certificados: '📜 Certificados y Control'
  };

  // Memoized navigation handler
  const handleSubmoduleClick = useCallback((submoduleId: string) => {
    router.push(`/dashboard/capacitacion/${submoduleId}`);
  }, [router]);

  if (!user) {
    return <UnauthorizedState />;
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Módulo de Capacitación
          </h1>
          <p className="mt-2 text-gray-600">
            Selecciona un submódulo para gestionar las capacitaciones
          </p>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedSubmodules).map(([section, modules]) => (
            <div key={section}>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {sectionTitles[section as keyof typeof sectionTitles]}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((submodule) => (
                  <SubmoduleCard
                    key={submodule.id}
                    submodule={submodule}
                    onClick={() => handleSubmoduleClick(submodule.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
})
