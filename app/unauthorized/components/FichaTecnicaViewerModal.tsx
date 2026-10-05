"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  ExternalLink,
  RefreshCw,
  Eye,
} from "lucide-react";
import type { InterdepartamentalFacilitador } from "@/app/actions/interdepartamental";

interface FichaTecnicaViewerModalProps {
  facilitador: InterdepartamentalFacilitador | null;
  onClose: () => void;
}

export function FichaTecnicaViewerModal({
  facilitador,
  onClose,
}: FichaTecnicaViewerModalProps) {
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const isLoading = facilitador ? loadedId !== facilitador.id : true;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!facilitador) return null;

  const pdfUrl = `/api/generate-ficha-tecnica-facilitador-pdf?id=${facilitador.id}&inline=true`;
  const downloadUrl = `/api/generate-ficha-tecnica-facilitador-pdf?id=${facilitador.id}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 shrink-0">
          {/* Document / Facilitator Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 shadow-2xs">
              <Eye className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Visualizador de Ficha Técnica Oficial
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {facilitador.nombre_apellido}
              </h3>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Open in new tab */}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 transition-colors shadow-2xs"
              title="Abrir en pestaña nueva"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Nueva pestaña</span>
            </a>

            {/* Direct download */}
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-xs hover:shadow"
              title="Descargar Ficha Técnica en PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar</span>
            </a>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
              title="Cerrar (Esc)"
              aria-label="Cerrar visualizador"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Body */}
        <div className="relative flex-1 w-full bg-slate-100 dark:bg-slate-950 overflow-hidden flex items-center justify-center">
          {/* Loading indicator overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs z-10 transition-opacity">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Generando Ficha Técnica...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Preparando el documento PDF de {facilitador.nombre_apellido}
              </p>
            </div>
          )}

          {/* Iframe displaying inline PDF */}
          <iframe
            key={facilitador.id}
            src={pdfUrl}
            title={`Ficha Técnica - ${facilitador.nombre_apellido}`}
            onLoad={() => setLoadedId(facilitador.id)}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
