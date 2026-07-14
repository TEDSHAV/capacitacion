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
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { getCertificatesByOSIAction } from "@/app/actions/certificados";
import { getAcknowledgmentByOSI } from "@/app/actions/facilitador-portal";
import {
  downloadBatchAction,
  DownloadChoice,
} from "@/lib/batch-download-utils";
import OSICompleteFormat from "./osi-complete-format";

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
  const [acknowledgment, setAcknowledgment] = useState<any>(null);

  useEffect(() => {
    if (osi) {
      loadCertificates();
      loadAcknowledgment();
    }
  }, [osi]);

  const loadAcknowledgment = async () => {
    if (!osi) return;
    try {
      const result = await getAcknowledgmentByOSI(osi.id_osi);
      if (result.data) {
        setAcknowledgment(result.data);
      } else {
        setAcknowledgment(null);
      }
    } catch (error) {
      console.error("Error loading acknowledgment:", error);
      setAcknowledgment(null);
    }
  };

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
      const results = await downloadBatchAction(
        choice,
        batch.certificates,
        osi,
        batch.course,
        batch.date,
      );

      if (!results.success) {
        const errorMsg = results.errors.length > 0 
          ? results.errors.join("\n") 
          : "Ocurrió un error desconocido al generar los archivos.";
        alert("Atención:\n" + errorMsg);
      } else if (results.errors.length > 0) {
        // Some items failed but the process continued
        alert("Descarga completada con algunas observaciones:\n" + results.errors.join("\n"));
      }
    } catch (error) {
      alert(
        "Error fatal al descargar el lote: " +
          (error instanceof Error ? error.message : "Error desconocido"),
      );
    } finally {
      setDownloadingBatch(null);
    }
  };

  if (!osi) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = date.getUTCDate().toString().padStart(2, '0');
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateString || "-";
    }
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Background overlay */}
      <div className="fixed inset-0 transition-opacity" onClick={onClose} aria-hidden="true" />

      {/* Modal panel */}
      <div className="relative w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-gray-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-xl">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900" id="modal-title">
                  Visor de Orden de Servicio
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{osi.nro_osi}</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-xs text-gray-500 font-semibold truncate max-w-[300px]">{osi.nombre_empresa}</span>
                  {acknowledgment ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-100" title={`Confirmado el ${new Date(acknowledgment.acknowledged_at).toLocaleString()}`}>
                      <ShieldCheck className="w-3 h-3" />
                      Disclaimer confirmado por {acknowledgment.facilitadores?.nombre_apellido || "N/A"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                      <ShieldAlert className="w-3 h-3" />
                      Disclaimer pendiente
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 p-2 transition-all hover:rotate-90"
              onClick={onClose}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-100 flex-none">
          <div className="flex gap-1">
            <button
              onClick={() => setExpandedSection("info")}
              className={`px-5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                expandedSection === "info"
                  ? "bg-white text-blue-700 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:bg-gray-200"
              }`}
            >
              Documento Principal
            </button>
            <button
              onClick={() => setExpandedSection("documents")}
              className={`px-5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                expandedSection === "documents"
                  ? "bg-white text-blue-700 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:bg-gray-200"
              }`}
            >
              Archivos Generados
              {batches.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  expandedSection === "documents" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  {batches.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="bg-gray-200/50 p-4 sm:p-8 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
          <div className="max-w-3xl mx-auto">
            {expandedSection === "info" ? (
              <div className="bg-white shadow-xl ring-1 ring-black/5 rounded-sm overflow-hidden">
                <OSICompleteFormat osi={osi} />
              </div>
            ) : (
              /* Generated Documents Section */
              <div className="space-y-6">
                {loadingCerts ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                    <p className="text-gray-500 font-medium text-sm">Buscando documentos...</p>
                  </div>
                ) : batches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200 text-center px-4 shadow-sm">
                    <Archive className="w-12 h-12 text-gray-300 mb-4" />
                    <h5 className="text-lg font-bold text-gray-900">Sin Archivos</h5>
                    <p className="text-gray-500 max-w-xs mt-1 text-sm leading-relaxed">
                      Esta OSI aún no tiene certificados o carnets generados en el sistema.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {batches.map((batch) => (
                      <div
                        key={batch.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:border-blue-300 transition-all hover:shadow-md"
                      >
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-100 p-2 rounded-lg">
                                <Archive className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h5 className="font-bold text-gray-900 text-sm">{batch.course}</h5>
                                <p className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                                  <Calendar className="w-3 h-3" />
                                  Emitido el {formatDate(batch.date)}
                                </p>
                              </div>
                            </div>
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-100">
                              {batch.certificates.length} Participantes
                            </span>
                          </div>
                        </div>
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <button
                              disabled={downloadingBatch !== null}
                              onClick={() => handleDownload(batch, "full")}
                              className="flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50 group"
                            >
                              {downloadingBatch === `${batch.id}_full` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                              ZIP
                            </button>
                            <button
                              disabled={downloadingBatch !== null}
                              onClick={() => handleDownload(batch, "certificates")}
                              className="flex items-center justify-center gap-2 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:border-blue-500 hover:text-blue-600 transition-all disabled:opacity-50"
                            >
                              Certificados
                            </button>
                            <button
                              disabled={downloadingBatch !== null}
                              onClick={() => handleDownload(batch, "carnets")}
                              className="flex items-center justify-center gap-2 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:border-blue-500 hover:text-blue-600 transition-all disabled:opacity-50"
                            >
                              Carnets
                            </button>
                            <button
                              disabled={downloadingBatch !== null}
                              onClick={() => handleDownload(batch, "documents")}
                              className="flex items-center justify-center gap-2 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:border-blue-500 hover:text-blue-600 transition-all disabled:opacity-50"
                            >
                              Docs
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
        </div>

        {/* Footer Action Bar */}
        <div className="bg-white border-t border-gray-100 px-6 py-3 flex justify-end flex-none">
          <button
            type="button"
            className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95"
            onClick={onClose}
          >
            Cerrar Visor
          </button>
        </div>
      </div>
    </div>
  );
}
