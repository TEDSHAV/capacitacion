"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
  Loader2,
  X,
  Plus,
  AlertCircle,
  CheckCircle2,
  ScanLine,
} from "lucide-react";
import {
  uploadOSIAttachment,
  getOSIAttachments,
  deleteOSIAttachment,
} from "@/app/actions/facilitador-portal";
import { compressImage } from "@/lib/image-compression.client";
import { OSIAttachment } from "@/types";

interface AttachmentUploadSectionProps {
  osiId: number;
  facilitadorId: number;
  category: string;
  nroSesion?: number;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: "red" | "blue" | "green";
  accept?: string;
  imageOnly?: boolean;
  onAttachmentCountChange?: (count: number) => void;
  onScanAttachment?: (attachment: OSIAttachment) => void;
  onFileReadyToScan?: (file: File, attachment: OSIAttachment) => void;
  onStatusChange?: (status: string | null) => void;
  showScanButton?: boolean;
  tourId?: string;
}

export const AttachmentUploadSection = ({
  osiId,
  facilitadorId,
  category,
  nroSesion,
  title,
  description,
  badge,
  badgeColor = "blue",
  accept = "image/*,application/pdf",
  imageOnly = false,
  onAttachmentCountChange,
  onScanAttachment,
  onFileReadyToScan,
  onStatusChange,
  showScanButton = false,
  tourId,
}: AttachmentUploadSectionProps) => {
  const [attachments, setAttachments] = useState<OSIAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => setUploadSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadSuccess]);

  const fetchAttachments = useCallback(async () => {
    setLoading(true);
    const result = await getOSIAttachments(osiId, facilitadorId, category, nroSesion);
    if (result.data) {
      setAttachments(result.data as OSIAttachment[]);
      onAttachmentCountChange?.(result.data.length);
    } else {
      onAttachmentCountChange?.(0);
    }
    setLoading(false);
  }, [osiId, facilitadorId, category, nroSesion, onAttachmentCountChange]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadSuccess(false);
    onStatusChange?.(`Subiendo ${category === "lista_asistencia" ? "lista" : "archivo"}...`);

    const fileArray = Array.from(files);
    e.target.value = "";

    // Client-side file size guard: reject files > 15MB before any network round-trip
    const CLIENT_MAX_FILE_SIZE = 15 * 1024 * 1024;
    const oversized = fileArray.filter((f) => f.size > CLIENT_MAX_FILE_SIZE);
    if (oversized.length > 0) {
      setError(`Archivo(s) demasiado grande(s): ${oversized.map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join(", ")}. Máximo 15MB.`);
      setUploading(false);
      onStatusChange?.(null);
      return;
    }

    let allSuccess = true;
    let lastUploadedAttachment: OSIAttachment | null = null;
    let lastUploadedFile: File | null = null;

    for (const file of fileArray) {
      try {
        onStatusChange?.("Comprimiendo imagen...");
        const compressedFile = await compressImage(file, {
          maxWidth: 2000,
          maxHeight: 2000,
          quality: 0.8,
        });

        const formData = new FormData();
        formData.append("file", compressedFile);

        onStatusChange?.("Subiendo al servidor...");
        const result = await uploadOSIAttachment(osiId, facilitadorId, formData, category, nroSesion);
        if (result.error) {
          setError(result.error);
          onStatusChange?.(null);
          allSuccess = false;
          break;
        }
        if (result.data) {
          lastUploadedAttachment = result.data;
          lastUploadedFile = compressedFile;
        }
      } catch (err) {
        console.error(`[Upload:${category}] Error:`, err);
        setError("Error al procesar el archivo. Intenta de nuevo.");
        onStatusChange?.(null);
        allSuccess = false;
        break;
      }
    }

    if (allSuccess) {
      setUploadSuccess(true);

      if (lastUploadedAttachment && lastUploadedFile && onFileReadyToScan) {
        onStatusChange?.("Archivo listo. Abriendo escáner...");
        onFileReadyToScan(lastUploadedFile, lastUploadedAttachment);
      } else if (lastUploadedAttachment && onScanAttachment) {
        onScanAttachment(lastUploadedAttachment);
      } else {
        onStatusChange?.(null);
      }

      getOSIAttachments(osiId, facilitadorId, category, nroSesion)
        .then((fetchResult) => {
          if (fetchResult.data) {
            setAttachments(fetchResult.data as OSIAttachment[]);
            onAttachmentCountChange?.(fetchResult.data.length);
          }
        })
        .catch((err) => {
          console.error(`[Upload:${category}] Background refresh failed:`, err);
        });
    } else {
      fetchAttachments();
    }
    setUploading(false);
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este archivo?")) return;

    const result = await deleteOSIAttachment(id, path);
    if (result.success) {
      fetchAttachments();
    } else {
      setError(result.error || "Error al eliminar el archivo");
    }
  };

  const badgeClasses = {
    red: "text-red-600 bg-red-50",
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
      <div className="p-3 sm:p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 flex-wrap">
            <ImageIcon className="w-4 h-4 text-blue-600" />
            {title}
            {badge && (
              <span className={`text-[10px] font-bold uppercase ${badgeClasses[badgeColor]} px-1.5 py-0.5 rounded ml-1`}>
                {badge}
              </span>
            )}
            {nroSesion != null && (
              <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                Sesión {nroSesion}
              </span>
            )}
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">{description}</p>
        </div>

        <div className="relative w-full sm:w-auto" id={tourId}>
          <input
            type="file"
            multiple
            accept={accept}
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 h-11 text-sm w-full sm:w-auto"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 mr-2" />
                Subir Archivo
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {uploadSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">Archivo subido correctamente.</span>
            <button onClick={() => setUploadSuccess(false)} className="ml-auto">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 text-blue-200 animate-spin" />
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">
              No hay archivos cargados todavía.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors group"
              >
                <div className="w-10 h-10 rounded-md border border-gray-200 overflow-hidden shrink-0 bg-white">
                  {att.file_type.includes("pdf") ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-red-400" />
                    </div>
                  ) : att.publicUrl ? (
                    <img
                      src={att.publicUrl}
                      alt={att.file_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-blue-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate" title={att.file_name}>
                    {att.file_name}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={att.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      Ver archivo
                    </a>
                    {att.file_size > 0 && (
                      <span className="text-[10px] text-gray-400">
                        {(att.file_size / 1024).toFixed(0)} KB
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {showScanButton && onScanAttachment && (
                    <button
                      onClick={() => onScanAttachment(att)}
                      className="flex items-center gap-1 px-3 py-2.5 h-10 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-md transition-colors whitespace-nowrap"
                    >
                      <ScanLine className="w-4 h-4" />
                      Escanear
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(att.id, att.storage_path)}
                    className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
