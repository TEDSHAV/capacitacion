import jsPDF from "jspdf";
import { CertificateGeneration, CertificateParticipant, Facilitador, ControlNumbers } from '@/types';
import { CertificateFacilitator } from '@/app/actions/facilitators';
import { getDynamicConfig } from "./certificate-config";
import { TextRenderer } from "./text-renderer";
import { certificateService } from "./certificate-service";
import { QRService } from "./qr-service";

const _serverTemplateCache = new Map<string, string>();

export class CertificatePage {
  private doc: jsPDF;
  private textRenderer: TextRenderer;
  private config: ReturnType<typeof getDynamicConfig>;
  private pageWidth: number;
  private pageHeight: number;
  private isSinglePage: boolean;

  // QR Code configuration - shared between sample and real QR codes
  private static readonly QR_CONFIG = {
    GENERATION_SIZE: 70,    // Size for QR code generation
    PDF_SIZE_MM: 20,        // Size in mm for PDF
    MARGIN: 10,             // Margin from edges
    X_OFFSET: 10,            // Additional X offset adjustment
    Y_OFFSET: 12.4            // Additional Y offset adjustment
  };

  constructor(doc: jsPDF, pageWidth: number, pageHeight: number, isSinglePage: boolean = false) {
    this.doc = doc;
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;
    this.isSinglePage = isSinglePage;
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
          // Read file as base64 — cache to avoid repeated disk reads
          let base64Image: string;
          if (_serverTemplateCache.has(imagePath)) {
            base64Image = _serverTemplateCache.get(imagePath)!;
          } else {
            const imageBuffer = await fs.promises.readFile(imagePath);
            base64Image = imageBuffer.toString('base64');
            _serverTemplateCache.set(imagePath, base64Image);
          }
          
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
      
      // If facilitator_data is not available, try to fetch it
      if (!facilitator) {
        // Check if we're in a server environment
        if (typeof window === 'undefined') {
          // Server environment - data should already be provided, don't try to fetch
          console.warn('Facilitator data not provided in server environment');
        } else {
          // Browser environment - use API route
          try {
            const response = await fetch(`/api/facilitators/${certificateData.facilitator_id}`);
            
            if (response.ok) {
              const data = await response.json();
              
              if (data) {
                // Transform API response to match expected interface
                facilitator = {
                  id: data.id,
                  name: data.nombre_apellido,
                  nombre_apellido: data.nombre_apellido,
                  facilitator: data.nombre_apellido, // Same as name for consistency
                  cargo: 'Facilitador', // Default cargo since not returned by API
                  firma: data.firmas?.url_imagen,
                  firma_id: data.firma_id,
                  sha_signature_id: data.firma_id?.toString(),
                  signature_data: data.firmas ? {
                    id: data.firmas.id,
                    representante_sha: data.firmas.nombre,
                    firma: data.firmas.url_imagen,
                    url_imagen: data.firmas.url_imagen,
                  } : undefined,
                };
              }
            }
          } catch (error) {
            console.error('Failed to fetch facilitator data from API:', error);
          }
        }
      }

      if (facilitator) {
        await this.addFacilitatorSignature(facilitator, signature);
      }
    }

