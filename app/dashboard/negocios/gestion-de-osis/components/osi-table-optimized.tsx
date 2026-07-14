'use client'

import { memo, useCallback, useMemo } from 'react'
import { OSI, OptimizedOSITableProps } from '@/types'
import { ChevronRight } from 'lucide-react'

// Memoized row component to prevent unnecessary re-renders
const OSIRow = memo(({ osi, onOSIClick, getStatusColor }: { 
  osi: OSI
  onOSIClick: (osi: OSI) => void
  getStatusColor: (status: string) => string
}) => {
  const handleClick = () => onOSIClick(osi)
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onOSIClick(osi)
  }

  // Memoized date formatting
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'Sin fecha'
    
    const date = dateString instanceof Date ? dateString : new Date(dateString)
    return date.toLocaleDateString()
  }

  // Memoized status indicator
  const statusColor = useMemo(() => {
    switch (osi.estado) {
      case 'active':
      case 'activo':
        return 'bg-green-500'
      case 'pendiente':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }, [osi.estado])

  // Memoized status text
  const statusText = useMemo(() => {
    switch (osi.estado) {
      case 'active':
      case 'activo':
        return 'Activa'
      case 'pendiente':
        return 'Pendiente'
      default:
        return 'Cerrada'
    }
  }, [osi.estado])

  return (
    <div
      className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={handleClick}
    >
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* OSI Number */}
        <div className="col-span-2">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${statusColor}`}></div>
            <div>
              <div className="text-sm font-medium text-gray-900">{osi.nro_osi}</div>
              {osi.nro_presupuesto && (
                <div className="text-xs text-gray-500">Presupuesto: {osi.nro_presupuesto}</div>
              )}
            </div>
          </div>
        </div>

        {/* Client */}
        <div className="col-span-3">
          <div className="text-sm text-gray-900 font-medium truncate">
            {osi.cliente_nombre_empresa?.trim() || 'Sin cliente'}
          </div>
          {(osi.executive_name || osi.ejecutivo_negocios) && (
            <div className="text-xs text-gray-500">
              Ejecutivo: {osi.executive_name || `ID: ${osi.ejecutivo_negocios}`}
            </div>
          )}
        </div>

        {/* Service */}
        <div className="col-span-2">
          <div className="text-sm text-gray-900 truncate">
            {osi.tipo_servicio || 'Sin servicio'}
          </div>
          {osi.tema && (
            <div className="text-xs text-gray-500 truncate">{osi.tema}</div>
          )}
        </div>

        {/* Date */}
        <div className="col-span-2">
          <div className="text-sm text-gray-900">
            {formatDate(osi.fecha_servicio || osi.fecha_emision)}
          </div>
          {osi.nro_sesiones && (
            <div className="text-xs text-gray-500">{osi.nro_sesiones} sesiones</div>
          )}
        </div>

        {/* Status */}
        <div className="col-span-1">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(osi.estado || '')}`}>
            {statusText}
          </span>
        </div>

        {/* Actions */}
        <div className="col-span-2 text-right">
          <button
            onClick={handleButtonClick}
            className="inline-flex items-center px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium rounded-md hover:bg-blue-100 hover:border-blue-300 hover:text-blue-800 transition-colors duration-200"
          >
            Ver detalles
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  )
})

OSIRow.displayName = 'OSIRow'

export default memo(function OptimizedOSITable({ osis, onOSIClick, getStatusColor }: OptimizedOSITableProps) {
  // Memoized getStatusColor function
  const memoizedGetStatusColor = useCallback((status: string) => {
    switch (status) {
      case "active":
      case "activo":
        return "bg-green-100 text-green-800"
      case "pendiente":
        return "bg-yellow-100 text-yellow-800"
      case "cerrado":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }, [])

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-2">OSI</div>
          <div className="col-span-3">Cliente</div>
          <div className="col-span-2">Servicio</div>
          <div className="col-span-2">Fecha</div>
          <div className="col-span-1">Estado</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200">
        {osis.map((osi) => (
          <OSIRow
            key={osi.id}
            osi={osi}
            onOSIClick={onOSIClick}
            getStatusColor={memoizedGetStatusColor}
          />
        ))}
      </div>
    </div>
  )
})
