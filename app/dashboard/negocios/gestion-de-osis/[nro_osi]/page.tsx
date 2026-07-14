'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { OSI } from '@/types'
import { useOSIData } from '../components/osi-data-provider'
import { useOSI } from '../components/use-osi'
import OSIHeader from '../components/osi-header'
import OSIContent from '../components/osi-content'
import ErrorDialog from '@/components/ui/error-dialog'
import { getTechnicalServicesAction } from '../../../../actions/dropdown-data'

export default function OSIDetailPage({ params }: { params: Promise<{ nro_osi: string }> }) {
  const router = useRouter()
  const [resolvedParams, setResolvedParams] = useState<{ nro_osi: string } | null>(null)
  
  useEffect(() => {
    const resolveParams = async () => {
      const paramsData = await params
      setResolvedParams(paramsData)
    }
    resolveParams()
  }, [params])
  
  const nro_osi = resolvedParams?.nro_osi || ''

  // Data provider for all the lookup data
  const {
    loading,
    error,
    empresas,
    usuarios,
    cursos,
    contactos,
    servicios,
    filteredEmpresas,
    filteredCursos,
    setFilteredEmpresas,
    setFilteredCursos,
    loadInitialData,
    loadContactos
  } = useOSIData()

  // Technical services state
  const [technicalServices, setTechnicalServices] = useState<any[]>([])

  // OSI specific state and operations
  const {
    osi,
    formData,
    isLoading,
    isNew,
    isEditing,
    updateFormData,
    startEditing,
    cancelEditing,
    handleSave,
    handleDelete
  } = useOSI(empresas)

  // Search terms
  const [empresaSearchTerm, setEmpresaSearchTerm] = useState('')
  const [cursoSearchTerm, setCursoSearchTerm] = useState('')

  // Load technical services
  useEffect(() => {
    const loadTechnicalServices = async () => {
      try {
        const result = await getTechnicalServicesAction()
        if (result.data) {
          setTechnicalServices(result.data)
        }
      } catch (error) {
        console.error('Error loading technical services:', error)
      }
    }
    loadTechnicalServices()
  }, [])

  // Load initial data on mount
  useEffect(() => {
    loadInitialData({ includeCursos: true })
  }, [])

  // Filter empresas based on search term
  useEffect(() => {
    const filtered = empresas.filter((empresa: any) =>
      empresa.razon_social.toLowerCase().includes(empresaSearchTerm.toLowerCase())
    )
    setFilteredEmpresas(filtered)
  }, [empresaSearchTerm, empresas])

  // Filter cursos based on curso search term
  useEffect(() => {
    const filtered = cursos.filter((curso: any) =>
      curso.nombre.toLowerCase().includes(cursoSearchTerm.toLowerCase())
    )
    setFilteredCursos(filtered)
  }, [cursoSearchTerm, cursos])

  // Load contactos when empresa changes
  useEffect(() => {
    if (formData.cliente_nombre_empresa) {
      const selectedEmpresa = empresas.find((e: any) => e.razon_social === formData.cliente_nombre_empresa)
      if (selectedEmpresa) {
        loadContactos(selectedEmpresa.id)
      }
    }
  }, [formData.cliente_nombre_empresa, empresas])

  // Handle Escape key to cancel editing
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isEditing && !isNew) {
        cancelEditing()
      }
    }

    if (isEditing && !isNew) {
      document.addEventListener('keydown', handleEscapeKey)
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isEditing, isNew, osi])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando OSI...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg">
          <OSIHeader
            isNew={isNew}
            isEditing={isEditing}
            isLoading={isLoading}
            osiNumber={formData.nro_osi || ''}
            onSave={handleSave}
            onCancel={cancelEditing}
            onEdit={startEditing}
            onDelete={handleDelete}
          />
          
          <OSIContent
            formData={formData}
            isNew={isNew}
            isEditing={isEditing}
            empresas={empresas}
            usuarios={usuarios}
            contactos={contactos}
            servicios={servicios}
            cursos={cursos}
            technicalServices={technicalServices}
            filteredEmpresas={filteredEmpresas}
            filteredCursos={filteredCursos}
            empresaSearchTerm={empresaSearchTerm}
            cursoSearchTerm={cursoSearchTerm}
            updateFormData={updateFormData}
            onEdit={startEditing}
            onCancel={cancelEditing}
            onSave={handleSave}
            onDelete={handleDelete}
            setEmpresaSearchTerm={setEmpresaSearchTerm}
            setCursoSearchTerm={setCursoSearchTerm}
          />
        </div>
      </div>
      
      <ErrorDialog isOpen={false} message="" onClose={() => {}} />
    </div>
  )
}
