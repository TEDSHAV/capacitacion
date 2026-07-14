import jsPDF from "jspdf";
import { CertificateParticipant, CertificateGeneration } from "@/types";
import { getDynamicConfig } from "./certificate-config";
import { TextRenderer } from "./text-renderer";
import { stripHtml } from "./strip-html";

export class ContentPage {
  private doc: jsPDF;
  private textRenderer: TextRenderer;
  private config: ReturnType<typeof getDynamicConfig>;
  private pageWidth: number;
  private pageHeight: number;

  constructor(
    doc: jsPDF,
    pageWidth: number,
    pageHeight: number,
    templateKey?: string,
  ) {
    this.doc = doc;
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;
    this.config = getDynamicConfig(pageWidth, pageHeight, templateKey);
    this.textRenderer = new TextRenderer(doc);
  }

  /**
   * Add content page with course content table and seal
   */
  async addContentPage(
    participant: CertificateParticipant,
    certificateData: CertificateGeneration,
    sealImage?: string,
    controlNumbers?: any,
    isPreview?: boolean,
  ): Promise<void> {
    const { contentPage } = this.config;

    // Define content area - use upper half for back of certificate
    const contentArea = {
      x: contentPage.margin,
      y: contentPage.margin,
      width: this.pageWidth - contentPage.margin * 2,
      height: contentPage.upperHalfHeight - contentPage.margin * 2,
    };

    // Define column layout
    const layout = this.defineColumnLayout(contentArea);

    // Add "CONTENIDO" title (aligned to the left column start)
    this.renderContentTitle(contentArea, layout.leftColumnX);

    // Render course content in left column
    const PRINT_BUFFER = 5;
    const maxY = contentArea.y + contentArea.height - PRINT_BUFFER;

    this.renderCourseContent(
      certificateData.course_content,
      layout.leftColumnX,
      layout.currentY,
      layout.columnWidth,
      maxY,
    );

    // Render table with seal in right column
    await this.renderContentTable(
      participant,
      certificateData,
      layout.rightColumnX,
      layout.currentY,
      layout.columnWidth,
      sealImage,
      controlNumbers,
      isPreview,
    );
  }

  /**
   * Add content in the lower half of the same page (for single-page certificates)
   */
  async addContentPageSinglePage(
    participant: CertificateParticipant,
    certificateData: CertificateGeneration,
    sealImage?: string,
    controlNumbers?: any,
    isPreview?: boolean,
  ): Promise<void> {
    const { contentPage } = this.config;

    // Define content area in lower half of page
    const contentArea = {
      x: contentPage.margin,
      y: contentPage.upperHalfHeight + contentPage.margin,
      width: this.pageWidth - contentPage.margin * 2,
      height:
        this.pageHeight - contentPage.upperHalfHeight - contentPage.margin * 2,
    };

    // Define column layout
    const layout = this.defineColumnLayout(contentArea);

    // Add "CONTENIDO" title
    this.renderContentTitle(contentArea, layout.leftColumnX);

    // Render course content in left column
    const PRINT_BUFFER = 5;
    const maxY = contentArea.y + contentArea.height - PRINT_BUFFER;

    this.renderCourseContent(
      certificateData.course_content,
      layout.leftColumnX,
      layout.currentY,
      layout.columnWidth,
      maxY,
    );

    // Render table with seal in right column
    await this.renderContentTable(
      participant,
      certificateData,
      layout.rightColumnX,
      layout.currentY,
      layout.columnWidth,
      sealImage,
      controlNumbers,
      isPreview,
    );
  }

  /**
   * Render "CONTENIDO" title
   */
  private renderContentTitle(
    contentArea: { x: number; y: number },
    leftX: number,
  ): void {
    this.doc.saveGraphicsState();
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(16);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text("CONTENIDO", leftX, contentArea.y + 10, {
      align: "left",
    });
    this.doc.restoreGraphicsState();
  }

  /**
   * Define column layout for content page
   */
  private defineColumnLayout(contentArea: {
    x: number;
    y: number;
    width: number;
  }) {
    const columnGap = 15;
    const columnWidth = (contentArea.width - columnGap) / 2;

    const leftColumnX = contentArea.x;
    const rightColumnX = contentArea.x + columnWidth + columnGap;
    const currentY = contentArea.y + 20;

    return { leftColumnX, rightColumnX, columnWidth, currentY };
  }

