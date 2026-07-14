import { createClient } from '@/utils/supabase/server'
import { cache } from 'react'
import CapacitacionClient from './CapacitacionClient'

// Cache the companies fetch to avoid repeated database calls
const getCompanies = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("empresas")
    .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
    .order("razon_social")
  return data || []
})

export default async function CapacitacionPage() {
  // Check authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return <div className="p-8 text-center text-gray-500">Sesión no encontrada. Por favor, accede desde el portal principal.</div>
  }

  // Fetch cached companies data
  const companies = await getCompanies()

  return <CapacitacionClient user={user} companies={companies} />
}
