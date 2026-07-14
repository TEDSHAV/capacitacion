"use client";

import { memo, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { CertificateFilters } from "@/types";
import { X, Search, ChevronDown, Check } from "lucide-react";

interface SearchableSelectProps {
  label: string;
  placeholder: string;
  options: { id: number; label: string }[];
  value?: number;
  onChange: (value?: number) => void;
}

const SearchableSelect = ({
  label,
  placeholder,
  options,
  value,
  onChange,
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.id === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter((opt) => opt.label.toLowerCase().includes(term));
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border rounded-md cursor-pointer flex items-center justify-between transition-colors ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-50"
            : "border-gray-300 hover:border-gray-400"
        } bg-white`}
      >
        <span
          className={`truncate ${!selectedOption ? "text-gray-400" : "text-gray-900"}`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
            <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-sm p-0 placeholder-gray-400 h-6"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-colors ${
                    value === option.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {value === option.id && (
                    <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  )}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No se encontraron resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface CertificateFiltersProps {
  filters: CertificateFilters;
  onFiltersChange: (filters: CertificateFilters) => void;
  companies: { id: number; razon_social: string }[];
  courses: { id: number; nombre: string }[];
  facilitators: { id: number; nombre_apellido: string }[];
  states: { id: number; nombre_estado: string }[];
  loading?: boolean;
}

function CertificateFiltersComponent({
  filters,
  onFiltersChange,
  companies,
  courses,
  facilitators,
  states,
  loading,
}: CertificateFiltersProps) {
  const [localFilters, setLocalFilters] = useState<CertificateFilters>(filters);
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || "");
  const localFiltersRef = useRef(localFilters);
  const onFiltersChangeRef = useRef(onFiltersChange);

  useEffect(() => {
    setLocalFilters(filters);
    setSearchTerm(filters.searchTerm || "");
  }, [filters]);

  useEffect(() => {
    localFiltersRef.current = localFilters;
  }, [localFilters]);

  useEffect(() => {
    onFiltersChangeRef.current = onFiltersChange;
  }, [onFiltersChange]);

  // Debounced search handler
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const newFilters = { ...localFiltersRef.current, searchTerm };
      setLocalFilters(newFilters);
      onFiltersChangeRef.current(newFilters);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleFilterChange = (key: keyof CertificateFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    const emptyFilters: CertificateFilters = {};
    setLocalFilters(emptyFilters);
    setSearchTerm("");
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(localFilters).some(
    (value) => value !== undefined && value !== "" && value !== null,
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Búsqueda
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Nombre, cédula, empresa..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Company */}
        <SearchableSelect
          label="Empresa"
          placeholder="Todas las empresas"
          options={companies.map((c) => ({ id: c.id, label: c.razon_social }))}
          value={localFilters.companyId}
          onChange={(val) => handleFilterChange("companyId", val)}
        />

        {/* Course */}
        <SearchableSelect
          label="Curso"
          placeholder="Todos los cursos"
          options={courses.map((c) => ({ id: c.id, label: c.nombre }))}
          value={localFilters.courseId}
          onChange={(val) => handleFilterChange("courseId", val)}
        />

        {/* Facilitator */}
        <SearchableSelect
          label="Facilitador"
          placeholder="Todos los facilitadores"
          options={facilitators.map((f) => ({
            id: f.id,
            label: f.nombre_apellido,
          }))}
          value={localFilters.facilitatorId}
          onChange={(val) => handleFilterChange("facilitatorId", val)}
        />

        {/* State */}
        <SearchableSelect
          label="Estado"
          placeholder="Todos los estados"
          options={states.map((s) => ({ id: s.id, label: s.nombre_estado }))}
          value={localFilters.stateId}
          onChange={(val) => handleFilterChange("stateId", val)}
        />

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado del carnet
          </label>
          <select
            value={
              localFilters.isActive !== undefined
                ? localFilters.isActive.toString()
                : ""
            }
            onChange={(e) =>
              handleFilterChange(
                "isActive",
                e.target.value === "" ? undefined : e.target.value === "true",
              )
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Desde
          </label>
          <input
            type="date"
            value={localFilters.dateFrom || ""}
            onChange={(e) =>
              handleFilterChange("dateFrom", e.target.value || undefined)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Hasta
          </label>
          <input
            type="date"
            value={localFilters.dateTo || ""}
            onChange={(e) =>
              handleFilterChange("dateTo", e.target.value || undefined)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}

export default memo(CertificateFiltersComponent);
