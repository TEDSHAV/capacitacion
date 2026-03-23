'use client'

import React from 'react'
import { useOSIDataServerSafe } from './components/osi-data-provider-server-safe'

// This wrapper maintains the same API as the original OptimizedDataProvider
// but uses server actions internally
export default function OSIDataProviderWrapper({ children }: { children: any }) {
  const data = useOSIDataServerSafe()

  // Transform the data to match the expected API format
  const providerData = {
    ...data,
    // Maintain backward compatibility with existing component expectations
    recentFilter: false,
    selectedMonth: '',
    selectedLocation: '',
    selectedStatus: data.selectedEstado,
    setSelectedMonth: () => {},
    setSelectedLocation: () => {},
    setSelectedStatus: data.setSelectedEstado,
    setRecentFilter: () => {},
    setItemsPerPage: () => {}, // Fixed at 50 for server actions
    clearAllFilters: () => {
      data.setSearchTerm('')
      data.setSelectedEmpresa('')
      data.setSelectedEstado('')
    },
    hasActiveFilters: !!(data.searchTerm || data.selectedEmpresa || data.selectedEstado),
    monthOptions: [], // Not used in server actions version
    // Pagination calculations
    totalPages: Math.ceil(data.totalOsis / 50),
    startIndex: (data.currentPage - 1) * 50 + 1,
    endIndex: Math.min(data.currentPage * 50, data.totalOsis),
    currentItems: data.filteredOsis.slice(0, 50) // Show first 50 items
  }

  return children(providerData)
}
