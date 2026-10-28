"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Eye,
  Lock,
  X,
  XCircle,
  ExternalLink,
  CalendarClock,
  Calendar,
  Pencil,
} from "lucide-react";
import type { StepDef } from "@/lib/proceso-steps";
import type { ProcesoStepRecord } from "@/app/actions/capacitacion-proceso-steps";

interface ProcesoStepsTimelineProps {
  osiId: number;
  nroSesion?: number;
  steps: StepDef[];
  completedSteps: Record<string, ProcesoStepRecord>;
  canEdit: boolean;
  onToggle: (stepKey: string, notes?: string, metadata?: Record<string, unknown>) => Promise<void>;
  onBulkToggle?: (stepKeys: string[]) => Promise<void>;
  onUpdateExecutionDate?: (osiId: number, newDate: string) => Promise<void>;
  onPreviewListaAsistencia?: (osiId: number) => void;
  onPreviewCalificacion?: (osiId: number) => void;
  onPreviewMaterialFotografico?: (osiId: number) => void;
  onPreviewEncuestas?: (osiId: number) => void;
  onRequestExecutionAction?: (osiId: number, stepKey: string) => void;
  onRequestUnmarkEnProceso?: (osiId: number) => void;
  onRequestMaterialEnvio?: (osiId: number, stepKey: string) => void;
  compact?: boolean;
}

const HIDE_DATE_STEP_KEYS = new Set([
  "certificados_impresos",
  "sobre_espera_autorizacion",
  "sobre_enviado_zoom",
]);

function formatStepDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const trimmed = String(dateStr).trim();
  const safeStr = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T12:00:00` : trimmed;
  try {
    return new Date(safeStr).toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
}

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

function getYesterdayStr(): string {
  try {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }
}

export default function ProcesoStepsTimeline({
  osiId,
  nroSesion,
  steps,
  completedSteps,
  canEdit,
  onToggle,
  onBulkToggle,
  onUpdateExecutionDate,
  onPreviewListaAsistencia,
  onPreviewCalificacion,
  onPreviewMaterialFotografico,
  onPreviewEncuestas,
  onRequestExecutionAction,
  onRequestUnmarkEnProceso,
  onRequestMaterialEnvio,
  compact = false,
}: ProcesoStepsTimelineProps) {
  const router = useRouter();
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [bulkToggling, setBulkToggling] = useState(false);
  const [inputStepKey, setInputStepKey] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [inputPos, setInputPos] = useState<{ top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [envioStepKey, setEnvioStepKey] = useState<string | null>(null);
  const [envioPos, setEnvioPos] = useState<{ top: number; left: number } | null>(null);
  const [envioMode, setEnvioMode] = useState<"select" | "fisico">("select");
  const [envioGuia, setEnvioGuia] = useState("");

  const [dateEditStepKey, setDateEditStepKey] = useState<string | null>(null);
  const [dateEditPos, setDateEditPos] = useState<{ top: number; left: number } | null>(null);
  const [dateEditValue, setDateEditValue] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (inputStepKey && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputStepKey]);

  const currentIndex = useMemo(() => {
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const rec = completedSteps[s.key];
      if (!rec?.completed) return i;
    }
    return steps.length - 1;
  }, [steps, completedSteps]);

  const handleToggle = async (
    stepKey: string,
    isAuto: boolean,
    isAutoUnmarkable: boolean,
    requiresInput: boolean,
    hasEnvioOptions: boolean,
    hasExecutionOptions: boolean = false,
    e?: React.MouseEvent,
  ) => {
    if (!canEdit) return;

    // If step has execution options (en_proceso: ejecutado / re-agendar modal)
    if (hasExecutionOptions && (onRequestExecutionAction || onRequestUnmarkEnProceso)) {
      if (onRequestExecutionAction) {
        onRequestExecutionAction(osiId, stepKey);
        return;
      }
      const rec = completedSteps[stepKey];
      if (rec?.completed && onRequestUnmarkEnProceso) {
        onRequestUnmarkEnProceso(osiId);
        return;
      }
    }

    if (isAuto && !isAutoUnmarkable) return;

    // Legacy fallback: if unmarking en_proceso, intercept and request reason modal
    if (stepKey === "en_proceso") {
      const rec = completedSteps[stepKey];
      if (rec?.completed && onRequestUnmarkEnProceso) {
        onRequestUnmarkEnProceso(osiId);
        return;
      }
    }

    // If step has envio options (material_enviado_facilitador)
    if (hasEnvioOptions) {
      if (onRequestMaterialEnvio) {
        onRequestMaterialEnvio(osiId, stepKey);
        return;
      }
      const rec = completedSteps[stepKey];
      if (rec?.completed) {
        // Already completed — unmark directly
        setTogglingKey(stepKey);
        try {
          await onToggle(stepKey);
        } finally {
          setTogglingKey(null);
        }
      } else if (e) {
        // Not completed — open envio choice popup
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setEnvioPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
        setEnvioStepKey(stepKey);
        setEnvioMode("select");
        setEnvioGuia("");
      }
      return;
    }

    // If step requires input and is not yet completed, show input prompt
    if (requiresInput) {
      const rec = completedSteps[stepKey];
      if (rec?.completed) {
        // Already completed — unmark directly
        setTogglingKey(stepKey);
        try {
          await onToggle(stepKey);
        } finally {
          setTogglingKey(null);
        }
      } else if (e) {
        // Not completed — show input prompt at button position
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setInputPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
        setInputStepKey(stepKey);
        setInputValue("");
      }
      return;
    }

    setTogglingKey(stepKey);
    try {
      await onToggle(stepKey);
    } finally {
      setTogglingKey(null);
    }
  };

  const handleEnvioSubmit = async (tipo: "digital" | "fisico", guia?: string) => {
    if (!envioStepKey) return;
    const key = envioStepKey;
    setEnvioStepKey(null);
    setEnvioPos(null);
    setEnvioMode("select");
    setEnvioGuia("");
    setTogglingKey(key);
    try {
      if (tipo === "digital") {
        await onToggle(key, "Digital", { tipo_envio: "digital" });
      } else {
        await onToggle(key, `Físico - Guía: ${guia}`, { tipo_envio: "fisico", guia });
      }
    } finally {
      setTogglingKey(null);
    }
  };

  const closeEnvioPopup = () => {
    setEnvioStepKey(null);
    setEnvioPos(null);
    setEnvioMode("select");
    setEnvioGuia("");
  };

  const closeDateEditPopup = () => {
    setDateEditStepKey(null);
    setDateEditPos(null);
    setDateEditValue("");
    setDateError(null);
  };

  const handleDateEditSubmit = async () => {
    if (!dateEditValue.trim() || !onUpdateExecutionDate) return;
    setSavingDate(true);
    setDateError(null);
    try {
      await onUpdateExecutionDate(osiId, dateEditValue.trim());
      closeDateEditPopup();
    } catch (err) {
      setDateError(err instanceof Error ? err.message : "Error al actualizar fecha");
    } finally {
      setSavingDate(false);
    }
  };

  const handleInputSubmit = async () => {
    if (!inputStepKey || !inputValue.trim()) return;
    const key = inputStepKey;
    const val = inputValue.trim();
    setTogglingKey(key);
    setInputStepKey(null);
    setInputPos(null);
    try {
      await onToggle(key, val);
    } finally {
      setTogglingKey(null);
      setInputValue("");
    }
  };

  const closeInput = () => {
    setInputStepKey(null);
    setInputPos(null);
    setInputValue("");
  };

  const handleBulkToggle = async (subSteps: StepDef[]) => {
    if (!canEdit || !onBulkToggle || bulkToggling) return;
    const allCompleted = subSteps.every((s) => completedSteps[s.key]?.completed);
    const keysToToggle = allCompleted
      ? subSteps.map((s) => s.key)
      : subSteps.filter((s) => !completedSteps[s.key]?.completed).map((s) => s.key);
    if (keysToToggle.length === 0) return;
    setBulkToggling(true);
    try {
      await onBulkToggle(keysToToggle);
    } finally {
      setBulkToggling(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => {
          const rec = completedSteps[step.key];
          const isCompleted = !!rec?.completed;
          const isRescheduled = !isCompleted && Boolean(rec?.step_metadata?.is_rescheduled);
          const isNoEjecutado = !isCompleted && !isRescheduled && Boolean(rec?.step_metadata?.unmarked_by_user);
          const isCurrent = idx === currentIndex && !isRescheduled && !isNoEjecutado;
          return (
            <div
              key={step.key}
              className="relative"
              title={`${step.label}${isCompleted ? " ✓" : isRescheduled ? " ⏱ (Re-agendada)" : isNoEjecutado ? " ✕ (No ejecutada)" : isCurrent ? " (Actual)" : ""}`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? "bg-green-500 scale-110"
                    : isRescheduled
                      ? "bg-amber-500 scale-110 ring-2 ring-offset-1 ring-amber-300"
                      : isNoEjecutado
                        ? "bg-rose-500 scale-110 ring-2 ring-offset-1 ring-rose-300"
                        : isCurrent
                          ? "bg-blue-500 scale-125 ring-2 ring-offset-1 ring-blue-300"
                          : "bg-gray-300 opacity-50"
                }`}
              />
            </div>
          );
        })}
      </div>
    );
  }

  const completedCount = Object.values(completedSteps).filter(
    (s) => s.completed && !steps.find((st) => st.key === s.step_key)?.optional
  ).length;
  const requiredStepsCount = steps.filter((s) => !s.optional).length;

  // Group consecutive steps by their `group` field
  type RenderItem =
    | { type: "single"; step: StepDef; idx: number }
    | { type: "group"; groupKey: string; subSteps: StepDef[]; startIdx: number };

  const renderItems: RenderItem[] = [];
  let i = 0;
  while (i < steps.length) {
    if (steps[i].group) {
      const groupKey = steps[i].group!;
      const subSteps: StepDef[] = [];
      const startIdx = i;
      while (i < steps.length && steps[i].group === groupKey) {
        subSteps.push(steps[i]);
        i++;
      }
      renderItems.push({ type: "group", groupKey, subSteps, startIdx });
    } else {
      renderItems.push({ type: "single", step: steps[i], idx: i });
      i++;
    }
  }

  // Helper to render a single step circle (used for both standalone and sub-steps)
  const renderStepCircle = (step: StepDef, idx: number, isSubStep: boolean = false) => {
    const rec = completedSteps[step.key];
    const isCompleted = !!rec?.completed;
    const isRescheduled = !isCompleted && Boolean(rec?.step_metadata?.is_rescheduled);
    const isNoEjecutado = !isCompleted && !isRescheduled && Boolean(rec?.step_metadata?.unmarked_by_user);
    const isCurrent = idx === currentIndex && !isCompleted && !isRescheduled && !isNoEjecutado;
    const isAuto = !!step.auto;
    const isAutoUnmarkable = !!step.autoUnmarkable;
    const isOptional = !!step.optional;
    const requiresInput = !!step.requiresInput;
    const hasEnvioOptions = !!step.hasEnvioOptions;
    const hasExecutionOptions = !!step.hasExecutionOptions || step.key === "en_proceso";
    const isToggling = togglingKey === step.key;
    const canClick = canEdit && (!isAuto || isAutoUnmarkable || hasExecutionOptions);
    const isListaAsistencia = step.key === "lista_asistencia";

    return (
      <div className={`flex flex-col items-center ${isSubStep ? "w-full" : "w-28"} px-1`}>
        <div className="flex items-center gap-1.5 w-full">
          {/* Vertical connector for sub-steps */}
          {isSubStep && (
            <div className={`w-3 h-0.5 flex-shrink-0 ${isCompleted ? "bg-green-400" : "bg-gray-200"}`} />
          )}
          {/* Circle */}
          <button
            type="button"
            disabled={!canClick || isToggling}
            onClick={(e) => handleToggle(step.key, isAuto, isAutoUnmarkable, requiresInput, hasEnvioOptions, hasExecutionOptions, e)}
            className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
              isCompleted
                ? "bg-green-500 text-white scale-105 shadow-md"
                : isRescheduled
                  ? "bg-amber-500 text-white scale-105 shadow-md ring-2 ring-offset-1 ring-amber-300"
                  : isNoEjecutado
                    ? "bg-rose-600 text-white scale-105 shadow-md ring-2 ring-offset-1 ring-rose-300"
                    : isCurrent
                      ? "bg-blue-500 text-white scale-110 shadow-lg ring-4 ring-blue-100"
                      : isOptional
                        ? "bg-gray-100 text-gray-300 scale-95 border border-dashed border-gray-300"
                        : "bg-gray-100 text-gray-400 scale-95"
            } ${canClick ? "cursor-pointer hover:scale-110" : "cursor-default"}`}
            title={
              isRescheduled
                ? `Re-agendada${rec?.notes ? `: ${rec.notes}` : ""}`
                : isNoEjecutado
                  ? `No ejecutada${rec?.notes ? `: ${rec.notes}` : ""}`
                  : step.description || step.label
            }
          >
            {isToggling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isCompleted ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : isRescheduled ? (
              <CalendarClock className="w-4 h-4" />
            ) : isNoEjecutado ? (
              <XCircle className="w-4 h-4" />
            ) : isAuto && !isAutoUnmarkable ? (
              <Lock className="w-3 h-3" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
          </button>
          {/* Label + badges for sub-steps (inline) */}
          {isSubStep ? (
            <div className="flex flex-col min-w-0">
              <span
                className={`text-[10px] font-medium leading-tight ${
                  isCompleted
                    ? "text-gray-900"
                    : isRescheduled
                      ? "text-amber-800"
                      : isNoEjecutado
                        ? "text-rose-800"
                        : isCurrent
                          ? "text-blue-700"
                          : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {isAuto && (
                  <span className="text-[8px] font-bold uppercase bg-gray-100 text-gray-500 px-1 py-0.5 rounded">
                    {isAutoUnmarkable ? "Auto*" : "Auto"}
                  </span>
                )}
                {isOptional && (
                  <span className="text-[8px] font-bold uppercase bg-gray-100 text-gray-400 px-1 py-0.5 rounded">
                    Opcional
                  </span>
                )}
                {isCompleted && rec?.completed_at && !HIDE_DATE_STEP_KEYS.has(step.key) && (
                  <span className="text-[9px] text-gray-400">
                    {formatStepDate(rec.completed_at)}
                  </span>
                )}
                {isRescheduled && (
                  <span className="text-[8px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200 px-1 py-0.5 rounded">
                    Re-agendada
                  </span>
                )}
                {isNoEjecutado && (
                  <span className="text-[8px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200 px-1 py-0.5 rounded">
                    No ejecutada
                  </span>
                )}
                {isCompleted && requiresInput && ((rec?.step_metadata?.guia as string) || rec?.notes) && (
                  <span className="text-[9px] text-blue-600 font-medium">
                    Guía: {(rec?.step_metadata?.guia as string) || rec.notes}
                  </span>
                )}
              </div>
              {/* Lista asistencia preview button */}
              {isListaAsistencia && onPreviewListaAsistencia && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewListaAsistencia(osiId);
                  }}
                  className="inline-flex items-center gap-1 text-[9px] font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded transition-colors mt-0.5 w-fit"
                  title="Ver listas de asistencia digitales"
                >
                  <Eye className="w-3 h-3" />
                  Ver
                </button>
              )}
            </div>
          ) : null}
        </div>
        {/* Label + badges for standalone steps (below circle) */}
        {!isSubStep && (
          <>
            {step.key === "requisicion_enviada_admin" ? (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push("/dashboard/capacitacion/requisiciones/create");
                }}
                className="text-[10px] font-medium text-center mt-1.5 leading-tight text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5"
                title="Crear requisición"
              >
                {step.label}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ) : (
              <span
                className={`text-[10px] font-medium text-center mt-1.5 leading-tight ${
                  isCompleted
                    ? "text-gray-900"
                    : isRescheduled
                      ? "text-amber-800"
                      : isNoEjecutado
                        ? "text-rose-800"
                        : isCurrent
                          ? "text-blue-700"
                          : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            )}
            {isAuto && (
              <span className="text-[8px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500 px-1 py-0.5 rounded mt-0.5">
                {isAutoUnmarkable ? "Auto*" : "Auto"}
              </span>
            )}
            {isOptional && (
              <span className="text-[8px] font-bold uppercase tracking-wide bg-gray-100 text-gray-400 px-1 py-0.5 rounded mt-0.5">
                Opcional
              </span>
            )}
            {isCompleted && step.key === "en_proceso" ? (
              <div className="flex flex-col items-center mt-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!canEdit || !onUpdateExecutionDate) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDateEditPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
                    const curVal =
                      (rec?.step_metadata?.fecha_ejecutada as string) ||
                      (rec?.completed_at ? rec.completed_at.split("T")[0] : getCaracasTodayStr());
                    setDateEditValue(curVal);
                    setDateEditStepKey(step.key);
                    setDateError(null);
                  }}
                  disabled={!canEdit || !onUpdateExecutionDate}
                  className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded transition-all ${
                    canEdit && onUpdateExecutionDate
                      ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 cursor-pointer shadow-2xs hover:scale-105"
                      : "text-gray-500 bg-gray-50 border border-gray-200 cursor-default"
                  }`}
                  title={
                    canEdit && onUpdateExecutionDate
                      ? "Click para editar fecha de ejecución (Hoy, Ayer u otra fecha)"
                      : undefined
                  }
                >
                  <Calendar className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                  <span>
                    {formatStepDate(
                      (rec?.step_metadata?.fecha_ejecutada as string) || rec?.completed_at
                    ) || "Editar fecha"}
                  </span>
                  {canEdit && onUpdateExecutionDate && (
                    <Pencil className="w-2 h-2 text-emerald-600 opacity-70 shrink-0" />
                  )}
                </button>
              </div>
            ) : isCompleted && rec?.completed_at && !HIDE_DATE_STEP_KEYS.has(step.key) ? (
              <span className="text-[9px] text-gray-400 mt-0.5">
                {formatStepDate(rec.completed_at)}
              </span>
            ) : null}
            {isCompleted && step.key === "en_proceso" && Boolean(rec?.step_metadata?.salon) && (
              <span
                className="text-[8px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 px-1 py-0.2 rounded mt-0.5 whitespace-nowrap"
                title={`Salón SHA: ${rec?.step_metadata?.salon}`}
              >
                🏛️ {String(rec?.step_metadata?.salon)}
              </span>
            )}
            {isRescheduled && (
              <div className="flex flex-col items-center mt-0.5">
                <span className="text-[8px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200 px-1 py-0.5 rounded">
                  Re-agendada
                </span>
                {rec?.step_metadata?.new_date ? (
                  <span
                    className="text-[9px] text-amber-700 font-medium mt-0.5"
                    title={`Nueva fecha tentativa: ${rec.step_metadata.new_date}`}
                  >
                    {formatStepDate(rec.step_metadata.new_date as string)}
                  </span>
                ) : (
                  <span className="text-[9px] text-amber-600 italic mt-0.5">
                    Por confirmar
                  </span>
                )}
              </div>
            )}
            {isNoEjecutado && (
              <div className="flex flex-col items-center mt-0.5">
                <span className="text-[8px] font-bold uppercase tracking-wide bg-rose-100 text-rose-800 border border-rose-200 px-1 py-0.5 rounded">
                  No ejecutada
                </span>
                {rec?.notes ? (
                  <span
                    className="text-[9px] text-rose-700 font-medium mt-0.5 truncate max-w-[90px]"
                    title={rec.notes}
                  >
                    {rec.notes}
                  </span>
                ) : null}
              </div>
            )}
            {isCompleted && requiresInput && ((rec?.step_metadata?.guia as string) || rec?.notes) && (
              <span className="text-[9px] text-blue-600 font-medium mt-0.5">
                Guía: {(rec?.step_metadata?.guia as string) || rec.notes}
              </span>
            )}
            {isCompleted && step.key === "material_enviado_facilitador" && (
              <button
                type="button"
                onClick={(e) => {
                  if (onRequestMaterialEnvio) {
                    e.stopPropagation();
                    onRequestMaterialEnvio(osiId, step.key);
                  }
                }}
                className={`text-[9px] font-semibold mt-0.5 px-1.5 py-0.5 rounded border inline-flex items-center gap-1 transition-opacity ${
                  onRequestMaterialEnvio ? "cursor-pointer hover:opacity-80" : ""
                } ${
                  (rec?.step_metadata?.tipo_envio === "digital" || rec?.notes === "Digital")
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : "text-blue-700 bg-blue-50 border-blue-200"
                }`}
                title={rec?.step_metadata?.guia ? `Guía: ${rec.step_metadata.guia} (clic para ver o editar)` : "Clic para ver o editar"}
              >
                {(rec?.step_metadata?.tipo_envio === "digital" || rec?.notes === "Digital")
                  ? "💻 Digital"
                  : `📦 Físico${rec?.step_metadata?.guia ? ` · ${rec.step_metadata.guia}` : (rec?.notes ? ` · ${rec.notes.replace(/^Físico\s*-\s*Guía:\s*/i, "")}` : "")}`}
              </button>
            )}
            {isListaAsistencia && onPreviewListaAsistencia && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewListaAsistencia(osiId);
                }}
                className="inline-flex items-center gap-1 text-[9px] font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded transition-colors mt-1"
                title="Ver listas de asistencia digitales"
              >
                <Eye className="w-3 h-3" />
                Ver
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Seguimiento
        </span>
        <span className="text-xs font-semibold text-gray-700">
          {completedCount} / {requiredStepsCount}
        </span>
      </div>

      {/* Horizontal steps */}
      <div className="overflow-x-auto pb-2 -mx-2 px-2">
        <div className="flex items-start gap-0 min-w-max py-1">
          {renderItems.map((item, itemIdx) => {
            if (item.type === "single") {
              const step = item.step;
              const rec = completedSteps[step.key];
              const isCompleted = !!rec?.completed;
              const isLastItem = itemIdx === renderItems.length - 1;

              return (
                <div key={step.key} className="flex items-start flex-shrink-0">
                  {renderStepCircle(step, item.idx)}
                  {!isLastItem && (
                    <div
                      className={`h-0.5 w-8 mt-3.5 flex-shrink-0 ${
                        isCompleted ? "bg-green-400" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            }

            // Group item — parent circle + horizontal sub-row
            const { subSteps, startIdx } = item;
            const groupCompleted = subSteps.every((s) => completedSteps[s.key]?.completed);
            const groupNoneCompleted = subSteps.every((s) => !completedSteps[s.key]?.completed);
            const groupPartial = !groupCompleted && !groupNoneCompleted;
            const isLastItem = itemIdx === renderItems.length - 1;

            return (
              <div key={item.groupKey} className="flex items-start flex-shrink-0">
                <div className="flex flex-col items-center w-40 px-1">
                  {/* Parent circle on the main line — clickable for bulk toggle */}
                  <button
                    type="button"
                    disabled={!canEdit || bulkToggling}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBulkToggle(subSteps);
                    }}
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                      groupCompleted
                        ? "bg-green-500 text-white scale-105 shadow-md"
                        : groupPartial
                          ? "bg-blue-500 text-white scale-110 shadow-lg ring-4 ring-blue-100"
                          : "bg-gray-100 text-gray-400 scale-95"
                    } ${canEdit ? "cursor-pointer hover:scale-110" : "cursor-default"}`}
                    title={canEdit ? "Marcar/desmarcar todos los sub-pasos" : "Post-servicio"}
                  >
                    {bulkToggling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : groupCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <span
                    className={`text-[10px] font-medium text-center mt-1 leading-tight ${
                      groupCompleted ? "text-gray-900" : groupPartial ? "text-blue-700" : "text-gray-400"
                    }`}
                  >
                    Post-servicio
                  </span>
                  {/* Vertical drop line — increased height to prevent overlap */}
                  <div className="w-0.5 h-6 bg-gray-200 mt-0.5" />

                  {/* Horizontal sub-row of small circles — extra margin to clear main branch text */}
                  <div className="flex items-start gap-0 mt-2">
                    {subSteps.map((subStep, subIdx) => {
                      const rec = completedSteps[subStep.key];
                      const isCompleted = !!rec?.completed;
                      const isAuto = !!subStep.auto;
                      const isAutoUnmarkable = !!subStep.autoUnmarkable;
                      const isToggling = togglingKey === subStep.key;
                      const canClick = canEdit && (!isAuto || isAutoUnmarkable);
                      const requiresInput = !!subStep.requiresInput;
                      const hasPreview =
                        (subStep.key === "lista_asistencia" && onPreviewListaAsistencia) ||
                        (subStep.key === "calificacion" && onPreviewCalificacion) ||
                        (subStep.key === "material_fotografico" && onPreviewMaterialFotografico) ||
                        (subStep.key === "encuestas_satisfaccion_tabulacion" && onPreviewEncuestas);
                      const previewHandler =
                        subStep.key === "lista_asistencia" ? onPreviewListaAsistencia
                        : subStep.key === "calificacion" ? onPreviewCalificacion
                        : subStep.key === "material_fotografico" ? onPreviewMaterialFotografico
                        : subStep.key === "encuestas_satisfaccion_tabulacion" ? onPreviewEncuestas
                        : undefined;

                      return (
                        <div key={subStep.key} className="flex items-start flex-shrink-0">
                          <div className="flex flex-col items-center w-20 px-1">
                            <button
                              type="button"
                              disabled={!canClick || isToggling}
                              onClick={(e) =>
                                handleToggle(
                                  subStep.key,
                                  isAuto,
                                  isAutoUnmarkable,
                                  requiresInput,
                                  !!subStep.hasEnvioOptions,
                                  !!subStep.hasExecutionOptions || subStep.key === "en_proceso",
                                  e,
                                )
                              }
                              className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                                isCompleted
                                  ? "bg-green-500 text-white scale-105 shadow-sm"
                                  : "bg-gray-100 text-gray-400 scale-95"
                              } ${canClick ? "cursor-pointer hover:scale-110" : "cursor-default"}`}
                              title={subStep.description || subStep.label}
                            >
                              {isToggling ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : isCompleted ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <Circle className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span
                              className={`text-[9px] font-medium text-center mt-1 leading-tight ${
                                isCompleted ? "text-gray-900" : "text-gray-400"
                              }`}
                            >
                              {subStep.label}
                            </span>
                            {isCompleted && subStep.key === "en_proceso" ? (
                              <div className="flex flex-col items-center mt-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!canEdit || !onUpdateExecutionDate) return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setDateEditPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
                                    const curVal =
                                      (rec?.step_metadata?.fecha_ejecutada as string) ||
                                      (rec?.completed_at ? rec.completed_at.split("T")[0] : getCaracasTodayStr());
                                    setDateEditValue(curVal);
                                    setDateEditStepKey(subStep.key);
                                    setDateError(null);
                                  }}
                                  disabled={!canEdit || !onUpdateExecutionDate}
                                  className={`inline-flex items-center gap-1 text-[8px] font-medium px-1.5 py-0.5 rounded transition-all ${
                                    canEdit && onUpdateExecutionDate
                                      ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 cursor-pointer shadow-2xs hover:scale-105"
                                      : "text-gray-500 bg-gray-50 border border-gray-200 cursor-default"
                                  }`}
                                  title={
                                    canEdit && onUpdateExecutionDate
                                      ? "Click para editar fecha de ejecución (Hoy, Ayer u otra fecha)"
                                      : undefined
                                  }
                                >
                                  <Calendar className="w-2 h-2 text-emerald-600 shrink-0" />
                                  <span>
                                    {formatStepDate(
                                      (rec?.step_metadata?.fecha_ejecutada as string) || rec?.completed_at
                                    ) || "Editar fecha"}
                                  </span>
                                  {canEdit && onUpdateExecutionDate && (
                                    <Pencil className="w-1.5 h-1.5 text-emerald-600 opacity-70 shrink-0" />
                                  )}
                                </button>
                              </div>
                            ) : isCompleted && rec?.completed_at && !HIDE_DATE_STEP_KEYS.has(subStep.key) ? (
                              <span className="text-[8px] text-gray-400 mt-0.5">
                                {formatStepDate(rec.completed_at)}
                              </span>
                            ) : null}
                            {isCompleted && requiresInput && ((rec?.step_metadata?.guia as string) || rec?.notes) && (
                              <span className="text-[8px] text-blue-600 font-medium mt-0.5">
                                Guía: {(rec?.step_metadata?.guia as string) || rec.notes}
                              </span>
                            )}
                            {hasPreview && previewHandler && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); previewHandler(osiId); }}
                                className="inline-flex items-center gap-0.5 text-[8px] font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-1 py-0.5 rounded transition-colors mt-0.5"
                              >
                                <Eye className="w-2.5 h-2.5" /> Ver
                              </button>
                            )}
                          </div>
                          {/* Connector between sub-steps */}
                          {subIdx < subSteps.length - 1 && (
                            <div className={`h-0.5 w-6 mt-3 flex-shrink-0 ${isCompleted ? "bg-green-400" : "bg-gray-200"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Connector to next step */}
                {!isLastItem && (
                  <div className={`h-0.5 w-8 mt-3.5 flex-shrink-0 ${groupCompleted ? "bg-green-400" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed-position input popup for requiresInput steps */}
      {inputStepKey && inputPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeInput} />
          <div
            className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg p-2 flex flex-col gap-1 min-w-[160px]"
            style={{
              top: `${inputPos.top}px`,
              left: `${inputPos.left}px`,
              transform: "translateX(-50%)",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder={steps.find((s) => s.key === inputStepKey)?.inputPlaceholder || "Ingrese valor"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInputSubmit();
                if (e.key === "Escape") closeInput();
              }}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
            />
            <div className="flex gap-1 justify-end">
              <button
                type="button"
                onClick={closeInput}
                className="px-2 py-0.5 text-[10px] text-gray-500 hover:text-gray-700"
              >
                <X className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleInputSubmit}
                disabled={!inputValue.trim()}
                className="px-2 py-0.5 text-[10px] font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                OK
              </button>
            </div>
          </div>
        </>
      )}

      {/* Fixed-position popup for material_enviado_facilitador */}
      {envioStepKey && envioPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeEnvioPopup} />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 flex flex-col gap-2 min-w-[240px] max-w-[290px] animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: `${envioPos.top}px`,
              left: `${envioPos.left}px`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
              <span className="text-xs font-bold text-gray-900">
                Envío de Material
              </span>
              <button
                type="button"
                onClick={closeEnvioPopup}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {envioMode === "select" ? (
              <div className="flex flex-col gap-2 pt-1">
                <p className="text-[11px] text-gray-500 leading-tight">
                  ¿Cómo fue remitido el material al facilitador?
                </p>
                <button
                  type="button"
                  onClick={() => handleEnvioSubmit("digital")}
                  className="flex items-center gap-2.5 p-2 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-left transition-colors group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-sm flex-shrink-0 group-hover:scale-110 transition-transform">
                    💻
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-emerald-950 leading-tight">Digital</p>
                    <p className="text-[10px] text-emerald-700 leading-tight">Correo o descarga</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEnvioMode("fisico")}
                  className="flex items-center gap-2.5 p-2 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-left transition-colors group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-sm flex-shrink-0 group-hover:scale-110 transition-transform">
                    📦
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-blue-950 leading-tight">Físico</p>
                    <p className="text-[10px] text-blue-700 leading-tight">Envío físico con guía</p>
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <label className="text-[11px] font-semibold text-gray-700">
                  N° de Guía / Tracking:
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ej: ZOOM 12345678"
                  value={envioGuia}
                  onChange={(e) => setEnvioGuia(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && envioGuia.trim()) handleEnvioSubmit("fisico", envioGuia.trim());
                    if (e.key === "Escape") setEnvioMode("select");
                  }}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
                <div className="flex gap-1.5 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setEnvioMode("select")}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 rounded"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEnvioSubmit("fisico", envioGuia.trim())}
                    disabled={!envioGuia.trim()}
                    className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Fixed-position popup for editable execution date */}
      {dateEditStepKey && dateEditPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeDateEditPopup} />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 flex flex-col gap-2.5 min-w-[260px] max-w-[300px] animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: `${Math.min(dateEditPos.top, typeof window !== "undefined" ? window.innerHeight - 240 : dateEditPos.top)}px`,
              left: `${Math.max(140, Math.min(dateEditPos.left, typeof window !== "undefined" ? window.innerWidth - 150 : dateEditPos.left))}px`,
              transform: "translateX(-50%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-gray-900">
                  Fecha de ejecución{nroSesion ? ` (Sesión ${nroSesion})` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={closeDateEditPopup}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {dateError && (
              <p className="text-[11px] text-red-600 bg-red-50 p-1.5 rounded border border-red-200">
                {dateError}
              </p>
            )}

            {/* Quick shortcuts */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDateEditValue(getCaracasTodayStr())}
                className={`flex-1 text-[11px] font-semibold py-1 px-2 rounded-md border transition-colors cursor-pointer text-center ${
                  dateEditValue === getCaracasTodayStr()
                    ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200"
                }`}
              >
                📅 Hoy
              </button>
              <button
                type="button"
                onClick={() => setDateEditValue(getYesterdayStr())}
                className={`flex-1 text-[11px] font-semibold py-1 px-2 rounded-md border transition-colors cursor-pointer text-center ${
                  dateEditValue === getYesterdayStr()
                    ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200"
                }`}
              >
                Ayer
              </button>
            </div>

            <div>
              <label className="text-[10px] font-medium text-gray-500 mb-1 block">
                O seleccione otra fecha:
              </label>
              <input
                type="date"
                value={dateEditValue}
                onChange={(e) => setDateEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && dateEditValue.trim()) handleDateEditSubmit();
                  if (e.key === "Escape") closeDateEditPopup();
                }}
                className="w-full px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none bg-white"
              />
            </div>

            <div className="flex gap-1.5 justify-end pt-1 border-t border-gray-100">
              <button
                type="button"
                onClick={closeDateEditPopup}
                disabled={savingDate}
                className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-800 rounded cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDateEditSubmit}
                disabled={savingDate || !dateEditValue.trim()}
                className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs inline-flex items-center gap-1 cursor-pointer"
              >
                {savingDate ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
