"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Eye,
  Lock,
  X,
} from "lucide-react";
import type { StepDef } from "@/lib/proceso-steps";
import type { ProcesoStepRecord } from "@/app/actions/capacitacion-proceso-steps";

interface ProcesoStepsTimelineProps {
  osiId: number;
  steps: StepDef[];
  completedSteps: Record<string, ProcesoStepRecord>;
  canEdit: boolean;
  onToggle: (stepKey: string, notes?: string) => Promise<void>;
  onPreviewListaAsistencia?: (osiId: number) => void;
  onPreviewCalificacion?: (osiId: number) => void;
  onPreviewMaterialFotografico?: (osiId: number) => void;
  compact?: boolean;
}

export default function ProcesoStepsTimeline({
  osiId,
  steps,
  completedSteps,
  canEdit,
  onToggle,
  onPreviewListaAsistencia,
  onPreviewCalificacion,
  onPreviewMaterialFotografico,
  compact = false,
}: ProcesoStepsTimelineProps) {
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [inputStepKey, setInputStepKey] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [inputPos, setInputPos] = useState<{ top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
    e?: React.MouseEvent,
  ) => {
    if (!canEdit) return;
    if (isAuto && !isAutoUnmarkable) return;

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

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => {
          const rec = completedSteps[step.key];
          const isCompleted = !!rec?.completed;
          const isCurrent = idx === currentIndex;
          return (
            <div
              key={step.key}
              className="relative"
              title={`${step.label}${isCompleted ? " ✓" : isCurrent ? " (Actual)" : ""}`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? "bg-green-500 scale-110"
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
    const isCurrent = idx === currentIndex && !isCompleted;
    const isAuto = !!step.auto;
    const isAutoUnmarkable = !!step.autoUnmarkable;
    const isOptional = !!step.optional;
    const requiresInput = !!step.requiresInput;
    const isToggling = togglingKey === step.key;
    const canClick = canEdit && (!isAuto || isAutoUnmarkable);
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
            onClick={(e) => handleToggle(step.key, isAuto, isAutoUnmarkable, requiresInput, e)}
            className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
              isCompleted
                ? "bg-green-500 text-white scale-105 shadow-md"
                : isCurrent
                  ? "bg-blue-500 text-white scale-110 shadow-lg ring-4 ring-blue-100"
                  : isOptional
                    ? "bg-gray-100 text-gray-300 scale-95 border border-dashed border-gray-300"
                    : "bg-gray-100 text-gray-400 scale-95"
            } ${canClick ? "cursor-pointer hover:scale-110" : "cursor-default"}`}
            title={step.description || step.label}
          >
            {isToggling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isCompleted ? (
              <CheckCircle2 className="w-4 h-4" />
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
                  isCompleted ? "text-gray-900" : isCurrent ? "text-blue-700" : "text-gray-400"
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
                {isCompleted && rec?.completed_at && (
                  <span className="text-[9px] text-gray-400">
                    {new Date(rec.completed_at).toLocaleDateString("es-VE", { day: "2-digit", month: "short" })}
                  </span>
                )}
                {isCompleted && requiresInput && rec?.notes && (
                  <span className="text-[9px] text-blue-600 font-medium">
                    Guía: {rec.notes}
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
            <span
              className={`text-[10px] font-medium text-center mt-1.5 leading-tight ${
                isCompleted
                  ? "text-gray-900"
                  : isCurrent
                    ? "text-blue-700"
                    : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
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
            {isCompleted && rec?.completed_at && (
              <span className="text-[9px] text-gray-400 mt-0.5">
                {new Date(rec.completed_at).toLocaleDateString("es-VE", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            )}
            {isCompleted && requiresInput && rec?.notes && (
              <span className="text-[9px] text-blue-600 font-medium mt-0.5">
                Guía: {rec.notes}
              </span>
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
                  {/* Parent circle on the main line */}
                  <div
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                      groupCompleted
                        ? "bg-green-500 text-white scale-105 shadow-md"
                        : groupPartial
                          ? "bg-blue-500 text-white scale-110 shadow-lg ring-4 ring-blue-100"
                          : "bg-gray-100 text-gray-400 scale-95"
                    }`}
                    title="Post-servicio"
                  >
                    {groupCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </div>
                  <span
                    className={`text-[10px] font-medium text-center mt-1 leading-tight ${
                      groupCompleted ? "text-gray-900" : groupPartial ? "text-blue-700" : "text-gray-400"
                    }`}
                  >
                    Post-servicio
                  </span>
                  {/* Vertical drop line */}
                  <div className="w-0.5 h-3 bg-gray-200 mt-0.5" />

                  {/* Horizontal sub-row of small circles */}
                  <div className="flex items-start gap-0 mt-1">
                    {subSteps.map((subStep, subIdx) => {
                      const realIdx = startIdx + subIdx;
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
                        (subStep.key === "material_fotografico" && onPreviewMaterialFotografico);
                      const previewHandler =
                        subStep.key === "lista_asistencia" ? onPreviewListaAsistencia
                        : subStep.key === "calificacion" ? onPreviewCalificacion
                        : subStep.key === "material_fotografico" ? onPreviewMaterialFotografico
                        : undefined;

                      return (
                        <div key={subStep.key} className="flex items-start flex-shrink-0">
                          <div className="flex flex-col items-center w-20 px-1">
                            <button
                              type="button"
                              disabled={!canClick || isToggling}
                              onClick={(e) => handleToggle(subStep.key, isAuto, isAutoUnmarkable, requiresInput, e)}
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
                            {isCompleted && rec?.completed_at && (
                              <span className="text-[8px] text-gray-400 mt-0.5">
                                {new Date(rec.completed_at).toLocaleDateString("es-VE", { day: "2-digit", month: "short" })}
                              </span>
                            )}
                            {isCompleted && requiresInput && rec?.notes && (
                              <span className="text-[8px] text-blue-600 font-medium mt-0.5">
                                Guía: {rec.notes}
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
    </div>
  );
}
