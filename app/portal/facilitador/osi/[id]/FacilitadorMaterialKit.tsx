"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Zap,
  Sparkles,
  Printer,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Lightbulb,
  MessageSquarePlus,
} from "lucide-react";
import type { MaterialKitInfo, MaterialDidactico } from "@/types/material-didactico";
import SugerenciaMaterialModal from "./SugerenciaMaterialModal";

interface FacilitadorMaterialKitProps {
  kit: MaterialKitInfo;
  facilitadorId?: number;
  facilitadorNombre?: string;
}

export default function FacilitadorMaterialKit({
  kit,
  facilitadorId,
  facilitadorNombre = "Facilitador",
}: FacilitadorMaterialKitProps) {
  const [expanded, setExpanded] = useState(true);
  const [sugerenciaMaterial, setSugerenciaMaterial] = useState<MaterialDidactico | null>(null);

  const hasPptx = !!kit.presentacionPptx;
  const hasPdf = !!kit.presentacionPdf;
  const totalFiles = kit.materiales.length;

  if (totalFiles === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Material Didáctico Oficial
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {totalFiles} {totalFiles === 1 ? "recurso" : "recursos"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Recursos y Presentación del Curso
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-normal">
            Material oficial para dictar <strong className="text-slate-900 font-semibold">"{kit.cursoNombre}"</strong> en {kit.empresaNombre}.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
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
        <div className="p-5 sm:p-6 space-y-5">
          {/* Main Hero Card: PPTX Presentation */}
          {hasPptx && (
            <div className="relative overflow-hidden rounded-xl bg-slate-50 p-4 sm:p-5 border border-slate-200 shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/90 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                        Presentación PPTX
                      </span>
                      {kit.presentacionPptx?.es_optimizado && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Zap className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                          HD Optimizado ({kit.presentacionPptx.file_size_formatted})
                        </span>
                      )}
                      {kit.presentacionPptx?.version && kit.presentacionPptx.version > 1 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                          v{kit.presentacionPptx.version}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      {kit.presentacionPptx?.titulo}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Archivo PowerPoint oficial para la ejecución del servicio.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                  {/* Suggestion / Feedback button */}
                  <button
                    type="button"
                    onClick={() => setSugerenciaMaterial(kit.presentacionPptx!)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors"
                    title="Enviar sugerencia u observación sobre esta presentación"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    Sugerir Mejora
                  </button>

                  {/* PPTX Download button */}
                  {kit.presentacionPptx?.download_url && (
                    <a
                      href={kit.presentacionPptx.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={kit.presentacionPptx.archivo_nombre}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-2xs transition-colors"
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
              <div className="p-4 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 transition-all flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase text-rose-700">Diapositivas en PDF</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {kit.presentacionPdf?.titulo}
                    </p>
                    <span className="text-xs text-slate-500">
                      {kit.presentacionPdf?.file_size_formatted}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSugerenciaMaterial(kit.presentacionPdf!)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0"
                    title="Sugerir mejora sobre estas diapositivas"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  </button>

                  {kit.presentacionPdf?.download_url && (
                    <a
                      href={kit.presentacionPdf.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={kit.presentacionPdf.archivo_nombre}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors shrink-0"
                      title="Descargar PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Printable & Guides */}
            {kit.materialesImprimibles.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase text-slate-600">
                      {item.tipo_material === "guia_participante"
                        ? "Guía del Participante"
                        : item.tipo_material === "guia_facilitador"
                          ? "Guía del Facilitador"
                          : "Material Imprimible"}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.titulo}</p>
                    <span className="text-xs text-slate-500">{item.file_size_formatted}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.download_url && (
                    <a
                      href={item.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={item.archivo_nombre}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0"
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
                className="p-4 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase text-slate-600">Evaluación</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.titulo}</p>
                    <span className="text-xs text-slate-500">{item.file_size_formatted}</span>
                  </div>
                </div>
                {item.download_url && (
                  <a
                    href={item.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={item.archivo_nombre}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0"
                    title="Descargar"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Feedback Suggestion Callout Section */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-start sm:items-center gap-2.5">
              <MessageSquarePlus className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>Buzón de Mejora Continua:</strong> ¿Observaste alguna corrección de contenido, norma desactualizada o sugerencia sobre las láminas?
              </span>
            </div>
            {kit.materiales.length > 0 && (
              <button
                type="button"
                onClick={() => setSugerenciaMaterial(kit.presentacionPptx || kit.presentacionPdf || kit.materiales[0])}
                className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold shrink-0 transition-colors shadow-2xs self-start sm:self-auto"
              >
                Enviar Observación
              </button>
            )}
          </div>
        </div>
      )}

      {/* Facilitator Feedback / Suggestion Modal */}
      {sugerenciaMaterial && (
        <SugerenciaMaterialModal
          material={sugerenciaMaterial}
          facilitadorId={facilitadorId}
          facilitadorNombre={facilitadorNombre}
          osiId={kit.osiId}
          cursoId={kit.cursoId}
          isOpen={true}
          onClose={() => setSugerenciaMaterial(null)}
        />
      )}
    </div>
  );
}
