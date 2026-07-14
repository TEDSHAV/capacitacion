import Link from "next/link";
import { FileText, List, Users } from "lucide-react";

export default function PlanificacionServiciosPage() {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Planificación de Servicios
        </h1>
        <p className="mt-2 text-gray-600">
          Gestión de servicios ejecutados y control de facilitadores
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/dashboard/capacitacion/planificacion-servicios/solicitud-requisiciones">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Solicitud de Requisiciones
              </h2>
            </div>
            <p className="text-sm text-gray-600">
              Crear y gestionar registros de control de servicios ejecutados
            </p>
          </div>
        </Link>

        <Link href="/dashboard/capacitacion/planificacion-servicios/lista">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-3">
              <List className="h-8 w-8 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Lista de Registros
              </h2>
            </div>
            <p className="text-sm text-gray-600">
              Ver todos los registros de control de servicios
            </p>
          </div>
        </Link>

        <Link href="/dashboard/capacitacion/planificacion-servicios/busqueda-facilitadores">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-3">
              <Users className="h-8 w-8 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Búsqueda de Facilitadores
              </h2>
            </div>
            <p className="text-sm text-gray-600">
              Buscar y filtrar facilitadores disponibles
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
