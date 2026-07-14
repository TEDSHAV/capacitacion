'use client'

interface OSIActionButtonsProps {
  isNew: boolean
  isEditing: boolean
  isLoading: boolean
  onSave: () => void
  onCancel: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function OSIActionButtons({
  isNew,
  isEditing,
  isLoading,
  onSave,
  onCancel,
  onEdit,
  onDelete
}: OSIActionButtonsProps) {
  if (isEditing || isNew) {
    return (
      <>
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
            style={{ backgroundColor: '#dc2626', color: 'white' }}
          >
            Eliminar
          </button>
        )}
      </>
    )
  }

  return (
    <>
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
        style={{ backgroundColor: '#dc2626', color: 'white' }}
      >
        Eliminar
      </button>
    </>
  )
}
