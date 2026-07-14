import jsPDF from "jspdf";
import {
  CertificateParticipant,
  CertificateGeneration,
  CertificateRequest,
} from "@/types";
import { CERTIFICATE_CONFIG, getTemplateKey } from "./certificate-config";
import { CertificatePage } from "./certificate-page";
import { ContentPage } from "./content-page";

export class CertificateGenerator {
  private lastGeneratedQRCode?: string; // Store last generated QR code

  constructor() {
    // No PDF initialization - done on demand in generateCertificate
  }

  /**
   * Generate a complete certificate with both pages
   */
  async generateCertificate(data: CertificateRequest): Promise<Blob> {
    const {
      participant,
      certificateData,
      templateImage,
      sealImage,
      controlNumbers,
      isPreview,
      certificateId,
      singlePage = false,
      preloadedAssets,
    } = data;

    // Initialize document ONLY when needed
    const doc = new jsPDF(CERTIFICATE_CONFIG.page);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Determine template key for coordinate overrides
    const templateKey = getTemplateKey(
      certificateData.plantilla_certificado_archivo,
    );

    // Pass the ENTIRE preloadedAssets object so signatures don't trigger canvas conversions
    const certificatePage = new CertificatePage(
      doc,
      pageWidth,
      pageHeight,
      singlePage,
      preloadedAssets,
      templateKey,
    );
    const contentPage = new ContentPage(
      doc,
      pageWidth,
      pageHeight,
      templateKey,
    );

    try {
      if (singlePage) {
        // Generate single-page certificate
        return await this.generateSinglePageCertificate(
          doc,
          certificatePage,
          contentPage,
          participant,
          certificateData,
          templateImage,
          sealImage,
          controlNumbers,
          isPreview || false,
          certificateId || 0,
        );
      } else {
        // Generate two-page certificate (original behavior)
        return await this.generateTwoPageCertificate(
          doc,
          certificatePage,
          contentPage,
          participant,
          certificateData,
          templateImage,
          sealImage,
          controlNumbers,
          isPreview || false,
          certificateId || 0,
        );
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate a single-page certificate with certificate at top and content at bottom
   */
  private async generateSinglePageCertificate(
    doc: jsPDF,
    certificatePage: CertificatePage,
    contentPage: ContentPage,
    participant: CertificateParticipant,
    certificateData: CertificateGeneration,
    templateImage: string,
    sealImage: string | undefined,
    controlNumbers: any,
    isPreview: boolean,
    certificateId: number,
  ): Promise<Blob> {
    // Page 1: Certificate (upper half)
    await certificatePage.addTemplate(templateImage);
    await certificatePage.addCertificateContent(
      participant,
      certificateData,
      sealImage,
    );

    // Add QR code - either real or sample for preview
    if (!isPreview && controlNumbers && certificateId) {
      try {
        await certificatePage.addQRCode(certificateId, controlNumbers);
      } catch (qrError) {
        await certificatePage.addSampleQRCode();
      }
    } else if (isPreview) {
      try {
        await certificatePage.addSampleQRCode();
      } catch (qrError) {
        // Continue without QR code on error
      }
    }

    // Add content in the lower half of the same page
    await contentPage.addContentPageSinglePage(
      participant,
      certificateData,
      sealImage,
      controlNumbers,
      isPreview,
    );

    // Return as blob
    try {
      const blob = doc.output("blob");
      return blob;
    } catch (blobError) {
      throw new Error(`PDF blob generation failed: ${blobError}`);
    }
  }

  /**
   * Generate a two-page certificate (original behavior)
   */
  private async generateTwoPageCertificate(
    doc: jsPDF,
    certificatePage: CertificatePage,
    contentPage: ContentPage,
    participant: CertificateParticipant,
    certificateData: CertificateGeneration,
    templateImage: string,
    sealImage: string | undefined,
    controlNumbers: any,
    isPreview: boolean,
    certificateId: number,
  ): Promise<Blob> {
    // Page 1: Certificate
    await certificatePage.addTemplate(templateImage);
    await certificatePage.addCertificateContent(
      participant,
      certificateData,
      sealImage,
    );

    // Add QR code - either real or sample for preview
    if (!isPreview && controlNumbers && certificateId) {
      try {
        await certificatePage.addQRCode(certificateId, controlNumbers);
      } catch (qrError) {
        await certificatePage.addSampleQRCode();
      }
    } else if (isPreview) {
      try {
        await certificatePage.addSampleQRCode();
      } catch (qrError) {
        // Continue without QR code on error
      }
    }

    // Page 2: Content
    doc.addPage();
    await contentPage.addContentPage(
      participant,
      certificateData,
      sealImage || "",
      controlNumbers,
      isPreview,
    );

    // Return as blob
    try {
      const blob = doc.output("blob");
      return blob;
    } catch (blobError) {
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
    const certificates: { participant: CertificateParticipant; blob: Blob }[] =
      [];

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

  /**
   * Download multiple blobs with delay to prevent browser throttling
   */
  async downloadMultipleBlobs(
    items: { blob: Blob; filename: string }[],
    delayMs: number = 200,
  ): Promise<void> {
    for (let i = 0; i < items.length; i++) {
      const { blob, filename } = items[i];
      this.downloadBlob(blob, filename);
      // Add delay between downloads to prevent browser throttling (except for last one)
      if (i < items.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}
