"use client";

import { useState, useEffect } from "react";
import { Empresa } from "./types";

interface EmpresaSearchProps {
  empresas: Empresa[];
  value: string;
  onChange: (empresaId: string, empresaData: Empresa) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function EmpresaSearch({ 
  empresas, 
  value, 
  onChange, 
  placeholder = "Buscar empresa...",
  disabled = false
}: EmpresaSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredEmpresas, setFilteredEmpresas] = useState<Empresa[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Find the selected empresa
  const selectedEmpresa = empresas.find(emp => emp.id === value);

  // Filter empresas based on search term
  useEffect(() => {
    const filtered = empresas.filter(empresa =>
      empresa.razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empresa.rif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empresa.codigo_cliente?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmpresas(filtered);
  }, [empresas, searchTerm]);

  // Update search term when selected empresa changes
  useEffect(() => {
    if (selectedEmpresa) {
      setSearchTerm(selectedEmpresa.razon_social || "");
    } else {
      setSearchTerm("");
    }
  }, [selectedEmpresa]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsDropdownOpen(true);
    
    // Clear selection if input is empty
    if (!value.trim()) {
      onChange("", {} as Empresa);
    }
  };

  const handleSelectEmpresa = (empresa: Empresa) => {
    onChange(empresa.id, empresa);
    setSearchTerm(empresa.razon_social);
    setIsDropdownOpen(false);
  };

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  const handleInputBlur = () => {
    // Delay closing to allow click on options
    setTimeout(() => setIsDropdownOpen(false), 300); // Increased delay
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      
      {isDropdownOpen && searchTerm && filteredEmpresas.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
             onMouseDown={(e) => e.preventDefault()}>
          {filteredEmpresas.map((empresa, index) => (
            <div
              key={empresa.id}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
              onClick={() => handleSelectEmpresa(empresa)}
            >
              <div className="font-medium text-gray-900">
                {empresa.razon_social || 'Sin nombre'}
              </div>
              <div className="text-xs text-gray-500">
                RIF: {empresa.rif || 'N/A'} • Código: {empresa.codigo_cliente || 'N/A'}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {isDropdownOpen && searchTerm && filteredEmpresas.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="px-3 py-2 text-gray-500 text-sm">
            No se encontraron empresas
          </div>
        </div>
      )}
    </div>
  );
}
