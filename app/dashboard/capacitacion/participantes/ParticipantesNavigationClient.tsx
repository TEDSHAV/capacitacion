"use client";

import { useRouter } from "next/navigation";

export default function ParticipantesNavigationPage() {
  const router = useRouter();

  const submodules = [
    {
      id: 'participantes',
      title: 'Gestión de Participantes',
      description: 'Gestión de participantes en capacitaciones',
      color: 'bg-blue-500'
    },
    {
      id: 'consulta-participantes',
      title: 'Consulta de Participantes',
      description: 'Consultar y buscar participantes',
      color: 'bg-indigo-500'
    },
    {
      id: 'gestion-de-facilitadores',
      title: 'Gestión de Facilitadores',
      description: 'Administración de facilitadores e instructores',
      color: 'bg-green-500'
    }
  ];

  const handleSubmoduleClick = (submoduleId: string) => {
    router.push(`/dashboard/capacitacion/participantes/${submoduleId}`);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Participantes
          </h1>
          <p className="mt-2 text-gray-600">
            Selecciona un submódulo para gestionar participantes y facilitadores
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
