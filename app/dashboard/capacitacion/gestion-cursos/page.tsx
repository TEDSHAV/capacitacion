import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import GestionCursosClient from './GestionCursosClient';
import { Empresa } from '@/types'
import { getCursos } from './actions';

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

  // Fetch existing courses using the getCursos function with company information
  const coursesResult = await getCursos();
  
  if (coursesResult.error) {
    return { error: coursesResult.error };
  }

  return (
    <GestionCursosClient 
      user={user} 
      empresas={companies || []}
      cursos={coursesResult.data || undefined}
    />
  )
}
