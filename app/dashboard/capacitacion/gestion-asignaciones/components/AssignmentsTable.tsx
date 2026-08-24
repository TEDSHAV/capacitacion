"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Trash2,
  AlertTriangle,
  Layers,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  unassignOSIToFacilitador,
  bulkUnassignAssignments,
} from "@/app/actions/osi-facilitador-assignments";
import { toTitleCase } from "@/utils/string-utils";

interface AssignmentRow {
  id: number;
  osi_id: number;
  facilitador_id: number;
  nro_sesion: number | null;
  source: string | null;
  is_active: boolean | null;
  assigned_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  facilitadores: {
    id: number;
    nombre_apellido: string | null;
    cedula: string | null;
    email: string | null;
    is_active: boolean | null;
  } | null;
  osi: {
    id_osi: number;
    nro_osi: string;
    nombre_empresa: string | null;
    servicio: string | null;
    fecha_fin_real: string | null;
    fecha_emision: string | null;
    id_estatus: number | null;
  } | null;
  days_since_end: number | null;
  is_stale: boolean;
}

interface AssignmentsTableProps {
  assignments: AssignmentRow[];
  isActiveView: boolean;
  staleDays: number;
  onStaleDaysChange: (n: number) => void;
  onRefresh: () => void;
}

const ITEMS_PER_PAGE = 25;

