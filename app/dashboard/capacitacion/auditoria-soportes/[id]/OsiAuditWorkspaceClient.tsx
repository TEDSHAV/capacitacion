"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileSpreadsheet,
  Award,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertCircle,
  Search,
  CheckSquare,
  Square,
  User,
  Building2,
  Calendar,
  Sparkles,
  Maximize2,
  Clock,
  Layers,
  FileCheck,
  Info,
  X,
} from "lucide-react";
import { OsiAuditDetailData, OsiAuditParticipant } from "@/app/actions/facilitador-uploads-audit";
import { OSIAttachment } from "@/types";
import { toTitleCase } from "@/utils/string-utils";

interface OsiAuditWorkspaceClientProps {
  data: OsiAuditDetailData;
  onClose?: () => void;
  isModal?: boolean;
}

export function OsiAuditWorkspaceClient({ data, onClose, isModal }: OsiAuditWorkspaceClientProps) {
  const { osi, facilitador, notaAprobatoria, attachments, participants, acknowledgment, stats } = data;

  // Split attachments by category
  const calificacionFiles = useMemo(
    () => attachments.filter((a) => a.category === "hoja_calificacion"),
    [attachments]
  );
  const asistenciaFiles = useMemo(
    () => attachments.filter((a) => a.category === "lista_asistencia"),
    [attachments]
  );
  const fotoFiles = useMemo(
    () => attachments.filter((a) => a.category === "material_fotografico"),
    [attachments]
  );

  // Active Category & Active File
  const initialCategory = calificacionFiles.length > 0 ? "hoja_calificacion" : asistenciaFiles.length > 0 ? "lista_asistencia" : "material_fotografico";
  const [activeCategory, setActiveCategory] = useState<"hoja_calificacion" | "lista_asistencia" | "material_fotografico">(initialCategory);

  const currentCategoryFiles = useMemo(() => {
    if (activeCategory === "hoja_calificacion") return calificacionFiles;
    if (activeCategory === "lista_asistencia") return asistenciaFiles;
    return fotoFiles;
  }, [activeCategory, calificacionFiles, asistenciaFiles, fotoFiles]);

  const [activeFileId, setActiveFileId] = useState<string | null>(
    currentCategoryFiles[0]?.id || attachments[0]?.id || null
  );

  const activeFile = useMemo(() => {
    return attachments.find((a) => a.id === activeFileId) || currentCategoryFiles[0] || null;
  }, [attachments, activeFileId, currentCategoryFiles]);

  const isPdf = activeFile?.file_type === "application/pdf" || activeFile?.file_name.toLowerCase().endsWith(".pdf");

  // Mobile Tab (Left Viewer vs Right Table)
  const [mobileView, setMobileView] = useState<"viewer" | "table">("viewer");

  // Document Viewer Pan & Zoom State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.4));
  const handleResetView = () => {
    setZoomLevel(1);
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
  };
  const handleRotateCw = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateCcw = () => setRotation((prev) => (prev - 90 + 360) % 360);

  // Wheel zoom with Ctrl+Scroll (non-passive to prevent full-page browser zooming)
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY < 0 ? 0.2 : -0.2;
        setZoomLevel((prev) => Math.round(Math.min(Math.max(prev + delta, 0.4), 4) * 100) / 100);
      } else if (!isPdf && zoomLevel > 1) {
        // Natural scroll pan when zoomed in on images
        e.preventDefault();
        setPanPosition((prev) => ({
          x: prev.x - e.deltaX * 0.8,
          y: prev.y - e.deltaY * 0.8,
        }));
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, [zoomLevel, isPdf]);

  // Keyboard shortcuts (Ctrl + Plus, Ctrl + Minus, Ctrl + 0)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === "-") {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === "0") {
          e.preventDefault();
          handleResetView();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Participant Table State (Search, Filter, Checkmarks)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"todos" | "aprobados" | "reprobados">("todos");
  const [verifiedIds, setVerifiedIds] = useState<Set<number>>(new Set());

  const toggleVerified = (id: number) => {
    setVerifiedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const markAllVerified = () => {
    setVerifiedIds(new Set(participants.map((p) => p.id)));
  };

  const clearVerified = () => {
    setVerifiedIds(new Set());
  };

  const filteredParticipants = useMemo(() => {
    let list = participants;

    if (filterMode === "aprobados") {
      list = list.filter((p) => p.isPassing);
    } else if (filterMode === "reprobados") {
      list = list.filter((p) => !p.isPassing && p.score !== null && p.score !== "");
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.nombre_apellido.toLowerCase().includes(q) ||
          p.cedula.toLowerCase().includes(q)
      );
    }

    return list;
  }, [participants, filterMode, searchTerm]);

  const verifiedCount = verifiedIds.size;
  const progressPercent = participants.length > 0 ? Math.round((verifiedCount / participants.length) * 100) : 0;

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto pb-10">
      {/* Top Header Card */}
      <header className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-slate-600" />
                  <span>Cerrar</span>
                </button>
              ) : (
                <Link
                  href="/dashboard/capacitacion/auditoria-soportes"
                  className="inline-flex items-center gap-1.5 font-bold text-slate-500 hover:text-sky-700 bg-slate-100 hover:bg-sky-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Revisión</span>
                </Link>
              )}

              <span className="text-slate-300">/</span>

              <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                OSI #{osi.nro_osi}
              </span>

              {data.groupInfo?.isGroup && (
                <span className="inline-flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 text-xs">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  {data.groupInfo.isChild && data.groupInfo.parentNroOsi
                    ? `Vinculada a OSI #${data.groupInfo.parentNroOsi}`
                    : `Grupo Multi-OSI (${data.groupInfo.relatedOsis.length} órdenes)`}
                </span>
              )}

              {stats.isComplete ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Soportes Completos
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <AlertCircle className="w-3 h-3 text-amber-600" /> Soportes Pendientes / Parciales
                </span>
              )}

              <span className="text-slate-400">·</span>
              <span className="text-slate-600 font-medium">Nota Mínima Aprobatoria: <strong>{notaAprobatoria} pts</strong></span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {osi.servicio}
              </h1>
              <span className="text-xs sm:text-sm font-semibold text-slate-600">
                ({osi.nombre_empresa})
              </span>
            </div>

            <div className="flex items-center gap-3 sm:gap-6 text-xs text-slate-500 flex-wrap pt-0.5">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Facilitador: <strong className="text-slate-700">{toTitleCase(facilitador.nombre_apellido)}</strong></span>
              </div>
              {osi.fecha_inicio_real && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ejecución: <strong className="text-slate-700">{osi.fecha_inicio_real}</strong></span>
                </div>
              )}
              {stats.fechaCargaSoportes && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Carga facilitador: <strong className="text-slate-700">{new Date(stats.fechaCargaSoportes).toLocaleDateString("es-VE")}</strong></span>
                  {stats.diasCargaFacilitador != null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${stats.diasCargaFacilitador > 3 ? "text-amber-800 bg-amber-50 border-amber-200" : "text-emerald-800 bg-emerald-50 border-emerald-200"}`}>
                      {stats.diasCargaFacilitador}d
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex items-center gap-2 self-start lg:self-center flex-wrap">
            {isModal && (
              <a
                href={`/dashboard/capacitacion/auditoria-soportes/${osi.id_osi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 inline-flex items-center gap-1.5 transition-colors"
                title="Abrir en pestaña independiente"
              >
                <span>Pestaña nueva</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}

            <Link
              href={`/dashboard/capacitacion/seguimiento-servicios?search=${osi.nro_osi}`}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Seguimiento de Servicios</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>

            <Link
              href={`/dashboard/capacitacion/generacion-certificado?osiId=${osi.id_osi}`}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-2xs inline-flex items-center gap-1.5 transition-colors"
            >
              <Award className="w-3.5 h-3.5 text-white" />
              <span>Emitir Certificados</span>
            </Link>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer shadow-2xs ml-0.5"
                title="Cerrar modal (Esc)"
                aria-label="Cerrar ventana"
              >
                <X className="w-4 h-4 text-slate-700" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile View Toggle */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex lg:hidden items-center justify-center">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setMobileView("viewer")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mobileView === "viewer"
                  ? "bg-white text-sky-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📄 Soporte Físico ({attachments.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileView("table")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mobileView === "table"
                  ? "bg-white text-sky-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📋 Calificaciones Digitales ({participants.length})
            </button>
          </div>
        </div>
      </header>

      {/* Multi-OSI Group Banner if service is shared across multiple OSIs */}
      {data.groupInfo?.isGroup && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50/70 to-purple-50/40 rounded-2xl border border-purple-200/90 p-3.5 sm:p-4 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <span className="p-2 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-extrabold text-purple-950 text-sm">
                  Servicio Agrupado Multi-OSI
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200/70 text-purple-800">
                  {data.groupInfo.relatedOsis.length} OSIs Vinculadas
                </span>
                {data.groupInfo.isChild && data.groupInfo.parentNroOsi && (
                  <span className="text-[11px] font-semibold text-purple-700">
                    · Soportes compartidos con OSI principal #{data.groupInfo.parentNroOsi}
                  </span>
                )}
              </div>
              <p className="text-purple-700 text-xs mt-0.5">
                Esta orden forma parte de un mismo servicio dividido. Los recaudos físicos cargados por el facilitador y los participantes se unifican para evitar duplicidades.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap self-start md:self-center shrink-0">
            <span className="text-purple-600 font-bold text-[11px] mr-1">Cambiar OSI:</span>
            {data.groupInfo.relatedOsis.map((ro) => (
              <Link
                key={ro.id_osi}
                href={`/dashboard/capacitacion/auditoria-soportes/${ro.id_osi}`}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all border inline-flex items-center gap-1 ${
                  ro.isCurrent
                    ? "bg-purple-700 text-white border-purple-800 shadow-2xs"
                    : "bg-white text-purple-900 hover:bg-purple-100/80 border-purple-200"
                }`}
                title={`${ro.nombre_empresa} - ${ro.servicio}`}
              >
                <span>OSI #{ro.nro_osi}</span>
                {ro.isParent && <span className="text-[9px] font-sans opacity-80">(Principal)</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main Split-Screen Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ============================================================== */}
        {/* LEFT COLUMN: PHYSICAL EVIDENCE DOCUMENT VIEWER (lg:col-span-7) */}
        {/* ============================================================== */}
        <div
          className={`lg:col-span-7 flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden ${
            isModal ? "h-[calc(90vh-190px)] min-h-[520px]" : "h-[calc(100vh-230px)] min-h-[620px]"
          } ${mobileView === "table" ? "hidden lg:flex" : "flex"}`}
        >
          {/* Category Tabs */}
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("hoja_calificacion");
                  if (calificacionFiles[0]) setActiveFileId(calificacionFiles[0].id);
                  handleResetView();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                  activeCategory === "hoja_calificacion"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Hoja de Calificación ({calificacionFiles.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCategory("lista_asistencia");
                  if (asistenciaFiles[0]) setActiveFileId(asistenciaFiles[0].id);
                  handleResetView();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                  activeCategory === "lista_asistencia"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Lista de Asistencia ({asistenciaFiles.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCategory("material_fotografico");
                  if (fotoFiles[0]) setActiveFileId(fotoFiles[0].id);
                  handleResetView();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                  activeCategory === "material_fotografico"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Fotos ({fotoFiles.length})</span>
              </button>
            </div>

            {/* Viewer Controls Toolbar (Available for both images and PDFs) */}
            {activeFile && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline-flex items-center gap-1 pl-1 pr-1.5 border-r border-slate-200 mr-0.5">
                  <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono text-[9px]">Ctrl</kbd>
                  <span>+ Scroll</span>
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Acercar (Ctrl + + o Ctrl + Scroll)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold text-slate-600 px-1 min-w-[42px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Alejar (Ctrl + - o Ctrl + Scroll)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />
                <button
                  type="button"
                  onClick={handleRotateCcw}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Rotar 90° antihorario"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRotateCw}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Rotar 90° horario"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Restablecer vista inicial (Ctrl + 0)"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                {activeFile.publicUrl && (
                  <>
                    <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />
                    <a
                      href={activeFile.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Abrir archivo original en pestaña nueva"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={activeFile.publicUrl}
                      download={activeFile.file_name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Descargar archivo"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sub-files chip strip if more than 1 file in current category */}
          {currentCategoryFiles.length > 1 && (
            <div className="px-4 py-2 border-b border-slate-100 bg-white flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                Páginas / Archivos:
              </span>
              {currentCategoryFiles.map((file, idx) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => {
                    setActiveFileId(file.id);
                    handleResetView();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeFile?.id === file.id
                      ? "bg-slate-900 text-white font-bold"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <span>Archivo #{idx + 1}</span>
                  {file.isSharedFromGroup && file.originOsiNro && (
                    <span
                      className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                        activeFile?.id === file.id
                          ? "bg-purple-800 text-purple-200"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      En {file.originOsiNro}
                    </span>
                  )}
                  <span className="text-[10px] opacity-75 truncate max-w-[120px]">
                    {file.file_name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Document Display Canvas */}
          <div
            ref={canvasContainerRef}
            className="flex-1 bg-slate-900 relative overflow-hidden flex items-center justify-center select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {activeFile ? (
              isPdf ? (
                <div
                  className={`w-full h-full transition-transform duration-75 origin-center flex items-center justify-center ${
                    zoomLevel > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                  }`}
                  style={{
                    transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                  }}
                >
                  <iframe
                    src={`${activeFile.publicUrl || ""}#toolbar=1&navpanes=0`}
                    className={`w-full h-full border-0 bg-white ${
                      isDragging ? "pointer-events-none select-none" : "pointer-events-auto"
                    }`}
                    title={activeFile.file_name}
                  />
                </div>
              ) : (
                <div
                  className={`transition-transform duration-75 origin-center ${
                    zoomLevel > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                  }`}
                  style={{
                    transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeFile.publicUrl || ""}
                    alt={activeFile.file_name}
                    className="max-h-[calc(100vh-320px)] max-w-full object-contain pointer-events-none drop-shadow-2xl"
                    draggable={false}
                  />
                </div>
              )
            ) : (
              <div className="text-center p-8 text-slate-400 space-y-2">
                <AlertCircle className="w-10 h-10 mx-auto text-slate-500 opacity-60" />
                <p className="text-sm font-semibold">
                  No hay archivos registrados en esta categoría para este servicio.
                </p>
                <p className="text-xs text-slate-500">
                  El facilitador no ha adjuntado el documento correspondiente a {activeCategory.replace("_", " ")}.
                </p>
              </div>
            )}

            {/* Bottom Floating File Details Bar */}
            {activeFile && (
              <div className="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-xl border border-white/10 flex items-center justify-between pointer-events-none gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate max-w-[280px] font-mono">{activeFile.file_name}</span>
                  {activeFile.isSharedFromGroup && activeFile.originOsiNro && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-900/90 text-purple-200 border border-purple-700 shrink-0">
                      Soporte compartido desde {activeFile.originOsiNro}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span>Subido: {new Date(activeFile.created_at).toLocaleString("es-VE")}</span>
                  {activeFile.file_size ? (
                    <span>{(activeFile.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: DIGITAL DATA & PARTICIPANTS SCORES (lg:col-span-5) */}
        {/* ============================================================== */}
        <div
          className={`lg:col-span-5 flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden ${
            isModal ? "h-[calc(90vh-190px)] min-h-[520px]" : "h-[calc(100vh-230px)] min-h-[620px]"
          } ${mobileView === "viewer" ? "hidden lg:flex" : "flex"}`}
        >
          {/* Header & KPI Summary */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-sky-600" />
                  <span>Calificaciones Registradas en Portal</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Cotejo de notas transcritas vs documento físico escaneado
                </p>
              </div>

              {stats.averageScore != null && (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Promedio General
                  </span>
                  <span className="text-sm font-extrabold text-sky-800">
                    {stats.averageScore} / 20 pts
                  </span>
                </div>
              )}
            </div>

            {/* Mini Stat Pills */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total</span>
                <span className="text-base font-extrabold text-slate-900">{stats.totalParticipants}</span>
              </div>
              <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Aprobados</span>
                <span className="text-base font-extrabold text-emerald-800">{stats.passingCount}</span>
              </div>
              <div className="bg-rose-50/60 p-2 rounded-xl border border-rose-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Reprobados</span>
                <span className="text-base font-extrabold text-rose-800">{stats.failingCount}</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar participante o cédula..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                />
              </div>

              <div className="inline-flex p-0.5 bg-slate-200/70 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterMode("todos")}
                  className={`px-2 py-1 rounded-lg font-bold transition-all ${
                    filterMode === "todos" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("aprobados")}
                  className={`px-2 py-1 rounded-lg font-bold transition-all ${
                    filterMode === "aprobados" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Aprobados
                </button>
                {stats.failingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterMode("reprobados")}
                    className={`px-2 py-1 rounded-lg font-bold transition-all ${
                      filterMode === "reprobados" ? "bg-white text-rose-800 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Reprobados
                  </button>
                )}
              </div>
            </div>

            {/* Verification checklist progress bar */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">
                  Progreso de cotejo: <strong>{verifiedCount}</strong> de {participants.length} ({progressPercent}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllVerified}
                  className="text-sky-700 hover:text-sky-900 font-bold hover:underline"
                >
                  Marcar todos
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={clearVerified}
                  className="text-slate-400 hover:text-slate-600"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredParticipants.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-1">
                <Info className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">No se encontraron participantes.</p>
                <p className="text-[11px] text-slate-400">Verifica los filtros o la búsqueda.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/90 text-slate-500 font-bold sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 w-8 text-center">✓</th>
                    <th className="py-2 px-2 w-8 text-center text-slate-400">#</th>
                    <th className="py-2 px-3">Cédula</th>
                    <th className="py-2 px-3">Nombre y Apellido</th>
                    <th className="py-2 px-3 text-center">Nota Digital</th>
                    <th className="py-2 px-3 text-center">Condición</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredParticipants.map((p, idx) => {
                    const isChecked = verifiedIds.has(p.id);
                    const numScore = p.score !== null && p.score !== "" ? Number(p.score) : null;
                    const isValidNumber = numScore !== null && !isNaN(numScore);

                    return (
                      <tr
                        key={p.id}
                        onClick={() => toggleVerified(p.id)}
                        className={`transition-colors cursor-pointer ${
                          isChecked
                            ? "bg-emerald-50/40 hover:bg-emerald-50/70"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        {/* Checkbox for manual cotejo */}
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => toggleVerified(p.id)}
                            className="text-slate-400 hover:text-sky-600 transition-colors"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>

                        {/* Row Index */}
                        <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Cédula */}
                        <td className="py-2.5 px-3 font-mono text-slate-700 font-semibold whitespace-nowrap">
                          {p.cedula || "—"}
                        </td>

                        {/* Nombre */}
                        <td className="py-2.5 px-3 text-slate-900 font-bold">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{toTitleCase(p.nombre_apellido)}</span>
                            {p.nro_osi && data.groupInfo?.isGroup && (
                              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {p.nro_osi.startsWith("OSI") ? p.nro_osi : `OSI #${p.nro_osi}`}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Score (Calificación) */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {isValidNumber ? (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                                p.isPassing
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                  : "bg-rose-100 text-rose-900 border-rose-300"
                              }`}
                            >
                              {numScore}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              {p.score || "Sin nota"}
                            </span>
                          )}
                        </td>

                        {/* Status / Condición */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {isValidNumber ? (
                            p.isPassing ? (
                              <span className="text-[11px] font-bold text-emerald-700">
                                Aprobado
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-rose-700">
                                Reprobado
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              Pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Facilitator Sworn Disclaimer & Audit Guidance Footer */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50 text-xs space-y-2">
            {acknowledgment && (
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-sky-600" />
                    Declaración Jurada del Facilitador
                  </span>
                  {acknowledgment.acknowledged_at && (
                    <span>
                      Firmado: {new Date(acknowledgment.acknowledged_at).toLocaleDateString("es-VE")}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 italic leading-snug">
                  &ldquo;{acknowledgment.disclaimer_text || "Declaro bajo mi responsabilidad que he revisado exhaustivamente las calificaciones..."}&rdquo;
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 text-slate-500 text-[11px] leading-tight">
              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <span>
                <strong>Modo auditoría de lectura:</strong> Verifica que cada calificación coincida con la hoja física. Si requieres corregir algún error tipográfico, podrás hacerlo al generar los certificados.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
