'use client'

import { useState, useEffect, useCallback } from 'react'
import { Empresa, Usuario, Contacto, OSI } from '@/types'
import ErrorDialog, { useErrorDialog } from '@/components/ui/error-dialog'
import { 
  getOSIUsuarios, 
  getOSIEmpresas, 
  getOSICursos, 
  getOSIContactos, 
  getOSIServicios,
  getOSIs 
} from '@/app/actions/osi'

export function useOSIDataServerSafe() {
  const errorDialog = useErrorDialog()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cursos, setCursos] = useState<any[]>([])
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [servicios, setServicios] = useState<any[]>([])
  const [filteredEmpresas, setFilteredEmpresas] = useState<Empresa[]>([])
  const [filteredCursos, setFilteredCursos] = useState<any[]>([])
  const [osis, setOsis] = useState<OSI[]>([])
  const [filteredOsis, setFilteredOsis] = useState<OSI[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmpresa, setSelectedEmpresa] = useState('')
  const [selectedEstado, setSelectedEstado] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalOsis, setTotalOsis] = useState(0)

  // Load all data in parallel using server actions
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Parallel execution of server actions
      const [
        usuariosResult,
        empresasResult,
        cursosResult,
        contactosResult,
        serviciosResult
      ] = await Promise.all([
        getOSIUsuarios(),
        getOSIEmpresas(),
        getOSICursos(),
        getOSIContactos(),
        getOSIServicios()
      ])

      // Handle errors gracefully - server actions now always return data, never error properties
      if (usuariosResult.usuarios.length === 0) {
        // No usuarios found or table missing
      }
      if (empresasResult.empresas.length === 0) {
        // No empresas found or table missing
      }
      if (cursosResult.cursos.length === 0) {
        // No cursos found or table missing
      }
      if (contactosResult.contactos.length === 0) {
        // No contactos found or table missing
      }
      if (serviciosResult.servicios.length === 0) {
        // No servicios found or table missing
      }

      // Set data even if some requests failed
      setUsuarios(usuariosResult.usuarios || [])
      setEmpresas(empresasResult.empresas || [])
      setCursos(cursosResult.cursos || [])
      setContactos((contactosResult.contactos || []).map(contacto => ({
        ...contacto,
        nombre: contacto.nombre_apellido?.split(' ')[0] || '',
        apellido: contacto.nombre_apellido?.split(' ').slice(1).join(' ') || ''
      })))
      setServicios(serviciosResult.servicios || [])
      setFilteredEmpresas(empresasResult.empresas || [])
      setFilteredCursos(cursosResult.cursos || [])

      // Load OSIs with initial filters
      await loadOSIs()

    } catch (err) {
      console.error('Error loading initial data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load OSIs with current filters
  const loadOSIs = useCallback(async () => {
    try {
      const result = await getOSIs({
        search: searchTerm,
        empresa: selectedEmpresa,
        estado: selectedEstado,
        page: currentPage,
        limit: 50
      })
      
      // Server actions now always return data, never error properties
      setOsis(result.osis || [])
      setFilteredOsis(result.osis || [])
      setTotalOsis(result.total || 0)
    } catch (err) {
      setOsis([])
      setFilteredOsis([])
      setTotalOsis(0)
    }
  }, [searchTerm, selectedEmpresa, selectedEstado, currentPage])

  // Filter empresas
  const filterEmpresas = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredEmpresas(empresas)
    } else {
      const filtered = empresas.filter(empresa =>
        empresa.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empresa.rif.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredEmpresas(filtered)
    }
  }, [empresas])

  // Filter cursos
  const filterCursos = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredCursos(cursos)
    } else {
      const filtered = cursos.filter(curso =>
        curso.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredCursos(filtered)
    }
  }, [cursos])

  // Update search term and reload OSIs
  const handleSearchTermChange = useCallback((newSearchTerm: string) => {
    setSearchTerm(newSearchTerm)
    setCurrentPage(1) // Reset to first page when searching
  }, [])

  // Update filters and reload OSIs
  const handleFilterChange = useCallback((filters: {
    empresa?: string
    estado?: string
  }) => {
    if (filters.empresa !== undefined) setSelectedEmpresa(filters.empresa)
    if (filters.estado !== undefined) setSelectedEstado(filters.estado)
    setCurrentPage(1) // Reset to first page when filtering
  }, [])

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage)
  }, [])

  // Reload OSIs when filters change
  useEffect(() => {
    if (!loading) {
      loadOSIs()
    }
  }, [loadOSIs, loading])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  return {
    loading,
    error,
    empresas,
    usuarios,
    cursos,
    contactos,
    servicios,
    filteredEmpresas,
    filteredCursos,
    osis,
    filteredOsis,
    searchTerm,
    selectedEmpresa,
    selectedEstado,
    currentPage,
    totalOsis,
    itemsPerPage: 50,
    filterEmpresas,
    filterCursos,
    setSearchTerm: handleSearchTermChange,
    setSelectedEmpresa: (empresa: string) => handleFilterChange({ empresa }),
    setSelectedEstado: (estado: string) => handleFilterChange({ estado }),
    setCurrentPage: handlePageChange,
    refetch: loadInitialData
  }
}
