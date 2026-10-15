"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  CalendarClock,
  AlertTriangle,
  X,
  Loader2,
  Calendar,
  RotateCcw,
} from "lucide-react";
import type { ProcesoStepRecord } from "@/app/actions/capacitacion-proceso-steps";
import { SALONES_SHA, isShaLocation } from "@/lib/constants/salones";

interface EjecucionOsiModalProps {
  isOpen: boolean;
  osiId: number;
  nroOsi: string;
  nroSesion: number;
  empresa?: string;
  servicio?: string;
  direccion?: string;
  stepRecord?: ProcesoStepRecord | null;
  onClose: () => void;
  onConfirmEjecutado: (executionDate?: string | null, salon?: string | null) => Promise<void>;
  onConfirmReagendar: (reason: string, newDate?: string | null) => Promise<void>;
  onRestoreToActive?: () => Promise<void>;
}

const PRESET_MOTIVOS_REAGENDAR = [
  "Solicitud de la empresa cliente",
  "Falta de quórum / inasistencia de participantes",
  "Indisposición o fuerza mayor del facilitador",
  "Falla de transporte o logística de traslado",
  "Causa climática / interrupción de servicios",
  "Postergación de común acuerdo",
];

function getCaracasTodayStr(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

export default function EjecucionOsiModal({
  isOpen,
  nroOsi,
  nroSesion,
  empresa,
  servicio,
  direccion,
  stepRecord,
  onClose,
  onConfirmEjecutado,
  onConfirmReagendar,
  onRestoreToActive,
}: EjecucionOsiModalProps) {
  const isCurrentlyRescheduled = Boolean(stepRecord?.step_metadata?.is_rescheduled);
  const isCurrentlyCompleted = Boolean(stepRecord?.completed);
  const isSha = isShaLocation(direccion);

  // Tab mode: "ejecutado" | "reagendar"
  const [mode, setMode] = useState<"ejecutado" | "reagendar">("ejecutado");

  // State for Ejecutado
  const [executionDate, setExecutionDate] = useState(getCaracasTodayStr());
  const [selectedSalon, setSelectedSalon] = useState<string>("");

  // State for Reagendar
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValidationError(null);
      setSubmitting(false);

      const existingSalon = (stepRecord?.step_metadata?.salon as string | undefined) || "";
      setSelectedSalon(existingSalon);

      if (isCurrentlyRescheduled) {
        setMode("reagendar");
        setReason(stepRecord?.notes ?? "");
        setNewDate(
          typeof stepRecord?.step_metadata?.new_date === "string"
            ? stepRecord.step_metadata.new_date
            : ""
        );
      } else {
        setMode("ejecutado");
        setExecutionDate(
          typeof stepRecord?.completed_at === "string"
            ? stepRecord.completed_at.split("T")[0]
            : getCaracasTodayStr()
        );
        setReason("");
        setNewDate("");
      }
    }
  }, [isOpen, isCurrentlyRescheduled, stepRecord]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (mode === "ejecutado") {
      setSubmitting(true);
      try {
        await onConfirmEjecutado(
          executionDate.trim() || null,
          isSha ? (selectedSalon.trim() || null) : null,
        );
        onClose();
      } catch (err) {
        setValidationError(err instanceof Error ? err.message : "Error al marcar como ejecutado.");
      } finally {
        setSubmitting(false);
      }
    } else {
      // Reagendar
      const trimmedReason = reason.trim();
      if (!trimmedReason || trimmedReason.length < 5) {
        setValidationError("Por favor ingrese un motivo explicativo (al menos 5 caracteres).");
        return;
      }

      setSubmitting(true);
      try {
        const cleanNewDate = newDate.trim() ? newDate.trim() : null;
        await onConfirmReagendar(trimmedReason, cleanNewDate);
        onClose();
      } catch (err) {
        setValidationError(err instanceof Error ? err.message : "Error al reagendar el servicio.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleReset = async () => {
    if (!onRestoreToActive) return;
    if (!confirm(`¿Desea restablecer este servicio a estado Activo (Pendiente de ejecución original)?`)) {
      return;
    }
    setSubmitting(true);
    setValidationError(null);
    try {
      await onRestoreToActive();
      onClose();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Error al restablecer el servicio.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-sky-50/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-gray-900 tracking-tight">
                Gestión de Ejecución / Reagendamiento
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              OSI: <strong className="text-sky-700">{nroOsi}</strong> · Sesión{" "}
              <strong className="text-gray-800">{nroSesion}</strong>
              {empresa && ` · ${empresa}`}
            </p>
            {servicio && (
              <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-md">{servicio}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current State Banner */}
        {isCurrentlyRescheduled ? (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200/80 flex items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Actualmente Re-agendada:</span>{" "}
                {stepRecord?.step_metadata?.new_date ? (
                  <span>Para el {String(stepRecord.step_metadata.new_date)}</span>
                ) : (
                  <span className="italic font-medium">Fecha por confirmar</span>
                )}
                {stepRecord?.notes && (
                  <span className="block text-[11px] text-amber-700 mt-0.5">
                    Motivo: {stepRecord.notes}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : isCurrentlyCompleted ? (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200/80 flex items-center justify-between gap-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Actualmente Ejecutada:</span>{" "}
                {stepRecord?.completed_at ? (
                  <span>Fecha registrada: {stepRecord.completed_at.split("T")[0]}</span>
                ) : (
                  <span>Completada</span>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Selector Tabs: Ejecutado vs Reagendado */}
        <div className="p-5 pb-3">
          <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Seleccione la acción para esta sesión:
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Opción A: Ejecutado */}
            <button
              type="button"
              onClick={() => {
                setMode("ejecutado");
                setValidationError(null);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                mode === "ejecutado"
                  ? "bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs"
                  : "bg-white border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/20"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    mode === "ejecutado" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-gray-900">Marcar como Ejecutado</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-tight">
                El curso se impartió con éxito a los participantes.
              </p>
            </button>

            {/* Opción B: Reagendado */}
            <button
              type="button"
              onClick={() => {
                setMode("reagendar");
                setValidationError(null);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                mode === "reagendar"
                  ? "bg-amber-50/70 border-amber-400 ring-2 ring-amber-500/20 shadow-xs"
                  : "bg-white border-gray-200 hover:border-amber-300 hover:bg-amber-50/20"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    mode === "reagendar" ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  <CalendarClock className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-gray-900">Re-agendar Servicio</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-tight">
                No se impartió en la fecha prevista y debe ser reprogramado.
              </p>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {mode === "ejecutado" ? (
            /* Campos para Marcar como Ejecutado */
            <div className="space-y-3 bg-emerald-50/40 p-4 rounded-xl border border-emerald-200/60 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Fecha real de ejecución
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={executionDate}
                    onChange={(e) => setExecutionDate(e.target.value)}
                    disabled={submitting}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none bg-white font-medium"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Fecha en la que culminó esta sesión de clase (se utilizará para el conteo de 72h).
                </p>
              </div>

              {/* Salón SHA Selection Box (shown when address has SHA) */}
              {isSha && (
                <div className="pt-3 border-t border-emerald-200/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-800">
                      Salón de capacitación (Sede SHA)
                    </label>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100/90 font-bold px-2 py-0.5 rounded-full">
                      Instalaciones SHA
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 mb-2">
                    ¿En cuál salón se impartió el servicio? Esta información se auditará en la vista gerencial de Cobertura Geográfica.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {SALONES_SHA.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSalon(s)}
                        className={`py-2 px-2.5 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                          selectedSalon === s
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1 text-[11px]">
                    <span className="text-gray-500">
                      Salón asignado: <strong className="text-gray-900">{selectedSalon || "Sin seleccionar"}</strong>
                    </span>
                    {selectedSalon && (
                      <button
                        type="button"
                        onClick={() => setSelectedSalon("")}
                        className="text-gray-400 hover:text-red-600 font-medium transition cursor-pointer"
                      >
                        Limpiar selección
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Campos para Re-agendar */
            <div className="space-y-3 bg-amber-50/40 p-4 rounded-xl border border-amber-200/60 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                  Motivo de la postergación / justificación <span className="text-red-500">*</span>
                </label>

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {PRESET_MOTIVOS_REAGENDAR.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReason(preset)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Explique el motivo por el cual no se impartió la capacitación..."
                  disabled={submitting}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Nueva fecha tentativa de ejecución <span className="text-gray-400 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    disabled={submitting}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white font-medium"
                  />
                </div>
                <p className="text-[11px] text-amber-700/90 mt-1 font-medium">
                  {newDate ? (
                    `Reprogramado para el ${newDate}`
                  ) : (
                    "💡 Puede dejar este campo en blanco si aún no se conoce la fecha. Quedará como 'Fecha por confirmar'."
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              {(isCurrentlyCompleted || isCurrentlyRescheduled) && onRestoreToActive && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Restablecer este servicio a estado pendiente original"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer a Pendiente</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                  mode === "ejecutado"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : mode === "ejecutado" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmar como Ejecutado</span>
                  </>
                ) : (
                  <>
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span>Confirmar Reagendamiento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
