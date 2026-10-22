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
    let icon = <AlertCircle className="w-12 h-12 text-rose-600" />;
    let title = "Enlace no válido";
    const message =
      validation.errorMessage ||
      "El enlace al que intentas acceder no es válido o no existe en nuestro sistema.";

    if (validation.error === "expired") {
      icon = <Clock className="w-12 h-12 text-amber-600" />;
      title = "Enlace de postulación expirado";
    } else if (validation.error === "used") {
      icon = <CheckCircle2 className="w-12 h-12 text-blue-600" />;
      title = "Enlace ya utilizado";
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
