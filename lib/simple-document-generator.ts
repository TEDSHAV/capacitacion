import jsPDF from 'jspdf';
import { TemplateData, TemplateParticipant } from './document-templates-new';

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

      // Add Spanish character support
      pdf.addFont('helvetica', 'normal', 'Helvetica');
      pdf.addFont('helvetica', 'bold', 'Helvetica-Bold');
      pdf.addFont('helvetica', 'italic', 'Helvetica-Oblique');
      
      let yPosition = 30;
      
      // Title
      pdf.setFont('helvetica', 'bold').setFontSize(20);
      pdf.text('CERTIFICACIÓN DE COMPETENCIAS', 105, yPosition, { align: 'center' });
      yPosition += 20;
      
      // Course information
      pdf.setFont('helvetica', 'normal').setFontSize(14);
      pdf.text(`Curso: ${data.titulo_curso || 'N/A'}`, 20, yPosition);
      yPosition += 12;
      
      // Client information
      pdf.text(`Empresa: ${data.nombre_cliente || 'N/A'}`, 20, yPosition);
      yPosition += 12;
      
      // Date and location
      pdf.text(`${data.ciudad || 'N/A'}, ${data.fecha || 'N/A'}`, 20, yPosition);
      yPosition += 12;
      
      // OSI number
      pdf.text(`OSI N°: ${data.nro_osi || 'N/A'}`, 20, yPosition);
      yPosition += 20;
      
      // Participants heading
      pdf.setFont('helvetica', 'bold').setFontSize(16);
      pdf.text('PARTICIPANTES:', 20, yPosition);
      yPosition += 15;
      
      // Participants list
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      if (data.participantes && data.participantes.length > 0) {
        data.participantes.forEach((participant, index) => {
          const participantText = `${index + 1}. ${participant.nombre_apellido || 'N/A'} - CI: ${participant.cedula || 'N/A'} - ${participant.condicion || 'N/A'} - Puntuación: ${participant.puntuacion || 'N/A'}`;
          pdf.text(participantText, 20, yPosition);
          yPosition += 10;
          
          // Avoid going off page
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 30;
          }
        });
      }
      
      // Signature section
      yPosition += 20;
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text('_________________________', 105, yPosition, { align: 'center' });
      yPosition += 10;
      
      pdf.setFont('helvetica', 'bold').setFontSize(12);
      pdf.text(data.nombre_firmante || 'N/A', 105, yPosition, { align: 'center' });
      yPosition += 8;
      
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text(data.cargo_firmante || 'N/A', 105, yPosition, { align: 'center' });

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

      // Add Spanish character support
      pdf.addFont('helvetica', 'normal', 'Helvetica');
      pdf.addFont('helvetica', 'bold', 'Helvetica-Bold');
      pdf.addFont('helvetica', 'italic', 'Helvetica-Oblique');
      
      let yPosition = 30;
      
      // Title
      pdf.setFont('helvetica', 'bold').setFontSize(20);
      pdf.text('NOTA DE ENTREGA', 105, yPosition, { align: 'center' });
      yPosition += 20;
      
      // Course information
      pdf.setFont('helvetica', 'normal').setFontSize(14);
      pdf.text(`Curso: ${data.titulo_curso || 'N/A'}`, 20, yPosition);
      yPosition += 12;
      
      // Client information
      pdf.text(`Empresa: ${data.nombre_cliente || 'N/A'}`, 20, yPosition);
      yPosition += 12;
      
      // Date and location
      pdf.text(`${data.ciudad || 'N/A'}, ${data.fecha || 'N/A'}`, 20, yPosition);
      yPosition += 12;
      
      // OSI number
      pdf.text(`OSI N°: ${data.nro_osi || 'N/A'}`, 20, yPosition);
      yPosition += 20;
      
      // Participants heading
      pdf.setFont('helvetica', 'bold').setFontSize(16);
      pdf.text('PARTICIPANTES CERTIFICADOS:', 20, yPosition);
      yPosition += 15;
      
      // Participants list
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      if (data.participantes && data.participantes.length > 0) {
        data.participantes.forEach((participant, index) => {
          const participantText = `${index + 1}. ${participant.nombre_apellido || 'N/A'} - CI: ${participant.cedula || 'N/A'} - ${participant.condicion || 'N/A'}`;
          pdf.text(participantText, 20, yPosition);
          yPosition += 10;
          
          // Avoid going off page
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 30;
          }
        });
      }
      
      // Signature section
      yPosition += 20;
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text('_________________________', 105, yPosition, { align: 'center' });
      yPosition += 10;
      
      pdf.setFont('helvetica', 'bold').setFontSize(12);
      pdf.text(data.nombre_firmante || 'N/A', 105, yPosition, { align: 'center' });
      yPosition += 8;
      
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text(data.cargo_firmante || 'N/A', 105, yPosition, { align: 'center' });

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

      // Add Spanish character support
      pdf.addFont('helvetica', 'normal', 'Helvetica');
      pdf.addFont('helvetica', 'bold', 'Helvetica-Bold');
      pdf.addFont('helvetica', 'italic', 'Helvetica-Oblique');
      
      let yPosition = 30;
      
      // Title
      pdf.setFont('helvetica', 'bold').setFontSize(20);
      pdf.text('VALIDACIÓN DE DATOS', 105, yPosition, { align: 'center' });
      yPosition += 20;
      
      // Course information
      pdf.setFont('helvetica', 'normal').setFontSize(14);
      pdf.text(`Curso: ${data.titulo_curso || 'N/A'}`, 20, yPosition);
      yPosition += 12;
      
      // Client information
      pdf.text(`Empresa: ${data.nombre_cliente || 'N/A'}`, 20, yPosition);
      yPosition += 12;
      
      // Date and location
      pdf.text(`${data.ciudad || 'N/A'}, ${data.fecha || 'N/A'}`, 20, yPosition);
      yPosition += 12;
      
      // OSI number
      pdf.text(`OSI N°: ${data.nro_osi || 'N/A'}`, 20, yPosition);
      yPosition += 20;
      
      // Participants heading
      pdf.setFont('helvetica', 'bold').setFontSize(16);
      pdf.text('DATOS DE PARTICIPANTES:', 20, yPosition);
      yPosition += 15;
      
      // Participants table
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      if (data.participantes && data.participantes.length > 0) {
        data.participantes.forEach((participant, index) => {
          pdf.setFont('helvetica', 'bold').setFontSize(12);
          pdf.text(`${index + 1}. Nombre: ${participant.nombre_apellido || 'N/A'}`, 20, yPosition);
          yPosition += 8;
          
          pdf.setFont('helvetica', 'normal').setFontSize(10);
          const detailsText = `   CI: ${participant.cedula || 'N/A'} | Control: ${participant.numero_control || 'N/A'} | Puntuación: ${participant.puntuacion || 'N/A'} | Condición: ${participant.condicion || 'N/A'}`;
          pdf.text(detailsText, 20, yPosition);
          yPosition += 12;
          
          // Avoid going off page
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 30;
          }
        });
      }
      
      // Signature section
      yPosition += 20;
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text('_________________________', 105, yPosition, { align: 'center' });
      yPosition += 10;
      
      pdf.setFont('helvetica', 'bold').setFontSize(12);
      pdf.text(data.nombre_firmante || 'N/A', 105, yPosition, { align: 'center' });
      yPosition += 8;
      
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text(data.cargo_firmante || 'N/A', 105, yPosition, { align: 'center' });

      const buffer = Buffer.from(pdf.output('arraybuffer'));
      console.log('✅ Validacion de datos generated successfully with jsPDF, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating validacion de datos with jsPDF:', error);
      throw new Error(`Failed to generate validacion de datos document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
