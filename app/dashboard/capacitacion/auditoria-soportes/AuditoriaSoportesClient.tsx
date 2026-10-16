"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Paperclip,
  FileSpreadsheet,
  Award,
  Image as ImageIcon,
  User,
  Calendar,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  ShieldCheck,
  FileCheck2,
  Layers,
} from "lucide-react";
import {
  getFacilitadorUploadsAudit,
  type FacilitadorUploadsAuditSummary,
  type OsiUploadAuditItem,
} from "@/app/actions/facilitador-uploads-audit";
import { toTitleCase } from "@/utils/string-utils";

interface AuditoriaSoportesClientProps {
  initialSummary: FacilitadorUploadsAuditSummary;
}

export function AuditoriaSoportesClient({ initialSummary }: AuditoriaSoportesClientProps) {
  const [summary, setSummary] = useState<FacilitadorUploadsAuditSummary>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"todos" | "pendientes_carga" | "pendientes_confirmar" | "completos">("todos");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedOsiId, setExpandedOsiId] = useState<number | null>(null);

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await getFacilitadorUploadsAudit();
      setSummary(res);
    } catch (e) {
      console.error("[AuditoriaSoportesClient] Error refreshing:", e);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-100">
                <FileCheck2 className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Revisión de Documentos y Calificaciones
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Control de entrega de documentos físicos y cotejo con calificaciones registradas por facilitadores
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/capacitacion/seguimiento-servicios"
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors inline-flex items-center gap-1.5"
            >
              <span>Seguimiento de Servicios</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={refreshData}
              disabled={loading}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* 4 Metric KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div
            onClick={() => setFilterMode("todos")}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              filterMode === "todos"
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200"
            }`}
          >
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${filterMode === "todos" ? "text-slate-300" : "text-slate-500"}`}>
              Total OSIs Analizadas
            </span>
            <span className="text-2xl font-black mt-1 block">{summary.totalOsis}</span>
            <span className={`text-[11px] mt-0.5 block ${filterMode === "todos" ? "text-slate-300" : "text-slate-500"}`}>
              {summary.totalWithUploads} con documentos cargados
            </span>
          </div>

          <div
            onClick={() => setFilterMode("completos")}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              filterMode === "completos"
                ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                : "bg-emerald-50/70 hover:bg-emerald-100 text-emerald-950 border-emerald-200"
            }`}
          >
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${filterMode === "completos" ? "text-emerald-200" : "text-emerald-700"}`}>
              Soportes Completos
            </span>
            <span className="text-2xl font-black mt-1 block">{summary.totalComplete}</span>
            <span className={`text-[11px] mt-0.5 block ${filterMode === "completos" ? "text-emerald-200" : "text-emerald-700"}`}>
              Asistencia + Calificación + Fotos
            </span>
          </div>

          <div
            onClick={() => setFilterMode("pendientes_carga")}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              filterMode === "pendientes_carga"
                ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                : "bg-amber-50/70 hover:bg-amber-100 text-amber-950 border-amber-200"
            }`}
          >
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${filterMode === "pendientes_carga" ? "text-amber-200" : "text-amber-700"}`}>
              Documentos Pendientes
            </span>
            <span className="text-2xl font-black mt-1 block">{summary.totalPendingUploads}</span>
            <span className={`text-[11px] mt-0.5 block ${filterMode === "pendientes_carga" ? "text-amber-200" : "text-amber-700"}`}>
              Falta algún soporte obligatorio
            </span>
          </div>

          <div
            onClick={() => setFilterMode("pendientes_confirmar")}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              filterMode === "pendientes_confirmar"
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-blue-50/70 hover:bg-blue-100 text-blue-950 border-blue-200"
            }`}
          >
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${filterMode === "pendientes_confirmar" ? "text-blue-200" : "text-blue-700"}`}>
              Por Confirmar Recepción
            </span>
            <span className="text-2xl font-black mt-1 block">{summary.totalPendingConfirmation}</span>
            <span className={`text-[11px] mt-0.5 block ${filterMode === "pendientes_confirmar" ? "text-blue-200" : "text-blue-700"}`}>
              Archivos cargados en revisión
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por OSI #, empresa, curso o facilitador..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Filter className="w-3.5 h-3.5" />
              <span>Categoría:</span>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="all">Todas las categorías</option>
              <option value="hoja_calificacion">Hoja de Calificación</option>
              <option value="lista_asistencia">Lista de Asistencia</option>
              <option value="material_fotografico">Material Fotográfico</option>
            </select>
          </div>
        </div>
      </div>

      {/* OSIs List Container */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 text-xs text-slate-500">
          <span>Mostrando <strong>{filteredItems.length}</strong> servicios de {summary.totalOsis}</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">No se encontraron servicios con los filtros aplicados</p>
            <p className="text-xs text-slate-400">Prueba ajustando el texto de búsqueda o los filtros superiores.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.osiId}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-sm font-black px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200">
                    OSI #{item.nroOsi}
                  </span>

                  {item.isComplete ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Soportes Completos
                    </span>
                  ) : item.isPendingUpload ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Documentos Pendientes
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

                  {/* Multi-OSI Group Non-Redundancy Badges */}
                  {item.isGroupChild && item.parentNroOsi && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                      title={`Esta OSI forma parte de un servicio compartido y hereda soportes de la OSI principal #${item.parentNroOsi}`}
                    >
                      <Layers className="w-3 h-3 text-purple-500" />
                      <span>Vinculada a OSI #{item.parentNroOsi}</span>
                      {item.sharedFilesCount != null && item.sharedFilesCount > 0 && (
                        <span className="text-[10px] text-purple-800 bg-purple-100/70 px-1 py-0.2 rounded font-bold">
                          {item.sharedFilesCount} {item.sharedFilesCount === 1 ? "soporte compartido" : "soportes compartidos"}
                        </span>
                      )}
                    </span>
                  )}

                  {item.isGroupParent && item.childOsis && item.childOsis.length > 0 && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                      title={`Servicio agrupado dividido en ${item.childOsis.length + 1} OSIs`}
                    >
                      <Layers className="w-3 h-3 text-indigo-500" />
                      <span>Grupo · {item.childOsis.length + 1} OSIs</span>
                      <span className="text-[10px] text-indigo-600 font-mono">
                        (+{item.childOsis.map((c) => c.nroOsi).join(", ")})
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  {item.totalArchivos > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedOsiId((prev) => (prev === item.osiId ? null : item.osiId))}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Archivos ({item.totalArchivos})</span>
                      {expandedOsiId === item.osiId ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </button>
                  )}

                  {/* Primary Action: Open Full-Page Split-Screen Audit Workspace */}
                  <Link
                    href={`/dashboard/capacitacion/auditoria-soportes/${item.osiId}`}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Award className="w-3.5 h-3.5 text-white" />
                    <span>Revisión de Notas y Soportes</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white/80" />
                  </Link>
                </div>
              </div>

              {/* Service & Facilitator Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs pt-1">
                <div className="md:col-span-5 space-y-1">
                  <p className="font-bold text-slate-900 text-sm">{item.nombreEmpresa}</p>
                  <p className="text-slate-600 leading-tight">{item.servicio}</p>
                </div>

                <div className="md:col-span-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{toTitleCase(item.facilitadorNombre)}</span>
                  </div>
                  {item.fechaSesion && (
                    <div className="flex items-center gap-1.5 text-slate-500 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Fecha: {item.fechaSesion}</span>
                      </div>
                      {item.isPendingUpload && item.diasDesdeEjecucion != null && item.diasDesdeEjecucion > 3 && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
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
                        >
                          {item.diasCargaFacilitador}d entrega
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 3 Upload Indicators */}
                <div className="md:col-span-4 flex items-center justify-between sm:justify-end gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      item.hasAsistencia
                        ? "bg-blue-50 text-blue-800 border-blue-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{item.hasAsistencia ? `Asistencia (${item.asistenciaCount})` : "Falta Asist."}</span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      item.hasCalificacion
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>{item.hasCalificacion ? `Notas (${item.calificacionCount})` : "Falta Calif."}</span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      item.hasFotos
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{item.hasFotos ? `Fotos (${item.fotosCount})` : "Faltan Fotos"}</span>
                  </span>
                </div>
              </div>

              {/* Collapsible Files List */}
              {expandedOsiId === item.osiId && (
                <div className="mt-3 pt-3 border-t border-slate-200 bg-slate-50 -mx-4 -mb-4 p-4 rounded-b-2xl space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Archivos Cargados ({item.archivos.length})
                    </span>
                    <Link
                      href={`/dashboard/capacitacion/auditoria-soportes/${item.osiId}`}
                      className="text-[11px] font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1"
                    >
                      <span>Abrir Visor de Pantalla Completa</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {item.archivos.map((arch) => (
                      <div
                        key={arch.id}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate" title={arch.file_name}>
                            {arch.file_name}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-400 capitalize">
                              {arch.category?.replace("_", " ") || "Adjunto"}
                            </span>
                            {arch.isSharedFromGroup && arch.originOsiNro && (
                              <span className="text-[9px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.2 rounded">
                                En {arch.originOsiNro}
                              </span>
                            )}
                          </div>
                        </div>
                        {arch.publicUrl && (
                          <a
                            href={arch.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition-colors"
                            title="Ver archivo"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
