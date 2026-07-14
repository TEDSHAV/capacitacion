'use client'

import { useState, useEffect, useRef } from 'react'
import { OSI, OSISearchProps } from '@/types'

export default function OSISearch({ osis, selectedOSI, onSelect }: OSISearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredOSIs = osis.filter(osi => 
    osi.is_active !== false && (
      (osi.nro_osi && osi.nro_osi.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (osi.cliente_nombre_empresa && osi.cliente_nombre_empresa.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (osi.tema && osi.tema.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (osi.tipo_servicio && osi.tipo_servicio.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  )

  const handleSelect = (osi: OSI) => {
    onSelect(osi)
    setIsOpen(false)
    setSearchTerm('')
    setHighlightedIndex(-1)
  }

  const handleClear = () => {
    onSelect(null)
    setSearchTerm('')
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleInputBlur = () => {
    // Delay closing to allow click on dropdown items
    setTimeout(() => setIsOpen(false), 150)
  }

  const handleDropdownMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(prev => {
            const newIndex = prev + 1
            return newIndex >= filteredOSIs.length ? 0 : newIndex
          })
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(prev => {
            const newIndex = prev - 1
            return newIndex < 0 ? filteredOSIs.length - 1 : newIndex
          })
          break
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < filteredOSIs.length) {
            handleSelect(filteredOSIs[highlightedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setHighlightedIndex(-1)
          inputRef.current?.blur()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, highlightedIndex, filteredOSIs])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset highlighted index when search term changes
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [searchTerm])

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Seleccionar OSI
      </h2>
      
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          ref={inputRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={handleInputBlur}
          placeholder="Buscar por número de OSI, cliente, tema o servicio..."
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 w-8 flex items-center justify-center text-white hover:text-gray-200"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Selected OSI Display */}
      {selectedOSI && selectedOSI.nro_osi && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="font-medium text-blue-900">
                OSI: {selectedOSI.nro_osi}
              </div>
              <div className="text-sm text-blue-700 mt-1">
                Cliente: {selectedOSI.cliente_nombre_empresa || 'N/A'}
              </div>
              <div className="text-sm text-blue-700">
                Tema: {selectedOSI.tema || 'N/A - Sin tema especificado'}
              </div>
            </div>
            <button
              onClick={handleClear}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && !selectedOSI && (
        <div 
          ref={dropdownRef}
          className="absolute mt-2 w-full border border-gray-300 rounded-md shadow-lg bg-white max-h-60 overflow-y-auto z-50"
          onMouseDown={handleDropdownMouseDown}
        >
          {filteredOSIs.length === 0 ? (
            <div className="p-3 text-gray-500 text-center">
              No se encontraron OSIs que coincidan con la búsqueda
            </div>
          ) : (
            filteredOSIs.slice(0, 10).map((osi, index) => (
              <div
                key={osi.id}
                onClick={() => handleSelect(osi)}
                className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                  highlightedIndex === index ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-gray-900">
                  {osi.nro_osi}
                </div>
                <div className="text-sm text-gray-600">
                  {osi.cliente_nombre_empresa}
                </div>
                <div className="text-sm text-gray-500">
                  Tema: {osi.tema || 'Sin tema especificado'}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Instructions */}
      {!selectedOSI && (
        <div className="mt-3 text-sm text-gray-500">
          Haz clic en el campo de búsqueda y selecciona una OSI existente
        </div>
      )}
    </div>
  )
}
