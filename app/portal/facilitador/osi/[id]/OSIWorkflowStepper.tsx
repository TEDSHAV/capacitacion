"use client";

import { Presentation, FileSpreadsheet, Users, CheckCheck, CheckCircle2 } from "lucide-react";

interface OSIWorkflowStepperProps {
  hasMaterial?: boolean;
  isFinal?: boolean;
}

export default function OSIWorkflowStepper({
  hasMaterial = true,
  isFinal = false,
}: OSIWorkflowStepperProps) {
  const steps = [
    ...(hasMaterial
      ? [
          {
            number: "1",
            title: "Material Didáctico",
            desc: "PPTX / Proyección",
            icon: Presentation,
            completed: false,
          },
        ]
      : []),
    {
      number: hasMaterial ? "2" : "1",
      title: "Lista de Asistencia",
      desc: "Foto o escaneo firmado",
      icon: FileSpreadsheet,
      completed: false,
    },
    {
      number: hasMaterial ? "3" : "2",
      title: "Participantes",
      desc: "Asistencia y notas",
      icon: Users,
      completed: false,
    },
    {
      number: hasMaterial ? "4" : "3",
      title: "Cierre y Envío",
      desc: isFinal ? "Listado enviado" : "Finalizar y transmitir",
      icon: isFinal ? CheckCircle2 : CheckCheck,
      completed: isFinal,
    },
  ];

  return (
    <div className="mb-6 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Flujo de Ejecución del Servicio
        </p>
        {isFinal && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Servicio Finalizado y Enviado
          </span>
        )}
      </div>

      <div className={`grid grid-cols-2 ${hasMaterial ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-3`}>
        {steps.map((step) => {
          const Icon = step.icon;
          const isDone = step.completed;

          return (
            <div
              key={step.number}
              className={`p-3 rounded-xl border flex items-start gap-2.5 transition-all ${
                isDone
                  ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-xs"
                  : "bg-slate-50/80 border-slate-200/70 hover:bg-sky-50/50 hover:border-sky-200"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border ${
                  isDone
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-sky-100 text-sky-700 border-sky-200"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p
                  className={`text-xs font-bold truncate ${
                    isDone ? "text-emerald-950" : "text-slate-900"
                  }`}
                >
                  {step.number}. {step.title}
                </p>
                <p
                  className={`text-[11px] truncate leading-tight mt-0.5 ${
                    isDone ? "text-emerald-700 font-medium" : "text-slate-500"
                  }`}
                >
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
