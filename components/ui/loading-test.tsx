'use client'

import { useState } from 'react'
import LoadingSpinner from './loading-spinner'

export default function LoadingTest() {
  const [showLoading, setShowLoading] = useState(false)

  const toggleLoading = () => {
    setShowLoading(!showLoading)
  }

  if (showLoading) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">Loading Spinner Test</h2>
        <p className="mb-4">Testing centered loading spinner...</p>
        <LoadingSpinner message="Probando el spinner centrado..." color="blue" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Loading Spinner Test</h2>
      <button 
        onClick={toggleLoading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Show Loading Spinner
      </button>
    </div>
  )
}
