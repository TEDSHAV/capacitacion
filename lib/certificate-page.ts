import jsPDF from "jspdf";
import { CertificateGeneration, CertificateParticipant, Facilitador, ControlNumbers } from '@/types';
import { CertificateFacilitator } from '@/app/actions/facilitators';
import { getDynamicConfig } from "./certificate-config";
import { TextRenderer } from "./text-renderer";
import { certificateService } from "./certificate-service";
import { QRService } from "./qr-service";

export class CertificatePage {
  private doc: jsPDF;
  private textRenderer: TextRenderer;
  private config: ReturnType<typeof getDynamicConfig>;
  private pageWidth: number;
  private pageHeight: number;

  constructor(doc: jsPDF, pageWidth: number, pageHeight: number) {
    this.doc = doc;
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;
    this.config = getDynamicConfig(pageWidth, pageHeight);
    this.textRenderer = new TextRenderer(doc);
  }

  /**
   * Add template background image
   */
  async addTemplate(imageUrl: string): Promise<void> {
    // Skip template if no image URL provided
    if (!imageUrl) {
      console.log('No template image provided, skipping template');
      return;
    }

    try {
      // Check if we're in a server environment
      if (typeof window === 'undefined') {
        // Server environment - use fs to read image file
        const fs = require('fs');
        const path = require('path');
        
        // Convert URL to file path
        let imagePath = imageUrl;
        if (imageUrl.startsWith('/')) {
          imagePath = path.join(process.cwd(), 'public', imageUrl);
        }
        
        console.log('Server environment, loading template from file:', imagePath);
        
        // Check if file exists
        if (fs.existsSync(imagePath)) {
          // Read file as base64
          const imageBuffer = fs.readFileSync(imagePath);
          const base64Image = imageBuffer.toString('base64');
          
          const upperHalfHeight = this.pageHeight / 2;
          const margin = 10;
          const templateArea = {
            x: margin,
            y: margin,
            width: this.pageWidth - (margin * 2),
            height: upperHalfHeight - (margin * 2)
          };
          
          // Add base64 image to PDF
          this.doc.addImage(`data:image/png;base64,${base64Image}`, "PNG", templateArea.x, templateArea.y, templateArea.width, templateArea.height);
          console.log('Template image loaded successfully in server environment');
        } else {
          console.warn('Template image file not found:', imagePath);
        }
        return;
      }

      // Browser environment - use Image constructor
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const upperHalfHeight = this.pageHeight / 2;
          const margin = 10;
          const templateArea = {
            x: margin,
            y: margin,
            width: this.pageWidth - (margin * 2),
            height: upperHalfHeight - (margin * 2)
          };
          
          this.doc.addImage(img, "PNG", templateArea.x, templateArea.y, templateArea.width, templateArea.height);
          resolve();
        };
        img.onerror = (error) => {
          console.warn('Failed to load template image:', imageUrl, error);
          resolve(); // Continue without template instead of failing
        };
        img.src = imageUrl;
      });
    } catch (error) {
      console.warn('Error in addTemplate:', error);
      // Continue without template instead of failing
    }
  }

  /**
   * Add main certificate content
   */
  async addCertificateContent(
    participant: CertificateParticipant,
    certificateData: CertificateGeneration
  ): Promise<void> {
    const { name } = participant;
    const { certificate_title, certificate_subtitle, date } = certificateData;

    // Calculate content layout
    const contentLayout = this.calculateContentLayout(
      name,
      certificate_title,
      certificate_subtitle,
      participant.score,
      certificateData.passing_grade || 0
    );

    let currentY = contentLayout.startY;

    // Render participant name
    if (name) {
      const nameHeight = this.textRenderer.renderDynamicText(
        name,
        this.pageWidth / 2,
        currentY,
        this.config.name
      );
      currentY += nameHeight;

      if (participant.score !== undefined && participant.score !== null) {
        currentY += this.config.uniformGap;
      }
    }

    // Render conditional text
    if (participant.score !== undefined && participant.score !== null) {
      const conditionalHeight = this.textRenderer.renderConditionalText(
        participant.score,
        certificateData.passing_grade || 0,
        this.pageWidth / 2,
        currentY,
        this.config.conditionalText
      );
      currentY += conditionalHeight;

      if (certificate_title) {
        currentY += 2; // Smaller gap to move title up
      }
    }

    // Render course title
    if (certificate_title) {
      const titleHeight = this.textRenderer.renderDynamicText(
        certificate_title,
        this.pageWidth / 2,
        currentY,
        this.config.title
      );
      currentY += titleHeight;

      if (certificate_subtitle) {
        currentY += this.config.uniformGap;
      }
    }

    // Render subtitle
    if (certificate_subtitle) {
      this.textRenderer.renderDynamicText(
        certificate_subtitle,
        this.pageWidth / 2,
        currentY,
        this.config.subtitle
      );
    }

    // Render hours and additional information
    if (date) {
      this.textRenderer.renderDateText(date, this.pageWidth / 2, 160);
      
      if (certificateData.horas_estimadas) {
        this.textRenderer.renderDurationText(
          certificateData.horas_estimadas,
          this.pageWidth / 2 + 10, 97
        );
      }

      // Add signatures
      await this.addSignatures(certificateData);
    }
  }

  /**
   * Calculate content layout positioning
   */
  private calculateContentLayout(
    name: string,
    title: string,
    subtitle: string | undefined,
    score: number | undefined,
    passingGrade: number
  ) {
    const lineHeight = this.config.name.lineHeight;
    const uniformGap = this.config.uniformGap;

    let mainElementsHeight = 0;

    // Calculate name height
    mainElementsHeight += this.textRenderer.calculateFontSize(name, this.config.name.maxFontSize) > 20 ? 2 * lineHeight : lineHeight;

    // Calculate conditional text height
    if (score !== undefined && score !== null) {
      mainElementsHeight += lineHeight;
      if (name) mainElementsHeight += uniformGap;
    }

    // Calculate title height
    if (title) {
      mainElementsHeight += this.textRenderer.calculateFontSize(title, this.config.title.maxFontSize) > 20 ? 2 * lineHeight : lineHeight;
      if (score !== undefined && score !== null) mainElementsHeight += uniformGap;
    }

    const startY = this.config.centerPoint - mainElementsHeight / 2;

    return { startY, mainElementsHeight };
  }

  /**
   * Add signatures to certificate
   */
  private async addSignatures(certificateData: CertificateGeneration): Promise<void> {
    const { signature } = this.config;

    // Add facilitator signature if available
    if (certificateData.facilitator_id) {
      let facilitator: CertificateFacilitator | null = certificateData.facilitator_data as CertificateFacilitator | null;
      
      // If facilitator_data is not available, fetch it using server action
      if (!facilitator) {
        try {
          // Import server action
          const { getFacilitatorData } = await import('@/app/actions/facilitators');
          facilitator = await getFacilitatorData(certificateData.facilitator_id);
        } catch (error) {
          console.warn('Failed to fetch facilitator data:', error);
        }
      }

      if (facilitator) {
        await this.addFacilitatorSignature(facilitator, signature);
      }
    }

    // Add SHA signature if available
    if (certificateData.sha_signature_id) {
      const shaSignature = await certificateService.getSignatureData(
        certificateData.sha_signature_id
      );
      
      if (shaSignature) {
        await this.addSHASignature(shaSignature, signature);
      }
    }
  }

  /**
   * Add facilitator signature
   */
  private async addFacilitatorSignature(
    facilitator: CertificateFacilitator,
    signatureConfig: typeof this.config.signature
  ): Promise<void> {
    try {
      // Add facilitator name
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.text(
        facilitator.name.toUpperCase(),
        60,
        100,
        { align: "center" }
      );

      // Add facilitator signature if available
      if (facilitator.firma) {
        // Use the firma field directly if it contains a URL/path
        if (facilitator.firma.startsWith('/')) {
          await this.addSignatureImage(
            facilitator.firma,
            38,
            72,
            signatureConfig.width,
            signatureConfig.height
          );
        }
      }
      
      // Add SHA signature if available
      if (facilitator.signature_data?.firma) {
        await this.addSignatureImage(
          facilitator.signature_data.firma,
          38,
          72,
          signatureConfig.width,
          signatureConfig.height
        );
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add SHA signature
   */
  private async addSHASignature(
    shaSignature: any,
    signatureConfig: typeof this.config.signature
  ): Promise<void> {
    try {
      await this.addSignatureImage(
        shaSignature.url_imagen,
        signatureConfig.rightX + 10,
        signatureConfig.y - 45,
        signatureConfig.width,
        signatureConfig.height
      );

     
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add QR code to certificate (upper right corner)
   */
  async addQRCode(certificateId: number, controlNumbers?: ControlNumbers): Promise<void> {
    try {
      // Generate QR code data
      const qrData = QRService.generateQRData(certificateId, controlNumbers);
      
      // Generate QR code as data URL
      const qrDataUrl = await QRService.generateQRDataURL({
        data: qrData,
        size: 80, // Smaller size for PDF
        level: 'M',
        includeMargin: true
      });

      // Position QR code in upper right corner
      const qrSize = 25; // Size in mm for PDF
      const margin = 10;
      const x = this.pageWidth - qrSize - margin - 9;
      const y = margin + 12; // Position from top

      // Add QR code image
      this.doc.addImage(qrDataUrl, 'PNG', x, y, qrSize, qrSize);

      // Add "Scan to Verify" text below QR code
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(5);
      this.doc.text("Scan to Verify", x + qrSize/2, y + qrSize + 3, { align: "center" });

    } catch (error) {
      console.warn('Failed to add QR code to certificate:', error);
      // Continue without QR code if it fails
    }
  }

  /**
   * Add signature image
   */
  private async addSignatureImage(
    imageUrl: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.doc.addImage(img, "PNG", x, y, width, height);
        resolve();
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }
}
