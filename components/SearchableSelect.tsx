"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { SearchableSelectProps, FacilitatorOption } from "@/types";

export const SearchableSelect = ({
  value,
  onChange,
  options,
  placeholder = "Buscar...",
  loading = false,
  disabled = false,
  className = "",
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get the selected option display name
  const selectedOption = options.find(option => option.id === value);
  const displayValue = selectedOption ? selectedOption.nombre_apellido : "";

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.nombre_apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.direccion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.temas_cursos?.some(tema => tema.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
          const selected = filteredOptions[selectedIndex];
          onChange(selected.id);
          setSearchTerm("");
          setIsOpen(false);
          setSelectedIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        setSearchTerm("");
        break;
    }
  }, [isOpen, disabled, selectedIndex, filteredOptions, onChange]);

  // Handle click outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
      setSelectedIndex(-1);
      setSearchTerm("");
    }
  }, []);

  // Add/remove event listener
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      setSearchTerm("");
    }
  };

  const handleOptionClick = (option: FacilitatorOption) => {
    onChange(option.id);
    setSearchTerm("");
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? searchTerm : displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
      />
      
      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Cargando...
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No se encontraron resultados
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <div
                key={option.id}
                className={`px-3 py-2 cursor-pointer border-b border-gray-200 last:border-b-0 ${
                  index === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-100'
                }`}
                onClick={() => handleOptionClick(option)}
              >
                <div className="font-medium text-sm">{option.nombre_apellido}</div>
                {option.direccion && (
                  <div className="text-xs text-gray-500">
                    {option.direccion.split(',')[0]}
                  </div>
                )}
                {option.temas_cursos && option.temas_cursos.length > 0 && (
                  <div className="text-xs text-gray-400 mt-1">
                    {option.temas_cursos.slice(0, 2).join(', ')}
                    {option.temas_cursos.length > 2 && '...'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
