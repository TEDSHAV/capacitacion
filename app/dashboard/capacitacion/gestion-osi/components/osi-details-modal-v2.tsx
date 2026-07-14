"use client";

import { useState, useEffect } from "react";
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
  Download,
  Archive,
  Loader2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { getCertificatesByOSIAction } from "@/app/actions/certificados";
import {
  downloadBatchAction,
  DownloadChoice,
} from "@/lib/batch-download-utils";

interface OSIDetailsModalV2Props {
  osi: OSIManagement | null;
  onClose: () => void;
  statuses: OSIStatus[];
  initialSection?: "info" | "documents";
}

export default function OSIDetailsModalV2({
  osi,
  onClose,
  statuses,
  initialSection = "info",
}: OSIDetailsModalV2Props) {
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [downloadingBatch, setDownloadingBatch] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] =
    useState<string>(initialSection); // 'info' or 'documents'

  useEffect(() => {
    if (osi) {
      loadCertificates();
    }
  }, [osi]);

  const loadCertificates = async () => {
    if (!osi) return;
    console.log("OSIDetailsModal - Loading certificates for OSI:", osi.nro_osi);
    setLoadingCerts(true);
    try {
      const result = await getCertificatesByOSIAction(osi.nro_osi);
      console.log(
        "OSIDetailsModal - getCertificatesByOSIAction result:",
        result,
      );
      if (result.success && result.certificates) {
        console.log(
          "OSIDetailsModal - Found certificates:",
          result.certificates.length,
        );
        setCertificates(result.certificates);
        groupCertificatesIntoBatches(result.certificates);
      } else {
        console.error(
          "OSIDetailsModal - Failed to load certificates:",
          (result as any).message,
        );
      }
    } catch (error) {
      console.error("OSIDetailsModal - Error loading certificates:", error);
    } finally {
      setLoadingCerts(false);
    }
  };

  const groupCertificatesIntoBatches = (certs: any[]) => {
    console.log("OSIDetailsModal - Grouping certificates into batches...");
    // Group by emission date and course title
    const batchMap = new Map();

    certs.forEach((cert) => {
      const snapshot =
        typeof cert.snapshot_contenido === "string"
          ? JSON.parse(cert.snapshot_contenido)
          : cert.snapshot_contenido;

      const date = cert.fecha_emision || "Sin fecha";
      // Try to get course name from multiple sources
      const course =
        snapshot?.curso?.name ||
        cert.catalogo_servicios?.nombre ||
        cert.titulo_curso ||
        "Sin curso";

      const key = `${date}_${course}`;

      if (!batchMap.has(key)) {
        batchMap.set(key, {
          id: key,
          date,
          course,
          certificates: [],
        });
      }
      batchMap.get(key).certificates.push(cert);
    });

    const groupedBatches = Array.from(batchMap.values());
    console.log("OSIDetailsModal - Grouped batches:", groupedBatches);
    setBatches(groupedBatches);
  };

  const handleDownload = async (batch: any, choice: DownloadChoice) => {
    setDownloadingBatch(`${batch.id}_${choice}`);
    try {
      await downloadBatchAction(
        choice,
        batch.certificates,
        osi,
        batch.course,
        batch.date,
      );
    } catch (error) {
      alert(
        "Error al descargar el lote: " +
          (error instanceof Error ? error.message : "Error desconocido"),
      );
    } finally {
      setDownloadingBatch(null);
    }
  };

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

          {/* Tabs-like Navigation */}
          <div className="flex border-b border-gray-200 px-6 sm:px-8 bg-white">
            <button
              onClick={() => setExpandedSection("info")}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                expandedSection === "info"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Información General
            </button>
            <button
              onClick={() => setExpandedSection("documents")}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                expandedSection === "documents"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Documentos Generados
              {batches.length > 0 && (
                <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                  {batches.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 sm:p-8 bg-gray-50 max-h-[60vh] overflow-y-auto">
            {expandedSection === "info" ? (
              /* Document-like layout */
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
                                {formatCurrency(
                                  osi.costo_honorarios_instructor,
                                )}
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
            ) : (
              /* Generated Documents Section */
              <div className="space-y-6">
                {loadingCerts ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                    <p className="text-gray-500">
                      Buscando documentos generados...
                    </p>
                  </div>
                ) : batches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-gray-200 text-center px-4">
                    <Archive className="w-12 h-12 text-gray-300 mb-4" />
                    <h5 className="text-lg font-medium text-gray-900">
                      No se encontraron lotes
                    </h5>
                    <p className="text-gray-500 max-w-sm mt-1">
                      Esta OSI aún no tiene certificados o carnets generados en
                      el sistema.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {batches.map((batch) => (
                      <div
                        key={batch.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:border-blue-300 transition-colors"
                      >
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-100 p-2.5 rounded-lg">
                                <Archive className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h5 className="font-bold text-gray-900 line-clamp-1">
                                  {batch.course}
                                </h5>
                                <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                  <Calendar className="w-3 h-3" />
                                  Emitido el{" "}
                                  {new Date(
                                    batch.date + "T12:00:00",
                                  ).toLocaleDateString("es-VE", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold border border-blue-100">
                                {batch.certificates.length} Participantes
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="p-5 bg-white">
                          <p className="text-sm font-medium text-gray-700 mb-4">
                            Opciones de descarga:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <button
                              disabled={downloadingBatch !== null}
                              onClick={() => handleDownload(batch, "full")}
                              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm shadow-blue-100 group"
                            >
                              {downloadingBatch === `${batch.id}_full` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Archive className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              )}
                              ZIP Completo
                            </button>
                            <button
                              disabled={downloadingBatch !== null}
                              onClick={() =>
                                handleDownload(batch, "certificates")
                              }
                              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600 transition-all disabled:opacity-50 group"
                            >
                              {downloadingBatch ===
                              `${batch.id}_certificates` ? (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              ) : (
                                <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              )}
                              Certificados
                            </button>
                            <button
                              disabled={downloadingBatch !== null}
                              onClick={() => handleDownload(batch, "carnets")}
                              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600 transition-all disabled:opacity-50 group"
                            >
                              {downloadingBatch === `${batch.id}_carnets` ? (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              ) : (
                                <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              )}
                              Carnets
                            </button>
                            <button
                              disabled={downloadingBatch !== null}
                              onClick={() => handleDownload(batch, "documents")}
                              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600 transition-all disabled:opacity-50 group"
                            >
                              {downloadingBatch === `${batch.id}_documents` ? (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              ) : (
                                <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              )}
                              Doc. Adic.
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
