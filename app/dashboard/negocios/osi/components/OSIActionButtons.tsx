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
          className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md"
          style={{ backgroundColor: '#4f46e5', color: 'white' }}
        >
          {isLoading ? 'Guardando...' : (isNew ? 'Crear' : 'Actualizar')}
        </button>
        {!isNew && (
          <button
            onClick={onCancel}
            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors shadow-md"
            style={{ backgroundColor: '#4b5563', color: 'white' }}
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
        className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors shadow-md"
        style={{ backgroundColor: '#4f46e5', color: 'white' }}
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
