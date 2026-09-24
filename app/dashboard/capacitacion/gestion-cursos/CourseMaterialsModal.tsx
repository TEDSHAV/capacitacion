"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Presentation,
  FileText,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Download,
  Loader2,
  Zap,
  Sparkles,
  Info,
  AlertCircle,
  FileCheck,
} from "lucide-react";

import {
  getMaterialesByCurso,
  getMaterialKitForOSI,
  deleteMaterialDidactico,
} from "@/app/actions/material-didactico";
import {
  uploadMaterialDirectToB2,
  MaterialUploadProgress,
} from "@/lib/materiales-upload";
import type { MaterialDidactico, TipoMaterial } from "@/types/material-didactico";

interface CourseMaterialsModalProps {
  cursoId?: number;
  cursoNombre?: string;
  osiId?: number;
  osiNumber?: string;
  isOpen: boolean;
  onClose: () => void;
}

const TIPO_LABELS: Record<TipoMaterial, { label: string; icon: any; color: string }> = {
  presentacion_pptx: {
    label: "Presentación PPTX (Digital)",
    icon: Presentation,
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
  presentacion_pdf: {
    label: "Presentación Diapositivas (PDF)",
    icon: FileText,
    color: "bg-rose-50 text-rose-700 border-rose-200",
  },
  material_imprimible: {
    label: "Material Imprimible General",
    icon: FileText,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  guia_participante: {
    label: "Guía del Participante",
    icon: FileText,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  guia_facilitador: {
    label: "Guía del Facilitador",
    icon: FileText,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  evaluacion: {
    label: "Evaluación Diagnóstica / Final",
    icon: FileCheck,
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  otro: {
    label: "Otro Recurso",
    icon: FileText,
    color: "bg-gray-50 text-gray-700 border-gray-200",
  },
};

export default function CourseMaterialsModal({
  cursoId,
  cursoNombre,
  osiId,
  osiNumber,
  isOpen,
  onClose,
}: CourseMaterialsModalProps) {
  const [materials, setMaterials] = useState<MaterialDidactico[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<MaterialUploadProgress | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipoMaterial, setTipoMaterial] = useState<TipoMaterial>("presentacion_pptx");
  const [titulo, setTitulo] = useState("");
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [lastOptResult, setLastOptResult] = useState<{
    originalSize: string;
    finalSize: string;
    saved: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen && (cursoId || osiId)) {
      loadMaterials();
    }
  }, [isOpen, cursoId, osiId]);

  const loadMaterials = async () => {
    setLoading(true);
    setError(null);
    try {
      if (osiId) {
        const res = await getMaterialKitForOSI(osiId);
        if (res.error) {
          setError(res.error);
        } else {
          setMaterials(res.data?.materiales || []);
        }
      } else if (cursoId) {
        const res = await getMaterialesByCurso(cursoId);
        if (res.error) {
          setError(res.error);
        } else {
          setMaterials(res.data || []);
        }
      }
    } catch (e: any) {
      setError(e.message || "Error al cargar materiales");
    } finally {
      setLoading(false);
    }
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!titulo) {
      // Auto-populate title from filename
      setTitulo(file.name.replace(/\.[^/.]+$/, ""));
    }
    // Auto-detect type
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".pptx")) {
      setTipoMaterial("presentacion_pptx");
    } else if (lower.includes("guia") || lower.includes("guía")) {
      setTipoMaterial("guia_participante");
    } else if (lower.includes("evaluacion") || lower.includes("evaluación")) {
      setTipoMaterial("evaluacion");
    } else if (lower.endsWith(".pdf")) {
      setTipoMaterial("material_imprimible");
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setUploading(false);
    setUploadProgress(null);
    setError("Subida cancelada.");
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setSuccessMsg(null);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const record = await uploadMaterialDirectToB2(

        selectedFile,
        {
          cursoId,
          osiId,
          tipoMaterial,
          titulo: titulo || selectedFile.name,
          autoOptimize,
        },
        (progress) => {
          setUploadProgress(progress);
        },
        abortController.signal,
      );

      setSuccessMsg("¡Material guardado exitosamente!");
      if (record.es_optimizado && record.tamano_original_bytes) {
        const origMb = (record.tamano_original_bytes / (1024 * 1024)).toFixed(1);
        const finalMb = (record.file_size_bytes / (1024 * 1024)).toFixed(1);
        setLastOptResult({
          originalSize: `${origMb} MB`,
          finalSize: `${finalMb} MB`,
          saved: record.file_size_formatted,
        });
      }

      // Reset form
      setSelectedFile(null);
      setTitulo("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Reload list
      loadMaterials();
    } catch (e: any) {
      if (e.message?.includes("cancelada")) {
        setError("Subida cancelada.");
      } else {
        setError(e.message || "Error al procesar el archivo");
      }
    } finally {
      setUploading(false);
      setUploadProgress(null);
      abortControllerRef.current = null;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este material?")) return;

    setDeletingId(id);
    try {
      const res = await deleteMaterialDidactico(id);
      if (!res.success) {
        setError(res.error || "Error al eliminar material");
      } else {
        setMaterials((prev) => prev.filter((m) => m.id !== id));
        setSuccessMsg("Material eliminado con éxito");
      }
    } catch (e: any) {
      setError(e.message || "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  const displayScopeName = osiNumber
    ? `OSI #${osiNumber} ${cursoNombre ? `— ${cursoNombre}` : ""}`
    : cursoNombre || "General";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header with modern gradient accent */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-bold tracking-tight">Material Didáctico y Recursos</h3>
            </div>
            <p className="text-xs text-blue-200/80 font-medium">
              {osiNumber ? "Servicio: " : "Curso: "}{" "}
              <span className="text-white font-semibold">{displayScopeName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>


        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notifications */}
          {error && (
            <div className="flex items-center gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <div className="flex-1">
                <p className="font-semibold">{successMsg}</p>
                {lastOptResult && (
                  <p className="text-xs text-emerald-700 mt-0.5">
                    ⚡ <strong>Compresión inteligente aplicada:</strong> de {lastOptResult.originalSize} a{" "}
                    <strong>{lastOptResult.finalSize}</strong>.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Upload Form Section */}
          <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl border border-slate-200/80 shadow-sm">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
              <UploadCloud className="w-4 h-4 text-blue-600" />
              Cargar Nuevo Material Didáctico o Presentación
            </h4>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Tipo de Recurso
                  </label>
                  <select
                    value={tipoMaterial}
                    onChange={(e) => setTipoMaterial(e.target.value as TipoMaterial)}
                    className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="presentacion_pptx">📽️ Presentación PPTX (Digital)</option>
                    <option value="presentacion_pdf">📄 Diapositivas en PDF</option>
                    <option value="guia_participante">📘 Guía del Participante</option>
                    <option value="guia_facilitador">📙 Guía del Facilitador</option>
                    <option value="evaluacion">📝 Evaluación Diagnóstica / Final</option>
                    <option value="material_imprimible">🖨️ Material Imprimible General</option>
                    <option value="otro">📎 Otro Recurso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Título o Nombre Visible
                  </label>
                  <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej. Presentación Oficial 2026"
                    className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    required
                  />
                </div>
              </div>

              {/* File input container */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Archivo Digital (PPTX, PDF, DOCX, ZIP)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept=".pptx,.pdf,.docx,.zip,.xlsx,.png,.jpg,.jpeg"
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                    required
                  />
                </div>
              </div>

              {/* Optimization toggle banner if PPTX */}
              {(tipoMaterial === "presentacion_pptx" ||
                selectedFile?.name.toLowerCase().endsWith(".pptx")) && (
                <div className="flex items-start gap-3 p-3 bg-amber-50/80 border border-amber-200/80 rounded-lg">
                  <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <label className="flex items-center gap-2 font-bold text-amber-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoOptimize}
                        onChange={(e) => setAutoOptimize(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      Optimizar PPTX automáticamente (Compresión Inteligente HD)
                    </label>
                    <p className="text-amber-700/90 mt-0.5">
                      Reduce presentaciones gigantes (ej. 800 MB de NotebookLM) a ~20 MB optimizando
                      imágenes y medios internos sin pérdida perceptible en proyectores.
                    </p>
                  </div>
                </div>
              )}

              {/* Live Upload & Optimization Progress Indicator */}
              {uploading && uploadProgress && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white shadow-lg animate-in fade-in space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      {uploadProgress.stage === "optimizing" ? (
                        <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      )}
                      <span className="text-white font-bold tracking-tight">
                        {uploadProgress.statusText}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {uploadProgress.stage === "optimizing" && uploadProgress.optimizingSeconds ? (
                        <span className="text-amber-300 font-mono text-[11px] bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                          ⏱️ {uploadProgress.optimizingSeconds}s
                        </span>
                      ) : uploadProgress.speedFormatted ? (
                        <span className="text-blue-300 font-mono text-[11px] bg-blue-900/60 px-2 py-0.5 rounded border border-blue-400/30">
                          {uploadProgress.speedFormatted}
                        </span>
                      ) : null}
                      <span className="text-white font-mono font-bold text-sm">
                        {uploadProgress.percent}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-white/10 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        uploadProgress.stage === "optimizing"
                          ? "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 animate-pulse"
                          : "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                      }`}
                      style={{ width: `${Math.max(5, uploadProgress.percent)}%` }}
                    />
                  </div>

                  {uploadProgress.detailText && (
                    <p className="text-[11px] text-blue-200/90 font-medium">
                      {uploadProgress.detailText}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 border-t border-white/10">
                    <span>
                      {(uploadProgress.loaded / (1024 * 1024)).toFixed(1)} MB /{" "}
                      {(uploadProgress.total / (1024 * 1024)).toFixed(1)} MB
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelUpload}
                      className="text-rose-300 hover:text-rose-100 hover:underline font-semibold"
                    >
                      Cancelar subida
                    </button>
                  </div>
                </div>
              )}

              {/* Submit button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md hover:shadow transition disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Subir Material
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>


          {/* List of existing materials */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
              <span>Recursos Guardados para este Curso ({materials.length})</span>
            </h4>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-xs">Cargando recursos...</span>
              </div>
            ) : materials.length === 0 ? (
              <div className="py-10 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                <FileText className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">
                  No hay materiales didácticos registrados para este curso.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Sube la presentación PPTX o guías en el formulario superior.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {materials.map((item) => {
                  const meta = TIPO_LABELS[item.tipo_material] || TIPO_LABELS.otro;
                  const Icon = meta.icon;

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-200 hover:shadow-sm transition-all flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${meta.color}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900 truncate">
                              {item.titulo}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${meta.color}`}
                            >
                              {meta.label.split(" (")[0]}
                            </span>
                            {item.es_optimizado && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                                <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                Optimizado HD
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="font-semibold text-slate-700">
                              {item.file_size_formatted}
                            </span>
                            <span>•</span>
                            <span className="truncate">{item.archivo_nombre}</span>
                            <span>•</span>
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.download_url && (
                          <a
                            href={item.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={item.archivo_nombre}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Descargar
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Eliminar recurso"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              Los recursos asignados estarán disponibles automáticamente para los facilitadores en su portal.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
