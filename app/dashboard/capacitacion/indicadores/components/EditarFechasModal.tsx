"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Info,
  Save,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { IndicadorOsiRow } from "@/types";
import { parseDate, toDateStr, businessDaysInclusive } from "@/lib/business-days";
import { saveIndicadorAjuste, resetIndicadorAjuste } from "@/app/actions/indicadores-ajustes";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  row: IndicadorOsiRow | null;
  initialFocusField?: "ejecucion" | "emision";
  onSuccess?: () => void;
}

function toInputDate(s: string | null | undefined): string {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try {
    const d = parseDate(s);
    if (isNaN(d.getTime())) return "";
    return toDateStr(d);
  } catch {
    return "";
  }
}

function formatDateDisplay(s: string | null | undefined): string {
  if (!s) return "Sin registro";
  const d = parseDate(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const MOTIVOS_SUGERIDOS = [
  "Carga tardía en sistema",
  "Servicio ejecutado en fecha real distinta",
  "Certificados emitidos previamente fuera de línea",
  "Corrección administrativa de fecha",
];

export default function EditarFechasModal({
  isOpen,
  onClose,
  row,
  initialFocusField = "ejecucion",
  onSuccess,
}: Props) {
  const [fechaEjecucion, setFechaEjecucion] = useState("");
  const [fechaEmision, setFechaEmision] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever modal opens with a new row
  useEffect(() => {
    if (row && isOpen) {
      setFechaEjecucion(toInputDate(row.fechaEjecucion));
      setFechaEmision(toInputDate(row.fechaEmision));
      setMotivo(row.motivoAjuste ?? "");
      setError(null);
    }
  }, [row, isOpen]);

  const originalEjecucionInput = toInputDate(row?.originalFechaEjecucion);
  const originalEmisionInput = toInputDate(row?.originalFechaEmision);

  const isEjecucionDifferentFromSystem = Boolean(
    fechaEjecucion && fechaEjecucion !== originalEjecucionInput
  );
  const isEmisionDifferentFromSystem = Boolean(
    fechaEmision && fechaEmision !== originalEmisionInput
  );

  const isCurrentlyAdjusted = Boolean(
    row?.fechaEjecucionAjustada || row?.fechaEmisionAjustada
  );

  // Live simulation of the SLA calculation with the currently entered dates
  const liveSimulation = useMemo(() => {
    if (!fechaEjecucion) {
      return {
        estado: "no_aplica" as const,
        label: "Sin fecha de ejecución (no evaluable)",
        color: "text-gray-500 bg-gray-100",
      };
    }

    const execDate = parseDate(fechaEjecucion);
    const now = new Date();

    if (execDate > now) {
      return {
        estado: "programada" as const,
        label: "Programada · Fecha en el futuro (reloj 72h aún no inicia)",
        color: "text-indigo-700 bg-indigo-50 border-indigo-200",
      };
    }

    if (!fechaEmision) {
      return {
        estado: "pendiente" as const,
        label: "Pendiente por generar certificados",
        color: "text-amber-700 bg-amber-50 border-amber-200",
      };
    }

    const certDate = parseDate(fechaEmision);
    if (certDate < execDate) {
      return {
        estado: "dentro" as const,
        label: "Pre-generado (0 días hábiles) · A tiempo",
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
        diasHabiles: 0,
      };
    }

    // Weekday-based business day count (empty holidays set for quick client preview)
    const dias = businessDaysInclusive(execDate, certDate, new Set());
    if (dias <= 3) {
      return {
        estado: "dentro" as const,
        label: `A tiempo (${dias} ${dias === 1 ? "día hábil" : "días hábiles"} ≤ 3)`,
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
        diasHabiles: dias,
      };
    }

    const brecha = dias - 3;
    return {
      estado: "fuera" as const,
      label: `Fuera de plazo (${dias} días hábiles · +${brecha}d de retraso)`,
      color: "text-red-700 bg-red-50 border-red-200",
      diasHabiles: dias,
    };
  }, [fechaEjecucion, fechaEmision]);

  if (!isOpen || !row) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await saveIndicadorAjuste({
        osiId: row.osiId,
        fechaEjecucion: fechaEjecucion || null,
        fechaEmision: fechaEmision || null,
        motivo: motivo.trim() || null,
      });

      if (!res.success) {
        setError(res.error || "Error al guardar el ajuste de fechas.");
        setSaving(false);
        return;
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (tipo: "all" | "ejecucion" | "emision") => {
    setError(null);
    setResetting(true);

    try {
      const res = await resetIndicadorAjuste(row.osiId, tipo);
      if (!res.success) {
        setError(res.error || "Error al restablecer las fechas.");
        setResetting(false);
        return;
      }

      if (tipo === "all" || tipo === "ejecucion") {
        setFechaEjecucion(originalEjecucionInput);
      }
      if (tipo === "all" || tipo === "emision") {
        setFechaEmision(originalEmisionInput);
      }
      if (tipo === "all") {
        setMotivo("");
      }

      onSuccess?.();
      if (tipo === "all") {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-sky-50/50 via-white to-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
                {row.nroOsi}
              </span>
              <h3 className="text-base font-bold text-gray-900">
                Ajustar Fechas Reales para Indicadores SLA
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1 truncate max-w-md" title={row.empresa}>
              {row.empresa} {row.servicio ? `· ${row.servicio}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Callout */}
        <div className="px-6 pt-4">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-50/80 border border-sky-100 text-sky-900 text-xs leading-relaxed">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <p>
              Estos cambios se preservan <strong>exclusivamente para este tablero de indicadores (72h)</strong>.
              No alteran la tabla oficial de la OSI ni las fechas reales registradas en certificados del sistema.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Fecha 1: Fecha de Ejecución */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="fecha-ejecucion-input"
                className="text-xs font-semibold text-gray-800 flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                Fecha Real de Ejecución del Servicio
              </label>
              {row.fechaEjecucionAjustada && (
                <button
                  type="button"
                  disabled={resetting || saving}
                  onClick={() => handleReset("ejecucion")}
                  className="text-[11px] text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restablecer original
                </button>
              )}
            </div>

            <div className="relative">
              <input
                id="fecha-ejecucion-input"
                type="date"
                autoFocus={initialFocusField === "ejecucion"}
                value={fechaEjecucion}
                onChange={(e) => setFechaEjecucion(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
              <span>
                Fecha original del sistema:{" "}
                <strong className="text-gray-700">
                  {formatDateDisplay(row.originalFechaEjecucion)}
                </strong>
              </span>
              {isEjecucionDifferentFromSystem && (
                <span className="text-sky-700 font-medium">Modificada manualmente</span>
              )}
            </div>
          </div>

          {/* Fecha 2: Registro de Certificados */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="fecha-emision-input"
                className="text-xs font-semibold text-gray-800 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                Fecha Real de Registro / Emisión de Certificados
              </label>
              {row.fechaEmisionAjustada && (
                <button
                  type="button"
                  disabled={resetting || saving}
                  onClick={() => handleReset("emision")}
                  className="text-[11px] text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restablecer original
                </button>
              )}
            </div>

            <div className="relative">
              <input
                id="fecha-emision-input"
                type="date"
                autoFocus={initialFocusField === "emision"}
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
              <span>
                Fecha original del sistema:{" "}
                <strong className="text-gray-700">
                  {formatDateDisplay(row.originalFechaEmision)}
                </strong>
              </span>
              {isEmisionDifferentFromSystem && (
                <span className="text-sky-700 font-medium">Modificada manualmente</span>
              )}
            </div>
          </div>

          {/* Motivo del Ajuste */}
          <div className="space-y-1.5">
            <label
              htmlFor="motivo-input"
              className="text-xs font-semibold text-gray-700 flex items-center justify-between"
            >
              <span>Motivo del Ajuste (opcional)</span>
              <span className="text-[10px] text-gray-400 font-normal">Para registro y auditoría</span>
            </label>
            <input
              id="motivo-input"
              type="text"
              placeholder="Ej. Carga tardía en sistema, culminación en fecha distinta..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={200}
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
            />
            {/* Sugerencias Rápidas */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {MOTIVOS_SUGERIDOS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setMotivo(sug)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-sky-50 hover:text-sky-700 text-gray-600 transition-colors cursor-pointer border border-transparent hover:border-sky-200"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* SLA Live Simulation */}
          <div className="p-3.5 rounded-xl border border-gray-200 bg-white shadow-xs space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Simulación del Plazo SLA (72 Horas)
              </span>
            </div>
            <div
              className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${liveSimulation.color}`}
            >
              {liveSimulation.estado === "dentro" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : liveSimulation.estado === "fuera" ? (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{liveSimulation.label}</span>
            </div>
            <p className="text-[11px] text-gray-500 italic">
              Plazo normativo: máximo 3 días hábiles desde la última sesión ejecutada.
            </p>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3">
          <div>
            {isCurrentlyAdjusted && (
              <button
                type="button"
                disabled={resetting || saving}
                onClick={() => handleReset("all")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                {resetting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                Restablecer a valores del sistema
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving || resetting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200/70 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving || resetting}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Guardar Fechas
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