  /**
   * Render course content in left column
   */
  private renderCourseContent(
    courseContent: string | undefined,
    leftColumnX: number,
    currentY: number,
    columnWidth: number,
    maxY?: number,
  ): void {
    if (!courseContent) return;

    this.doc.saveGraphicsState();

    // Pre-process text
    const plainText = stripHtml(courseContent);

    // Default settings
    const BASE_SIZE = 8;
    const MIN_SIZE = 6; // Allow a bit smaller but still readable
    const BASE_LINE_HEIGHT = 4.0;
    const WRAP_SAFETY = 5; // Reduced safety to allow more text width

    let fontSize = BASE_SIZE;
    let lineHeight = BASE_LINE_HEIGHT;
    let contentLines: string[] = [];
    const font = "helvetica";

    // Set font state before measurement
    this.doc.setFont(font, "normal");
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(0, 0, 0);
    this.doc.setCharSpace(0);
    this.doc.setLineHeightFactor(1.15);

    const availableHeight = (maxY ?? currentY + 100) - currentY;

    // Build content lines, reducing font only down to MIN_SIZE
    while (fontSize >= MIN_SIZE) {
      this.doc.setFontSize(fontSize);
      lineHeight = (fontSize * 1.2) / 2.83465;

      const paragraphs = plainText.split("\n").filter((p) => p.trim());
      contentLines = [];
      for (const para of paragraphs) {
        const wrapped = this.doc.splitTextToSize(
          para.trim(),
          columnWidth - WRAP_SAFETY,
        );
        contentLines.push(...wrapped);
      }

      if (contentLines.length * lineHeight <= availableHeight) break;
      fontSize -= 0.5;
    }

    // Hard-cap lines: truncate what doesn't fit
    const maxLines = Math.floor(availableHeight / lineHeight);
    if (contentLines.length > maxLines) {
      contentLines = contentLines.slice(0, maxLines);
      // Add ellipsis to last line if truncated
      if (contentLines.length > 0) {
        contentLines[contentLines.length - 1] += "...";
      }
    }

    // Render lines
    let y = currentY;
    this.doc.setFontSize(fontSize);

    for (const line of contentLines) {
      if (maxY !== undefined && y + lineHeight > maxY + 2) break;

      this.doc.text(line.trim(), leftColumnX, y, { align: "left" });
      y += lineHeight;
    }

    this.doc.restoreGraphicsState();
  }

  /**
   * Render content table with seal in right column
   */
  private async renderContentTable(
    participant: CertificateParticipant,
    certificateData: CertificateGeneration,
    rightColumnX: number,
    currentY: number,
    columnWidth: number,
    sealImage?: string,
    controlNumbers?: any,
    isPreview?: boolean,
  ): Promise<void> {
    const { contentPage } = this.config;
    const tableY = currentY - 5;
    const cellHeight = contentPage.tableCellHeight;

    // Reset state for table
    this.doc.setCharSpace(0);
    this.doc.setLineHeightFactor(1.15);

    // Draw table structure
    this.drawTableStructure(rightColumnX, tableY, columnWidth, cellHeight);

    // Add table content
    this.addTableContent(
      participant,
      certificateData,
      rightColumnX,
      tableY,
      columnWidth,
      cellHeight,
      controlNumbers,
      isPreview,
    );

    // Add seal image if provided
    if (sealImage) {
      await this.addSealImage(
        sealImage,
        rightColumnX,
        tableY,
        columnWidth,
        cellHeight,
      );
    }
  }

  /**
   * Draw table structure with borders and lines
   */
  private drawTableStructure(
    tableX: number,
    tableY: number,
    tableWidth: number,
    cellHeight: number,
  ): void {
    this.doc.setDrawColor(100, 100, 100);
    this.doc.setLineWidth(0.1);
    this.doc.rect(tableX, tableY, tableWidth, cellHeight * 4);

    // Horizontal rows
    for (let i = 1; i <= 3; i++) {
      this.doc.line(
        tableX,
        tableY + cellHeight * i,
        tableX + tableWidth,
        tableY + cellHeight * i,
      );
    }

    // Vertical columns
    // Row 2: Two columns
    this.doc.line(
      tableX + tableWidth / 2,
      tableY + cellHeight,
      tableX + tableWidth / 2,
      tableY + cellHeight * 2,
    );
    // Row 3: Three columns
    this.doc.line(
      tableX + tableWidth / 3,
      tableY + cellHeight * 2,
      tableX + tableWidth / 3,
      tableY + cellHeight * 3,
    );
    this.doc.line(
      tableX + (tableWidth * 2) / 3,
      tableY + cellHeight * 2,
      tableX + (tableWidth * 2) / 3,
      tableY + cellHeight * 3,
    );
  }

