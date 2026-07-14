'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Empresa, Usuario, Contacto, OSI } from '@/types'
import ErrorDialog, { useErrorDialog } from '@/components/ui/error-dialog'

const supabase = createClient()

export function useOSIData() {
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

  // Load usuarios
  const loadUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombre_apellido")
        .eq("departamento", 2)
        .in("rol", [10, 2])
        .order("nombre_apellido")
      
      if (error) {
        console.error('Error loading usuarios:', error)
        errorDialog.showError(
          'Error al cargar los usuarios',
          JSON.stringify(error, null, 2),
          'Error de Carga'
        )
        return
      }
      console.log('Usuarios loaded:', data?.length || 0)
      setUsuarios(data || [])
    } catch (err) {
      console.error('Error in loadUsuarios:', err)
      errorDialog.showError(
        'Error inesperado al cargar usuarios',
        err instanceof Error ? err.message : 'Error desconocido',
        'Error de Carga'
      )
    }
  }

  // Load empresas
  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
        .order("razon_social")
      
      if (error) {
        errorDialog.showError(
          'Error al cargar las empresas',
          JSON.stringify(error, null, 2),
          'Error de Carga'
        )
        return
      }
      console.log('Empresas loaded:', data?.length || 0)
      setEmpresas(data || [])
      setFilteredEmpresas(data || [])
    } catch (err) {
      console.error('Error in loadEmpresas:', err)
      errorDialog.showError(
        'Error inesperado al cargar empresas',
        err instanceof Error ? err.message : 'Error desconocido',
        'Error de Carga'
      )
    }
  }

  // Load cursos (for capacitacion)
  const loadCursos = async () => {
    try {
      const { data, error } = await supabase
        .from("cursos")
        .select("id, nombre, contenido, cliente_asociado, created_at, nota_aprobatoria")
        .eq("is_active", true)
        .order("nombre")
      
      if (error) {
        console.error('Error loading cursos:', error)
        errorDialog.showError(
          'Error al cargar los cursos',
          JSON.stringify(error, null, 2),
          'Error de Carga'
        )
        return
      }
      console.log('Cursos loaded:', data?.length || 0)
      setCursos(data || [])
      setFilteredCursos(data || [])
    } catch (err) {
      console.error('Error in loadCursos:', err)
      errorDialog.showError(
        'Error inesperado al cargar cursos',
        err instanceof Error ? err.message : 'Error desconocido',
        'Error de Carga'
      )
    }
  }

  // Load contactos
  const loadContactos = async (empresaId: string) => {
    try {
      const { data, error } = await supabase
        .from("contactos")
        .select("*")
        .eq("id_empresa", empresaId)
        .order("nombre")
      
      if (error) {
        console.error('Error loading contactos:', error)
        errorDialog.showError(
          'Error al cargar los contactos',
          JSON.stringify(error, null, 2),
          'Error de Carga'
        )
        return
      }
      console.log('Contactos loaded:', data?.length || 0)
      setContactos(data || [])
    } catch (err) {
      console.error('Error in loadContactos:', err)
      errorDialog.showError(
        'Error inesperado al cargar contactos',
        err instanceof Error ? err.message : 'Error desconocido',
        'Error de Carga'
      )
    }
  }

  // Load tipos de servicio
  const loadTiposServicio = async () => {
    try {
      const { data, error } = await supabase
        .from("tipo_servicio")
        .select("id, nombre")
        .order("nombre")
      
      if (error) {
        console.error('Error loading tipos de servicio:', error)
        errorDialog.showError(
          'Error al cargar los tipos de servicio',
          JSON.stringify(error, null, 2),
          'Error de Carga'
        )
        return
      }
      console.log('Tipos de servicio loaded:', data?.length || 0)
      setServicios(data || [])
    } catch (err) {
      console.error('Error in loadTiposServicio:', err)
      errorDialog.showError(
        'Error inesperado al cargar tipos de servicio',
        err instanceof Error ? err.message : 'Error desconocido',
        'Error de Carga'
      )
    }
  }

  // Load initial data
  const loadInitialData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      await Promise.all([
        loadUsuarios(),
        loadEmpresas(),
        loadCursos(),
        loadTiposServicio()
      ])
    } catch (err) {
      setError('Error al cargar los datos iniciales')
    } finally {
      setLoading(false)
    }
  }

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
    setFilteredEmpresas,
    setFilteredCursos,
    loadInitialData,
    loadContactos
  }
}
