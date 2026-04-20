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
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`)
  }

  // Fetch companies and courses in parallel
  const [companiesResult, coursesResult] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
      .order("razon_social"),
    getCursos(),
  ]);
  const companies = companiesResult.data as Empresa[] | null;
  
  if (coursesResult.error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-red-800 font-semibold">Error</h2>
          <p className="text-red-600">{coursesResult.error}</p>
        </div>
      </div>
    );
  }

  return (
    <GestionCursosClient 
      user={user} 
      empresas={companies || []}
      cursos={coursesResult.data || undefined}
    />
  )
}
