"use client";

import Image from "next/image";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/logo.png"
            alt="SHA de Venezuela"
            width={96}
            height={96}
            className="w-24 h-24 object-contain mb-4"
          />
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <WifiOff className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sin conexión</h1>
        </div>
        <p className="text-gray-600 mb-2">
          No tienes conexión a internet en este momento.
        </p>
        <p className="text-gray-500 text-sm">
          Las páginas que ya has visitado pueden seguir disponibles. Tu conexión
          se restablecerá automáticamente cuando vuelvas a estar en línea.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-3 bg-[#C30DFF] text-white rounded-lg font-medium hover:bg-[#a80bd4] transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
