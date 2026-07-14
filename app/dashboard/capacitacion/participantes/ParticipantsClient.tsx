"use client";

import { useState, useEffect, useRef } from "react";
import { ParticipanteCertificado, ParticipantFormData, ParticipantsClientProps } from "@/types";
import { getParticipantsPaginated, createParticipant, updateParticipant, deleteParticipant } from "@/app/actions/participants";
import { Button } from "@/components/ui/button";
import ErrorDialog from "@/components/ui/error-dialog";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Edit, Trash2, Search, X } from "lucide-react";

const ITEMS_PER_PAGE = 20;

export function ParticipantsClient({ user, initialParticipants, initialTotal }: ParticipantsClientProps & { initialParticipants: ParticipanteCertificado[]; initialTotal: number }) {
  const [participants, setParticipants] = useState<ParticipanteCertificado[]>(initialParticipants);
  const [total, setTotal] = useState(initialTotal);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<ParticipanteCertificado | null>(null);
  const [formData, setFormData] = useState<ParticipantFormData>({
    nombre: "",
    cedula: "",
    nacionalidad: "venezolano"
  });
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [error, setError] = useState<{ isOpen: boolean; message: string; details?: string }>({
    isOpen: false,
    message: ""
  });
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const loadParticipants = async (page: number, search: string) => {
    setIsLoading(true);
    try {
      const result = await getParticipantsPaginated(page, ITEMS_PER_PAGE, search);
      if (result.participants) {
        setParticipants(result.participants);
        setTotal(result.total);
      }
    } catch (err) {
      setError({ isOpen: true, message: "Error al cargar participantes" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => loadParticipants(1, value), 350);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadParticipants(page, searchTerm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingParticipant) {
        const result = await updateParticipant(editingParticipant.id, formData);
        if (result.success) {
          resetForm();
          loadParticipants(currentPage, searchTerm);
        } else {
          setError({ isOpen: true, message: result.error || "Error al actualizar participante" });
        }
      } else {
        const result = await createParticipant(formData);
        if (result.success) {
          resetForm();
          loadParticipants(1, searchTerm);
          setCurrentPage(1);
        } else {
          setError({ isOpen: true, message: result.error || "Error al crear participante" });
        }
      }
    } catch (error) {
      setError({ isOpen: true, message: "Error inesperado", details: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (participant: ParticipanteCertificado) => {
    setEditingParticipant(participant);
    setFormData({
      nombre: participant.nombre,
      cedula: participant.cedula,
      nacionalidad: participant.nacionalidad
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    confirm({
      title: 'Eliminar Participante',
      message: '¿Está seguro de que desea eliminar este participante?',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          const result = await deleteParticipant(id);
          if (result.success) {
            const newPage = participants.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
            setCurrentPage(newPage);
            loadParticipants(newPage, searchTerm);
          } else {
            setError({ isOpen: true, message: result.error || "Error al eliminar participante" });
          }
        } catch (error) {
          setError({ isOpen: true, message: "Error inesperado", details: error instanceof Error ? error.message : String(error) });
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const resetForm = () => {
    setFormData({ nombre: "", cedula: "", nacionalidad: "venezolano" });
    setEditingParticipant(null);
    setShowForm(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Participantes</h1>
        <Button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Participante
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por nombre o cédula..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingParticipant ? "Editar Participante" : "Nuevo Participante"}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nacionalidad
                </label>
                <select
                  value={formData.nacionalidad}
                  onChange={(e) => setFormData({ ...formData, nacionalidad: e.target.value as "venezolano" | "extranjero" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="venezolano">Venezolano</option>
                  <option value="extranjero">Extranjero</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cédula
                </label>
                <input
                  type="text"
                  required
                  value={formData.cedula}
                  onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Guardando..." : editingParticipant ? "Actualizar" : "Crear"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Participants Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cédula
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nacionalidad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">Cargando...</td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? "No se encontraron participantes que coincidan con la búsqueda." : "No hay participantes registrados."}
                  </td>
                </tr>
              ) : (
                participants.map((participant) => (
                  <tr key={participant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {participant.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {participant.nacionalidad === "venezolano" ? "V-" : "E-"}{participant.cedula}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {participant.nacionalidad === "venezolano" ? "Venezolano" : "Extranjero"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEdit(participant)}
                          className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2 text-sm"
                          style={{ backgroundColor: 'var(--primary-blue)' }}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(participant.id)}
                          className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors shadow-md flex items-center gap-2 text-sm"
                          style={{ backgroundColor: 'var(--primary-red)' }}
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <span className="text-sm text-gray-500">
            Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, total)} de {total} participantes
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || isLoading}>
              Anterior
            </Button>
            <span className="px-3 py-1 text-sm text-gray-700">Página {currentPage} de {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || isLoading}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={error.isOpen}
        message={error.message}
        details={error.details}
        onClose={() => setError({ isOpen: false, message: "", details: "" })}
      />
      {confirmDialog}
    </div>
  );
}