export default function AssignmentsTable({
  assignments,
  isActiveView,
  staleDays,
  onStaleDaysChange,
  onRefresh,
}: AssignmentsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyStale, setShowOnlyStale] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return assignments.filter((a) => {
      if (isActiveView && showOnlyStale && !a.is_stale) return false;
      if (!term) return true;
      const facilitador = a.facilitadores?.nombre_apellido?.toLowerCase() || "";
      const cedula = a.facilitadores?.cedula?.toLowerCase() || "";
      const nroOsi = a.osi?.nro_osi?.toLowerCase() || "";
      const empresa = a.osi?.nombre_empresa?.toLowerCase() || "";
      const servicio = a.osi?.servicio?.toLowerCase() || "";
      return (
        facilitador.includes(term) ||
        cedula.includes(term) ||
        nroOsi.includes(term) ||
        empresa.includes(term) ||
        servicio.includes(term)
      );
    });
  }, [assignments, searchTerm, showOnlyStale, isActiveView]);

  // Reset to first page when filters change
  const filterKey = `${searchTerm}|${showOnlyStale}|${isActiveView}|${assignments.length}`;
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

  // Selection only applies to the current page for predictability
  const pageIds = new Set(paginated.map((a) => a.id));
  const allOnPageSelected =
    pageIds.size > 0 && Array.from(pageIds).every((id) => selectedIds.has(id));

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  };

  const handleSingleUnassign = async (assignmentId: number) => {
    const row = assignments.find((a) => a.id === assignmentId);
    const osiLabel = row?.osi?.nro_osi || `OSI #${row?.osi_id}`;
    const facilitadorLabel = row?.facilitadores?.nombre_apellido
      ? toTitleCase(row.facilitadores.nombre_apellido)
      : "este facilitador";
    if (
      !confirm(
        `¿Desasignar la OSI ${osiLabel} de ${facilitadorLabel}?\n\nSe eliminarán los participantes y acknowledgments asociados a esta asignación. Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    const result = await unassignOSIToFacilitador(assignmentId);
    if (result.error) {
      setActionError(result.error);
    } else {
      setActionSuccess("Asignación eliminada exitosamente");
      setTimeout(() => setActionSuccess(null), 3000);
      onRefresh();
    }
    setActionLoading(false);
  };

  const handleBulkUnassign = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (
      !confirm(
        `¿Desasignar ${count} asignación(es) seleccionada(s)?\n\nSe eliminarán los participantes y acknowledgments asociados a cada una. Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    const result = await bulkUnassignAssignments(Array.from(selectedIds));
    if (result.failed.length > 0) {
      setActionError(
        `${result.failed.length} asignación(es) no pudieron ser eliminadas. Exitosas: ${result.success}.`,
      );
    } else {
      setActionSuccess(`${result.success} asignación(es) eliminada(s) exitosamente`);
      setTimeout(() => setActionSuccess(null), 3000);
    }
    setSelectedIds(new Set());
    onRefresh();
    setActionLoading(false);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("es-VE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <p className="text-sm text-gray-400 italic">
          {isActiveView
            ? "No hay asignaciones activas"
            : "No hay historial de asignaciones"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters bar — only on active view */}
      {isActiveView && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por facilitador, cédula, OSI, empresa o servicio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Días de gracia:
            <input
              type="number"
              min={1}
              max={365}
              value={staleDays}
              onChange={(e) => onStaleDaysChange(parseInt(e.target.value) || 30)}
              className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOnlyStale}
              onChange={(e) => setShowOnlyStale(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 accent-amber-600"
            />
            Solo obsoletas
          </label>
        </div>
      )}

      {/* Historical view: simple search */}
      {!isActiveView && (
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar en el historial..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
          {actionSuccess}
        </div>
      )}

      {/* Bulk action bar */}
      {isActiveView && selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
          <span className="text-sm text-gray-700 font-medium">
            {selectedIds.size} seleccionada(s)
          </span>
          <button
            onClick={handleBulkUnassign}
            disabled={actionLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Desasignar seleccionadas
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {isActiveView && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    className="h-4 w-4 rounded border-gray-300 text-gray-700 focus:ring-gray-400 accent-gray-700 cursor-pointer"
                    title="Seleccionar/deseleccionar página actual"
                  />
                </th>
              )}
              <Th>Facilitador</Th>
              <Th>OSI</Th>
              <Th>Sesión</Th>
              <Th>Asignado el</Th>
              {isActiveView ? (
                <Th>Días desde fin</Th>
              ) : (
                <Th>Desactivada el</Th>
              )}
              {isActiveView && <Th>Acciones</Th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {paginated.map((a) => {
              const isStale = a.is_stale;
              const isSelected = selectedIds.has(a.id);
              return (
                <tr
                  key={a.id}
                  className={isStale && isActiveView ? "bg-amber-50" : "hover:bg-gray-50"}
                >
                  {isActiveView && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(a.id)}
                        className="h-4 w-4 rounded border-gray-300 text-gray-700 focus:ring-gray-400 accent-gray-700 cursor-pointer"
                      />
                    </td>
                  )}
                  {/* Facilitador */}
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {a.facilitadores?.nombre_apellido
                        ? toTitleCase(a.facilitadores.nombre_apellido)
                        : "—"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {a.facilitadores?.cedula || ""}
                      {a.facilitadores?.is_active === false && (
                        <span className="ml-1 text-red-500">(inactivo)</span>
                      )}
                    </div>
                  </td>
                  {/* OSI */}
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {a.osi?.nro_osi || `OSI #${a.osi_id}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {a.osi?.nombre_empresa || "—"}
                      {a.osi?.servicio ? ` — ${a.osi.servicio}` : ""}
                    </div>
                  </td>
                  {/* Sesión */}
                  <td className="px-4 py-3">
                    {a.nro_sesion === null || a.nro_sesion === undefined ? (
                      <span className="text-xs text-gray-500">Todas</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                        <Layers className="w-3 h-3" />
                        Sesión {a.nro_sesion}
                      </span>
                    )}
                  </td>
                  {/* Asignado el */}
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(a.created_at)}
                  </td>
                  {/* Días desde fin / Desactivada el */}
                  {isActiveView ? (
                    <td className="px-4 py-3">
                      {a.days_since_end === null ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <span
                          className={`text-xs font-medium ${
                            isStale ? "text-amber-700" : "text-gray-600"
                          }`}
                        >
                          {a.days_since_end} día(s)
                          {isStale && (
                            <AlertTriangle className="inline-block w-3 h-3 ml-1 text-amber-600" />
                          )}
                        </span>
                      )}
                    </td>
                  ) : (
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(a.updated_at)}
                    </td>
                  )}
                  {/* Acciones */}
                  {isActiveView && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSingleUnassign(a.id)}
                          disabled={actionLoading}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Desasignar OSI"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <Link
                          href="/dashboard/capacitacion/gestion-osi"
                          className="text-gray-400 hover:text-gray-700 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                          title="Ver en Gestión OSIs"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  )}
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

      {filtered.length === 0 && searchTerm && (
        <p className="text-sm text-gray-400 italic text-center py-4">
          No se encontraron resultados para &quot;{searchTerm}&quot;
        </p>
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
