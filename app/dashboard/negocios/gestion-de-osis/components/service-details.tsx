interface ServiceDetailsProps {
  formData: any
  isEditing: boolean
  isNew: boolean
  updateFormData: (field: string, value: any) => void
}

const ServiceDetails = ({ formData, isEditing, isNew, updateFormData }: ServiceDetailsProps) => {
  if (!formData) {
    return null
  }
  
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">Detalles del Servicio</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Emisión</label>
          <input
            type="date"
            value={formData.fecha_emision ? 
              (typeof formData.fecha_emision === 'string' ? formData.fecha_emision.split('T')[0] : 
               formData.fecha_emision instanceof Date ? formData.fecha_emision.toISOString().split('T')[0] : '') : ''}
            onChange={(e) => updateFormData('fecha_emision', e.target.value ? new Date(e.target.value) : null)}
            disabled={!isEditing && !isNew}
            tabIndex={!isEditing && !isNew ? -1 : 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Servicio</label>
          <input
            type="date"
            value={formData.fecha_servicio ? 
              (typeof formData.fecha_servicio === 'string' ? formData.fecha_servicio.split('T')[0] : 
               formData.fecha_servicio instanceof Date ? formData.fecha_servicio.toISOString().split('T')[0] : '') : ''}
            onChange={(e) => updateFormData('fecha_servicio', e.target.value ? new Date(e.target.value) : null)}
            disabled={!isEditing && !isNew}
            tabIndex={!isEditing && !isNew ? -1 : 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nro Presupuesto</label>
            <input
              type="text"
              value={formData.nro_presupuesto || ''}
              onChange={(e) => updateFormData('nro_presupuesto', e.target.value)}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Número de presupuesto"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nro Orden Compra</label>
            <input
              type="text"
              value={formData.nro_orden_compra || ''}
              onChange={(e) => updateFormData('nro_orden_compra', e.target.value)}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Número de orden de compra"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceDetails
