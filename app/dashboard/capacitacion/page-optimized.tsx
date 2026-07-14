import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cache } from 'react'

// Cache the companies fetch to avoid repeated database calls
const getCompanies = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("empresas")
    .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
    .order("razon_social")
  return data || []
})

export default async function OptimizedCapacitacionPage() {
  // Check authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch cached companies data
  const companies = await getCompanies()

  // Dynamic import of client component for better code splitting
  const CapacitacionClient = (await import('./CapacitacionClient-optimized')).default

  return <CapacitacionClient user={user} companies={companies} />
}
