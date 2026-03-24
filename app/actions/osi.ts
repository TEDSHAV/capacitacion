"use server";

import { createClient } from '@/utils/supabase/server';
import { cache } from 'react';
import { Empresa, Usuario, Contacto, OSI } from '@/types';

// Cached server actions for better performance
const getCachedOSIUsuarios = cache(async () => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nombre_apellido")
      .eq("departamento", 2)
      .in("rol", [10, 2])
      .order("nombre_apellido");
      
    if (error) {
      // Usuarios table not available
      return { usuarios: [] };
    }
    
    return { usuarios: data || [] };
  } catch (err) {
    return { usuarios: [] };
  }
});

const getCachedOSIEmpresas = cache(async () => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("empresas")
      .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
      .order("razon_social");
      
    if (error) {
      // Empresas table not available
      return { empresas: [] };
    }
    
    return { empresas: data || [] };
  } catch (err) {
    return { empresas: [] };
  }
});

const getCachedOSICursos = cache(async () => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("catalogo_servicios")
      .select("id, nombre, contenido_curso, cliente_asociado")
      .eq("tipo_servicio", 1)
      .order("nombre");
      
    if (error) {
      // Cursos table not available
      return { cursos: [] };
    }
    
    return { cursos: data || [] };
  } catch (err) {
    return { cursos: [] };
  }
});

const getCachedOSIContactos = cache(async () => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("contactos_empresas")
      .select("id, nombre_apellido, cargo, email, telefono, id_empresa")
      .order("nombre_apellido");
      
    if (error) {
      // Contactos table not available
      return { contactos: [] };
    }
    
    return { contactos: data || [] };
  } catch (err) {
    return { contactos: [] };
  }
});

const getCachedOSIServicios = cache(async () => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("catalogo_servicios")
      .select("id, nombre, tipo_servicio")
      .order("nombre");
      
    if (error) {
      // Servicios table not available
      return { servicios: [] };
    }
    
    return { servicios: data || [] };
  } catch (err) {
    return { servicios: [] };
  }
});

// Get all usuarios for OSI dropdown
export async function getOSIUsuarios() {
  return await getCachedOSIUsuarios();
}

// Get all empresas for OSI dropdown
export async function getOSIEmpresas() {
  return await getCachedOSIEmpresas();
}

// Get all cursos for OSI dropdown
export async function getOSICursos() {
  return await getCachedOSICursos();
}

// Get all contactos for OSI dropdown
export async function getOSIContactos() {
  return await getCachedOSIContactos();
}

// Get all servicios for OSI dropdown
export async function getOSIServicios() {
  return await getCachedOSIServicios();
}

// Get all OSIs with filtering (not cached as it's dynamic)
export async function getOSIs(filters?: {
  search?: string;
  empresa?: string;
  estado?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const supabase = await createClient();
    const { search, empresa, estado, page = 1, limit = 50 } = filters || {};
    
    // Optimized query with executive name joining
    let query = supabase
      .from('osi')
      .select(`
        *,
        usuarios!osi_ejecutivo_negocios_fkey (
          nombre_apellido
        )
      `, { count: 'exact' });

    // Apply filters
    if (search && search.trim()) {
      query = query.or(`nro_osi.ilike.%${search}%,cliente_nombre_empresa.ilike.%${search}%,tema.ilike.%${search}%`);
    }
    
    if (empresa && empresa.trim()) {
      query = query.eq('empresa_id', empresa);
    }
    
    if (estado && estado.trim()) {
      query = query.eq('id_estatus', estado);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query.order('fecha_emision', { ascending: false });

    if (error) {
      console.error('Error fetching OSIs:', error);
      return { 
        osis: [], 
        total: 0,
        page,
        limit
      };
    }

    // Transform data to include executive name
    const transformedData = (data || []).map(osi => ({
      ...osi,
      executive_name: osi.usuarios?.nombre_apellido || null
    }));

    return { 
      osis: transformedData, 
      total: count || 0,
      page,
      limit
    };
  } catch (err) {
    console.error('Unexpected error in getOSIs:', err);
    return { 
      osis: [], 
      total: 0,
      page: filters?.page || 1,
      limit: filters?.limit || 50
    };
  }
}
