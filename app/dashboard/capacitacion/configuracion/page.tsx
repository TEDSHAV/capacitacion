"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings, ChevronRight } from "lucide-react";

export default function ConfiguracionPage() {
  const configSections = [
    {
      id: "secuencias-control",
      title: "Secuencias de Control",
      description:
        "Configurar números de control para certificados (Libro, Hoja, Línea, Nro. Ctrl)",
      icon: "🔢",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        </div>
        <p className="text-gray-600">
          Administra la configuración del sistema de capacitación
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {configSections.map((section) => (
          <Link
            key={section.id}
            href={`/dashboard/capacitacion/configuracion/${section.id}`}
          >
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{section.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {section.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
