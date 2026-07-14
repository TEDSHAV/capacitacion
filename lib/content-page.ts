import jsPDF from "jspdf";
import { CertificateParticipant, CertificateGeneration } from "@/types";
import { getDynamicConfig } from "./certificate-config";
import { TextRenderer } from "./text-renderer";

export class ContentPage {
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
   * Add content page with course content table and seal
   */
  async addContentPage(
    participant: CertificateParticipant,
    certificateData: CertificateGeneration,
    sealImage?: string,
    controlNumbers?: any,
    isPreview?: boolean
  ): Promise<void> {
    const { contentPage } = this.config;
    
    // Define content area
    const contentArea = {
      x: contentPage.margin,
      y: contentPage.margin,
      width: this.pageWidth - (contentPage.margin * 2),
      height: contentPage.upperHalfHeight - (contentPage.margin * 2)
    };

    // Add "CONTENIDO" title
    this.renderContentTitle(contentArea);

    // Define column layout
    const { leftColumnX, rightColumnX, columnWidth, currentY } = this.defineColumnLayout(contentArea);

    // Render course content in left column
    this.renderCourseContent(certificateData.course_content, leftColumnX, currentY, columnWidth);

    // Render table with seal in right column
    await this.renderContentTable(participant, certificateData, rightColumnX, currentY, columnWidth, sealImage, controlNumbers, isPreview);
  }

  /**
   * Render "CONTENIDO" title
   */
  private renderContentTitle(contentArea: { x: number; y: number }): void {
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(16);
    this.doc.text(
      "CONTENIDO",
      this.pageWidth / 2,
      contentArea.y + 10,
      { align: "center" }
    );
  }

  /**
   * Define column layout for content page
   */
  private defineColumnLayout(contentArea: { x: number; y: number; width: number }) {
    const leftColumnX = contentArea.x;
    const rightColumnX = contentArea.x + (contentArea.width / 2) + 5;
    const columnWidth = (contentArea.width / 2) - 5;
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
    columnWidth: number
  ): void {
    if (!courseContent) return;

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9);

    const contentLines = this.doc.splitTextToSize(courseContent, columnWidth);
    const lineHeight = 5;

