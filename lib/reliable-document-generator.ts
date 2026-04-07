import jsPDF from 'jspdf';
import { TemplateData } from './document-templates-new';

// Simple, reliable document generator using jsPDF
export class ReliableDocumentGenerator {
  static generateCertificacionCompetencias(data: TemplateData): Buffer {
    try {
      console.log('🔍 Generating certificacion de competencias with reliable jsPDF');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = 30;
      
      // Title
      pdf.setFontSize(20).setFont('helvetica', 'bold');
      pdf.text('CERTIFICACIÓN DE COMPETENCIAS', 105, yPosition, { align: 'center' });
      yPosition += 25;
      
      // Course and client info
      pdf.setFontSize(14).setFont('helvetica', 'normal');
      pdf.text(`Curso: ${data.titulo_curso || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`Empresa: ${data.nombre_cliente || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`Fecha: ${data.fecha || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`OSI N°: ${data.nro_osi || 'N/A'}`, 20, yPosition);
      yPosition += 20;
      
      // Participants heading
      pdf.setFontSize(16).setFont('helvetica', 'bold');
      pdf.text('PARTICIPANTES:', 20, yPosition);
      yPosition += 15;
      
      // Participants list
      pdf.setFontSize(12).setFont('helvetica', 'normal');
      if (data.participantes && data.participantes.length > 0) {
        data.participantes.forEach((participant, index) => {
          const participantText = `${index + 1}. ${participant.nombre_apellido || 'N/A'} - CI: ${participant.cedula || 'N/A'} - ${participant.condicion || 'N/A'} - Puntuación: ${participant.puntuacion || 'N/A'}`;
          pdf.text(participantText, 20, yPosition);
          yPosition += 10;
          
          // New page every 5 participants
          if ((index + 1) % 5 === 0 && index > 0) {
            pdf.addPage();
            yPosition = 30;
          }
        });
      }
      
      // Signature section
      yPosition += 20;
      pdf.setFontSize(12).setFont('helvetica', 'normal');
      pdf.text('_________________________', 105, yPosition, { align: 'center' });
      yPosition += 10;
      
      pdf.setFontSize(12).setFont('helvetica', 'bold');
      pdf.text(data.nombre_firmante || 'N/A', 105, yPosition, { align: 'center' });
      yPosition += 8;
      
      pdf.setFontSize(12).setFont('helvetica', 'normal');
      pdf.text(data.cargo_firmante || 'N/A', 105, yPosition, { align: 'center' });

      const buffer = Buffer.from(pdf.output('arraybuffer'));
      console.log('✅ Certificacion de competencias generated successfully, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating certificacion de competencias:', error);
      throw new Error(`Failed to generate certificacion de competencias document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static generateNotaEntrega(data: TemplateData): Buffer {
    try {
      console.log('🔍 Generating nota de entrega with reliable jsPDF');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = 30;
      
      // Title
      pdf.setFontSize(20).setFont('helvetica', 'bold');
      pdf.text('NOTA DE ENTREGA', 105, yPosition, { align: 'center' });
      yPosition += 25;
      
      // Course and client info
      pdf.setFontSize(14).setFont('helvetica', 'normal');
      pdf.text(`Curso: ${data.titulo_curso || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`Empresa: ${data.nombre_cliente || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`Fecha: ${data.fecha || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`OSI N°: ${data.nro_osi || 'N/A'}`, 20, yPosition);
      yPosition += 20;
      
      // Participants heading
      pdf.setFontSize(16).setFont('helvetica', 'bold');
      pdf.text('PARTICIPANTES CERTIFICADOS:', 20, yPosition);
      yPosition += 15;
      
      // Participants list
      pdf.setFontSize(12).setFont('helvetica', 'normal');
      if (data.participantes && data.participantes.length > 0) {
        data.participantes.forEach((participant, index) => {
          const participantText = `${index + 1}. ${participant.nombre_apellido || 'N/A'} - CI: ${participant.cedula || 'N/A'} - ${participant.condicion || 'N/A'}`;
          pdf.text(participantText, 20, yPosition);
          yPosition += 10;
          
          // New page every 5 participants
          if ((index + 1) % 5 === 0 && index > 0) {
            pdf.addPage();
            yPosition = 30;
          }
        });
      }
      
      // Signature section
      yPosition += 20;
      pdf.setFontSize(12).setFont('helvetica', 'normal');
      pdf.text('_________________________', 105, yPosition, { align: 'center' });
      yPosition += 10;
      
      pdf.setFontSize(12).setFont('helvetica', 'bold');
      pdf.text(data.nombre_firmante || 'N/A', 105, yPosition, { align: 'center' });
      yPosition += 8;
      
      pdf.setFontSize(12).setFont('helvetica', 'normal');
      pdf.text(data.cargo_firmante || 'N/A', 105, yPosition, { align: 'center' });

      const buffer = Buffer.from(pdf.output('arraybuffer'));
      console.log('✅ Nota de entrega generated successfully, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating nota de entrega:', error);
      throw new Error(`Failed to generate nota de entrega document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static generateValidacionDatos(data: TemplateData): Buffer {
    try {
      console.log('🔍 Generating validacion de datos with reliable jsPDF');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = 30;
      
      // Title
      pdf.setFontSize(20).setFont('helvetica', 'bold');
      pdf.text('VALIDACIÓN DE DATOS', 105, yPosition, { align: 'center' });
      yPosition += 25;
      
      // Course and client info
      pdf.setFontSize(14).setFont('helvetica', 'normal');
      pdf.text(`Curso: ${data.titulo_curso || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`Empresa: ${data.nombre_cliente || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`Fecha: ${data.fecha || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`OSI N°: ${data.nro_osi || 'N/A'}`, 20, yPosition);
      yPosition += 20;
      
      // Participants heading
      pdf.setFontSize(16).setFont('helvetica', 'bold');
      pdf.text('DATOS DE PARTICIPANTES:', 20, yPosition);
      yPosition += 15;
      
      // Participants list with detailed info
      pdf.setFontSize(12).setFont('helvetica', 'normal');
      if (data.participantes && data.participantes.length > 0) {
        data.participantes.forEach((participant, index) => {
          pdf.setFontSize(12).setFont('helvetica', 'bold');
          pdf.text(`${index + 1}. ${participant.nombre_apellido || 'N/A'}:`, 20, yPosition);
          yPosition += 8;
          
          pdf.setFontSize(10).setFont('helvetica', 'normal');
          pdf.text(`   CI: ${participant.cedula || 'N/A'} | Control: ${participant.numero_control || 'N/A'} | Puntuación: ${participant.puntuacion || 'N/A'} | Condición: ${participant.condicion || 'N/A'}`, 20, yPosition);
          yPosition += 12;
          
          // New page every 3 participants (more detailed)
          if ((index + 1) % 3 === 0 && index > 0) {
            pdf.addPage();
            yPosition = 30;
          }
        });
      }
      
      // Signature section
      yPosition += 20;
      pdf.setFontSize(12).setFont('helvetica', 'normal');
      pdf.text('_________________________', 105, yPosition, { align: 'center' });
      yPosition += 10;
      
      pdf.setFontSize(12).setFont('helvetica', 'bold');
      pdf.text(data.nombre_firmante || 'N/A', 105, yPosition, { align: 'center' });
      yPosition += 8;
      
      pdf.setFontSize(12).setFont('helvetica', 'normal');
      pdf.text(data.cargo_firmante || 'N/A', 105, yPosition, { align: 'center' });

      const buffer = Buffer.from(pdf.output('arraybuffer'));
      console.log('✅ Validacion de datos generated successfully, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating validacion de datos:', error);
      throw new Error(`Failed to generate validacion de datos document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
