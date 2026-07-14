// Example usage of the certificate generation system with proper control numbers

import { CertificatePreviewHelper } from '@/lib/certificate-preview-helper';
import { saveCertificatesToDatabase } from '@/app/actions/certificados';
import { CertificateParticipant, CertificateGeneration } from '@/types';

export async function handleCertificateGeneration(
  certificateData: CertificateGeneration,
  participants: CertificateParticipant[],
  templateImage: string,
  sealImage: string
) {
  const previewHelper = new CertificatePreviewHelper();

  try {
    // Step 1: Generate previews for all participants
    const previewBlobs = await Promise.all(
      participants.map(participant =>
        previewHelper.generatePreview(participant, certificateData, templateImage, sealImage)
      )
    );

    // Step 2: Save certificates to database to get actual control numbers
    const result = await saveCertificatesToDatabase(certificateData, participants);
    
    if (!result.success || !result.certificateNumbers) {
      throw new Error('Failed to save certificates to database');
    }

    // Step 3: Generate final certificates with actual control numbers
    const finalBlobs = await Promise.all(
      participants.map((participant, index) => {
        const actualNumbers = result.certificateNumbers![index];
        return previewHelper.generateFinalCertificate(
          participant,
          certificateData,
          templateImage,
          sealImage,
          actualNumbers
        );
      })
    );

    return {
      success: true,
      previewBlobs,
      finalBlobs,
      certificateIds: result.certificateIds,
      controlNumbers: result.certificateNumbers
    };

  } catch (error) {
    console.error('Certificate generation failed:', error);
    throw error;
  }
}

// Example component usage
export function CertificateGenerationComponent() {
  const handlePreview = async (participant: CertificateParticipant, certificateData: CertificateGeneration) => {
    const previewHelper = new CertificatePreviewHelper();
    
    // Generate preview
    const previewBlob = await previewHelper.generatePreview(
      participant,
      certificateData,
      '/templates/certificado.png',
      '/templates/sello.png'
    );
    
    // Download preview
    previewHelper.downloadCertificate(previewBlob, participant.name, true);
  };

  const handleFinalGeneration = async (certificateData: CertificateGeneration, participants: CertificateParticipant[]) => {
    try {
      const result = await handleCertificateGeneration(
        certificateData,
        participants,
        '/templates/certificado.png',
        '/templates/sello.png'
      );

      // Download final certificates
      result.finalBlobs.forEach((blob, index) => {
        const previewHelper = new CertificatePreviewHelper();
        previewHelper.downloadCertificate(blob, participants[index].name, false);
      });

      console.log(`Successfully generated ${result.finalBlobs.length} certificates`);
      console.log('Certificate IDs:', result.certificateIds);
      console.log('Control Numbers:', result.controlNumbers);
      
    } catch (error) {
      console.error('Failed to generate certificates:', error);
    }
  };

  return (
    <div>
      {/* Your component UI here */}
    </div>
  );
}
