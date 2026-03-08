import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Empresa {
  id: string;
  razon_social: string;
  rif: string;
  direccion_fiscal: string;
  codigo_cliente: string;
}

interface Servicio {
  id: number;
  nombre: string;
}

interface Usuario {
  id: number;
  nombre_apellido: string;
}

interface CatalogoServicio {
  id: number;
  nombre: string;
}

interface Contacto {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  email2: string;
}

const useLookupData = (tipoServicio?: string, empresaNombre?: string) => {
  const supabase = createClient()
  
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [catalogoServicios, setCatalogoServicios] = useState<CatalogoServicio[]>([])
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
        .order("razon_social")
      
      if (error) throw error
      setEmpresas(data || [])
    } catch (err) {
      console.error('Error loading empresas:', err)
      setError('Error loading empresas')
    }
  }

  const loadServicios = async () => {
    try {
      const { data, error } = await supabase
        .from("tipo_servicio")
        .select("id, nombre")
        .order("nombre")
      
      if (error) throw error
      setServicios(data || [])
    } catch (err) {
      console.error('Error loading servicios:', err)
      setError('Error loading servicios')
    }
  }

  const loadUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombre_apellido")
        .eq("departamento", 2)  // negocios department ID is 2
        .in("rol", [10, 2])  // rol ID is 10 or 2
        .order("nombre_apellido")
      
      if (error) throw error
      setUsuarios(data || [])
    } catch (err) {
      console.error('Error loading usuarios:', err)
      setError('Error loading usuarios')
    }
  }

  const loadCatalogoServicios = async () => {
    if (!tipoServicio) {
      setCatalogoServicios([])
      return
    }

    try {
      // First, get the ID of the selected tipo_servicio
      const selectedServicio = servicios.find(s => s.nombre === tipoServicio)
      
      if (!selectedServicio) {
        setCatalogoServicios([])
        return
      }

      const { data, error } = await supabase
        .from("catalogo_servicios")
        .select("id, nombre")
        .eq("tipo_servicio", selectedServicio.id)
        .order("nombre")
      
      if (error) throw error
      setCatalogoServicios(data || [])
    } catch (err) {
      console.error('Error loading catalogo_servicios:', err)
      setError('Error loading catalog services')
    }
  }

  const loadContactos = async () => {
    if (!empresaNombre) {
      setContactos([])
      return
    }

    try {
      // Find the selected empresa
      const selectedEmpresa = empresas.find(e => e.razon_social === empresaNombre)
      
      if (!selectedEmpresa) {
        setContactos([])
        return
      }

      const { data, error } = await supabase
        .from("contactos")
        .select("*")
        .eq("id_empresa", selectedEmpresa.id)
        .order("nombre")
      
      if (error) throw error
      setContactos(data || [])
    } catch (err) {
      console.error('Error loading contactos:', err)
      setError('Error loading contacts')
    }
  }

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      setError(null)
      
      await Promise.all([
        loadEmpresas(),
        loadServicios(),
        loadUsuarios()
      ])
      
      setLoading(false)
    }

    loadInitialData()
  }, [])

  // Load catalogo_servicios when tipo_servicio changes
  useEffect(() => {
    if (servicios.length > 0) {
      loadCatalogoServicios()
    }
  }, [tipoServicio, servicios])

  // Load contactos when empresa changes
  useEffect(() => {
    if (empresas.length > 0) {
      loadContactos()
    }
  }, [empresaNombre, empresas])

  return {
    // Data
    empresas,
    servicios,
    usuarios,
    catalogoServicios,
    contactos,
    
    // State
    loading,
    error,
    
    // Actions (if needed for manual refresh)
    refetch: () => {
      loadEmpresas()
      loadServicios()
      loadUsuarios()
    }
  }
}

export default useLookupData
