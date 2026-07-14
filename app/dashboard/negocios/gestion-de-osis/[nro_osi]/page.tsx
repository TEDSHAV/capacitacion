'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import OSIActionButtons from '../components/OSIActionButtons'

interface Empresa {
  id: string;
  razon_social: string;
  rif: string;
  direccion_fiscal: string;
  codigo_cliente: string;
}

interface Servicio {
  id: number;
  nombre: string;
}

interface Usuario {
  id: number;
  nombre_apellido: string;
}

interface CatalogoServicio {
  id: number;
  nombre: string;
}

interface Contacto {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  email2: string;
}

interface OSI {
  id: number
  nro_osi: string
  nro_orden_compra: string
  tipo_servicio: string
  nro_presupuesto: string
  ejecutivo_negocios: number
  cliente_nombre_empresa: string
  tema: string
  fecha_emision: Date | null
  fecha_servicio: Date | null
  participantes_max: number
  detalle_sesion: string
  certificado_impreso: boolean
  carnet_impreso: boolean
  observaciones_adicionales: string
  detalle_capacitacion: string
  costo_honorarios: number
  nro_horas: number
  costo_total: number
  costo_impresion_material: number
  costo_traslado: number
  costo_logistica_comida: number
  costo_otros: number
  estado: string
  codigo_cliente: string
  rif: string
  direccion_fiscal: string
  direccion_envio: string
  persona_contacto_id: number
  contacto_nombre: string
  contacto_apellido: string
  contacto_telefono: string
  contacto_email: string
  contacto_email2: string
  direccion_ejecucion: string
  nro_sesiones: number
  fecha_ejecucion1: string
  fecha_ejecucion2: string
  fecha_ejecucion3: string
  fecha_ejecucion4: string
  fecha_ejecucion5: string
}

