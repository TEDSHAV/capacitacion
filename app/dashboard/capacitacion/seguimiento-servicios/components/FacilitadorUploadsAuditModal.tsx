"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  Loader2,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Award,
  Image as ImageIcon,
  Building2,
  Calendar,
  User,
  ArrowRight,
  Filter,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Eye,
  Download,
  ExternalLink,
} from "lucide-react";
import {
  getFacilitadorUploadsAudit,
  type FacilitadorUploadsAuditSummary,
  type OsiUploadAuditItem,
} from "@/app/actions/facilitador-uploads-audit";

interface FacilitadorUploadsAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOsiPreview: (osiId: number, nroOsi: string) => void;
  onSelectOsiInTable?: (osiId: number) => void;
}

export default function FacilitadorUploadsAuditModal({
  isOpen,
  onClose,
  onOpenOsiPreview,
  onSelectOsiInTable,
}: FacilitadorUploadsAuditModalProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FacilitadorUploadsAuditSummary | null>(null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"todos" | "pendientes_carga" | "pendientes_confirmar" | "completos">("todos");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedOsiId, setExpandedOsiId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getFacilitadorUploadsAudit();
      setSummary(res);
    } catch (e) {
      console.error("[FacilitadorUploadsAuditModal] Error loading data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Prevent background scroll
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

  // Filter items in client for lightning-fast responsiveness
  const filteredItems = useMemo(() => {
    if (!summary?.items) return [];

    let list = summary.items;

    // Filter by status mode
    if (filterMode === "pendientes_carga") {
      list = list.filter((i) => i.isPendingUpload);
    } else if (filterMode === "pendientes_confirmar") {
      list = list.filter((i) => i.isPendingConfirmation);
    } else if (filterMode === "completos") {
      list = list.filter((i) => i.isComplete);
    }

    // Filter by category
    if (selectedCategory !== "all") {
      if (selectedCategory === "lista_asistencia") {
        list = list.filter((i) => i.hasAsistencia);
      } else if (selectedCategory === "hoja_calificacion") {
        list = list.filter((i) => i.hasCalificacion);
      } else if (selectedCategory === "material_fotografico") {
        list = list.filter((i) => i.hasFotos);
      }
    }

    // Filter by text search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.nroOsi.toLowerCase().includes(q) ||
          i.nombreEmpresa.toLowerCase().includes(q) ||
          i.servicio.toLowerCase().includes(q) ||
          i.facilitadorNombre.toLowerCase().includes(q)
      );
    }

    return list;
  }, [summary, filterMode, selectedCategory, search]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50/40">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200 shadow-2xs">
                <Paperclip className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                    Auditoría y Gestión de Soportes de Facilitadores
                  </h2>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-200">
                    Capacitación
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  Consulta de adjuntos físicos, validación de listas y detección de servicios con recaudos pendientes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="p-2.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-xl transition-colors cursor-pointer border border-slate-200"
                title="Actualizar datos"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-600" : ""}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics KPI Banner */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 mt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFilterMode("todos")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  filterMode === "todos"
                    ? "bg-sky-50 border-sky-300 ring-2 ring-sky-100"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Total Servicios
                </span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{summary.totalOsis}</p>
                <span className="text-[11px] text-slate-500">{summary.totalWithUploads} con archivos</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("pendientes_carga")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  filterMode === "pendientes_carga"
                    ? "bg-amber-50 border-amber-300 ring-2 ring-amber-100"
                    : "bg-white border-slate-200 hover:bg-amber-50/50"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                  Faltan Soportes
                </span>
                <p className="text-lg font-bold text-amber-900 mt-0.5">{summary.totalPendingUploads}</p>
                <span className="text-[11px] text-amber-700 font-medium">⚠️ Asist./Calif./Fotos</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("pendientes_confirmar")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  filterMode === "pendientes_confirmar"
                    ? "bg-blue-50 border-blue-300 ring-2 ring-blue-100"
                    : "bg-white border-slate-200 hover:bg-blue-50/50"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                  Por Confirmar
                </span>
                <p className="text-lg font-bold text-blue-900 mt-0.5">{summary.totalPendingConfirmation}</p>
                <span className="text-[11px] text-blue-700 font-medium">⏳ Pendiente validación</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("completos")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  filterMode === "completos"
                    ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-100"
                    : "bg-white border-slate-200 hover:bg-emerald-50/50"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                  Soportes Completos
                </span>
                <p className="text-lg font-bold text-emerald-900 mt-0.5">{summary.totalComplete}</p>
                <span className="text-[11px] text-emerald-700 font-medium">✅ Todo recibido</span>
              </button>
            </div>
          )}
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por OSI, empresa, curso o facilitador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent placeholder-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Todos los tipos
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("lista_asistencia")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                selectedCategory === "lista_asistencia"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
              }`}
            >
              <FileSpreadsheet className="w-3 h-3" />
              <span>Asistencia</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("hoja_calificacion")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                selectedCategory === "hoja_calificacion"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
              }`}
            >
              <Award className="w-3 h-3" />
              <span>Calificación</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("material_fotografico")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                selectedCategory === "material_fotografico"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              <span>Fotos</span>
            </button>
          </div>
        </div>

        {/* List of OSIs */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
              <p className="mt-3 text-sm text-slate-500 font-medium">Consultando soportes de facilitadores...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <Paperclip className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No se encontraron servicios</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No hay resultados con los filtros y término de búsqueda seleccionados.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.osiId}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-sky-300 hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200">
                      {item.nroOsi}
                    </span>

                    {/* Overall status pill */}
                    {item.isComplete ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Soportes Completos
                      </span>
                    ) : item.isPendingUpload ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Recaudos Pendientes
                      </span>
                    ) : item.isPendingConfirmation ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        <Clock className="w-3.5 h-3.5 text-blue-600" /> Pendiente Confirmar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Planificada
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    {item.totalArchivos > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedOsiId((prev) => (prev === item.osiId ? null : item.osiId))}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border ${
                          expandedOsiId === item.osiId
                            ? "bg-slate-200 text-slate-800 border-slate-300"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        }`}
                        title={expandedOsiId === item.osiId ? "Ocultar archivos" : "Desplegar archivos"}
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>{expandedOsiId === item.osiId ? "Ocultar" : "Archivos"} ({item.totalArchivos})</span>
                        {expandedOsiId === item.osiId ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenOsiPreview(item.osiId, item.nroOsi)}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-white" />
                      <span>Ver / Gestionar Adjuntos ({item.totalArchivos})</span>
                    </button>

                    {onSelectOsiInTable && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectOsiInTable(item.osiId);
                          onClose();
                        }}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                        title="Ver en tabla de seguimiento"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  {/* Service & Company info */}
                  <div className="md:col-span-5 space-y-1">
                    <p className="font-bold text-slate-900 text-sm">{item.nombreEmpresa}</p>
                    <p className="text-slate-600 leading-tight">{item.servicio}</p>
                  </div>

                  {/* Facilitator & Session Date */}
                  <div className="md:col-span-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.facilitadorNombre}</span>
                    </div>
                    {item.fechaSesion && (
                      <div className="flex items-center gap-1.5 text-slate-500 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Fecha: {item.fechaSesion}</span>
                        </div>
                        {item.isPendingUpload && item.diasDesdeEjecucion != null && item.diasDesdeEjecucion > 3 && (
                          <span
                            className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded"
                            title="Días hábiles transcurridos desde la ejecución sin entrega completa de soportes"
                          >
                            +{item.diasDesdeEjecucion - 3}d demora facilitador
                          </span>
                        )}
                        {item.isComplete && item.diasCargaFacilitador != null && (
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                              item.diasCargaFacilitador > 3
                                ? "text-amber-800 bg-amber-50 border-amber-200"
                                : "text-emerald-700 bg-emerald-50 border-emerald-200"
                            }`}
                            title={`Soportes cargados por el facilitador en ${item.diasCargaFacilitador} días hábiles tras ejecución`}
                          >
                            {item.diasCargaFacilitador > 3
                              ? `+${item.diasCargaFacilitador - 3}d entrega`
                              : `${item.diasCargaFacilitador}d (en plazo)`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3 Upload Indicators */}
                  <div className="md:col-span-4 flex items-center justify-between sm:justify-end gap-2 flex-wrap">
                    {/* Asistencia */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        item.hasAsistencia
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                      title="Lista de Asistencia Física"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>{item.hasAsistencia ? `Asistencia (${item.asistenciaCount})` : "Falta Asist."}</span>
                    </span>

                    {/* Calificación */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        item.hasCalificacion
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                      title="Hoja de Calificación Física"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{item.hasCalificacion ? `Notas (${item.calificacionCount})` : "Falta Calif."}</span>
                    </span>

                    {/* Fotos */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        item.hasFotos
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                      title="Registro Fotográfico de la Sesión"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{item.hasFotos ? `Fotos (${item.fotosCount})` : "Faltan Fotos"}</span>
                    </span>
                  </div>
                </div>

                {/* Inline Expanded Attachments Viewer */}
                {expandedOsiId === item.osiId && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 bg-slate-50/80 -mx-4 -mb-4 p-4 rounded-b-2xl space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Archivos Adjuntos Subidos por Facilitador ({item.archivos.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenOsiPreview(item.osiId, item.nroOsi)}
                        className="text-[11px] font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Abrir en Gestor Completo</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {item.archivos.map((arch) => {
                        const isImage = arch.file_type?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(arch.file_name);
                        const isPdf = arch.file_type === "application/pdf" || /\.pdf$/i.test(arch.file_name);
                        const catLabel =
                          arch.category === "lista_asistencia"
                            ? "Lista de Asistencia"
                            : arch.category === "hoja_calificacion"
                            ? "Hoja de Calificación"
                            : arch.category === "material_fotografico"
                            ? "Registro Fotográfico"
                            : "Adjunto";

                        const catColor =
                          arch.category === "lista_asistencia"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : arch.category === "hoja_calificacion"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : arch.category === "material_fotografico"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-slate-50 text-slate-800 border-slate-200";

                        const formattedSize = arch.file_size
                          ? (arch.file_size / (1024 * 1024)).toFixed(2) + " MB"
                          : null;

                        return (
                          <div
                            key={arch.id}
                            className="p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${catColor}`}>
                                {arch.category === "lista_asistencia" ? (
                                  <FileSpreadsheet className="w-3 h-3" />
                                ) : arch.category === "hoja_calificacion" ? (
                                  <Award className="w-3 h-3" />
                                ) : arch.category === "material_fotografico" ? (
                                  <ImageIcon className="w-3 h-3" />
                                ) : (
                                  <Paperclip className="w-3 h-3" />
                                )}
                                <span>{catLabel}</span>
                              </span>
                              {formattedSize && (
                                <span className="text-[10px] text-slate-400 font-mono">{formattedSize}</span>
                              )}
                            </div>

                            <p className="text-xs font-semibold text-slate-800 truncate" title={arch.file_name}>
                              {arch.file_name}
                            </p>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                              <span className="text-slate-400 text-[10px]">
                                {new Date(arch.created_at).toLocaleDateString("es-VE", { day: "2-digit", month: "short" })}
                              </span>

                              <div className="flex items-center gap-1">
                                {arch.publicUrl && (
                                  <a
                                    href={arch.publicUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-md transition-colors"
                                    title="Abrir en pestaña nueva"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                {arch.publicUrl && (
                                  <a
                                    href={arch.publicUrl}
                                    download={arch.file_name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                                    title="Descargar"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Mostrando {filteredItems.length} de {summary?.totalOsis || 0} servicios de capacitación</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
