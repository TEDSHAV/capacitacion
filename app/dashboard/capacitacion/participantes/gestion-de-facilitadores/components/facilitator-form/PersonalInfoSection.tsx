"use client";

import React from "react";
import { PersonalInfoSectionProps } from "@/types";

export const PersonalInfoSection = ({ formData, handleInputChange }: PersonalInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium text-gray-900">Información Personal</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre y Apellido *
          </label>
          <input
            type="text"
            value={formData.nombre_apellido}
            onChange={(e) => handleInputChange("nombre_apellido", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: Juan Pérez"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cédula *
          </label>
          <input
            type="text"
            value={formData.cedula}
            onChange={(e) => handleInputChange("cedula", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: V-12345678"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            RIF
          </label>
          <input
            type="text"
            value={formData.rif}
            onChange={(e) => handleInputChange("rif", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: J-123456789"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teléfono *
          </label>
          <input
            type="tel"
            value={formData.telefono}
            onChange={(e) => handleInputChange("telefono", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: 0412-1234567"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Correo Electrónico *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: correo@ejemplo.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de Ingreso
          </label>
          <input
            type="date"
            value={formData.fecha_ingreso}
            onChange={(e) => handleInputChange("fecha_ingreso", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fuente
        </label>
        <select
          value={formData.fuente}
          onChange={(e) => handleInputChange("fuente", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Seleccionar fuente...</option>
          <option value="recomendacion">Recomendación</option>
          <option value="linkedin">LinkedIn</option>
          <option value="web">Página Web</option>
          <option value="rrss">Redes Sociales</option>
          <option value="interno">Referencia Interna</option>
          <option value="otro">Otro</option>
        </select>
      </div>
    </div>
  );
};
