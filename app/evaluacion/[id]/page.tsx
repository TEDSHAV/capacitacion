import React from "react";
import { notFound } from "next/navigation";
import { getOSIEvaluacionPublicData } from "@/app/actions/evaluaciones-cursos";
import EvaluacionTakerClient from "./EvaluacionTakerClient";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sesion?: string }>;
}

export const metadata = {
  title: "Evaluación de Curso | SHA de Venezuela",
  description: "Evaluación digital de participante para cursos de capacitación presencial.",
};

export default async function EvaluacionPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { sesion } = await searchParams;
  const nroSesion = sesion ? parseInt(sesion, 10) : 1;

  if (!id) return notFound();

  const { data, error } = await getOSIEvaluacionPublicData(id);

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
          <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
            ⚠️
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">Evaluación no disponible</h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {error || "No se encontró una evaluación activa para este código de servicio."}
          </p>
          <div className="text-xs text-slate-400 border-t border-slate-100 pt-4">
            Si eres participante en aula, consulta con tu facilitador o instructor para verificar el enlace.
          </div>
        </div>
      </div>
    );
  }

  return (
    <EvaluacionTakerClient
      evaluacion={data}
      nroSesion={nroSesion}
      isKiosk={false}
    />
  );
}

