import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import CapacitacionClient from './CapacitacionClient'
import { Company } from './types'

export default async function CapacitacionPage() {
  // Check authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch companies for dropdown (for course binding)
  const { data: companies }: { data: Company[] | null } = await supabase
    .from("empresas")
    .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
    .order("razon_social")

  return <CapacitacionClient user={user} companies={companies || []} />
}
