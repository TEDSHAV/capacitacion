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
  Receipt,
  Layers,
  Calendar,
} from "lucide-react";
import {
  uploadOSIAttachment,
  getOSIAttachments,
  deleteOSIAttachment,
} from "@/app/actions/facilitador-portal";
import { compressImage } from "@/lib/image-compression.client";
import { OSIAttachment } from "@/types";

export interface SessionInfoOption {
  nro_sesion: number;
  fecha?: string | null;
}

interface AttachmentUploadSectionProps {
  osiId: number;
  facilitadorId: number;
  category: string;
  nroSesion?: number;
  sessionDate?: string | null;
  availableSessions?: SessionInfoOption[];
  onSessionChange?: (ses: number) => void;
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
  disabled?: boolean;
  isFinal?: boolean;
}

function formatSessionDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }
  try {
    return new Date(dateStr).toLocaleDateString("es-VE");
  } catch {
    return dateStr;
  }
}

export const AttachmentUploadSection = ({
  osiId,
  facilitadorId,
  category,
  nroSesion,
  sessionDate,
  availableSessions,
  onSessionChange,
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
  disabled = false,
  isFinal = false,
}: AttachmentUploadSectionProps) => {
  const [attachments, setAttachments] = useState<OSIAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Pre-upload session confirmation modal state
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [chosenSession, setChosenSession] = useState<number>(nroSesion ?? 1);

  // Sync chosenSession whenever nroSesion prop changes
  useEffect(() => {
    if (nroSesion != null) {
      setChosenSession(nroSesion);
    }
  }, [nroSesion]);

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
    let ignore = false;
    getOSIAttachments(osiId, facilitadorId, category, nroSesion).then((result) => {
      if (ignore) return;
      if (result.data) {
        setAttachments(result.data as OSIAttachment[]);
        onAttachmentCountChange?.(result.data.length);
      } else {
        onAttachmentCountChange?.(0);
      }
      setLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, [osiId, facilitadorId, category, nroSesion, onAttachmentCountChange]);

  const executeUpload = async (fileArray: File[], sessionSlot: number) => {
    setUploading(true);
    setError(null);
    setUploadSuccess(false);
    onStatusChange?.(`Subiendo ${category === "lista_asistencia" ? "lista" : "archivo"}...`);

    // Client-side file size guard: reject files > 15MB before any network round-trip
    const CLIENT_MAX_FILE_SIZE = 15 * 1024 * 1024;
    const oversized = fileArray.filter((f) => f.size > CLIENT_MAX_FILE_SIZE);
    if (oversized.length > 0) {
      setError(
        `Archivo(s) demasiado grande(s): ${oversized.map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join(", ")}. Máximo 15MB.`,
      );
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
        const compressedFile = (await compressImage(file, {
          maxWidth: 2000,
          maxHeight: 2000,
          quality: 0.8,
        })) as File;

        const formData = new FormData();
        formData.append("file", compressedFile);

        onStatusChange?.("Subiendo al servidor...");
        const result = await uploadOSIAttachment(
          osiId,
          facilitadorId,
          formData,
          category,
          sessionSlot,
        );
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
        onStatusChange?.(null);
        onFileReadyToScan(lastUploadedFile, lastUploadedAttachment);
      } else if (lastUploadedAttachment && onScanAttachment) {
        onScanAttachment(lastUploadedAttachment);
      } else {
        onStatusChange?.(null);
      }

      getOSIAttachments(osiId, facilitadorId, category, sessionSlot)
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    e.target.value = "";

    // If multi-session, show confirmation modal to verify target session
    if (availableSessions && availableSessions.length > 1) {
      setPendingFiles(fileArray);
      setChosenSession(nroSesion ?? availableSessions[0].nro_sesion);
      return;
    }

    executeUpload(fileArray, nroSesion ?? 1);
  };

  const handleDelete = async (id: string, path: string) => {
    if (disabled) return;
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
    <>
      {/* ─── Pre-Upload Session Target Confirmation Modal ─── */}
      {pendingFiles && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-sky-50 to-blue-50/60 border-b border-sky-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Confirmar Sesión de Destino
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Verifica a qué sesión corresponden estos archivos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingFiles(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-2">
                  Selecciona la sesión a la que vas a cargar ({pendingFiles.length} archivo{pendingFiles.length > 1 ? "s" : ""}):
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {(availableSessions || []).map((s) => (
                    <button
                      key={s.nro_sesion}
                      type="button"
                      onClick={() => setChosenSession(s.nro_sesion)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        chosenSession === s.nro_sesion
                          ? "border-sky-500 bg-sky-50 text-sky-950 ring-2 ring-sky-300 font-bold"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            chosenSession === s.nro_sesion
                              ? "bg-sky-600 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {s.nro_sesion}
                        </span>
                        <span className="text-xs">Sesión {s.nro_sesion}</span>
                      </div>
                      {s.fecha && (
                        <span className="text-[11px] text-slate-500 font-normal flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatSessionDate(s.fecha)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Archivos a subir:
                </span>
                <div className="max-h-24 overflow-y-auto space-y-0.5 text-[11px]">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="truncate text-slate-700">
                      • {f.name} ({(f.size / 1024).toFixed(0)} KB)
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingFiles(null)}
                className="h-10 text-xs text-slate-700 border-slate-300 hover:bg-white flex-1 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const filesToUpload = pendingFiles;
                  const ses = chosenSession;
                  setPendingFiles(null);
                  if (onSessionChange && ses !== nroSesion) {
                    onSessionChange(ses);
                  }
                  executeUpload(filesToUpload, ses);
                }}
                className="h-10 text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold flex-1 shadow-xs cursor-pointer"
              >
                Confirmar y Subir a Sesión {chosenSession}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <div className="p-3 sm:p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 flex-wrap">
              {category === "factura" ? (
                <Receipt className="w-4 h-4 text-sky-600" />
              ) : (
                <ImageIcon className="w-4 h-4 text-blue-600" />
              )}
              {title}
              {badge && (
                <span className={`text-[10px] font-bold uppercase ${badgeClasses[badgeColor]} px-1.5 py-0.5 rounded ml-1`}>
                  {badge}
                </span>
              )}
              {nroSesion != null && (
                <span className="text-[10px] font-bold bg-sky-600 text-white px-2.5 py-0.5 rounded-md shadow-2xs flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Sesión {nroSesion}
                </span>
              )}
              {disabled ? (
                <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                  Solo Lectura
                </span>
              ) : isFinal ? (
                <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                  Servicio Finalizado (Cargas Adicionales Habilitadas)
                </span>
              ) : null}
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5">{description}</p>
          </div>

          <div className="relative w-full sm:w-auto" id={tourId}>
            {!disabled && (
              <input
                type="file"
                multiple
                accept={accept}
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
              />
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={uploading || disabled}
              className={`h-11 text-sm w-full sm:w-auto transition-colors ${
                disabled
                  ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                  : isFinal
                    ? "bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100 cursor-pointer font-bold shadow-2xs"
                    : "bg-white border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
              }`}
            >
              {disabled ? (
                <span>Carga Bloqueada</span>
              ) : uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : isFinal ? (
                <>
                  <Plus className="w-3.5 h-3.5 mr-2 text-sky-600" />
                  Cargar Soporte Adicional
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

        {/* Dedicated prominent session destination strip */}
        {nroSesion != null && (
          <div className="px-3.5 py-2 bg-gradient-to-r from-sky-50 via-sky-50/70 to-blue-50/40 border-b border-sky-100 flex items-center justify-between text-xs text-sky-950">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              <span className="text-slate-600 font-medium">Destino de carga:</span>
              <span className="font-bold bg-sky-600 text-white px-2 py-0.5 rounded text-[11px] shadow-2xs">
                Sesión {nroSesion}
              </span>
              {sessionDate && (
                <span className="text-slate-600 font-semibold">({formatSessionDate(sessionDate)})</span>
              )}
            </div>
            <span className="text-[11px] text-sky-700 font-medium hidden sm:inline">
              Archivos asociados a esta sesión
            </span>
          </div>
        )}

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
                  {showScanButton && onScanAttachment && !disabled && (
                    <button
                      onClick={() => onScanAttachment(att)}
                      className="flex items-center gap-1 px-3 py-2.5 h-10 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <ScanLine className="w-4 h-4" />
                      Escanear
                    </button>
                  )}
                  {!disabled && !isFinal && (
                    <button
                      onClick={() => handleDelete(att.id, att.storage_path)}
                      className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                      title="Eliminar archivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </>
);
};