export default function OSIDetailPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  
  const [osi, setOsi] = useState<OSI | null>(null)
  const [formData, setFormData] = useState<Partial<OSI>>({
    nro_osi: '',
    nro_orden_compra: '',
    tipo_servicio: '',
    nro_presupuesto: '',
    ejecutivo_negocios: 0,
    cliente_nombre_empresa: '',
    tema: '',
    fecha_emision: new Date(),
    fecha_servicio: null,
    nro_sesiones: 1,
    fecha_ejecucion1: '',
    fecha_ejecucion2: '',
    fecha_ejecucion3: '',
    fecha_ejecucion4: '',
    fecha_ejecucion5: '',
    participantes_max: 0,
    detalle_sesion: '',
    certificado_impreso: false,
    carnet_impreso: false,
    observaciones_adicionales: '',
    detalle_capacitacion: '',
    costo_honorarios: 12,
    nro_horas: 6,
    costo_total: 0,
    costo_impresion_material: 0,
    costo_traslado: 0,
    costo_logistica_comida: 0,
    costo_otros: 0,
    estado: 'pendiente',
    codigo_cliente: '',
    rif: '',
    direccion_fiscal: '',
    direccion_envio: '',
    persona_contacto_id: 0,
    contacto_nombre: '',
    contacto_apellido: '',
    contacto_telefono: '',
    contacto_email: '',
    contacto_email2: '',
    direccion_ejecucion: ''
  })

    const [isLoading, setIsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredEmpresas, setFilteredEmpresas] = useState<Empresa[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [catalogoServicios, setCatalogoServicios] = useState<CatalogoServicio[]>([])
  const [temaSearchTerm, setTemaSearchTerm] = useState('')
  const [filteredCatalogoServicios, setFilteredCatalogoServicios] = useState<CatalogoServicio[]>([])
  const [contactos, setContactos] = useState<Contacto[]>([])

  useEffect(() => {
    const nro_osi = params.nro_osi as string
    
    // Load empresas, servicios, and usuarios regardless of OSI state
    loadEmpresas()
    loadServicios()
    loadUsuarios()
    loadContactos()
    
    if (nro_osi === 'new') {
      setIsNew(true)
      setIsEditing(true) // New OSIs start in edit mode
      setLoading(false)
    } else if (nro_osi) {
      loadOSI(nro_osi)
    } else {
      setError('No OSI number provided')
      setLoading(false)
    }
  }, [params.nro_osi])

  useEffect(() => {
    // Filter empresas based on search term
    const filtered = empresas.filter(empresa =>
      empresa.razon_social.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredEmpresas(filtered)
  }, [searchTerm, empresas])

  useEffect(() => {
    // Load catalogo_servicios when tipo_servicio changes
    if (formData.tipo_servicio) {
      loadCatalogoServicios()
    } else {
      setCatalogoServicios([])
      setFilteredCatalogoServicios([])
    }
  }, [formData.tipo_servicio])

  useEffect(() => {
    // Load contactos when empresa changes
    if (formData.cliente_nombre_empresa) {
      loadContactos()
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

  const startEditing = () => {
    setIsEditing(true)
  }

  const cancelEditing = () => {
    if (!isNew) {
      setIsEditing(false)
      // Reset form data to original OSI data
      if (osi) {
        setFormData(osi)
      }
    }
  }

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

  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
        .order("razon_social")
      
      if (error) throw error
      setEmpresas(data || [])
    } catch (err) {
      console.error('Error loading empresas:', err)
    }
  }

  const loadServicios = async () => {
    try {
      const { data, error } = await supabase
        .from("tipo_servicio")
        .select("id, nombre")
        .order("nombre")
      
      if (error) throw error
      setServicios(data || [])
    } catch (err) {
      console.error('Error loading servicios:', err)
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
      
      if (error) throw error
      setUsuarios(data || [])
    } catch (err) {
      console.error('Error loading usuarios:', err)
    }
  }

  const loadCatalogoServicios = async () => {
    try {
      // First, get the ID of the selected tipo_servicio
      const selectedServicio = servicios.find(s => s.nombre === formData.tipo_servicio)
      
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
      
      if (error) throw error
      setCatalogoServicios(data || [])
      setFilteredCatalogoServicios(data || [])
    } catch (err) {
      console.error('Error loading catalogo_servicios:', err)
    }
  }

  const loadContactos = async () => {
    try {
      // Find the selected empresa
      const selectedEmpresa = empresas.find(e => e.razon_social === formData.cliente_nombre_empresa)
      
      if (!selectedEmpresa) {
        setContactos([])
        return
      }

      const { data, error } = await supabase
        .from("contactos")
        .select("*")
        .eq("id_empresa", selectedEmpresa.id)
        .order("nombre")
      
      if (error) throw error
      setContactos(data || [])
    } catch (err) {
      console.error('Error loading contactos:', err)
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
        setError('OSI not found')
        return
      }

      if (!osiData) {
        setError('OSI not found')
        return
      }

      // Load related empresa data if empresa_id exists
      let empresaData = null
      if (osiData.empresa_id) {
        const { data: empData, error: empError } = await supabase
          .from("empresas")
          .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
          .eq("id", osiData.empresa_id)
          .single()
        
        if (!empError && empData) {
          empresaData = empData
        }
      }

      // Load related contacto data if persona_contacto_id exists
      let contactoData = null
      if (osiData.persona_contacto_id) {
        const { data: contData, error: contError } = await supabase
          .from("contactos")
          .select("id, nombre, apellido, telefono, email, email2")
          .eq("id", osiData.persona_contacto_id)
          .single()
        
        if (!contError && contData) {
          contactoData = contData
        }
      }

      // Merge OSI data with related empresa and contacto data
      const mergedData = {
        ...osiData,
        // Populate empresa fields from related data
        codigo_cliente: empresaData?.codigo_cliente || '',
        rif: empresaData?.rif || '',
        direccion_fiscal: empresaData?.direccion_fiscal || '',
        direccion_envio: osiData.direccion_envio || '',
        // Populate contacto fields from related data
        contacto_nombre: contactoData?.nombre || '',
        contacto_apellido: contactoData?.apellido || '',
        contacto_telefono: contactoData?.telefono || '',
        contacto_email: contactoData?.email || '',
        contacto_email2: contactoData?.email2 || '',
        // Ensure costos fields are properly loaded
        costo_honorarios: osiData.costo_honorarios || 0,
        nro_horas: osiData.nro_horas || 0,
        costo_total: osiData.costo_total || 0,
        costo_impresion_material: osiData.costo_impresion_material || 0,
        costo_traslado: osiData.costo_traslado || 0,
        costo_logistica_comida: osiData.costo_logistica_comida || 0,
        costo_otros: osiData.costo_otros || 0,
        // Ensure other fields are loaded
        detalle_capacitacion: osiData.detalle_capacitacion || '',
        observaciones_adicionales: osiData.observaciones_adicionales || '',
        detalle_sesion: osiData.detalle_sesion || '',
        participantes_max: osiData.participantes_max || 0,
        certificado_impreso: osiData.certificado_impreso || false,
        carnet_impreso: osiData.carnet_impreso || false,
        // Date fields
        fecha_emision: osiData.fecha_emision ? new Date(osiData.fecha_emision) : null,
        fecha_servicio: osiData.fecha_servicio ? new Date(osiData.fecha_servicio) : null,
        fecha_ejecucion1: osiData.fecha_ejecucion1 || null,
        fecha_ejecucion2: osiData.fecha_ejecucion2 || null,
        fecha_ejecucion3: osiData.fecha_ejecucion3 || null,
        fecha_ejecucion4: osiData.fecha_ejecucion4 || null,
        fecha_ejecucion5: osiData.fecha_ejecucion5 || null,
        // Other fields
        nro_sesiones: osiData.nro_sesiones || 1,
        ejecutivo_negocios: osiData.ejecutivo_negocios || null,
        persona_contacto_id: osiData.persona_contacto_id || null,
        direccion_ejecucion: osiData.direccion_ejecucion || '',
      }
      
      setOsi(osiData)
      setFormData(mergedData)
    } catch (err) {
      console.error('Error loading OSI:', err)
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
      if (!formData.nro_osi?.trim()) {
        throw new Error('El número de OSI es requerido')
      }
      if (!formData.tipo_servicio?.trim()) {
        throw new Error('El tipo de servicio es requerido')
      }
      
      // Prepare data for Supabase - ensure all fields are properly typed and not undefined
      // Only include fields that exist in database schema
      const dataToSave = {
        nro_osi: formData.nro_osi?.trim() || '',
        nro_orden_compra: formData.nro_orden_compra?.trim() || null,
        tipo_servicio: formData.tipo_servicio?.trim() || '',
        nro_presupuesto: formData.nro_presupuesto?.trim() || null,
        empresa_id: (() => {
          const selectedEmpresa = empresas.find(e => e.razon_social === formData.cliente_nombre_empresa)
          return selectedEmpresa ? selectedEmpresa.id : null
        })(),
        ejecutivo_negocios: Number(formData.ejecutivo_negocios) || null,
        cliente_nombre_empresa: formData.cliente_nombre_empresa?.trim() || '',
        tema: formData.tema?.trim() || null,
        fecha_emision: formData.fecha_emision ? 
          (formData.fecha_emision instanceof Date ? formData.fecha_emision : new Date(formData.fecha_emision)).toISOString().split('T')[0] : null,
        fecha_servicio: formData.fecha_servicio ? 
          (formData.fecha_servicio instanceof Date ? formData.fecha_servicio : new Date(formData.fecha_servicio)).toISOString().split('T')[0] : null,
        nro_sesiones: Number(formData.nro_sesiones) || 1,
        fecha_ejecucion1: formData.fecha_ejecucion1 || null,
        fecha_ejecucion2: formData.fecha_ejecucion2 || null,
        fecha_ejecucion3: formData.fecha_ejecucion3 || null,
        fecha_ejecucion4: formData.fecha_ejecucion4 || null,
        fecha_ejecucion5: formData.fecha_ejecucion5 || null,
        participantes_max: Number(formData.participantes_max) || null,
        detalle_sesion: formData.detalle_sesion?.trim() || null,
        certificado_impreso: Boolean(formData.certificado_impreso),
        carnet_impreso: Boolean(formData.carnet_impreso),
        observaciones_adicionales: formData.observaciones_adicionales?.trim() || null,
        detalle_capacitacion: formData.detalle_capacitacion?.trim() || null,
        costo_honorarios: Number(formData.costo_honorarios) || 0,
        nro_horas: Number(formData.nro_horas) || 0,
        costo_total: (
          ((formData.nro_horas || 0) * (formData.costo_honorarios || 0)) +
          (formData.costo_impresion_material || 0) +
          (formData.costo_traslado || 0) +
          (formData.costo_logistica_comida || 0) +
          (formData.costo_otros || 0)
        ),
        costo_impresion_material: Number(formData.costo_impresion_material) || 0,
        costo_traslado: Number(formData.costo_traslado) || null,
        costo_logistica_comida: Number(formData.costo_logistica_comida) || null,
        costo_otros: Number(formData.costo_otros) || null,
        estado: formData.estado || 'pendiente',
        persona_contacto_id: Number(formData.persona_contacto_id) || null,
        direccion_ejecucion: formData.direccion_ejecucion?.trim() || '',
        direccion_envio: formData.direccion_envio?.trim() || null
      }
      
      if (isNew) {
        const { error } = await supabase.from("osi").insert([dataToSave])
        if (error) throw error
      } else if (osi) {
        const { error } = await supabase.from("osi").update(dataToSave).eq("id", osi.id)
        if (error) throw error
      }
      
      router.push('/dashboard/negocios/gestion-de-osis')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al guardar la OSI')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!osi || !confirm('¿Estás seguro de que quieres eliminar esta OSI?')) return
    
    try {
      const { error } = await supabase.from("osi").delete().eq("id", osi.id)
      if (error) throw error
      
      router.push('/dashboard/negocios/gestion-de-osis')
    } catch (error) {
      console.error('Error deleting OSI:', error)
    }
  }

  const updateFormData = (field: keyof Partial<OSI>, value: string | number | boolean | Date | null) => {
    // Convert string numbers to actual numbers for numeric fields
    let processedValue = value;
    if (typeof value === 'string' && ['nro_horas', 'costo_honorarios', 'costo_impresion_material', 'costo_traslado', 'costo_logistica_comida', 'costo_otros', 'participantes_max', 'nro_sesiones', 'ejecutivo_negocios', 'persona_contacto_id'].includes(field)) {
      processedValue = parseFloat(value) || 0;
    }
    setFormData(prev => ({ ...prev, [field]: processedValue }))
    // Clear error when user starts typing in required fields
    if (error && (field === 'nro_osi' || field === 'tipo_servicio')) {
      setError(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'pendiente': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando OSI...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isNew ? 'Nueva OSI' : `OSI ${formData.nro_osi || ''}`}
            </h1>
            <p className="mt-2 text-gray-600">
              {formData.cliente_nombre_empresa || 'Nueva Orden de Servicio de Ingeniería'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!isNew && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(formData.estado || 'pendiente')}`}>
                {formData.estado || 'pendiente'}
              </span>
            )}
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        {/* Basic Information Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">Información Básica</h2>
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-base font-medium text-gray-900 mb-2">Identificación</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Número OSI</label>
                  <input
                    type="text"
                    value={formData.nro_osi || ''}
                    onChange={(e) => updateFormData('nro_osi', e.target.value)}
                    disabled={!isEditing && !isNew}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Ej: OSI-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Empresa</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.cliente_nombre_empresa || ''}
                      onChange={(e) => {
                        updateFormData('cliente_nombre_empresa', e.target.value)
                        setSearchTerm(e.target.value)
                      }}
                      onFocus={() => setSearchTerm(formData.cliente_nombre_empresa || '')}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setSearchTerm('')
                          ;(e.target as HTMLInputElement).blur()
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          // Focus first option if available
                          const firstOption = document.querySelector('[data-empresa-option="0"]') as HTMLElement
                          if (firstOption) firstOption.focus()
                        }
                      }}
                      disabled={!isEditing && !isNew}
                      tabIndex={!isEditing && !isNew ? -1 : 0}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Buscar empresa..."
                    />
                    {searchTerm && filteredEmpresas.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {filteredEmpresas.map((empresa, index) => (
                          <div
                            key={empresa.id}
                            data-empresa-option={index}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                            onClick={() => {
                              const normalizedAddress = (empresa.direccion_fiscal || '').normalize('NFD')
                              updateFormData('cliente_nombre_empresa', empresa.razon_social)
                              updateFormData('rif', empresa.rif || '')
                              updateFormData('codigo_cliente', empresa.codigo_cliente || '')
                              updateFormData('direccion_fiscal', normalizedAddress)
                              updateFormData('direccion_ejecucion', normalizedAddress)
                              updateFormData('direccion_envio', normalizedAddress)
                              // Clear contacto fields when empresa changes
                              updateFormData('persona_contacto_id', 0)
                              updateFormData('contacto_nombre', '')
                              updateFormData('contacto_apellido', '')
                              updateFormData('contacto_telefono', '')
                              updateFormData('contacto_email', '')
                              updateFormData('contacto_email2', '')
                              setSearchTerm('')
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                const normalizedAddress = (empresa.direccion_fiscal || '').normalize('NFD')
                                updateFormData('cliente_nombre_empresa', empresa.razon_social)
                                updateFormData('rif', empresa.rif || '')
                                updateFormData('codigo_cliente', empresa.codigo_cliente || '')
                                updateFormData('direccion_fiscal', normalizedAddress)
                                updateFormData('direccion_ejecucion', normalizedAddress)
                                updateFormData('direccion_envio', normalizedAddress)
                                // Clear contacto fields when empresa changes
                                updateFormData('persona_contacto_id', 0)
                                updateFormData('contacto_nombre', '')
                                updateFormData('contacto_apellido', '')
                                updateFormData('contacto_telefono', '')
                                updateFormData('contacto_email', '')
                                updateFormData('contacto_email2', '')
                                setSearchTerm('')
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                const nextOption = document.querySelector(`[data-empresa-option="${index + 1}"]`) as HTMLElement
                                if (nextOption) {
                                  nextOption.focus()
                                } else {
                                  // Wrap to first option
                                  const firstOption = document.querySelector('[data-empresa-option="0"]') as HTMLElement
                                  if (firstOption) firstOption.focus()
                                }
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                const prevOption = document.querySelector(`[data-empresa-option="${index - 1}"]`) as HTMLElement
                                if (prevOption) {
                                  prevOption.focus()
                                } else {
                                  // Wrap to last option
                                  const lastOption = document.querySelector(`[data-empresa-option="${filteredEmpresas.length - 1}"]`) as HTMLElement
                                  if (lastOption) lastOption.focus()
                                }
                              }
                            }}
                            tabIndex={0}
                          >
                            <div className="font-medium">{empresa.razon_social}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
