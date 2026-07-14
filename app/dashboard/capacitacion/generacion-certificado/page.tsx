import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import GeneracionCertificadoClient from './GeneracionCertificadoClient';
import { getOptimizedCertificateData } from '@/app/actions/certificate-optimized';

export default async function GeneracionCertificadoPage() {
  // Check authentication - following your existing pattern
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`)
  }

  // Use existing optimized server action with caching
  const certificateData = await getOptimizedCertificateData();
  
  if (certificateData.error) {
    // Still render the page, client will handle error state
  }

  return (
    <GeneracionCertificadoClient 
      user={user} 
      initialData={certificateData}
    />
  )
}
