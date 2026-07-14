"use client";

import { Search, X, Filter } from "lucide-react";
import { ClienteCertificateFilters, ClienteFilterOptions } from "@/types";
import DebouncedInput from "@/components/performance/debounced-input";

interface ClienteFiltersProps {
  filters: ClienteCertificateFilters;
  onChange: (filters: ClienteCertificateFilters) => void;
  onClear: () => void;
  options: ClienteFilterOptions;
  showSedeFilter?: boolean;
  showCiudadFilter?: boolean;
}

export function ClienteFilters({
  filters,
  onChange,
  onClear,
  options,
  showSedeFilter = false,
  showCiudadFilter = false,
}: ClienteFiltersProps) {
  const hasActiveFilters =
    !!filters.searchTerm ||
    !!filters.courseId ||
    !!filters.cityId ||
    !!filters.sedeId ||
    !!filters.dateFrom ||
    !!filters.dateTo;

  const updateFilter = (updates: Partial<ClienteCertificateFilters>) => {
    onChange({ ...filters, ...updates });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700">Filtros</h3>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="ml-auto bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            Limpiar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">
            Participante / Cédula
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 z-10" />
            <DebouncedInput
              value={filters.searchTerm || ""}
              onChange={(val) => updateFilter({ searchTerm: val || undefined })}
              placeholder="Buscar..."
              delay={400}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Course */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Curso</label>
          <select
            value={filters.courseId || ""}
            onChange={(e) =>
              updateFilter({
                courseId: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos los cursos</option>
            {options.courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* City */}
        {showCiudadFilter && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Ciudad</label>
          <select
            value={filters.cityId || ""}
            onChange={(e) =>
              updateFilter({
                cityId: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">Todas las ciudades</option>
            {options.cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.nombre_ciudad}
              </option>
            ))}
          </select>
        </div>
        )}

        {/* Sede */}
        {showSedeFilter && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Sede</label>
          <select
            value={filters.sedeId || ""}
            onChange={(e) =>
              updateFilter({
                sedeId: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">Todas las sedes</option>
            {options.sedes.map((sede) => (
              <option key={sede.id} value={sede.id}>
                {sede.nombre_sede}
              </option>
            ))}
          </select>
        </div>
        )}

        {/* Date Range */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">
            Fecha (desde / hasta)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) =>
                updateFilter({ dateFrom: e.target.value || undefined })
              }
              className="min-w-0 w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) =>
                updateFilter({ dateTo: e.target.value || undefined })
              }
              className="min-w-0 w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

    </div>
  );
}