  /**
   * Add content to table cells
   */
  private addTableContent(
    participant: CertificateParticipant,
    certificateData: CertificateGeneration,
    tableX: number,
    tableY: number,
    tableWidth: number,
    cellHeight: number,
    controlNumbers?: any,
    isPreview?: boolean,
  ): void {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    this.doc.setCharSpace(0);

    // Row 1: REGISTRO
    this.doc.text(
      "REGISTRO",
      tableX + tableWidth / 2,
      tableY + cellHeight / 2 + 1.5,
      { align: "center" },
    );

    // Row 2
    const libro = controlNumbers?.nro_libro ?? "";
    const control = controlNumbers?.nro_control ?? "";
    this.doc.text(
      libro ? `Libro Nro: ${libro}` : "Libro Nro:",
      tableX + tableWidth / 4,
      tableY + cellHeight + cellHeight / 2 + 1.5,
      { align: "center" },
    );
    this.doc.text(
      control ? `Nro. Control: ${control}` : "Nro. Control:",
      tableX + (tableWidth * 3) / 4,
      tableY + cellHeight + cellHeight / 2 + 1.5,
      { align: "center" },
    );

    // Row 3
    const dateStr = this.formatDate(certificateData.date);
    const hoja = controlNumbers?.nro_hoja ?? "";
    const month = this.formatMonth(certificateData.date);
    this.doc.text(
      `Fecha: ${dateStr}`,
      tableX + tableWidth / 6,
      tableY + cellHeight * 2 + cellHeight / 2 + 1.5,
      { align: "center" },
    );
    this.doc.text(
      hoja ? `Hoja Nro: ${hoja}` : "Hoja Nro:",
      tableX + tableWidth / 2,
      tableY + cellHeight * 2 + cellHeight / 2 + 1.5,
      { align: "center" },
    );
    this.doc.text(
      `Mes: ${month}`,
      tableX + (tableWidth * 5) / 6,
      tableY + cellHeight * 2 + cellHeight / 2 + 1.5,
      { align: "center" },
    );

    // Row 4
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(6);
    this.textRenderer.renderIDText(
      participant,
      tableX + tableWidth / 2,
      tableY + cellHeight * 3 + cellHeight / 2 - 1,
    );
    this.doc.text(
      `Nombre: ${participant.name}`,
      tableX + tableWidth / 2,
      tableY + cellHeight * 3 + cellHeight / 2 + 2,
      { align: "center" },
    );
  }

  private async addSealImage(
    sealImage: string,
    tableX: number,
    tableY: number,
    tableWidth: number,
    cellHeight: number,
  ): Promise<void> {
    const { contentPage, seal } = this.config;

    // Priority 1: Use specific contentPage overrides if they exist
    // Priority 2: Use top-level seal config if it exists
    // Priority 3: Fallback to dynamic calculation relative to the table
    const sealY = contentPage.sealY ?? seal?.y ?? tableY + cellHeight * 4 + 8;
    const sealX =
      contentPage.sealX ??
      seal?.x ??
      tableX + tableWidth / 2 - (seal?.size ?? contentPage.sealSize) / 2;
    const sealSize = seal?.size ?? contentPage.sealSize;

    try {
      // Check if we're in a server environment
      if (typeof window === "undefined") {
        const fs = require("fs");
        const path = require("path");

        let imagePath = sealImage;
        if (sealImage.startsWith("/")) {
          imagePath = path.join(process.cwd(), "public", sealImage);
        }

        if (fs.existsSync(imagePath)) {
          const imageBuffer = fs.readFileSync(imagePath);
          const base64Image = imageBuffer.toString("base64");
          this.doc.addImage(
            `data:image/png;base64,${base64Image}`,
            "PNG",
            sealX,
            sealY,
            sealSize,
            sealSize,
            undefined,
            "FAST",
          );
        }
        return;
      }

      // Browser environment
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.doc.addImage(
            img,
            "PNG",
            sealX,
            sealY,
            sealSize,
            sealSize,
            undefined,
            "FAST",
          );
          resolve();
        };
        img.onerror = () => {
          this.doc.setDrawColor(200, 200, 200);
          this.doc.rect(sealX, sealY, sealSize, sealSize);
          resolve();
        };
        img.src = sealImage;
      });
    } catch (e) {}
  }

  private formatDate(date: string | undefined): string {
    if (!date) return new Date().toLocaleDateString("es-ES");
    const d = date.includes("T")
      ? new Date(date)
      : new Date(date + "T12:00:00");
    return d.toLocaleDateString("es-ES");
  }

  private formatMonth(date: string | undefined): string {
    if (!date) return new Date().toLocaleDateString("es-ES", { month: "long" });
    const d = date.includes("T")
      ? new Date(date)
      : new Date(date + "T12:00:00");
    return d.toLocaleDateString("es-ES", { month: "long" });
  }
}
