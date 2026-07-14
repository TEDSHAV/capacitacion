import jsPDF from "jspdf";
import { CertificateParticipant, CertificateGeneration, CertificateRequest } from "@/types";
import { CERTIFICATE_CONFIG } from "./certificate-config";
import { CertificatePage } from "./certificate-page";
import { ContentPage } from "./content-page";

export class CertificateGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private certificatePage: CertificatePage;
  private contentPage: ContentPage;
  private lastGeneratedQRCode?: string; // Store last generated QR code

  constructor() {
    this.doc = new jsPDF(CERTIFICATE_CONFIG.page);
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.certificatePage = new CertificatePage(this.doc, this.pageWidth, this.pageHeight, false);
    this.contentPage = new ContentPage(this.doc, this.pageWidth, this.pageHeight);
  }

  /**
   * Generate a complete certificate with both pages
   */
  async generateCertificate(data: CertificateRequest): Promise<Blob> {
    const { participant, certificateData, templateImage, sealImage, controlNumbers, isPreview, certificateId, singlePage = false } = data;

    // Clear any existing content
    this.doc = new jsPDF(CERTIFICATE_CONFIG.page);
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    
    // Reinitialize page components with new document
    this.certificatePage = new CertificatePage(this.doc, this.pageWidth, this.pageHeight, singlePage);
    this.contentPage = new ContentPage(this.doc, this.pageWidth, this.pageHeight);

    try {
      if (singlePage) {
        // Generate single-page certificate
        return await this.generateSinglePageCertificate(participant, certificateData, templateImage, sealImage, controlNumbers, isPreview || false, certificateId || 0);
      } else {
        // Generate two-page certificate (original behavior)
        return await this.generateTwoPageCertificate(participant, certificateData, templateImage, sealImage, controlNumbers, isPreview || false, certificateId || 0);
      }
    } catch (error) {
      console.error('Certificate generation error:', error);
      throw error; // Re-throw the actual error instead of hiding it
    }
  }

  /**
   * Generate a single-page certificate with certificate at top and content at bottom
   */
  private async generateSinglePageCertificate(
    participant: CertificateParticipant,
    certificateData: CertificateGeneration,
    templateImage: string,
    sealImage: string | undefined,
    controlNumbers: any,
    isPreview: boolean,
    certificateId: number
  ): Promise<Blob> {
    // Page 1: Certificate (upper half)
    await this.certificatePage.addTemplate(templateImage);
    await this.certificatePage.addCertificateContent(participant, certificateData);

    // Add QR code - either real or sample for preview
    if (!isPreview && controlNumbers && certificateId) {
      console.log('Adding real QR code for certificate ID:', certificateId);
      try {
        await this.certificatePage.addQRCode(certificateId, controlNumbers);
      } catch (qrError) {
        console.error('Failed to add real QR code, trying sample:', qrError);
        await this.certificatePage.addSampleQRCode();
      }
    } else if (isPreview) {
      console.log('Adding sample QR code for preview');
      try {
        await this.certificatePage.addSampleQRCode();
      } catch (qrError) {
        console.error('Failed to add sample QR code:', qrError);
      }
    }

    // Add content in the lower half of the same page
    await this.contentPage.addContentPageSinglePage(participant, certificateData, sealImage || '', controlNumbers, isPreview);

    // Return as blob
    console.warn('📄 Generating PDF blob...');
    try {
      const blob = this.doc.output("blob");
      console.warn('✅ PDF blob generated successfully, size:', blob.size, 'bytes, type:', blob.type);
      return blob;
    } catch (blobError) {
      console.error('❌ Failed to generate PDF blob:', blobError);
      throw new Error(`PDF blob generation failed: ${blobError}`);
    }
  }

  /**
   * Generate a two-page certificate (original behavior)
   */
  private async generateTwoPageCertificate(
    participant: CertificateParticipant,
    certificateData: CertificateGeneration,
    templateImage: string,
    sealImage: string | undefined,
    controlNumbers: any,
    isPreview: boolean,
    certificateId: number
  ): Promise<Blob> {
    // Page 1: Certificate
    await this.certificatePage.addTemplate(templateImage);
    await this.certificatePage.addCertificateContent(participant, certificateData);

    // Add QR code - either real or sample for preview
    if (!isPreview && controlNumbers && certificateId) {
      // Real QR code for final certificate - use actual certificate ID
      console.log('Adding real QR code for certificate ID:', certificateId);
      try {
        await this.certificatePage.addQRCode(certificateId, controlNumbers);
      } catch (qrError) {
        console.error('Failed to add real QR code, trying sample:', qrError);
        await this.certificatePage.addSampleQRCode();
      }
    } else if (isPreview) {
      // Sample QR code for preview
      console.log('Adding sample QR code for preview');
      try {
        await this.certificatePage.addSampleQRCode();
      } catch (qrError) {
        console.error('Failed to add sample QR code:', qrError);
      }
    } else {
      console.log('No QR code will be added - missing parameters:', { isPreview, hasControlNumbers: !!controlNumbers, certificateId });
    }

    // Add new page for content
    this.doc.addPage();

    // Page 2: Content table with seal
    await this.contentPage.addContentPage(participant, certificateData, sealImage, controlNumbers, isPreview);

    // Return as blob
    console.warn('📄 Generating PDF blob (two-page)...');
    try {
      const blob = this.doc.output("blob");
      console.warn('✅ PDF blob generated successfully, size:', blob.size, 'bytes, type:', blob.type);
      return blob;
    } catch (blobError) {
      console.error('❌ Failed to generate PDF blob:', blobError);
      throw new Error(`PDF blob generation failed: ${blobError}`);
    }
  }

  /**
   * Generate multiple certificates for a list of participants
   */
  async generateMultipleCertificates(
    participants: CertificateParticipant[],
    certificateData: CertificateGeneration,
    templateImage: string,
    sealImage?: string,
  ): Promise<{ participant: CertificateParticipant; blob: Blob }[]> {
    const certificates: { participant: CertificateParticipant; blob: Blob }[] = [];

    for (const participant of participants) {
      try {
        const blob = await this.generateCertificate({
          participant,
          certificateData,
          templateImage,
          sealImage,
        });
        certificates.push({ participant, blob });
      } catch (error) {
        // Continue with other participants even if one fails
      }
    }

    return certificates;
  }

  /**
   * Download blob as file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
