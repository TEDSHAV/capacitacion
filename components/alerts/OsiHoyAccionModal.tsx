"use client";

import { useState, useEffect } from "react";
import { CalendarClock, XCircle, AlertTriangle, X, Loader2, Sparkles } from "lucide-react";
import type { OsiHoyItem } from "@/app/actions/alertas-servicios-hoy";
import { reagendarServicioHoy, cancelarServicioHoy } from "@/app/actions/alertas-servicios-hoy";
import { useToast } from "@/lib/ui/toast-context";

interface OsiHoyAccionModalProps {
  isOpen: boolean;
  item: OsiHoyItem | null;
  mode: "reagendar" | "cancelar";
  onClose: () => void;
  onSuccess: (updatedStatus: "reagendado" | "no_ejecutado", newDate?: string | null) => void;
}

const PRESET_MOTIVOS_REAGENDAR = [
  "Solicitud de la empresa cliente",
  "Falta de quórum / inasistencia de participantes",
  "Indisposición o fuerza mayor del facilitador",
  "Falla de transporte / logística de traslado",
  "Causa climática / interrupción de servicios",
];

const PRESET_MOTIVOS_CANCELAR = [
  "Cancelado formalmente por la empresa cliente",
  "Servicio ya no requerido por el cliente",
  "Inasistencia total al punto de encuentro",
  "Incumplimiento de condiciones mínimas de seguridad",
];

export function OsiHoyAccionModal({
  isOpen,
  item,
  mode,
  onClose,
  onSuccess,
}: OsiHoyAccionModalProps) {
  const { addToast } = useToast();
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isReagendar = mode === "reagendar";

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setNewDate("");
      setErrorMsg(null);
      setSubmitting(false);
    }
  }, [isOpen, mode]);

  if (!isOpen || !item) return null;

  const presets = isReagendar ? PRESET_MOTIVOS_REAGENDAR : PRESET_MOTIVOS_CANCELAR;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length < 5) {
      setErrorMsg("Por favor ingrese un motivo explicativo (al menos 5 caracteres).");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const cleanNewDate = newDate.trim() ? newDate.trim() : null;

    try {
      if (isReagendar) {
        const res = await reagendarServicioHoy({
          osiId: item.osiId,
          nroSesion: item.nroSesion,
          reason: trimmed,
          newDate: cleanNewDate,
        });

        if (!res.success) {
          setErrorMsg(res.error || "No se pudo reagendar el servicio.");
          setSubmitting(false);
          return;
        }

        addToast(
          cleanNewDate
            ? `OSI ${item.nroOsi} reagendada con éxito para el ${cleanNewDate}.`
            : `OSI ${item.nroOsi} reagendada con éxito (Fecha por confirmar).`,
          "success",
        );
        onSuccess("reagendado", cleanNewDate);
      } else {
        const res = await cancelarServicioHoy({
          osiId: item.osiId,
          nroSesion: item.nroSesion,
          reason: trimmed,
        });

        if (!res.success) {
          setErrorMsg(res.error || "No se pudo marcar como no ejecutada.");
          setSubmitting(false);
          return;
        }

        addToast(
          `OSI ${item.nroOsi} marcada como no ejecutada.`,
          "warning",
        );
        onSuccess("no_ejecutado");
      }

      onClose();
    } catch (err) {
      console.error("[OsiHoyAccionModal] Error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-start justify-between p-5 border-b ${
            isReagendar
              ? "bg-indigo-50/70 border-indigo-100"
              : "bg-rose-50/70 border-rose-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isReagendar
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {isReagendar ? (
                <CalendarClock className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isReagendar ? "Reagendar Servicio de Hoy" : "Marcar Servicio como No Ejecutado"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                OSI: <span className="font-semibold text-slate-800">{item.nroOsi}</span> · Sesión{" "}
                <span className="font-semibold text-slate-800">{item.nroSesion} de {item.totalSesiones}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OSI Context strip */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/80 text-xs space-y-1">
          <p className="font-semibold text-slate-800 truncate">{item.servicio}</p>
          <p className="text-slate-500 truncate">{item.nombreEmpresa}</p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* New Date Picker for Rescheduling */}
          {isReagendar && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nueva fecha tentativa <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {newDate ? "La fecha planificada original permanecerá en el historial de SLA." : "Si aún no se conoce la fecha, déjela en blanco (quedará como 'Fecha por confirmar')."}
              </p>
            </div>
          )}

          {/* Preset Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Motivos comunes (haz clic para autocompletar)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setReason(preset);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border text-left transition-all ${
                    reason === preset
                      ? isReagendar
                        ? "bg-indigo-50 border-indigo-300 text-indigo-800 font-semibold"
                        : "bg-rose-50 border-rose-300 text-rose-800 font-semibold"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Justification */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Motivo / Justificación detallada <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder={
                isReagendar
                  ? "Explica la causa de la reprogramación..."
                  : "Explica la causa de la suspensión o cancelación..."
              }
              className="w-full text-xs rounded-xl border border-slate-300 p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Esta justificación se registrará en el historial de notas de la OSI.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 ${
                isReagendar
                  ? "bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
                  : "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400"
              }`}
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isReagendar ? "Reagendar Servicio" : "Confirmar No Ejecutado"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
