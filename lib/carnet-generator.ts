import jsPDF from 'jspdf';
import { CarnetGeneration, CarnetRequest } from '@/types';
import { QRService } from '@/lib/qr-service';

export class CarnetGenerator {
  private pdf: jsPDF;
  private pageWidth: number;
  private pageHeight: number;

  constructor() {
    this.pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [86, 54] // Standard credit card size
    });
    this.pageWidth = 86;
    this.pageHeight = 54;
  }

  async generateCarnet(request: CarnetRequest): Promise<Blob> {
    const { participant, carnetData, templateImage, isPreview = false, carnetId, qrDataURL } = request;

    try {
      console.log('🎨 Generating carnet PDF for:', participant.name);
      console.log('📄 Template:', templateImage);
      console.log('🆔 Carnet ID:', carnetId);
      
      // Add background design
      await this.addPngBackground(templateImage);

      // Add participant information
      await this.addParticipantInfo(participant, carnetData);

      // Add course information
      await this.addCourseInfo(carnetData);

      // Add dates
      await this.addDates(carnetData);

      // Add QR code
      await this.addQRCode(qrDataURL);

      // Add preview watermark if needed
      if (isPreview) {
        this.addPreviewWatermark();
      }

      const blob = this.pdf.output('blob');
      console.log('✅ Carne PDF generated successfully');
      return blob;
    } catch (error) {
      console.error('💥 Error generating carnet:', error);
      throw new Error(`Failed to generate carnet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async addBackgroundDesign(): Promise<void> {
    console.log('🎨 Adding professional background design');
    
    // Add gradient-like background
    this.pdf.setFillColor(250, 250, 250);
    this.pdf.rect(0, 0, this.pageWidth, this.pageHeight, 'F');
    
    // Add main border
    this.pdf.setDrawColor(100, 100, 100);
    this.pdf.rect(2, 2, this.pageWidth - 4, this.pageHeight - 4);
    
    // Add decorative elements
    this.pdf.setDrawColor(200, 200, 200);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(2, 15, this.pageWidth - 2, 15); // Top separator
    this.pdf.line(2, 40, this.pageWidth - 2, 40); // Bottom separator
    
    // Add corner decorations
    this.pdf.setDrawColor(150, 150, 150);
    this.pdf.setLineWidth(1);
    // Top-left corner
    this.pdf.line(2, 2, 8, 2);
    this.pdf.line(2, 2, 2, 8);
    // Top-right corner
    this.pdf.line(this.pageWidth - 8, 2, this.pageWidth - 2, 2);
    this.pdf.line(this.pageWidth - 2, 2, this.pageWidth - 2, 8);
    // Bottom-left corner
    this.pdf.line(2, this.pageHeight - 8, 2, this.pageHeight - 2);
    this.pdf.line(2, this.pageHeight - 2, 8, this.pageHeight - 2);
    // Bottom-right corner
    this.pdf.line(this.pageWidth - 8, this.pageHeight - 2, this.pageWidth - 2, this.pageHeight - 2);
    this.pdf.line(this.pageWidth - 2, this.pageHeight - 8, this.pageWidth - 2, this.pageHeight - 2);
    
    // Add title
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('CARNET', 43, 10, { align: 'center' });
    
    console.log('✅ Background design added successfully');
  }

  private async addPngBackground(templatePath: string): Promise<void> {
    try {
      console.log('🎨 Loading PNG template:', templatePath);
      
      // Skip template if no image path provided
      if (!templatePath) {
        console.log('No template image provided, skipping template');
        this.addBackgroundDesign();
        return;
      }

      // Check if we're in a server environment
      if (typeof window === 'undefined') {
        // Server environment - use fs to read image file
        const fs = require('fs');
        const path = require('path');
        
        // Convert URL to file path
        let imagePath = templatePath;
        if (templatePath.startsWith('/')) {
          imagePath = path.join(process.cwd(), 'public', templatePath);
        }
        
        console.log('Server environment, loading carnet template from file:', imagePath);
        
        // Check if file exists
        if (fs.existsSync(imagePath)) {
          // Read file as base64
          const imageBuffer = fs.readFileSync(imagePath);
          const base64Image = imageBuffer.toString('base64');
          
          // Add base64 image to PDF - cover the entire carnet
          this.pdf.addImage(`data:image/png;base64,${base64Image}`, "PNG", 0, 0, this.pageWidth, this.pageHeight);
          console.log('Carnet template image loaded successfully in server environment');
        } else {
          console.warn('Carnet template image file not found:', imagePath);
          this.addBackgroundDesign();
        }
        return;
      }

      // Browser environment - use Image constructor
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          console.log('✅ Carne template loaded successfully:', templatePath);
          // Add image to PDF - cover the entire carnet
          this.pdf.addImage(img, "PNG", 0, 0, this.pageWidth, this.pageHeight);
          resolve();
        };
        img.onerror = (error) => {
          console.error('Error loading carnet template image in browser:', templatePath, error);
          console.warn('🔄 Falling back to background design for carnet');
          this.addBackgroundDesign();
          resolve();
        };
        img.src = templatePath;
      });
      
    } catch (error) {
      console.error('💥 Error loading PNG background:', error);
      this.addBackgroundDesign();
    }
  }

  private async addParticipantInfo(participant: any, carnetData: CarnetGeneration): Promise<void> {
    // Set font styles
    this.pdf.setFontSize(7);
    this.pdf.setFont('helvetica', 'bold');
    
    // Add participant name
    const nameY = 18;
    this.pdf.text(participant.name, 8, nameY, { maxWidth: 70 });
    
    // Add ID number
    this.pdf.setFontSize(5);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(`ID: ${participant.id_number}`, 8, nameY + 4);
    
    // Add company if available
    if (carnetData.empresa_participante) {
      this.pdf.setFontSize(4);
      this.pdf.text(carnetData.empresa_participante, 8, nameY + 7, { maxWidth: 70 });
    }
  }

  private async addCourseInfo(carnetData: CarnetGeneration): Promise<void> {
    // Set font styles
    this.pdf.setFontSize(7);
    this.pdf.setFont('helvetica', 'bold');
    
    // Add course title
    const courseY = 35;
    this.pdf.text(carnetData.titulo_curso, 10, courseY, { maxWidth: 70 });
  }

  private async addDates(carnetData: CarnetGeneration): Promise<void> {
    // Set font styles
    this.pdf.setFontSize(5);
    this.pdf.setFont('helvetica', 'normal');
    
    // Add emission date
    const emissionDate = new Date(carnetData.fecha_emision).toLocaleDateString('es-VE');
    this.pdf.text(`Emisión: ${emissionDate}`, 10, 45);
    
    // Add expiration date if available
    if (carnetData.fecha_vencimiento) {
      const expirationDate = new Date(carnetData.fecha_vencimiento).toLocaleDateString('es-VE');
      this.pdf.text(`Vencimiento: ${expirationDate}`, 10, 49);
    }
  }

  private async addQRCode(qrDataURL?: string): Promise<void> {
    try {
      if (!qrDataURL) {
        console.warn('No QR code data provided for carnet, using placeholder');
        this.addQRPlaceholder();
        return;
      }
      
      // Add QR code to bottom right corner of carnet
      const qrSize = 15; // 15mm for carnet
      const qrX = this.pageWidth - qrSize - 3;
      const qrY = this.pageHeight - qrSize - 3;
      
      // Add QR code image to PDF
      this.pdf.addImage(qrDataURL, 'PNG', qrX, qrY, qrSize, qrSize);
      
      // Add "Escanear" text below QR
      this.pdf.setFontSize(3);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text('Escanear', qrX + qrSize/2, qrY - 1, { align: 'center' });
      
      console.log('✅ QR code added to carnet from certificate');
    } catch (error) {
      console.error('Error adding QR code to carnet:', error);
      // Add fallback placeholder if QR addition fails
      this.addQRPlaceholder();
    }
  }

  private addQRPlaceholder(): void {
    // Fallback QR code placeholder
    const qrSize = 15;
    const qrX = this.pageWidth - qrSize - 3;
    const qrY = this.pageHeight - qrSize - 3;
    
    this.pdf.setDrawColor(0);
    this.pdf.rect(qrX, qrY, qrSize, qrSize);
    
    this.pdf.setDrawColor(50);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if ((i + j) % 2 === 0) {
          this.pdf.rect(qrX + i * 5, qrY + j * 5, 5, 5, 'F');
        }
      }
    }
    
    this.pdf.setFontSize(3);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Escanear', qrX + qrSize/2, qrY - 1, { align: 'center' });
    
    console.log('⚠️ QR placeholder added due to error');
  }

  private addPreviewWatermark(): void {
    this.pdf.setFontSize(20);
    this.pdf.setTextColor(200, 200, 200);
    this.pdf.setFont('helvetica', 'bold');
    
    // Add watermark text diagonally
    this.pdf.saveGraphicsState();
    this.pdf.setGState(this.pdf.GState({ opacity: 0.3 }));
    this.pdf.text('PREVIEW', this.pageWidth / 2, this.pageHeight / 2, {
      align: 'center',
      angle: 45
    });
    this.pdf.restoreGraphicsState();
    
    // Reset text color
    this.pdf.setTextColor(0, 0, 0);
  }

  async generateMultipleCarnets(
    requests: CarnetRequest[]
  ): Promise<Blob[]> {
    const blobs: Blob[] = [];
    
    for (const request of requests) {
      try {
        const blob = await this.generateCarnet(request);
        blobs.push(blob);
      } catch (error) {
        console.error('Error generating carnet for participant:', request.participant.name, error);
        // Continue with other carnets even if one fails
      }
    }
    
    return blobs;
  }

  async generateCombinedPDF(requests: CarnetRequest[]): Promise<Blob> {
    // Create a new PDF with standard page size for multiple carnets
    const combinedPdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
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
        String.fromCharCode(...new Uint8Array(carnetArrayBuffer))
      );

      // Calculate position
      const x = marginX + currentCol * (carnetWidth + spacingX);
      const y = marginY + currentRow * (carnetHeight + spacingY);

      // Add carnet to combined PDF
      combinedPdf.addImage(carnetBase64, 'PNG', x, y, carnetWidth, carnetHeight);

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

    return combinedPdf.output('blob');
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async previewCarnet(request: CarnetRequest): Promise<string> {
    const blob = await this.generateCarnet({ ...request, isPreview: true });
    return URL.createObjectURL(blob);
  }
}
