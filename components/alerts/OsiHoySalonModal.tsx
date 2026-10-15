"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, X, Loader2, Sparkles, Building, Landmark, AlertCircle } from "lucide-react";
import type { OsiHoyItem } from "@/app/actions/alertas-servicios-hoy";
import { confirmarEjecucionHoy, actualizarSalonHoy } from "@/app/actions/alertas-servicios-hoy";
import { SALONES_SHA } from "@/lib/constants/salones";
import { useToast } from "@/lib/ui/toast-context";

interface OsiHoySalonModalProps {
  isOpen: boolean;
  item: OsiHoyItem | null;
  isAlreadyConfirmed?: boolean;
  onClose: () => void;
  onSuccess: (salon: string | null) => void;
}

export function OsiHoySalonModal({
  isOpen,
  item,
  isAlreadyConfirmed = false,
  onClose,
  onSuccess,
}: OsiHoySalonModalProps) {
  const { addToast } = useToast();
  const [selectedSalon, setSelectedSalon] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setSelectedSalon(item.salon || "");
      setErrorMsg(null);
      setSubmitting(false);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const cleanSalon = selectedSalon.trim() || null;

    try {
      if (isAlreadyConfirmed) {
        // Just updating the assigned salon
        const res = await actualizarSalonHoy(item.osiId, item.nroSesion, cleanSalon);
        if (!res.success) {
          setErrorMsg(res.error || "No se pudo actualizar el salón.");
          setSubmitting(false);
          return;
        }

        addToast(
          cleanSalon
            ? `Salón asignado a ${cleanSalon} para OSI ${item.nroOsi}.`
            : `Salón removido para OSI ${item.nroOsi}.`,
          "success",
        );
        onSuccess(cleanSalon);
        onClose();
      } else {
        // Confirming execution WITH salon
        const res = await confirmarEjecucionHoy(item.osiId, item.nroSesion, cleanSalon);
        if (!res.success) {
          setErrorMsg(res.error || "No se pudo confirmar la ejecución.");
          setSubmitting(false);
          return;
        }

        addToast(
          cleanSalon
            ? `¡Servicio confirmado! OSI ${item.nroOsi} registrado en ${cleanSalon}.`
            : `¡Servicio confirmado! OSI ${item.nroOsi} registrado en ejecución.`,
          "success",
        );
        onSuccess(cleanSalon);
        onClose();
      }
    } catch (err) {
      console.error("[OsiHoySalonModal] error:", err);
      setErrorMsg("Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent top stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" />

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {isAlreadyConfirmed ? "Modificar Salón SHA" : "Confirmar Salón SHA"}
              </h3>
              <p className="text-xs text-slate-500">
                OSI {item.nroOsi} · Sesión {item.nroSesion} de {item.totalSesiones}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Service context snippet */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
            <p className="font-bold text-slate-800 truncate">{item.servicio}</p>
            <p className="text-slate-600 flex items-center gap-1.5 truncate">
              <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{item.nombreEmpresa}</span>
            </p>
            {(item.sede || item.direccion) && (
              <p className="text-[11px] text-slate-500 truncate">
                Ubicación: {item.sede || item.direccion}
              </p>
            )}
          </div>

          {/* Salon selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800">
                ¿En cuál salón se impartió el servicio?
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Sede SHA
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Seleccione el salón utilizado para registrar la ocupación de sedes con fines gerenciales y estadísticos.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SALONES_SHA.map((s) => {
                const isSelected = selectedSalon === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSalon(s)}
                    disabled={submitting}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900 font-bold shadow-xs"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-semibold"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                        isSelected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Landmark className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs">{s}</span>
                    {isSelected && (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        Seleccionado
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Clear / Unassigned Option */}
            <div className="flex items-center justify-between mt-2 pt-1 text-[11px]">
              <span className="text-slate-500">
                Salón actual:{" "}
                <strong className="text-slate-800">
                  {selectedSalon || "Sin salón asignado"}
                </strong>
              </span>
              {selectedSalon && (
                <button
                  type="button"
                  onClick={() => setSelectedSalon("")}
                  disabled={submitting}
                  className="text-slate-400 hover:text-rose-600 font-medium transition-colors"
                >
                  Dejar sin asignar
                </button>
              )}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-900 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>
              La asignación del salón se reflejará en la vista gerencial de <strong>Cobertura Geográfica</strong> y en el panel de <strong>Seguimiento de Servicios</strong>. Puede cambiarse en cualquier momento si hubo algún error.
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : isAlreadyConfirmed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Guardar Salón</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmar Ejecución</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
