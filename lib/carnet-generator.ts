import jsPDF from "jspdf";
import { CarnetGeneration, CarnetRequest } from "@/types";
import { QRService } from "@/lib/qr-service";

import {
  compressImageToJpeg,
  compressServerImageToJpeg,
} from "./image-compress";

const _serverCarnetCache = new Map<string, string>();
const _browserCarnetCache = new Map<string, string>();

export class CarnetGenerator {
  private pageWidth: number;
  private pageHeight: number;

  constructor() {
    this.pageWidth = 86;
    this.pageHeight = 54;
  }

  private createPdfInstance(): jsPDF {
    return new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [86, 54], // Standard credit card size
      compress: true,
    });
  }

  async generateCarnet(request: CarnetRequest): Promise<Blob> {
    const {
      participant,
      carnetData,
      templateImage,
      isPreview = false,
      carnetId,
      qrDataURL,
    } = request;

    const pdf = this.createPdfInstance();

    try {
      // Add background design
      await this.addPngBackground(pdf, templateImage);

      // Add participant information
      await this.addParticipantInfo(pdf, participant, carnetData);

      // Add course information
      await this.addCourseInfo(pdf, carnetData);

      // Add dates
      await this.addDates(pdf, carnetData);

      // Add QR code
      await this.addQRCode(pdf, qrDataURL);

      // Add preview watermark if needed
      if (isPreview) {
        this.addPreviewWatermark(pdf);
      }

      const blob = pdf.output("blob");
      return blob;
    } catch (error) {
      throw new Error(
        `Failed to generate carnet: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async addBackgroundDesign(pdf: jsPDF): Promise<void> {
    // Add gradient-like background
    pdf.setFillColor(250, 250, 250);
    pdf.rect(0, 0, this.pageWidth, this.pageHeight, "F");

    // Add main border
    pdf.setDrawColor(100, 100, 100);
    pdf.rect(2, 2, this.pageWidth - 4, this.pageHeight - 4);

    // Add decorative elements
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.line(2, 15, this.pageWidth - 2, 15); // Top separator
    pdf.line(2, 40, this.pageWidth - 2, 40); // Bottom separator

    // Add corner decorations
    pdf.setDrawColor(150, 150, 150);
    pdf.setLineWidth(1);
    // Top-left corner
    pdf.line(2, 2, 8, 2);
    pdf.line(2, 2, 2, 8);
    // Top-right corner
    pdf.line(this.pageWidth - 8, 2, this.pageWidth - 2, 2);
    pdf.line(this.pageWidth - 2, 2, this.pageWidth - 2, 8);
    // Bottom-left corner
    pdf.line(2, this.pageHeight - 8, 2, this.pageHeight - 2);
    pdf.line(2, this.pageHeight - 2, 8, this.pageHeight - 2);
    // Bottom-right corner
    pdf.line(
      this.pageWidth - 8,
      this.pageHeight - 2,
      this.pageWidth - 2,
      this.pageHeight - 2,
    );
    pdf.line(
      this.pageWidth - 2,
      this.pageHeight - 8,
      this.pageWidth - 2,
      this.pageHeight - 2,
    );

    // Add title
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("CARNET", 43, 10, { align: "center" });
  }

  private async addPngBackground(
    pdf: jsPDF,
    templatePath: string,
  ): Promise<void> {
    try {
      // Skip template if no image path provided
      if (!templatePath) {
        this.addBackgroundDesign(pdf);
        return;
      }

      // Check if we're in a server environment
      if (typeof window === "undefined") {
        // Server environment - use fs to read image file
        const fs = require("fs");
        const path = require("path");

        // Convert URL to file path
        let imagePath = templatePath;
        if (templatePath.startsWith("/")) {
          imagePath = path.join(process.cwd(), "public", templatePath);
        }

        // Check if file exists
        if (fs.existsSync(imagePath)) {
          // Read file as base64 and compress to JPEG for smaller PDF
          let cachedDataUrl: string;
          if (_serverCarnetCache.has(imagePath)) {
            cachedDataUrl = _serverCarnetCache.get(imagePath)!;
          } else {
            const imageBuffer = fs.readFileSync(imagePath);
            const base64Png = imageBuffer.toString("base64");
            const { compressServerImageToJpeg } =
              await import("./image-compress");
            const compressed = await compressServerImageToJpeg(
              base64Png,
              82,
              1200,
            );
            const mime =
              compressed.format === "JPEG" ? "image/jpeg" : "image/png";
            cachedDataUrl = `data:${mime};base64,${compressed.base64}`;
            _serverCarnetCache.set(imagePath, cachedDataUrl);
          }

          const format = cachedDataUrl.startsWith("data:image/jpeg")
            ? "JPEG"
            : "PNG";
          pdf.addImage(
            cachedDataUrl,
            format,
            0,
            0,
            this.pageWidth,
            this.pageHeight,
            undefined,
            "FAST",
          );
        } else {
          this.addBackgroundDesign(pdf);
        }
        return;
      }

      // Browser environment - use Image constructor with JPEG compression
      if (_browserCarnetCache.has(templatePath)) {
        const jpegDataUrl = _browserCarnetCache.get(templatePath)!;
        pdf.addImage(
          jpegDataUrl,
          "JPEG",
          0,
          0,
          this.pageWidth,
          this.pageHeight,
          undefined,
          "FAST",
        );
        return;
      }

      // Fast path: already a data URL (preloaded) — add directly without canvas
      if (templatePath.startsWith("data:")) {
        const format = templatePath.startsWith("data:image/jpeg")
          ? "JPEG"
          : "PNG";
        try {
          pdf.addImage(
            templatePath,
            format,
            0,
            0,
            this.pageWidth,
            this.pageHeight,
            undefined,
            "FAST",
          );
        } catch (e) {
          console.error("Failed to add carnet template data URL to PDF:", e);
          this.addBackgroundDesign(pdf);
        }
        return;
      }

      // Cache check for URL inputs
      if (_browserCarnetCache.has(templatePath)) {
        const cachedDataUrl = _browserCarnetCache.get(templatePath)!;
        const format = cachedDataUrl.startsWith("data:image/jpeg")
          ? "JPEG"
          : "PNG";
        pdf.addImage(
          cachedDataUrl,
          format,
          0,
          0,
          this.pageWidth,
          this.pageHeight,
          undefined,
          "FAST",
        );
        return;
      }

      // Fetch-based approach (avoids canvas CORS/taint issues)
      return new Promise(async (resolve) => {
        try {
          const response = await fetch(templatePath);
          if (!response.ok) {
            console.error(
              `Carnet template not found: ${templatePath} (${response.status})`,
            );
            this.addBackgroundDesign(pdf);
            resolve();
            return;
          }
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              const dataUrl = reader.result as string;
              _browserCarnetCache.set(templatePath, dataUrl);
              const format = dataUrl.startsWith("data:image/jpeg")
                ? "JPEG"
                : "PNG";
              pdf.addImage(
                dataUrl,
                format,
                0,
                0,
                this.pageWidth,
                this.pageHeight,
                undefined,
                "FAST",
              );
            } catch (e) {
              console.error("Failed to add carnet template to PDF:", e);
              this.addBackgroundDesign(pdf);
            }
            resolve();
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

  private async addParticipantInfo(
    pdf: jsPDF,
    participant: any,
    carnetData: CarnetGeneration,
  ): Promise<void> {
    // Set font styles
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "bold");

    // Add participant name (centered below course title)
    const nameY = 42; // Below course info
    pdf.text(`Nombre: ${participant.name}`, 28, nameY - 10, {
      maxWidth: 70,
    });

    // Add ID number (centered below name)
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "bold");

    // Determine ID label and prefix based on nationality
    const idPrefix = participant.nationality === "extranjero" ? "e-" : "V-";
    pdf.text(`${idPrefix}${participant.idNumber}`, 28, nameY - 6);
  }

  private async addCourseInfo(
    pdf: jsPDF,
    carnetData: CarnetGeneration,
  ): Promise<void> {
    // Set font styles
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");

    // Add course title (centered within border area)
    const courseY = 18;
    pdf.text(`${carnetData.titulo_curso.toUpperCase()}`, 54, courseY, {
      align: "center",
      maxWidth: 50,
    });
  }

  private async addDates(
    pdf: jsPDF,
    carnetData: CarnetGeneration,
  ): Promise<void> {
    // Set font styles
    pdf.setFontSize(5);
    pdf.setFont("helvetica", "bold");

    // Add emission date (left side, below QR code)
    const emissionDate = new Date(
      carnetData.fecha_emision + "T12:00:00",
    ).toLocaleDateString("es-VE");
    pdf.text("Emisión: ", 3, 40);
    pdf.text(emissionDate, 15, 40);

    // Add expiration date if available (left side, below emission date)
    if (carnetData.fecha_vencimiento) {
      const expirationDate = new Date(
        carnetData.fecha_vencimiento + "T12:00:00",
      ).toLocaleDateString("es-VE");
      pdf.setTextColor(255, 0, 0); // Set text color to red
      pdf.text("Vencimiento: ", 3, 43);
      pdf.setTextColor(0, 0, 0); // Reset text color to black
      pdf.text(expirationDate, 15, 43); // Position date after "Vencimiento: "
    }

    // Add control number at bottom right
    if (carnetData.nro_control) {
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 0, 0); // Set text color to red
      pdf.text("N°: ", 66, 44);
      pdf.setTextColor(0, 0, 0); // Reset text color to black
      pdf.text(`${carnetData.nro_control}`, 70, 44);
    }
  }

  private async addQRCode(pdf: jsPDF, qrDataURL?: string): Promise<void> {
    try {
      if (!qrDataURL) {
        return;
      }

      // Add QR code to middle left square area of carnet
      const qrSize = 20; // 15mm for carnet
      const qrX = 3; // Position in the left square area
      const qrY = 16; // Center vertically in the left area

      // Add QR code image to PDF
      pdf.addImage(qrDataURL, "PNG", qrX, qrY, qrSize, qrSize);
    } catch (error) {
      // Continue without QR code if it fails
    }
  }

  private addPreviewWatermark(pdf: jsPDF): void {
    pdf.setFontSize(20);
    pdf.setTextColor(200, 200, 200);
    pdf.setFont("helvetica", "bold");

    // Add watermark text diagonally
    pdf.saveGraphicsState();
    pdf.setGState(pdf.GState({ opacity: 0.3 }));
    pdf.text("PREVIEW", this.pageWidth / 2, this.pageHeight / 2, {
      align: "center",
      angle: 45,
    });
    pdf.restoreGraphicsState();

    // Reset text color
    pdf.setTextColor(0, 0, 0);
  }

  async generateMultipleCarnets(requests: CarnetRequest[]): Promise<Blob[]> {
    // Generate all carnets in parallel for better performance
    const carnetPromises = requests.map(async (request) => {
      try {
        const blob = await this.generateCarnet(request);
        return { blob, success: true };
      } catch (error) {
        return { blob: null, success: false };
      }
    });

    const results = await Promise.allSettled(carnetPromises);
    return results
      .filter(
        (r): r is PromiseFulfilledResult<{ blob: Blob; success: true }> =>
          r.status === "fulfilled" && r.value.success,
      )
      .map((r) => r.value.blob);
  }

  async generateCombinedPDF(requests: CarnetRequest[]): Promise<Blob> {
    // Create a new PDF with standard page size for multiple carnets
    const combinedPdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = combinedPdf.internal.pageSize.getWidth();
    const pageHeight = combinedPdf.internal.pageSize.getHeight();

    // Calculate how many carnets fit per page (2 columns x 4 rows = 8 carnets per page)
    const carnetWidth = 86;
    const carnetHeight = 54;
    const cols = 2;
    const rows = 4;
    const marginX = 10;
    const marginY = 20;
    const spacingX = 5;
    const spacingY = 10;

    let currentPage = 0;
    let currentCol = 0;
    let currentRow = 0;

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];

      // Add new page if needed (except for first carnet)
      if (i > 0 && currentCol === 0 && currentRow === 0) {
        combinedPdf.addPage();
        currentPage++;
      }

      // Generate individual carnet
      const carnetBlob = await this.generateCarnet(request);
      const carnetArrayBuffer = await carnetBlob.arrayBuffer();

      // Convert to base64 for jsPDF
      const carnetBase64 = btoa(
        String.fromCharCode(...new Uint8Array(carnetArrayBuffer)),
      );

      // Calculate position
      const x = marginX + currentCol * (carnetWidth + spacingX);
      const y = marginY + currentRow * (carnetHeight + spacingY);

      // Add carnet to combined PDF
      combinedPdf.addImage(
        carnetBase64,
        "PNG",
        x,
        y,
        carnetWidth,
        carnetHeight,
      );

      // Update position for next carnet
      currentCol++;
      if (currentCol >= cols) {
        currentCol = 0;
        currentRow++;
        if (currentRow >= rows) {
          currentRow = 0;
        }
      }
    }

    return combinedPdf.output("blob");
  }

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

  async previewCarnet(request: CarnetRequest): Promise<string> {
    const blob = await this.generateCarnet({ ...request, isPreview: true });
    return URL.createObjectURL(blob);
  }
}
