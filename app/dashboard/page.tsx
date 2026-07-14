import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import DashboardClient from './DashboardClient'

export default async function Dashboard() {
  // Check authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch departments from database
  const { data: departamentos } = await supabase.from("departamentos").select("*")

  // Sort departments alphabetically by nombre_departamento
  const sortedDepartamentos = (departamentos || []).sort((a, b) => 
    a.nombre.localeCompare(b.nombre)
  )

  return <DashboardClient user={user} departamentos={sortedDepartamentos} />
}
