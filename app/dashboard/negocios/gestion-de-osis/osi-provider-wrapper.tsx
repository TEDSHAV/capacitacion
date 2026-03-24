'use client'

import React from 'react'
import { useOSIDataOptimized } from './components/osi-data-provider-optimized-react-query'

// Optimized wrapper using React Query with server actions
export default function OSIDataProviderWrapper({ children }: { children: any }) {
  const data = useOSIDataOptimized()

  // Clean API transformation - only include what's actually used
  const providerData = {
    // Core data
    osis: data.osis,
    filteredOsis: data.filteredOsis,
    loading: data.loading,
    
    // Filter state
    searchTerm: data.searchTerm,
    selectedStatus: data.selectedEstado,
    
    // Pagination
    currentPage: data.currentPage,
    totalPages: Math.ceil(data.totalOsis / 50),
    itemsPerPage: 50,
    startIndex: (data.currentPage - 1) * 50 + 1,
    endIndex: Math.min(data.currentPage * 50, data.totalOsis),
    currentItems: data.filteredOsis.slice(0, 50),
    
    // Actions
    setSearchTerm: data.setSearchTerm,
    setSelectedStatus: data.setSelectedEstado,
    setCurrentPage: data.setCurrentPage,
    clearAllFilters: () => {
      data.setSearchTerm('')
      data.setSelectedEmpresa('')
      data.setSelectedEstado('')
    },
    
    // State helpers
    hasActiveFilters: !!(data.searchTerm || data.selectedEmpresa || data.selectedEstado),
    
    // Legacy compatibility (deprecated but kept for backwards compatibility)
    recentFilter: false,
    selectedMonth: '',
    selectedLocation: '',
    selectedEmpresa: data.selectedEmpresa,
    setSelectedMonth: () => {},
    setSelectedLocation: () => {},
    setSelectedEmpresa: data.setSelectedEmpresa,
    setRecentFilter: () => {},
    setItemsPerPage: () => {},
    monthOptions: [],
    
    // Additional data for forms
    empresas: data.empresas,
    usuarios: data.usuarios,
    cursos: data.cursos,
    contactos: data.contactos,
    servicios: data.servicios,
    filteredEmpresas: data.filteredEmpresas,
    filteredCursos: data.filteredCursos,
    filterEmpresas: data.filterEmpresas,
    filterCursos: data.filterCursos,
    
    // Error handling
    error: data.error,
    refetch: data.refetch
  }

  return children(providerData)
}
