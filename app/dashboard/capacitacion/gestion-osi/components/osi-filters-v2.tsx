"use client";

import { useState } from "react";
import type { OSIFilters, OSIStatus } from "@/types";
import { Search, X, Filter, ChevronDown, Calendar, Building2, User } from "lucide-react";

interface OSIFiltersV2Props {
  filters: OSIFilters;
  onFiltersChange: (filters: OSIFilters) => void;
  companies: { id_empresa: number; nombre_empresa: string }[];
  ejecutivos: string[];
  statuses: OSIStatus[];
  loading?: boolean;
}

export default function OSIFiltersV2({
  filters,
  onFiltersChange,
  companies,
  ejecutivos,
  statuses,
  loading = false,
}: OSIFiltersV2Props) {
  const [expanded, setExpanded] = useState(true);

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
    (value) => value !== undefined && value !== ""
  );

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
      });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filtros de Búsqueda</h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md"
            >
              <X className="w-3 h-3" />
              Limpiar
            </button>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ChevronDown
            className={`w-5 h-5 text-gray-500 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Filter Content */}
      {expanded && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search by OSI Number */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                N° OSI
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={filters.nroOsi || ""}
                  onChange={(e) => handleFilterChange("nroOsi", e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Company */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Empresa
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filters.companyName || ""}
                  onChange={(e) =>
                    handleFilterChange("companyName", e.target.value || undefined)
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  disabled={loading}
                >
                  <option value="">Todas</option>
                  {companies.map((company: { id_empresa: number; nombre_empresa: string }) => (
                    <option key={company.id_empresa} value={company.nombre_empresa}>
                      {company.nombre_empresa}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={filters.status || ""}
                onChange={(e) =>
                  handleFilterChange("status", e.target.value || undefined)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">Todos</option>
                {statuses.map((status: OSIStatus) => (
                  <option key={status.id} value={status.id.toString()}>
                    {status.nombre_estado}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Issued */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Mes de Emisión
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filters.monthIssued || ""}
                  onChange={(e) =>
                    handleFilterChange("monthIssued", e.target.value || undefined)
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  disabled={loading}
                >
                  <option value="">Todos</option>
                  {getMonthOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ejecutivo */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Ejecutivo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filters.ejecutivo || ""}
                  onChange={(e) =>
                    handleFilterChange("ejecutivo", e.target.value || undefined)
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  disabled={loading}
                >
                  <option value="">Todos</option>
                  {ejecutivos.map((ejecutivo: string) => (
                    <option key={ejecutivo} value={ejecutivo}>
                      {ejecutivo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Service From */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fecha Servicio Desde
              </label>
              <input
                type="date"
                value={filters.dateServiceFrom || ""}
                onChange={(e) =>
                  handleFilterChange("dateServiceFrom", e.target.value || undefined)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            {/* Date Service To */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fecha Servicio Hasta
              </label>
              <input
                type="date"
                value={filters.dateServiceTo || ""}
                onChange={(e) =>
                  handleFilterChange("dateServiceTo", e.target.value || undefined)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            {/* Clear button for mobile */}
            {hasActiveFilters && (
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Limpiar Filtros
                </button>
              </div>
            )}
          </div>

          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">Filtros activos:</span>
                {filters.nroOsi && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    OSI: {filters.nroOsi}
                  </span>
                )}
                {filters.companyName && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    {filters.companyName}
                  </span>
                )}
                {filters.status && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    {statuses.find((s) => s.id.toString() === filters.status)?.nombre_estado}
                  </span>
                )}
                {filters.monthIssued && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                    {getMonthOptions().find((m) => m.value === filters.monthIssued)?.label}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
