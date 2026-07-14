"use client";

import { useState, useEffect } from "react";
// Force TypeScript recompilation
import { useRouter } from "next/navigation";
import { Facilitador, State } from "@/types";
import { Button } from "@/components/ui/button";

interface FacilitadorCrudProps {
  onFacilitadorSaved?: () => void;
  onFacilitadorDeleted?: () => void;
  onFacilitadorUpdated?: () => void;
}

export const FacilitadorCrud = ({ 
  onFacilitadorSaved, 
  onFacilitadorDeleted,
  onFacilitadorUpdated 
}: FacilitadorCrudProps) => {
  const router = useRouter();
  const [facilitadores, setFacilitadores] = useState<Facilitador[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFacilitador, setSelectedFacilitador] = useState<Facilitador | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Client-side only: Check if we're in the browser
  const isClient = typeof window !== 'undefined';

  // Load facilitadores
  const loadFacilitadores = async () => {
    try {
      const response = await fetch("/api/facilitators/");
      if (response.ok) {
        const data = await response.json();
        setFacilitadores(data);
      }
    } catch (error) {
      console.error("Error loading facilitadores:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load states
  const loadStates = async () => {
    try {
      const response = await fetch("/api/estados");
      if (response.ok) {
        const data = await response.json();
        setStates(data);
      }
    } catch (error) {
      console.error("Error loading states:", error);
    } finally {
      setLoadingStates(false);
    }
  };

  useEffect(() => {
    loadFacilitadores();
    loadStates();
  }, []);

  // Helper function to get state name by ID
  const getStateName = (stateId: number | string | null) => {
    if (!stateId) return "Sin estado";
    
    // Convert to number for comparison if it's a string
    const numericId = typeof stateId === 'string' ? parseInt(stateId, 10) : stateId;
    
    if (isNaN(numericId)) return "ID inválido";
    
    const state = states.find(s => s.id === numericId);
    return state ? state.nombre_estado : "Estado desconocido";
  };

  // Create new facilitator
  const handleCreate = async () => {
    // Only navigate on client-side
    if (isClient) {
      router.push("/dashboard/capacitacion/gestion-de-facilitadores?create=true");
    }
  };

  // Show facilitador details
  const handleShowDetails = (facilitador: Facilitador) => {
    setSelectedFacilitador(facilitador);
    setShowDetailsModal(true);
  };

  // Edit facilitator
  const handleEdit = (facilitador: Facilitador) => {
    // Only navigate on client-side
    if (isClient) {
      router.push(`/dashboard/capacitacion/gestion-de-facilitadores?edit=${facilitador.id}`);
    }
  };

  // Toggle facilitador status (inhabilitar/habilitar)
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const action = currentStatus ? "inhabilitar" : "habilitar";
    const justification = currentStatus 
      ? prompt(
          "¿Estás seguro de que quieres inhabilitar este facilitador? Esta acción lo marcará como inactivo y no podrá ser asignado a nuevas capacitaciones.\n\nPor favor, indica el motivo por el cual se está inhabilitando este facilitador:"
        )
      : prompt(
          "¿Estás seguro de que quieres habilitar este facilitador? Esta acción lo marcará como activo y podrá ser asignado a nuevas capacitaciones.\n\nPor favor, indica el motivo por el cual se está habilitando este facilitador:"
        );
    
    if (!justification || justification.trim() === '') {
      alert(`Debe proporcionar un motivo para ${action} al facilitador.`);
      return;
    }
    
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/facilitators/${id}?t=${timestamp}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          is_active: !currentStatus,
          notas_observaciones: justification.trim()
        }),
      });

      if (response.ok) {
        alert(`Facilitador ${action === "inhabilitar" ? "inhabilitado" : "habilitado"} exitosamente`);
        await loadFacilitadores();
        // The data is already reloaded, so we don't need the callback
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Error al ${action} el facilitador`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      alert(`Error al ${action} el facilitador: ${error instanceof Error ? error.message : 'Por favor intenta nuevamente.'}`);
    }
  };

  // Filter facilitadores
  const filteredFacilitadores = facilitadores.filter(facilitador =>
    (facilitador.nombre_apellido?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (facilitador.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (facilitador.cedula?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (facilitador.temas_cursos || []).some(topic => 
      topic.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  useEffect(() => {
    loadFacilitadores();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Facilitadores</h2>
        <Button onClick={handleCreate}>
          Nuevo Facilitador
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar facilitador..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Facilitadores Table */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cédula
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredFacilitadores.map((facilitador) => (
              <tr 
                key={facilitador.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleShowDetails(facilitador)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-900">
                      {facilitador.nombre_apellido}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        facilitador.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {facilitador.is_active ? "Activo" : "Inactivo"}
                      </span>
                      {facilitador.tiene_curriculum && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          CV
                        </span>
                      )}
                      {facilitador.tiene_certificaciones && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          Cert
                        </span>
                      )}
                      {facilitador.tiene_foto_perfil && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Foto
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {facilitador.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {facilitador.cedula}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {facilitador.telefono}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getStateName(facilitador.id_estado_geografico)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(facilitador)}
                    >
                      Editar
                    </Button>
                    <Button 
                      variant={facilitador.is_active ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleToggleStatus(facilitador.id.toString(), facilitador.is_active)}
                    >
                      {facilitador.is_active ? "Inhabilitar" : "Habilitar"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredFacilitadores.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No se encontraron facilitadores
          </div>
        )}
      </div>

      {/* Facilitador Details Modal */}
      {showDetailsModal && selectedFacilitador && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalles del Facilitador</h3>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedFacilitador(null);
                }}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre y Apellido
                  </label>
                  <div className="flex flex-col">
                    <p className="text-sm text-gray-900">{selectedFacilitador.nombre_apellido}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedFacilitador.tiene_curriculum && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          CV
                        </span>
                      )}
                      {selectedFacilitador.tiene_certificaciones && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          Cert
                        </span>
                      )}
                      {selectedFacilitador.tiene_foto_perfil && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Foto
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cédula
                  </label>
                  <p className="text-sm text-gray-900">{selectedFacilitador.cedula || "N/A"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-sm text-gray-900">{selectedFacilitador.email || "N/A"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <p className="text-sm text-gray-900">{selectedFacilitador.telefono || "N/A"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RIF
                  </label>
                  <p className="text-sm text-gray-900">{selectedFacilitador.rif || "N/A"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <p className="text-sm text-gray-900">{getStateName(selectedFacilitador.id_estado_geografico)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <p className="text-sm text-gray-900">{selectedFacilitador.direccion || "N/A"}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nivel Técnico
                </label>
                <p className="text-sm text-gray-900">{selectedFacilitador.nivel_tecnico || "N/A"}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alcance
                </label>
                <p className="text-sm text-gray-900">{selectedFacilitador.alcance || "N/A"}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas y Observaciones
                </label>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {selectedFacilitador.notas_observaciones || "No hay notas u observaciones"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temas de Cursos
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedFacilitador.temas_cursos && selectedFacilitador.temas_cursos.length > 0 ? (
                    selectedFacilitador.temas_cursos.map((topic, index) => (
                      <span key={index} className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {topic}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-900">No hay temas asignados</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedFacilitador(null);
                  }}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
  );
};
