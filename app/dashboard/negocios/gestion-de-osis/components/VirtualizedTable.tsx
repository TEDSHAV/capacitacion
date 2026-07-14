'use client'

import React, { useMemo, useCallback } from 'react'
import { OSI } from '@/types'

interface VirtualizedTableProps {
  osis: OSI[]
  onOSIClick: (osi: OSI) => void
  itemHeight?: number
  containerHeight?: number
}

export default function VirtualizedTable({ 
  osis, 
  onOSIClick, 
  itemHeight = 60,
  containerHeight = 600 
}: VirtualizedTableProps) {
  const [scrollTop, setScrollTop] = React.useState(0)

  // Calculate visible items
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      osis.length
    )
    
    return osis.slice(startIndex, endIndex).map((osi, index) => ({
      osi,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }))
  }, [osis, scrollTop, itemHeight, containerHeight])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const getStatusColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'activo':
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactivo':
      case 'inactive':
        return 'bg-red-100 text-red-800'
      case 'pendiente':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return 'N/A'
    }
  }

  if (osis.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay OSIs disponibles
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-7 gap-4 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div>N° OSI</div>
          <div>Empresa</div>
          <div>Servicio</div>
          <div>Estado</div>
          <div>Fecha Emisión</div>
          <div>Ejecutivo</div>
          <div>Presupuesto</div>
        </div>
      </div>

      {/* Virtualized Container */}
      <div 
        className="relative overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* Spacer for total height */}
        <div style={{ height: osis.length * itemHeight }} />
        
        {/* Visible Items */}
        {visibleItems.map(({ osi, index, top }) => (
          <div
            key={`${osi.id}-${index}`}
            className="absolute left-0 right-0 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
            style={{ 
              top,
              height: itemHeight
            }}
            onClick={() => onOSIClick(osi)}
          >
            <div className="grid grid-cols-7 gap-4 px-6 py-3 items-center text-sm">
              <div className="font-medium text-blue-600">
                {osi.nro_osi || 'N/A'}
              </div>
              <div className="truncate">
                {osi.cliente_nombre_empresa || 'N/A'}
              </div>
              <div className="truncate">
                {osi.tipo_servicio || 'N/A'}
              </div>
              <div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(osi.estado || '')}`}>
                  {osi.estado || 'N/A'}
                </span>
              </div>
              <div>
                {osi.fecha_emision ? 
                  (typeof osi.fecha_emision === 'string' ? formatDate(osi.fecha_emision) : formatDate(osi.fecha_emision.toISOString())) 
                  : 'N/A'
                }
              </div>
              <div className="truncate">
                {osi.executive_name || 'N/A'}
              </div>
              <div>
                {osi.nro_presupuesto || 'N/A'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
