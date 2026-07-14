"use client";

import Link from "next/link";
import { Hammer, ArrowLeft, Construction } from "lucide-react";

export default function UnderConstructionPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <Construction className="w-48 h-48" />
          </div>
          <div className="relative flex justify-center">
            <div className="p-5 bg-amber-100 rounded-2xl text-amber-600 animate-bounce">
              <Hammer className="w-12 h-12" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Sección en Construcción
          </h1>
          <p className="text-gray-500 leading-relaxed">
            Estamos trabajando para brindarte una mejor experiencia. Esta
            funcionalidad estará disponible próximamente.
          </p>
        </div>

        <div className="pt-6">
          <Link
            href="/dashboard/capacitacion"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Panel
          </Link>
        </div>
      </div>
    </div>
  );
}