    // Add SHA signature if available
    if (certificateData.sha_signature_id) {
      let shaSignature = certificateData.sha_signature_data;
      
      // If sha_signature_data is not available, try to fetch it
      if (!shaSignature) {
        // Check if we're in a server environment
        if (typeof window === 'undefined') {
          // Server environment - data should already be provided, don't try to fetch
          console.warn('SHA signature data not provided in server environment');
        } else {
          // Browser environment - use certificate service
          try {
            shaSignature = await certificateService.getSignatureData(
              certificateData.sha_signature_id.toString()
            );
          } catch (error) {
            console.warn('Failed to fetch SHA signature data:', error);
          }
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
      // Add facilitator name - use the name field which is mapped from nombre_apellido
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.text(
        (facilitator.name || facilitator.nombre_apellido).toUpperCase(),
        60,
        100,
        { align: "center" }
      );

      // Add facilitator signature if available
      let signatureUrl = null;
      
      // Check signature from firmas relationship (primary source)
      if (facilitator.signature_data?.url_imagen) {
        signatureUrl = facilitator.signature_data.url_imagen;
      } else if (facilitator.signature_data?.firma) {
        signatureUrl = facilitator.signature_data.firma;
      } else if (facilitator.firma) {
        signatureUrl = facilitator.firma;
      }
      
      if (signatureUrl) {
        await this.addSignatureImage(
          signatureUrl,
          38,
          72,
          signatureConfig.width,
          signatureConfig.height
        );
      } else {
        console.warn('No signature image found for facilitator:', facilitator.name || facilitator.nombre_apellido);
      }
    } catch (error) {
      console.error('Error adding facilitator signature:', error);
      console.warn('Continuing without facilitator signature - certificate generation will proceed');
      // Don't throw error, just continue without the signature
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
      // Handle both array and object structures
      let signatureData = shaSignature;
      if (Array.isArray(shaSignature) && shaSignature.length > 0) {
        signatureData = shaSignature[0];
      }
      
      // SHA signature name removed - only showing signature image
      
      // Add SHA signature image if available
      if (signatureData.url_imagen) {
        await this.addSignatureImage(
          signatureData.url_imagen,
          signatureConfig.rightX + 10,
          signatureConfig.y - 45,
          signatureConfig.width,
          signatureConfig.height
        );
      } else if (signatureData.firma) {
        await this.addSignatureImage(
          signatureData.firma,
          signatureConfig.rightX + 10,
          signatureConfig.y - 45,
          signatureConfig.width,
          signatureConfig.height
        );
      } else {
        console.warn('No signature image found for SHA:', signatureData.nombre);
      }
    } catch (error) {
      console.error('Error adding SHA signature:', error);
      console.warn('Continuing without SHA signature - certificate generation will proceed');
      // Don't throw error, just continue without the signature
    }
  }

  /**
   * Add QR code to specific position on the certificate
   */
  private async addQRCodeToPosition(qrDataUrl: string, isSinglePage: boolean = false): Promise<void> {
    try {
      // Calculate QR code position - always position in the upper half (certificate area)
      const qrX = this.pageWidth - CertificatePage.QR_CONFIG.PDF_SIZE_MM - CertificatePage.QR_CONFIG.MARGIN - CertificatePage.QR_CONFIG.X_OFFSET;
      
      // For both single and two-page certificates, position QR code in the upper half
      // Use the same coordinates since the upper half layout never changes
      const qrY = 22.5;
      
      // Add QR code to PDF
      this.doc.addImage(qrDataUrl, 'PNG', qrX, qrY, CertificatePage.QR_CONFIG.PDF_SIZE_MM, CertificatePage.QR_CONFIG.PDF_SIZE_MM);
      
      // // Add "Scan to Verify" text below QR code
      // this.doc.setFont("helvetica", "normal");
      // this.doc.setFontSize(6);
      // this.doc.text(
      //   "Scan to Verify",
      //   qrX + CertificatePage.QR_CONFIG.PDF_SIZE_MM / 2,
      //   qrY + CertificatePage.QR_CONFIG.PDF_SIZE_MM + 3,
      //   { align: "center" }
      // );
      
      console.log('QR code added successfully at position:', { x: qrX, y: qrY, isSinglePage });
    } catch (error) {
      console.error('Failed to add QR code to position:', error);
      throw error;
    }
  }

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
      await this.addQRCodeToPosition(qrDataUrl, this.isSinglePage);

    } catch (error) {
      console.error('Failed to add QR code to certificate:', error);
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
      await this.addQRCodeToPosition(qrDataUrl, this.isSinglePage);

    } catch (error) {
      console.error('Failed to add sample QR code to certificate preview:', error);
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
        
        // Convert URL to file path, handle both relative and absolute paths
        let imagePath = imageUrl;
        if (imageUrl.startsWith('/')) {
          imagePath = path.join(process.cwd(), 'public', imageUrl);
        } else if (imageUrl.startsWith('file://')) {
          // Convert file:// URL to path
          imagePath = imageUrl.replace('file://', '');
          // Handle Windows paths
          if (imagePath.startsWith('/') && imagePath.includes(':')) {
            imagePath = imagePath.substring(1);
          }
        }
        
        // Check if file exists
        if (fs.existsSync(imagePath)) {
          // Read file as base64
          const imageBuffer = fs.readFileSync(imagePath);
          const base64Image = imageBuffer.toString('base64');
          
          // Add base64 image to PDF
          this.doc.addImage(`data:image/png;base64,${base64Image}`, "PNG", x, y, width, height);
        } else {
          console.warn('Signature image file not found:', imagePath);
        }
        return;
      }

      // Browser environment - convert to absolute URL if needed, then load as base64
      let finalImageUrl = imageUrl;
      
      // Convert relative paths to absolute URLs
      if (imageUrl.startsWith('/')) {
        finalImageUrl = window.location.origin + imageUrl;
      } else if (imageUrl.startsWith('file://')) {
        console.warn('Cannot load file:// URLs in browser environment:', imageUrl);
        return;
      }
      
      return new Promise((resolve, reject) => {
        const img = new Image();
        
        // Enable cross-origin for external images
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            // Create canvas to convert to base64
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            
            // Convert to base64 data URL
            const base64DataUrl = canvas.toDataURL('image/png');
            
            // Add to PDF using base64 data URL
            this.doc.addImage(base64DataUrl, "PNG", x, y, width, height);
            resolve();
          } catch (error) {
            console.error('Error converting image to base64:', error);
            reject(error);
          }
        };
        
        img.onerror = (error) => {
          console.error('Failed to load signature image in browser:', finalImageUrl, error);
          reject(new Error(`Signature image not found: ${finalImageUrl}`));
        };
        
        img.src = finalImageUrl;
      });
    } catch (error) {
      console.error('Error in addSignatureImage:', error);
      // Don't throw error, let the caller handle it gracefully
      throw error;
    }
  }
}
