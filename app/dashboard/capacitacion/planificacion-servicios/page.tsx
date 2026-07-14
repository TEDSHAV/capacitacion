import Link from "next/link";
import { FileText, List, Users } from "lucide-react";
import { getUserAppRoles } from "@/app/actions/auth";

export default async function PlanificacionServiciosPage() {
  const userRoles = await getUserAppRoles();
  
  const requisicionesRole = userRoles.find((r: any) => r.app_slug === "requisiciones")?.role_slug?.toLowerCase();
  const scapacitacionRole = userRoles.find((r: any) => r.app_slug === "scapacitacion")?.role_slug?.toLowerCase();
  const sgestionRole = userRoles.find((r: any) => r.app_slug === "sgestion")?.role_slug?.toLowerCase();
  
  const allowedRoles = ["admin", "lider", "superadmin"];
  const canAccessRequisiciones = 
    allowedRoles.includes(requisicionesRole || "") || 
    allowedRoles.includes(scapacitacionRole || "") ||
    allowedRoles.includes(sgestionRole || "");

  console.log("[PlanificacionServiciosPage] Access Decision:", {
    roles: { requisicionesRole, scapacitacionRole, sgestionRole },
    canAccessRequisiciones
  });

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
        {canAccessRequisiciones && (
          <>
            <a href={`${process.env.NEXT_PUBLIC_SHELL_URL || ""}/requisiciones/create`} target="_parent">
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
            </a>

            <a href={`${process.env.NEXT_PUBLIC_SHELL_URL || ""}/requisiciones`} target="_parent">
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
            </a>
          </>
        )}


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
