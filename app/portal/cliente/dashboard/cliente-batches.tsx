"use client";

import { Calendar, Users, ChevronDown, ChevronRight, FileStack, Download, Loader2, Eye, Award, MapPin, FileText, CloudDownload, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { ClienteBatchSummary, ClienteCertificateRow } from "@/types";
import { cacheDocument, isDocumentCached } from "@/lib/offline/offline-documents";

interface ClienteBatchesProps {
  batches: ClienteBatchSummary[];
  onBatchClick?: (batch: ClienteBatchSummary) => void;
  expandedOsi?: number | null;
  onToggleExpand?: (nroOsi: number) => void;
  expandedCertificates?: ClienteCertificateRow[];
  expandedLoading?: boolean;
  title?: string;
}

export function ClienteBatches({
  batches,
  onBatchClick,
  expandedOsi,
  onToggleExpand,
  expandedCertificates,
  expandedLoading,
  title = "Últimos Lotes Emitidos",
}: ClienteBatchesProps) {
  const [downloadingOsi, setDownloadingOsi] = useState<number | null>(null);
  const [downloadingDocs, setDownloadingDocs] = useState<number | null>(null);
  const [offlineCaching, setOfflineCaching] = useState<number | null>(null);
  const [offlineCached, setOfflineCached] = useState<Set<number>>(new Set());

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = dateString.includes("T")
      ? new Date(dateString)
      : new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("es-ES");
  };

  if (batches.length === 0) return null;

  const isExpandMode = !!onToggleExpand;

  const handleCardClick = (batch: ClienteBatchSummary) => {
    if (isExpandMode) {
      onToggleExpand(batch.nro_osi);
    } else {
      onBatchClick?.(batch);
    }
  };

  const handleSaveOffline = async (e: React.MouseEvent, batch: ClienteBatchSummary) => {
    e.stopPropagation();
    setOfflineCaching(batch.nro_osi);
    const url = `/api/batch-download-osi/${batch.nro_osi}`;
    const result = await cacheDocument(url, {
      type: "batch-osi",
      id: batch.nro_osi,
      label: `Lote OSI #${batch.nro_osi} — ${batch.course_name || "Certificados"}`,
    });
    if (result.success) {
      setOfflineCached((prev) => new Set(prev).add(batch.nro_osi));
      window.dispatchEvent(new Event("offline-docs-changed"));
    }
    setOfflineCaching(null);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
        <FileStack className="w-5 h-5 text-gray-700" />
        {title}
      </h2>
      <div className="grid gap-4">
        {batches.map((batch) => {
          const isExpanded = expandedOsi === batch.nro_osi;
          return (
            <div
              key={batch.nro_osi}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <div
                onClick={() => handleCardClick(batch)}
                className="block p-6 hover:shadow-md transition-shadow text-left w-full group cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="space-y-3 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        OSI #{batch.nro_osi}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {batch.course_name}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          {formatDate(batch.fecha_emision)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{batch.participant_count} participantes</span>
                      </div>
                      {batch.sede_names.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>
                            {batch.sede_names.length === 1
                              ? `${batch.city_names[0] || ""}${batch.city_names[0] ? " — " : ""}${batch.sede_names[0]}`
                              : "Múltiples ubicaciones"}
                          </span>
                        </div>
                      )}
                      {batch.sede_names.length === 0 && batch.city_names.length === 1 && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{batch.city_names[0]}</span>
                        </div>
                      )}
                      {batch.sede_names.length === 0 && batch.city_names.length > 1 && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>Múltiples ubicaciones</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDownloadingOsi(batch.nro_osi);
                        window.open(`/api/batch-download-osi/${batch.nro_osi}`, "_blank");
                        setTimeout(() => setDownloadingOsi(null), 3000);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex-1 sm:flex-initial"
                      title="Descargar todos los certificados y carnets de este lote"
                    >
                      {downloadingOsi === batch.nro_osi ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      Descargar Todo
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDownloadingDocs(batch.nro_osi);
                        window.open(`/api/batch-download-documents/${batch.nro_osi}`, "_blank");
                        setTimeout(() => setDownloadingDocs(null), 3000);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex-1 sm:flex-initial"
                      title="Descargar documentos adicionales (Certificación de Competencias, Nota de Entrega)"
                    >
                      {downloadingDocs === batch.nro_osi ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                      Documentos
                    </button>
                    <button
                      onClick={(e) => handleSaveOffline(e, batch)}
                      disabled={offlineCaching === batch.nro_osi}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors disabled:opacity-50 flex-1 sm:flex-initial"
                      title="Guardar lote para acceso sin conexión"
                    >
                      {offlineCaching === batch.nro_osi ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : offlineCached.has(batch.nro_osi) ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <CloudDownload className="w-3.5 h-3.5" />
                      )}
                      {offlineCached.has(batch.nro_osi) ? "Offline" : "Guardar"}
                    </button>
                    {isExpandMode ? (
                      <ChevronDown
                        className={`w-6 h-6 text-gray-300 group-hover:text-gray-900 transition-all ${isExpanded ? "rotate-180" : ""}`}
                      />
                    ) : (
                      <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-gray-900 transition-colors" />
                    )}
                  </div>
                </div>
              </div>

              {/* Inline expanded participant table */}
              {isExpandMode && isExpanded && (
                <div className="border-t border-gray-100">
                  {expandedLoading ? (
                    <div className="flex flex-col items-center py-10">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      <p className="text-sm text-gray-500 mt-2">Cargando participantes...</p>
                    </div>
                  ) : expandedCertificates && expandedCertificates.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                            <th className="px-4 py-3 text-left font-semibold">Participante</th>
                            <th className="px-4 py-3 text-left font-semibold">Cédula</th>
                            <th className="px-4 py-3 text-left font-semibold">Curso</th>
                            <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                            <th className="px-4 py-3 text-left font-semibold">Ciudad</th>
                            <th className="px-4 py-3 text-center font-semibold">Ver</th>
                            <th className="px-4 py-3 text-center font-semibold">PDF</th>
                            <th className="px-4 py-3 text-center font-semibold">Offline</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {expandedCertificates.map((cert) => (
                            <tr key={cert.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {cert.participant_nombre}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {cert.participant_nacionalidad === "extranjero" ? "E-" : "V-"}
                                {cert.participant_cedula}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {cert.course_nombre || "N/A"}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {formatDate(cert.fecha_emision)}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {cert.city_nombre_ciudad || "N/A"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <a
                                  href={`/verify-certificate/${cert.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                                  title="Ver certificado y carnets"
                                >
                                  <Eye className="w-4 h-4" />
                                </a>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <a
                                  href={`/api/generate-certificate-pdf/${cert.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center p-2 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Descargar PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <CertificateOfflineButton cert={cert} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-10">
                      <Award className="w-8 h-8 text-gray-200 mb-2" />
                      <p className="text-sm text-gray-500">
                        {typeof navigator !== "undefined" && !navigator.onLine
                          ? "No hay datos en caché para este lote. Vuelve a estar en línea y expándelo para guardarlo."
                          : "No se encontraron participantes."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CertificateOfflineButton({ cert }: { cert: ClienteCertificateRow }) {
  const [caching, setCaching] = useState(false);
  const [cached, setCached] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCaching(true);
    const url = `/api/generate-certificate-pdf/${cert.id}`;
    const result = await cacheDocument(url, {
      type: "certificate",
      id: cert.id,
      label: `Certificado — ${cert.participant_nombre} (V-${cert.participant_cedula})`,
    });
    if (result.success) {
      setCached(true);
      window.dispatchEvent(new Event("offline-docs-changed"));
    }
    setCaching(false);
  };

  return (
    <button
      onClick={handleSave}
      disabled={caching}
      className="inline-flex items-center justify-center p-2 rounded-md text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50"
      title={cached ? "Guardado para offline" : "Guardar para offline"}
    >
      {caching ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : cached ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <CloudDownload className="w-4 h-4" />
      )}
    </button>
  );
}
