"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Printer,
  ExternalLink,
  Loader2,
  FileText,
  AlertCircle,
  X,
  Building2,
} from "lucide-react";
import OSICompleteFormat from "@/app/dashboard/capacitacion/gestion-osi/components/osi-complete-format";
import { getOsiParaFormatoCompleto } from "@/app/actions/osi";
import type { OSIManagement } from "@/types";

interface OsiPreviewModalProps {
  osiId: number | null;
  osiNumber?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function OsiPreviewModal({
  osiId,
  osiNumber,
  isOpen,
  onClose,
}: OsiPreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [osi, setOsi] = useState<OSIManagement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !osiId) {
      setOsi(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getOsiParaFormatoCompleto(osiId)
      .then((res) => {
        if (!isMounted) return;
        if (res.error || !res.data) {
          setError(res.error || "No se pudo cargar la información de la OSI");
        } else {
          setOsi(res.data);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Error al cargar la OSI");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, osiId]);

  const handlePrint = () => {
    window.print();
  };

  const shellUrl = process.env.NEXT_PUBLIC_SHELL_URL || "";
  const externalPreviewUrl = osiId ? `${shellUrl}/consulta-osi/preview/${osiId}` : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50/50">
        {/* Top Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                <FileText className="w-5 h-5 text-blue-600" />
              </span>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Formato Oficial de la OSI</span>
                {(osi?.nro_osi || osiNumber) && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                    N° {osi?.nro_osi || osiNumber}
                  </span>
                )}
              </DialogTitle>
            </div>
            {osi?.nombre_empresa && (
              <p className="text-xs text-slate-500 pl-9 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{osi.nombre_empresa}</span>
                {osi.servicio && <span>· {osi.servicio}</span>}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {externalPreviewUrl && (
              <a
                href={externalPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
                title="Abrir en PRISMA Consulta OSI (pestaña externa)"
              >
                <span>Consulta OSI</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={loading || !osi}
              className="h-8 text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              title="Imprimir formato de la OSI"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              Imprimir
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Cerrar vista previa (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-xs font-medium text-slate-600">
                Cargando formato oficial de la OSI...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 bg-white rounded-2xl border border-red-200 max-w-md mx-auto text-center space-y-3 my-8 shadow-xs">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                No se pudo cargar la vista previa
              </h4>
              <p className="text-xs text-slate-500">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (osiId) {
                    setLoading(true);
                    setError(null);
                    getOsiParaFormatoCompleto(osiId)
                      .then((res) => {
                        if (res.data) setOsi(res.data);
                        else setError(res.error || "No se pudo cargar");
                      })
                      .finally(() => setLoading(false));
                  }
                }}
                className="mt-2 text-xs"
              >
                Reintentar
              </Button>
            </div>
          ) : osi ? (
            <div className="bg-white p-2 sm:p-4 rounded-xl shadow-xs border border-slate-200 max-w-[850px] mx-auto print:border-none print:shadow-none">
              <OSICompleteFormat osi={osi} />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
