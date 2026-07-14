'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface OSI {
  id: number
  nro_osi: string
  nro_orden_compra: string
  tipo_servicio: string
  nro_presupuesto: string
  ejecutivo_negocios: number
  cliente_nombre_empresa: string
  tema: string
  fecha_servicio: Date | null
  participantes_max: number
  detalle_sesion: string
  certificado_impreso: boolean
  carnet_impreso: boolean
  observaciones_adicionales: string
  costo_honorarios_hora: number
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
    costo_honorarios_hora: 0,
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
    direccion_ejecucion: ''
  })

    const [isLoading, setIsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [empresas, setEmpresas] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredEmpresas, setFilteredEmpresas] = useState<any[]>([])
  const [servicios, setServicios] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [catalogoServicios, setCatalogoServicios] = useState<any[]>([])
  const [temaSearchTerm, setTemaSearchTerm] = useState('')
  const [filteredCatalogoServicios, setFilteredCatalogoServicios] = useState<any[]>([])

  useEffect(() => {
    const nro_osi = params.nro_osi as string
    
    // Load empresas, servicios, and usuarios regardless of OSI state
    loadEmpresas()
    loadServicios()
    loadUsuarios()
    
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

  const loadOSI = async (osiNumber: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("osi")
        .select("*")
        .eq("nro_osi", osiNumber)
        .single()

      if (error) {
        console.error('Error loading OSI:', error)
        setError('OSI not found')
      } else if (data) {
        setOsi(data)
        setFormData(data)
      }
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
      // Only include fields that exist in the database schema
      const dataToSave = {
        nro_osi: formData.nro_osi?.trim() || '',
        nro_orden_compra: formData.nro_orden_compra?.trim() || null,
        tipo_servicio: formData.tipo_servicio?.trim() || '',
        nro_presupuesto: formData.nro_presupuesto?.trim() || null,
        ejecutivo_negocios: Number(formData.ejecutivo_negocios) || null,
        cliente_nombre_empresa: formData.cliente_nombre_empresa?.trim() || '',
        tema: formData.tema?.trim() || null,
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
        costo_honorarios_hora: Number(formData.costo_honorarios_hora) || null,
        costo_impresion_material: Number(formData.costo_impresion_material) || null,
        costo_traslado: Number(formData.costo_traslado) || null,
        costo_logistica_comida: Number(formData.costo_logistica_comida) || null,
        costo_otros: Number(formData.costo_otros) || null,
        estado: formData.estado || 'pendiente',
        codigo_cliente: formData.codigo_cliente?.trim() || '',
        rif: formData.rif?.trim() || '',
        direccion_fiscal: formData.direccion_fiscal?.trim() || '',
        direccion_envio: formData.direccion_envio?.trim() || '',
        persona_contacto_id: Number(formData.persona_contacto_id) || null,
        direccion_ejecucion: formData.direccion_ejecucion?.trim() || ''
      }
      
      if (isNew) {
        const { error } = await supabase.from("osi").insert([dataToSave])
        if (error) {
          throw error
        }
      } else if (osi) {
        const { error } = await supabase.from("osi").update(dataToSave).eq("id", osi.id)
        if (error) {  
          throw error
        } 
      }
      
      router.push('/dashboard/negocios')
    } catch (error) {
      console.error('Error saving OSI:', error)
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
      
      router.push('/dashboard/negocios')
    } catch (error) {
      console.error('Error deleting OSI:', error)
    }
  }

  const updateFormData = (field: keyof OSI, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
            <button
              onClick={() => router.push('/dashboard/negocios')}
              className="mt-4 text-indigo-600 hover:text-indigo-900 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
              style={{ backgroundColor: 'transparent', background: 'none' }}
            >
              Volver a OSI
            </button>
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/negocios')}
              className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
            >
              ← Volver a OSI
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isNew ? 'Nueva OSI' : `OSI ${formData.nro_osi || ''}`}
              </h1>
              <p className="mt-2 text-gray-600">
                {formData.cliente_nombre_empresa || 'Nueva Orden de Servicio de Ingeniería'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isNew && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(formData.estado || 'pendiente')}`}>
                {formData.estado || 'pendiente'}
              </span>
            )}
            {(isEditing || isNew) ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md"
                  style={{ backgroundColor: '#4f46e5', color: 'white' }}
                >
                  {isLoading ? 'Guardando...' : (isNew ? 'Crear' : 'Actualizar')}
                </button>
                {!isNew && (
                  <button
                    onClick={cancelEditing}
                    className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors shadow-md"
                    style={{ backgroundColor: '#4b5563', color: 'white' }}
                  >
                    Cancelar
                  </button>
                )}
                {!isNew && (
                  <button
                    onClick={handleDelete}
                    className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors shadow-md"
                    style={{ backgroundColor: '#dc2626', color: 'white' }}
                  >
                    Eliminar
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={startEditing}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors shadow-md"
                  style={{ backgroundColor: '#4f46e5', color: 'white' }}
                >
                  Editar
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors shadow-md"
                  style={{ backgroundColor: '#dc2626', color: 'white' }}
                >
                  Eliminar
                </button>
              </>
            )}
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
                      disabled={!isEditing && !isNew}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Buscar empresa..."
                    />
                    {searchTerm && filteredEmpresas.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {filteredEmpresas.map((empresa) => (
                          <div
                            key={empresa.id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                            onClick={() => {
                              updateFormData('cliente_nombre_empresa', empresa.razon_social)
                              updateFormData('rif', empresa.rif || '')
                              updateFormData('codigo_cliente', empresa.codigo_cliente || '')
                              updateFormData('direccion_fiscal', empresa.direccion_fiscal || '')
                              updateFormData('direccion_ejecucion', empresa.direccion_fiscal || '')
                              updateFormData('direccion_envio', empresa.direccion_fiscal || '')
                              setSearchTerm('')
                            }}
                          >
                            <div className="font-medium">{empresa.razon_social}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Codigo cliente</label>
                  <input
                    type="text"
                    value={formData.codigo_cliente || ''}
                    onChange={(e) => updateFormData('codigo_cliente', e.target.value)}
                    disabled={!isEditing && !isNew}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Codigo del cliente"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">RIF</label>
                  <input
                    type="text"
                    value={formData.rif || ''}
                    onChange={(e) => updateFormData('rif', e.target.value)}
                    disabled={!isEditing && !isNew}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="RIF de la empresa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Direccion Fiscal</label>
                  <input
                    type="text"
                    value={formData.direccion_fiscal || ''}
                    onChange={(e) => updateFormData('direccion_fiscal', e.target.value)}
                    disabled={!isEditing && !isNew}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Direccion fiscal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Direccion Ejecucion</label>
                  <input
                    type="text"
                    value={formData.direccion_ejecucion || ''}
                    onChange={(e) => updateFormData('direccion_ejecucion', e.target.value)}
                    disabled={!isEditing && !isNew}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Direccion de ejecucion"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Direccion de Envio</label>
                  <input
                    type="text"
                    value={formData.direccion_envio || ''}
                    onChange={(e) => updateFormData('direccion_envio', e.target.value)}
                    disabled={!isEditing && !isNew}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Direccion de envio"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Servicio</label>
                  <select
                    value={formData.tipo_servicio || ''}
                    onChange={(e) => updateFormData('tipo_servicio', e.target.value)}
                    disabled={!isEditing && !isNew}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccione un servicio</option>
                    {servicios.map((servicio) => (
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
                      value={formData.tema || temaSearchTerm}
                      onChange={(e) => {
                        setTemaSearchTerm(e.target.value)
                        if (!e.target.value) {
                          updateFormData('tema', '')
                        }
                      }}
                      onFocus={() => setTemaSearchTerm(formData.tema || '')}
                      disabled={!isEditing && !isNew || !formData.tipo_servicio}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder={
                        !formData.tipo_servicio 
                          ? 'Seleccione primero un tipo de servicio' 
                          : 'Escriba para buscar tema...'
                      }
                    />
                    {temaSearchTerm && filteredCatalogoServicios.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {filteredCatalogoServicios.map((servicio) => (
                          <div
                            key={servicio.id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                            onClick={() => {
                              updateFormData('tema', servicio.nombre)
                              setTemaSearchTerm('')
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
                    value={formData.ejecutivo_negocios || ''}
                    onChange={(e) => updateFormData('ejecutivo_negocios', e.target.value ? parseInt(e.target.value) : 0)}
                    disabled={!isEditing && !isNew}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccione un ejecutivo</option>
                    {usuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nombre_apellido}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                  <select
                    value={formData.estado || 'pendiente'}
                    onChange={(e) => updateFormData('estado', e.target.value)}
                    disabled={!isEditing && !isNew}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="active">Activa </option>
                    <option value="inactive">Cerrada</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-medium text-gray-900 mb-2">Documentación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nro Orden Compra</label>
                  <input
                    type="text"
                    value={formData.nro_orden_compra || ''}
                    onChange={(e) => updateFormData('nro_orden_compra', e.target.value)}
                    disabled={!isEditing && !isNew}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Número de orden de compra"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nro Presupuesto</label>
                  <input
                    type="text"
                    value={formData.nro_presupuesto || ''}
                    onChange={(e) => updateFormData('nro_presupuesto', e.target.value)}
                    disabled={!isEditing && !isNew}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Número de presupuesto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* Service Details Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">Detalles Servicio</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tema</label>
              <select
                value={formData.nro_sesiones || 1}
                onChange={(e) => updateFormData('nro_sesiones', parseInt(e.target.value))}
                disabled={!isEditing && !isNew}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value={1}>1 sesión</option>
                <option value={2}>2 sesiones</option>
                <option value={3}>3 sesiones</option>
                <option value={4}>4 sesiones</option>
                <option value={5}>5 sesiones</option>
              </select>
            </div>
            {Array.from({ length: formData.nro_sesiones || 1 }, (_, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Sesión {index + 1}
                </label>
                <input
                  type="date"
                  value={String(formData[`fecha_ejecucion${index + 1}` as keyof OSI] ?? '')}
                  onChange={(e) => updateFormData(`fecha_ejecucion${index + 1}` as keyof OSI, e.target.value)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            ))}
          </div>
        </div>

          {/* Client Information Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">Información Cliente</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Persona Contacto ID</label>
                <input
                  type="number"
                  value={formData.persona_contacto_id || 0}
                  onChange={(e) => updateFormData('persona_contacto_id', parseInt(e.target.value) || 0)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="ID de la persona de contacto"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dirección Fiscal ID</label>
                <input
                  type="number"
                  value={formData.direccion_fiscal || 0}
                  onChange={(e) => updateFormData('direccion_fiscal', parseInt(e.target.value) || 0)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="ID de dirección fiscal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Servicio</label>
                <input
                  type="date"
                  value={formData.fecha_servicio ? 
                    (formData.fecha_servicio instanceof Date ? formData.fecha_servicio : new Date(formData.fecha_servicio)).toISOString().split('T')[0] : ''}
                  onChange={(e) => updateFormData('fecha_servicio', e.target.value ? new Date(e.target.value) : null)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

          {/* Service Details Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">Detalles Servicio</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tema</label>
              <textarea
                value={formData.tema || ''}
                onChange={(e) => updateFormData('tema', e.target.value)}
                disabled={!isEditing && !isNew}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={3}
                placeholder="Tema del servicio"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Detalle Sesión</label>
              <textarea
                value={formData.detalle_sesion || ''}
                onChange={(e) => updateFormData('detalle_sesion', e.target.value)}
                disabled={!isEditing && !isNew}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={3}
                placeholder="Detalle de la sesión"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones Adicionales</label>
              <textarea
                value={formData.observaciones_adicionales || ''}
                onChange={(e) => updateFormData('observaciones_adicionales', e.target.value)}
                disabled={!isEditing && !isNew}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={3}
                placeholder="Observaciones adicionales"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Participantes Máximos</label>
              <input
                type="number"
                value={formData.participantes_max || 0}
                onChange={(e) => updateFormData('participantes_max', parseInt(e.target.value) || 0)}
                disabled={!isEditing && !isNew}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Número máximo de participantes"
              />
            </div>
          </div>
        </div>

          {/* Costs Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">Costos</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Costo Honorarios/Hora</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costo_honorarios_hora || 0}
                  onChange={(e) => updateFormData('costo_honorarios_hora', parseFloat(e.target.value) || 0)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Costo Impresión Material</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costo_impresion_material || 0}
                  onChange={(e) => updateFormData('costo_impresion_material', parseFloat(e.target.value) || 0)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Costo Traslado</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costo_traslado || 0}
                  onChange={(e) => updateFormData('costo_traslado', parseFloat(e.target.value) || 0)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Costo Logística Comida</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costo_logistica_comida || 0}
                  onChange={(e) => updateFormData('costo_logistica_comida', parseFloat(e.target.value) || 0)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Costo Otros</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costo_otros || 0}
                  onChange={(e) => updateFormData('costo_otros', parseFloat(e.target.value) || 0)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dirección Ejecución</label>
                <textarea
                  value={formData.direccion_ejecucion || ''}
                  onChange={(e) => updateFormData('direccion_ejecucion', e.target.value)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  rows={2}
                  placeholder="Dirección de ejecución"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dirección Envío</label>
                <textarea
                  value={formData.direccion_envio || ''}
                  onChange={(e) => updateFormData('direccion_envio', e.target.value)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  rows={2}
                  placeholder="Dirección de envío"
                />
              </div>
            </div>

            {/* Certificates */}
            <div className="flex items-center gap-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.certificado_impreso || true}
                  onChange={(e) => updateFormData('certificado_impreso', e.target.checked)}
                  disabled={!isEditing && !isNew}
                  className="mr-3 h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-sm text-gray-700">Certificado Impreso</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.carnet_impreso || false}
                  onChange={(e) => updateFormData('carnet_impreso', e.target.checked)}
                  disabled={!isEditing && !isNew}
                  className="mr-3 h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-sm text-gray-700">Carnet Impreso</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar - Only show for new OSI */}
      {isNew && (
        <div className="bg-white rounded-lg shadow-md p-4 border-t">
          <div className="flex justify-end gap-3">
            <button
              onClick={() => router.push('/dashboard/negocios')}
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors shadow-md"
              style={{ backgroundColor: '#4b5563', color: 'white' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md"
              style={{ backgroundColor: '#4f46e5', color: 'white' }}
            >
              {isLoading ? 'Creando...' : 'Crear OSI'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
