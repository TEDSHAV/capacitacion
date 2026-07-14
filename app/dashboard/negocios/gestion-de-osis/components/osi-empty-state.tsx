'use client'

interface OSIEmpyStateProps {
  hasFilters: boolean
  onClearFilters: () => void
  onCreateNew: () => void
}

export default function OSIEmptyState({ hasFilters, onClearFilters, onCreateNew }: OSIEmpyStateProps) {
  if (hasFilters) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 rounded-lg p-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron resultados</h3>
          <p className="text-gray-500 mb-4">No hay OSIs que coincidan con los filtros aplicados</p>
          <button
            onClick={onClearFilters}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Limpiar todos los filtros
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <div className="bg-gray-50 rounded-lg p-8">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay OSI registradas</h3>
        <p className="text-gray-500 mb-4">Comienza creando tu primera Orden de Servicio de Ingeniería</p>
        <button
          onClick={onCreateNew}
          className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          + Crear Primera OSI
        </button>
      </div>
    </div>
  )
}
