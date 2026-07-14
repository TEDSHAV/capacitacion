import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import CapacitacionClient from './CapacitacionClient'

export default async function CapacitacionPage() {
  // Check authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch companies for dropdown (for course binding)
  const { data: companies } = await supabase.from("empresas").select("*").order("nombre")

  return <CapacitacionClient user={user} companies={companies || []} />
}
