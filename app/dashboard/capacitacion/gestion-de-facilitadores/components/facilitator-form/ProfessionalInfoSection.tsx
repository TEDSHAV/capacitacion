"use client";

import React from "react";
import { ProfessionalInfoSectionProps } from "@/types";

export const ProfessionalInfoSection = ({ formData, handleInputChange, states, loadingStates }: ProfessionalInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium text-gray-900">Información Profesional</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nivel Técnico
          </label>
          <select
            value={formData.nivel_tecnico}
            onChange={(e) => handleInputChange("nivel_tecnico", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Seleccionar nivel...</option>
            <option value="basico">Básico</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
            <option value="experto">Experto</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Impacto
          </label>
          <select
            value={formData.tipo_impacto}
            onChange={(e) => handleInputChange("tipo_impacto", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Seleccionar tipo...</option>
            <option value="N">Nacional</option>
            <option value="R">Regional</option>
            <option value="L">Local</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="formacion_docente_certificada"
            checked={formData.formacion_docente_certificada}
            onChange={(e) => handleInputChange("formacion_docente_certificada", e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="formacion_docente_certificada" className="text-sm text-gray-700">
            Formación Docente Certificada
          </label>
        </div>
      </div>
    </div>
  );
};
