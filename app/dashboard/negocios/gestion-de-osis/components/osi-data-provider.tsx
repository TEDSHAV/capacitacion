'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Empresa, Servicio, Usuario, CatalogoServicio, Contacto, OSI } from '@/types'
import ErrorDialog, { useErrorDialog } from '@/components/ui/error-dialog'

const supabase = createClient()

export function useOSIData() {
  const errorDialog = useErrorDialog()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [catalogoServicios, setCatalogoServicios] = useState<CatalogoServicio[]>([])
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [filteredEmpresas, setFilteredEmpresas] = useState<Empresa[]>([])
  const [filteredCatalogoServicios, setFilteredCatalogoServicios] = useState<CatalogoServicio[]>([])

  // Load servicios
  const loadServicios = async () => {
    try {
      const { data, error } = await supabase
        .from("tipo_servicio")
        .select("id, nombre")
        .order("nombre")
      
      if (error) {
        console.error('Error loading servicios:', error)
        errorDialog.showError(
          'Error al cargar los tipos de servicio',
          JSON.stringify(error, null, 2),
          'Error de Carga'
        )
        return
      }
      console.log('Servicios loaded:', data?.length || 0)
      setServicios(data || [])
    } catch (err) {
      console.error('Error in loadServicios:', err)
      errorDialog.showError(
        'Error inesperado al cargar servicios',
        err instanceof Error ? err.message : 'Error desconocido',
        'Error de Carga'
      )
    }
  }

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

  // Load catalogo servicios
  const loadCatalogoServicios = async (tipoServicio: string) => {
    try {
      const selectedServicio = servicios.find(s => s.nombre === tipoServicio)
      
      if (!selectedServicio) {
        setCatalogoServicios([])
        setFilteredCatalogoServicios([])
        return
      }

      const { data, error } = await supabase
        .from("catalogo_servicios")
        .select("id, nombre")
        .eq("tipo_servicio", selectedServicio.id)
        .order("nombre")
      
      if (error) {
        console.error('Error loading catalogo servicios:', error)
        errorDialog.showError(
          'Error al cargar el catálogo de servicios',
          JSON.stringify(error, null, 2),
          'Error de Carga'
        )
        return
      }
      console.log('Catalogo servicios loaded:', data?.length || 0)
      setCatalogoServicios(data || [])
      setFilteredCatalogoServicios(data || [])
    } catch (err) {
      console.error('Error in loadCatalogoServicios:', err)
      errorDialog.showError(
        'Error inesperado al cargar catálogo de servicios',
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

  // Load initial data
  const loadInitialData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      await Promise.all([
        loadServicios(),
        loadUsuarios(),
        loadEmpresas()
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
    servicios,
    usuarios,
    catalogoServicios,
    contactos,
    filteredEmpresas,
    filteredCatalogoServicios,
    setFilteredEmpresas,
    setFilteredCatalogoServicios,
    loadInitialData,
    loadCatalogoServicios,
    loadContactos
  }
}
