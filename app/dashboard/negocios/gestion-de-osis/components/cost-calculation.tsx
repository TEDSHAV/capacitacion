interface CostCalculationProps {
  formData: any
  isEditing: boolean
  isNew: boolean
  updateFormData: (field: string, value: any) => void
}

const CostCalculation = ({ formData, isEditing, isNew, updateFormData }: CostCalculationProps) => {
  // Calculate total cost whenever cost fields change
  const calculateTotal = () => {
    const honorarios = (formData.costo_honorarios || 0) * (formData.nro_horas || 0)
    const otrosCostos = 
      (formData.costo_impresion_material || 0) +
      (formData.costo_traslado || 0) +
      (formData.costo_logistica_comida || 0) +
      (formData.costo_otros || 0)
    return honorarios + otrosCostos
  }

  const totalCost = calculateTotal()

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">Cálculo de Costos</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Costo por Honorarios</label>
            <input
              type="number"
              value={formData.costo_honorarios || 0}
              onChange={(e) => updateFormData('costo_honorarios', parseFloat(e.target.value) || 0)}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              min="0"
              step="1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Número de Horas</label>
            <input
              type="number"
              value={formData.nro_horas || 0}
              onChange={(e) => updateFormData('nro_horas', parseFloat(e.target.value) || 0)}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              min="0"
              step="0.5"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subtotal Honorarios x Sesión</label>
            <input
              type="text"
              value={`${(formData.costo_honorarios || 0) * (formData.nro_horas || 0)}`}
              disabled
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              readOnly
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Costo Impresión Material</label>
            <input
              type="number"
              value={formData.costo_impresion_material || 0}
              onChange={(e) => updateFormData('costo_impresion_material', parseFloat(e.target.value) || 0)}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              min="0"
              step="1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Costo Traslado</label>
            <input
              type="number"
              value={formData.costo_traslado || 0}
              onChange={(e) => updateFormData('costo_traslado', parseFloat(e.target.value) || 0)}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              min="0"
              step="1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Costo Logística Comida</label>
            <input
              type="number"
              value={formData.costo_logistica_comida || 0}
              onChange={(e) => updateFormData('costo_logistica_comida', parseFloat(e.target.value) || 0)}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              min="0"
              step="1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Costo Otros</label>
            <input
              type="number"
              value={formData.costo_otros || 0}
              onChange={(e) => updateFormData('costo_otros', parseFloat(e.target.value) || 0)}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              min="0"
              step="1"
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Detalles (para Capacitación)</label>
              <textarea
                value={formData.detalle_capacitacion || ''}
                onChange={(e) => updateFormData('detalle_capacitacion', e.target.value)}
                disabled={!isEditing && !isNew}
                tabIndex={!isEditing && !isNew ? -1 : 0}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={3}
                placeholder="Detalle del contenido de capacitación..."
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Costo Total (Referencia)</label>
              <input
                type="text"
                value={totalCost.toFixed(2)}
                disabled
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed font-semibold"
                readOnly
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CostCalculation
