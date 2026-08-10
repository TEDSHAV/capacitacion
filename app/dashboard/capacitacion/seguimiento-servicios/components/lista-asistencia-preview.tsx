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
  category?: string;
  title?: string;
  showReceivedToggle?: boolean;
}

export default function AttachmentPreviewModal({
  osiId,
  nroOsi,
  nroSesion,
  isOpen,
  onClose,
  onAttachmentToggled,
  category,
  title = "Lista de Asistencia Digital",
  showReceivedToggle = true,
}: AttachmentPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ListaAsistenciaInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getListaAsistenciaInfo(osiId, category, nroSesion);
    setInfo(result);
    setLoading(false);
  }, [osiId, category, nroSesion]);

  useEffect(() => {
    if (isOpen) {
      fetchInfo();
    }
  }, [isOpen, fetchInfo]);

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

  return (
    <>
      {/* Modal overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Paperclip className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {title}
                </h2>
                <p className="text-xs text-gray-500">
                  OSI {nroOsi || `#${osiId}`} — Archivos subidos desde el portal del facilitador
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                <p className="mt-3 text-sm text-gray-500">Cargando...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="w-10 h-10 text-red-400" />
                <p className="mt-3 text-sm text-red-600">{error}</p>
              </div>
            ) : info ? (
              <div className="space-y-6">
                {/* Status banner — only for lista_asistencia category */}
                {showReceivedToggle && (
                  <div
                    className={`rounded-xl p-4 border ${
                      info.attachment_received
                        ? "bg-green-50 border-green-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {info.attachment_received ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      )}
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            info.attachment_received ? "text-green-800" : "text-amber-800"
                          }`}
                        >
                          {info.attachment_received
                            ? "Lista física marcada como recibida"
                            : "Lista física pendiente de recepción"}
                        </p>
                        {info.attachment_received_at && (
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(info.attachment_received_at)}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleToggle}
                      disabled={toggling}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        info.attachment_received
                          ? "bg-white border border-amber-300 text-amber-700 hover:bg-amber-50"
                          : "bg-amber-500 text-white hover:bg-amber-600"
                      }`}
                    >
                      {toggling ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Paperclip className="w-4 h-4" />
                      )}
                      {info.attachment_received
                        ? "Marcar como NO recibida"
                        : "Marcar como recibida"}
                    </button>
                  </div>
                </div>
                )}

                {/* Attachments gallery */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-3">
                    Archivos subidos ({info.attachments.length})
                  </h3>
                  {info.attachments.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                      <ImageIcon className="w-10 h-10 text-gray-300 mx-auto" />
                      <p className="mt-2 text-sm text-gray-500">
                        No hay archivos de lista de asistencia subidos
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        El facilitador puede subir fotos/PDFs desde su portal
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {info.attachments.map((att) => (
                        <AttachmentCard
                          key={att.id}
                          attachment={att}
                          onClick={() => setLightboxUrl(att.publicUrl || null)}
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
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          {lightboxUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) ? (
            <img
              src={lightboxUrl}
              alt="Lista de asistencia"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <iframe
              src={lightboxUrl}
              className="w-full h-full bg-white rounded-lg"
              title="Lista de asistencia"
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
  onClick,
}: {
  attachment: OSIAttachment;
  onClick: () => void;
}) {
  const isImage = attachment.file_type?.startsWith("image/");
  const fileSize = attachment.file_size
    ? `${(attachment.file_size / 1024).toFixed(0)} KB`
    : "";

  return (
    <button
      onClick={onClick}
      className="group relative bg-gray-50 rounded-xl border border-gray-200 overflow-hidden hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="aspect-square flex items-center justify-center bg-gray-100">
        {isImage && attachment.publicUrl ? (
          <img
            src={attachment.publicUrl}
            alt={attachment.file_name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <FileText className="w-10 h-10 text-gray-400" />
        )}
      </div>
      <div className="p-2 text-left">
        <p className="text-xs font-medium text-gray-700 truncate">
          {attachment.file_name}
        </p>
        {fileSize && (
          <p className="text-[10px] text-gray-400 mt-0.5">{fileSize}</p>
        )}
      </div>
    </button>
  );
}
