import { memo } from 'react'
import { LoadingSpinnerProps } from '@/types'

const LoadingSpinner = memo(({ 
  message = 'Cargando...', 
  color = 'blue',
  size = 'md',
  className = ''
}: LoadingSpinnerProps) => {
  const colorClasses = {
    blue: 'border-blue-600',
    purple: 'border-purple-600',
    indigo: 'border-indigo-600',
    green: 'border-green-600',
    red: 'border-red-600'
  }

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }

  return (
    <div className={`min-h-screen bg-white flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div 
          className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 ${colorClasses[color]} mx-auto mb-4`}
        />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
})

LoadingSpinner.displayName = 'LoadingSpinner'

export default LoadingSpinner
