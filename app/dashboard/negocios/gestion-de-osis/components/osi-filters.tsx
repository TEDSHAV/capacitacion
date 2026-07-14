'use client'

import { useState } from 'react'

interface OSIFiltersProps {
  searchTerm: string
  selectedMonth: string
  selectedStatus: string
  selectedLocation: string
  recentFilter: string
  onSearchChange: (value: string) => void
  onMonthChange: (value: string) => void
  onStatusChange: (value: string) => void
  onLocationChange: (value: string) => void
  onRecentChange: (value: string) => void
  onClearFilters: () => void
  monthOptions: { value: string; label: string }[]
  hasActiveFilters: boolean
}

export default function OSIFilters({
  searchTerm,
  selectedMonth,
  selectedStatus,
  selectedLocation,
  recentFilter,
  onSearchChange,
  onMonthChange,
  onStatusChange,
  onLocationChange,
  onRecentChange,
  onClearFilters,
  monthOptions,
  hasActiveFilters
}: OSIFiltersProps) {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de OSIs
          </h1>
          <p className="mt-2 text-gray-600">
            Administración de Órdenes de Servicio de Ingeniería
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/dashboard/negocios/gestion-de-osis/new'}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-md"
          style={{ backgroundColor: 'var(--primary-blue)' }}
        >
          + Nueva OSI
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por número de OSI, cliente, servicio o presupuesto..."
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search Results Count */}
      {searchTerm && (
        <div className="mt-2 text-sm text-gray-600">
          Resultados para "{searchTerm}"
        </div>
      )}

      {/* Filter Dropdowns */}
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Todos los meses</option>
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activa</option>
            <option value="pendiente">Pendiente</option>
            <option value="cerrado">Cerrada</option>
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
          <input
            type="text"
            value={selectedLocation}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="Ciudad, dirección, etc..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm placeholder-gray-500"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Recientes</label>
          <select
            value={recentFilter}
            onChange={(e) => onRecentChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Todas las fechas</option>
            <option value="7days">Últimos 7 días</option>
            <option value="30days">Últimos 30 días</option>
            <option value="90days">Últimos 90 días</option>
          </select>
        </div>

        {hasActiveFilters && (
          <div className="flex items-end">
            <button
              onClick={onClearFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {searchTerm && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Búsqueda: {searchTerm}
              <button
                onClick={() => onSearchChange('')}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          {selectedMonth && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Mes: {monthOptions.find(m => m.value === selectedMonth)?.label}
              <button
                onClick={() => onMonthChange('')}
                className="ml-2 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          )}
          {selectedStatus && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Estado: {selectedStatus === 'active' ? 'Activa' : selectedStatus === 'pendiente' ? 'Pendiente' : 'Cerrada'}
              <button
                onClick={() => onStatusChange('')}
                className="ml-2 text-yellow-600 hover:text-yellow-800"
              >
                ×
              </button>
            </span>
          )}
          {selectedLocation && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Ubicación: {selectedLocation}
              <button
                onClick={() => onLocationChange('')}
                className="ml-2 text-orange-600 hover:text-orange-800"
              >
                ×
              </button>
            </span>
          )}
          {recentFilter && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Recientes: {recentFilter === '7days' ? 'Últimos 7 días' : recentFilter === '30days' ? 'Últimos 30 días' : 'Últimos 90 días'}
              <button
                onClick={() => onRecentChange('')}
                className="ml-2 text-purple-600 hover:text-purple-800"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
