"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Check, Search, Check as CheckIcon } from "lucide-react";

interface MultiSelectProps {
  options: { id: number; label: string }[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export const MultiSelect = ({
  options,
  selectedIds,
  onChange,
  placeholder = "Seleccionar...",
  disabled = false,
  isLoading = false,
}: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeSelected = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const selectedLabels = selectedIds.map(
    (id) => options.find((opt) => opt.id === id)?.label || `Sede #${id}`
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled && !isLoading) setIsOpen(!isOpen);
          }
        }}
        className={`w-full min-h-[36px] px-3 py-2 border border-gray-300 rounded-md flex items-center justify-between gap-2 bg-white hover:border-gray-400 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex flex-wrap gap-1.5 flex-1">
          {selectedIds.length === 0 ? (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          ) : (
            selectedLabels.map((label, index) => (
              <span
                key={selectedIds[index]}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-200"
              >
                {label}
                <button
                  type="button"
                  onClick={(e) => removeSelected(selectedIds[index], e)}
                  className="hover:bg-blue-200 rounded p-0.5 transition-colors"
                  title="Remover"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="hover:bg-gray-100 rounded p-1 transition-colors text-gray-400 hover:text-gray-600"
              title="Limpiar todo"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar sede..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Cargando...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No se encontraron sedes
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleOption(option.id)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <div className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                    selectedIds.includes(option.id)
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white border-gray-300"
                  }`}>
                    {selectedIds.includes(option.id) && (
                      <CheckIcon className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span>{option.label}</span>
                </button>
              ))
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="p-2 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                Limpiar selección ({selectedIds.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
