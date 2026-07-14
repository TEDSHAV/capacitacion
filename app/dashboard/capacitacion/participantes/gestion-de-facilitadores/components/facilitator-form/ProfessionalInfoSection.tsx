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
            <option value="tecnico_superior">Técnico Superior</option>
            <option value="ingeniero">Ingeniero</option>
            <option value="licenciado">Licenciado</option>
            <option value="bachiller">Bachiller</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alcance
          </label>
          <select
            value={formData.alcance}
            onChange={(e) => handleInputChange("alcance", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Seleccionar alcance...</option>
            <option value="nacional">Nacional</option>
            <option value="regional">Regional</option>
            <option value="local">Local</option>
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

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="tiene_curriculum"
            checked={formData.tiene_curriculum}
            onChange={(e) => handleInputChange("tiene_curriculum", e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="tiene_curriculum" className="text-sm text-gray-700">
            Tiene Currículum
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="tiene_certificaciones"
            checked={formData.tiene_certificaciones}
            onChange={(e) => handleInputChange("tiene_certificaciones", e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="tiene_certificaciones" className="text-sm text-gray-700">
            Tiene Certificaciones
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="tiene_foto_perfil"
            checked={formData.tiene_foto_perfil}
            onChange={(e) => handleInputChange("tiene_foto_perfil", e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="tiene_foto_perfil" className="text-sm text-gray-700">
            Tiene Foto de Perfil
          </label>
        </div>
      </div>
    </div>
  );
};
