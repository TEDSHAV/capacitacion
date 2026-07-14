'use client'

import { useState, useCallback } from 'react'
import { Empresa, Servicio, Usuario, CatalogoServicio, Contacto, OSI, OSIFormProps } from '@/types'

const OSIForm = ({ 
  initialData, 
  isNew, 
  isEditing, 
  onCancel, 
  onSave,
  empresas,
  servicios,
  usuarios,
  contactos,
  filteredEmpresas,
  catalogoServicios,
  filteredCatalogoServicios,
  empresaSearchTerm,
  temaSearchTerm,
  setEmpresaSearchTerm,
  setTemaSearchTerm,
  updateFormData
}: OSIFormProps) => {
  const [selectedEmpresaIndex, setSelectedEmpresaIndex] = useState(-1)
  const [selectedTemaIndex, setSelectedTemaIndex] = useState(-1)
  const [isOsiFieldLocked, setIsOsiFieldLocked] = useState(true)

  // Handle keyboard navigation for empresa search
  const handleEmpresaKeyDown = useCallback((e: React.KeyboardEvent) => {
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
          updateFormData?.('direccion_envio', empresa.direccion_fiscal)
          updateFormData?.('direccion_ejecucion', empresa.direccion_fiscal)
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
  }, [filteredEmpresas, selectedEmpresaIndex, updateFormData, setEmpresaSearchTerm])

  // Handle keyboard navigation for tema search
  const handleTemaKeyDown = useCallback((e: React.KeyboardEvent) => {
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
  }, [filteredCatalogoServicios, selectedTemaIndex, updateFormData, setTemaSearchTerm])

  // Handle OSI field lock toggle
  const handleOsiFieldToggle = useCallback(() => {
    setIsOsiFieldLocked(prev => !prev)
  }, [])

  // Handle empresa search input change
  const handleEmpresaSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmpresaSearchTerm?.(e.target.value)
    setSelectedEmpresaIndex(-1)
  }, [setEmpresaSearchTerm])

  // Handle empresa input focus
  const handleEmpresaFocus = useCallback(() => {
    setEmpresaSearchTerm?.('')
    setSelectedEmpresaIndex(-1)
  }, [setEmpresaSearchTerm])

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">Información del Cliente</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número de OSI
            {isNew && (
              <span className="ml-2 text-xs text-gray-500">
                (Generado automáticamente)
              </span>
            )}
          </label>
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={initialData?.nro_osi || ''}
                onChange={(e) => {
                  if (!isOsiFieldLocked) {
                    updateFormData?.('nro_osi', e.target.value)
                  }
                }}
                disabled={isOsiFieldLocked || (!isEditing && !isNew)}
                tabIndex={!isOsiFieldLocked && (isEditing || isNew) ? 0 : -1}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isOsiFieldLocked || (!isEditing && !isNew)
                    ? 'bg-gray-100 border-gray-300 cursor-not-allowed text-gray-500'
                    : 'border-gray-300 text-gray-900'
                }`}
                placeholder={isOsiFieldLocked ? 'Campo bloqueado' : 'Ingrese número de OSI...'}
              />
              {isOsiFieldLocked && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              )}
            </div>
            {(isEditing || isNew) && (
              <button
                type="button"
                onClick={handleOsiFieldToggle}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  isOsiFieldLocked
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                    : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                }`}
                title={isOsiFieldLocked ? 'Desbloquear para editar manualmente' : 'Bloquear para usar generación automática'}
              >
                {isOsiFieldLocked ? (
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    <span>Desbloquear</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Bloquear</span>
                  </div>
                )}
              </button>
            )}
          </div>
          {isOsiFieldLocked && (isEditing || isNew) && (
            <p className="mt-1 text-xs text-gray-500">
              El número de OSI será generado automáticamente por el sistema. Haz clic en "Desbloquear" para ingresar un valor manualmente.
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
          <div className="relative">
            <input
              type="text"
              value={empresaSearchTerm || initialData?.cliente_nombre_empresa || ''}
              onChange={handleEmpresaSearchChange}
              onFocus={handleEmpresaFocus}
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
                      updateFormData?.('direccion_envio', empresa.direccion_fiscal)
                      updateFormData?.('direccion_ejecucion', empresa.direccion_fiscal)
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
              type="text"
              value={temaSearchTerm || initialData?.tema || ''}
              onChange={(e) => {
                setTemaSearchTerm?.(e.target.value)
                setSelectedTemaIndex(-1)
                // Also update form data directly when typing
                updateFormData?.('tema', e.target.value)
              }}
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
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dirección de Envío</label>
          <textarea
            value={initialData?.direccion_envio || ''}
            onChange={(e) => updateFormData?.('direccion_envio', e.target.value)}
            disabled={!isEditing && !isNew}
            tabIndex={!isEditing && !isNew ? -1 : 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            rows={2}
            placeholder="Dirección de envío..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dirección de Ejecución</label>
          <textarea
            value={initialData?.direccion_ejecucion || ''}
            onChange={(e) => updateFormData?.('direccion_ejecucion', e.target.value)}
            disabled={!isEditing && !isNew}
            tabIndex={!isEditing && !isNew ? -1 : 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            rows={2}
            placeholder="Dirección de ejecución..."
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
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Persona de Contacto</label>
          <select
            value={initialData?.persona_contacto_id || ''}
            onChange={(e) => updateFormData?.('persona_contacto_id', e.target.value)}
            disabled={!isEditing && !isNew}
            tabIndex={!isEditing && !isNew ? -1 : 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Seleccione un contacto</option>
            {contactos?.map((contacto) => (
              <option key={contacto.id} value={contacto.id}>
                {contacto.nombre} {contacto.apellido}
              </option>
            ))}
          </select>
          
          {/* Display selected contact details */}
          {initialData?.persona_contacto_id && (() => {
            const selectedContacto = contactos?.find(c => c.id === Number(initialData.persona_contacto_id))
            if (!selectedContacto) return null
            
            return (
              <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  {/* Left side: Avatar and Name */}
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-base">
                          {selectedContacto.nombre?.[0]}{selectedContacto.apellido?.[0]}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">
                        {selectedContacto.nombre} {selectedContacto.apellido}
                      </h4>
                    </div>
                  </div>
                  
                  {/* Right side: Contact Information */}
                  <div className="flex items-center space-x-6">
                    {selectedContacto.telefono && (
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13 2.257a1 1 0 001.21.502l4.493 1.498a1 1 0 00.684-.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 8V5a2 2 0 012-2z" />
                        </svg>
                        <span className="font-medium">{selectedContacto.telefono}</span>
                      </div>
                    )}
                    {selectedContacto.email && (
                      <div className="flex items-center text-sm text-gray-600 max-w-xs">
                        <svg className="w-4 h-4 mr-1 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{selectedContacto.email}</span>
                      </div>
                    )}
                    {selectedContacto.email2 && (
                      <div className="flex items-center text-sm text-gray-600 max-w-xs">
                        <svg className="w-4 h-4 mr-1 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{selectedContacto.email2}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

export default OSIForm
