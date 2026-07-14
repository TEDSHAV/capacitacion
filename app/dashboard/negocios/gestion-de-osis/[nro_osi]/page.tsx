'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Empresa, Servicio, Usuario, CatalogoServicio, Contacto, OSI } from '@/types'
import OSIForm from '../components/osi-form'
import ServiceDetails from '../components/service-details'
import ExecutionDates from '../components/execution-dates'
import CostCalculation from '../components/cost-calculation'
import AdditionalInfo from '../components/additional-info'
import OSIActionButtons from '../components/OSIActionButtons'
import ErrorDialog, { useErrorDialog } from '@/components/ui/error-dialog'

const supabase = createClient()

export default function OSIDetailPage() {

  const router = useRouter()
  const params = useParams()
  
  const errorDialog = useErrorDialog()
  
  const [isLoading, setIsLoading] = useState(false)
  const [empresaSearchTerm, setEmpresaSearchTerm] = useState('')
  const [temaSearchTerm, setTemaSearchTerm] = useState('')
  
  // Simple state management - avoid complex hook dependencies
  const [osi, setOsi] = useState<OSI | null>(null)
  const [formData, setFormData] = useState<OSI>({
    id: 0,
    nro_osi: '',
    nro_orden_compra: null,
    tipo_servicio: null,
    nro_presupuesto: null,
    ejecutivo_negocios: null,
    cliente_nombre_empresa: null,
    rif: null,
    tema: null,
    fecha_emision: null,
    fecha_servicio: null,
    nro_sesiones: 1,
    fecha_ejecucion1: null,
    fecha_ejecucion2: null,
    fecha_ejecucion3: null,
    fecha_ejecucion4: null,
    fecha_ejecucion5: null,
    participantes_max: null,
    detalle_sesion: null,
    certificado_impreso: false,
    carnet_impreso: false,
    observaciones_adicionales: null,
    detalle_capacitacion: null,
    costo_honorarios: 0,
    nro_horas: null,
    costo_total: null,
    costo_impresion_material: null,
    costo_traslado: null,
    costo_logistica_comida: null,
    costo_otros: null,
    estado: 'pendiente',
    empresa_id: null,
    persona_contacto_id: null,
    direccion_fiscal: null,
    direccion_envio: null,
    contacto_id: null,
    codigo_cliente: null,
    direccion_ejecucion: null
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [catalogoServicios, setCatalogoServicios] = useState<CatalogoServicio[]>([])
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [filteredEmpresas, setFilteredEmpresas] = useState<Empresa[]>([])
  const [filteredCatalogoServicios, setFilteredCatalogoServicios] = useState<CatalogoServicio[]>([])

  // Data loading functions
  const loadServicios = async () => {
    try {
      const { data, error } = await supabase
        .from("tipo_servicio")
        .select("id, nombre")
        .order("nombre")
      
      if (error) {
        console.error('Error loading servicios:', error)
        errorDialog.showError(
          'Error al cargar los tipos de servicio',
          JSON.stringify(error, null, 2),
          'Error de Carga'
        )
        return
      }
      console.log('Servicios loaded:', data?.length || 0)
      setServicios(data || [])
    } catch (err) {
      console.error('Error in loadServicios:', err)
      errorDialog.showError(
        'Error inesperado al cargar los tipos de servicio',
        err instanceof Error ? err.stack : String(err),
        'Error de Carga'
      )
    }
  }

  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
        .order("razon_social")
      
      if (error) {
        console.error('Error loading empresas:', error)
        errorDialog.showError(
          'Error al cargar las empresas',
          JSON.stringify(error, null, 2),
          'Error de Carga'
        )
        return
      }
      console.log('Empresas loaded:', data?.length || 0)
      setEmpresas(data || [])
    } catch (err) {
      console.error('Error in loadEmpresas:', err)
      errorDialog.showError(
        'Error inesperado al cargar las empresas',
        err instanceof Error ? err.stack : String(err),
        'Error de Carga'
      )
    }
  }

  const loadUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombre_apellido")
        .eq("departamento", 2)  // negocios department ID is 2
        .in("rol", [10, 2])  // rol ID is 10 or 2
        .order("nombre_apellido")
      
      if (error) {
        console.error('Error loading usuarios:', error)
        errorDialog.showError(
          'Error al cargar los ejecutivos de negocio',
          JSON.stringify(error, null, 2),
          'Error de Carga'
        )
        return
      }
      console.log('Usuarios loaded:', data?.length || 0)
      setUsuarios(data || [])
    } catch (err) {
      console.error('Error in loadUsuarios:', err)
      errorDialog.showError(
        'Error inesperado al cargar los ejecutivos de negocio',
        err instanceof Error ? err.stack : String(err),
        'Error de Carga'
      )
    }
  }

  const loadCatalogoServicios = async (tipoServicio: string) => {
    if (!tipoServicio) {
      setCatalogoServicios([])
      return
    }

    try {
      // First, get ID of the selected tipo_servicio
      const selectedServicio = servicios.find(s => s.nombre === tipoServicio)
      
      if (!selectedServicio) {
        setCatalogoServicios([])
        setFilteredCatalogoServicios([])
        return
      }

      const { data, error } = await supabase
        .from("catalogo_servicios")
        .select("id, nombre")
        .eq("tipo_servicio", selectedServicio.id)
        .order("nombre")
      
      if (error) {
        console.error('Error loading catalogo_servicios:', error)
        errorDialog.showError(
          'Error al cargar el catálogo de servicios',
          JSON.stringify(error, null, 2),
          'Error de Carga'
        )
        return
      }
      console.log('Catalogo servicios loaded:', data?.length || 0, 'for tipo_servicio:', selectedServicio.id)
      setCatalogoServicios(data || [])
    } catch (err) {
      console.error('Error in loadCatalogoServicios:', err)
      errorDialog.showError(
        'Error inesperado al cargar el catálogo de servicios',
        err instanceof Error ? err.stack : String(err),
        'Error de Carga'
      )
    }
  }

  const loadContactos = async (empresaNombre: string) => {
    if (!empresaNombre) {
      setContactos([])
      return
    }

    try {
      // Find the selected empresa
      const selectedEmpresa = empresas.find(e => e.razon_social === empresaNombre)
      
      if (!selectedEmpresa) {
        setContactos([])
        return
      }

      const { data, error } = await supabase
        .from("contactos")
        .select("*")
        .eq("id_empresa", selectedEmpresa.id)
        .order("nombre")
      
      if (error) {
        console.error('Error loading contactos:', error)
        errorDialog.showError(
          'Error al cargar los contactos de la empresa',
          JSON.stringify(error, null, 2),
          'Error de Carga'
        )
        return
      }
      setContactos(data || [])
    } catch (err) {
      console.error('Error in loadContactos:', err)
      errorDialog.showError(
        'Error inesperado al cargar los contactos',
        err instanceof Error ? err.stack : String(err),
        'Error de Carga'
      )
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing in required fields
    if (error && field === 'tipo_servicio') {
      setError(null)
    }
  }

  const startEditing = () => {
    setIsEditing(true)
  }

  const cancelEditing = () => {
    if (!isNew) {
      setIsEditing(false)
      if (osi) {
        setFormData(osi)
      }
    }
  }

  const loadOSI = async (osiNumber: string) => {
    try {
      setLoading(true)
      
      // Load OSI data first
      const { data: osiData, error: osiError } = await supabase
        .from("osi")
        .select("*")
        .eq("nro_osi", osiNumber)
        .single()

      if (osiError) {
        console.error('Error loading OSI:', osiError)
        errorDialog.showError(
          'No se encontró la OSI solicitada',
          `Número de OSI: ${osiNumber}\nError: ${osiError.message}`,
          'OSI No Encontrada'
        )
        setError('OSI not found')
        return
      }

      if (!osiData) {
        errorDialog.showError(
          'No se encontró la OSI solicitada',
          `Número de OSI: ${osiNumber}`,
          'OSI No Encontrada'
        )
        setError('OSI not found')
        return
      }

      setOsi(osiData)
      setFormData(osiData)
    } catch (err) {
      console.error('Error in loadOSI:', err)
      errorDialog.showError(
        'Error inesperado al cargar la OSI',
        err instanceof Error ? err.stack : String(err),
        'Error de Carga'
      )
      setError('Failed to load OSI')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Validation for required fields
      // Note: nro_osi is no longer required as Supabase will auto-generate it
      if (!formData.tipo_servicio?.trim()) {
        errorDialog.showError(
          'El tipo de servicio es requerido',
          'Por favor, seleccione un tipo de servicio.',
          'Error de Validación'
        )
        setIsLoading(false)
        return
      }
      
      // Prepare data for Supabase
      const dataToSave = {
        nro_osi: formData.nro_osi?.trim() || '',
        nro_orden_compra: formData.nro_orden_compra?.trim() || null,
        tipo_servicio: formData.tipo_servicio?.trim() || '',
        nro_presupuesto: formData.nro_presupuesto?.trim() || null,
        empresa_id: (() => {
          const selectedEmpresa = empresas.find(e => e.razon_social === formData.cliente_nombre_empresa)
          return selectedEmpresa ? selectedEmpresa.id : null;
        })(),
        ejecutivo_negocios: Number(formData.ejecutivo_negocios) || null,
        cliente_nombre_empresa: formData.cliente_nombre_empresa?.trim() || '',
        tema: formData.tema?.trim() || null,
        fecha_emision: formData.fecha_emision ? new Date(formData.fecha_emision) : null,
        fecha_servicio: formData.fecha_servicio ? new Date(formData.fecha_servicio) : null,
        nro_sesiones: Number(formData.nro_sesiones) || 1,
        fecha_ejecucion1: formData.fecha_ejecucion1 ? new Date(formData.fecha_ejecucion1) : null,
        fecha_ejecucion2: formData.fecha_ejecucion2 ? new Date(formData.fecha_ejecucion2) : null,
        fecha_ejecucion3: formData.fecha_ejecucion3 ? new Date(formData.fecha_ejecucion3) : null,
        fecha_ejecucion4: formData.fecha_ejecucion4 ? new Date(formData.fecha_ejecucion4) : null,
        fecha_ejecucion5: formData.fecha_ejecucion5 ? new Date(formData.fecha_ejecucion5) : null,
        participantes_max: Number(formData.participantes_max) || null,
        certificado_impreso: Boolean(formData.certificado_impreso),
        carnet_impreso: Boolean(formData.carnet_impreso),
        observaciones_adicionales: formData.observaciones_adicionales?.trim() || '',
        detalle_capacitacion: formData.detalle_capacitacion?.trim() || null,
        costo_honorarios: Number(formData.costo_honorarios) || 0,
        nro_horas: Number(formData.nro_horas) || 0,
        costo_total: (
          (Number(formData.nro_horas) || 0) * (Number(formData.costo_honorarios) || 0) +
          (Number(formData.costo_impresion_material) || 0) +
          (Number(formData.costo_traslado) || 0) +
          (Number(formData.costo_logistica_comida) || 0) +
          (Number(formData.costo_otros) || 0)
        ),
        costo_impresion_material: Number(formData.costo_impresion_material) || null,
        costo_traslado: Number(formData.costo_traslado) || null,
        costo_logistica_comida: Number(formData.costo_logistica_comida) || null,
        costo_otros: Number(formData.costo_otros) || null,
        estado: formData.estado || 'pendiente',
        direccion_fiscal: (() => {
          const selectedEmpresa = empresas.find(e => e.razon_social === formData.cliente_nombre_empresa)
          return selectedEmpresa ? selectedEmpresa.direccion_fiscal : null;
        })(),
        direccion_envio: formData.direccion_ejecucion?.trim() || '',
        direccion_ejecucion: formData.direccion_ejecucion?.trim() || '',
        codigo_cliente: (() => {
          const selectedEmpresa = empresas.find(e => e.razon_social === formData.cliente_nombre_empresa)
          return selectedEmpresa ? Number(selectedEmpresa.codigo_cliente) : null;
        })(),
        persona_contacto_id: formData.persona_contacto_id ? Number(formData.persona_contacto_id) : null
      }
      
      console.log('Data to save:', dataToSave)
      console.log('Checking specific fields that might cause type errors:')
      console.log('empresa_id:', dataToSave.empresa_id, typeof dataToSave.empresa_id)
      console.log('ejecutivo_negocios:', dataToSave.ejecutivo_negocios, typeof dataToSave.ejecutivo_negocios)
      console.log('persona_contacto_id:', dataToSave.persona_contacto_id, typeof dataToSave.persona_contacto_id)
      console.log('nro_sesiones:', dataToSave.nro_sesiones, typeof dataToSave.nro_sesiones)
      console.log('participantes_max:', dataToSave.participantes_max, typeof dataToSave.participantes_max)
      console.log('codigo_cliente:', dataToSave.codigo_cliente, typeof dataToSave.codigo_cliente)
      
      if (isNew) {
        console.log('Attempting to insert new OSI...')
        console.log('Complete dataToSave object:', JSON.stringify(dataToSave, null, 2))
        console.log('DataToSave keys and types:', Object.entries(dataToSave).map(([key, value]) => `${key}: ${typeof value} = ${value}`))
        
        const { data, error } = await supabase.from("osi").insert([dataToSave]).select()
        console.log('Insert result:', { data, error })
        
        if (error) {
          console.error('=== INSERT ERROR DEBUGGING ===')
          console.error('Error object:', error)
          console.error('Error message:', error.message)
          console.error('Error details:', error.details)
          console.error('Error hint:', error.hint)
          console.error('Error code:', error.code)
          console.error('Full error structure:', JSON.stringify(error, null, 2))
          
          // Try to get more info about what went wrong
          if (error.message) {
            console.error('Error message type:', typeof error.message)
            console.error('Error message length:', error.message.length)
          }
          
          // Check if it's a validation error
          if (error.details) {
            console.error('Error details type:', typeof error.details)
            console.error('Error details:', JSON.stringify(error.details, null, 2))
          }
          
          console.log('Showing error dialog with:', error.message)
          errorDialog.showError(
            'Error al crear la OSI',
            `Error de base de datos: ${error.message}`,
            'Error al Guardar'
          )
          setIsLoading(false)
          return
        } else {
          console.log('Insert successful! Data:', data)
          errorDialog.showInfo('OSI creada exitosamente')
        }
      } else if (osi) {
        console.log('Attempting to update OSI:', osi.id)
        console.log('Complete dataToSave object for update:', JSON.stringify(dataToSave, null, 2))
        console.log('DataToSave keys and types for update:', Object.entries(dataToSave).map(([key, value]) => `${key}: ${typeof value} = ${value}`))
        
        const { data, error } = await supabase.from("osi").update(dataToSave).eq("id", osi.id).select()
        console.log('Update result:', { data, error })
        
        if (error) {
          console.error('=== UPDATE ERROR DEBUGGING ===')
          console.error('Error object:', error)
          console.error('Error message:', error.message)
          console.error('Error details:', error.details)
          console.error('Error hint:', error.hint)
          console.error('Error code:', error.code)
          console.error('Full error structure:', JSON.stringify(error, null, 2))
          
          // Try to get more info about what went wrong
          if (error.message) {
            console.error('Error message type:', typeof error.message)
            console.error('Error message length:', error.message.length)
          }
          
          // Check if it's a validation error
          if (error.details) {
            console.error('Error details type:', typeof error.details)
            console.error('Error details:', JSON.stringify(error.details, null, 2))
          }
          
          errorDialog.showError(
            'Error al actualizar la OSI',
            `Error de base de datos: ${error.message}`,
            'Error al Guardar'
          )
          setIsLoading(false)
          return
        } else {
          console.log('Update successful! Data:', data)
          errorDialog.showInfo('OSI actualizada exitosamente')
        }
      }
      
      // Only redirect if operation was successful
      if (!error) {
        setTimeout(() => {
          router.push('/dashboard/negocios/gestion-de-osis')
        }, 2000) // Give user time to see success message
      }
    } catch (error) {
      console.error('Unexpected error in handleSave:', error)
      errorDialog.showError(
        'Error inesperado al guardar la OSI',
        error instanceof Error ? error.stack : String(error),
        'Error Inesperado'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!osi || !confirm('¿Estás seguro de que quieres eliminar esta OSI?')) return
    
    try {
      const { error } = await supabase.from("osi").delete().eq("id", osi.id)
      if (error) {
        console.error('Error deleting OSI:', error)
        errorDialog.showError(
          'Error al eliminar la OSI',
          `Error de base de datos: ${error.message}`,
          'Error al Eliminar'
        )
        return
      }
      
      errorDialog.showInfo(
        'OSI eliminada exitosamente',
        `La OSI ${osi.nro_osi} ha sido eliminada correctamente.`,
        'Operación Exitosa'
      )
      
      setTimeout(() => {
        router.push('/dashboard/negocios/gestion-de-osis')
      }, 2000)
    } catch (error) {
      console.error('Unexpected error in handleDelete:', error)
      errorDialog.showError(
        'Error inesperado al eliminar la OSI',
        error instanceof Error ? error.stack : String(error),
        'Error Inesperado'
      )
    }
  }

  useEffect(() => {
    const nro_osi = params.nro_osi as string

    const loadInitialData = async () => {
      setLoading(true)
      setError(null)
      try {
        await Promise.all([
          loadEmpresas(),
          loadServicios(),
          loadUsuarios()
        ])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error loading initial data'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    if (nro_osi === 'new') {
      setIsNew(true)
      setIsEditing(false) // New OSIs should be in creation mode, not editing mode
      // Set default values for new OSI
      const defaultFormData = {
        id: 0,
        nro_osi: '',
        nro_orden_compra: '',
        tipo_servicio: '',
        nro_presupuesto: '',
        empresa_id: null,
        ejecutivo_negocios: null,
        cliente_nombre_empresa: '',
        rif: '',
        tema: '',
        fecha_emision: new Date(), // Default to today's date
        fecha_servicio: null,
        nro_sesiones: 1,
        fecha_ejecucion1: null,
        fecha_ejecucion2: null,
        fecha_ejecucion3: null,
        fecha_ejecucion4: null,
        fecha_ejecucion5: null,
        participantes_max: null,
        detalle_sesion: '',
        certificado_impreso: true, // Default to true
        carnet_impreso: false,
        observaciones_adicionales: '',
        detalle_capacitacion: '',
        costo_honorarios: 12, // Default hourly rate
        nro_horas: 6, // Default 6 hours
        costo_total: 72, // Default total (12 * 6)
        costo_impresion_material: 0, // Default printing cost
        costo_traslado: 0, // Default transport cost
        costo_logistica_comida: 0, // Default food logistics cost
        costo_otros: 0,
        estado: 'pendiente' as const,
        persona_contacto_id: null,
        direccion_fiscal: '',
        direccion_envio: '',
        direccion_ejecucion: '',
        codigo_cliente: '',
        contacto_id: null
      }
      setFormData(defaultFormData)
      // Load initial data for both new and existing OSIs to populate dropdowns
      loadInitialData()
    } else if (nro_osi) {
      loadInitialData() // Load initial data before loading OSI
      loadOSI(nro_osi)
    } else {
      const errorMessage = 'No OSI number provided'
      setError(errorMessage)
      setLoading(false)
    }
  }, [params.nro_osi])

  useEffect(() => {
    // Load catalogo_servicios when tipo_servicio changes
    if (formData.tipo_servicio) {
      loadCatalogoServicios(formData.tipo_servicio)
    } else {
      setCatalogoServicios([])
      setFilteredCatalogoServicios([])
    }
  }, [formData.tipo_servicio])

  useEffect(() => {
    // Load contactos when empresa changes
    if (formData.cliente_nombre_empresa) {
      loadContactos(formData.cliente_nombre_empresa)
    } else {
      setContactos([])
    }
  }, [formData.cliente_nombre_empresa])

  useEffect(() => {
    // Filter catalogo_servicios based on tema search term
    const filtered = catalogoServicios.filter(servicio =>
      servicio.nombre.toLowerCase().includes(temaSearchTerm.toLowerCase())
    )
    setFilteredCatalogoServicios(filtered)
  }, [temaSearchTerm, catalogoServicios])

  useEffect(() => {
    // Filter empresas based on search term
    const filtered = empresas.filter(empresa =>
      empresa.razon_social.toLowerCase().includes(empresaSearchTerm.toLowerCase())
    )
    setFilteredEmpresas(filtered)
  }, [empresaSearchTerm, empresas])

  useEffect(() => {
    // Handle Escape key to cancel editing
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              {isNew ? 'New OSI' : `OSI ${osi?.nro_osi || ''}`}
            </h1>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="px-6 py-4 bg-red-50 border-b border-red-200">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700 font-medium">{error}</span>
              </div>
            </div>
          )}
          
          <div className="p-6 space-y-6">
            <OSIForm
              initialData={formData}
              isNew={isNew}
              isEditing={isEditing}
              onEdit={startEditing}
              onCancel={cancelEditing}
              onSave={handleSave}
              onDelete={handleDelete}
              empresas={empresas}
              servicios={servicios}
              usuarios={usuarios}
              contactos={contactos}
              filteredEmpresas={filteredEmpresas}
              catalogoServicios={catalogoServicios}
              filteredCatalogoServicios={filteredCatalogoServicios}
              empresaSearchTerm={empresaSearchTerm}
              temaSearchTerm={temaSearchTerm}
              setEmpresaSearchTerm={setEmpresaSearchTerm}
              setTemaSearchTerm={setTemaSearchTerm}
              updateFormData={updateFormData}
            />
            <ServiceDetails
              formData={formData}
              isEditing={isEditing}
              isNew={isNew}
              updateFormData={updateFormData}
            />
            <ExecutionDates
              formData={formData}
              isEditing={isEditing}
              isNew={isNew}
              updateFormData={updateFormData}
            />
            <CostCalculation
              formData={formData}
              isEditing={isEditing}
              isNew={isNew}
              updateFormData={updateFormData}
            />
            <AdditionalInfo
              formData={formData}
              isEditing={isEditing}
              isNew={isNew}
              updateFormData={updateFormData}
            />
            <div className="border-t pt-6">
              <OSIActionButtons
                isNew={isNew}
                isEditing={isEditing}
                isLoading={isLoading}
                onSave={handleSave}
                onCancel={cancelEditing}
                onEdit={startEditing}
                onDelete={handleDelete}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Error Dialog */}
      <ErrorDialog
        isOpen={errorDialog.isOpen}
        title={errorDialog.title}
        message={errorDialog.message}
        details={errorDialog.details}
        onClose={errorDialog.close}
        variant={errorDialog.variant}
      />
    </div>
  )
}
