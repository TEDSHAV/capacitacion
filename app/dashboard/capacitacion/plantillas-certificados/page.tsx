'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CapacitacionClientProps, PlantillaCertificado } from '@/types'

export default function PlantillasCertificadosPage({ user }: CapacitacionClientProps) {
  const [plantillas, setPlantillas] = useState<PlantillaCertificado[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    archivo: null as File | null
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadPlantillas()
  }, [])

  const loadPlantillas = async () => {
    try {
      console.log('Loading plantillas...')
      const { data, error } = await supabase
        .from('plantillas_certificados')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      console.log('Load response:', { data, error })

      if (error) {
        console.error('Supabase load error:', error)
        throw new Error(error.message || 'Error al cargar las plantillas')
      }

      setPlantillas(data || [])
    } catch (error) {
      console.error('Error loading plantillas:', error)
      alert(`Error al cargar las plantillas: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre.trim()) {
      alert('El nombre de la plantilla es requerido')
      return
    }

    if (!formData.archivo) {
      alert('Debe seleccionar un archivo')
      return
    }

    setIsSubmitting(true)

    try {
      console.log('Submitting plantilla:', {
        nombre: formData.nombre.trim(),
        archivo: formData.archivo.name
      })

      const { data, error } = await supabase
        .from('plantillas_certificados')
        .insert({
          nombre: formData.nombre.trim(),
          archivo: formData.archivo.name,
          is_active: true
        })
        .select()
        .single()

      console.log('Response:', { data, error })

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(error.message || 'Error al guardar en la base de datos')
      }

      if (!data) {
        throw new Error('No se recibió respuesta del servidor')
      }

      // Reset form and reload
      setFormData({ nombre: '', archivo: null })
      setShowForm(false)
      loadPlantillas()
      
      alert('Plantilla guardada exitosamente')
    } catch (error) {
      console.error('Error saving plantilla:', error)
      alert(`Error al guardar la plantilla: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar esta plantilla?')) return

    try {
      console.log('Deleting plantilla:', id)
      const { data, error } = await supabase
        .from('plantillas_certificados')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()

      console.log('Delete response:', { data, error })

      if (error) {
        console.error('Supabase delete error:', error)
        throw new Error(error.message || 'Error al eliminar la plantilla')
      }

      loadPlantillas()
      alert('Plantilla eliminada exitosamente')
    } catch (error) {
      console.error('Error deleting plantilla:', error)
      alert(`Error al eliminar la plantilla: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando plantillas...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Plantillas de Certificados</h1>
          <p className="mt-2 text-gray-600">
            Gestiona las plantillas para la generación de certificados
          </p>
        </div>

        {/* Add Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {showForm ? 'Cancelar' : 'Nueva Plantilla'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Nueva Plantilla de Certificado
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Plantilla *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Certificado de Capacitación Básico"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Archivo de Plantilla *
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => setFormData({ ...formData, archivo: e.target.files?.[0] || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Formatos aceptados: PDF, DOC, DOCX, PNG, JPG, JPEG
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Plantilla'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ nombre: '', archivo: null })
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Templates List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Plantillas Existentes ({plantillas.length})
            </h2>
          </div>
          
          {plantillas.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay plantillas registradas
              </h3>
              <p className="text-gray-500 mb-4">
                Comienza agregando tu primera plantilla de certificado
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Agregar Plantilla
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {plantillas.map((plantilla) => (
                <div key={plantilla.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {plantilla.nombre}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Archivo: {plantilla.archivo}
                    </p>
                    <p className="text-xs text-gray-400">
                      Creada: {new Date(plantilla.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Descargar
                    </button>
                    <button
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(plantilla.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
