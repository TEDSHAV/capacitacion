import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getAllControlServiciosRecords,
  deleteControlServiciosRecord,
} from "@/app/actions/control-servicios";

export default async function ListaControlServiciosPage() {
  const records = await getAllControlServiciosRecords();

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
        <Link href="/dashboard/capacitacion/planificacion-servicios/solicitud-requisiciones">
          <Button>Nuevo Registro</Button>
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                OSI
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Curso
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Facilitador
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ejecutada
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
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.numero_osi ||
                      record.ejecucion_osi?.nro_osi_secuencial ||
                      "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.nombre_curso || "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.facilitador ||
                      record.facilitadores?.nombre_apellido ||
                      "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.ejecutada_mes_curso || "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.created_at
                      ? new Date(record.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/capacitacion/planificacion-servicios/solicitud-requisiciones?edit=${record.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Editar
                      </Link>
                      <form
                        action={async () => {
                          "use server";
                          await deleteControlServiciosRecord(record.id);
                        }}
                      >
                        <button className="text-red-600 hover:text-red-800 font-medium">
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  No hay registros de control de servicios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
