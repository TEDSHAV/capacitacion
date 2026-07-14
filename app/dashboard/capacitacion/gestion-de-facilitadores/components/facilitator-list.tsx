"use client";

import { useState, useEffect } from "react";
import { Facilitador } from "@/types";

interface FacilitatorListProps {
  refreshKey: number;
  onFacilitatorDeleted: () => void;
}

export const FacilitatorList = ({ 
  refreshKey, 
  onFacilitatorDeleted 
}: FacilitatorListProps) => {
  const [facilitators, setFacilitators] = useState<Facilitador[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadFacilitators();
  }, [refreshKey]);

  const loadFacilitators = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/facilitators");
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

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este facilitador?")) {
      return;
    }

    try {
      const response = await fetch(`/api/facilitators/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Facilitador eliminado exitosamente");
        onFacilitatorDeleted();
      } else {
        throw new Error("Error al eliminar el facilitador");
      }
    } catch (error) {
      alert("Error al eliminar el facilitador. Por favor intenta nuevamente.");
      console.error("Delete error:", error);
    }
  };

  const filteredFacilitators = facilitators.filter(facilitator =>
    (facilitator.nombre_apellido?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (facilitator.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (facilitator.cedula?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (facilitator.temas_cursos || []).some(topic => 
      topic.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Facilitadores Registrados
        </h2>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Buscar facilitador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-sm text-gray-500">
            {filteredFacilitators.length} de {facilitators.length}
          </span>
        </div>
      </div>

      {filteredFacilitators.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p className="mt-2 text-gray-500">
            {searchTerm ? "No se encontraron facilitadores que coincidan con la búsqueda" : "No hay facilitadores registrados"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Información
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Temas de Curso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CV
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFacilitators.map((facilitator) => (
                <tr key={facilitator.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {facilitator.nombre_apellido}
                      </div>
                      <div className="text-sm text-gray-500">
                        {facilitator.cedula}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{facilitator.telefono}</div>
                    <div className="text-sm text-gray-500">{facilitator.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{facilitator.id_ciudad_base || "Sin ciudad"}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {facilitator.direccion || "Sin dirección"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(facilitator.temas_cursos || []).slice(0, 2).map((topic, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                        >
                          {topic}
                        </span>
                      ))}
                      {(facilitator.temas_cursos || []).length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{(facilitator.temas_cursos || []).length - 2} más
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {facilitator.url_curriculum ? (
                      <a
                        href={facilitator.url_curriculum}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        Ver CV
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">No disponible</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDelete(facilitator.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
