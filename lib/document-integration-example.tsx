// Example integration for certificate generation page
// Add this to your existing certificate generation component

import { DocumentDownloader } from '@/components/documents/document-downloader';
import { extractOSIFromCertificates, getDefaultFirmante } from '@/lib/document-generator';

// Add this component inside your certificate generation page, after the certificates are generated
export function DocumentGenerationSection({ 
  certificates, 
  osiData 
}: { 
  certificates: any[]; 
  osiData: any; 
}) {
  // Extract OSI data from certificates or use provided osiData
  const osiInfo = osiData || extractOSIFromCertificates(certificates);
  const firmanteData = getDefaultFirmante();

  return (
    <div className="mt-8 border-t pt-6">
      <DocumentDownloader
        certificates={certificates}
        osiData={osiInfo}
        firmanteData={firmanteData}
        disabled={!certificates.length}
      />
    </div>
  );
}

// Example usage in your certificate generation action:
export async function generateCertificatesWithDocuments(
  participantData: any[],
  osiData: any,
  courseData: any,
  options?: {
    generateDocuments?: boolean;
    documentOptions?: {
      includeCertificacionCompetencias?: boolean;
      includeNotaEntrega?: boolean;
      includeValidacionDatos?: boolean;
      recibidoData?: {
        nombre: string;
        cargo: string;
      };
    };
  }
) {
  // 1. Generate certificates (your existing logic)
  // const certificates = await yourExistingCertificateGenerationFunction(participantData, osiData, courseData);
  const certificates: any[] = []; // Placeholder - replace with your actual certificate generation

  // 2. Generate additional documents if requested
  if (options?.generateDocuments && certificates.length > 0) {
    const { DocumentGenerator } = await import('@/lib/document-generator');
    const generator = new DocumentGenerator();

    try {
      const documents = await generator.generateAllDocuments(
        certificates,
        osiData,
        getDefaultFirmante(),
        options.documentOptions
      );

      // You can store these documents in your database or return them for download
      return {
        certificates,
        documents,
        documentFiles: Object.keys(documents).map(docType => ({
          type: docType,
          buffer: documents[docType],
          filename: DocumentGenerator.getDocumentFileName(docType, osiData.nro_osi)
        }))
      };
    } catch (error) {
      console.error('Error generating documents:', error);
      // Still return certificates even if documents fail
      return { certificates, documents: null };
    }
  }

  return { certificates };
}
