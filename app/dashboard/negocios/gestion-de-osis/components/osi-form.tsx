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
  filteredEmpresas?: Empresa[]
  cursos?: any[]
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
  filteredEmpresas,
  cursos,
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
    <>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dirección Fiscal</label>
          <textarea
            value={initialData?.direccion_fiscal || ''}
            disabled
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            rows={2}
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
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </>
  )
}

export default OSIForm
