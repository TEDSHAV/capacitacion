'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface OSI {
  id: number
  nro_osi: string
  nombre_empresa: string
  empresa_rif: string
  nro_orden_compra: string
  pedido: string
  tipo_servicio: string
  fecha_emision: string
  nro_presupuesto: string
  ejecutivo_negocios: string
  cliente_nombre_empresa: string
  cliente_codigo: string
  direccion_ejecucion: string
  direccion_envio: string
  direccion_fiscal_cliente: string
  persona_contacto: string
  telefono_contacto: string
  email_contacto: string
  tema: string
  fecha_servicio: string
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
  estado: 'pendiente' | 'active' | 'inactive'
}

export default function OSIDetailPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  
  const [osi, setOsi] = useState<OSI | null>(null)
  const [formData, setFormData] = useState<Partial<OSI>>({
    nombre_empresa: '',
    empresa_rif: '',
    nro_osi: '',
    nro_orden_compra: '',
    pedido: '',
    tipo_servicio: '',
    fecha_emision: '',
    nro_presupuesto: '',
    ejecutivo_negocios: '',
    cliente_nombre_empresa: '',
    cliente_codigo: '',
    direccion_ejecucion: '',
    direccion_envio: '',
    direccion_fiscal_cliente: '',
    persona_contacto: '',
    telefono_contacto: '',
    email_contacto: '',
    tema: '',
    fecha_servicio: '',
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
    estado: 'pendiente'
  })

    const [isLoading, setIsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

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
    
    try {
      if (isNew) {
        const { error } = await supabase.from("osi").insert([formData])
        if (error) throw error
      } else if (osi) {
        const { error } = await supabase.from("osi").update(formData).eq("id", osi.id)
        if (error) throw error
      }
      
      router.push('/dashboard/negocios')
    } catch (error) {
      console.error('Error saving OSI:', error)
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
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
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
                {formData.nombre_empresa || 'Nueva Orden de Servicio de Ingeniería'}
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
                  className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Guardando...' : (isNew ? 'Crear' : 'Actualizar')}
                </button>
                {!isNew && (
                  <button
                    onClick={cancelEditing}
                    className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                {!isNew && (
                  <button
                    onClick={handleDelete}
                    className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
                  >
                    Eliminar
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={startEditing}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        {/* Basic Information Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">Información Básica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-base font-medium text-gray-900 mb-2">Identificación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <input
                    type="text"
                    value={formData.nombre_empresa || ''}
                    onChange={(e) => updateFormData('nombre_empresa', e.target.value)}
                    disabled={!isEditing && !isNew}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Nombre de la empresa"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">RIF Empresa</label>
                  <input
                    type="text"
                    value={formData.empresa_rif || ''}
                    onChange={(e) => updateFormData('empresa_rif', e.target.value)}
                    disabled={!isEditing && !isNew}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="RIF de la empresa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Servicio</label>
                  <input
                    type="text"
                    value={formData.tipo_servicio || ''}
                    onChange={(e) => updateFormData('tipo_servicio', e.target.value)}
                    disabled={!isEditing && !isNew}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Tipo de servicio"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                  <select
                    value={formData.estado || 'pendiente'}
                    onChange={(e) => updateFormData('estado', e.target.value)}
                    disabled={!isEditing && !isNew}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ejecutivo Negocios</label>
                <input
                  type="text"
                  value={formData.ejecutivo_negocios || ''}
                  onChange={(e) => updateFormData('ejecutivo_negocios', e.target.value)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Ejecutivo de negocios"
                />
              </div>
            </div>
          </div>
        </div>

          {/* Dates Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">Fechas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Emisión</label>
              <input
                type="date"
                value={formData.fecha_emision || ''}
                onChange={(e) => updateFormData('fecha_emision', e.target.value)}
                disabled={!isEditing && !isNew}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Servicio</label>
              <input
                type="date"
                value={formData.fecha_servicio || ''}
                onChange={(e) => updateFormData('fecha_servicio', e.target.value)}
                disabled={!isEditing && !isNew}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

          {/* Client Information Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">Información Cliente</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Empresa Cliente</label>
                <input
                  type="text"
                  value={formData.cliente_nombre_empresa || ''}
                  onChange={(e) => updateFormData('cliente_nombre_empresa', e.target.value)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Nombre de empresa del cliente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Código Cliente</label>
                <input
                  type="text"
                  value={formData.cliente_codigo || ''}
                  onChange={(e) => updateFormData('cliente_codigo', e.target.value)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Código del cliente"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Persona Contacto</label>
                <input
                  type="text"
                  value={formData.persona_contacto || ''}
                  onChange={(e) => updateFormData('persona_contacto', e.target.value)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Persona de contacto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono Contacto</label>
                <input
                  type="text"
                  value={formData.telefono_contacto || ''}
                  onChange={(e) => updateFormData('telefono_contacto', e.target.value)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Teléfono de contacto"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Contacto</label>
                <input
                  type="email"
                  value={formData.email_contacto || ''}
                  onChange={(e) => updateFormData('email_contacto', e.target.value)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Email de contacto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dirección Fiscal Cliente</label>
                <textarea
                  value={formData.direccion_fiscal_cliente || ''}
                  onChange={(e) => updateFormData('direccion_fiscal_cliente', e.target.value)}
                  disabled={!isEditing && !isNew}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  rows={2}
                  placeholder="Dirección fiscal del cliente"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Pedido</label>
              <textarea
                value={formData.pedido || ''}
                onChange={(e) => updateFormData('pedido', e.target.value)}
                disabled={!isEditing && !isNew}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={3}
                placeholder="Descripción del pedido"
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
                  checked={formData.certificado_impreso || false}
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
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creando...' : 'Crear OSI'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
