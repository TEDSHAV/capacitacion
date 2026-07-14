import jsPDF from "jspdf";
import {
  CertificateGeneration,
  CertificateParticipant,
  Facilitador,
  ControlNumbers,
} from "@/types";
import { CertificateFacilitator } from "@/app/actions/facilitators";
import { getDynamicConfig } from "./certificate-config";
import { TextRenderer } from "./text-renderer";
import { certificateService } from "./certificate-service";
import { QRService } from "./qr-service";
import {
  compressImageToJpeg,
  compressServerImageToJpeg,
} from "./image-compress";
import { toTitleCase } from "@/utils/string-utils";

const _serverTemplateCache = new Map<string, string>();
const _browserTemplateCache = new Map<string, string>();

export class CertificatePage {
  private doc: jsPDF;
  private textRenderer: TextRenderer;
  private config: ReturnType<typeof getDynamicConfig>;
  private pageWidth: number;
  private pageHeight: number;
  private isSinglePage: boolean;
  private preloadedAssets?: any;
  private templateKey?: string;

  // QR Code configuration - shared between sample and real QR codes
  private static readonly QR_CONFIG = {
    GENERATION_SIZE: 70, // Size for QR code generation
    PDF_SIZE_MM: 20, // Size in mm for PDF
    MARGIN: 10, // Margin from edges
    X_OFFSET: 10, // Additional X offset adjustment
    Y_OFFSET: 12.4, // Additional Y offset adjustment
  };

  constructor(
    doc: jsPDF,
    pageWidth: number,
    pageHeight: number,
    isSinglePage: boolean = false,
    preloadedAssets?: any,
    templateKey?: string,
  ) {
    this.doc = doc;
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;
    this.isSinglePage = isSinglePage;
    this.preloadedAssets = preloadedAssets;
    this.templateKey = templateKey;
    this.config = getDynamicConfig(pageWidth, pageHeight, templateKey);
    this.textRenderer = new TextRenderer(doc);
  }

