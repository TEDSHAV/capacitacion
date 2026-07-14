'use client'

import { useState, useEffect } from 'react'
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
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">Información del Cliente</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
          <div className="relative">
            <input
              type="text"
              value={empresaSearchTerm || initialData?.cliente_nombre_empresa || ''}
              onChange={(e) => setEmpresaSearchTerm?.(e.target.value)}
              onFocus={() => setEmpresaSearchTerm?.('')}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Buscar empresa..."
            />
            {empresaSearchTerm && filteredEmpresas && filteredEmpresas.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredEmpresas.map((empresa) => (
                  <div
                    key={empresa.id}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                    onClick={() => {
                      updateFormData?.('cliente_nombre_empresa', empresa.razon_social)
                      updateFormData?.('codigo_cliente', empresa.codigo_cliente)
                      updateFormData?.('rif', empresa.rif)
                      updateFormData?.('direccion_fiscal', empresa.direccion_fiscal)
                      setEmpresaSearchTerm?.('')
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
              type="text"
              value={temaSearchTerm || initialData?.tema || ''}
              onChange={(e) => setTemaSearchTerm?.(e.target.value)}
              onFocus={() => setTemaSearchTerm?.('')}
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
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                    onClick={() => {
                      updateFormData?.('tema', servicio.nombre)
                      setTemaSearchTerm?.('')
                    }}
                  >
                    <div className="font-medium">{servicio.nombre}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nro Presupuesto</label>
          <input
            type="text"
            value={initialData?.nro_presupuesto || ''}
            onChange={(e) => updateFormData?.('nro_presupuesto', e.target.value)}
            disabled={!isEditing && !isNew}
            tabIndex={!isEditing && !isNew ? -1 : 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Número de presupuesto"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nro Orden Compra</label>
          <input
            type="text"
            value={initialData?.nro_orden_compra || ''}
            onChange={(e) => updateFormData?.('nro_orden_compra', e.target.value)}
            disabled={!isEditing && !isNew}
            tabIndex={!isEditing && !isNew ? -1 : 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Número de orden de compra"
          />
        </div>
      </div>
    </div>
  )
}

export default OSIForm
