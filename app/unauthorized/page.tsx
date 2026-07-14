"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-red-100 rounded-full">
            <Lock className="w-12 h-12 text-red-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Acceso Denegado</h1>
          <p className="text-gray-600">
            No tienes los permisos necesarios para acceder al módulo de
            Capacitación. Este módulo es exclusivo para el departamento de
            Capacitación y Administradores.
          </p>
        </div>

        <div className="pt-4">
          <a
            href="https://prisma.shadevenezuela.com.ve"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Volver al inicio
          </a>
        </div>

        <p className="text-sm text-gray-500">
          Si crees que esto es un error, por favor contacta al administrador del
          sistema.
        </p>
      </div>
    </div>
  );
}
