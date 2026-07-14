'use client'

import React from 'react'
import type { ErrorDialogProps } from '@/types'

export default function ErrorDialog({ 
  isOpen, 
  title = 'Error', 
  message, 
  details, 
  onClose, 
  variant = 'error' 
}: ErrorDialogProps) {
  if (!isOpen) return null

  const getIconAndColors = () => {
    switch (variant) {
      case 'error':
        return {
          icon: (
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          titleColor: 'text-red-800',
          messageColor: 'text-red-700'
        }
      case 'warning':
        return {
          icon: (
            <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          titleColor: 'text-yellow-800',
          messageColor: 'text-yellow-700'
        }
      case 'info':
        return {
          icon: (
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          titleColor: 'text-blue-800',
          messageColor: 'text-blue-700'
        }
      default:
        return {
          icon: (
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          titleColor: 'text-red-800',
          messageColor: 'text-red-700'
        }
    }
  }

  const { icon, bgColor, borderColor, titleColor, messageColor } = getIconAndColors()

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Dialog */}
        <div className="relative z-50 w-full max-w-md transform rounded-lg bg-white p-6 shadow-xl transition-all">
          {/* Header */}
          <div className={`flex items-center ${bgColor} p-4 -m-6 mb-4 ${borderColor} border-b`}>
            {icon}
            <h3 className={`ml-3 text-lg font-medium ${titleColor}`}>
              {title}
            </h3>
            <button
              onClick={onClose}
              className="ml-auto text-gray-400 hover:text-gray-500"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="mt-4">
            <p className={`text-sm ${messageColor}`}>
              {message}
            </p>
            
            {details && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                  Ver detalles técnicos
                </summary>
                <div className="mt-2 rounded bg-gray-50 p-3">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {details}
                  </pre>
                </div>
              </details>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for managing error dialog state
export function useErrorDialog() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [title, setTitle] = React.useState('Error')
  const [message, setMessage] = React.useState('')
  const [details, setDetails] = React.useState('')
  const [variant, setVariant] = React.useState<'error' | 'warning' | 'info'>('error')

  const showError = (error: Error | string, errorDetails?: string, dialogTitle?: string) => {
    setTitle(dialogTitle || 'Error')
    setMessage(typeof error === 'string' ? error : error.message)
    setDetails(errorDetails || '')
    setVariant('error')
    setIsOpen(true)
  }

  const showWarning = (warning: string, warningDetails?: string, dialogTitle?: string) => {
    setTitle(dialogTitle || 'Advertencia')
    setMessage(warning)
    setDetails(warningDetails || '')
    setVariant('warning')
    setIsOpen(true)
  }

  const showInfo = (info: string, infoDetails?: string, dialogTitle?: string) => {
    setTitle(dialogTitle || 'Información')
    setMessage(info)
    setDetails(infoDetails || '')
    setVariant('info')
    setIsOpen(true)
  }

  const close = () => setIsOpen(false)

  return {
    isOpen,
    title,
    message,
    details,
    variant,
    showError,
    showWarning,
    showInfo,
    close
  }
}
