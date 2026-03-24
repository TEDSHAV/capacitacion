'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Empresa, Usuario, Contacto, OSI } from '@/types'
import { 
  getOSIUsuarios, 
  getOSIEmpresas, 
  getOSICursos, 
  getOSIContactos, 
  getOSIServicios,
  getOSIs 
} from '@/app/actions/osi'

interface OSIFilters {
  search?: string
  empresa?: string
  estado?: string
}

interface OSIDataResult {
  loading: boolean
  error: string | null
  empresas: Empresa[]
  usuarios: Usuario[]
  cursos: any[]
  contactos: Contacto[]
  servicios: any[]
  filteredEmpresas: Empresa[]
  filteredCursos: any[]
  osis: OSI[]
  filteredOsis: OSI[]
  searchTerm: string
  selectedEmpresa: string
  selectedEstado: string
  currentPage: number
  totalOsis: number
  itemsPerPage: number
  filterEmpresas: (term: string) => void
  filterCursos: (term: string) => void
  setSearchTerm: (term: string) => void
  setSelectedEmpresa: (empresa: string) => void
  setSelectedEstado: (estado: string) => void
  setCurrentPage: (page: number) => void
  refetch: () => void
}

export function useOSIDataOptimized(): OSIDataResult {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmpresa, setSelectedEmpresa] = useState('')
  const [selectedEstado, setSelectedEstado] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [filteredEmpresas, setFilteredEmpresas] = useState<Empresa[]>([])
  const [filteredCursos, setFilteredCursos] = useState<any[]>([])

  // Static data queries with caching
  const { data: usuariosData } = useQuery({
    queryKey: ['osi-usuarios'],
    queryFn: getOSIUsuarios,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: empresasData } = useQuery({
    queryKey: ['osi-empresas'],
    queryFn: getOSIEmpresas,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: cursosData } = useQuery({
    queryKey: ['osi-cursos'],
    queryFn: getOSICursos,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: contactosData } = useQuery({
    queryKey: ['osi-contactos'],
    queryFn: getOSIContactos,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: serviciosData } = useQuery({
    queryKey: ['osi-servicios'],
    queryFn: getOSIServicios,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Dynamic OSI query with filters
  const { data: osisData, isLoading: osisLoading, error: osisError } = useQuery({
    queryKey: ['osis', { search: searchTerm, empresa: selectedEmpresa, estado: selectedEstado, page: currentPage }],
    queryFn: () => getOSIs({
      search: searchTerm,
      empresa: selectedEmpresa,
      estado: selectedEstado,
      page: currentPage,
      limit: 50
    }),
    staleTime: 30 * 1000, // 30 seconds
  })

  // Initialize filtered data when static data loads
  const empresas = empresasData?.empresas || []
  const cursos = cursosData?.cursos || []
  const usuarios = usuariosData?.usuarios || []
  const contactos = contactosData?.contactos?.map(contacto => ({
    ...contacto,
    nombre: contacto.nombre_apellido?.split(' ')[0] || '',
    apellido: contacto.nombre_apellido?.split(' ').slice(1).join(' ') || ''
  })) || []
  const servicios = serviciosData?.servicios || []

  // Initialize filtered arrays
  useState(() => {
    setFilteredEmpresas(empresas)
    setFilteredCursos(cursos)
  })

  const osis = osisData?.osis || []
  const totalOsis = osisData?.total || 0

  // Filter functions
  const filterEmpresas = useCallback((term: string) => {
    if (!term.trim()) {
      setFilteredEmpresas(empresas)
    } else {
      const filtered = empresas.filter(empresa =>
        empresa.razon_social.toLowerCase().includes(term.toLowerCase()) ||
        empresa.rif.toLowerCase().includes(term.toLowerCase())
      )
      setFilteredEmpresas(filtered)
    }
  }, [empresas])

  const filterCursos = useCallback((term: string) => {
    if (!term.trim()) {
      setFilteredCursos(cursos)
    } else {
      const filtered = cursos.filter(curso =>
        curso.nombre.toLowerCase().includes(term.toLowerCase())
      )
      setFilteredCursos(filtered)
    }
  }, [cursos])

  const handleSearchTermChange = useCallback((newSearchTerm: string) => {
    setSearchTerm(newSearchTerm)
    setCurrentPage(1) // Reset to first page when searching
  }, [])

  const handleFilterChange = useCallback((filters: OSIFilters) => {
    if (filters.empresa !== undefined) setSelectedEmpresa(filters.empresa)
    if (filters.estado !== undefined) setSelectedEstado(filters.estado)
    setCurrentPage(1) // Reset to first page when filtering
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage)
  }, [])

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['osis'] })
    queryClient.invalidateQueries({ queryKey: ['osi-usuarios'] })
    queryClient.invalidateQueries({ queryKey: ['osi-empresas'] })
    queryClient.invalidateQueries({ queryKey: ['osi-cursos'] })
    queryClient.invalidateQueries({ queryKey: ['osi-contactos'] })
    queryClient.invalidateQueries({ queryKey: ['osi-servicios'] })
  }, [queryClient])

  return {
    loading: osisLoading,
    error: osisError ? (osisError as Error).message : null,
    empresas,
    usuarios,
    cursos,
    contactos,
    servicios,
    filteredEmpresas,
    filteredCursos,
    osis,
    filteredOsis: osis, // Server-side filtering makes this the same as osis
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
    refetch
  }
}
