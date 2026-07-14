import jsPDF from 'jspdf';
import { TemplateData, TemplateParticipant } from './document-templates';

// Simple document generator using jsPDF
export class SimpleDocumentGenerator {
  static async generateCertificacionCompetencias(data: TemplateData): Promise<Buffer> {
    try {
      console.log('🔍 Generating certificacion de competencias with jsPDF');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Set font
      pdf.setFont('helvetica');
      
      let yPosition = 30;
      
      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CERTIFICACIÓN DE COMPETENCIAS', 105, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Course information
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Curso: ${data.titulo_curso}`, 20, yPosition);
      yPosition += 10;
      
      // Client information
      pdf.text(`Empresa: ${data.nombre_cliente}`, 20, yPosition);
      yPosition += 10;
      
      // Date and location
      pdf.text(`${data.ciudad}, ${data.fecha}`, 20, yPosition);
      yPosition += 10;
      
      // OSI number
      pdf.text(`OSI N°: ${data.nro_osi}`, 20, yPosition);
      yPosition += 15;
      
      // Participants heading
      pdf.setFont('helvetica', 'bold');
      pdf.text('PARTICIPANTES:', 20, yPosition);
      yPosition += 10;
      
      // Participants list
      pdf.setFont('helvetica', 'normal');
      data.participantes.forEach((participant, index) => {
        const participantText = `${index + 1}. ${participant.nombre_apellido} - CI: ${participant.cedula} - ${participant.condicion} - Puntuación: ${participant.puntuacion}`;
        pdf.text(participantText, 20, yPosition);
        yPosition += 8;
      });
      
      // Signature section
      yPosition += 20;
      pdf.text('_________________________', 105, yPosition, { align: 'center' });
      yPosition += 8;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(data.nombre_firmante, 105, yPosition, { align: 'center' });
      yPosition += 6;
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(data.cargo_firmante, 105, yPosition, { align: 'center' });

      const buffer = Buffer.from(pdf.output('arraybuffer'));
      console.log('✅ Certificacion de competencias generated successfully with jsPDF, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating certificacion de competencias with jsPDF:', error);
      throw new Error(`Failed to generate certificacion de competencias document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateNotaEntrega(data: TemplateData): Promise<Buffer> {
    try {
      console.log('🔍 Generating nota de entrega with jsPDF');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Set font
      pdf.setFont('helvetica');
      
      let yPosition = 30;
      
      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('NOTA DE ENTREGA', 105, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Course information
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Curso: ${data.titulo_curso}`, 20, yPosition);
      yPosition += 10;
      
      // Client information
      pdf.text(`Empresa: ${data.nombre_cliente}`, 20, yPosition);
      yPosition += 10;
      
      // Date and location
      pdf.text(`${data.ciudad}, ${data.fecha}`, 20, yPosition);
      yPosition += 10;
      
      // OSI number
      pdf.text(`OSI N°: ${data.nro_osi}`, 20, yPosition);
      yPosition += 15;
      
      // Participants heading
      pdf.setFont('helvetica', 'bold');
      pdf.text('PARTICIPANTES CERTIFICADOS:', 20, yPosition);
      yPosition += 10;
      
      // Participants list
      pdf.setFont('helvetica', 'normal');
      data.participantes.forEach((participant, index) => {
        const participantText = `${index + 1}. ${participant.nombre_apellido} - CI: ${participant.cedula} - ${participant.condicion}`;
        pdf.text(participantText, 20, yPosition);
        yPosition += 8;
      });
      
      // Signature section
      yPosition += 20;
      pdf.text('_________________________', 105, yPosition, { align: 'center' });
      yPosition += 8;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(data.nombre_firmante, 105, yPosition, { align: 'center' });
      yPosition += 6;
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(data.cargo_firmante, 105, yPosition, { align: 'center' });

      const buffer = Buffer.from(pdf.output('arraybuffer'));
      console.log('✅ Nota de entrega generated successfully with jsPDF, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating nota de entrega with jsPDF:', error);
      throw new Error(`Failed to generate nota de entrega document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async generateValidacionDatos(data: TemplateData): Promise<Buffer> {
    try {
      console.log('🔍 Generating validacion de datos with jsPDF');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Set font
      pdf.setFont('helvetica');
      
      let yPosition = 30;
      
      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('VALIDACIÓN DE DATOS', 105, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Course information
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Curso: ${data.titulo_curso}`, 20, yPosition);
      yPosition += 10;
      
      // Client information
      pdf.text(`Empresa: ${data.nombre_cliente}`, 20, yPosition);
      yPosition += 10;
      
      // Date and location
      pdf.text(`${data.ciudad}, ${data.fecha}`, 20, yPosition);
      yPosition += 10;
      
      // OSI number
      pdf.text(`OSI N°: ${data.nro_osi}`, 20, yPosition);
      yPosition += 15;
      
      // Participants heading
      pdf.setFont('helvetica', 'bold');
      pdf.text('DATOS DE PARTICIPANTES:', 20, yPosition);
      yPosition += 10;
      
      // Participants table
      pdf.setFont('helvetica', 'normal');
      data.participantes.forEach((participant, index) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. Nombre: ${participant.nombre_apellido}`, 20, yPosition);
        yPosition += 6;
        
        pdf.setFont('helvetica', 'normal');
        const detailsText = `   CI: ${participant.cedula} | Control: ${participant.numero_control} | Puntuación: ${participant.puntuacion} | Condición: ${participant.condicion}`;
        pdf.text(detailsText, 20, yPosition);
        yPosition += 8;
      });
      
      // Signature section
      yPosition += 20;
      pdf.text('_________________________', 105, yPosition, { align: 'center' });
      yPosition += 8;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(data.nombre_firmante, 105, yPosition, { align: 'center' });
      yPosition += 6;
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(data.cargo_firmante, 105, yPosition, { align: 'center' });

      const buffer = Buffer.from(pdf.output('arraybuffer'));
      console.log('✅ Validacion de datos generated successfully with jsPDF, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating validacion de datos with jsPDF:', error);
      throw new Error(`Failed to generate validacion de datos document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
