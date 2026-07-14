"use client";

import { useState, useEffect } from "react";
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

  // Convert facilitators to the format expected by SearchableSelect
  const facilitatorOptions: FacilitatorOption[] = facilitators.map(facilitator => ({
    id: facilitator.id.toString(),
    nombre_apellido: facilitator.nombre_apellido,
    direccion: facilitator.direccion || undefined,
    temas_cursos: facilitator.temas_cursos || undefined,
  }));

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
        value={selectedFacilitatorId || ""}
        onChange={onFacilitatorChange}
        options={facilitatorOptions}
        placeholder="Buscar facilitador por nombre, ciudad o temas..."
        loading={loading}
      />
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
