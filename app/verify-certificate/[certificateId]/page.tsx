import CertificateViewer from './certificate-viewer';

interface CertificateVerificationPageProps {
  params: Promise<{ certificateId: string }>;
}

export default async function CertificateVerificationPage({ params }: CertificateVerificationPageProps) {
  const resolvedParams = await params;
  
  return <CertificateViewer />;
}
