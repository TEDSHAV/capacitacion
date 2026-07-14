import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getAllControlServiciosRecords,
} from "@/app/actions/control-servicios";
import RequisicionRow from "./components/requisicion-row";
import { getUserAppRoles } from "@/app/actions/auth";

export default async function ListaControlServiciosPage() {
  const [records, userRoles] = await Promise.all([
    getAllControlServiciosRecords(),
    getUserAppRoles(),
  ]);

  const requisicionesRole = userRoles.find((r: any) => r.app_slug === "requisiciones")?.role_slug?.toLowerCase();
  const scapacitacionRole = userRoles.find((r: any) => r.app_slug === "scapacitacion")?.role_slug?.toLowerCase();
  const sgestionRole = userRoles.find((r: any) => r.app_slug === "sgestion")?.role_slug?.toLowerCase();

  const allowedRoles = ["admin", "lider", "superadmin"];
  const canAccessRequisiciones = 
    allowedRoles.includes(requisicionesRole || "") || 
    allowedRoles.includes(scapacitacionRole || "") ||
    allowedRoles.includes(sgestionRole || "");

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Lista de Control de Servicios
          </h1>
          <p className="mt-2 text-gray-600">
            Registros de servicios ejecutados
          </p>
        </div>
        {canAccessRequisiciones && (
          <a href={`${process.env.NEXT_PUBLIC_SHELL_URL || ""}/requisiciones/create`} target="_parent">
            <Button>Nuevo Registro</Button>
          </a>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Correlativo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                OSI
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Solicitante
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gerencia
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records && records.length > 0 ? (
              records.map((record: any) => (
                <RequisicionRow key={record.id} record={record} canAccessRequisiciones={canAccessRequisiciones} />
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  No hay registros de requisiciones
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
