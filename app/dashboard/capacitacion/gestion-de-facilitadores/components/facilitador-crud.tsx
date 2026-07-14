"use client";

import { useState, useEffect } from "react";
// Force TypeScript recompilation
import { useRouter } from "next/navigation";
import { Facilitador, State } from "@/types";

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
  const [editingFacilitador, setEditingFacilitador] = useState<Facilitador | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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

  // Edit facilitator
  const handleEdit = (facilitador: Facilitador) => {
    // Only navigate on client-side
    if (isClient) {
      router.push(`/dashboard/capacitacion/gestion-de-facilitadores?edit=${facilitador.id}`);
    }
  };

  // Update facilitador
  const handleUpdate = async (updatedData: Partial<Facilitador>) => {
    if (!editingFacilitador) return;

    try {
      const response = await fetch(`/api/facilitators/${editingFacilitador.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        alert("Facilitador actualizado exitosamente");
        setShowEditModal(false);
        setEditingFacilitador(null);
        await loadFacilitadores();
        onFacilitadorUpdated?.();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Error al actualizar el facilitador";
        throw new Error(errorMessage);
      }
    } catch (error) {
      alert(`Error al actualizar el facilitador: ${error instanceof Error ? error.message : 'Por favor intenta nuevamente.'}`);
    }
  };

  // Delete facilitator
  const handleDelete = async (id: string) => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/facilitators/${id}?t=${timestamp}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Facilitador eliminado exitosamente");
        setShowDeleteModal(false);
        setDeleteTarget(null);
        await loadFacilitadores();
        onFacilitadorDeleted?.();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Error al eliminar el facilitador";
        throw new Error(errorMessage);
      }
    } catch (error) {
      alert(`Error al eliminar el facilitador: ${error instanceof Error ? error.message : 'Por favor intenta nuevamente.'}`);
    }
  };

  // Confirm delete
  const confirmDelete = (id: string) => {
    setDeleteTarget(id);
    setShowDeleteModal(true);
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
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Nuevo Facilitador
        </button>
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
              <tr key={facilitador.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {facilitador.nombre_apellido}
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
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(facilitador)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-colors"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      onClick={() => confirmDelete(facilitador.id.toString())}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Eliminar
                    </button>
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

      {/* Edit Modal */}
      {showEditModal && editingFacilitador && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Editar Facilitador</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingFacilitador(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre y Apellido
                </label>
                <input
                  type="text"
                  value={editingFacilitador.nombre_apellido || ""}
                  onChange={(e) => setEditingFacilitador({...editingFacilitador, nombre_apellido: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editingFacilitador.email || ""}
                  onChange={(e) => setEditingFacilitador({...editingFacilitador, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cédula
                </label>
                <input
                  type="text"
                  value={editingFacilitador.cedula || ""}
                  onChange={(e) => setEditingFacilitador({...editingFacilitador, cedula: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={editingFacilitador.telefono || ""}
                  onChange={(e) => setEditingFacilitador({...editingFacilitador, telefono: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingFacilitador(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleUpdate(editingFacilitador)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmar Eliminación</h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que quieres eliminar este facilitador? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteTarget!)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
