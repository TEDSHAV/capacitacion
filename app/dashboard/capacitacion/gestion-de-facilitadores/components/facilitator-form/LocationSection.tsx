"use client";

import React, { useState } from "react";
import { LocationSectionProps } from "@/types";

export const LocationSection = ({ formData, handleInputChange, states, cities, loadingStates, loadingCities, onAddCity }: LocationSectionProps) => {
  const [showAddCity, setShowAddCity] = useState(false);
  const [newCityName, setNewCityName] = useState("");

  const filteredCities = formData.id_estado_geografico
    ? cities.filter(city => city.id_estado === parseInt(formData.id_estado_geografico))
    : [];

  const handleAddCity = async () => {
    if (!formData.id_estado_geografico || !newCityName.trim()) return;
    try {
      await onAddCity(parseInt(formData.id_estado_geografico), newCityName.trim());
      setNewCityName("");
      setShowAddCity(false);
    } catch (error) {
      alert("Error al agregar ciudad. Por favor intenta nuevamente.");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium text-gray-900">Ubicación</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              value={formData.id_estado_geografico || ""}
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ciudad
          </label>
          {loadingCities ? (
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                value={formData.id_ciudad_geografico || ""}
                onChange={(e) => handleInputChange("id_ciudad_geografico", e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!formData.id_estado_geografico}
              >
                <option value="">Seleccionar ciudad...</option>
                {filteredCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.nombre_ciudad}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddCity(!showAddCity)}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                disabled={!formData.id_estado_geografico}
              >
                +
              </button>
            </div>
          )}
          {showAddCity && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                placeholder="Nombre de nueva ciudad"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddCity}
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Agregar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddCity(false);
                  setNewCityName("");
                }}
                className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dirección
        </label>
        <textarea
          value={formData.direccion || ""}
          onChange={(e) => handleInputChange("direccion", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ej: Calle 123, Urbanización XYZ"
        />
      </div>
    </div>
  );
};
