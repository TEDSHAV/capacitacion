"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  const [expanded, setExpanded] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 640 : true
  );
  const [localNroOsi, setLocalNroOsi] = useState(filters.nroOsi || "");

  // Company searchable state
  const [localCompany, setLocalCompany] = useState(filters.companyName || "");
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [companySelectedIndex, setCompanySelectedIndex] = useState(0);
  const companyInputRef = useRef<HTMLInputElement>(null);
  const companyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalNroOsi(filters.nroOsi || "");
  }, [filters.nroOsi]);

  // Sync local company input when filter is cleared externally
  useEffect(() => {
    setLocalCompany(filters.companyName || "");
  }, [filters.companyName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if ((filters.nroOsi || "") !== localNroOsi) {
        onFiltersChange({
          ...filters,
          nroOsi: localNroOsi || undefined,
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localNroOsi]);

  // Debounced company filter — applies after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((filters.companyName || "") !== localCompany) {
        onFiltersChange({
          ...filters,
          companyName: localCompany || undefined,
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localCompany]);

  // Filtered company suggestions (case-insensitive, limited to 10)
  const filteredCompanies = useMemo(() => {
    const q = localCompany.toLowerCase().trim();
    if (!q) return companies.slice(0, 10);
    return companies
      .filter((c) => c.nombre_empresa.toLowerCase().includes(q))
      .slice(0, 10);
  }, [companies, localCompany]);

  // Close company dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        companyDropdownRef.current &&
        !companyDropdownRef.current.contains(e.target as Node)
      ) {
        setCompanyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCompanySelect = (name: string) => {
    setLocalCompany(name);
    setCompanyDropdownOpen(false);
    setCompanySelectedIndex(0);
    onFiltersChange({
      ...filters,
      companyName: name || undefined,
    });
  };

  const handleCompanyKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (filteredCompanies.length > 0) {
          setCompanyDropdownOpen(true);
          setCompanySelectedIndex((prev) => {
            const safePrev = Math.min(prev, filteredCompanies.length - 1);
            return safePrev < filteredCompanies.length - 1 ? safePrev + 1 : 0;
          });
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (filteredCompanies.length > 0) {
          setCompanyDropdownOpen(true);
          setCompanySelectedIndex((prev) => {
            const safePrev = Math.min(prev, filteredCompanies.length - 1);
            return safePrev > 0 ? safePrev - 1 : filteredCompanies.length - 1;
          });
        }
        break;
      case "Enter":
        if (companyDropdownOpen && filteredCompanies[companySelectedIndex]) {
          e.preventDefault();
          handleCompanySelect(filteredCompanies[companySelectedIndex].nombre_empresa);
        }
        break;
      case "Escape":
        e.preventDefault();
        setCompanyDropdownOpen(false);
        setCompanySelectedIndex(0);
        break;
      case "Tab":
        setCompanyDropdownOpen(false);
        break;
    }
  };

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
                  value={localNroOsi}
                  onChange={(e) => setLocalNroOsi(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Company — searchable combobox */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Empresa
              </label>
              <div className="relative" ref={companyDropdownRef}>
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                <input
                  ref={companyInputRef}
                  type="text"
                  placeholder="Buscar empresa..."
                  value={localCompany}
                  onChange={(e) => {
                    setLocalCompany(e.target.value);
                    setCompanyDropdownOpen(true);
                    setCompanySelectedIndex(0);
                  }}
                  onFocus={() => setCompanyDropdownOpen(true)}
                  onKeyDown={handleCompanyKeyDown}
                  className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  disabled={loading}
                  autoComplete="off"
                />
                {localCompany && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalCompany("");
                      setCompanyDropdownOpen(false);
                      onFiltersChange({ ...filters, companyName: undefined });
                    }}
                    className="absolute inset-y-0 right-0 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {companyDropdownOpen && filteredCompanies.length > 0 && (
                  <div className="absolute mt-1 w-full border border-gray-300 rounded-md shadow-lg bg-white max-h-60 overflow-y-auto z-50">
                    {filteredCompanies.map((company, index) => (
                      <div
                        key={company.id_empresa}
                        onClick={() => handleCompanySelect(company.nombre_empresa)}
                        className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 text-sm ${
                          index === companySelectedIndex
                            ? "bg-blue-50 text-blue-700"
                            : "hover:bg-gray-50 text-gray-900"
                        }`}
                      >
                        {company.nombre_empresa}
                      </div>
                    ))}
                  </div>
                )}
                {companyDropdownOpen && localCompany && filteredCompanies.length === 0 && (
                  <div className="absolute mt-1 w-full border border-gray-300 rounded-md shadow-lg bg-white z-50">
                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                      Sin coincidencias
                    </div>
                  </div>
                )}
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
