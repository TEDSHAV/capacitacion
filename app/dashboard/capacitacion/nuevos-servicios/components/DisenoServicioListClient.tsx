"use client";

import { useState, useMemo } from "react";
import { Search, X, Filter, ChevronDown } from "lucide-react";
import type { DisenoServicioListItem } from "@/types/diseno-servicio";
import DisenoServicioTable from "./DisenoServicioTable";

interface DisenoServicioFilters {
  search: string;
  solicitante: string;
  departamento: string;
  estatus: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: DisenoServicioFilters = {
  search: "",
  solicitante: "",
  departamento: "",
  estatus: "",
  dateFrom: "",
  dateTo: "",
};

export default function DisenoServicioListClient({
  records,
}: {
  records: DisenoServicioListItem[];
}) {
  const [filters, setFilters] = useState<DisenoServicioFilters>(EMPTY_FILTERS);
  const [expanded, setExpanded] = useState(true);

  // Derive dropdown options from the records themselves so we only show
  // solicitantes / departments / statuses that actually appear in the list.
  const solicitanteOptions = useMemo(
    () =>
      Array.from(
        new Set(records.map((r) => r.solicitante_nombre).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [records],
  );

  const departamentoOptions = useMemo(
    () =>
      Array.from(
        new Set(records.map((r) => r.solicitante_departamento).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [records],
  );

  const estatusOptions = useMemo(
    () =>
      Array.from(
        new Map(
          records.map((r) => [
            r.id_estatus,
            { id: r.id_estatus, nombre: r.estatus_nombre || "Desconocido" },
          ]),
        ).values(),
      ).sort((a, b) => a.id - b.id),
    [records],
  );

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !r.nombre_sugerido?.toLowerCase().includes(q) &&
          !r.tipo_servicio?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (filters.solicitante && r.solicitante_nombre !== filters.solicitante) {
        return false;
      }
      if (
        filters.departamento &&
        r.solicitante_departamento !== filters.departamento
      ) {
        return false;
      }
      if (filters.estatus && r.id_estatus !== parseInt(filters.estatus)) {
        return false;
      }
      if (filters.dateFrom && r.fecha_solicitud) {
        if (new Date(r.fecha_solicitud) < new Date(filters.dateFrom)) {
          return false;
        }
      }
      if (filters.dateTo && r.fecha_solicitud) {
        // Include the full "dateTo" day: compare against the next day at 00:00.
        const to = new Date(filters.dateTo);
        to.setDate(to.getDate() + 1);
        if (new Date(r.fecha_solicitud) >= to) {
          return false;
        }
      }
      // Records without a fecha are excluded when a date filter is active.
      if ((filters.dateFrom || filters.dateTo) && !r.fecha_solicitud) {
        return false;
      }
      return true;
    });
  }, [records, filters]);

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== "" && v !== undefined,
  );

  const handleFilterChange = (key: keyof DisenoServicioFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  return (
    <div>
      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <Filter className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-sm text-gray-900">Filtros</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md"
              >
                <X className="w-3 h-3" />
                Limpiar
              </button>
            )}
            <span className="text-xs text-gray-500">
              {filteredRecords.length} de {records.length}
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {expanded && (
          <div className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="relative md:col-span-2 lg:col-span-1">
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nombre o tipo..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  Solicitante
                </label>
                <select
                  value={filters.solicitante}
                  onChange={(e) => handleFilterChange("solicitante", e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="">Todos</option>
                  {solicitanteOptions.map((nombre) => (
                    <option key={nombre} value={nombre}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  Departamento
                </label>
                <select
                  value={filters.departamento}
                  onChange={(e) => handleFilterChange("departamento", e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="">Todos</option>
                  {departamentoOptions.map((nombre) => (
                    <option key={nombre} value={nombre}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  Estatus
                </label>
                <select
                  value={filters.estatus}
                  onChange={(e) => handleFilterChange("estatus", e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="">Todos</option>
                  {estatusOptions.map((status) => (
                    <option key={status.id} value={status.id.toString()}>
                      {status.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  F. Solicitud Desde
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  F. Solicitud Hasta
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <DisenoServicioTable records={filteredRecords} />
    </div>
  );
}
