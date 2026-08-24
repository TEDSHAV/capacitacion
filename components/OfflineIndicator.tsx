"use client";

import { useEffect, useState, useCallback } from "react";
import {
  WifiOff,
  Download,
  X,
  Trash2,
  FileText,
  FileStack,
  Award,
  FolderOpen,
  CloudOff,
  CheckCircle2,
} from "lucide-react";
import {
  listCachedDocuments,
  removeCachedDocument,
  openCachedDocument,
  clearAllCachedDocuments,
  type OfflineDocumentMeta,
} from "@/lib/offline/offline-documents";

/**
 * Shows an online/offline banner and provides access to offline-cached
 * documents. Mounted in portal layouts.
 *
 * The downloads button is a labeled pill (not just an icon) so it's
 * easy to find. It auto-refreshes the cached document count when
 * documents are added or removed.
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showDownloads, setShowDownloads] = useState(false);
  const [cachedDocs, setCachedDocs] = useState<OfflineDocumentMeta[]>([]);

  const refreshDocs = useCallback(() => {
    setCachedDocs(listCachedDocuments());
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshDocs();

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Refresh doc list when the page becomes visible (user might have
    // cached a document in another tab or via the batch buttons)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshDocs();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Custom event fired by the offline-download hook when a document
    // is cached, so the badge count updates immediately
    const handleDocChange = () => refreshDocs();
    window.addEventListener("offline-docs-changed", handleDocChange);

    // Poll every 2s as a fallback (covers cases where the custom event
    // isn't fired, e.g. from the batch download buttons)
    const pollInterval = setInterval(refreshDocs, 2000);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("offline-docs-changed", handleDocChange);
      clearInterval(pollInterval);
    };
  }, [refreshDocs]);

  const handleOpenDownloads = () => {
    refreshDocs();
    setShowDownloads(true);
  };

  const handleRemove = async (url: string) => {
    await removeCachedDocument(url);
    refreshDocs();
    window.dispatchEvent(new Event("offline-docs-changed"));
  };

  const handleClearAll = async () => {
    await clearAllCachedDocuments();
    refreshDocs();
    window.dispatchEvent(new Event("offline-docs-changed"));
  };

  const handleOpen = async (url: string) => {
    await openCachedDocument(url);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDocIcon = (type: OfflineDocumentMeta["type"]) => {
    switch (type) {
      case "certificate":
        return <Award className="w-5 h-5 text-amber-600" />;
      case "batch-osi":
        return <FileStack className="w-5 h-5 text-gray-600" />;
      case "batch-docs":
        return <FileText className="w-5 h-5 text-blue-600" />;
      case "carnet":
        return <FileText className="w-5 h-5 text-blue-700" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const totalSize = cachedDocs.reduce((sum, doc) => sum + doc.size, 0);

  return (
    <>
      {/* Offline status banner — slides up from bottom when offline */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${
          isOnline ? "translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium shadow-lg">
          <WifiOff className="w-4 h-4" />
          Sin conexión — modo offline activo
        </div>
      </div>

      {/* Downloads button — labeled pill, always visible when docs are cached */}
      {(cachedDocs.length > 0 || !isOnline) && (
        <button
          onClick={handleOpenDownloads}
          className={`fixed right-4 z-30 inline-flex items-center gap-2 bg-blue-700 rounded-full shadow-lg pl-3 pr-4 py-2.5 hover:bg-blue-800 hover:shadow-xl transition-all ${
            isOnline ? "bottom-4" : "bottom-14"
          }`}
          title="Documentos guardados offline"
        >
          <div className="relative">
            <FolderOpen className="w-5 h-5 text-white" />
            {cachedDocs.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-white text-blue-700 text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                {cachedDocs.length}
              </span>
            )}
          </div>
          <span className="text-sm font-medium text-white">
            Offline
          </span>
        </button>
      )}

      {/* Downloads panel */}
      {showDownloads && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-700" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Documentos Offline
                  </h3>
                  {cachedDocs.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {cachedDocs.length} archivo{cachedDocs.length !== 1 ? "s" : ""} · {formatSize(totalSize)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowDownloads(false)}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {cachedDocs.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <CloudOff className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">
                    No hay documentos guardados
                  </p>
                  <p className="text-gray-400 text-sm max-w-xs">
                    Mientras estés en línea, usa el botón{" "}
                    <span className="inline-flex items-center gap-1 font-medium text-blue-700">
                      <Download className="w-3 h-3" /> Guardar
                    </span>{" "}
                    en los certificados o lotes para descargarlos y acceder sin
                    conexión.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cachedDocs.map((doc) => (
                    <div
                      key={doc.url}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="shrink-0">{getDocIcon(doc.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatSize(doc.size)} · {formatDate(doc.cachedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpen(doc.url)}
                          className="p-2 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Abrir documento"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(doc.url)}
                          className="p-2 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                          title="Eliminar de offline"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cachedDocs.length > 0 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  Disponible sin conexión
                </div>
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Eliminar todo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
