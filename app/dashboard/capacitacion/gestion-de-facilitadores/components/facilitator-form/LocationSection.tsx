"use client";

import React from "react";
import { LocationSectionProps } from "@/types";

export const LocationSection = ({ formData, handleInputChange, states, loadingStates }: LocationSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium text-gray-900">Ubicación</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ciudad *
          </label>
          <input
            type="text"
            value={formData.id_ciudad_base}
            onChange={(e) => handleInputChange("id_ciudad_base", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: Caracas, Valencia, Maracaibo"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado
          </label>
          {loadingStates ? (
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <select
              value={formData.id_estado_geografico}
              onChange={(e) => handleInputChange("id_estado_geografico", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar estado...</option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.nombre_estado}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dirección
        </label>
        <textarea
          value={formData.direccion}
          onChange={(e) => handleInputChange("direccion", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ej: Calle 123, Urbanización XYZ"
        />
      </div>
    </div>
  );
};
