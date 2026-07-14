'use client'

import type { OSIActionButtonsProps } from '@/types'

const OSIActionButtons = ({
  isNew,
  isEditing,
  isLoading,
  onSave,
  onCancel,
  onEdit,
  onDelete
}: OSIActionButtonsProps) => {
  if (isEditing || isNew) {
    return (
      <div className="flex gap-4">
        <button
          onClick={onSave}
          disabled={isLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-md"
          style={{ backgroundColor: 'var(--primary-blue)' }}
        >
          {isLoading ? 'Guardando...' : (isNew ? 'Crear' : 'Actualizar')}
        </button>
        {!isNew && (
          <button
            onClick={onCancel}
            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors shadow-md"
            style={{ backgroundColor: 'var(--primary-gray)' }}
          >
            Cancelar
          </button>
        )}
        {!isNew && (
          <button
            onClick={onDelete}
            className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors shadow-md"
            style={{ backgroundColor: 'var(--primary-red)' }}
          >
            Eliminar
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex gap-4">
      <button
        onClick={onEdit}
        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-md"
        style={{ backgroundColor: 'var(--primary-blue)' }}
      >
        Editar
      </button>
      <button
        onClick={onDelete}
        className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors shadow-md"
        style={{ backgroundColor: 'var(--primary-red)' }}
      >
        Eliminar
      </button>
    </div>
  )
}

export default OSIActionButtons
