"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Facilitador, State } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Minus,
  Check,
  Star,
  StarHalf,
  FileText,
  History,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";
import { toTitleCase } from "@/utils/string-utils";
import { createClient } from "@/utils/supabase/client";
import { getFacilitatorRatings } from "@/app/actions/facilitators";
import { getFacilitatorPoolAction, FacilitatorPoolItem } from "@/app/actions/facilitators-pool";
import { FacilitadorHistoryModal } from "./FacilitadorHistoryModal";
import AssignOSIModal from "./assign-osi-modal";
import { FacilitadorMatcherBar, ViewMode, SortMode, SkillLevel } from "./FacilitadorMatcherBar";
import { FacilitadorPoolGrid } from "./FacilitadorPoolGrid";
import { FacilitadorProfileDrawer } from "./FacilitadorProfileDrawer";

interface FacilitadorCrudProps {
  onFacilitadorSaved?: () => void;
  onFacilitadorDeleted?: () => void;
  onFacilitadorUpdated?: () => void;
}

type LayoutMode = "pool" | "table";

export const FacilitadorCrud = ({
  onFacilitadorSaved,
  onFacilitadorDeleted,
  onFacilitadorUpdated,
}: FacilitadorCrudProps) => {
  const router = useRouter();
  // Pool state
  const [poolData, setPoolData] = useState<FacilitatorPoolItem[]>([]);
  const [allTopics, setAllTopics] = useState<string[]>([]);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [poolError, setPoolError] = useState<string | null>(null);

  // Legacy table state (kept as fallback view)
  const [facilitadores, setFacilitadores] = useState<Facilitador[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [loadingStates, setLoadingStates] = useState(true);

  // Shared UI state
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("pool");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel>("todos");
  const [onlyActive, setOnlyActive] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("rating");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // Modals / Drawer
  const [historyFacilitador, setHistoryFacilitador] = useState<Facilitador | null>(null);
  const [historyPoolFacilitador, setHistoryPoolFacilitador] = useState<FacilitatorPoolItem | null>(null);
  const [assignOsiFacilitador, setAssignOsiFacilitador] = useState<FacilitatorPoolItem | null>(null);
  const [profileFacilitador, setProfileFacilitador] = useState<FacilitatorPoolItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isClient = typeof window !== "undefined";

  // ---------- Pool data loading ----------
  const loadPool = useCallback(async () => {
    setPoolLoading(true);
    setPoolError(null);
    try {
      const res = await getFacilitatorPoolAction();
      if (res.error) {
        setPoolError(res.error);
      } else {
        setPoolData(res.facilitadores);
        setAllTopics(res.allTopics);
        setAllCities(res.allCities);
      }
    } catch (err) {
      console.error("FacilitadorCrud: Exception loading pool:", err);
      setPoolError(err instanceof Error ? err.message : "Error al cargar el pool de facilitadores.");
    } finally {
      setPoolLoading(false);
    }
  }, []);

  // ---------- Legacy table loaders ----------
  const loadFacilitadores = async () => {
    try {
      const response = await fetch("/api/facilitators/");
      if (response.ok) {
        const data = await response.json();
        setFacilitadores(data);
      }
    } catch (error) {
      console.error("Error loading facilitadores:", error);
    }
  };

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
    loadPool();
    // Load legacy table data lazily only if user switches to table view
    // (deferred to keep initial render fast)
  }, [loadPool]);

  // Load table data when user switches to table view for the first time
  useEffect(() => {
    if (layoutMode === "table" && facilitadores.length === 0 && !loadingStates) {
      loadFacilitadores();
      loadRatings();
    }
    if (layoutMode === "table" && states.length === 0) {
      loadStates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutMode]);

  // Update ratings whenever facilitators are reloaded (legacy table)
  useEffect(() => {
    if (layoutMode === "table" && facilitadores.length > 0) {
      loadRatings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilitadores.length, layoutMode]);

  // ---------- Helpers ----------
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

  const getStateName = (stateId: number | string | null) => {
    if (!stateId) return "Sin estado";
    const numericId = typeof stateId === "string" ? parseInt(stateId, 10) : stateId;
    if (isNaN(numericId)) return "ID inválido";
    const state = states.find((s) => s.id === numericId);
    return state ? state.nombre_estado : "Estado desconocido";
  };

  // ---------- Actions ----------
  const handleCreate = () => {
    if (isClient) {
      router.push("/dashboard/capacitacion/gestion-de-facilitadores?create=true");
    }
  };

  const handleEdit = (facilitador: Facilitador) => {
    router.push(`/dashboard/capacitacion/gestion-de-facilitadores?edit=${facilitador.id}`);
  };

  const handleEditPool = (facilitador: FacilitatorPoolItem) => {
    router.push(`/dashboard/capacitacion/gestion-de-facilitadores?edit=${facilitador.id}`);
  };

  const handleViewProfile = (facilitador: FacilitatorPoolItem) => {
    setProfileFacilitador(facilitador);
    setDrawerOpen(true);
  };

  const handleAssignOsi = (facilitador: FacilitatorPoolItem) => {
    setAssignOsiFacilitador(facilitador);
  };

  const handleShowHistoryPool = (facilitador: FacilitatorPoolItem) => {
    setHistoryPoolFacilitador(facilitador);
  };

  const handleToggleStatusPool = async (facilitador: FacilitatorPoolItem) => {
    await toggleStatus(facilitador.id.toString(), facilitador.is_active);
  };

  const handleToggleStatusLegacy = async (facilitador: Facilitador) => {
    await toggleStatus(facilitador.id.toString(), facilitador.is_active);
  };

  // Shared toggle status implementation
  const toggleStatus = async (id: string, currentStatus: boolean) => {
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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userName = user?.user_metadata?.name || user?.email || "Usuario desconocido";

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

      const timestamp = Date.now();
      const response = await fetch(`/api/facilitators/${id}?t=${timestamp}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_active: !currentStatus,
          notas_observaciones: updatedNotes,
        }),
      });

      if (response.ok) {
        alert(`Facilitador ${action === "inhabilitar" ? "inhabilitado" : "habilitado"} exitosamente`);
        // Refresh whichever view is active
        if (layoutMode === "pool") {
          await loadPool();
        } else {
          await loadFacilitadores();
        }
        onFacilitadorUpdated?.();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Error al ${action} el facilitador`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error(`Error al ${action} el facilitador:`, error);
      alert(`Error al ${action} el facilitador: ${error instanceof Error ? error.message : "Por favor intenta nuevamente."}`);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTopic(null);
    setSelectedCity(null);
    setSelectedLevel("todos");
    setOnlyActive(false);
  };

  // ---------- Legacy table filtering ----------
  const filteredFacilitadores = facilitadores
    .filter(
      (facilitador) =>
        (facilitador.nombre_apellido?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (facilitador.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (facilitador.cedula?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (facilitador.temas_cursos || []).some((topic) => topic.toLowerCase().includes(searchTerm.toLowerCase())),
    )
    .filter((f) => (onlyActive ? f.is_active : true))
    .sort((a, b) => (a.nombre_apellido || "").localeCompare(b.nombre_apellido || "", "es", { sensitivity: "base" }));

  // ---------- Loading state ----------
  if (poolLoading && layoutMode === "pool") {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Facilitadores</h2>
          <Button onClick={handleCreate}>Nuevo Facilitador</Button>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-full mb-4" />
          <div className="h-10 bg-gray-200 rounded w-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-13 h-13 rounded-full bg-gray-200" style={{ width: "52px", height: "52px" }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-px bg-gray-100 my-3" />
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-5 bg-gray-200 rounded-full w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Facilitadores</h2>
        <div className="flex items-center gap-2">
          {/* Layout toggle */}
          <div className="flex items-center rounded-lg p-0.5 border border-gray-200 bg-white">
            <button
              onClick={() => setLayoutMode("pool")}
              className={`p-1.5 rounded-md transition-colors ${
                layoutMode === "pool" ? "bg-violet-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              title="Vista de tarjetas / Pool"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode("table")}
              className={`p-1.5 rounded-md transition-colors ${
                layoutMode === "table" ? "bg-violet-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              title="Vista de tabla clásica"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={handleCreate}>Nuevo Facilitador</Button>
        </div>
      </div>

      {/* POOL LAYOUT */}
      {layoutMode === "pool" && (
        <>
          <FacilitadorMatcherBar
            allTopics={allTopics}
            allCities={allCities}
            searchTerm={searchTerm}
            selectedTopic={selectedTopic}
            selectedCity={selectedCity}
            selectedLevel={selectedLevel}
            onlyActive={onlyActive}
            sortMode={sortMode}
            viewMode={viewMode}
            totalCount={poolData.length}
            visibleCount={
              poolData.filter((f) => {
                if (onlyActive && !f.is_active) return false;
                if (selectedCity) {
                  const c = selectedCity.toLowerCase();
                  if (!(f.ciudad_nombre || "").toLowerCase().includes(c) && !(f.estado_nombre || "").toLowerCase().includes(c)) return false;
                }
                if (searchTerm.trim()) {
                  const t = searchTerm.toLowerCase();
                  if (!(f.nombre_apellido || "").toLowerCase().includes(t) &&
                      !(f.email || "").toLowerCase().includes(t) &&
                      !(f.cedula || "").toLowerCase().includes(t) &&
                      !(f.titulo_profesional || "").toLowerCase().includes(t) &&
                      !(f.temas_cursos || []).some((tp) => tp.toLowerCase().includes(t))) return false;
                }
                return true;
              }).length
            }
            matchedCount={
              selectedTopic
                ? poolData.filter((f) => {
                    const k = selectedTopic.toLowerCase().trim();
                    return !!f.topicRatings[k] || (f.temas_cursos || []).some((tp) => tp.toLowerCase().trim() === k);
                  }).length
                : 0
            }
            onSearchChange={setSearchTerm}
            onTopicChange={setSelectedTopic}
            onCityChange={setSelectedCity}
            onLevelChange={setSelectedLevel}
            onOnlyActiveChange={setOnlyActive}
            onSortChange={setSortMode}
            onViewModeChange={setViewMode}
            onClearFilters={clearFilters}
          />

          <FacilitadorPoolGrid
            facilitadores={poolData}
            loading={poolLoading}
            error={poolError}
            searchTerm={searchTerm}
            selectedTopic={selectedTopic}
            selectedCity={selectedCity}
            selectedLevel={selectedLevel}
            onlyActive={onlyActive}
            sortMode={sortMode}
            viewMode={viewMode}
            onAssignOsi={handleAssignOsi}
            onViewProfile={handleViewProfile}
            onEdit={handleEditPool}
            onToggleStatus={handleToggleStatusPool}
            onShowHistory={handleShowHistoryPool}
          />
        </>
      )}

      {/* TABLE LAYOUT (legacy) */}
      {layoutMode === "table" && (
        <>
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

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Nombre</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cédula</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
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
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${facilitador.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {facilitador.is_active ? "Activo" : "Inactivo"}
                          </span>
                          {facilitador.tiene_curriculum && (
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">CV</span>
                          )}
                          {facilitador.tiene_certificaciones && (
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Cert</span>
                          )}
                          {facilitador.tiene_foto_perfil && (
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Foto</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{facilitador.email}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{renderStars(ratings[facilitador.id])}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{facilitador.cedula}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{facilitador.telefono}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{getStateName(facilitador.id_estado_geografico)}</td>
                    <td className="px-3 py-4 text-sm font-medium">
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
                          onClick={() => setHistoryFacilitador(facilitador)}
                          className="text-white p-2 rounded-md hover:opacity-90 transition-colors shadow-sm"
                          style={{ backgroundColor: "var(--primary-blue)" }}
                          title="Ver historial de cursos"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatusLegacy(facilitador)}
                          className="text-white p-2 rounded-md hover:opacity-90 transition-colors shadow-sm"
                          style={{ backgroundColor: facilitador.is_active ? "var(--primary-red)" : "var(--primary-blue)" }}
                          title={facilitador.is_active ? "Inhabilitar" : "Habilitar"}
                        >
                          {facilitador.is_active ? <Minus className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredFacilitadores.length === 0 && (
              <div className="text-center py-8 text-gray-500">No se encontraron facilitadores</div>
            )}
          </div>
        </>
      )}

      {/* Profile Drawer */}
      <FacilitadorProfileDrawer
        facilitador={profileFacilitador}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setProfileFacilitador(null);
        }}
        onAssignOsi={(f) => {
          setDrawerOpen(false);
          setProfileFacilitador(null);
          setAssignOsiFacilitador(f);
        }}
        onEdit={(f) => {
          handleEditPool(f);
        }}
      />

      {/* Assign OSI Modal */}
      {assignOsiFacilitador && (
        <AssignOSIModal
          facilitadorId={assignOsiFacilitador.id}
          facilitadorName={toTitleCase(assignOsiFacilitador.nombre_apellido || "")}
          onClose={() => setAssignOsiFacilitador(null)}
        />
      )}

      {/* History Modal (legacy table) */}
      {historyFacilitador && (
        <FacilitadorHistoryModal
          facilitadorId={historyFacilitador.id}
          facilitadorName={toTitleCase(historyFacilitador.nombre_apellido || "")}
          onClose={() => setHistoryFacilitador(null)}
        />
      )}

      {/* History Modal (pool) */}
      {historyPoolFacilitador && (
        <FacilitadorHistoryModal
          facilitadorId={historyPoolFacilitador.id}
          facilitadorName={toTitleCase(historyPoolFacilitador.nombre_apellido || "")}
          onClose={() => setHistoryPoolFacilitador(null)}
        />
      )}
    </div>
  );
};
