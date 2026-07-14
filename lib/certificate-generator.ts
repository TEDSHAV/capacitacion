import jsPDF from "jspdf";
import { CertificateParticipant, CertificateGeneration, Signature, Facilitador } from "@/types";

interface CertificateData {
  participant: CertificateParticipant;
  certificateData: CertificateGeneration;
  templateImage: string;
  sealImage?: string;
}

export class CertificateGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  private async getSignatureData(signatureId: string): Promise<Signature | null> {
    try {
      const response = await fetch(`/api/signatures/${signatureId}`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching signature:', error);
      return null;
    }
  }

  private async getFacilitatorData(facilitatorId: string): Promise<Facilitador | null> {
    try {
      const response = await fetch(`/api/facilitators/${facilitatorId}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching facilitator:', error);
    }
    return null;
  }

  async generateCertificate(data: CertificateData): Promise<Blob> {
    const { participant, certificateData, templateImage, sealImage } = data;

    // Clear any existing content
    this.doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Page 1: Certificate
    await this.addCertificatePage(templateImage, participant, certificateData);

    // Add new page for content
    this.doc.addPage();

    // Page 2: Content table with seal
    await this.addContentPage(participant, certificateData, sealImage);

    // Return as blob
    return this.doc.output("blob");
  }

  private async addCertificatePage(
    templateImage: string,
    participant: CertificateParticipant,
    certificateData: CertificateGeneration,
  ): Promise<void> {
    // Add template background
    await this.addTemplate(templateImage);

    // Add certificate content
    await this.addCertificateContent(participant, certificateData);
  }

  private async addContentPage(
    participant: CertificateParticipant,
    certificateData: CertificateGeneration,
    sealImage?: string,
  ): Promise<void> {
    // Add "CONTENIDO" title at center
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(20);
    this.doc.text("CONTENIDO", this.pageWidth / 2, 30, { align: "center" });

    // Define column positions
    const leftColumnX = 20;
    const rightColumnX = this.pageWidth / 2 + 20;
    const columnWidth = this.pageWidth / 2 - 40;
    const lineHeight = 6;
    let currentY = 50;

    // Draw column separator line
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(
      this.pageWidth / 2,
      40,
      this.pageWidth / 2,
      this.pageHeight - 20,
    );

    // Left column: Course content
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(11);

    if (certificateData.course_content) {
      const contentLines = this.doc.splitTextToSize(
        certificateData.course_content,
        columnWidth,
      );

      contentLines.forEach((line: string) => {
        this.doc.text(line, leftColumnX, currentY);
        currentY += lineHeight;
      });
    }

    // Right column: Table with seal
    currentY = 50;

    // Add horas_estimadas if available - positioned after Fecha de Ejecución
    // We'll add this later in the table after the fecha line

    // Draw table border
    this.doc.setDrawColor(100, 100, 100);
    this.doc.rect(rightColumnX - 5, currentY - 10, columnWidth + 10, 120);

    // Table header
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(12);
    this.doc.text("REGISTRO", rightColumnX, currentY);
    currentY += lineHeight;

    // Draw horizontal line after header
    this.doc.setDrawColor(150, 150, 150);
    this.doc.line(
      rightColumnX - 5,
      currentY + 2,
      rightColumnX + columnWidth + 5,
      currentY + 2,
    );
    currentY += lineHeight * 2;

    // First row: Libro Nro
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(11);
    this.doc.text("Libro Nro: 100", rightColumnX, currentY);
    currentY += lineHeight;

    // First row: Nro. Control
    this.doc.text("Nro. Control: 321213", rightColumnX, currentY);
    currentY += lineHeight;

    // Second row: Fecha de Ejecución
    const executionDate = certificateData.date
      ? new Date(certificateData.date).toLocaleDateString("es-ES", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        })
      : new Date().toLocaleDateString("es-ES", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        });
    this.doc.text(
      `Fecha de Ejecución: ${executionDate}`,
      rightColumnX,
      currentY,
    );
    currentY += lineHeight;

    // Second row: Hoja Nro
    this.doc.text("Hoja Nro: 1", rightColumnX, currentY);
    currentY += lineHeight;

    // Second row: Month
    const month = certificateData.date
      ? new Date(certificateData.date).toLocaleDateString("es-ES", {
          month: "long",
        })
      : new Date().toLocaleDateString("es-ES", { month: "long" });
    this.doc.text(`Mes: ${month}`, rightColumnX, currentY);
    currentY += lineHeight * 2; // Extra space before seal

    // Third row: CI and Nombre
    this.doc.setFont("helvetica", "bold");
    this.doc.text(
      `CI: ${participant.id_type || "V-"}${participant.id_number}`,
      rightColumnX,
      currentY,
    );
    currentY += lineHeight;
    this.doc.text(`Nombre: ${participant.name}`, rightColumnX, currentY);
    currentY += lineHeight * 2; // Space for seal

    // Add seal image if provided
    if (sealImage) {
      try {
        await this.addSealImage(sealImage, rightColumnX + 10, currentY);
      } catch (error) {
        console.error("Error adding seal image:", error);
        // Fallback: draw a placeholder rectangle
        this.doc.setDrawColor(200, 200, 200);
        this.doc.rect(rightColumnX + 10, currentY, 40, 40);
        this.doc.setFont("helvetica", "italic");
        this.doc.setFontSize(8);
        this.doc.text("Sello", rightColumnX + 30, currentY + 20, {
          align: "center",
        });
      }
    }
  }

  private async addTemplate(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Add image to cover entire page
        this.doc.addImage(img, "PNG", 0, 0, this.pageWidth, this.pageHeight);
        resolve();
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  private async addSealImage(
    imageUrl: string,
    x: number,
    y: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Add seal image with reasonable size (40x40mm)
        this.doc.addImage(img, "PNG", x, y, 40, 40);
        resolve();
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }

    private async addCertificateContent(
    participant: CertificateParticipant,
    certificateData: CertificateGeneration,
  ): Promise<void> {
    const { name } = participant;
    const { certificate_title, certificate_subtitle, date } = certificateData;

    // Certificate content with unified centering logic
    const nameMaxWidth = 180; // Maximum width in mm for participant name (largest)
    const conditionalTextMaxWidth = 160; // Max width for conditional text
    const titleMaxWidth = 160; // Maximum width in mm for title (about 5.9 inches)
    const subtitleMaxWidth = 120; // Maximum width in mm for subtitle (smaller than title)
    const lineHeight = 8; // Line height in mm
    const uniformGap = 3; // Uniform gap in mm between all elements

    let totalContentHeight = 0;
    let nameLines: string[] = [];
    let conditionalLines: string[] = [];
    let titleLines: string[] = [];
    let subtitleLines: string[] = [];

    // Process participant name (primary element)
    if (name) {
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(12, 63, 105); // Primary blue color matching theme
      const nameFontSize = this.calculateFontSize(name, 30);
      this.doc.setFontSize(nameFontSize);

      nameLines = this.doc.splitTextToSize(name.toUpperCase(), nameMaxWidth);
      totalContentHeight += nameLines.length * lineHeight;
    }

    // Process conditional text
    let hasConditionalText = false;
    let conditionalText = "";
    if (participant.score !== undefined && participant.score !== null) {
      hasConditionalText = true;
      conditionalText =
        participant.score! >= (certificateData.passing_grade || 0)
          ? "Por haber aprobado el curso:"
          : "Por haber asistido al curso:";

      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor("black");
      this.doc.setFontSize(18);

      conditionalLines = this.doc.splitTextToSize(
        conditionalText,
        conditionalTextMaxWidth,
      );
      if (nameLines.length > 0) {
        totalContentHeight += uniformGap;
      }
      totalContentHeight += conditionalLines.length * lineHeight;
    }

    // Process title
    if (certificate_title) {
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(12, 63, 120); // Primary blue color matching theme
      const titleFontSize = this.calculateFontSize(certificate_title, 30);
      this.doc.setFontSize(titleFontSize);

      titleLines = this.doc.splitTextToSize(
        certificate_title.toUpperCase(),
        titleMaxWidth,
      );
      if (conditionalLines.length > 0) {
        totalContentHeight += uniformGap;
      }
      totalContentHeight += titleLines.length * lineHeight;
    }

    // Process subtitle (handled separately below main elements)
    if (certificate_subtitle) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(12, 63, 105); // Primary blue color matching theme
      const subtitleFontSize = this.calculateFontSize(
        certificate_subtitle!,
        20,
      );
      this.doc.setFontSize(subtitleFontSize);

      subtitleLines = this.doc.splitTextToSize(
        certificate_subtitle.toUpperCase(),
        subtitleMaxWidth,
      );
      // Note: subtitle height NOT added to totalContentHeight - it takes space from bottom
    }

    // Calculate starting Y position to center the main content (name, conditional, title)
    // Subtitle will be added below and take space from bottom
    const centerPoint = 80; // Fixed center point for main content
    const mainElementsHeight =
      nameLines.length * lineHeight +
      conditionalLines.length * lineHeight +
      titleLines.length * lineHeight +
      (nameLines.length > 0 && conditionalLines.length > 0 ? uniformGap : 0) +
      (conditionalLines.length > 0 && titleLines.length > 0 ? uniformGap : 0) +
      (nameLines.length > 0 &&
      titleLines.length > 0 &&
      conditionalLines.length === 0
        ? uniformGap
        : 0);

    const startY = centerPoint - mainElementsHeight / 2;
    let currentY = startY;

    // Draw participant name lines (primary element)
    if (nameLines.length > 0) {
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(12, 63, 105); // Primary blue color matching theme
      const nameFontSize = this.calculateFontSize(name, 30);
      this.doc.setFontSize(nameFontSize);

      nameLines.forEach((line: string, index: number) => {
        const lineY = currentY + index * lineHeight + lineHeight;
        this.doc.text(line, this.pageWidth / 2, lineY, { align: "center" });
      });
      currentY += nameLines.length * lineHeight;

      // Add gap if conditional text exists
      if (conditionalLines.length > 0) {
        currentY += uniformGap;
      }
    }

    // Draw conditional text lines
    if (conditionalLines.length > 0) {
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor("black");
      this.doc.setFontSize(18);

      conditionalLines.forEach((line: string, index: number) => {
        const lineY = currentY + index * lineHeight + lineHeight;
        this.doc.text(line, this.pageWidth / 2, lineY, { align: "center" });
      });
      currentY += conditionalLines.length * lineHeight;

      // Add gap if title exists
      if (titleLines.length > 0) {
        currentY += uniformGap;
      }
    }

    // Draw title lines
    if (titleLines.length > 0) {
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(12, 63, 120); // Primary blue color matching theme
      const titleFontSize = this.calculateFontSize(certificate_title, 30);
      this.doc.setFontSize(titleFontSize);

      titleLines.forEach((line: string, index: number) => {
        const lineY = currentY + index * lineHeight + lineHeight;
        this.doc.text(line, this.pageWidth / 2, lineY, { align: "center" });
      });
      currentY += titleLines.length * lineHeight;

      // Add gap if subtitle exists
      if (subtitleLines.length > 0) {
        currentY += uniformGap;
      }
    }

    // Draw subtitle lines (positioned below main elements, takes space from bottom)
    if (subtitleLines.length > 0) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(12, 63, 105); // Primary blue color matching theme
      const subtitleFontSize = this.calculateFontSize(
        certificate_subtitle!,
        20,
      );
      this.doc.setFontSize(subtitleFontSize);

      // Position subtitle below the main elements with a gap
      const subtitleY = currentY;

      subtitleLines.forEach((line: string, index: number) => {
        const lineY = subtitleY + index * lineHeight + lineHeight;
        this.doc.text(line, this.pageWidth / 2, lineY, { align: "center" });
      });
    }

    // Date
    if (date) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(12);
      this.doc.setTextColor(0, 0, 0); // Set to black

      const localDate = new Date(date + "T12:00:00");
      const formattedDate = localDate.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      this.doc.text(
        `Puerto la Cruz, ${formattedDate}`,
        this.pageWidth / 2,
        160,
        {
          align: "center",
        },
      );
      
      // Add horas_estimadas if available - below the date
      console.log('Checking horas_estimadas in PDF generator:', certificateData.horas_estimadas);
      if (certificateData.horas_estimadas) {
        console.log('Adding horas_estimadas to PDF:', certificateData.horas_estimadas);
        this.doc.setFont("helvetica", "bold");
        this.doc.setFontSize(12);
        this.doc.text(
          `${certificateData.horas_estimadas} horas`,
          this.pageWidth / 2 + 10,
          150.9,
          {
            align: "center",
          },
        );
      } else {
        console.log('No horas_estimadas found in certificate data');
      }

      // Add signatures if available
      await this.addSignatures(certificateData);
    }

    // Add duration hours by fetching course data
  }

  private async addSignatures(certificateData: CertificateGeneration): Promise<void> {
    const signatureY = 185; // Y position for signatures
    const signatureWidth = 40; // Width of signature images
    const signatureHeight = 20; // Height of signature images
    const leftSignatureX = 50; // X position for facilitator signature
    const rightSignatureX = this.pageWidth - 90; // X position for SHA signature

    // Add facilitator signature if available
    if (certificateData.facilitator_id) {
      const facilitator = await this.getFacilitatorData(certificateData.facilitator_id);
      console.log('Facilitator data for signature:', facilitator);
      
      if (facilitator) {
        try {
          // If facilitator has a signature, use it; otherwise just show name
          if (facilitator.firma_id) {
            console.log('Fetching signature with ID:', facilitator.firma_id);
            const signature = await this.getSignatureData(facilitator.firma_id.toString());
            if (signature && signature.url_imagen) {
              console.log('Adding facilitator signature image:', signature.url_imagen);
              await this.addSignatureImage(signature.url_imagen, leftSignatureX, signatureY, signatureWidth, signatureHeight);
            } else {
              console.log('Signature not found or missing url_imagen');
            }
          } else {
            console.log('Facilitator has no firma_id');
          }
          
          // Add facilitator name and title
          this.doc.setFont("helvetica", "normal");
          this.doc.setFontSize(10);
          this.doc.text(facilitator.nombre_apellido || "Facilitador", leftSignatureX, signatureY + signatureHeight + 5, { align: "center" });
          this.doc.text("Facilitador", leftSignatureX, signatureY + signatureHeight + 10, { align: "center" });
        } catch (error) {
          console.error('Error adding facilitator signature:', error);
        }
      } else {
        console.log('Facilitator not found for ID:', certificateData.facilitator_id);
      }
    } else {
      console.log('No facilitator_id in certificate data');
    }

    // Add SHA signature if available
    if (certificateData.sha_signature_id) {
      const shaSignature = await this.getSignatureData(certificateData.sha_signature_id);
      if (shaSignature) {
        try {
          // Add signature image
          await this.addSignatureImage(shaSignature.url_imagen, rightSignatureX, signatureY, signatureWidth, signatureHeight);
          
          // Add signature label
          this.doc.setFont("helvetica", "normal");
          this.doc.setFontSize(10);
          this.doc.text(shaSignature.nombre, rightSignatureX, signatureY + signatureHeight + 5, { align: "center" });
          this.doc.text("Representante SHA", rightSignatureX, signatureY + signatureHeight + 10, { align: "center" });
        } catch (error) {
          console.error('Error adding SHA signature:', error);
        }
      }
    }
  }

  private async addSignatureImage(imageUrl: string, x: number, y: number, width: number, height: number): Promise<void> {
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

  private calculateFontSize(text: string, maxFontSize: number): number {
    // Simple font size calculation based on text length
    const textLength = text.length;
    if (textLength <= 20) return maxFontSize;
    if (textLength <= 30) return maxFontSize - 4;
    if (textLength <= 40) return maxFontSize - 8;
    if (textLength <= 50) return maxFontSize - 12;
    return Math.max(maxFontSize - 16, 12);
  }

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
        console.error(
          `Error generating certificate for ${participant.name}:`,
          error,
        );
        // Continue with other participants even if one fails
      }
    }

    return certificates;
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
}