    contentLines.forEach((line: string, index: number) => {
      const lineY = currentY + (index * lineHeight);
      this.doc.text(line, leftColumnX, lineY);
    });
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
    isPreview?: boolean
  ): Promise<void> {
    const { contentPage } = this.config;
    const tableY = currentY - 5;
    const cellHeight = contentPage.tableCellHeight;

    // Draw table structure
    this.drawTableStructure(rightColumnX, tableY, columnWidth, cellHeight);

    // Add table content
    this.addTableContent(participant, certificateData, rightColumnX, tableY, columnWidth, cellHeight, controlNumbers, isPreview);

    // Add seal image if provided
    if (sealImage) {
      await this.addSealImage(sealImage, rightColumnX, tableY, columnWidth, cellHeight);
    }
  }

  /**
   * Draw table structure with borders and lines
   */
  private drawTableStructure(
    tableX: number,
    tableY: number,
    tableWidth: number,
    cellHeight: number
  ): void {
    // Draw outer table border
    this.doc.setDrawColor(100, 100, 100);
    this.doc.rect(tableX, tableY, tableWidth, cellHeight * 4);
    
    // Draw horizontal lines for rows
    this.doc.line(tableX, tableY + cellHeight, tableX + tableWidth, tableY + cellHeight);
    this.doc.line(tableX, tableY + cellHeight * 2, tableX + tableWidth, tableY + cellHeight * 2);
    this.doc.line(tableX, tableY + cellHeight * 3, tableX + tableWidth, tableY + cellHeight * 3);
    
    // Draw vertical lines for columns
    // Row 2: Two columns (50% each)
    this.doc.line(tableX + tableWidth / 2, tableY + cellHeight, tableX + tableWidth / 2, tableY + cellHeight * 2);
    
    // Row 3: Three columns (1/3 each)
    this.doc.line(tableX + tableWidth / 3, tableY + cellHeight * 2, tableX + tableWidth / 3, tableY + cellHeight * 3);
    this.doc.line(tableX + (tableWidth * 2) / 3, tableY + cellHeight * 2, tableX + (tableWidth * 2) / 3, tableY + cellHeight * 3);
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
    isPreview?: boolean
  ): void {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    
    // Row 1: REGISTRO title
    this.doc.text(
      "REGISTRO",
      tableX + tableWidth / 2,
      tableY + cellHeight / 2 + 1.5,
      { align: "center" }
    );
    
    // Row 2: Libro Nro and Nro Control
    const libroNro = controlNumbers?.nro_libro ?? '';
    const controlNro = controlNumbers?.nro_control ?? '';
    
    this.doc.text(
      libroNro ? `Libro Nro: ${libroNro}` : 'Libro Nro:',
      tableX + tableWidth / 4,
      tableY + cellHeight + cellHeight / 2 + 1.5,
      { align: "center" }
    );
    this.doc.text(
      controlNro ? `Nro. Control: ${controlNro}` : 'Nro. Control:',
      tableX + tableWidth * 3 / 4,
      tableY + cellHeight + cellHeight / 2 + 1.5,
      { align: "center" }
    );
    
    // Row 3: Fecha Ejecucion, Hoja Nro and Mes
    const executionDate = this.formatDate(certificateData.date);
    this.doc.text(
      `Fecha: ${executionDate}`,
      tableX + tableWidth / 6,
      tableY + cellHeight * 2 + cellHeight / 2 + 1.5,
      { align: "center" }
    );
    
    const hojaNro = controlNumbers?.nro_hoja ?? '';
    this.doc.text(
      hojaNro ? `Hoja Nro: ${hojaNro}` : 'Hoja Nro:',
      tableX + tableWidth / 2,
      tableY + cellHeight * 2 + cellHeight / 2 + 1.5,
      { align: "center" }
    );
    
    const month = this.formatMonth(certificateData.date);
    this.doc.text(
      `Mes: ${month}`,
      tableX + tableWidth * 5 / 6,
      tableY + cellHeight * 2 + cellHeight / 2 + 1.5,
      { align: "center" }
    );
    
    // Row 4: CI and Nombre
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(6);
    
    // Use TextRenderer for ID text
    this.textRenderer.renderIDText(
      participant,
      tableX + tableWidth / 2,
      tableY + cellHeight * 3 + cellHeight / 2 - 1
    );
    
    this.doc.text(
      `Nombre: ${participant.name}`,
      tableX + tableWidth / 2,
      tableY + cellHeight * 3 + cellHeight / 2 + 2,
      { align: "center" }
    );
  }

  /**
   * Add seal image below table
   */
  private async addSealImage(
    sealImage: string,
    tableX: number,
    tableY: number,
    tableWidth: number,
    cellHeight: number
  ): Promise<void> {
    const { contentPage } = this.config;
    const sealY = tableY + (cellHeight * 4) + 8; // After all 4 table rows + 8mm spacing
    const sealX = tableX + tableWidth / 2 - contentPage.sealSize / 2;
    
    try {
      console.log("Adding seal image at:", { x: sealX, y: sealY, sealImage });
      
      // Simple image loading
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.doc.addImage(img, "PNG", sealX, sealY, contentPage.sealSize, contentPage.sealSize);
          console.log("Seal image added successfully");
          resolve();
        };
        img.onerror = (error) => {
          console.error("Failed to load seal image:", error);
          // Draw placeholder
          this.doc.setDrawColor(200, 200, 200);
          this.doc.rect(sealX, sealY, contentPage.sealSize, contentPage.sealSize);
          resolve();
        };
        img.src = sealImage;
      });
      
    } catch (error) {
      console.error("Error adding seal image:", error);
    }
  }

  /**
   * Format date for display
   */
  private formatDate(date: string | undefined): string {
    if (!date) {
      return new Date().toLocaleDateString("es-ES", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });
    }

    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  }

  /**
   * Format month for display
   */
  private formatMonth(date: string | undefined): string {
    if (!date) {
      return new Date().toLocaleDateString("es-ES", { month: "long" });
    }

    return new Date(date).toLocaleDateString("es-ES", { month: "long" });
  }
}
