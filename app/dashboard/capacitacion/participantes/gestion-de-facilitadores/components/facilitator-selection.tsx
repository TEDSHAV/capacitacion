"use client";

import { useState, useEffect } from "react";
import { getFacilitatorsAction } from "@/app/actions/facilitators-crud";
import { Facilitador, FacilitatorOption } from "@/types";
import { SearchableSelect } from "@/components/SearchableSelect";

interface FacilitatorSelectionProps {
  selectedFacilitatorId?: string;
  onFacilitatorChange: (id: string) => void;
}

export const FacilitatorSelection = ({
  selectedFacilitatorId,
  onFacilitatorChange,
}: FacilitatorSelectionProps) => {
  const [facilitatorOptions, setFacilitatorOptions] = useState<FacilitatorOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFacilitators();
  }, []);

  const loadFacilitators = async () => {
    try {
      const result = await getFacilitatorsAction();
      if (result.data) {
        const facilitators = result.data;
        const options: FacilitatorOption[] = facilitators.map((facilitator: any) => ({
          value: facilitator.id.toString(),
          label: facilitator.nombre_apellido,
          id: facilitator.id,
          nombre_apellido: facilitator.nombre_apellido,
          facilitator: facilitator,
        }));
        setFacilitatorOptions(options);
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
      <SearchableSelect
        value={selectedFacilitatorId}
        onChange={onFacilitatorChange}
        options={facilitatorOptions}
        placeholder="Seleccionar facilitador..."
        isLoading={loading}
      />
      {facilitatorOptions.length === 0 && (
        <p className="text-xs text-gray-500 mt-1">
          No hay facilitadores registrados. 
          <a href="/dashboard/capacitacion/gestion-de-facilitadores" className="text-blue-600 hover:underline ml-1">
            Agregar facilitadores
          </a>
        </p>
      )}
      {selectedFacilitatorId && (
        <div className="mt-2 text-xs text-gray-500">
          {facilitatorOptions.find((f: any) => f.id === parseInt(selectedFacilitatorId || ''))?.facilitator?.temas_cursos?.slice(0, 3).join(', ')}
          {(facilitatorOptions.find((f: any) => f.id === parseInt(selectedFacilitatorId || ''))?.facilitator?.temas_cursos?.length || 0) > 3 && '...'}
        </div>
      )}
    </div>
  );
};
