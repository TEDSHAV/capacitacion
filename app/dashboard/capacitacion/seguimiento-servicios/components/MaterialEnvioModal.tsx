"use client";

import { useState, useEffect } from "react";
import { Package, Laptop, X, Loader2, CheckCircle2, RotateCcw } from "lucide-react";
import type { ProcesoStepRecord } from "@/app/actions/capacitacion-proceso-steps";

interface MaterialEnvioModalProps {
  isOpen: boolean;
  onClose: () => void;
  osiId: number;
  nroOsi: string;
  nroSesion: number;
  empresa?: string;
  servicio?: string;
  stepRecord?: ProcesoStepRecord | null;
  onConfirm: (tipoEnvio: "digital" | "fisico", guia?: string | null) => Promise<void>;
  onUnmark?: () => Promise<void>;
}

export default function MaterialEnvioModal({
  isOpen,
  onClose,
  osiId,
  nroOsi,
  nroSesion,
  empresa,
  servicio,
  stepRecord,
  onConfirm,
  onUnmark,
}: MaterialEnvioModalProps) {
  const [tipoEnvio, setTipoEnvio] = useState<"digital" | "fisico">("digital");
  const [guia, setGuia] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [unmarking, setUnmarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCompleted = !!stepRecord?.completed;

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSubmitting(false);
    setUnmarking(false);

    const meta = (stepRecord?.step_metadata as Record<string, unknown> | null) || {};
    const existingTipo = (meta.tipo_envio as string) || (stepRecord?.notes === "Digital" ? "digital" : "fisico");
    const existingGuia =
      (meta.guia as string) ||
      (stepRecord?.notes?.startsWith("Físico")
        ? stepRecord.notes.replace(/^Físico\s*-\s*Guía:\s*/i, "")
        : "");

    if (existingTipo === "fisico" || Boolean(existingGuia)) {
      setTipoEnvio("fisico");
      setGuia(existingGuia || "");
    } else {
      setTipoEnvio("digital");
      setGuia("");
    }
  }, [isOpen, stepRecord]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tipoEnvio === "fisico" && !guia.trim()) {
      setError("Debe ingresar el número de guía o tracking para envíos físicos.");
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm(tipoEnvio, tipoEnvio === "fisico" ? guia.trim() : null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el envío.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnmark = async () => {
    if (!onUnmark) return;
    setUnmarking(true);
    setError(null);
    try {
      await onUnmark();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al desmarcar el paso.");
    } finally {
      setUnmarking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Envío de Material al Facilitador
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                OSI <span className="font-semibold text-gray-700">{nroOsi}</span> · Sesión{" "}
                <span className="font-semibold text-gray-700">{nroSesion}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting || unmarking}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {empresa && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5 border border-gray-200/60">
              <span className="font-semibold text-gray-800">Cliente:</span> {empresa}
              {servicio && (
                <div className="mt-0.5 truncate text-[11px] text-gray-500">
                  <span className="font-medium text-gray-700">Curso:</span> {servicio}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              ¿Cómo fue remitido el material al facilitador? <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* Option Digital */}
              <button
                type="button"
                onClick={() => setTipoEnvio("digital")}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                  tipoEnvio === "digital"
                    ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      tipoEnvio === "digital"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <Laptop className="w-4 h-4" />
                  </div>
                  {tipoEnvio === "digital" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Digital</span>
                  <span className="text-[11px] text-gray-500 leading-tight block mt-0.5">
                    Correo electrónico, WhatsApp o descarga portal
                  </span>
                </div>
              </button>

              {/* Option Físico */}
              <button
                type="button"
                onClick={() => setTipoEnvio("fisico")}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                  tipoEnvio === "fisico"
                    ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      tipoEnvio === "fisico"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <Package className="w-4 h-4" />
                  </div>
                  {tipoEnvio === "fisico" && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Físico</span>
                  <span className="text-[11px] text-gray-500 leading-tight block mt-0.5">
                    Envío físico con guía de encomienda o valija
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* If Físico, show tracking number input */}
          {tipoEnvio === "fisico" && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Número de Guía / Tracking <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                value={guia}
                onChange={(e) => {
                  setGuia(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ej: ZOOM 12345678, MRW 987654..."
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Registra la empresa de encomienda y el número de guía para trazabilidad.
              </p>
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            {isCompleted && onUnmark ? (
              <button
                type="button"
                onClick={handleUnmark}
                disabled={submitting || unmarking}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {unmarking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Desmarcar paso</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting || unmarking}
                className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || unmarking}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{isCompleted ? "Actualizar envío" : "Confirmar envío"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
