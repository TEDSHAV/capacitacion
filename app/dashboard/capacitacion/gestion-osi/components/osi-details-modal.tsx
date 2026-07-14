"use client";

import { OSIManagement, OSIStatus } from "@/types";
import { X, Building2, User, Calendar, Clock, MapPin, FileText, CheckCircle2 } from "lucide-react";
import OSILifecycle from "./osi-lifecycle";

interface OSIDetailsModalProps {
  osi: OSIManagement | null;
  onClose: () => void;
  statuses: OSIStatus[];
}

export default function OSIDetailsModal({ osi, onClose, statuses }: OSIDetailsModalProps) {
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
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Detalles del OSI
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {osi.nro_osi} - {osi.nombre_empresa}
                </p>
              </div>
              <button
                type="button"
                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={onClose}
              >
                <span className="sr-only">Cerrar</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-5 sm:p-6">
            {/* Lifecycle */}
            <div className="mb-6">
              <OSILifecycle currentStatusId={osi.id_estatus} statuses={statuses} />
            </div>

            {/* Key Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Información General
                  </h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">N° OSI</dt>
                      <dd className="text-sm font-medium text-gray-900">{osi.nro_osi}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">N° Presupuesto</dt>
                      <dd className="text-sm font-medium text-gray-900">{osi.nro_presupuesto || "-"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Código Cliente</dt>
                      <dd className="text-sm font-medium text-gray-900">{osi.codigo_cliente || "-"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Estado Actual</dt>
                      <dd className="text-sm font-medium">
                        <span
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${osi.status_color || "#6B7280"}20`,
                            color: osi.status_color || "#6B7280",
                          }}
                        >
                          {osi.status_name || "Desconocido"}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Empresa
                  </h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">Nombre</dt>
                      <dd className="text-sm font-medium text-gray-900">{osi.nombre_empresa}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">ID Empresa</dt>
                      <dd className="text-sm font-medium text-gray-900">{osi.id_empresa}</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Ejecutivo
                  </h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">Nombre</dt>
                      <dd className="text-sm font-medium text-gray-900">{osi.ejecutivo_negocios || "-"}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Right Column - Service & Dates */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Servicio
                  </h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">Tipo</dt>
                      <dd className="text-sm font-medium text-gray-900">{osi.tipo_servicio}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Servicio</dt>
                      <dd className="text-sm font-medium text-gray-900">{osi.servicio}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">ID Servicio</dt>
                      <dd className="text-sm font-medium text-gray-900">{osi.id_servicio || "-"}</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fechas
                  </h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Emisión</dt>
                      <dd className="text-sm font-medium text-gray-900">{formatDate(osi.fecha_emision)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Inicio Servicio</dt>
                      <dd className="text-sm font-medium text-gray-900">{formatDate(osi.fecha_inicio_real)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Fin Servicio</dt>
                      <dd className="text-sm font-medium text-gray-900">{formatDate(osi.fecha_fin_real)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Duración
                  </h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Sesiones</dt>
                      <dd className="text-sm font-medium text-gray-900">{osi.sesiones_ejecucion || "-"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Horas Académicas</dt>
                      <dd className="text-sm font-medium text-gray-900">{osi.horas_academicas_ejecucion || "-"}</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Ubicación
                  </h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">Dirección Ejecución</dt>
                      <dd className="text-sm font-medium text-gray-900">{osi.direccion_ejecucion || "-"}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {/* Content Description */}
            {osi.contenido_servicio && (
              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Contenido del Servicio</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{osi.contenido_servicio}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
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
