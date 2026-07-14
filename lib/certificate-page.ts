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

  // QR Code configuration - shared between sample and real QR codes
  private static readonly QR_CONFIG = {
    GENERATION_SIZE: 70,    // Size for QR code generation
    PDF_SIZE_MM: 20,        // Size in mm for PDF
    MARGIN: 10,             // Margin from edges
    X_OFFSET: 10,            // Additional X offset adjustment
    Y_OFFSET: 12.4            // Additional Y offset adjustment
  };

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
      let shaSignature = certificateData.sha_signature_data;
      
      // If sha_signature_data is not available, fetch it using certificate service
      if (!shaSignature) {
        try {
          shaSignature = await certificateService.getSignatureData(
            certificateData.sha_signature_id
          );
        } catch (error) {
          console.warn('Failed to fetch SHA signature data:', error);
        }
      }
      
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
      console.log('Adding facilitator signature:', facilitator);
      
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
      let signatureUrl = null;
      
      // Check multiple possible signature fields
      if (facilitator.firma) {
        signatureUrl = facilitator.firma;
      } else if (facilitator.signature_data?.firma) {
        signatureUrl = facilitator.signature_data.firma;
      }
      
      if (signatureUrl) {
        console.log('Adding facilitator signature image:', signatureUrl);
        await this.addSignatureImage(
          signatureUrl,
          38,
          72,
          signatureConfig.width,
          signatureConfig.height
        );
      } else {
        console.warn('No signature image found for facilitator:', facilitator.name);
      }
    } catch (error) {
      console.error('Error adding facilitator signature:', error);
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
      console.log('Adding SHA signature:', shaSignature);
      
      // Add SHA signature name
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.text(
        shaSignature.nombre?.toUpperCase() || shaSignature.representante_sha?.toUpperCase() || '',
        signatureConfig.rightX + 35,
        100,
        { align: "center" }
      );
      
      // Add SHA signature image if available
      if (shaSignature.url_imagen) {
        console.log('Adding SHA signature image:', shaSignature.url_imagen);
        await this.addSignatureImage(
          shaSignature.url_imagen,
          signatureConfig.rightX + 10,
          signatureConfig.y - 45,
          signatureConfig.width,
          signatureConfig.height
        );
      } else {
        console.warn('No signature image found for SHA:', shaSignature.nombre);
      }
    } catch (error) {
      console.error('Error adding SHA signature:', error);
      throw error;
    }
  }

  /**
   * Add QR code to certificate (common method for both real and sample)
   */
  private async addQRCodeToPosition(qrDataUrl: string): Promise<void> {
    try {
      // Position QR code using shared configuration
      const { PDF_SIZE_MM, MARGIN, X_OFFSET, Y_OFFSET } = CertificatePage.QR_CONFIG;
      const x = this.pageWidth - PDF_SIZE_MM - MARGIN - X_OFFSET;
      const y = MARGIN + Y_OFFSET;

      // Add QR code image
      this.doc.addImage(qrDataUrl, 'PNG', x, y, PDF_SIZE_MM, PDF_SIZE_MM);

    } catch (error) {
      console.warn('Failed to add QR code to certificate:', error);
      // Continue without QR code if it fails
    }
  }

  /**
   * Add QR code to certificate (upper right corner)
   */
  async addQRCode(certificateId: number, controlNumbers?: ControlNumbers): Promise<void> {
    try {
      // Generate QR code data
      const qrData = QRService.generateQRData(certificateId, controlNumbers);
      
      // Generate QR code as data URL using shared configuration
      const qrDataUrl = await QRService.generateQRDataURL({
        data: qrData,
        size: CertificatePage.QR_CONFIG.GENERATION_SIZE,
        level: 'M',
        includeMargin: true
      });

      // Add QR code using common positioning method
      await this.addQRCodeToPosition(qrDataUrl);

    } catch (error) {
      console.warn('Failed to add QR code to certificate:', error);
      // Continue without QR code if it fails
    }
  }

  /**
   * Add sample QR code for preview (same size as real QR code)
   */
  async addSampleQRCode(): Promise<void> {
    try {
      // Generate sample QR code data for preview
      const sampleData = {
        certificateId: 0, // Use 0 as sample certificate ID
        verificationUrl: "https://example.com/verify/SAMPLE",
        controlNumbers: {
          nro_libro: 1,
          nro_hoja: 1,
          nro_linea: 1,
          nro_control: 1
        },
        generatedAt: new Date().toISOString()
      };
      
      // Generate QR code as data URL using shared configuration
      const qrDataUrl = await QRService.generateQRDataURL({
        data: sampleData,
        size: CertificatePage.QR_CONFIG.GENERATION_SIZE,
        level: 'M',
        includeMargin: true
      });

      // Add QR code using common positioning method
      await this.addQRCodeToPosition(qrDataUrl);

    } catch (error) {
      console.warn('Failed to add sample QR code to certificate preview:', error);
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
        
        console.log('Server environment, loading signature from file:', imagePath);
        
        // Check if file exists
        if (fs.existsSync(imagePath)) {
          // Read file as base64
          const imageBuffer = fs.readFileSync(imagePath);
          const base64Image = imageBuffer.toString('base64');
          
          // Add base64 image to PDF
          this.doc.addImage(`data:image/png;base64,${base64Image}`, "PNG", x, y, width, height);
          console.log('Signature image loaded successfully in server environment');
        } else {
          console.warn('Signature image file not found:', imagePath);
        }
        return;
      }

      // Browser environment - use Image constructor
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.doc.addImage(img, "PNG", x, y, width, height);
          resolve();
        };
        img.onerror = (error) => {
          console.error('Failed to load signature image in browser:', imageUrl, error);
          reject(error);
        };
        img.src = imageUrl;
      });
    } catch (error) {
      console.error('Error in addSignatureImage:', error);
      throw error;
    }
  }
}
