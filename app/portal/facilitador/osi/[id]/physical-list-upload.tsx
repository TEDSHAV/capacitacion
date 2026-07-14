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
  ScanLine
} from "lucide-react";
import { 
  uploadOSIAttachment, 
  getOSIAttachments, 
  deleteOSIAttachment 
} from "@/app/actions/facilitador-portal";
import { compressImage } from "@/lib/image-compression.client";
import { OSIAttachment } from "@/types";

interface PhysicalListUploadProps {
  osiId: number;
  facilitadorId: number;
  onAttachmentCountChange?: (count: number) => void;
  onScanAttachment: (attachment: OSIAttachment) => void;
  onFileReadyToScan?: (file: File, attachment: OSIAttachment) => void;
  onStatusChange?: (status: string | null) => void;
}

export const PhysicalListUpload = ({ osiId, facilitadorId, onAttachmentCountChange, onScanAttachment, onFileReadyToScan, onStatusChange }: PhysicalListUploadProps) => {
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
    const result = await getOSIAttachments(osiId, facilitadorId);
    if (result.data) {
      setAttachments(result.data as OSIAttachment[]);
      onAttachmentCountChange?.(result.data.length);
    } else {
      onAttachmentCountChange?.(0);
    }
    setLoading(false);
  }, [osiId, facilitadorId, onAttachmentCountChange]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log("[Upload] handleFileUpload: no files selected");
      return;
    }

    console.log(`[Upload] handleFileUpload START: ${files.length} file(s)`);
    setUploading(true);
    setError(null);
    setUploadSuccess(false);
    onStatusChange?.("Subiendo archivo...");

    // Capture files array BEFORE resetting input — on mobile browsers,
    // setting e.target.value = "" clears the FileList reference, resulting
    // in an empty upload loop and a false success toast.
    const fileArray = Array.from(files);

    // Reset input so same file can be re-selected later
    e.target.value = "";

    let allSuccess = true;
    let lastUploadedAttachment: OSIAttachment | null = null;
    let lastUploadedFile: File | null = null;
    for (const file of fileArray) {
      try {
        // Compress images client-side before uploading
        onStatusChange?.("Comprimiendo imagen...");
        const compressedFile = await compressImage(file, {
          maxWidth: 2000,
          maxHeight: 2000,
          quality: 0.8,
        });

        console.log(`[Upload] Compressed: ${file.name} -> ${compressedFile.size} bytes`);
        const formData = new FormData();
        formData.append("file", compressedFile);

        onStatusChange?.("Subiendo al servidor...");
        const result = await uploadOSIAttachment(osiId, facilitadorId, formData);
        if (result.error) {
          console.log(`[Upload] Upload error: ${result.error}`);
          setError(result.error);
          onStatusChange?.(null);
          allSuccess = false;
          break;
        }
        if (result.data) {
          console.log(`[Upload] Upload success: ${result.data.file_name}, id=${result.data.id}`);
          lastUploadedAttachment = result.data;
          // Keep the in-memory compressed file so we can scan it directly
          // without re-downloading it from the storage public URL
          lastUploadedFile = compressedFile;
        } else {
          console.warn(`[Upload] Upload returned NO data! keys=${JSON.stringify(Object.keys(result || {}))}, success=${result?.success}, error=${result?.error}`);
        }
      } catch (err) {
        console.error(`[Upload] CATCH error in upload loop: ${err instanceof Error ? err.message : String(err)}`);
        setError("Error al procesar el archivo. Intenta de nuevo.");
        onStatusChange?.(null);
        allSuccess = false;
        break;
      }
    }

    if (allSuccess) {
      console.log(`[Upload] allSuccess=true, hasAttachment=${!!lastUploadedAttachment}, hasFile=${!!lastUploadedFile}`);
      setUploadSuccess(true);

      // Trigger the scan IMMEDIATELY using data we already have in memory.
      // Do NOT wait on getOSIAttachments here - that's only needed to refresh
      // the thumbnail list UI, not to start scanning. Waiting on it previously
      // caused the flow to get stuck if that fetch was slow/hung.
      if (lastUploadedAttachment && lastUploadedFile) {
        console.log(`[Upload] Triggering scan: file=${lastUploadedFile.name}, hasOnFileReadyToScan=${!!onFileReadyToScan}`);
        onStatusChange?.("Archivo listo. Abriendo escáner...");
        if (onFileReadyToScan) {
          onFileReadyToScan(lastUploadedFile, lastUploadedAttachment);
        } else {
          console.log(`[Upload] Falling back to onScanAttachment`);
          onScanAttachment(lastUploadedAttachment);
        }
      } else {
        onStatusChange?.(null);
      }

      // Refresh the attachment list in the background (non-blocking) so
      // thumbnails/list UI stay in sync. Failure here should not affect scanning.
      getOSIAttachments(osiId, facilitadorId)
        .then((fetchResult) => {
          if (fetchResult.data) {
            const withUrls = fetchResult.data as OSIAttachment[];
            setAttachments(withUrls);
            onAttachmentCountChange?.(withUrls.length);
          }
        })
        .catch((err) => {
          console.error("[Upload] Background attachment list refresh failed:", err);
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

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
      <div className="p-3 sm:p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-600" />
            Cargar Listas Físicas
            <span className="text-[10px] font-bold uppercase text-red-600 bg-red-50 px-1.5 py-0.5 rounded ml-1">Requerido</span>
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Sube fotos o PDFs de las listas de asistencia firmadas. Las imágenes se comprimen automáticamente.
          </p>
        </div>
        
        <div className="relative w-full sm:w-auto">
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          <Button 
            variant="outline" 
            size="sm" 
            disabled={uploading}
            className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 h-8 text-xs w-full sm:w-auto"
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
                {/* Thumbnail or file icon */}
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

                {/* File info */}
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

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onScanAttachment(att)}
                    className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-md transition-colors whitespace-nowrap"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    Escanear
                  </button>
                  <button
                    onClick={() => handleDelete(att.id, att.storage_path)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
