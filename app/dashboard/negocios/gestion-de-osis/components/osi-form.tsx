'use client'

import { useState, useCallback } from 'react'
import { Empresa, Usuario, Contacto, OSI } from '@/types'

interface OSIFormProps {
  initialData?: OSI
  isNew: boolean
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onDelete: () => void
  empresas?: Empresa[]
  usuarios?: Usuario[]
  contactos?: Contacto[]
  servicios?: any[]
  cursos?: any[]
  technicalServices?: any[]
  filteredEmpresas?: Empresa[]
  filteredCursos?: any[]
  empresaSearchTerm?: string
  cursoSearchTerm?: string
  setEmpresaSearchTerm?: (term: string) => void
  setCursoSearchTerm?: (term: string) => void
  updateFormData?: (field: string, value: any) => void
}

const OSIForm = ({ 
  initialData, 
  isNew, 
  isEditing,
  empresas,
  usuarios,
  contactos,
  servicios,
  cursos,
  technicalServices,
  filteredEmpresas,
  filteredCursos,
  empresaSearchTerm,
  cursoSearchTerm,
  setEmpresaSearchTerm,
  setCursoSearchTerm,
  updateFormData
}: OSIFormProps) => {
  const [selectedEmpresaIndex, setSelectedEmpresaIndex] = useState(-1)
  const [selectedTemaIndex, setSelectedTemaIndex] = useState(-1)
  const [isOsiFieldLocked, setIsOsiFieldLocked] = useState(true)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Validation function
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {}

    // Required fields validation
    if (!initialData?.cliente_nombre_empresa) {
      errors.cliente = 'Debe seleccionar un cliente'
    }
    
    if (!initialData?.tipo_servicio) {
      errors.tipo_servicio = 'Debe seleccionar un tipo de servicio'
    }
    
    if (initialData?.tipo_servicio === 'capacitacion' && !initialData?.id_curso) {
      errors.curso = 'Debe seleccionar un curso para el servicio de capacitación'
    }
    
    if (!initialData?.nro_osi && !isOsiFieldLocked) {
      errors.nro_osi = 'Debe ingresar el número de OSI'
    }
    
    if (!initialData?.estado) {
      errors.estado = 'Debe seleccionar un estado'
    }

    // Numeric validation
    if (initialData?.nro_horas && initialData.nro_horas <= 0) {
      errors.nro_horas = 'El número de horas debe ser mayor a 0'
    }
    
    if (initialData?.participantes_max && initialData.participantes_max <= 0) {
      errors.participantes_max = 'El número de participantes debe ser mayor a 0'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [initialData, isOsiFieldLocked])

  // Clear error when field is updated
  const clearFieldError = useCallback((field: string) => {
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }, [validationErrors])

  // Enhanced updateFormData with validation clearing
  const enhancedUpdateFormData = useCallback((field: string, value: any) => {
    updateFormData?.(field, value)
    clearFieldError(field)
  }, [updateFormData, clearFieldError])

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
    if (!filteredCursos || filteredCursos.length === 0) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedTemaIndex(prev => 
          prev < filteredCursos.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedTemaIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedTemaIndex >= 0 && filteredCursos[selectedTemaIndex]) {
          const curso = filteredCursos[selectedTemaIndex]
          updateFormData?.('detalle_capacitacion', curso.contenido)
          updateFormData?.('id_curso', curso.id) // Store the course ID
          // Auto-populate hours from course
          if (curso.horas_estimadas) {
            updateFormData?.('nro_horas', curso.horas_estimadas)
          }
          setCursoSearchTerm?.('')
          setSelectedTemaIndex(-1)
        }
        break
      case 'Escape':
        setSelectedTemaIndex(-1)
        break
    }
  }, [filteredCursos, selectedTemaIndex, updateFormData, setCursoSearchTerm])

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
    <div className="space-y-8">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              initialData?.cliente_nombre_empresa ? 'bg-green-500 text-white' : 'bg-indigo-500 text-white'
            }`}>
              {initialData?.cliente_nombre_empresa ? '✓' : '1'}
            </div>
            <span className="ml-2 text-sm font-medium text-gray-700">Cliente</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-300"></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              initialData?.tipo_servicio ? 'bg-green-500 text-white' : 'bg-indigo-500 text-white'
            }`}>
              {initialData?.tipo_servicio ? '✓' : '2'}
            </div>
            <span className="ml-2 text-sm font-medium text-gray-700">Servicio</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-300"></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              initialData?.nro_osi ? 'bg-green-500 text-white' : 'bg-indigo-500 text-white'
            }`}>
              {initialData?.nro_osi ? '✓' : '3'}
            </div>
            <span className="ml-2 text-sm font-medium text-gray-700">OSI</span>
          </div>
        </div>
      </div>

      {/* Step 1: Client Information */}
      <div className={`bg-white rounded-lg border-2 ${
        initialData?.cliente_nombre_empresa ? 'border-green-200 bg-green-50' : validationErrors.cliente ? 'border-red-200 bg-red-50' : 'border-gray-200'
      } p-6 transition-all duration-200`}>
        <div className="flex items-center mb-4">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
            initialData?.cliente_nombre_empresa ? 'bg-green-500 text-white' : validationErrors.cliente ? 'bg-red-500 text-white' : 'bg-indigo-500 text-white'
          }`}>
            {initialData?.cliente_nombre_empresa ? '✓' : validationErrors.cliente ? '!' : '1'}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Información del Cliente</h3>
          {initialData?.cliente_nombre_empresa && (
            <span className="ml-2 text-xs text-green-600 font-medium">Completado</span>
          )}
          {validationErrors.cliente && (
            <span className="ml-2 text-xs text-red-600 font-medium">{validationErrors.cliente}</span>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="text-red-500">*</span> Buscar Cliente
            </label>
            <div className="relative">
              <input
                type="text"
                value={empresaSearchTerm || ''}
                onChange={handleEmpresaSearchChange}
                onFocus={handleEmpresaFocus}
                onKeyDown={handleEmpresaKeyDown}
                disabled={!isEditing && !isNew}
                tabIndex={!isEditing && !isNew ? -1 : 0}
                className={`w-full px-4 py-3 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                  !isEditing && !isNew ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 
                  validationErrors.cliente ? 'border-red-300 bg-red-50' :
                  initialData?.cliente_nombre_empresa ? 'border-green-300 bg-green-50' : 'border-gray-300'
                }`}
                placeholder="🔍 Buscar por nombre de empresa, RIF o código..."
              />
              {empresaSearchTerm && filteredEmpresas && filteredEmpresas.length > 0 && (
                <div className="absolute z-20 w-full mt-2 bg-white border-2 border-indigo-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filteredEmpresas.map((empresa, index) => (
                    <div
                      key={empresa.id}
                      className={`px-4 py-3 cursor-pointer hover:bg-indigo-50 border-b border-gray-100 transition-colors ${
                        index === selectedEmpresaIndex ? 'bg-indigo-100' : ''
                      }`}
                      onClick={() => {
                        enhancedUpdateFormData('cliente_nombre_empresa', empresa.razon_social)
                        enhancedUpdateFormData('codigo_cliente', empresa.codigo_cliente)
                        enhancedUpdateFormData('rif', empresa.rif)
                        enhancedUpdateFormData('direccion_fiscal', empresa.direccion_fiscal)
                        enhancedUpdateFormData('direccion_envio', empresa.direccion_fiscal)
                        enhancedUpdateFormData('direccion_ejecucion', empresa.direccion_fiscal)
                        enhancedUpdateFormData('empresa_id', empresa.id)
                        setEmpresaSearchTerm?.('')
                        setSelectedEmpresaIndex(-1)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">{empresa.razon_social}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            📋 {empresa.rif} • 🏷️ {empresa.codigo_cliente}
                          </div>
                        </div>
                        <div className="text-indigo-500">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Auto-populated Client Details */}
          {initialData?.cliente_nombre_empresa && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Código Cliente</label>
                <div className="px-3 py-2 bg-white border border-gray-200 rounded text-sm">
                  {initialData.codigo_cliente || '-'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">RIF</label>
                <div className="px-3 py-2 bg-white border border-gray-200 rounded text-sm">
                  {initialData.rif || '-'}
                </div>
              </div>
            </div>
          )}

          {/* Contact Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Persona de Contacto</label>
            <select
              value={initialData?.persona_contacto_id || ''}
              onChange={(e) => {
                enhancedUpdateFormData('persona_contacto_id', e.target.value)
                // Auto-populate contact data
                const selectedContacto = contactos?.find(c => c.id === parseInt(e.target.value))
                if (selectedContacto) {
                  enhancedUpdateFormData('contacto_nombre', selectedContacto.nombre)
                  enhancedUpdateFormData('contacto_email', selectedContacto.email)
                  enhancedUpdateFormData('contacto_telefono', selectedContacto.telefono)
                }
              }}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-4 py-3 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Seleccione un contacto</option>
              {contactos?.map((contacto) => (
                <option key={contacto.id} value={contacto.id}>
                  {contacto.nombre} {contacto.email ? `(${contacto.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Contact Information Display */}
          {initialData?.persona_contacto_id && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Información de Contacto Seleccionado</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <div className="px-3 py-2 bg-white border border-gray-200 rounded text-sm">
                    {initialData?.contacto_email || contactos?.find(c => c.id === initialData.persona_contacto_id)?.email || '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono</label>
                  <div className="px-3 py-2 bg-white border border-gray-200 rounded text-sm">
                    {initialData?.contacto_telefono || contactos?.find(c => c.id === initialData.persona_contacto_id)?.telefono || '-'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Service Configuration */}
      <div className={`bg-white rounded-lg border-2 ${
        (initialData?.tipo_servicio && initialData?.detalle_capacitacion) ? 'border-green-200 bg-green-50' : 
        validationErrors.tipo_servicio || validationErrors.curso ? 'border-red-200 bg-red-50' : 'border-gray-200'
      } p-6 transition-all duration-200`}>
        <div className="flex items-center mb-4">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
            (initialData?.tipo_servicio && initialData?.detalle_capacitacion) ? 'bg-green-500 text-white' : 
            validationErrors.tipo_servicio || validationErrors.curso ? 'bg-red-500 text-white' : 'bg-indigo-500 text-white'
          }`}>
            {(initialData?.tipo_servicio && initialData?.detalle_capacitacion) ? '✓' : 
            validationErrors.tipo_servicio || validationErrors.curso ? '!' : '2'}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Configuración del Servicio</h3>
          {(initialData?.tipo_servicio && initialData?.detalle_capacitacion) && (
            <span className="ml-2 text-xs text-green-600 font-medium">Completado</span>
          )}
          {(validationErrors.tipo_servicio || validationErrors.curso) && (
            <span className="ml-2 text-xs text-red-600 font-medium">
              {validationErrors.tipo_servicio || validationErrors.curso}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="text-red-500">*</span> Tipo de Servicio
            </label>
            <select
              value={initialData?.tipo_servicio || ''}
              onChange={(e) => {
                enhancedUpdateFormData('tipo_servicio', e.target.value)
                // Clear course selection when service type changes
                if (e.target.value !== 'capacitacion') {
                  enhancedUpdateFormData('detalle_capacitacion', null)
                  enhancedUpdateFormData('id_curso', null)
                }
              }}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className={`w-full px-4 py-3 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                !isEditing && !isNew ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 
                validationErrors.tipo_servicio ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Seleccione un tipo de servicio...</option>
              {servicios?.map((servicio) => (
                <option key={servicio.id} value={servicio.nombre}>
                  {servicio.nombre}
                </option>
              ))}
            </select>
            {validationErrors.tipo_servicio && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.tipo_servicio}</p>
            )}
          </div>

          {/* Service-specific fields */}
          {initialData?.tipo_servicio === 'capacitacion' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Curso
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={initialData?.detalle_capacitacion ? 
                    cursos?.find(c => c.id === initialData.id_curso)?.nombre || initialData.detalle_capacitacion 
                    : (cursoSearchTerm || '')
                  }
                  onChange={(e) => setCursoSearchTerm?.(e.target.value)}
                  onFocus={() => {
                    setCursoSearchTerm?.('')
                    setSelectedTemaIndex(-1)
                  }}
                  onKeyDown={handleTemaKeyDown}
                  disabled={!isEditing && !isNew}
                  tabIndex={!isEditing && !isNew ? -1 : 0}
                  className={`w-full px-4 py-3 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                    !isEditing && !isNew ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 
                    validationErrors.curso ? 'border-red-300 bg-red-50' :
                    initialData?.detalle_capacitacion ? 'border-green-300 bg-green-50' : 'border-gray-300'
                  }`}
                  placeholder="🎓 Buscar curso por nombre..."
                />
                {validationErrors.curso && (
                  <p className="mt-1 text-xs text-red-600">{validationErrors.curso}</p>
                )}
                {cursoSearchTerm && filteredCursos && filteredCursos.length > 0 && (
                  <div className="absolute z-20 w-full mt-2 bg-white border-2 border-indigo-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredCursos.map((curso, index) => (
                      <div
                        key={curso.id}
                        className={`px-4 py-3 cursor-pointer hover:bg-indigo-50 border-b border-gray-100 transition-colors ${
                          index === selectedTemaIndex ? 'bg-indigo-100' : ''
                        }`}
                        onClick={() => {
                          if (isEditing || isNew) {
                            enhancedUpdateFormData('detalle_capacitacion', curso.contenido)
                            enhancedUpdateFormData('id_curso', curso.id)
                            if (curso.horas_estimadas) {
                              enhancedUpdateFormData('nro_horas', curso.horas_estimadas)
                            }
                            setCursoSearchTerm?.('')
                            setSelectedTemaIndex(-1)
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{curso.nombre}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              📚 {curso.contenido?.substring(0, 50)}... • ⏰ {curso.horas_estimadas}h
                            </div>
                          </div>
                          <div className="text-indigo-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {(initialData?.tipo_servicio === 'Servicios Técnicos' || initialData?.tipo_servicio === 'servicios tecnicos') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Servicio Técnico
              </label>
              <input
                type="text"
                value={initialData?.detalle_capacitacion || ''}
                onChange={(e) => {
                  if (isEditing || isNew) {
                    enhancedUpdateFormData('detalle_capacitacion', e.target.value)
                  }
                }}
                disabled={!isEditing && !isNew}
                tabIndex={!isEditing && !isNew ? -1 : 0}
                className={`w-full px-4 py-3 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                  !isEditing && !isNew ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'border-gray-300'
                }`}
                placeholder="🔧 Describa el servicio técnico..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Step 3: OSI Identification */}
      <div className={`bg-white rounded-lg border-2 ${
        initialData?.nro_osi ? 'border-green-200 bg-green-50' : 'border-gray-200'
      } p-6 transition-all duration-200`}>
        <div className="flex items-center mb-4">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
            initialData?.nro_osi ? 'bg-green-500 text-white' : 'bg-indigo-500 text-white'
          }`}>
            {initialData?.nro_osi ? '✓' : '3'}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Identificación OSI</h3>
          {initialData?.nro_osi && (
            <span className="ml-2 text-xs text-green-600 font-medium">Completado</span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">N° OSI</label>
            <div className="relative">
              <input
                type="text"
                value={initialData?.nro_osi || ''}
                onChange={(e) => enhancedUpdateFormData('nro_osi', e.target.value)}
                disabled={isOsiFieldLocked || (!isEditing && !isNew)}
                tabIndex={isOsiFieldLocked || (!isEditing && !isNew) ? -1 : 0}
                className={`w-full px-4 py-3 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                  isOsiFieldLocked || (!isEditing && !isNew) 
                    ? 'bg-gray-100 cursor-not-allowed border-gray-300' 
                    : 'border-gray-300'
                }`}
                placeholder={isOsiFieldLocked ? "🔒 Generado automáticamente..." : "Número de OSI..."}
              />
              {isNew && (
                <button
                  type="button"
                  onClick={handleOsiFieldToggle}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
                  title={isOsiFieldLocked ? "Desbloquear para editar" : "Bloquear (generado automáticamente)"}
                >
                  {isOsiFieldLocked ? '🔒' : '🔓'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
        
      {/* Step 4: Service Execution Details */}
      <div className={`bg-white rounded-lg border-2 ${
        (initialData?.nro_horas || initialData?.participantes_max) ? 'border-green-200 bg-green-50' : 'border-gray-200'
      } p-6 transition-all duration-200`}>
        <div className="flex items-center mb-4">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
            (initialData?.nro_horas || initialData?.participantes_max) ? 'bg-green-500 text-white' : 'bg-indigo-500 text-white'
          }`}>
            {(initialData?.nro_horas || initialData?.participantes_max) ? '✓' : '4'}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Detalles de Ejecución</h3>
          {(initialData?.nro_horas || initialData?.participantes_max) && (
            <span className="ml-2 text-xs text-green-600 font-medium">Completado</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Número de Horas</label>
            <div className="relative">
              <input
                type="number"
                value={initialData?.nro_horas || ''}
                onChange={(e) => updateFormData?.('nro_horas', e.target.value ? parseFloat(e.target.value) : null)}
                disabled={!isEditing && !isNew}
                tabIndex={!isEditing && !isNew ? -1 : 0}
                className="w-full px-4 py-3 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder={initialData?.tipo_servicio === 'capacitacion' && initialData?.id_curso ? 
                  "Auto-llenado desde curso (puede editar)" : 
                  "⏰ Número de horas..."
                }
                min="0"
                step="0.5"
              />
              {initialData?.tipo_servicio === 'capacitacion' && initialData?.id_curso && (
                <div className="mt-1 text-xs text-gray-500">
                  Horas del curso: {cursos?.find(c => c.id === initialData.id_curso)?.horas_estimadas || 'N/A'}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Participantes Máximos</label>
            <input
              type="number"
              value={initialData?.participantes_max || ''}
              onChange={(e) => updateFormData?.('participantes_max', e.target.value ? parseInt(e.target.value) : null)}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-4 py-3 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="👥 Número máximo de participantes..."
              min="1"
            />
          </div>
        </div>
      </div>

      {/* Step 5: Important Dates */}
      <div className={`bg-white rounded-lg border-2 ${
        (initialData?.fecha_emision || initialData?.fecha_servicio) ? 'border-green-200 bg-green-50' : 'border-gray-200'
      } p-6 transition-all duration-200`}>
        <div className="flex items-center mb-4">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
            (initialData?.fecha_emision || initialData?.fecha_servicio) ? 'bg-green-500 text-white' : 'bg-indigo-500 text-white'
          }`}>
            {(initialData?.fecha_emision || initialData?.fecha_servicio) ? '✓' : '5'}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Fechas Importantes</h3>
          {(initialData?.fecha_emision || initialData?.fecha_servicio) && (
            <span className="ml-2 text-xs text-green-600 font-medium">Completado</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Emisión</label>
            <input
              type="date"
              value={initialData?.fecha_emision ? new Date(initialData.fecha_emision).toISOString().split('T')[0] : ''}
              onChange={(e) => updateFormData?.('fecha_emision', e.target.value ? new Date(e.target.value) : null)}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-4 py-3 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Servicio</label>
            <input
              type="date"
              value={initialData?.fecha_servicio ? new Date(initialData.fecha_servicio).toISOString().split('T')[0] : ''}
              onChange={(e) => updateFormData?.('fecha_servicio', e.target.value ? new Date(e.target.value) : null)}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-4 py-3 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Step 6: Status */}
      <div className={`bg-white rounded-lg border-2 ${
        initialData?.estado ? 'border-green-200 bg-green-50' : 'border-gray-200'
      } p-6 transition-all duration-200`}>
        <div className="flex items-center mb-4">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
            initialData?.estado ? 'bg-green-500 text-white' : 'bg-indigo-500 text-white'
          }`}>
            {initialData?.estado ? '✓' : '6'}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Estado de la OSI</h3>
          {initialData?.estado && (
            <span className="ml-2 text-xs text-green-600 font-medium">Completado</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
          <select
            value={initialData?.estado || ''}
            onChange={(e) => updateFormData?.('estado', e.target.value)}
            disabled={!isEditing && !isNew}
            tabIndex={!isEditing && !isNew ? -1 : 0}
            className="w-full px-4 py-3 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Seleccione un estado</option>
            <option value="pendiente">⏳ Pendiente</option>
            <option value="active">✅ Activo</option>
            <option value="activo">✅ Activo</option>
            <option value="inactive">❌ Inactivo</option>
            <option value="cerrado">🔒 Cerrado</option>
          </select>
        </div>
      </div>

      {/* Step 7: People Assignment */}
      <div className={`bg-white rounded-lg border-2 ${
        initialData?.ejecutivo_negocios ? 'border-green-200 bg-green-50' : 'border-gray-200'
      } p-6 transition-all duration-200`}>
        <div className="flex items-center mb-4">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
            initialData?.ejecutivo_negocios ? 'bg-green-500 text-white' : 'bg-indigo-500 text-white'
          }`}>
            {initialData?.ejecutivo_negocios ? '✓' : '7'}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Asignación de Personal</h3>
          {initialData?.ejecutivo_negocios && (
            <span className="ml-2 text-xs text-green-600 font-medium">Completado</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ejecutivo Negocios</label>
            <select
              value={initialData?.ejecutivo_negocios || ''}
              onChange={(e) => enhancedUpdateFormData('ejecutivo_negocios', e.target.value)}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-4 py-3 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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

      {/* Address Information */}
      {(initialData?.direccion_fiscal || initialData?.direccion_envio || initialData?.direccion_ejecucion) && (
        <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <div className="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-bold mr-3">
              📍
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Direcciones</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dirección Fiscal</label>
              <textarea
                value={initialData?.direccion_fiscal || ''}
                disabled
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                rows={2}
                placeholder="Dirección fiscal..."
              />
            </div>
              
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dirección de Envío</label>
              <textarea
                value={initialData?.direccion_envio || ''}
                onChange={(e) => updateFormData?.('direccion_envio', e.target.value)}
                disabled={!isEditing && !isNew}
                tabIndex={!isEditing && !isNew ? -1 : 0}
                className="w-full px-4 py-3 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={2}
                placeholder="📦 Dirección de envío..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dirección de Ejecución</label>
              <textarea
                value={initialData?.direccion_ejecucion || ''}
                onChange={(e) => updateFormData?.('direccion_ejecucion', e.target.value)}
                disabled={!isEditing && !isNew}
                tabIndex={!isEditing && !isNew ? -1 : 0}
                className="w-full px-4 py-3 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={2}
                placeholder="🎯 Dirección de ejecución..."
              />
            </div>
          </div>
        </div>
      )}

      {/* View Mode Helper */}
      {!isEditing && !isNew && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-lg mr-3">👁️</span>
            <div>
              <p className="text-sm font-medium text-amber-800">Modo de Visualización</p>
              <p className="text-xs text-amber-600 mt-1">Haga clic en "Editar" para modificar cualquier campo de esta OSI</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OSIForm
