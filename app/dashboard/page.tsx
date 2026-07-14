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

  // Fetch departments from database with caching
  const { data: departamentos } = await supabase
    .from("departamentos")
    .select("*")

  // Sort departments alphabetically by nombre_departamento
  const sortedDepartamentos = (departamentos || []).sort((a: any, b: any) => 
    a.nombre.localeCompare(b.nombre)
  )

  return <DashboardClient user={user} departamentos={sortedDepartamentos} />
}

// Enable ISR with 5-minute revalidation for better performance
export const revalidate = 300
