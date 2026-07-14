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

const supabase = createClient()

const OSIDetailPage = () => {
  const router = useRouter()
  const params = useParams()
  
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
        console.error('Servicios database error:', error)
        throw error
      }
      setServicios(data || [])
    } catch (err) {
      console.error('Error loading servicios:', err)
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
      
      if (error) throw error
      setCatalogoServicios(data || [])
    } catch (err) {
      console.error('Error loading catalogo_servicios:', err)
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
      
      if (error) throw error
      setContactos(data || [])
    } catch (err) {
      console.error('Error loading contactos:', err)
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing in required fields
    if (error && (field === 'nro_osi' || field === 'tipo_servicio')) {
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
        setError('OSI not found')
        return
      }

      if (!osiData) {
        setError('OSI not found')
        return
      }

      setOsi(osiData)
      setFormData(osiData)
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
      
      // Prepare data for Supabase
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
        persona_contacto_id: Number(formData.persona_contacto_id) || null,
        direccion_ejecucion: formData.direccion_ejecucion?.trim() || '',
        codigo_cliente: (() => {
          const selectedEmpresa = empresas.find(e => e.razon_social === formData.cliente_nombre_empresa)
          return selectedEmpresa ? selectedEmpresa.codigo_cliente : null
        })(),
        contacto_id: Number(formData.contacto_id) || null
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
      setIsEditing(true) // New OSIs start in edit mode
      loadInitialData() // Load initial data for new OSI
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
    </div>
  )
}

export default OSIDetailPage
