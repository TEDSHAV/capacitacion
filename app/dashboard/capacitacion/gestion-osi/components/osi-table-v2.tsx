"use client";

import { OSIManagement } from "@/types";
import {
  Calendar,
  Building2,
  FileText,
  Download,
  ClipboardList,
  UserPlus,
  MapPin,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { OSIStatus } from "@/types";
import { formatDateOnly } from "@/lib/format-date";

interface OSITableV2Props {
  osis: OSIManagement[];
  loading: boolean;
  fetching?: boolean;
  statuses: OSIStatus[];
  sortDir: "asc" | "desc";
  onToggleSort: () => void;
  onViewDetails: (osi: OSIManagement, section?: "info" | "documents") => void;
  onSurvey: (osi: OSIManagement) => void;
  onAssignFacilitador: (osi: OSIManagement) => void;
  onPreviewOsi: (osi: OSIManagement) => void;
}

export default function OSITableV2({
  osis,
  loading,
  fetching = false,
  statuses,
  sortDir,
  onToggleSort,
  onViewDetails,
  onSurvey,
  onAssignFacilitador,
  onPreviewOsi,
}: OSITableV2Props) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return formatDateOnly(dateString, "es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading && (!osis || osis.length === 0)) {
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
      {fetching && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-100 overflow-hidden z-10">
          <div className="h-full bg-blue-600 animate-pulse" style={{ width: "40%" }} />
        </div>
      )}

      {/* Mobile: Sorting & List indicator */}
      <div className="flex sm:hidden items-center justify-between px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 text-xs">
        <span className="text-gray-500 font-medium">Lista de OSIs</span>
        <button
          type="button"
          onClick={onToggleSort}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-2xs cursor-pointer"
          title={`Ordenar por Nro. OSI (${sortDir === "desc" ? "Descendente" : "Ascendente"}). Clic para cambiar.`}
        >
          <span>Nro. OSI</span>
          {sortDir === "asc" ? (
            <span className="inline-flex items-center gap-0.5 text-blue-600 font-semibold">
              Asc <ArrowUp className="w-3 h-3" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-blue-600 font-semibold">
              Desc <ArrowDown className="w-3 h-3" />
            </span>
          )}
        </button>
      </div>

      {/* Mobile: Card layout */}
      <div className="block sm:hidden divide-y divide-gray-100">
        {osis.map((osi, index) => (
          <div
            key={`${osi.id_osi}-${osi.nro_osi}-${osi.id_servicio}-${index}`}
            className={`p-4 hover:bg-blue-50 transition-colors cursor-pointer active:bg-blue-100 relative ${
              osi.certificado_impreso ? "shadow-[inset_3px_0_0_#22c55e]" : ""
            }`}
            title={osi.certificado_impreso ? "Certificados emitidos" : undefined}
            onClick={() => onPreviewOsi(osi)}
          >
            {/* Top row: OSI number + date */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewOsi(osi);
                  }}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer truncate text-left"
                  title="Ver formato oficial de la OSI"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                  <span className="truncate">{osi.nro_osi}</span>
                </button>
                {osi.nro_presupuesto && (
                  <span className="text-[10px] text-gray-500 truncate">
                    {osi.nro_presupuesto}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span>{formatDate(osi.fecha_inicio_real)}</span>
              </div>
            </div>
            {/* Company & City */}
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate">{osi.nombre_empresa}</span>
              </div>
              {osi.ciudad_ejecucion && (
                <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0" title={osi.ciudad_ejecucion}>
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span>{osi.ciudad_ejecucion}</span>
                </div>
              )}
            </div>
            {/* Service */}
            <div className="mb-3">
              <span className="text-sm text-gray-900 font-medium block truncate">{osi.servicio}</span>
              {osi.tipo_servicio && (
                <span className="text-[10px] text-gray-500 truncate block">{osi.tipo_servicio}</span>
              )}
            </div>
            {/* Actions */}
            <div className="grid grid-cols-2 sm:flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewOsi(osi);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1 py-2 border border-sky-600 text-sky-600 hover:bg-sky-600 hover:text-white rounded-md transition-colors text-xs font-medium cursor-pointer"
                title="Ver formato oficial de la OSI"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Formato OSI</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignFacilitador(osi);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1 py-2 border border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white rounded-md transition-colors text-xs font-medium cursor-pointer"
                title="Asignar Facilitador"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Facilitador</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSurvey(osi);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1 py-2 border border-green-600 text-green-600 hover:bg-green-600 hover:text-white rounded-md transition-colors text-xs font-medium cursor-pointer"
                title="Generar/Ver Encuesta de Satisfacción"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Encuesta</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(osi, "documents");
                }}
                className="flex-1 inline-flex items-center justify-center gap-1 py-2 border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-md transition-colors text-xs font-medium cursor-pointer"
                title="Ver documentos generados"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Docs</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                onClick={onToggleSort}
                className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none group transition-colors"
                title={`Ordenar por Nro. OSI (${sortDir === "desc" ? "Descendente" : "Ascendente"}). Clic para cambiar.`}
              >
                <div className="inline-flex items-center gap-1.5 text-gray-700 group-hover:text-blue-600">
                  <span>OSI</span>
                  {sortDir === "asc" ? (
                    <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                  )}
                </div>
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Empresa
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Servicio
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Ciudad
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-36">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {osis.map((osi, index) => (
              <tr
                key={`${osi.id_osi}-${osi.nro_osi}-${osi.id_servicio}-${index}`}
                className={`hover:bg-blue-50 transition-colors cursor-pointer group ${
                  osi.certificado_impreso ? "shadow-[inset_3px_0_0_#22c55e]" : ""
                }`}
                title={osi.certificado_impreso ? "Certificados emitidos" : undefined}
                onClick={() => onPreviewOsi(osi)}
              >
                <td className="px-3 py-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewOsi(osi);
                        }}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer transition-colors"
                        title="Ver formato oficial de la OSI"
                      >
                        <FileText className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                        <span>{osi.nro_osi}</span>
                      </button>
                    </div>
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
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate max-w-[120px]" title={osi.ciudad_ejecucion || undefined}>
                      {osi.ciudad_ejecucion || "-"}
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
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewOsi(osi);
                      }}
                      className="inline-flex items-center p-1.5 border border-sky-600 text-sky-600 hover:bg-sky-600 hover:text-white rounded-md transition-colors shadow-sm cursor-pointer"
                      title="Ver formato oficial de la OSI"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssignFacilitador(osi);
                      }}
                      className="inline-flex items-center p-1.5 border border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white rounded-md transition-colors shadow-sm cursor-pointer"
                      title="Asignar Facilitador"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSurvey(osi);
                      }}
                      className="inline-flex items-center p-1.5 border border-green-600 text-green-600 hover:bg-green-600 hover:text-white rounded-md transition-colors shadow-sm cursor-pointer"
                      title="Generar/Ver Encuesta de Satisfacción"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(osi, "documents");
                      }}
                      className="inline-flex items-center p-1.5 border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-md transition-colors shadow-sm cursor-pointer"
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
