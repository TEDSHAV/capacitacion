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
  AlertCircle
} from "lucide-react";
import { 
  uploadOSIAttachment, 
  getOSIAttachments, 
  deleteOSIAttachment 
} from "@/app/actions/facilitador-portal";
import { OSIAttachment } from "@/types";

interface PhysicalListUploadProps {
  osiId: number;
  facilitadorId: number;
}

export const PhysicalListUpload = ({ osiId, facilitadorId }: PhysicalListUploadProps) => {
  const [attachments, setAttachments] = useState<OSIAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttachments = useCallback(async () => {
    setLoading(true);
    const result = await getOSIAttachments(osiId, facilitadorId);
    if (result.data) {
      setAttachments(result.data as OSIAttachment[]);
    }
    setLoading(false);
  }, [osiId, facilitadorId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadOSIAttachment(osiId, facilitadorId, formData);
      if (result.error) {
        setError(result.error);
        break;
      }
    }

    setUploading(false);
    fetchAttachments();
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
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mt-6 shadow-sm">
      <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-600" />
            Cargar Listas Físicas (Opcional)
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Sube fotos o PDFs de las listas de asistencia firmadas.
          </p>
        </div>
        
        <div className="relative">
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
            className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 h-8 text-xs"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5 mr-2" />
            )}
            Subir Archivo
          </Button>
        </div>
      </div>

      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-700 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 text-blue-200 animate-spin" />
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-lg">
            <Upload className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">
              No hay archivos cargados todavía.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attachments.map((att) => (
              <div 
                key={att.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-100 transition-colors group"
              >
                <div className="w-10 h-10 bg-white rounded-md border border-gray-100 flex items-center justify-center shrink-0">
                  {att.file_type.includes("pdf") ? (
                    <FileText className="w-5 h-5 text-red-400" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate" title={att.file_name}>
                    {att.file_name}
                  </p>
                  <a 
                    href={att.publicUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-600 hover:underline"
                  >
                    Ver archivo
                  </a>
                </div>
                <button
                  onClick={() => handleDelete(att.id, att.storage_path)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
