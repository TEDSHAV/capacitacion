import { CertificateGenerator } from './certificate-generator';
import { certificateService } from './certificate-service';
import { CertificateRequest, ControlNumbers } from '@/types';

export class CertificatePreviewHelper {
  private generator: CertificateGenerator;

  constructor() {
    this.generator = new CertificateGenerator();
  }

  /**
   * Generate certificate preview with estimated control numbers
   */
  async generatePreview(
    participant: any,
    certificateData: any,
    templateImage: string,
    sealImage?: string
  ): Promise<Blob> {
    try {
      // Get estimated control numbers for preview
      const controlNumbers = await certificateService.getControlNumbers();
      
      const request: CertificateRequest = {
        participant,
        certificateData,
        templateImage,
        sealImage,
        controlNumbers: controlNumbers || undefined,
        isPreview: true
      };

      return await this.generator.generateCertificate(request);
    } catch (error) {
      console.error('Error generating certificate preview:', error);
      throw error;
    }
  }

  /**
   * Generate final certificate with actual control numbers
   */
  async generateFinalCertificate(
    participant: any,
    certificateData: any,
    templateImage: string,
    sealImage?: string,
    actualControlNumbers?: ControlNumbers
  ): Promise<Blob> {
    try {
      const request: CertificateRequest = {
        participant,
        certificateData,
        templateImage,
        sealImage,
        controlNumbers: actualControlNumbers,
        isPreview: false
      };

      return await this.generator.generateCertificate(request);
    } catch (error) {
      console.error('Error generating final certificate:', error);
      throw error;
    }
  }

  /**
   * Download certificate with proper filename
   */
  downloadCertificate(blob: Blob, participantName: string, isPreview: boolean = false): void {
    const sanitizedName = participantName.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    const prefix = isPreview ? 'PREVIEW_' : '';
    const filename = `${prefix}Certificado_${sanitizedName}_${timestamp}.pdf`;
    
    this.generator.downloadBlob(blob, filename);
  }
}
