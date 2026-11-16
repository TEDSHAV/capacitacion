import React from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getOSIEvaluacionPublicData } from "@/app/actions/evaluaciones-cursos";
import { getSalonFromSlug } from "@/types/evaluacion";
import EvaluacionTakerClient from "./EvaluacionTakerClient";
import { MapPin, RefreshCw } from "lucide-react";

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

  const salon = getSalonFromSlug(id);
  const { data, error } = await getOSIEvaluacionPublicData(id);

  if (error || !data) {
    if (salon) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
          <header className="px-4 sm:px-8 py-3 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between">
            <Image
              src="/logo.png"
              alt="SHA de Venezuela"
              width={130}
              height={42}
              className="h-8 sm:h-9 w-auto object-contain"
              priority
            />
            <span className="text-[11px] text-teal-600 font-bold tracking-wide">
              Evaluación Digital SHA
            </span>
          </header>

          <main className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl border border-emerald-200 shadow-inner">
                <MapPin className="w-8 h-8" />
              </div>
              <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full mb-2">
                Aula: {salon.nombre}
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">Salón sin evaluación activa hoy</h1>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Actualmente este salón no tiene un curso con evaluación programada para el día de hoy.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 mb-6 text-left">
                💡 Si estás en clase, solicita a tu facilitador o personal de capacitación que asigne la evaluación a este salón.
              </div>
              <a
                href={`/evaluacion/${salon.id}`}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer w-full"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Verificar nuevamente
              </a>
            </div>
          </main>

          <footer className="py-3 px-4 text-center text-[11px] text-slate-400">
            SHA de Venezuela, C.A. • Sistema de Certificación y Capacitación
          </footer>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        <header className="px-4 sm:px-8 py-3 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between">
          <Image
            src="/logo.png"
            alt="SHA de Venezuela"
            width={130}
            height={42}
            className="h-8 sm:h-9 w-auto object-contain"
            priority
          />
          <span className="text-[11px] text-teal-600 font-bold tracking-wide">
            Evaluación Digital SHA
          </span>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
            <div className="w-14 h-14 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl border border-amber-200">
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
        </main>

        <footer className="py-3 px-4 text-center text-[11px] text-slate-400">
          SHA de Venezuela, C.A. • Sistema de Certificación y Capacitación
        </footer>
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
