"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Zap,
  Sparkles,
  Printer,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileCheck,
  FolderDown,
  Layers,
  Presentation,
  Play,
} from "lucide-react";
import type { MaterialKitInfo, MaterialDidactico } from "@/types/material-didactico";
import SlidePresentationViewer from "@/components/materials/SlidePresentationViewer";

interface FacilitadorMaterialKitProps {
  kit: MaterialKitInfo;
}

export default function FacilitadorMaterialKit({ kit }: FacilitadorMaterialKitProps) {
  const [expanded, setExpanded] = useState(true);
  const [presentationModal, setPresentationModal] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const hasPptx = !!kit.presentacionPptx;
  const hasPdf = !!kit.presentacionPdf;
  const totalFiles = kit.materiales.length;

  if (totalFiles === 0) {
    return (
      <div className="mb-8 p-5 bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3 text-slate-600">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Kit de Recursos Digitales
            </h3>
            <p className="text-xs text-slate-500">
              El equipo de Capacitación no ha cargado presentaciones específicas aún para este curso.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl border border-indigo-900/50 overflow-hidden">
      {/* Top Banner Header */}
      <div className="p-5 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              Kit de Ejecución del Servicio
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
              {totalFiles} {totalFiles === 1 ? "recurso" : "recursos"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Material Didáctico y Presentación Oficial
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-normal">
            Todo lo necesario para dictar el curso <strong className="text-white font-semibold">"{kit.cursoNombre}"</strong> en {kit.empresaNombre}.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Contraer
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Ver Recursos
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content Section */}
      {expanded && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Main Hero Card: PPTX Presentation */}
          {hasPptx && (
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-purple-600/30 p-4 sm:p-5 border border-indigo-400/30 backdrop-blur-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-200 border border-amber-400/30">
                        Presentación PPTX
                      </span>
                      {kit.presentacionPptx?.es_optimizado && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          <Zap className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                          HD Optimizado ({kit.presentacionPptx.file_size_formatted})
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                      {kit.presentacionPptx?.titulo}
                    </h3>
                    <p className="text-xs text-slate-300">
                      Archivo oficial para proyectar el día de la capacitación. Listo para descargar y usar sin trabas.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                  {hasPdf && kit.presentacionPdf?.download_url && (
                    <button
                      onClick={() =>
                        setPresentationModal({
                          url: kit.presentacionPdf!.download_url!,
                          title: kit.presentacionPdf!.titulo,
                        })
                      }
                      className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      Proyectar desde PRISMA
                    </button>
                  )}
                  {kit.presentacionPptx?.download_url && (
                    <a
                      href={kit.presentacionPptx.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={kit.presentacionPptx.archivo_nombre}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Descargar PPTX ({kit.presentacionPptx.file_size_formatted})
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Grid of Other Materials & Printables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PDF Slides (if available) */}
            {hasPdf && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase text-rose-300">Diapositivas en PDF</p>
                    <p className="text-sm font-semibold text-white truncate">
                      {kit.presentacionPdf?.titulo}
                    </p>
                    <span className="text-xs text-slate-400">
                      {kit.presentacionPdf?.file_size_formatted}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {kit.presentacionPdf?.download_url && (
                    <button
                      onClick={() =>
                        setPresentationModal({
                          url: kit.presentacionPdf!.download_url!,
                          title: kit.presentacionPdf!.titulo,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
                      title="Proyectar Diapositivas"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      Proyectar
                    </button>
                  )}
                  {kit.presentacionPdf?.download_url && (
                    <a
                      href={kit.presentacionPdf.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={kit.presentacionPdf.archivo_nombre}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
                      title="Descargar PDF"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Printable & Guides */}
            {kit.materialesImprimibles.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center shrink-0">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase text-emerald-300">
                      {item.tipo_material === "guia_participante"
                        ? "Guía del Participante"
                        : item.tipo_material === "guia_facilitador"
                          ? "Guía del Facilitador"
                          : "Material Imprimible"}
                    </p>
                    <p className="text-sm font-semibold text-white truncate">{item.titulo}</p>
                    <span className="text-xs text-slate-400">{item.file_size_formatted}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.download_url && item.archivo_nombre.toLowerCase().endsWith(".pdf") && (
                    <button
                      onClick={() =>
                        setPresentationModal({
                          url: item.download_url!,
                          title: item.titulo,
                        })
                      }
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-300 hover:text-white transition-colors shrink-0"
                      title="Ver en pantalla completa"
                    >
                      <Presentation className="w-4 h-4" />
                    </button>
                  )}
                  {item.download_url && (
                    <a
                      href={item.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={item.archivo_nombre}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
                      title="Descargar"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}

            {/* Evaluations */}
            {kit.evaluaciones.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase text-purple-300">Evaluación</p>
                    <p className="text-sm font-semibold text-white truncate">{item.titulo}</p>
                    <span className="text-xs text-slate-400">{item.file_size_formatted}</span>
                  </div>
                </div>
                {item.download_url && (
                  <a
                    href={item.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={item.archivo_nombre}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
                    title="Descargar"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Quick tips footer */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Modo de Uso:</strong> Puedes usar <strong>"Proyectar desde PRISMA"</strong> para exponer en pantalla completa directamente desde tu navegador, o descargar el archivo <strong>.PPTX</strong> si deseas usar PowerPoint.
            </span>
          </div>
        </div>
      )}

      {/* Fullscreen Interactive Presentation Mode Modal */}
      {presentationModal && (
        <SlidePresentationViewer
          url={presentationModal.url}
          title={presentationModal.title}
          courseName={kit.cursoNombre}
          companyName={kit.empresaNombre}
          isOpen={true}
          onClose={() => setPresentationModal(null)}
        />
      )}
    </div>
  );
}
