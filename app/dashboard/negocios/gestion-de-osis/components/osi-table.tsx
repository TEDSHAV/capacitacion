'use client'

import { OSI } from '@/types'
import { ChevronRight } from 'lucide-react'

interface OSITableProps {
  osis: OSI[]
  onOSIClick: (osi: OSI) => void
  getStatusColor: (status: string) => string
}

export default function OSITable({ osis, onOSIClick, getStatusColor }: OSITableProps) {
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
          <div
            key={osi.id}
            className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => onOSIClick(osi)}
          >
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* OSI Number */}
              <div className="col-span-2">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${
                    osi.estado === 'active' || osi.estado === 'activo' ? 'bg-green-500' : 
                    osi.estado === 'pendiente' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}></div>
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
                {osi.ejecutivo_negocios && (
                  <div className="text-xs text-gray-500">Ejecutivo: {osi.ejecutivo_negocios}</div>
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
                  {osi.fecha_servicio ? 
                    (osi.fecha_servicio instanceof Date ? 
                      osi.fecha_servicio.toLocaleDateString() : 
                      new Date(osi.fecha_servicio).toLocaleDateString()
                    ) : 
                    osi.fecha_emision ? 
                      (osi.fecha_emision instanceof Date ? 
                        osi.fecha_emision.toLocaleDateString() : 
                        new Date(osi.fecha_emision).toLocaleDateString()
                      ) : 
                      'Sin fecha'
                  }
                </div>
                {osi.nro_sesiones && (
                  <div className="text-xs text-gray-500">{osi.nro_sesiones} sesiones</div>
                )}
              </div>

              {/* Status */}
              <div className="col-span-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(osi.estado || '')}`}>
                  {osi.estado === 'active' || osi.estado === 'activo' ? 'Activa' : 
                   osi.estado === 'pendiente' ? 'Pendiente' : 'Cerrada'}
                </span>
              </div>

              {/* Actions */}
              <div className="col-span-2 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onOSIClick(osi)
                  }}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium rounded-md hover:bg-blue-100 hover:border-blue-300 hover:text-blue-800 transition-colors duration-200"
                >
                  Ver detalles
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
