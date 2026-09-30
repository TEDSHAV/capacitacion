"use client";

import {
  Presentation,
  FileSpreadsheet,
  Users,
  Camera,
  HelpCircle,
  CheckCheck,
  CheckCircle2,
} from "lucide-react";

export type WizardStepId = "material" | "asistencia" | "participantes" | "evidencias" | "envio";

export interface WizardStep {
  id: WizardStepId;
  number: number;
  title: string;
  shortTitle: string;
  desc: string;
  icon: typeof Presentation;
}

interface OSIWorkflowStepperProps {
  currentStepId: WizardStepId;
  onStepSelect: (stepId: WizardStepId) => void;
  hasMaterial?: boolean;
  isFinal?: boolean;
  completedSteps?: Partial<Record<WizardStepId, boolean>>;
  onStartTour?: () => void;
}

export function getWizardSteps(hasMaterial: boolean): WizardStep[] {
  const steps: WizardStep[] = [];
  let num = 1;

  if (hasMaterial) {
    steps.push({
      id: "material",
      number: num++,
      title: "Material Didáctico",
      shortTitle: "Material",
      desc: "PPTX y Guías Oficiales",
      icon: Presentation,
    });
  }

  steps.push({
    id: "asistencia",
    number: num++,
    title: "Lista de Asistencia",
    shortTitle: "Lista",
    desc: "Foto firmada y OCR",
    icon: FileSpreadsheet,
  });

  steps.push({
    id: "participantes",
    number: num++,
    title: "Participantes y Notas",
    shortTitle: "Participantes",
    desc: "Cédula, Nombres y Notas",
    icon: Users,
  });

  steps.push({
    id: "evidencias",
    number: num++,
    title: "Fotos y Evidencias",
    shortTitle: "Fotos",
    desc: "Registro fotográfico",
    icon: Camera,
  });

  steps.push({
    id: "envio",
    number: num++,
    title: "Revisión y Envío",
    shortTitle: "Envío",
    desc: "Declaración y Envío Final",
    icon: CheckCheck,
  });

  return steps;
}

export default function OSIWorkflowStepper({
  currentStepId,
  onStepSelect,
  hasMaterial = true,
  isFinal = false,
  completedSteps = {},
  onStartTour,
}: OSIWorkflowStepperProps) {
  const steps = getWizardSteps(hasMaterial);
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);
  const currentStep = steps[currentIndex] || steps[0];
  const progressPercent = Math.round(((currentIndex + 1) / steps.length) * 100);

  return (
    <div className="mb-6 space-y-3">
      {/* Mobile Top Progress Header & Chips */}
      <div className="md:hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 inline-block">
                Paso {currentStep.number} de {steps.length}
              </span>
              {onStartTour && (
                <button
                  type="button"
                  onClick={onStartTour}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[10px] font-bold transition-colors cursor-pointer"
                  title="Iniciar tour guiado"
                >
                  <HelpCircle className="w-3 h-3 text-sky-600" />
                  <span>Guía</span>
                </button>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900 truncate">
              {currentStep.title}
            </h3>
          </div>
          {isFinal ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Enviado
            </span>
          ) : (
            <span className="text-xs font-bold font-mono text-slate-500 shrink-0">
              {progressPercent}%
            </span>
          )}
        </div>

        {/* Mini progress line */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Scrollable Step Chips on Mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {steps.map((step) => {
            const isActive = step.id === currentStepId;
            const isDone = completedSteps[step.id] || (step.id === "envio" && isFinal);

            return (
              <button
                key={step.id}
                id={`tour-step-mobile-${step.id}`}
                type="button"
                onClick={() => onStepSelect(step.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? "bg-sky-600 text-white shadow-xs"
                    : isDone
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100"
                }`}
              >
                <span>{step.number}.</span>
                <span>{step.shortTitle}</span>
                {isDone && !isActive && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Stepper Matrix */}
      <div className="hidden md:block p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Flujo Guiado de Ejecución del Servicio
            </p>
            {onStartTour && (
              <button
                type="button"
                onClick={onStartTour}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-semibold transition-colors cursor-pointer"
                title="Iniciar tour guiado"
              >
                <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
                <span>Guía Rápida</span>
              </button>
            )}
          </div>
          {isFinal && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Servicio Finalizado y Enviado
            </span>
          )}
        </div>

        <div
          className={`grid grid-cols-2 ${
            steps.length >= 6
              ? "lg:grid-cols-6"
              : steps.length === 5
              ? "lg:grid-cols-5"
              : "lg:grid-cols-4"
          } gap-2.5`}
        >
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = step.id === currentStepId;
            const isDone = completedSteps[step.id] || (step.id === "envio" && isFinal);

            return (
              <button
                key={step.id}
                id={`tour-step-${step.id}`}
                type="button"
                onClick={() => onStepSelect(step.id)}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  isActive
                    ? "bg-sky-50/70 border-sky-400 ring-2 ring-sky-200 shadow-xs"
                    : isDone
                    ? "bg-emerald-50/60 border-emerald-300 text-emerald-950 hover:bg-emerald-100/50"
                    : "bg-slate-50/80 border-slate-200/70 hover:bg-slate-100 hover:border-slate-300"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border ${
                    isActive
                      ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                      : isDone
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  {isDone && !isActive ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p
                      className={`text-xs font-bold truncate ${
                        isActive
                          ? "text-sky-950"
                          : isDone
                          ? "text-emerald-950"
                          : "text-slate-900"
                      }`}
                    >
                      {step.number}. {step.title}
                    </p>
                  </div>
                  <p
                    className={`text-[11px] truncate leading-tight mt-0.5 ${
                      isActive
                        ? "text-sky-700 font-medium"
                        : isDone
                        ? "text-emerald-700 font-medium"
                        : "text-slate-500"
                    }`}
                  >
                    {step.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
