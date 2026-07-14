'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import OSIForm from '../components/osi-form'
import ServiceDetails from '../components/service-details'
import ExecutionDates from '../components/execution-dates'
import CostCalculation from '../components/cost-calculation'
import AdditionalInfo from '../components/additional-info'
import OSIActionButtons from '../components/OSIActionButtons'
import useOSIData from '../hooks/use-osi-data'
import useLookupData from '../hooks/use-lookup-data'
import useSearch from '../hooks/use-search'

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

const OSIDetailPage = () => {
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(false)
  const [empresaSearchTerm, setEmpresaSearchTerm] = useState('')
  const [temaSearchTerm, setTemaSearchTerm] = useState('')

  // Custom hooks
  const lookupData = useLookupData()
  const osiData = useOSIData({ empresas: lookupData.empresas })
  
  // Search hooks
  const filteredEmpresas = useSearch(lookupData.empresas, empresaSearchTerm, 'razon_social')
  const filteredCatalogoServicios = useSearch(lookupData.catalogoServicios, temaSearchTerm, 'nombre')

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await osiData.handleSave()
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await osiData.handleDelete()
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setIsLoading(false)
    }
  }

  if (osiData.loading || lookupData.loading) {
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

  if (osiData.error || lookupData.error) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{osiData.error || lookupData.error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              {osiData.isNew ? 'New OSI' : `OSI ${osiData.formData.nro_osi}`}
            </h1>
          </div>
          
          <div className="p-6 space-y-6">
            <OSIForm
              initialData={osiData.formData}
              isNew={osiData.isNew}
              isEditing={osiData.isEditing}
              onEdit={osiData.startEditing}
              onCancel={osiData.cancelEditing}
              onSave={handleSave}
              onDelete={handleDelete}
              empresas={lookupData.empresas}
              servicios={lookupData.servicios}
              usuarios={lookupData.usuarios}
              filteredEmpresas={filteredEmpresas.filteredItems}
              catalogoServicios={lookupData.catalogoServicios}
              filteredCatalogoServicios={filteredCatalogoServicios.filteredItems}
              empresaSearchTerm={empresaSearchTerm}
              temaSearchTerm={temaSearchTerm}
              setEmpresaSearchTerm={setEmpresaSearchTerm}
              setTemaSearchTerm={setTemaSearchTerm}
              updateFormData={osiData.updateFormData}
            />
            
            <ServiceDetails
              formData={osiData.formData}
              isEditing={osiData.isEditing}
              isNew={osiData.isNew}
              updateFormData={osiData.updateFormData}
            />
            
            <ExecutionDates
              formData={osiData.formData}
              isEditing={osiData.isEditing}
              isNew={osiData.isNew}
              updateFormData={osiData.updateFormData}
            />
            
            <CostCalculation
              formData={osiData.formData}
              isEditing={osiData.isEditing}
              isNew={osiData.isNew}
              updateFormData={osiData.updateFormData}
            />
            
            <AdditionalInfo
              formData={osiData.formData}
              isEditing={osiData.isEditing}
              isNew={osiData.isNew}
              updateFormData={osiData.updateFormData}
            />
            
            <div className="border-t pt-6">
              <OSIActionButtons
                isNew={osiData.isNew}
                isEditing={osiData.isEditing}
                isLoading={isLoading}
                onSave={handleSave}
                onCancel={osiData.cancelEditing}
                onEdit={osiData.startEditing}
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
