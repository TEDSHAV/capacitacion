interface AdditionalInfoProps {
  formData: any
  isEditing: boolean
  isNew: boolean
  updateFormData: (field: string, value: any) => void
}

const AdditionalInfo = ({ formData, isEditing, isNew, updateFormData }: AdditionalInfoProps) => {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">Información Adicional</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Pretenciones del Cliente</label>
          <textarea
            value={formData.pretenciones_cliente || ''}
            onChange={(e) => updateFormData('pretenciones_cliente', e.target.value)}
            disabled={!isEditing && !isNew}
            tabIndex={!isEditing && !isNew ? -1 : 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            rows={3}
            placeholder="Pretenciones y expectativas del cliente..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones Adicionales</label>
          <textarea
            value={formData.observaciones_adicionales || ''}
            onChange={(e) => updateFormData('observaciones_adicionales', e.target.value)}
            disabled={!isEditing && !isNew}
            tabIndex={!isEditing && !isNew ? -1 : 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            rows={3}
            placeholder="Observaciones adicionales..."
          />
        </div>
        
        <div className="flex items-center space-x-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.certificado_impreso !== false} // Default to true for new OSIs
              onChange={(e) => updateFormData('certificado_impreso', e.target.checked)}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Certificado Impreso</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.carnet_impreso || false}
              onChange={(e) => updateFormData('carnet_impreso', e.target.checked)}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Carnet Impreso</span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default AdditionalInfo
