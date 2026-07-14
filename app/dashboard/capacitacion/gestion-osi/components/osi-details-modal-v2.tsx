"use client";

import { OSIManagement, OSIStatus } from "@/types";
import {
  X,
  Building2,
  User,
  Calendar,
  Clock,
  MapPin,
  FileText,
  CheckCircle2,
  DollarSign,
} from "lucide-react";

interface OSIDetailsModalV2Props {
  osi: OSIManagement | null;
  onClose: () => void;
  statuses: OSIStatus[];
}

export default function OSIDetailsModalV2({
  osi,
  onClose,
  statuses,
}: OSIDetailsModalV2Props) {
  if (!osi) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "VES",
    }).format(amount);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal panel */}
        <div className="relative inline-block w-full max-w-5xl transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 sm:px-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white" id="modal-title">
                    Orden de Servicio de Instrucción
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-blue-100">
                  <span className="text-lg font-semibold">{osi.nro_osi}</span>
                  <span className="text-blue-200">|</span>
                  <span>{osi.nombre_empresa}</span>
                </div>
              </div>
              <button
                type="button"
                className="bg-white/10 hover:bg-white/20 rounded-md text-white p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={onClose}
              >
                <span className="sr-only">Cerrar</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 sm:p-8 bg-gray-50">
            {/* Document-like layout */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Status Banner */}
              <div
                className="px-6 py-4 border-b border-gray-200"
                style={{
                  backgroundColor: `${osi.status_color || "#6B7280"}10`,
                  borderColor: `${osi.status_color || "#6B7280"}30`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className="w-5 h-5"
                      style={{ color: osi.status_color || "#6B7280" }}
                    />
                    <span
                      className="text-sm font-semibold"
                      style={{ color: osi.status_color || "#6B7280" }}
                    >
                      Estado: {osi.status_name || "Desconocido"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    ID: {osi.id_osi}
                  </span>
                </div>
              </div>

              {/* Main Content */}
              <div className="p-6 space-y-6">
                {/* Section 1: Información del Servicio */}
                <section>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Información del Servicio
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Tipo de Servicio
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {osi.tipo_servicio}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Servicio
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {osi.servicio}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          N° de Presupuesto
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {osi.nro_presupuesto || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Horas Académicas
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {osi.horas_academicas_ejecucion || "-"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          N° de Sesiones
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {osi.sesiones_ejecucion || "-"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          ID Servicio
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {osi.id_servicio || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <hr className="border-gray-200" />

                {/* Section 2: Cliente y Ejecutivo */}
                <section>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Cliente y Ejecutivo
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Empresa
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {osi.nombre_empresa}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          ID Empresa
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {osi.id_empresa}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Código Cliente
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {osi.codigo_cliente || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Ejecutivo de Negocios
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {osi.ejecutivo_negocios || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <hr className="border-gray-200" />

                {/* Section 3: Fechas */}
                <section>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fechas
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Fecha de Emisión
                      </label>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(osi.fecha_emision)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Fecha Inicio Servicio
                      </label>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(osi.fecha_inicio_real)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Fecha Fin Servicio
                      </label>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(osi.fecha_fin_real)}
                      </p>
                    </div>
                  </div>
                </section>

                <hr className="border-gray-200" />

                {/* Section 4: Ubicación */}
                <section>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Ubicación de Ejecución
                  </h4>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Dirección
                    </label>
                    <p className="text-sm font-medium text-gray-900">
                      {osi.direccion_ejecucion || "-"}
                    </p>
                  </div>
                </section>

                {/* Content Description */}
                {osi.contenido_servicio && (
                  <>
                    <hr className="border-gray-200" />
                    <section>
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Contenido del Servicio
                      </h4>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {osi.contenido_servicio}
                        </p>
                      </div>
                    </section>
                  </>
                )}

                {/* Observaciones */}
                {osi.observaciones_totales && (
                  <>
                    <hr className="border-gray-200" />
                    <section>
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Observaciones
                      </h4>
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {osi.observaciones_totales}
                        </p>
                      </div>
                    </section>
                  </>
                )}

                {/* Costs */}
                {(osi.costo_honorarios_instructor ||
                  osi.costo_traslado ||
                  osi.costo_impresion_material ||
                  osi.costo_logistica_comida ||
                  osi.costo_otros) && (
                  <>
                    <hr className="border-gray-200" />
                    <section>
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Costos del Servicio
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {osi.costo_honorarios_instructor && (
                          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Honorarios Instructor
                            </label>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(osi.costo_honorarios_instructor)}
                            </p>
                          </div>
                        )}
                        {osi.costo_traslado && (
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Traslado
                            </label>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(osi.costo_traslado)}
                            </p>
                          </div>
                        )}
                        {osi.costo_impresion_material && (
                          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Impresión de Material
                            </label>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(osi.costo_impresion_material)}
                            </p>
                          </div>
                        )}
                        {osi.costo_logistica_comida && (
                          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Logística y Comida
                            </label>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(osi.costo_logistica_comida)}
                            </p>
                          </div>
                        )}
                        {osi.costo_otros && (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Otros
                            </label>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(osi.costo_otros)}
                            </p>
                          </div>
                        )}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-100 px-6 py-4 sm:px-8 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-2.5 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
