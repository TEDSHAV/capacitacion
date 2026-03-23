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

export function useOSIDataServer() {
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

      // Handle errors
      if (usuariosResult.error) {
        throw new Error(usuariosResult.error)
      }
      if (empresasResult.error) {
        throw new Error(empresasResult.error)
      }
      if (cursosResult.error) {
        throw new Error(cursosResult.error)
      }
      if (contactosResult.error) {
        throw new Error(contactosResult.error)
      }
      if (serviciosResult.error) {
        throw new Error(serviciosResult.error)
      }

      // Set data
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

    } catch (err) {
      console.error('Error loading initial data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      
      errorDialog.showError(
        'Error al cargar los datos iniciales',
        errorMessage,
        'Error de Carga'
      )
    } finally {
      setLoading(false)
    }
  }, [errorDialog])

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

  // Get OSIs with filters
  const getFilteredOSIs = useCallback(async (filters?: {
    search?: string;
    empresa?: string;
    estado?: string;
    page?: number;
    limit?: number;
  }) => {
    try {
      const result = await getOSIs(filters)
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      return result
    } catch (err) {
      console.error('Error getting filtered OSIs:', err)
      errorDialog.showError(
        'Error al filtrar las OSIs',
        err instanceof Error ? err.message : 'Error desconocido',
        'Error de Búsqueda'
      )
      return { osis: [], total: 0, page: 1, limit: 50 }
    }
  }, [errorDialog])

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
    filterEmpresas,
    filterCursos,
    getFilteredOSIs,
    refetch: loadInitialData
  }
}
