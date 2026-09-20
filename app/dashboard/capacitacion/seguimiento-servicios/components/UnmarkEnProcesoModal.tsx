"use client";

import { useState } from "react";
import { AlertTriangle, X, Loader2, CalendarClock } from "lucide-react";

interface UnmarkEnProcesoModalProps {
  isOpen: boolean;
  osiId: number;
  nroOsi: string;
  nroSesion: number;
  onClose: () => void;
  onConfirm: (reason: string, isRescheduled: boolean, newDate?: string | null) => Promise<void>;
}

export default function UnmarkEnProcesoModal({
  isOpen,
  osiId,
  nroOsi,
  nroSesion,
  onClose,
  onConfirm,
}: UnmarkEnProcesoModalProps) {
  const [reason, setReason] = useState("");
  const [isRescheduled, setIsRescheduled] = useState(true);
  const [newDate, setNewDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length < 5) {
      setValidationError("Por favor ingrese un motivo detallado (al menos 5 caracteres).");
      return;
    }

    setSubmitting(true);
    setValidationError(null);
    try {
      await onConfirm(trimmed, isRescheduled, isRescheduled && newDate ? newDate : null);
      onClose();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Error al desmarcar el paso.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Desmarcar "En proceso/Ejecutado"
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                OSI: <span className="font-semibold text-gray-700">{nroOsi}</span> — Sesión{" "}
                <span className="font-semibold text-gray-700">{nroSesion}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-xs text-amber-800 leading-relaxed">
            El servicio se registrará como <strong>NO EJECUTADO</strong>. Se requiere ingresar una
            justificación obligatoria que quedará registrada en el historial de notas de la OSI para
            conocimiento de todo el equipo.
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Motivo / Justificación del desmarcado <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Ej: El cliente solicitó suspender la fecha por falta de quórum; el facilitador tuvo un inconveniente y se reprogramará..."
              className={`w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors resize-none ${
                validationError
                  ? "border-red-400 focus:ring-red-200"
                  : "border-gray-300 focus:ring-amber-300 focus:border-amber-400"
              }`}
              autoFocus
              disabled={submitting}
            />
            {validationError && (
              <p className="text-[11px] text-red-600 font-medium mt-1">{validationError}</p>
            )}
          </div>

          {/* Reschedule checkbox */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 hover:bg-gray-100/60 transition-colors cursor-pointer">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isRescheduled}
                onChange={(e) => setIsRescheduled(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                  Re-agendar este servicio
                </span>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Marca la OSI como <strong>Re-agendada</strong> en el sistema para indicar que
                  el servicio está pendiente de reprogramación.
                </p>
              </div>
            </label>

            {/* Optional new execution date input */}
            {isRescheduled && (
              <div
                className="mt-3 pt-3 border-t border-gray-200/80 animate-in fade-in duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nueva fecha de ejecución (opcional)
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  disabled={submitting}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-400 focus:outline-none transition-colors bg-white"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Si ya se conoce la nueva fecha, indíquela aquí. De lo contrario, déjela en blanco (quedará como "Fecha por confirmar").
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Desmarcando...
                </>
              ) : (
                "Confirmar Desmarcado"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
