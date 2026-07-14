import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import GestionCursosClient from './GestionCursosClient'

export default async function GestionCursosPage() {
  // Check authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch companies for dropdown
  const { data: companies } = await supabase
    .from("empresas")
    .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
    .order("razon_social")

  // Fetch existing courses
  const { data: courses } = await supabase
    .from("cursos")
    .select(`
      *,
      empresas (nombre)
    `)
    .order("created_at", { ascending: false })

  return (
    <GestionCursosClient 
      user={user} 
      empresas={companies || []}
      cursos={courses || []}
    />
  )
}
