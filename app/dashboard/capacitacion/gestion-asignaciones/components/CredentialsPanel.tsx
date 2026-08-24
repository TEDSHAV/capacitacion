"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Key,
  Trash2,
  Edit,
  Power,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  deleteFacilitatorCredentials,
  toggleFacilitatorCredentialsActive,
} from "@/app/actions/facilitador-portal";
import { toTitleCase } from "@/utils/string-utils";
import { PortalCredentialsModal } from "../../gestion-de-facilitadores/components/portal-credentials-modal";

interface CredentialRow {
  id: number;
  facilitador_id: number;
  username: string;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  facilitadores: {
    id: number;
    nombre_apellido: string | null;
    cedula: string | null;
    email: string | null;
    is_active: boolean | null;
  } | null;
}

interface CredentialsPanelProps {
  credentials: CredentialRow[];
  onRefresh: () => void;
}

const ITEMS_PER_PAGE = 25;

export default function CredentialsPanel({
  credentials,
  onRefresh,
}: CredentialsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingFacilitador, setEditingFacilitador] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return credentials;
    return credentials.filter((c) => {
      const name = c.facilitadores?.nombre_apellido?.toLowerCase() || "";
      const cedula = c.facilitadores?.cedula?.toLowerCase() || "";
      const username = c.username?.toLowerCase() || "";
      return name.includes(term) || cedula.includes(term) || username.includes(term);
    });
  }, [credentials, searchTerm]);

  // Reset to first page when search changes
  const filterKey = `${searchTerm}|${credentials.length}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, filtered.length);
  const paginated = filtered.slice(startIdx, endIdx);

  const handleDelete = async (facilitadorId: number, name: string) => {
    if (
      !confirm(
        `¿Eliminar permanentemente las credenciales de ${name}?\n\nEsta acción no se puede deshacer. El facilitador perderá acceso al portal inmediatamente.`,
      )
    ) {
      return;
    }
    setActionLoadingId(facilitadorId);
    setError(null);
    setSuccess(null);
    const result = await deleteFacilitatorCredentials(facilitadorId);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Credenciales eliminadas exitosamente");
      setTimeout(() => setSuccess(null), 3000);
      onRefresh();
    }
    setActionLoadingId(null);
  };

  const handleToggle = async (
    facilitadorId: number,
    currentActive: boolean | null,
    name: string,
  ) => {
    const newActive = !currentActive;
    setActionLoadingId(facilitadorId);
    setError(null);
    setSuccess(null);
    const result = await toggleFacilitatorCredentialsActive(facilitadorId, newActive);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(`Credenciales ${newActive ? "activadas" : "desactivadas"} para ${name}`);
      setTimeout(() => setSuccess(null), 3000);
      onRefresh();
    }
    setActionLoadingId(null);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("es-VE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const displayName = (c: CredentialRow) =>
    c.facilitadores?.nombre_apellido
      ? toTitleCase(c.facilitadores.nombre_apellido)
      : "—";

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por facilitador, cédula o usuario..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {credentials.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <Key className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400 italic">
            Ningún facilitador tiene credenciales de portal configuradas
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Facilitador</Th>
                  <Th>Usuario</Th>
                  <Th>Estado</Th>
                  <Th>Creada el</Th>
                  <Th>Actualizada el</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginated.map((c) => {
                  const isActive = c.is_active === true;
                  const isLoading = actionLoadingId === c.facilitador_id;
                  const name = displayName(c);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{name}</div>
                        <div className="text-xs text-gray-500">
                          {c.facilitadores?.cedula || ""}
                          {c.facilitadores?.is_active === false && (
                            <span className="ml-1 text-red-500">(facilitador inactivo)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-gray-700">
                          {c.username}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" />
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            Inactiva
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(c.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(c.updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setEditingFacilitador({
                                id: c.facilitador_id,
                                name,
                              })
                            }
                            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                            title="Editar credenciales"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleToggle(c.facilitador_id, c.is_active, name)
                            }
                            disabled={isLoading}
                            className={`p-1.5 rounded-md transition-colors disabled:opacity-50 ${
                              isActive
                                ? "text-amber-500 hover:text-amber-700 hover:bg-amber-50"
                                : "text-green-500 hover:text-green-700 hover:bg-green-50"
                            }`}
                            title={isActive ? "Desactivar acceso" : "Activar acceso"}
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(c.facilitador_id, name)}
                            disabled={isLoading}
                            className="text-red-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Eliminar credenciales"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                Mostrando <span className="font-medium">{startIdx + 1}</span> a{" "}
                <span className="font-medium">{endIdx}</span> de{" "}
                <span className="font-medium">{filtered.length}</span> resultados
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1.5 text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1.5 text-sm font-medium">
                  Página {safePage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-1.5 text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {filtered.length === 0 && searchTerm && (
        <p className="text-sm text-gray-400 italic text-center py-4">
          No se encontraron credenciales para &quot;{searchTerm}&quot;
        </p>
      )}

      {/* Reused credentials modal */}
      {editingFacilitador && (
        <PortalCredentialsModal
          facilitadorId={editingFacilitador.id}
          facilitadorName={editingFacilitador.name}
          onClose={() => {
            setEditingFacilitador(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
      {children}
    </th>
  );
}
