"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  ExternalLink,
  FileText,
  Award,
  ClipboardList,
  Archive,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { getCachedDocumentBlob } from "@/lib/offline/offline-documents";

export interface ClientePdfModalDoc {
  id: string;
  label: string;
  url: string;
  downloadUrl?: string;
  icon?: "certificate" | "file" | "clipboard";
  badge?: string;
}

export interface ClientePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  documents: ClientePdfModalDoc[];
  initialDocId?: string;
  zipDownloadUrl?: string;
  zipDownloadLabel?: string;
}

export function ClientePdfModal({
  isOpen,
  onClose,
  title,
  subtitle,
  documents,
  initialDocId,
  zipDownloadUrl,
  zipDownloadLabel = "Descargar Lote (ZIP)",
}: ClientePdfModalProps) {
  const [userSelectedDocId, setUserSelectedDocId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedFrameKey, setLoadedFrameKey] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeDocId =
    (userSelectedDocId && documents.some((d) => d.id === userSelectedDocId))
      ? userSelectedDocId
      : (initialDocId && documents.some((d) => d.id === initialDocId))
      ? initialDocId
      : documents[0]?.id ?? "";

  const activeDoc = documents.find((d) => d.id === activeDocId) || documents[0];
  const frameKey = activeDoc ? `${activeDoc.id}-${blobUrl || "remote"}` : "";
  const isFrameLoading = loadedFrameKey !== frameKey && !loadError;

  // Resolve offline / cached blob if available
  useEffect(() => {
    if (!isOpen || !activeDoc) return;

    let active = true;

    async function resolveSource() {
      if (!activeDoc) return;
      try {
        const cachedBlob = await getCachedDocumentBlob(activeDoc.url);
        if (cachedBlob && active) {
          const url = URL.createObjectURL(cachedBlob);
          setBlobUrl(url);
          setIsFromCache(true);
          return;
        }
      } catch (err) {
        console.warn("Could not check cached document blob", err);
      }

      if (active) {
        setBlobUrl(null);
        setIsFromCache(false);
      }
    }

    resolveSource();

    return () => {
      active = false;
    };
  }, [isOpen, activeDoc]);

  // Clean up Object URL
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Handle ESC key and prevent body scrolling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !activeDoc) return null;

  const currentViewUrl = blobUrl || activeDoc.url;
  const currentDownloadUrl = activeDoc.downloadUrl || activeDoc.url;

  const handlePrint = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } else {
        window.open(currentViewUrl, "_blank");
      }
    } catch {
      window.open(currentViewUrl, "_blank");
    }
  };

  const renderDocIcon = (icon?: string) => {
    switch (icon) {
      case "certificate":
        return <Award className="w-4 h-4" />;
      case "clipboard":
        return <ClipboardList className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white border border-gray-200/90 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? "fixed inset-0 w-full h-full rounded-none"
            : "w-full max-w-6xl h-[92vh] rounded-2xl"
        }`}
      >
        {/* Top Header & Controls */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Title & Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
              {renderDocIcon(activeDoc.icon)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  {title}
                </h3>
                {isFromCache && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    En caché
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Document switcher tabs (if multi-doc) */}
          {documents.length > 1 && (
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 order-3 sm:order-2 w-full sm:w-auto overflow-x-auto">
              {documents.map((doc) => {
                const isSelected = doc.id === activeDocId;
                return (
                  <button
                    key={doc.id}
                    onClick={() => {
                      if (doc.id !== activeDocId) {
                        setUserSelectedDocId(doc.id);
                        setLoadError(null);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                      isSelected
                        ? "bg-white text-emerald-700 font-semibold shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
                    }`}
                  >
                    {renderDocIcon(doc.icon)}
                    <span>{doc.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Action buttons toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 order-2 sm:order-3 ml-auto sm:ml-0 shrink-0">
            {/* Direct PDF Download button */}
            <a
              href={currentDownloadUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
              title="Descargar este documento PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Descargar PDF</span>
            </a>

            {/* Optional ZIP download for the entire batch */}
            {zipDownloadUrl && (
              <a
                href={zipDownloadUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors"
                title={zipDownloadLabel}
              >
                <Archive className="w-3.5 h-3.5 text-gray-500" />
                <span className="hidden lg:inline">{zipDownloadLabel}</span>
              </a>
            )}

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              title="Imprimir documento"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Open in new tab */}
            <a
              href={currentViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              title="Abrir en pestaña nueva"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors hidden sm:inline-flex"
              title={isFullscreen ? "Restaurar tamaño" : "Pantalla completa"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ml-1"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="relative flex-1 bg-gray-100 flex flex-col items-center justify-center overflow-hidden">
          {/* Loading Overlay */}
          {isFrameLoading && (
            <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
                <FileText className="w-4 h-4 text-emerald-600 absolute inset-0 m-auto" />
              </div>
              <p className="text-gray-700 text-sm font-medium mt-3">
                Cargando documento...
              </p>
            </div>
          )}

          {/* Load Error State */}
          {loadError ? (
            <div className="p-8 text-center max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm mx-4">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h4 className="text-gray-900 font-semibold text-base mb-1">
                No se pudo cargar la vista previa directa
              </h4>
              <p className="text-gray-500 text-xs mb-4">
                {loadError}
              </p>
              <div className="flex items-center justify-center gap-3">
                <a
                  href={currentViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Abrir en pestaña nueva
                </a>
                <a
                  href={currentDownloadUrl}
                  download
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  Descargar archivo
                </a>
              </div>
            </div>
          ) : (
            /* PDF Iframe Element */
            <iframe
              key={frameKey}
              ref={iframeRef}
              src={`${currentViewUrl}#view=FitH&toolbar=1`}
              title={activeDoc.label}
              className="w-full h-full border-0 bg-gray-100"
              onLoad={() => setLoadedFrameKey(frameKey)}
              onError={() => {
                setLoadError(
                  "El navegador bloqueó la vista previa incrustada o no hay conexión.",
                );
              }}
            />
          )}

          {/* Mobile Fallback helper bar */}
          <div className="w-full bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between text-[11px] text-gray-500 sm:hidden shrink-0">
            <span className="truncate">
              ¿No se visualiza correctamente en tu móvil?
            </span>
            <a
              href={currentViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:underline font-semibold shrink-0 ml-2"
            >
              Abrir PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
