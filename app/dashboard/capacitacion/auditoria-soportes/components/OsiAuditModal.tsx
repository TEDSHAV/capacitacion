"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertCircle, X, ExternalLink } from "lucide-react";
import { getOsiAuditDetail, type OsiAuditDetailData } from "@/app/actions/facilitador-uploads-audit";
import { OsiAuditWorkspaceClient } from "../[id]/OsiAuditWorkspaceClient";

interface OsiAuditModalProps {
  osiId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OsiAuditModal({ osiId, isOpen, onClose }: OsiAuditModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OsiAuditDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOsiAuditDetail(id);
      if (res.error || !res.data) {
        setError(res.error || "No se pudo cargar la información de la OSI.");
        setData(null);
      } else {
        setData(res.data);
      }
    } catch (e: unknown) {
      console.error("[OsiAuditModal] Error fetching detail:", e);
      setError(e instanceof Error ? e.message : "Error inesperado");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && osiId != null) {
      fetchDetail(osiId);
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, osiId, fetchDetail]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while open
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

  if (!isOpen || osiId == null) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[1720px] max-h-[96vh] flex flex-col bg-slate-100 rounded-3xl shadow-2xl border border-slate-700/30 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Classic styled top-right close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-[90] p-2 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-full border border-slate-300 shadow-md transition-all cursor-pointer"
          title="Cerrar ventana (Esc)"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-sky-600" />
            <p className="text-sm font-bold text-slate-800">
              Cargando revisión de notas y documentos...
            </p>
            <p className="text-xs text-slate-400">
              Consultando documentos del facilitador y participantes
            </p>
          </div>
        ) : error ? (
          <div className="p-8 sm:p-12 bg-white rounded-3xl text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Error al cargar auditoría
              </h3>
              <p className="text-xs text-slate-500 mt-1">{error}</p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => osiId && fetchDetail(osiId)}
                className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition-colors shadow-2xs cursor-pointer"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : data ? (
          <div className="p-3 sm:p-5 overflow-y-auto max-h-[96vh]">
            <OsiAuditWorkspaceClient data={data} onClose={onClose} isModal={true} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
