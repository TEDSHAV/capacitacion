import { redirect } from 'next/navigation';
import { getCertificateById } from '@/app/actions/certificados';
import CertificateViewer from './certificate-viewer';

interface CertificateVerificationPageProps {
  params: Promise<{ certificateId: string }>;
}

export default async function CertificateVerificationPage({ params }: CertificateVerificationPageProps) {
  const resolvedParams = await params;
  const rawId = resolvedParams.certificateId;

  // If accessed via legacy numeric ID (e.g. old physical QR code or bookmark),
  // redirect seamlessly to its secure UUID so the URL bar shows the UUID.
  if (/^\d+$/.test(rawId)) {
    const cert = await getCertificateById(parseInt(rawId, 10));
    if (cert?.uuid) {
      redirect(`/verify-certificate/${cert.uuid}`);
    }
  }
  
  return <CertificateViewer />;
}
