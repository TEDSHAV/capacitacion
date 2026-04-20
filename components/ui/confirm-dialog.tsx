'use client'

import React from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title = 'Confirmar',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const isDanger = variant === 'danger'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onCancel}
        />

        {/* Dialog */}
        <div className="relative z-50 w-full max-w-md transform rounded-lg bg-white p-6 shadow-xl transition-all">
          {/* Header */}
          <div className={`flex items-center ${isDanger ? 'bg-red-50' : 'bg-yellow-50'} p-4 -m-6 mb-4 ${isDanger ? 'border-red-200' : 'border-yellow-200'} border-b`}>
            <svg
              className={`h-6 w-6 ${isDanger ? 'text-red-600' : 'text-yellow-600'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className={`ml-3 text-lg font-medium ${isDanger ? 'text-red-800' : 'text-yellow-800'}`}>
              {title}
            </h3>
          </div>

          {/* Message */}
          <div className="mt-4">
            <p className="text-sm text-gray-700">{message}</p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors shadow-md"
              style={{ backgroundColor: 'var(--primary-gray)' }}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`px-6 py-2 rounded-md text-white transition-colors shadow-md ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [config, setConfig] = React.useState<{
    title?: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'warning'
    onConfirm: () => void
  }>({ message: '', onConfirm: () => {} })

  const confirm = (options: {
    title?: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'warning'
    onConfirm: () => void
  }) => {
    setConfig(options)
    setIsOpen(true)
  }

  const handleConfirm = () => {
    setIsOpen(false)
    config.onConfirm()
  }

  const handleCancel = () => setIsOpen(false)

  const dialog = (
    <ConfirmDialog
      isOpen={isOpen}
      title={config.title}
      message={config.message}
      confirmLabel={config.confirmLabel}
      cancelLabel={config.cancelLabel}
      variant={config.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )

  return { confirm, dialog }
}
