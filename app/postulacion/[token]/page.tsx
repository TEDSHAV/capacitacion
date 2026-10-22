import React from "react";
import Image from "next/image";
import { AlertCircle, Clock, CheckCircle2, ShieldAlert } from "lucide-react";
import { validarTokenPostulacion } from "@/app/actions/entrevistas-facilitadores";
import { PostulacionFormClient } from "./PostulacionFormClient";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

export default async function PostulacionPublicPage({ params }: PageProps) {
  const { token } = await params;

  const validation = await validarTokenPostulacion(token);

  if (!validation.valid) {
    if (validation.error === "used") {
      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 sm:p-12 text-center space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-center">
              <Image
                src="/logo.png"
                alt="SHA de Venezuela"
                width={160}
                height={50}
                priority
                className="h-auto w-auto"
              />
            </div>

            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                ¡Postulación Enviada con Éxito!
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-lg mx-auto">
                Hemos recibido tus datos y perfil profesional correctamente. El equipo de Capacitación de{" "}
                <span className="font-semibold text-slate-800">SHA de Venezuela</span> revisará tu información y se pondrá en contacto contigo para coordinar los siguientes pasos del proceso.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">Departamento de Capacitación</p>
              <p>SHA de Venezuela, C.A. — Seguridad, Higiene y Ambiente</p>
              <p className="text-slate-400">Gracias por tu interés en formar parte de nuestro equipo de facilitadores.</p>
            </div>
          </div>
        </div>
      );
    }

    let icon = <AlertCircle className="w-12 h-12 text-rose-600" />;
    let title = "Enlace no válido";
    const message =
      validation.errorMessage ||
      "El enlace al que intentas acceder no es válido o no existe en nuestro sistema.";

    if (validation.error === "expired") {
      icon = <Clock className="w-12 h-12 text-amber-600" />;
      title = "Enlace de postulación expirado";
    } else if (validation.error === "invalid") {
      icon = <ShieldAlert className="w-12 h-12 text-rose-600" />;
      title = "Enlace inactivo o inválido";
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 text-center space-y-5">
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="SHA de Venezuela"
              width={140}
              height={45}
              priority
              className="h-auto w-auto"
            />
          </div>

          <div className="flex justify-center pt-2">{icon}</div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">
              Departamento de Capacitación
            </p>
            <p>SHA de Venezuela, C.A.</p>
            <p>Si consideras que esto es un error, por favor contacta a tu coordinador.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <PostulacionFormClient
        token={token}
        nombreInicial={validation.nombre_candidato || ""}
        emailInicial={validation.email_candidato || ""}
      />
    </div>
  );
}
