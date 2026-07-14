import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import GestionCursosClient from './GestionCursosClient'
import { Empresa, Curso } from './types'

export default async function GestionCursosPage() {
  // Check authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch companies for dropdown
  const { data: companies }: { data: Empresa[] | null } = await supabase
    .from("empresas")
    .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
    .order("razon_social")

  // Fetch existing courses from catalogo_servicios where tipo_servicio = 1 with company info
  const { data: courses }: { data: Curso[] | null } = await supabase
    .from("catalogo_servicios")
    .select(`
      *,
      empresas (razon_social)
    `)
    .eq("tipo_servicio", 1)
    .order("created_at", { ascending: false });

  return (
    <GestionCursosClient 
      user={user} 
      empresas={companies || []}
      cursos={courses || []}
    />
  )
}
