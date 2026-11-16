import React from "react";
import { notFound } from "next/navigation";
import { getOSIEvaluacionPublicData } from "@/app/actions/evaluaciones-cursos";
import { getSalonFromSlug } from "@/types/evaluacion";
import EvaluacionTakerClient from "../EvaluacionTakerClient";
import { MapPin, RefreshCw } from "lucide-react";

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

  const salon = getSalonFromSlug(id);
  const { data, error } = await getOSIEvaluacionPublicData(id);

  if (error || !data) {
    if (salon) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl p-8 text-center border border-slate-700">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl border border-emerald-500/30">
              <MapPin className="w-8 h-8" />
            </div>
            <div className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-full mb-2">
              Estación Aula: {salon.nombre}
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Salón sin evaluación activa hoy</h1>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Actualmente este salón no tiene un curso con evaluación programada para el día de hoy.
            </p>
            <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3 text-xs text-slate-400 mb-6 text-left">
              💡 Por favor consulta con el facilitador o el equipo de Capacitación para activar el examen en este salón.
            </div>
            <a
              href={`/evaluacion/${salon.id}/kiosk`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer w-full"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Verificar nuevamente
            </a>
          </div>
        </div>
      );
    }

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
