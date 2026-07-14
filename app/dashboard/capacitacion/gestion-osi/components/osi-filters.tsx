"use client";

import { useState } from "react";
import type { OSIFilters, OSIStatus } from "@/types";
import { Search, X, Filter, ChevronDown, ChevronUp } from "lucide-react";

interface OSIFiltersComponentProps {
  filters: OSIFilters;
  onFiltersChange: (filters: OSIFilters) => void;
  companies: { id_empresa: number; nombre_empresa: string }[];
  ejecutivos: string[];
  statuses: OSIStatus[];
  loading?: boolean;
}

export default function OSIFilters({
  filters,
  onFiltersChange,
  companies,
  ejecutivos,
  statuses,
  loading = false,
}: OSIFiltersComponentProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: keyof OSIFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== "",
  );

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7); // YYYY-MM format
      const label = date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
      });
      options.push({
        value,
        label: label.charAt(0).toUpperCase() + label.slice(1),
      });
    }
    return options;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filtros</h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Limpiar todos
            </button>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>

      {/* Filter Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Primary Filters - Always Visible */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por N° OSI..."
                value={filters.nroOsi || ""}
                onChange={(e) => handleFilterChange("nroOsi", e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            {/* Company */}
            <div>
              <select
                value={filters.companyName || ""}
                onChange={(e) =>
                  handleFilterChange("companyName", e.target.value || undefined)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">Todas las empresas</option>
                {companies.map(
                  (company: { id_empresa: number; nombre_empresa: string }) => (
                    <option
                      key={company.id_empresa}
                      value={company.nombre_empresa}
                    >
                      {company.nombre_empresa}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* Status */}
            <div>
              <select
                value={filters.status || ""}
                onChange={(e) =>
                  handleFilterChange("status", e.target.value || undefined)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">Todos los estados</option>
                {statuses.map((status: OSIStatus) => (
                  <option key={status.id} value={status.id.toString()}>
                    {status.nombre_estado}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Issued */}
            <div>
              <select
                value={filters.monthIssued || ""}
                onChange={(e) =>
                  handleFilterChange("monthIssued", e.target.value || undefined)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">Todos los meses</option>
                {getMonthOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            {showAdvanced ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Ocultar filtros avanzados
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Mostrar filtros avanzados
              </>
            )}
          </button>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              {/* Date Range - Service */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Fecha de Servicio
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filters.dateServiceFrom || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "dateServiceFrom",
                        e.target.value || undefined,
                      )
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                  <input
                    type="date"
                    value={filters.dateServiceTo || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "dateServiceTo",
                        e.target.value || undefined,
                      )
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Date Range - Issued */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Fecha de Emisión
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filters.dateIssuedFrom || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "dateIssuedFrom",
                        e.target.value || undefined,
                      )
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                  <input
                    type="date"
                    value={filters.dateIssuedTo || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "dateIssuedTo",
                        e.target.value || undefined,
                      )
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Ejecutivo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Ejecutivo
                </label>
                <select
                  value={filters.ejecutivo || ""}
                  onChange={(e) =>
                    handleFilterChange("ejecutivo", e.target.value || undefined)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">Todos los ejecutivos</option>
                  {ejecutivos.map((ejecutivo: string) => (
                    <option key={ejecutivo} value={ejecutivo}>
                      {ejecutivo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sesiones Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  N° Sesiones
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Mín"
                    value={filters.numSesionesMin || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "numSesionesMin",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                    min="0"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    placeholder="Máx"
                    value={filters.numSesionesMax || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "numSesionesMax",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                    min="0"
                  />
                </div>
              </div>

              {/* Hours Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  N° Horas
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Mín"
                    value={filters.numHoursMin || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "numHoursMin",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                    min="0"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    placeholder="Máx"
                    value={filters.numHoursMax || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "numHoursMax",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                    min="0"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Ubicación
                </label>
                <input
                  type="text"
                  placeholder="Buscar ubicación..."
                  value={filters.location || ""}
                  onChange={(e) =>
                    handleFilterChange("location", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
