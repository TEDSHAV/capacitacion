"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Company, CapacitacionClientProps } from "./types";

export default function CapacitacionClient({
  user,
  companies,
}: CapacitacionClientProps) {
  const router = useRouter();

  const submodules = [
    {
      id: 'gestion-participantes',
      title: 'Gestión de Participantes',
      description: 'Gestión de participantes en capacitaciones',
      color: 'bg-blue-500'
    },
    {
      id: 'gestion-cursos',
      title: 'Gestión de Cursos',
      description: 'Crear y administrar contenidos de cursos',
      color: 'bg-green-500'
    },
    {
      id: 'facilitadores',
      title: 'Facilitadores',
      description: 'Administración de facilitadores e instructores',
      color: 'bg-blue-500'
    },
    {
      id: 'generacion-certificado',
      title: 'Generación de Certificados',
      description: 'Crear y generar certificados de capacitación',
      color: 'bg-yellow-500'
    },
    {
      id: 'plantillas-certificados',
      title: 'Plantillas de Certificados',
      description: 'Gestionar plantillas para generación de certificados',
      color: 'bg-purple-500'
    },
    {
      id: 'gestion-certificados',
      title: 'Gestión de Certificados',
      description: 'Administrar certificados emitidos',
      color: 'bg-blue-500'
    },
    {
      id: 'control-secuencia',
      title: 'Control de Números de Secuencia',
      description: 'Control de numeración de certificados',
      color: 'bg-red-500'
    }
  ];

  const handleSubmoduleClick = (submoduleId: string) => {
    router.push(`/dashboard/capacitacion/${submoduleId}`);
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-gray-600">No autenticado</p>
            </div>
          </div>
        </div>
      </div>
    );
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {submodules.map((submodule) => {
            return (
              <div
                key={submodule.id}
                onClick={() => handleSubmoduleClick(submodule.id)}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
