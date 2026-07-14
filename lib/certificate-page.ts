import jsPDF from "jspdf";
import { CertificateParticipant, CertificateGeneration } from "@/types";
import { getDynamicConfig } from "./certificate-config";
import { TextRenderer } from "./text-renderer";
import { certificateService } from "./certificate-service";

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
      img.onerror = reject;
      img.src = imageUrl;
    });
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
      const facilitator = await certificateService.getFacilitatorData(
        certificateData.facilitator_id
      );

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
    facilitator: any,
    signatureConfig: typeof this.config.signature
  ): Promise<void> {
    try {
      if (facilitator.firma_id) {
        const signature = await certificateService.getSignatureData(
          facilitator.firma_id.toString()
        );
        
        if (signature?.url_imagen) {
          await this.addSignatureImage(
            signature.url_imagen,
            38,
            72,
            signatureConfig.width,
            signatureConfig.height
          );
        }
      }

      // Add facilitator name
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.text(
        facilitator.nombre_apellido.toUpperCase(),
        60,
        100,
        { align: "center" }
      );
    } catch (error) {
      console.error("Error adding facilitator signature:", error);
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

      // Add signature labels
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(10);
      this.doc.text(
        shaSignature.nombre,
        signatureConfig.rightX,
        signatureConfig.y + signatureConfig.height + 5,
        { align: "center" }
      );
      this.doc.text(
        "Representante SHA",
        signatureConfig.rightX,
        signatureConfig.y + signatureConfig.height + 10,
        { align: "center" }
      );
    } catch (error) {
      console.error("Error adding SHA signature:", error);
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
