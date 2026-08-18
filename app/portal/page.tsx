import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ClipboardList, Building2, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Portales SHA",
  description:
    "Selecciona tu portal de capacitación: facilitadores o clientes.",
  robots: { index: false, follow: true },
};

export default function PortalLandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full">
        <div className="flex flex-col items-center mb-10">
          <Image
            src="/logo.png"
            alt="SHA de Venezuela"
            width={128}
            height={128}
            className="w-32 h-32 object-contain mb-4"
          />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Portal de Capacitación
          </h1>
          <p className="text-gray-600 text-center mt-2">
            Selecciona tu portal para continuar
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Facilitadores */}
          <Link
            href="/portal/facilitador/login"
            className="group bg-white rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8 hover:shadow-xl hover:border-purple-200 transition-all"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                <ClipboardList className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Portal de Facilitadores
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Gestiona tus servicios asignados, listas de participantes y
                certificados.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 group-hover:gap-2.5 transition-all">
                Ingresar
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>

          {/* Clientes */}
          <Link
            href="/portal/cliente/login"
            className="group bg-white rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8 hover:shadow-xl hover:border-blue-200 transition-all"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Portal de Clientes
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Consulta tus certificados, carnets y documentos emitidos.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 group-hover:gap-2.5 transition-all">
                Ingresar
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
