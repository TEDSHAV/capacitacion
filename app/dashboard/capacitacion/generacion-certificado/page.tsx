import { createClient } from '@/utils/supabase/server'
import GeneracionCertificadoClient from './GeneracionCertificadoClient';
import { getOptimizedCertificateData } from '@/app/actions/certificate-optimized';

export default async function GeneracionCertificadoPage() {
  // Check authentication - following your existing pattern
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return <div className="p-8 text-center text-gray-500">Sesión no encontrada. Por favor, accede desde el portal principal.</div>
  }

  // Use existing optimized server action with caching
  const certificateData = await getOptimizedCertificateData();
  
  if (certificateData.error) {
    console.error('Error loading certificate data:', certificateData.error);
    // Still render the page, client will handle error state
  }

  return (
    <GeneracionCertificadoClient 
      user={user} 
      initialData={certificateData}
    />
  )
}
