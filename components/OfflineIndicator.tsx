"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi, Download, X, Trash2, FileText, FileStack, Award } from "lucide-react";
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
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showDownloads, setShowDownloads] = useState(false);
  const [cachedDocs, setCachedDocs] = useState<OfflineDocumentMeta[]>([]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const refreshDocs = () => setCachedDocs(listCachedDocuments());

  const handleOpenDownloads = () => {
    refreshDocs();
    setShowDownloads(true);
  };

  const handleRemove = async (url: string) => {
    await removeCachedDocument(url);
    refreshDocs();
  };

  const handleClearAll = async () => {
    await clearAllCachedDocuments();
    refreshDocs();
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
        return <Award className="w-4 h-4 text-amber-600" />;
      case "batch-osi":
        return <FileStack className="w-4 h-4 text-gray-600" />;
      case "batch-docs":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "carnet":
        return <FileText className="w-4 h-4 text-purple-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <>
      {/* Status bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform ${
          isOnline ? "translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-lg">
          <WifiOff className="w-4 h-4" />
          Sin conexión — modo offline
        </div>
      </div>

      {/* Downloads button (floating) */}
      <button
        onClick={handleOpenDownloads}
        className="fixed bottom-4 right-4 z-30 bg-white rounded-full shadow-lg border border-gray-200 p-3 hover:shadow-xl transition-shadow"
        title="Descargas offline"
      >
        <div className="relative">
          <Download className="w-5 h-5 text-gray-700" />
          {cachedDocs.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {cachedDocs.length}
            </span>
          )}
        </div>
      </button>

      {/* Downloads panel */}
      {showDownloads && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-gray-700" />
                <h3 className="font-semibold text-gray-900">Descargas Offline</h3>
              </div>
              <button
                onClick={() => setShowDownloads(false)}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cachedDocs.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <Download className="w-10 h-10 text-gray-200 mb-3" />
                  <p className="text-gray-500 text-sm">
                    No hay documentos descargados para uso offline.
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Descarga certificados o lotes mientras estés en línea para
                    acceder a ellos sin conexión.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cachedDocs.map((doc) => (
                    <div
                      key={doc.url}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
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
                          className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Abrir"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(doc.url)}
                          className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cachedDocs.length > 0 && (
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={handleClearAll}
                  className="w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Eliminar todas las descargas
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
