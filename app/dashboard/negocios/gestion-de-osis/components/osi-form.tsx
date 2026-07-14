'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Empresa, Servicio, Usuario, CatalogoServicio, Contacto, OSI } from '@/types'
import OSIActionButtons from './OSIActionButtons'

interface OSIFormProps {
  initialData?: OSI
  isNew: boolean
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onDelete: () => void
  empresas?: Empresa[]
  servicios?: Servicio[]
  usuarios?: Usuario[]
  filteredEmpresas?: Empresa[]
  catalogoServicios?: CatalogoServicio[]
  filteredCatalogoServicios?: CatalogoServicio[]
  empresaSearchTerm?: string
  temaSearchTerm?: string
  setEmpresaSearchTerm?: (term: string) => void
  setTemaSearchTerm?: (term: string) => void
  updateFormData?: (field: string, value: any) => void
}

const OSIForm = ({ 
  initialData, 
  isNew, 
  isEditing, 
  onEdit, 
  onCancel, 
  onSave, 
  onDelete,
  empresas,
  servicios,
  usuarios,
  filteredEmpresas,
  catalogoServicios,
  filteredCatalogoServicios,
  empresaSearchTerm,
  temaSearchTerm,
  setEmpresaSearchTerm,
  setTemaSearchTerm,
  updateFormData
}: OSIFormProps) => {
  const empresaInputRef = useRef<HTMLInputElement>(null)
  const temaInputRef = useRef<HTMLInputElement>(null)
  const [selectedEmpresaIndex, setSelectedEmpresaIndex] = useState(-1)
  const [selectedTemaIndex, setSelectedTemaIndex] = useState(-1)

  // Handle keyboard navigation for empresa search
  const handleEmpresaKeyDown = (e: React.KeyboardEvent) => {
    if (!filteredEmpresas || filteredEmpresas.length === 0) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedEmpresaIndex(prev => 
          prev < filteredEmpresas.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedEmpresaIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedEmpresaIndex >= 0 && filteredEmpresas[selectedEmpresaIndex]) {
          const empresa = filteredEmpresas[selectedEmpresaIndex]
          updateFormData?.('cliente_nombre_empresa', empresa.razon_social)
          updateFormData?.('codigo_cliente', empresa.codigo_cliente)
          updateFormData?.('rif', empresa.rif)
          updateFormData?.('direccion_fiscal', empresa.direccion_fiscal)
          setEmpresaSearchTerm?.('')
          setSelectedEmpresaIndex(-1)
        }
        break
      case 'Escape':
        e.preventDefault()
        setEmpresaSearchTerm?.('')
        setSelectedEmpresaIndex(-1)
        break
    }
  }

  // Handle keyboard navigation for tema search
  const handleTemaKeyDown = (e: React.KeyboardEvent) => {
    if (!filteredCatalogoServicios || filteredCatalogoServicios.length === 0) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedTemaIndex(prev => 
          prev < filteredCatalogoServicios.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedTemaIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedTemaIndex >= 0 && filteredCatalogoServicios[selectedTemaIndex]) {
          const servicio = filteredCatalogoServicios[selectedTemaIndex]
          updateFormData?.('tema', servicio.nombre)
          setTemaSearchTerm?.('')
          setSelectedTemaIndex(-1)
        }
        break
      case 'Escape':
        e.preventDefault()
        setTemaSearchTerm?.('')
        setSelectedTemaIndex(-1)
        break
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">Información del Cliente</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
          <div className="relative">
            <input
              ref={empresaInputRef}
              type="text"
              value={empresaSearchTerm || initialData?.cliente_nombre_empresa || ''}
              onChange={(e) => {
                setEmpresaSearchTerm?.(e.target.value)
                setSelectedEmpresaIndex(-1)
              }}
              onFocus={() => setEmpresaSearchTerm?.('')}
              onKeyDown={handleEmpresaKeyDown}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Buscar empresa..."
            />
            {empresaSearchTerm && filteredEmpresas && filteredEmpresas.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredEmpresas.map((empresa, index) => (
                  <div
                    key={empresa.id}
                    className={`px-3 py-2 cursor-pointer border-b border-gray-200 last:border-b-0 ${
                      index === selectedEmpresaIndex ? 'bg-gray-100' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      updateFormData?.('cliente_nombre_empresa', empresa.razon_social)
                      updateFormData?.('codigo_cliente', empresa.codigo_cliente)
                      updateFormData?.('rif', empresa.rif)
                      updateFormData?.('direccion_fiscal', empresa.direccion_fiscal)
                      setEmpresaSearchTerm?.('')
                      setSelectedEmpresaIndex(-1)
                    }}
                  >
                    <div className="font-medium">{empresa.razon_social}</div>
                    <div className="text-sm text-gray-500">{empresa.rif}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">RIF</label>
          <input
            type="text"
            value={initialData?.rif || ''}
            disabled
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            readOnly
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Código Cliente</label>
          <input
            type="text"
            value={initialData?.codigo_cliente || ''}
            disabled
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            readOnly
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Servicio</label>
          <select
            value={initialData?.tipo_servicio || ''}
            onChange={(e) => updateFormData?.('tipo_servicio', e.target.value)}
            disabled={!isEditing && !isNew}
            tabIndex={!isEditing && !isNew ? -1 : 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Seleccione un tipo</option>
            {servicios?.map((servicio) => (
              <option key={servicio.id} value={servicio.nombre}>
                {servicio.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tema</label>
          <div className="relative">
            <input
              ref={temaInputRef}
              type="text"
              value={temaSearchTerm || initialData?.tema || ''}
              onChange={(e) => {
                setTemaSearchTerm?.(e.target.value)
                setSelectedTemaIndex(-1)
              }}
              onFocus={() => setTemaSearchTerm?.('')}
              onKeyDown={handleTemaKeyDown}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Buscar tema..."
            />
            {temaSearchTerm && filteredCatalogoServicios && filteredCatalogoServicios.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredCatalogoServicios.map((servicio, index) => (
                  <div
                    key={servicio.id}
                    data-tema-option={index}
                    className={`px-3 py-2 cursor-pointer border-b border-gray-200 last:border-b-0 ${
                      index === selectedTemaIndex ? 'bg-gray-100' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      updateFormData?.('tema', servicio.nombre)
                      setTemaSearchTerm?.('')
                      setSelectedTemaIndex(-1)
                    }}
                  >
                    <div className="font-medium">{servicio.nombre}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dirección Fiscal</label>
          <textarea
            value={initialData?.direccion_fiscal || ''}
            disabled
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            rows={2}
            readOnly
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ejecutivo Negocios</label>
          <select
            value={initialData?.ejecutivo_negocios || ''}
            onChange={(e) => updateFormData?.('ejecutivo_negocios', e.target.value)}
            disabled={!isEditing && !isNew}
            tabIndex={!isEditing && !isNew ? -1 : 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Seleccione un ejecutivo</option>
            {usuarios?.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nombre_apellido}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export default OSIForm
