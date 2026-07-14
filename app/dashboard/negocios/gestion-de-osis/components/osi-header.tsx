'use client'

import { OSIHeaderProps } from '@/types'
import OSIActionButtons from './OSIActionButtons'

export default function OSIHeader({
  isNew,
  isEditing,
  isLoading,
  osiNumber,
  onSave,
  onCancel,
  onEdit,
  onDelete
}: OSIHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isNew ? 'New OSI' : `OSI ${osiNumber}`}
        </h1>
        <OSIActionButtons
          isNew={isNew}
          isEditing={isEditing}
          isLoading={isLoading}
          onSave={onSave}
          onCancel={onCancel}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}
