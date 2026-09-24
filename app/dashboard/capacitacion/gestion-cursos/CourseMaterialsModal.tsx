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
  Film,
  Package,
  Clock,
  ArrowRight,
  Eye,
  EyeOff,
  History,
  MessageSquare,
  Lightbulb,
  Check,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

import {
  getMaterialesByCurso,
  getMaterialKitForOSI,
  deleteMaterialDidactico,
  toggleMaterialVisibility,
  getMaterialVersionHistory,
  getMaterialSugerencias,
  updateMaterialSugerenciaEstado,
} from "@/app/actions/material-didactico";
import {
  uploadMaterialDirectToB2,
  MaterialUploadProgress,
} from "@/lib/materiales-upload";
import type {
  MaterialDidactico,
  TipoMaterial,
  MaterialSugerencia,
  EstadoSugerencia,
} from "@/types/material-didactico";

interface CourseMaterialsModalProps {
  cursoId?: number;
  cursoNombre?: string;
  osiId?: number;
  osiNumber?: string;
  isOpen: boolean;
  onClose: () => void;
}

const TIPO_LABELS: Record<TipoMaterial, { label: string; icon: any; color: string; bgBadge: string }> = {
  presentacion_pptx: {
    label: "Presentación PPTX (Digital)",
    icon: Presentation,
    color: "text-amber-700 border-amber-200 bg-amber-50",
    bgBadge: "bg-amber-100 text-amber-800 border-amber-200",
  },
  presentacion_pdf: {
    label: "Presentación Diapositivas (PDF)",
    icon: FileText,
    color: "text-rose-700 border-rose-200 bg-rose-50",
    bgBadge: "bg-rose-100 text-rose-800 border-rose-200",
  },
  material_imprimible: {
    label: "Material Imprimible General",
    icon: FileText,
    color: "text-sky-700 border-sky-200 bg-sky-50",
    bgBadge: "bg-sky-100 text-sky-800 border-sky-200",
  },
  guia_participante: {
    label: "Guía del Participante",
    icon: FileText,
    color: "text-emerald-700 border-emerald-200 bg-emerald-50",
    bgBadge: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  guia_facilitador: {
    label: "Guía del Facilitador",
    icon: FileText,
    color: "text-blue-700 border-blue-200 bg-blue-50",
    bgBadge: "bg-blue-100 text-blue-800 border-blue-200",
  },
  evaluacion: {
    label: "Evaluación Diagnóstica / Final",
    icon: FileCheck,
    color: "text-indigo-700 border-indigo-200 bg-indigo-50",
    bgBadge: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  otro: {
    label: "Otro Recurso",
    icon: FileText,
    color: "text-slate-700 border-slate-200 bg-slate-50",
    bgBadge: "bg-slate-100 text-slate-800 border-slate-200",
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
  const [activeTab, setActiveTab] = useState<"materials" | "sugerencias">("materials");
  const [materials, setMaterials] = useState<MaterialDidactico[]>([]);
  const [sugerencias, setSugerencias] = useState<MaterialSugerencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<MaterialUploadProgress | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Version History Modal State
  const [selectedHistoryMaterial, setSelectedHistoryMaterial] = useState<MaterialDidactico | null>(null);
  const [versionHistoryList, setVersionHistoryList] = useState<MaterialDidactico[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipoMaterial, setTipoMaterial] = useState<TipoMaterial>("presentacion_pptx");
  const [titulo, setTitulo] = useState("");
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [visibleFacilitador, setVisibleFacilitador] = useState(true);
  const [parentMaterialId, setParentMaterialId] = useState<string>("");
  const [versionNotes, setVersionNotes] = useState("");

  const [lastOptResult, setLastOptResult] = useState<{
    originalSize: string;
    finalSize: string;
    saved: string;
    reduction?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen && (cursoId || osiId)) {
      setMaterials([]);
      setSugerencias([]);
      setSelectedFile(null);
      setTitulo("");
      setParentMaterialId("");
      setVersionNotes("");
      setError(null);
      setSuccessMsg(null);
      setLastOptResult(null);
      loadAllData();
    } else if (!isOpen) {
      setMaterials([]);
      setSugerencias([]);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, cursoId, osiId]);

  const loadAllData = async () => {
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
        const [matRes, sugRes] = await Promise.all([
          getMaterialesByCurso(cursoId),
          getMaterialSugerencias(undefined, cursoId),
        ]);
        if (matRes.error) {
          setError(matRes.error);
        } else {
          setMaterials(matRes.data || []);
        }
        if (sugRes.data) {
          setSugerencias(sugRes.data);
        }
      }
    } catch (e: any) {
      setError(e.message || "Error al cargar recursos");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!titulo) {
      setTitulo(file.name.replace(/\.[^/.]+$/, ""));
    }
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
    setError("Subida cancelada por el usuario.");
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setSuccessMsg(null);
    setLastOptResult(null);

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
          visibleFacilitador,
          parentMaterialId: parentMaterialId || undefined,
          versionNotes: versionNotes.trim() || undefined,
        },
        (progress) => {
          setUploadProgress(progress);
        },
        abortController.signal,
      );

      setSuccessMsg(
        parentMaterialId
          ? `¡Nueva versión (v${record.version}) guardada e indexada exitosamente!`
          : "¡Material guardado exitosamente!",
      );

      if (record.es_optimizado && record.tamano_original_bytes) {
        const origMb = (record.tamano_original_bytes / (1024 * 1024)).toFixed(1);
        const finalMb = (record.file_size_bytes / (1024 * 1024)).toFixed(1);
        const savedPct = Math.round(
          ((record.tamano_original_bytes - record.file_size_bytes) /
            record.tamano_original_bytes) *
            100,
        );
        setLastOptResult({
          originalSize: `${origMb} MB`,
          finalSize: `${finalMb} MB`,
          saved: record.file_size_formatted,
          reduction: `${savedPct}%`,
        });
      }

      // Reset upload form
      setSelectedFile(null);
      setTitulo("");
      setParentMaterialId("");
      setVersionNotes("");
      setVisibleFacilitador(true);
      if (fileInputRef.current) fileInputRef.current.value = "";

      loadAllData();
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

  const handleToggleVisibility = async (item: MaterialDidactico) => {
    setTogglingId(item.id);
    try {
      const nextVal = !item.visible_facilitador;
      const res = await toggleMaterialVisibility(item.id, nextVal);
      if (res.success) {
        setMaterials((prev) =>
          prev.map((m) => (m.id === item.id ? { ...m, visible_facilitador: nextVal } : m)),
        );
      } else {
        setError(res.error || "Error al actualizar visibilidad");
      }
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenVersionHistory = async (item: MaterialDidactico) => {
    setSelectedHistoryMaterial(item);
    setLoadingHistory(true);
    try {
      const res = await getMaterialVersionHistory(item.id);
      setVersionHistoryList(res.data || []);
    } catch (e: any) {
      setError(e.message || "Error al cargar versiones");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUpdateSugerenciaEstado = async (
    sugId: string,
    nuevoEstado: EstadoSugerencia,
  ) => {
    try {
      const res = await updateMaterialSugerenciaEstado(sugId, nuevoEstado);
      if (res.success) {
        setSugerencias((prev) =>
          prev.map((s) => (s.id === sugId ? { ...s, estado: nuevoEstado } : s)),
        );
      }
    } catch (e: any) {
      setError(e.message || "Error al actualizar estado de la sugerencia");
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

  const isPptxSelected =
    tipoMaterial === "presentacion_pptx" ||
    selectedFile?.name.toLowerCase().endsWith(".pptx");

  const pendingSugerenciasCount = sugerencias.filter((s) => s.estado === "pendiente").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Light & Modern Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/90 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Material Didáctico y Recursos Digitales
                </h3>
                <span className="text-[11px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full border border-sky-200">
                  SaaS Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-xl font-medium">
                {osiNumber ? "Servicio: " : "Curso: "}
                <span className="text-slate-800 font-semibold">{displayScopeName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-white border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("materials")}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "materials"
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Presentation className="w-4 h-4" />
            <span>Recursos y Presentaciones ({materials.length})</span>
          </button>

          {!osiId && (
            <button
              type="button"
              onClick={() => setActiveTab("sugerencias")}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === "sugerencias"
                  ? "border-sky-600 text-sky-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Buzón de Sugerencias</span>
              {pendingSugerenciasCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-extrabold animate-pulse">
                  {pendingSugerenciasCount}
                </span>
              )}
            </button>
          )}
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
                    ⚡ <strong>Compresión HD aplicada:</strong> de {lastOptResult.originalSize} a{" "}
                    <strong>{lastOptResult.finalSize}</strong> ({lastOptResult.reduction} de reducción).
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "materials" && (
            <>
              {/* Light Upload Form Card */}
              <div className="p-5 bg-slate-50/70 rounded-xl border border-slate-200 shadow-2xs">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <UploadCloud className="w-4 h-4 text-sky-600" />
                  Cargar Nuevo Material Didáctico o Nueva Versión
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
                        disabled={uploading}
                        className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium disabled:opacity-60"
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
                        disabled={uploading}
                        placeholder="Ej. Presentación Oficial 2026"
                        className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium disabled:opacity-60"
                        required
                      />
                    </div>
                  </div>

                  {/* Versioning and Replacement selection */}
                  {materials.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                          ¿Es una nueva versión de un material existente?
                        </label>
                        <select
                          value={parentMaterialId}
                          onChange={(e) => setParentMaterialId(e.target.value)}
                          disabled={uploading}
                          className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                        >
                          <option value="">No, es un material nuevo independiente (v1)</option>
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              Actualizar: {m.titulo} (Actualmente v{m.version})
                            </option>
                          ))}
                        </select>
                      </div>

                      {parentMaterialId && (
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                            Notas de la versión (opcional)
                          </label>
                          <input
                            type="text"
                            value={versionNotes}
                            onChange={(e) => setVersionNotes(e.target.value)}
                            disabled={uploading}
                            placeholder="Ej. Actualización de láminas 10-15 por norma 2026"
                            className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* File input container */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Archivo Digital (PPTX, PDF, DOCX, ZIP)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      disabled={uploading}
                      accept=".pptx,.pdf,.docx,.zip,.xlsx,.png,.jpg,.jpeg"
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sky-600 file:text-white hover:file:bg-sky-700 cursor-pointer disabled:opacity-60"
                      required
                    />
                  </div>

                  {/* Visibility & Optimization Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Facilitator Visibility Checkbox */}
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white">
                      <input
                        type="checkbox"
                        id="visible_check"
                        checked={visibleFacilitador}
                        onChange={(e) => setVisibleFacilitador(e.target.checked)}
                        disabled={uploading}
                        className="mt-0.5 rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                      />
                      <label htmlFor="visible_check" className="text-xs font-semibold text-slate-700 cursor-pointer">
                        Visible para facilitadores en su portal
                        <span className="block text-[10px] text-slate-500 font-normal">
                          Marcado por defecto. Desmarca si es un borrador interno.
                        </span>
                      </label>
                    </div>

                    {/* Optimization toggle banner if PPTX */}
                    {isPptxSelected ? (
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-amber-200 bg-amber-50/60">
                        <input
                          type="checkbox"
                          id="opt_check"
                          checked={autoOptimize}
                          onChange={(e) => setAutoOptimize(e.target.checked)}
                          disabled={uploading}
                          className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                        />
                        <label htmlFor="opt_check" className="text-xs font-semibold text-amber-900 cursor-pointer">
                          Optimizar PPTX automáticamente
                          <span className="block text-[10px] text-amber-700 font-normal">
                            Comprime imágenes HD y videos a 720p sin pérdida visual.
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg border border-slate-100 bg-white/50 text-[11px] text-slate-400 flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                        <span>Almacenamiento directo en Backblaze B2</span>
                      </div>
                    )}
                  </div>

                  {/* Progress dashboard during upload */}
                  {uploading && uploadProgress && (
                    <div className="p-4 rounded-xl bg-slate-900 text-white shadow-md space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Loader2 className="w-4 h-4 animate-spin text-sky-400 shrink-0" />
                          <span className="font-bold truncate text-slate-100">
                            {uploadProgress.statusText}
                          </span>
                        </div>
                        <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-sky-300">
                          {uploadProgress.percent}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-sky-500 transition-all duration-300"
                          style={{ width: `${Math.max(5, uploadProgress.percent)}%` }}
                        />
                      </div>

                      {uploadProgress.detailText && (
                        <p className="text-[11px] text-slate-400 truncate">
                          {uploadProgress.detailText}
                        </p>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleCancelUpload}
                          className="text-xs text-rose-400 hover:text-rose-200 underline font-medium"
                        >
                          Cancelar subida
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={uploading || !selectedFile}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs hover:shadow transition disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Procesando archivo...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          Subir Recurso
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* List of Registered Materials */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                  <span>Recursos Activos para este Curso ({materials.length})</span>
                </h4>

                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                    <span className="text-xs">Cargando recursos...</span>
                  </div>
                ) : materials.length === 0 ? (
                  <div className="py-10 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                    <FileText className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">
                      No hay materiales didácticos registrados para este curso.
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sube la presentación PPTX oficial o guías en el formulario superior.
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
                          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-sky-200 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3 min-w-0">
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
                                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${meta.bgBadge}`}
                                >
                                  {meta.label.split(" (")[0]}
                                </span>

                                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                                  v{item.version}
                                </span>

                                {item.es_optimizado && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                                    <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                    HD
                                  </span>
                                )}

                                {item.sugerencias_count ? item.sugerencias_count > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                                    <Lightbulb className="w-2.5 h-2.5 text-amber-600" />
                                    {item.sugerencias_count} sugerencia(s)
                                  </span>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                <span className="font-semibold text-slate-700">
                                  {item.file_size_formatted}
                                </span>
                                <span>•</span>
                                <span className="truncate max-w-[200px]">{item.archivo_nombre}</span>
                                <span>•</span>
                                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                              </div>

                              {item.version_notes && (
                                <p className="text-[11px] text-slate-600 italic mt-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                  Nota: {item.version_notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons & Visibility Switch */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {/* Interactive Visibility Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleVisibility(item)}
                              disabled={togglingId === item.id}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                item.visible_facilitador
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                              }`}
                              title="Haz clic para cambiar la visibilidad para facilitadores"
                            >
                              {togglingId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : item.visible_facilitador ? (
                                <>
                                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Visible</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Oculto</span>
                                </>
                              )}
                            </button>

                            {/* Version History Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenVersionHistory(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-medium transition-colors"
                              title="Ver historial de versiones anteriores"
                            >
                              <History className="w-3.5 h-3.5 text-slate-500" />
                              <span>Historial</span>
                            </button>

                            {/* Download Button */}
                            {item.download_url && (
                              <a
                                href={item.download_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={item.archivo_nombre}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-xs font-semibold transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Descargar</span>
                              </a>
                            )}

                            {/* Delete Button */}
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
            </>
          )}

          {/* Facilitator Suggestions Tab */}
          {activeTab === "sugerencias" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Sugerencias y Correcciones Enviadas por Facilitadores ({sugerencias.length})
                </h4>
              </div>

              {sugerencias.length === 0 ? (
                <div className="py-12 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                  <Lightbulb className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">
                    No hay sugerencias registradas para este curso todavía.
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Los facilitadores pueden enviar sugerencias desde su portal al revisar la presentación.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sugerencias.map((sug) => {
                    return (
                      <div
                        key={sug.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-xs transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900">
                                {sug.facilitador_nombre}
                              </span>
                              {sug.diapositiva_nro && (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                                  Diapositiva #{sug.diapositiva_nro}
                                </span>
                              )}
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                                {sug.tipo_sugerencia === "error_contenido"
                                  ? "⚠️ Error de contenido"
                                  : sug.tipo_sugerencia === "actualizacion_norma"
                                  ? "📜 Actualización de norma"
                                  : sug.tipo_sugerencia === "mejora_visual"
                                  ? "🎨 Mejora visual"
                                  : "💡 Propuesta de mejora"}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {new Date(sug.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              En recurso: <strong>{sug.material_titulo || "Presentación"}</strong>
                            </p>
                          </div>

                          {/* Estado selector badge */}
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                sug.estado === "implementada"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : sug.estado === "revisada"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : sug.estado === "descartada"
                                  ? "bg-slate-100 text-slate-600 border-slate-200"
                                  : "bg-amber-100 text-amber-800 border-amber-200"
                              }`}
                            >
                              {sug.estado}
                            </span>
                          </div>
                        </div>

                        {/* Comment Body */}
                        <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 border border-slate-100 leading-relaxed">
                          "{sug.comentario}"
                        </div>

                        {/* Actions to update state */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">
                            Cambiar estado:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateSugerenciaEstado(sug.id, "revisada")}
                            className="text-[11px] px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition-colors"
                          >
                            Marcar Revisada
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateSugerenciaEstado(sug.id, "implementada")}
                            className="text-[11px] px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold transition-colors"
                          >
                            Marcar Implementada
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateSugerenciaEstado(sug.id, "descartada")}
                            className="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold transition-colors"
                          >
                            Descartar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              Los facilitadores asignados a OSIs de este curso tendrán acceso directo según la visibilidad configurada.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Version History Drawer / Sub-Modal */}
      {selectedHistoryMaterial && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-sky-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Historial de Versiones: {selectedHistoryMaterial.titulo}
                </h4>
              </div>
              <button
                onClick={() => setSelectedHistoryMaterial(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loadingHistory ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
                </div>
              ) : versionHistoryList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No se encontraron versiones anteriores.
                </p>
              ) : (
                versionHistoryList.map((v) => (
                  <div
                    key={v.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      v.is_latest
                        ? "bg-sky-50/60 border-sky-200 ring-1 ring-sky-300"
                        : "bg-slate-50 border-slate-200 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Versión {v.version}
                        </span>
                        {v.is_latest && (
                          <span className="text-[10px] font-bold bg-sky-600 text-white px-2 py-0.5 rounded-full">
                            Activa / Más Reciente
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">
                          {new Date(v.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {v.archivo_nombre} ({v.file_size_formatted})
                      </p>
                      {v.version_notes && (
                        <p className="text-[11px] text-slate-700 italic mt-1">
                          "{v.version_notes}"
                        </p>
                      )}
                    </div>

                    {v.download_url && (
                      <a
                        href={v.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={v.archivo_nombre}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-semibold shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Descargar</span>
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedHistoryMaterial(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
