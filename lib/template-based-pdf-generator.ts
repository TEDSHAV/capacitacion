import jsPDF from 'jspdf';
import { TemplateData, TemplateParticipant } from './document-templates-new';
import fs from 'fs';
import path from 'path';

export class TemplateBasedPdfGenerator {
  private getLogoBase64(): string {
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (error) {
      console.error('❌ Failed to load logo:', error);
      return '';
    }
  }
  async generateCertificacionCompetencias(data: TemplateData): Promise<Buffer> {
    try {
      console.log('🔍 Generating certificacion de competencias with template-based approach');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = 20;
      
      // Header with 3-column layout
      // Column 1: Logo (left aligned) - smaller size for better proportions
      console.log('🖼️ Attempting to add logo image...');
      try {
        // Add logo image using base64 with smaller size
        const logoBase64 = this.getLogoBase64();
        if (logoBase64) {
          console.log('📁 Logo loaded as base64');
          pdf.addImage(logoBase64, 20, yPosition, 30, 15); // Reduced from 40x20 to 30x15
          console.log('✅ Logo image added successfully');
        } else {
          throw new Error('Logo base64 is empty');
        }
      } catch (error) {
        console.error('❌ Failed to add logo image:', error);
        throw new Error(`Logo image error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Column 2: Title (centered and vertically aligned with logo) - smaller font
      pdf.setFont('helvetica', 'bold').setFontSize(14); // Reduced from 18 to 14
      pdf.text('CERTIFICACIÓN DE COMPETENCIAS', 105, yPosition + 7, { align: 'center' }); // Adjusted alignment
      
      // Column 3: Document info (right aligned and vertically aligned with logo) - smaller font
      pdf.setFont('helvetica', 'normal').setFontSize(8); // Reduced from 10 to 8
      pdf.text('CÓDIGO: SHA-RG-CAP-006', 190, yPosition + 2, { align: 'right' });
      pdf.text('FECHA: 01/04/2026', 190, yPosition + 7, { align: 'right' });
      pdf.text('REVISIÓN: 00', 190, yPosition + 12, { align: 'right' });
      pdf.text('PÁGINA: 1 de 1', 190, yPosition + 17, { align: 'right' });
      
      yPosition += 30; // Reduced from 35 to 30
      
      // Main content
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text(`Puerto La Cruz, ${data.fecha || 'N/A'}`, 20, yPosition);
      yPosition += 15;
      
      pdf.setFont('helvetica', 'bold').setFontSize(12);
      pdf.text(`Sres. ${data.nombre_cliente || 'N/A'}`, 20, yPosition);
      yPosition += 20;
      
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      const shaText = 'SHA DE VENEZUELA, C.A. certifica las competencias de cada uno de los participantes descritos en el cuadro anexo, quienes asistieron al curso de ' + (data.titulo_curso || 'N/A') + ', realizado en ' + (data.ciudad || 'N/A') + ' el ' + (data.dia || '') + ' de ' + (data.mes || '') + ' del ' + (data.anio || '') + ' como parte del proceso de Capacitación bajo la Orden de Servicio Interna ' + (data.nro_osi || 'N/A') + ', en consideración de su desempeño y los resultados obtenidos en las evaluaciones efectuadas durante el mismo.';
      
      // Split long text into multiple lines
      const shaLines = pdf.splitTextToSize(shaText, 170);
      shaLines.forEach((line: string) => {
        pdf.text(line, 20, yPosition);
        yPosition += 7;
      });
      
      yPosition += 15;
      
      // Scoring note
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text('La nota mínima aprobatoria es de 14 puntos.', 20, yPosition);
      yPosition += 20;
      
      // Table header
      pdf.setFont('helvetica', 'bold').setFontSize(12);
      pdf.text('N°', 20, yPosition);
      pdf.text('NOMBRE Y APELLIDO', 40, yPosition);
      pdf.text('CÉDULA', 110, yPosition);
      pdf.text('PUNTUACIÓN', 140, yPosition);
      pdf.text('CONDICIÓN', 160, yPosition);
      pdf.text('N° DE CONTROL', 180, yPosition);
      yPosition += 10;
      
      // Draw table line
      pdf.line(20, yPosition, 190, yPosition);
      yPosition += 5;
      
      // Participants table
      pdf.setFont('helvetica', 'normal').setFontSize(10);
      data.participantes.forEach((participant) => {
        pdf.text(`${participant.index}`, 20, yPosition);
        pdf.text(participant.nombre_apellido || '', 40, yPosition);
        pdf.text(participant.cedula || '', 110, yPosition);
        pdf.text(participant.puntuacion || '', 140, yPosition);
        pdf.text(participant.condicion || '', 160, yPosition);
        pdf.text(participant.numero_control || '', 180, yPosition);
        yPosition += 12;
        
        if (yPosition > 260) {
          pdf.addPage();
          yPosition = 20;
        }
      });
      
      // Signature
      yPosition += 30;
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text('_________________________', 105, yPosition, { align: 'center' });
      yPosition += 10;
      
      pdf.setFont('helvetica', 'bold').setFontSize(12);
      pdf.text(data.nombre_firmante || 'N/A', 105, yPosition, { align: 'center' });
      yPosition += 8;
      
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text(data.cargo_firmante || 'N/A', 105, yPosition, { align: 'center' });

      const buffer = Buffer.from(pdf.output('arraybuffer'));
      console.log('✅ Certificacion de competencias generated successfully with template-based approach, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating certificacion de competencias with template-based approach:', error);
      throw new Error(`Failed to generate certificacion de competencias document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateNotaEntrega(data: TemplateData): Promise<Buffer> {
    try {
      console.log('🔍 Generating nota de entrega with template-based approach');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = 20;
      
      // Header with 3-column layout
      // Column 1: Logo (left aligned) - smaller size for better proportions
      console.log('🖼️ Attempting to add logo image...');
      try {
        // Add logo image using base64 with smaller size
        const logoBase64 = this.getLogoBase64();
        if (logoBase64) {
          console.log('📁 Logo loaded as base64');
          pdf.addImage(logoBase64, 20, yPosition, 30, 15); // Reduced from 40x20 to 30x15
          console.log('✅ Logo image added successfully');
        } else {
          throw new Error('Logo base64 is empty');
        }
      } catch (error) {
        console.error('❌ Failed to add logo image:', error);
        throw new Error(`Logo image error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Column 2: Title (centered and vertically aligned with logo) - smaller font
      pdf.setFont('helvetica', 'bold').setFontSize(14); // Reduced from 18 to 14
      pdf.text('NOTA DE ENTREGA', 105, yPosition + 7, { align: 'center' }); // Adjusted alignment
      
      // Column 3: Document info (right aligned and vertically aligned with logo) - smaller font
      pdf.setFont('helvetica', 'normal').setFontSize(8); // Reduced from 10 to 8
      pdf.text('CÓDIGO: SHA-RG-CAP-006', 190, yPosition + 2, { align: 'right' });
      pdf.text('FECHA: 01/04/2026', 190, yPosition + 7, { align: 'right' });
      pdf.text('REVISIÓN: 00', 190, yPosition + 12, { align: 'right' });
      pdf.text('PÁGINA: 1 de 1', 190, yPosition + 17, { align: 'right' });
      
      yPosition += 30; // Reduced from 35 to 30
      
      // Main content
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text(`Puerto La Cruz, ${data.fecha || 'N/A'}`, 20, yPosition);
      yPosition += 15;
      
      pdf.setFont('helvetica', 'bold').setFontSize(12);
      pdf.text(`Sres. ${data.nombre_cliente || 'N/A'}`, 20, yPosition);
      yPosition += 20;
      
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      const deliveryText = 'Sirva la presente para hacer entrega de CERTIFICADOS correspondientes a la formación en materia de ' + (data.titulo_curso || 'N/A') + ', realizado en ' + (data.ciudad || 'N/A') + ', el día ' + (data.dia || '') + ' de ' + (data.mes || '') + ' del ' + (data.anio || '') + ', como parte del proceso de Capacitación bajo la Orden de Servicio Interna ' + (data.nro_osi || 'N/A') + ', siendo aprobados los siguientes participantes:';
      
      // Split long text into multiple lines
      const deliveryLines = pdf.splitTextToSize(deliveryText, 170);
      deliveryLines.forEach((line: string) => {
        pdf.text(line, 20, yPosition);
        yPosition += 7;
      });
      
      yPosition += 15;
      
      // Table header
      pdf.setFont('helvetica', 'bold').setFontSize(12);
      pdf.text('N°', 20, yPosition);
      pdf.text('NOMBRE Y APELLIDO', 40, yPosition);
      pdf.text('CÉDULA', 110, yPosition);
      pdf.text('N° DE CONTROL', 160, yPosition);
      yPosition += 10;
      
      // Draw table line
      pdf.line(20, yPosition, 190, yPosition);
      yPosition += 5;
      
      // Participants table
      pdf.setFont('helvetica', 'normal').setFontSize(10);
      data.participantes.forEach((participant) => {
        pdf.text(`${participant.index}`, 20, yPosition);
        pdf.text(participant.nombre_apellido || '', 40, yPosition);
        pdf.text(participant.cedula || '', 110, yPosition);
        pdf.text(participant.numero_control || '', 160, yPosition);
        yPosition += 12;
        
        if (yPosition > 260) {
          pdf.addPage();
          yPosition = 20;
        }
      });
      
      // Signature
      yPosition += 30;
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text('_________________________', 105, yPosition, { align: 'center' });
      yPosition += 10;
      
      pdf.setFont('helvetica', 'bold').setFontSize(12);
      pdf.text(data.nombre_firmante || 'N/A', 105, yPosition, { align: 'center' });
      yPosition += 8;
      
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text(data.cargo_firmante || 'N/A', 105, yPosition, { align: 'center' });

      const buffer = Buffer.from(pdf.output('arraybuffer'));
      console.log('✅ Nota de entrega generated successfully with template-based approach, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating nota de entrega with template-based approach:', error);
      throw new Error(`Failed to generate nota de entrega document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateValidacionDatos(data: TemplateData): Promise<Buffer> {
    try {
      console.log('🔍 Generating validacion de datos with template-based approach');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = 20;
      
      // Header with 3-column layout
      // Column 1: Logo (left aligned) - smaller size for better proportions
      console.log('🖼️ Attempting to add logo image...');
      try {
        // Add logo image using base64 with smaller size
        const logoBase64 = this.getLogoBase64();
        if (logoBase64) {
          console.log('📁 Logo loaded as base64');
          pdf.addImage(logoBase64, 20, yPosition, 30, 15); // Reduced from 40x20 to 30x15
          console.log('✅ Logo image added successfully');
        } else {
          throw new Error('Logo base64 is empty');
        }
      } catch (error) {
        console.error('❌ Failed to add logo image:', error);
        throw new Error(`Logo image error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Column 2: Title (centered and vertically aligned with logo) - smaller font
      pdf.setFont('helvetica', 'bold').setFontSize(14); // Reduced from 18 to 14
      pdf.text('VALIDACIÓN DE DATOS', 105, yPosition + 7, { align: 'center' }); // Adjusted alignment
      
      // Column 3: Document info (right aligned and vertically aligned with logo) - smaller font
      pdf.setFont('helvetica', 'normal').setFontSize(8); // Reduced from 10 to 8
      pdf.text('CÓDIGO: SHA-RG-CAP-006', 190, yPosition + 2, { align: 'right' });
      pdf.text('FECHA: 01/04/2026', 190, yPosition + 7, { align: 'right' });
      pdf.text('REVISIÓN: 00', 190, yPosition + 12, { align: 'right' });
      pdf.text('PÁGINA: 1 de 1', 190, yPosition + 17, { align: 'right' });
      
      yPosition += 30; // Reduced from 35 to 30
      
      // Main content
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text(`Puerto La Cruz, ${data.fecha || 'N/A'}`, 20, yPosition);
      yPosition += 15;
      
      pdf.setFont('helvetica', 'bold').setFontSize(12);
      pdf.text(`Sres. ${data.nombre_cliente || 'N/A'} – ${data.localidad_cliente || ''}`, 20, yPosition);
      yPosition += 20;
      
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      const validationText = 'Sirva la presente para formalizar el proceso de Validación de Datos de los participantes que asistieron al curso de ' + (data.titulo_curso || 'N/A') + ', realizado en ' + (data.localidad_cliente || data.ciudad) + ', el (los) día (s) ' + (data.fecha_ejecucion || data.fecha) + ', como parte del proceso de Capacitación bajo la Orden de Servicio Interna ' + (data.nro_osi || 'N/A') + '. Recibir esta validación es indispensable para proceder a imprimir los certificados y carnet, según aplique. Este proceso es limitativo para la entrega formal y física de los mismos.';
      
      // Split long text into multiple lines
      const validationLines = pdf.splitTextToSize(validationText, 170);
      validationLines.forEach((line: string) => {
        pdf.text(line, 20, yPosition);
        yPosition += 7;
      });
      
      yPosition += 15;
      
      // Table header
      pdf.setFont('helvetica', 'bold').setFontSize(12);
      pdf.text('N°', 20, yPosition);
      pdf.text('NOMBRE Y APELLIDO', 40, yPosition);
      pdf.text('CÉDULA', 110, yPosition);
      pdf.text('N° DE CONTROL', 160, yPosition);
      yPosition += 10;
      
      // Draw table line
      pdf.line(20, yPosition, 190, yPosition);
      yPosition += 5;
      
      // Participants table
      pdf.setFont('helvetica', 'normal').setFontSize(10);
      data.participantes.forEach((participant) => {
        pdf.text(`${participant.index}`, 20, yPosition);
        pdf.text(participant.nombre_apellido || '', 40, yPosition);
        pdf.text(participant.cedula || '', 110, yPosition);
        pdf.text(participant.numero_control || '', 160, yPosition);
        yPosition += 12;
        
        if (yPosition > 260) {
          pdf.addPage();
          yPosition = 20;
        }
      });
      
      // Signature
      yPosition += 30;
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text('_________________________', 105, yPosition, { align: 'center' });
      yPosition += 10;
      
      pdf.setFont('helvetica', 'bold').setFontSize(12);
      pdf.text(data.nombre_firmante || 'N/A', 105, yPosition, { align: 'center' });
      yPosition += 8;
      
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text(data.cargo_firmante || 'N/A', 105, yPosition, { align: 'center' });

      const buffer = Buffer.from(pdf.output('arraybuffer'));
      console.log('✅ Validacion de datos generated successfully with template-based approach, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating validacion de datos with template-based approach:', error);
      throw new Error(`Failed to generate validacion de datos document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
