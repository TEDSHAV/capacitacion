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

  constructor() {
    this.doc = new jsPDF(CERTIFICATE_CONFIG.page);
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.certificatePage = new CertificatePage(this.doc, this.pageWidth, this.pageHeight);
    this.contentPage = new ContentPage(this.doc, this.pageWidth, this.pageHeight);
  }

  /**
   * Generate a complete certificate with both pages
   */
  async generateCertificate(data: CertificateRequest): Promise<Blob> {
    const { participant, certificateData, templateImage, sealImage, controlNumbers, isPreview, certificateId } = data;

    // Clear any existing content
    this.doc = new jsPDF(CERTIFICATE_CONFIG.page);
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    
    // Reinitialize page components with new document
    this.certificatePage = new CertificatePage(this.doc, this.pageWidth, this.pageHeight);
    this.contentPage = new ContentPage(this.doc, this.pageWidth, this.pageHeight);

    try {
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
      return this.doc.output("blob");
    } catch (error) {
      console.error('Certificate generation error:', error);
      throw error; // Re-throw the actual error instead of hiding it
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
