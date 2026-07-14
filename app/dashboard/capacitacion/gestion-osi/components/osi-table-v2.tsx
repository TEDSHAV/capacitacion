"use client";

import { OSIManagement } from "@/types";
import { Calendar, Building2, Clock, FileText, Download, ClipboardList } from "lucide-react";
import type { OSIStatus } from "@/types";

interface OSITableV2Props {
  osis: OSIManagement[];
  loading: boolean;
  statuses: OSIStatus[];
  onViewDetails: (osi: OSIManagement, section?: "info" | "documents") => void;
  onSurvey: (osi: OSIManagement) => void;
}

export default function OSITableV2({
  osis,
  loading,
  statuses,
  onViewDetails,
  onSurvey,
}: OSITableV2Props) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Cargando OSIs...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!osis || osis.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron OSIs
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Intenta ajustar los filtros de búsqueda para ver resultados, o
            verifica que haya OSIs registrados en el sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                OSI
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Empresa
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Servicio
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {osis.map((osi, index) => (
              <tr
                key={`${osi.id_osi}-${osi.nro_osi}-${osi.id_servicio}-${index}`}
                className="hover:bg-blue-50 transition-colors cursor-pointer group"
                onClick={() => onViewDetails(osi)}
              >
                <td className="px-3 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                      {osi.nro_osi}
                    </span>
                    {osi.nro_presupuesto && (
                      <span className="text-[10px] text-gray-500">
                        {osi.nro_presupuesto}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900 max-w-[150px] truncate">
                      {osi.nombre_empresa}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-900 max-w-[180px] truncate font-medium">
                      {osi.servicio}
                    </span>
                    <span className="text-[10px] text-gray-500 truncate max-w-[180px]">
                      {osi.tipo_servicio}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-xs text-gray-700">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{formatDate(osi.fecha_inicio_real)}</span>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-right">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSurvey(osi);
                      }}
                      className="inline-flex items-center p-1.5 border border-green-600 text-green-600 hover:bg-green-600 hover:text-white rounded-md transition-colors shadow-sm"
                      title="Generar/Ver Encuesta de Satisfacción"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(osi, "documents");
                      }}
                      className="inline-flex items-center p-1.5 border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-md transition-colors shadow-sm"
                      title="Ver documentos generados"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
