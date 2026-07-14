import jsPDF from "jspdf";
import { CertificateParticipant, CarnetGeneration } from "@/types";
import { CarnetCoordinateConfig } from "./custom-coordinate-types";

const _browserCarnetCache = new Map<string, string>();

export class CustomCarnetGenerator {
  private pageWidth = 86;
  private pageHeight = 54;
  private coords: CarnetCoordinateConfig;

  constructor(coords: CarnetCoordinateConfig) {
    this.coords = coords;
  }

  private createPdfInstance(): jsPDF {
    return new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [86, 54],
      compress: true,
    });
  }

  async generateCarnet(request: {
    participant: CertificateParticipant;
    carnetData: CarnetGeneration;
    templateImage: string;
    isPreview?: boolean;
  }): Promise<Blob> {
    const { participant, carnetData, templateImage, isPreview = false } = request;
    const pdf = this.createPdfInstance();

    try {
      await this.addPngBackground(pdf, templateImage);
      await this.addParticipantInfo(pdf, participant);
      await this.addCourseInfo(pdf, carnetData);
      await this.addDates(pdf, carnetData);
      await this.addControlNumber(pdf, carnetData);

      if (isPreview) {
        this.addPreviewWatermark(pdf);
      }

      return pdf.output("blob");
    } catch (error) {
      throw new Error(
        `Failed to generate custom carnet: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async addPngBackground(pdf: jsPDF, templatePath: string): Promise<void> {
    try {
      if (!templatePath) {
        this.addBackgroundDesign(pdf);
        return;
      }

      if (typeof window === "undefined") {
        const fs = require("fs");
        const path = require("path");
        let imagePath = templatePath;
        if (templatePath.startsWith("/")) {
          imagePath = path.join(process.cwd(), "public", templatePath);
        }
        if (fs.existsSync(imagePath)) {
          const imageBuffer = fs.readFileSync(imagePath);
          const base64 = imageBuffer.toString("base64");
          const format = imagePath.toLowerCase().endsWith(".jpg") || imagePath.toLowerCase().endsWith(".jpeg") ? "JPEG" : "PNG";
          pdf.addImage(base64, format, 0, 0, this.pageWidth, this.pageHeight, undefined, "FAST");
          return;
        }
        this.addBackgroundDesign(pdf);
        return;
      }

      if (templatePath.startsWith("data:")) {
        const format = templatePath.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
        try {
          pdf.addImage(templatePath, format, 0, 0, this.pageWidth, this.pageHeight, undefined, "FAST");
        } catch (e) {
          console.error("Failed to add carnet template data URL to PDF:", e);
          this.addBackgroundDesign(pdf);
        }
        return;
      }

      if (_browserCarnetCache.has(templatePath)) {
        const cachedDataUrl = _browserCarnetCache.get(templatePath)!;
        const format = cachedDataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
        pdf.addImage(cachedDataUrl, format, 0, 0, this.pageWidth, this.pageHeight, undefined, "FAST");
        return;
      }

      return new Promise(async (resolve) => {
        try {
          const response = await fetch(templatePath);
          if (!response.ok) {
            this.addBackgroundDesign(pdf);
            resolve();
            return;
          }
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const originalDataUrl = reader.result as string;
            const img = new Image();
            img.onload = () => {
              try {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth || 1;
                canvas.height = img.naturalHeight || 1;
                const ctx = canvas.getContext("2d");
                const dataUrl = ctx
                  ? (ctx.drawImage(img, 0, 0), canvas.toDataURL("image/png"))
                  : originalDataUrl;
                _browserCarnetCache.set(templatePath, dataUrl);
                pdf.addImage(dataUrl, "PNG", 0, 0, this.pageWidth, this.pageHeight, undefined, "FAST");
              } catch (e) {
                console.error("Failed to add carnet template to PDF:", e);
                this.addBackgroundDesign(pdf);
              }
              resolve();
            };
            img.onerror = () => {
              this.addBackgroundDesign(pdf);
              resolve();
            };
            img.src = originalDataUrl;
          };
          reader.onerror = () => {
            this.addBackgroundDesign(pdf);
            resolve();
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error("Failed to load carnet template:", error);
          this.addBackgroundDesign(pdf);
          resolve();
        }
      });
    } catch (error) {
      this.addBackgroundDesign(pdf);
    }
  }

  private addBackgroundDesign(pdf: jsPDF): void {
    pdf.setFillColor(250, 250, 250);
    pdf.rect(0, 0, this.pageWidth, this.pageHeight, "F");
    pdf.setDrawColor(100, 100, 100);
    pdf.rect(2, 2, this.pageWidth - 4, this.pageHeight - 4);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("CARNET", 43, 10, { align: "center" });
  }

  private async addParticipantInfo(pdf: jsPDF, participant: CertificateParticipant): Promise<void> {
    const c = this.coords;
    pdf.setFontSize(c.participantName.fontSize);
    pdf.setFont("helvetica", "bold");
    const upperCaseName = participant.name.toUpperCase();
    pdf.text(`Nombre: ${upperCaseName}`, c.participantName.x, c.participantName.y, {
      maxWidth: 60,
    });

    pdf.setFontSize(c.participantId.fontSize);
    pdf.setFont("helvetica", "bold");
    const idPrefix = participant.nationality === "extranjero" ? "E-" : "V-";
    pdf.text(`Cédula: ${idPrefix}${participant.idNumber}`, c.participantId.x, c.participantId.y);
  }

  private async addCourseInfo(pdf: jsPDF, carnetData: CarnetGeneration): Promise<void> {
    const c = this.coords;
    pdf.setFontSize(c.courseTitle.fontSize);
    pdf.setFont("helvetica", "bold");
    const title = carnetData.titulo_curso.toUpperCase();
    const titleLines = pdf.splitTextToSize(title, c.courseTitle.maxWidth);
    const courseY = titleLines.length === 1 ? c.courseTitle.y : c.courseTitle.y - 4;
    pdf.text(titleLines, c.courseTitle.x, courseY, {
      align: "center",
      maxWidth: c.courseTitle.maxWidth,
    });

    const subtitle = carnetData.subtitulo_curso || (carnetData as any).certificate_subtitle;
    if (subtitle) {
      pdf.setFontSize(c.subtitle.fontSize);
      pdf.setFont("helvetica", "normal");
      const lineHeight = 3.2;
      const titleTotalHeight = (titleLines.length - 1) * lineHeight;
      const subtitleY = courseY + titleTotalHeight + 4;
      pdf.text(`${subtitle}`, c.subtitle.x, subtitleY, {
        align: "center",
        maxWidth: c.subtitle.maxWidth,
      });
    }
  }

  private async addDates(pdf: jsPDF, carnetData: CarnetGeneration): Promise<void> {
    const c = this.coords;
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    const emissionDate = new Date(carnetData.fecha_emision + "T12:00:00").toLocaleDateString("es-VE");
    pdf.text("Emisión: ", c.emissionDate.x, c.emissionDate.y);
    pdf.text(emissionDate, c.emissionDate.x + 12, c.emissionDate.y);

    if (carnetData.fecha_vencimiento) {
      const expirationDate = new Date(carnetData.fecha_vencimiento + "T12:00:00").toLocaleDateString("es-VE");
      pdf.setTextColor(255, 0, 0);
      pdf.text("Vencimiento: ", c.expirationDate.x, c.expirationDate.y);
      pdf.setTextColor(0, 0, 0);
      pdf.text(expirationDate, c.expirationDate.x + 20, c.expirationDate.y);
    }
  }

  private async addControlNumber(pdf: jsPDF, carnetData: CarnetGeneration): Promise<void> {
    const c = this.coords;
    if (carnetData.nro_control) {
      pdf.setFontSize(c.controlNumber.fontSize || 6);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 0, 0);
      pdf.text("N°: ", c.controlNumber.x, c.controlNumber.y);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${carnetData.nro_control}`, c.controlNumber.x + 3.5, c.controlNumber.y);
    }
  }

  private addPreviewWatermark(pdf: jsPDF): void {
    pdf.setFontSize(20);
    pdf.setTextColor(200, 200, 200);
    pdf.setFont("helvetica", "bold");
    pdf.saveGraphicsState();
    pdf.setGState(pdf.GState({ opacity: 0.3 }));
    pdf.text("PREVIEW", this.pageWidth / 2, this.pageHeight / 2, {
      align: "center",
      angle: 45,
    });
    pdf.restoreGraphicsState();
    pdf.setTextColor(0, 0, 0);
  }

  async previewCarnet(request: {
    participant: CertificateParticipant;
    carnetData: CarnetGeneration;
    templateImage: string;
  }): Promise<string> {
    const blob = await this.generateCarnet({ ...request, isPreview: true });
    return URL.createObjectURL(blob);
  }
}
