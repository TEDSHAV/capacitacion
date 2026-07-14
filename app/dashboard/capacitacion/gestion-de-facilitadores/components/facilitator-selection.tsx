"use client";

import { useState, useEffect } from "react";
import { Facilitador } from "@/types";

interface FacilitatorSelectionProps {
  selectedFacilitatorId?: string;
  onFacilitatorChange: (id: string) => void;
}

export const FacilitatorSelection = ({
  selectedFacilitatorId,
  onFacilitatorChange,
}: FacilitatorSelectionProps) => {
  const [facilitators, setFacilitators] = useState<Facilitador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFacilitators();
  }, []);


  const loadFacilitators = async () => {
    try {
      const response = await fetch("/api/facilitators/");
      if (response.ok) {
        const data = await response.json();
        setFacilitators(data);
      }
    } catch (error) {
      console.error("Error loading facilitators:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor="facilitator"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        Facilitador del Curso
      </label>
      <select
        id="facilitator"
        value={selectedFacilitatorId?.toString() || ""}
        onChange={(e) => onFacilitatorChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Seleccionar facilitador...</option>
        {facilitators.map((facilitator) => (
          <option key={facilitator.id} value={facilitator.id}>
            {facilitator.nombre_apellido} - {facilitator.direccion?.split(',')[0] || 'Ciudad no especificada'}
          </option>
        ))}
      </select>
      {facilitators.length === 0 && (
        <p className="text-xs text-gray-500 mt-1">
          No hay facilitadores registrados. 
          <a href="/dashboard/capacitacion/gestion-de-facilitadores" className="text-blue-600 hover:underline ml-1">
            Agregar facilitadores
          </a>
        </p>
      )}
      {selectedFacilitatorId && (
        <div className="mt-2 text-xs text-gray-500">
          {facilitators.find(f => f.id === parseInt(selectedFacilitatorId))?.temas_cursos?.slice(0, 3).join(', ')}
          {(facilitators.find(f => f.id === parseInt(selectedFacilitatorId))?.temas_cursos?.length || 0) > 3 && '...'}
        </div>
      )}
    </div>
  );
};
