'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { OSI, OptimizedDataProviderProps } from '@/types'

export default function OptimizedDataProvider({ children }: OptimizedDataProviderProps) {
  const [osis, setOsis] = useState<OSI[]>([])
  const [filteredOsis, setFilteredOsis] = useState<OSI[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")
  const [selectedLocation, setSelectedLocation] = useState("")
  const [recentFilter, setRecentFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const supabase = createClient()

  // Memoized executive map to avoid recalculating
  const executiveMap = useMemo(() => new Map<string, string>(), [])

  // Optimized data fetching with caching
  useEffect(() => {
    let mounted = true
    const controller = new AbortController()

    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch users and OSI data in parallel
        const [usersResponse, osiResponse] = await Promise.all([
          supabase
            .from("usuarios")
            .select("id, nombre_apellido")
            .abortSignal(controller.signal),
          supabase
            .from("osi")
            .select("*")
            .eq("is_active", true)
            .order("fecha_emision", { ascending: false })
            .limit(100)
            .abortSignal(controller.signal)
        ])

        if (!mounted) return

        // Create executive map
        const newExecutiveMap = new Map(
          usersResponse.data?.map((user) => [user.id, user.nombre_apellido]) || []
        )

        // Map executive names to OSI data
        const osiDataWithExecutiveNames = osiResponse.data?.map(osi => ({
          ...osi,
          executive_name: newExecutiveMap.get(osi.ejecutivo_negocios)
        })) || []

        setOsis(osiDataWithExecutiveNames)
        setFilteredOsis(osiDataWithExecutiveNames)
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error("Error loading data:", error)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      mounted = false
      controller.abort()
    }
  }, [])

  // Optimized filtering with useCallback
  const filterOsis = useCallback(() => {
    let filtered = [...osis]

    // Search filter - optimized with early returns
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (osi) =>
          (osi.nro_osi?.toLowerCase().includes(lowerSearchTerm)) ||
          (osi.cliente_nombre_empresa?.toLowerCase().includes(lowerSearchTerm)) ||
          (osi.tipo_servicio?.toLowerCase().includes(lowerSearchTerm)) ||
          (osi.nro_presupuesto?.toLowerCase().includes(lowerSearchTerm)) ||
          (osi.tema?.toLowerCase().includes(lowerSearchTerm))
      )
    }

    // Month filter
    if (selectedMonth) {
      filtered = filtered.filter((osi) => {
        if (!osi.fecha_emision) return false
        const osiDate = new Date(osi.fecha_emision)
        const monthYear = `${osiDate.getFullYear()}-${String(osiDate.getMonth() + 1).padStart(2, "0")}`
        return monthYear === selectedMonth
      })
    }

    // Status filter
    if (selectedStatus) {
      filtered = filtered.filter((osi) => {
        if (selectedStatus === "active") {
          return osi.estado === "active" || osi.estado === "activo"
        }
        return osi.estado === selectedStatus
      })
    }

    // Location filter
    if (selectedLocation) {
      const lowerLocation = selectedLocation.toLowerCase()
      filtered = filtered.filter((osi) => {
        const locationMatch =
          (osi.direccion_ejecucion?.toLowerCase().includes(lowerLocation)) ||
          (osi.direccion_envio?.toLowerCase().includes(lowerLocation))
        return locationMatch
      })
    }

    // Recent filter - optimized date calculations
    if (recentFilter) {
      const now = new Date()
      const daysMap = { "7days": 7, "30days": 30, "90days": 90 }
      const daysLimit = daysMap[recentFilter as keyof typeof daysMap]
      
      if (daysLimit) {
        filtered = filtered.filter((osi) => {
          if (!osi.fecha_emision) return false
          const osiDate = new Date(osi.fecha_emision)
          const daysDiff = Math.floor((now.getTime() - osiDate.getTime()) / (1000 * 60 * 60 * 24))
          return daysDiff <= daysLimit
        })
      }
    }

    setFilteredOsis(filtered)
    setCurrentPage(1)
  }, [osis, searchTerm, selectedMonth, selectedStatus, selectedLocation, recentFilter])

  // Debounced filtering to avoid excessive recalculations
  useEffect(() => {
    const timeoutId = setTimeout(filterOsis, 300)
    return () => clearTimeout(timeoutId)
  }, [filterOsis])

  // Memoized month options
  const monthOptions = useMemo(() => {
    const months = []
    const now = new Date()
    const currentYear = now.getFullYear()

    for (let year = currentYear; year >= currentYear - 1; year--) {
      for (let month = 12; month >= 1; month--) {
        const date = new Date(year, month - 1)
        const monthYear = `${year}-${String(month).padStart(2, "0")}`
        const monthName = date.toLocaleDateString("es-ES", {
          month: "long",
          year: "numeric",
        }) || ""
        months.push({
          value: monthYear,
          label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        })
      }
    }
    return months
  }, [])

  // Memoized clear filters function
  const clearAllFilters = useCallback(() => {
    setSearchTerm("")
    setSelectedMonth("")
    setSelectedStatus("")
    setSelectedLocation("")
    setRecentFilter("")
    setCurrentPage(1)
  }, [])

  // Memoized active filters check
  const hasActiveFilters = useMemo(() => 
    Boolean(searchTerm || selectedMonth || selectedStatus || selectedLocation || recentFilter),
    [searchTerm, selectedMonth, selectedStatus, selectedLocation, recentFilter]
  )

  return children({
    osis,
    filteredOsis,
    loading,
    searchTerm,
    selectedMonth,
    selectedStatus,
    selectedLocation,
    recentFilter,
    currentPage,
    itemsPerPage,
    setSearchTerm,
    setSelectedMonth,
    setSelectedStatus,
    setSelectedLocation,
    setRecentFilter,
    setCurrentPage,
    setItemsPerPage,
    clearAllFilters,
    hasActiveFilters,
    monthOptions
  })
}
