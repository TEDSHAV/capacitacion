"use client";

import { useState, useEffect } from "react";
// Force TypeScript recompilation
import { useRouter } from "next/navigation";
import { Facilitador, State } from "@/types";
import { Button } from "@/components/ui/button";
import { Edit, Minus, Check, Star, StarHalf, FileText } from "lucide-react";
import { toTitleCase } from "@/utils/string-utils";
import { createClient } from "@/utils/supabase/client";
import { getFacilitatorRatings } from "@/app/actions/facilitators";

interface FacilitadorCrudProps {
  onFacilitadorSaved?: () => void;
  onFacilitadorDeleted?: () => void;
  onFacilitadorUpdated?: () => void;
}

export const FacilitadorCrud = ({
  onFacilitadorSaved,
  onFacilitadorDeleted,
  onFacilitadorUpdated,
}: FacilitadorCrudProps) => {
  const router = useRouter();
  const [facilitadores, setFacilitadores] = useState<Facilitador[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Client-side only: Check if we're in the browser
  const isClient = typeof window !== "undefined";

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

  // Load ratings
  const loadRatings = async () => {
    try {
      const { ratings: ratingsData, error } = await getFacilitatorRatings();
      if (error) {
        console.error("FacilitadorCrud: Error from getFacilitatorRatings:", error);
      }
      if (ratingsData) {
        setRatings(ratingsData);
      }
    } catch (error) {
      console.error("FacilitadorCrud: Exception loading ratings:", error);
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
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        loadFacilitadores(),
        loadStates(),
        loadRatings()
      ]);
      setLoading(false);
    };
    
    loadAllData();
  }, []);

  // Update ratings whenever facilitators are reloaded
  useEffect(() => {
    if (facilitadores.length > 0) {
      loadRatings();
    }
  }, [facilitadores.length]);

  // Helper function to get stars based on rating
  const renderStars = (rating: number | undefined) => {
    if (rating === undefined || rating === 0) {
      return <span className="text-gray-400 text-xs italic">Sin datos</span>;
    }

    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5" title={`Rating: ${rating}/5`}>
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && <StarHalf className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="w-3.5 h-3.5 text-gray-300" />
        ))}
        <span className="ml-1 text-xs font-bold text-gray-600">{rating}</span>
      </div>
    );
  };

  // Helper function to get state name by ID
  const getStateName = (stateId: number | string | null) => {
    if (!stateId) return "Sin estado";

    // Convert to number for comparison if it's a string
    const numericId =
      typeof stateId === "string" ? parseInt(stateId, 10) : stateId;

    if (isNaN(numericId)) return "ID inválido";

    const state = states.find((s) => s.id === numericId);
    return state ? state.nombre_estado : "Estado desconocido";
  };

  // Create new facilitator
  const handleCreate = async () => {
    // Only navigate on client-side
    if (isClient) {
      router.push(
        "/dashboard/capacitacion/gestion-de-facilitadores?create=true",
      );
    }
  };

  // Edit facilitator
  const handleEdit = (facilitador: Facilitador) => {
    router.push(
      `/dashboard/capacitacion/gestion-de-facilitadores?edit=${facilitador.id}`,
    );
  };

  // Toggle facilitador status (inhabilitar/habilitar)
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const action = currentStatus ? "inhabilitar" : "habilitar";
    const promptMessage = currentStatus
      ? "¿Estás seguro de que quieres inhabilitar este facilitador? Esta acción lo marcará como inactivo y no podrá ser asignado a nuevas capacitaciones.\n\nPor favor, indica el motivo por el cual se está inhabilitando este facilitador:"
      : "¿Estás seguro de que quieres habilitar este facilitador? Esta acción lo marcará como activo y podrá ser asignado a nuevas capacitaciones.\n\nPor favor, indica el motivo por el cual se está habilitando este facilitador:";

    const justification = prompt(promptMessage);

    if (!justification || justification.trim() === "") {
      alert(`Debe proporcionar un motivo para ${action} al facilitador.`);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      // 1. Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userName = user?.user_metadata?.name || user?.email || "Usuario desconocido";

      // 2. Get current notes to avoid overwriting
      const { data: currentData, error: fetchError } = await supabase
        .from("facilitadores")
        .select("notas_observaciones")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const existingNotes = currentData?.notas_observaciones || "";
      const now = new Date();
      const formattedDate = now.toLocaleString("es-VE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const actionTag = currentStatus ? "[INHABILITADO]" : "[HABILITADO]";
      const newEntry = `\n---\n${formattedDate} ${actionTag} por ${userName}:\n${justification.trim()}`;
      const updatedNotes = existingNotes ? `${existingNotes}${newEntry}` : newEntry.trim();

      // 3. Update status and notes
      const timestamp = Date.now();
      const response = await fetch(`/api/facilitators/${id}?t=${timestamp}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: !currentStatus,
          notas_observaciones: updatedNotes,
        }),
      });

      if (response.ok) {
        alert(
          `Facilitador ${action === "inhabilitar" ? "inhabilitado" : "habilitado"} exitosamente`,
        );
        await loadFacilitadores();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Error al ${action} el facilitador`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error(`Error al ${action} el facilitador:`, error);
      alert(
        `Error al ${action} el facilitador: ${error instanceof Error ? error.message : "Por favor intenta nuevamente."}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Filter facilitadores
  const filteredFacilitadores = facilitadores
    .filter(
      (facilitador) =>
        (facilitador.nombre_apellido?.toLowerCase() || "").includes(
          searchTerm.toLowerCase(),
        ) ||
        (facilitador.email?.toLowerCase() || "").includes(
          searchTerm.toLowerCase(),
        ) ||
        (facilitador.cedula?.toLowerCase() || "").includes(
          searchTerm.toLowerCase(),
        ) ||
        (facilitador.temas_cursos || []).some((topic) =>
          topic.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
    )
    .sort((a, b) =>
      (a.nombre_apellido || "").localeCompare(b.nombre_apellido || "", "es", {
        sensitivity: "base",
      }),
    );

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
        <h2 className="text-2xl font-bold text-gray-900">
          Gestión de Facilitadores
        </h2>
        <Button onClick={handleCreate}>Nuevo Facilitador</Button>
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
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                Nombre
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cédula
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredFacilitadores.map((facilitador) => (
              <tr
                key={facilitador.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleEdit(facilitador)}
              >
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-900">
                      {toTitleCase(facilitador.nombre_apellido || "")}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          facilitador.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {facilitador.is_active ? "Activo" : "Inactivo"}
                      </span>
                      {facilitador.tiene_curriculum && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          CV
                        </span>
                      )}
                      {facilitador.tiene_certificaciones && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          Cert
                        </span>
                      )}
                      {facilitador.tiene_foto_perfil && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Foto
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                  {facilitador.email}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  {renderStars(ratings[facilitador.id])}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                  {facilitador.cedula}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                  {facilitador.telefono}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getStateName(facilitador.id_estado_geografico)}
                </td>
                <td className="px-3 py-4 text-sm font-medium">
                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleEdit(facilitador)}
                      className="text-white p-2 rounded-md hover:opacity-90 transition-colors shadow-sm"
                      style={{ backgroundColor: "var(--primary-blue)" }}
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <a
                      href={`/api/generate-ficha-tecnica-facilitador-pdf?id=${facilitador.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center text-blue-600 bg-blue-50 border border-blue-200 p-2 rounded-md hover:bg-blue-100 transition-colors shadow-sm"
                      title="Descargar Ficha Técnica"
                    >
                      <FileText className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() =>
                        handleToggleStatus(
                          facilitador.id.toString(),
                          facilitador.is_active,
                        )
                      }
                      className={`text-white p-2 rounded-md hover:opacity-90 transition-colors shadow-sm`}
                      style={{
                        backgroundColor: facilitador.is_active
                          ? "var(--primary-red)"
                          : "var(--primary-blue)",
                      }}
                      title={
                        facilitador.is_active ? "Inhabilitar" : "Habilitar"
                      }
                    >
                      {facilitador.is_active ? (
                        <Minus className="w-4 h-4" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
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

    </div>
  );
};
