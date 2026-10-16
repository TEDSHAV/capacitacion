"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Loader2,
  Paperclip,
  CheckCircle2,
  Image as ImageIcon,
  FileText,
  Calendar,
  AlertCircle,
  Download,
  Eye,
  FileSpreadsheet,
  Award,
  ExternalLink,
} from "lucide-react";
import {
  getListaAsistenciaInfo,
  toggleAttachmentReceived,
  type ListaAsistenciaInfo,
} from "@/app/actions/capacitacion-proceso-steps";
import type { OSIAttachment } from "@/types";

interface AttachmentPreviewModalProps {
  osiId: number;
  nroOsi?: string;
  nroSesion?: number;
  isOpen: boolean;
  onClose: () => void;
  onAttachmentToggled?: (received: boolean) => void;
  onOpenAuditWorkspace?: (osiId: number) => void;
  category?: string;
  title?: string;
  showReceivedToggle?: boolean;
}

const CATEGORY_NAMES: Record<string, { label: string; icon: typeof Paperclip; color: string }> = {
  lista_asistencia: { label: "Lista de Asistencia", icon: FileSpreadsheet, color: "bg-blue-50 text-blue-700 border-blue-200" },
  hoja_calificacion: { label: "Hoja de Calificación", icon: Award, color: "bg-amber-50 text-amber-700 border-amber-200" },
  material_fotografico: { label: "Registro Fotográfico", icon: ImageIcon, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export default function AttachmentPreviewModal({
  osiId,
  nroOsi,
  nroSesion,
  isOpen,
  onClose,
  onAttachmentToggled,
  onOpenAuditWorkspace,
  category,
  title = "Soportes y Documentos de la OSI",
  showReceivedToggle = true,
}: AttachmentPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ListaAsistenciaInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(category || "all");

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Fetch all attachments for this OSI to enable quick client-side category switching
    const result = await getListaAsistenciaInfo(osiId, undefined, nroSesion);
    setInfo(result);
    setLoading(false);
  }, [osiId, nroSesion]);

  useEffect(() => {
    if (isOpen) {
      setActiveCategory(category || "all");
      fetchInfo();
    }
  }, [isOpen, category, fetchInfo]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const result = await toggleAttachmentReceived(osiId, nroSesion);
      if (result.success && result.attachment_received !== undefined) {
        setInfo((prev) =>
          prev
            ? {
                ...prev,
                attachment_received: result.attachment_received!,
                attachment_received_at: result.attachment_received
                  ? new Date().toISOString()
                  : null,
              }
            : prev,
        );
        onAttachmentToggled?.(result.attachment_received);
      } else if (result.error) {
        setError(result.error);
      }
    } finally {
      setToggling(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const allAttachments = info?.attachments || [];
  const asistenciaCount = allAttachments.filter((a) => a.category === "lista_asistencia").length;
  const calificacionCount = allAttachments.filter((a) => a.category === "hoja_calificacion").length;
  const fotosCount = allAttachments.filter((a) => a.category === "material_fotografico").length;

  const filteredAttachments = allAttachments.filter((att) => {
    if (activeCategory === "all") return true;
    return att.category === activeCategory;
  });

  return (
    <>
      {/* Modal overlay */}
      <div
        className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-200">
                <Paperclip className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {title}
                </h2>
                <p className="text-xs text-gray-500">
                  OSI {nroOsi || `#${osiId}`} {nroSesion ? `(Sesión ${nroSesion})` : ""} — Documentos y evidencias del facilitador
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onOpenAuditWorkspace ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuditWorkspace(osiId);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                  title="Abrir revisión de notas y soportes (Pantalla dividida)"
                >
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Revisión de Notas y Soportes</span>
                  <span className="sm:hidden">Revisar</span>
                </button>
              ) : (
                <a
                  href={`/dashboard/capacitacion/auditoria-soportes/${osiId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors shadow-2xs"
                  title="Abrir revisión de notas y soportes en pestaña nueva"
                >
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Revisión de Notas y Soportes</span>
                  <ExternalLink className="w-3 h-3 text-amber-500" />
                </a>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="px-6 py-2.5 bg-gray-50/80 border-b border-gray-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCategory === "all"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              <span>Todos los archivos</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
                {allAttachments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("lista_asistencia")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCategory === "lista_asistencia"
                  ? "bg-white text-blue-900 shadow-xs border border-blue-200"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Lista de Asistencia</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                asistenciaCount > 0 ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"
              }`}>
                {asistenciaCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("hoja_calificacion")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCategory === "hoja_calificacion"
                  ? "bg-white text-amber-900 shadow-xs border border-amber-200"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Hoja de Calificación</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                calificacionCount > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"
              }`}>
                {calificacionCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("material_fotografico")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCategory === "material_fotografico"
                  ? "bg-white text-emerald-900 shadow-xs border border-emerald-200"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Fotos</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                fotosCount > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
              }`}>
                {fotosCount}
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
                <p className="mt-3 text-sm text-gray-500 font-medium">Cargando soportes...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="w-10 h-10 text-red-400" />
                <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>
              </div>
            ) : info ? (
              <div className="space-y-6">
                {/* Status banner — toggle received state */}
                {showReceivedToggle && (
                  <div
                    className={`rounded-2xl p-4 border transition-all ${
                      info.attachment_received
                        ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                        : "bg-amber-50/80 border-amber-200 text-amber-950"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          info.attachment_received
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-amber-100 text-amber-700 border-amber-200"
                        }`}>
                          {info.attachment_received ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold">
                            {info.attachment_received
                              ? "Soporte físico marcado como recibido y validado"
                              : "Soporte físico pendiente de confirmación de recepción"}
                          </p>
                          {info.attachment_received_at && (
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              Validado el {formatDate(info.attachment_received_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggle}
                        disabled={toggling}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0 shadow-2xs ${
                          info.attachment_received
                            ? "bg-white border border-amber-300 text-amber-800 hover:bg-amber-50"
                            : "bg-emerald-600 text-white hover:bg-emerald-700"
                        }`}
                      >
                        {toggling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        {info.attachment_received
                          ? "Revertir a NO recibido"
                          : "Marcar como recibido"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Attachments gallery */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900">
                      Archivos mostrados ({filteredAttachments.length})
                    </h3>
                  </div>

                  {filteredAttachments.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50/70 rounded-2xl border border-gray-200 space-y-2">
                      <ImageIcon className="w-10 h-10 text-gray-300 mx-auto" />
                      <p className="text-sm font-semibold text-gray-600">
                        No hay archivos registrados en esta categoría
                      </p>
                      <p className="text-xs text-gray-400">
                        El facilitador aún no ha subido archivos correspondientes a este tipo de soporte.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      {filteredAttachments.map((att) => (
                        <AttachmentCard
                          key={att.id}
                          attachment={att}
                          onPreview={() => setLightboxUrl(att.publicUrl || null)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <a
              href={lightboxUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
              title="Descargar archivo"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
              onClick={() => setLightboxUrl(null)}
              title="Cerrar visor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {lightboxUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) ? (
            <img
              src={lightboxUrl}
              alt="Vista previa del soporte"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <iframe
              src={lightboxUrl}
              className="w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl"
              title="Vista previa del documento"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}

function AttachmentCard({
  attachment,
  onPreview,
}: {
  attachment: OSIAttachment;
  onPreview: () => void;
}) {
  const isImage = attachment.file_type?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(attachment.file_name);
  const fileSize = attachment.file_size
    ? `${(attachment.file_size / 1024).toFixed(0)} KB`
    : "";

  const categoryMeta = attachment.category && CATEGORY_NAMES[attachment.category]
    ? CATEGORY_NAMES[attachment.category]
    : { label: attachment.category || "General", icon: Paperclip, color: "bg-slate-50 text-slate-700 border-slate-200" };

  const CatIcon = categoryMeta.icon;

  return (
    <div className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between">
      {/* Thumbnail area */}
      <div
        onClick={onPreview}
        className="aspect-4/3 flex items-center justify-center bg-slate-100 overflow-hidden cursor-pointer relative"
      >
        {isImage && attachment.publicUrl ? (
          <img
            src={attachment.publicUrl}
            alt={attachment.file_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
            <FileText className="w-10 h-10 text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">PDF Documento</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Ver soporte
          </span>
        </div>
      </div>

      {/* Info & action footer */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${categoryMeta.color}`}>
            <CatIcon className="w-3 h-3" />
            {categoryMeta.label}
          </span>
          {fileSize && (
            <span className="text-[10px] text-slate-400 font-mono">{fileSize}</span>
          )}
        </div>

        <p className="text-xs font-semibold text-slate-800 truncate" title={attachment.file_name}>
          {attachment.file_name}
        </p>

        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
          <span className="text-slate-400 text-[10px]">
            {new Date(attachment.created_at).toLocaleDateString("es-VE", { day: "2-digit", month: "short" })}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPreview}
              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
              title="Ver en pantalla completa"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            {attachment.publicUrl && (
              <a
                href={attachment.publicUrl}
                download={attachment.file_name}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Descargar archivo"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
