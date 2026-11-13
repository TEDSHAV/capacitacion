import React from "react";
import { notFound } from "next/navigation";
import { getOSIEvaluacionPublicData } from "@/app/actions/evaluaciones-cursos";
import EvaluacionTakerClient from "../EvaluacionTakerClient";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sesion?: string }>;
}

export const metadata = {
  title: "Kiosk de Evaluación en Aula | SHA de Venezuela",
  description: "Estación de evaluación para aulas de capacitación de SHA de Venezuela.",
};

export default async function EvaluacionKioskPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { sesion } = await searchParams;
  const nroSesion = sesion ? parseInt(sesion, 10) : 1;

  if (!id) return notFound();

  const { data, error } = await getOSIEvaluacionPublicData(id);

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl p-8 text-center border border-slate-700">
          <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Estación Kiosk no disponible</h1>
          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            {error || "No se encontró una evaluación activa para esta estación."}
          </p>
          <div className="text-xs text-slate-500 border-t border-slate-700 pt-4">
            SHA de Venezuela • PRISMA Capacitación
          </div>
        </div>
      </div>
    );
  }

  return (
    <EvaluacionTakerClient
      evaluacion={data}
      nroSesion={nroSesion}
      isKiosk={true}
    />
  );
}