  /**
   * Add template background image
   */
  async addTemplate(imageUrl: string): Promise<void> {
    // Skip template if no image URL provided
    if (!imageUrl) {
      return;
    }

    const margin = 10;
    const upperHalfHeight = this.pageHeight / 2;
    const templateArea = {
      x: margin,
      y: margin,
      width: this.pageWidth - margin * 2,
      height: upperHalfHeight - margin * 2,
    };

    try {
      // Check if we're in a server environment
      if (typeof window === "undefined") {
        // Server environment - use fs to read image file
        const fs = require("fs");
        const path = require("path");

        // Convert URL to file path
        let imagePath = imageUrl;
        if (imageUrl.startsWith("/")) {
          imagePath = path.join(process.cwd(), "public", imageUrl);
        }

        // Check if file exists
        if (fs.existsSync(imagePath)) {
          // Read file as base64 — cache to avoid repeated disk reads
          let cachedDataUrl: string;
          if (_serverTemplateCache.has(imagePath)) {
            cachedDataUrl = _serverTemplateCache.get(imagePath)!;
          } else {
            const imageBuffer = await fs.promises.readFile(imagePath);
            const base64Png = imageBuffer.toString("base64");
            const compressed = await compressServerImageToJpeg(
              base64Png,
              82,
              1600,
            );
            const mime =
              compressed.format === "JPEG" ? "image/jpeg" : "image/png";
            cachedDataUrl = `data:${mime};base64,${compressed.base64}`;
            _serverTemplateCache.set(imagePath, cachedDataUrl);
          }

          const format = cachedDataUrl.startsWith("data:image/jpeg")
            ? "JPEG"
            : "PNG";
          this.doc.addImage(
            cachedDataUrl,
            format,
            templateArea.x,
            templateArea.y,
            templateArea.width,
            templateArea.height,
            undefined,
            "FAST",
          );
        }
        return;
      }

      // Browser environment

      // Fast path: already a data URL (preloaded) — add directly without canvas
      if (imageUrl.startsWith("data:")) {
        const format = imageUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
        this.doc.addImage(
          imageUrl,
          format,
          templateArea.x,
          templateArea.y,
          templateArea.width,
          templateArea.height,
          undefined,
          "FAST",
        );
        return;
      }

      // Cache check for URL inputs
      if (_browserTemplateCache.has(imageUrl)) {
        const cachedDataUrl = _browserTemplateCache.get(imageUrl)!;
        const format = cachedDataUrl.startsWith("data:image/jpeg")
          ? "JPEG"
          : "PNG";
        this.doc.addImage(
          cachedDataUrl,
          format,
          templateArea.x,
          templateArea.y,
          templateArea.width,
          templateArea.height,
          undefined,
          "FAST",
        );
        return;
      }

      // Fetch-based approach for URL inputs (avoids canvas/CORS taint issues)
      return new Promise(async (resolve) => {
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) {
            console.error(
              `Template image not found: ${imageUrl} (${response.status})`,
            );
            resolve();
            return;
          }
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              const dataUrl = reader.result as string;
              _browserTemplateCache.set(imageUrl, dataUrl);
              const format = dataUrl.startsWith("data:image/jpeg")
                ? "JPEG"
                : "PNG";
              this.doc.addImage(
                dataUrl,
                format,
                templateArea.x,
                templateArea.y,
                templateArea.width,
                templateArea.height,
                undefined,
                "FAST",
              );
            } catch (e) {
              console.error("Failed to add template to PDF:", e);
            }
            resolve();
          };
          reader.onerror = () => {
            console.error("Failed to read template image blob");
            resolve();
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error("Failed to load template image:", error);
          resolve();
        }
      });
    } catch (error) {
      console.error("Unexpected error in addTemplate:", error);
    }
  }

  /**
   * Add main certificate content
   */
  async addCertificateContent(
    participant: CertificateParticipant,
    certificateData: CertificateGeneration,
    sealImage?: string,
  ): Promise<void> {
    const { name } = participant;
    const { certificate_title, certificate_subtitle, date } = certificateData;

    // Calculate content layout
    const contentLayout = this.calculateContentLayout(
      name,
      certificate_title,
      certificate_subtitle,
      participant.score,
      certificateData.passing_grade || 0,
    );

    let currentY = contentLayout.startY;

    // Render participant name
    if (name) {
      const nameHeight = this.textRenderer.renderDynamicText(
        name,
        this.pageWidth / 2,
        currentY,
        this.config.name,
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
        this.config.conditionalText,
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
        this.config.title,
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
        this.config.subtitle,
      );
    }

    // Render hours and additional information
    if (date) {
      this.textRenderer.renderDateText(
        date,
        this.pageWidth / 2,
        this.config.dateY,
      );

      if (certificateData.horas_estimadas) {
        this.textRenderer.renderDurationText(
          certificateData.horas_estimadas,
          this.pageWidth / 2 + this.config.durationOffsetX,
          this.config.durationY,
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
    passingGrade: number,
  ) {
    const lineHeight = this.config.name.lineHeight;
    const uniformGap = this.config.uniformGap;

    let mainElementsHeight = 0;

    // Calculate name height
    mainElementsHeight +=
      this.textRenderer.calculateFontSize(name, this.config.name.maxFontSize) >
      20
        ? 2 * lineHeight
        : lineHeight;

    // Calculate conditional text height
    if (score !== undefined && score !== null) {
      mainElementsHeight += lineHeight;
      if (name) mainElementsHeight += uniformGap;
    }

    // Calculate title height
    if (title) {
      mainElementsHeight +=
        this.textRenderer.calculateFontSize(
          title,
          this.config.title.maxFontSize,
        ) > 20
          ? 2 * lineHeight
          : lineHeight;
      if (score !== undefined && score !== null)
        mainElementsHeight += uniformGap;
    }

    const startY = this.config.centerPoint - mainElementsHeight / 2;

    return { startY, mainElementsHeight };
  }

  /**
   * Add signatures to certificate
   */
  private async addSignatures(
    certificateData: CertificateGeneration,
  ): Promise<void> {
    const { signature } = this.config;

    // Add facilitator signature if available
    if (certificateData.facilitator_id) {
      let facilitator: CertificateFacilitator | null =
        certificateData.facilitator_data as CertificateFacilitator | null;

      // Use preloaded facilitator data if available (from batch generation)
      if (!facilitator && this.preloadedAssets?.facilitator) {
        // Transform preloaded API response to match expected interface
        const preloadedData = this.preloadedAssets.facilitator;
        facilitator = {
          id: preloadedData.id,
          name: toTitleCase(preloadedData.nombre_apellido || ""),
          nombre_apellido: toTitleCase(preloadedData.nombre_apellido || ""),
          facilitator: toTitleCase(preloadedData.nombre_apellido || ""),
          cargo: "Facilitator",
          firma: preloadedData.firmas?.url_imagen,
          firma_id: preloadedData.firma_id,
          sha_signature_id: preloadedData.firma_id?.toString(),
          signature_data: preloadedData.firmas
            ? {
                id: preloadedData.firmas.id,
                representante_sha: preloadedData.firmas.nombre,
                firma: preloadedData.firmas.url_imagen,
                url_imagen: preloadedData.firmas.url_imagen,
              }
            : undefined,
        };
      }

      // If facilitator_data is not available, try to fetch it (only for single certificate generation)
      if (!facilitator) {
        // Check if we're in a server environment
        if (typeof window === "undefined") {
        } else {
          // Browser environment - use API route
          try {
            const response = await fetch(
              `/api/facilitators/${certificateData.facilitator_id}`,
            );

            if (response.ok) {
              const data = await response.json();

              if (data) {
                // Transform API response to match expected interface
                facilitator = {
                  id: data.id,
                  name: toTitleCase(data.nombre_apellido || ""),
                  nombre_apellido: toTitleCase(data.nombre_apellido || ""),
                  facilitator: toTitleCase(data.nombre_apellido || ""),
                  cargo: "Facilitator",
                  firma: data.firmas?.url_imagen,
                  firma_id: data.firma_id,
                  sha_signature_id: data.firma_id?.toString(),
                  signature_data: data.firmas
                    ? {
                        id: data.firmas.id,
                        representante_sha: data.firmas.nombre,
                        firma: data.firmas.url_imagen,
                        url_imagen: data.firmas.url_imagen,
                      }
                    : undefined,
                };
              }
            }
          } catch (error) {
            console.error("Failed to fetch facilitator data:", error);
            // Continue without facilitator
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
        if (typeof window === "undefined") {
        } else {
          // Browser environment - use certificate service
          try {
            shaSignature = await certificateService.getSignatureData(
              certificateData.sha_signature_id.toString(),
            );
          } catch (error) {
            // Continue without SHA signature
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
    signatureConfig: typeof this.config.signature,
  ): Promise<void> {
    try {
      // Add facilitator name - use the name field which is mapped from nombre_apellido
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.text(
        toTitleCase(
          facilitator.name || facilitator.nombre_apellido || "",
        ).toUpperCase(),
        this.config.facilitatorName.x,
        this.config.facilitatorName.y,
        { align: "center" },
      );

      // 🚀 USE PRELOADED ASSET IF AVAILABLE TO SKIP CANVAS PROCESSING
      if (this.preloadedAssets?.facilitatorSignature) {
        this.doc.addImage(
          this.preloadedAssets.facilitatorSignature,
          "PNG",
          this.config.facilitatorSignature.x,
          this.config.facilitatorSignature.y,
          signatureConfig.width,
          signatureConfig.height,
          undefined,
          "FAST",
        );
        return;
      }

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
          this.config.facilitatorSignature.x,
          this.config.facilitatorSignature.y,
          signatureConfig.width,
          signatureConfig.height,
        );
      }
    } catch (error) {
      // Continue without facilitator signature
    }
  }

  /**
   * Add SHA signature
   */
  private async addSHASignature(
    shaSignature: any,
    signatureConfig: typeof this.config.signature,
  ): Promise<void> {
    try {
      // 🚀 USE PRELOADED ASSET IF AVAILABLE TO SKIP CANVAS PROCESSING
      if (this.preloadedAssets?.shaSignature) {
        this.doc.addImage(
          this.preloadedAssets.shaSignature,
          "PNG",
          signatureConfig.rightX + this.config.shaSignatureOffset.x,
          signatureConfig.y + this.config.shaSignatureOffset.y,
          signatureConfig.width,
          signatureConfig.height,
          undefined,
          "FAST",
        );
        return;
      }

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
          signatureConfig.rightX + this.config.shaSignatureOffset.x,
          signatureConfig.y + this.config.shaSignatureOffset.y,
          signatureConfig.width,
          signatureConfig.height,
        );
      } else if (signatureData.firma) {
        await this.addSignatureImage(
          signatureData.firma,
          signatureConfig.rightX + this.config.shaSignatureOffset.x,
          signatureConfig.y + this.config.shaSignatureOffset.y,
          signatureConfig.width,
          signatureConfig.height,
        );
      }
    } catch (error) {
      // Continue without SHA signature
    }
  }

  /**
   * Add QR code to specific position on the certificate
   */
  private async addQRCodeToPosition(
    qrDataUrl: string,
    isSinglePage: boolean = false,
  ): Promise<void> {
    try {
      // Calculate QR code position - always position in the upper half (certificate area)
      const qrX =
        this.pageWidth -
        CertificatePage.QR_CONFIG.PDF_SIZE_MM -
        CertificatePage.QR_CONFIG.MARGIN -
        CertificatePage.QR_CONFIG.X_OFFSET;

      // For both single and two-page certificates, position QR code in the upper half
      // Use the same coordinates since the upper half layout never changes
      const qrY = this.config.qrY;

      // Add QR code to PDF
      this.doc.addImage(
        qrDataUrl,
        "PNG",
        qrX,
        qrY,
        CertificatePage.QR_CONFIG.PDF_SIZE_MM,
        CertificatePage.QR_CONFIG.PDF_SIZE_MM,
      );

      // // Add "Scan to Verify" text below QR code
      // this.doc.setFont("helvetica", "normal");
      // this.doc.setFontSize(6);
      // this.doc.text(
      //   "Scan to Verify",
      //   qrX + CertificatePage.QR_CONFIG.PDF_SIZE_MM / 2,
      //   qrY + CertificatePage.QR_CONFIG.PDF_SIZE_MM + 3,
      //   { align: "center" }
      // );
    } catch (error) {
      throw error;
    }
  }

  async addQRCode(
    certificateId: number,
    controlNumbers?: ControlNumbers,
  ): Promise<void> {
    try {
      // Generate QR code data
      const qrData = QRService.generateQRData(certificateId, controlNumbers);

      // Generate QR code as data URL using shared configuration
      const qrDataUrl = await QRService.generateQRDataURL({
        data: qrData,
        size: CertificatePage.QR_CONFIG.GENERATION_SIZE,
        level: "M",
        includeMargin: true,
      });

      // Add QR code using common positioning method
      await this.addQRCodeToPosition(qrDataUrl, this.isSinglePage);
    } catch (error) {
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
          nro_control: 1,
        },
        generatedAt: new Date().toISOString(),
      };

      // Generate QR code as data URL using shared configuration
      const qrDataUrl = await QRService.generateQRDataURL({
        data: sampleData,
        size: CertificatePage.QR_CONFIG.GENERATION_SIZE,
        level: "M",
        includeMargin: true,
      });

      // Add QR code using common positioning method
      await this.addQRCodeToPosition(qrDataUrl, this.isSinglePage);
    } catch (error) {
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
    height: number,
  ): Promise<void> {
    try {
      // Check if we're in a server environment
      if (typeof window === "undefined") {
        // Server environment - use fs to read image file
        const fs = require("fs");
        const path = require("path");

        // Convert URL to file path, handle both relative and absolute paths
        let imagePath = imageUrl;
        if (imageUrl.startsWith("/")) {
          imagePath = path.join(process.cwd(), "public", imageUrl);
        } else if (imageUrl.startsWith("file://")) {
          // Convert file:// URL to path
          imagePath = imageUrl.replace("file://", "");
          // Handle Windows paths
          if (imagePath.startsWith("/") && imagePath.includes(":")) {
            imagePath = imagePath.substring(1);
          }
        }

        // Check if file exists
        if (fs.existsSync(imagePath)) {
          // Read file as base64
          const imageBuffer = fs.readFileSync(imagePath);
          const base64Image = imageBuffer.toString("base64");

          // Add base64 image to PDF
          this.doc.addImage(
            `data:image/png;base64,${base64Image}`,
            "PNG",
            x,
            y,
            width,
            height,
          );
        }
        return;
      }

      // Browser environment - use fetch + FileReader to avoid canvas CORS/taint issues
      if (imageUrl.startsWith("file://")) {
        return;
      }

      // If already a data URL, add directly
      if (imageUrl.startsWith("data:")) {
        const format = imageUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
        this.doc.addImage(imageUrl, format, x, y, width, height);
        return;
      }

      return new Promise(async (resolve, reject) => {
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) {
            reject(
              new Error(
                `Signature image not found: ${imageUrl} (${response.status})`,
              ),
            );
            return;
          }
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              const dataUrl = reader.result as string;
              const format = dataUrl.startsWith("data:image/jpeg")
                ? "JPEG"
                : "PNG";
              this.doc.addImage(dataUrl, format, x, y, width, height);
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = () =>
            reject(new Error("Failed to read signature blob"));
          reader.readAsDataURL(blob);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      throw error;
    }
  }
}
