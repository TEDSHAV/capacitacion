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

interface UseOSIDataProps {
  empresas: Array<{ id: string; razon_social: string; rif: string; direccion_fiscal: string; codigo_cliente: string }>
}

const useOSIData = ({ empresas }: UseOSIDataProps) => {
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

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

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
      throw error // Re-throw to let calling component handle loading state
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
      throw error
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

  const updateFormData = (field: string, value: string | number | boolean | Date | null) => {
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

  useEffect(() => {
    const nro_osi = params.nro_osi as string
    
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

  return {
    // State
    osi,
    formData,
    loading,
    error,
    isNew,
    isEditing,
    
    // Actions
    handleSave,
    handleDelete,
    startEditing,
    cancelEditing,
    updateFormData,
    
    // Derived values
    getStatusColor: (status: string) => {
      switch (status) {
        case 'active': return 'bg-green-100 text-green-800'
        case 'inactive': return 'bg-gray-100 text-gray-800'
        case 'pendiente': return 'bg-yellow-100 text-yellow-800'
        default: return 'bg-gray-100 text-gray-800'
      }
    }
  }
}

export default useOSIData
