'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { OSI } from '@/types'
import ErrorDialog, { useErrorDialog } from '@/components/ui/error-dialog'

const supabase = createClient()

export function useOSI() {
  const router = useRouter()
  const params = useParams()
  const errorDialog = useErrorDialog()
  
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
    certificado_impreso: true,
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

  const [isLoading, setIsLoading] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Initialize OSI data
  useEffect(() => {
    const nro_osi = params.nro_osi as string
    
    if (nro_osi === 'new') {
      setIsNew(true)
      setIsEditing(true)
      setFormData(prev => ({
        ...prev,
        fecha_emision: new Date()
      }))
    } else if (nro_osi) {
      loadOSI(nro_osi)
    }
  }, [params.nro_osi])

  // Load OSI data
  const loadOSI = async (osiNumber: string) => {
    try {
      // First, get the OSI data
      const { data: osiData, error: osiError } = await supabase
        .from("osi")
        .select("*")
        .eq("nro_osi", osiNumber)
        .single()

      if (osiError) {
        errorDialog.showError(
          'OSI no encontrada',
          `La OSI ${osiNumber} no existe en el sistema`,
          'Error de Búsqueda'
        )
        return
      }

      // If we have OSI data, get the executive name separately
      if (osiData && osiData.ejecutivo_negocios) {
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("nombre_apellido")
          .eq("id", osiData.ejecutivo_negocios)
          .single()

        if (!userError && userData) {
          osiData.usuarios = {
            nombre_apellido: userData.nombre_apellido
          }
        }
      }

      setOsi(osiData)
      setFormData(osiData)
    } catch (err) {
      errorDialog.showError(
        'Error al cargar OSI',
        err instanceof Error ? err.message : 'Error desconocido',
        'Error de Carga'
      )
    }
  }

  // Update form data
  const updateFormData = (field: keyof OSI, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Start editing
  const startEditing = () => {
    setIsEditing(true)
  }

  // Cancel editing
  const cancelEditing = () => {
    if (!isNew) {
      setIsEditing(false)
      if (osi) {
        setFormData(osi)
      }
    }
  }

  // Save OSI
  const handleSave = async () => {
    setIsLoading(true)
    
    try {
      // Validation
      if (!formData.nro_osi?.trim()) {
        errorDialog.showError(
          'Validación requerida',
          'El número de OSI es requerido',
          'Error de Validación'
        )
        return
      }
      
      if (!formData.tipo_servicio?.trim()) {
        errorDialog.showError(
          'Validación requerida',
          'El tipo de servicio es requerido',
          'Error de Validación'
        )
        return
      }

      // Prepare data
      const dataToSave = {
        nro_osi: formData.nro_osi?.trim() || '',
        nro_orden_compra: formData.nro_orden_compra?.trim() || null,
        tipo_servicio: formData.tipo_servicio?.trim() || '',
        nro_presupuesto: formData.nro_presupuesto?.trim() || null,
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
        nro_horas: Number(formData.nro_horas) || null,
        costo_total: (
          ((formData.nro_horas || 0) * (formData.costo_honorarios || 0)) +
          (formData.costo_impresion_material || 0) +
          (formData.costo_traslado || 0) +
          (formData.costo_logistica_comida || 0) +
          (formData.costo_otros || 0)
        ),
        costo_impresion_material: Number(formData.costo_impresion_material) || null,
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
      errorDialog.showError(
        'Error al guardar OSI',
        error instanceof Error ? error.message : 'Error desconocido',
        'Error de Guardado'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Delete OSI
  const handleDelete = async () => {
    if (!osi) return
    
    const confirmed = window.confirm('¿Estás seguro de que quieres eliminar esta OSI? Esta acción no se puede deshacer.')
    
    if (!confirmed) return
    
    try {
      const { error } = await supabase.from("osi").delete().eq("id", osi.id)
      if (error) throw error
      
      router.push('/dashboard/negocios/gestion-de-osis')
    } catch (error) {
      errorDialog.showError(
        'Error al eliminar OSI',
        error instanceof Error ? error.message : 'Error desconocido',
        'Error de Eliminación'
      )
    }
  }

  return {
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
  }
}
