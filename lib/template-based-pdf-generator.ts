import jsPDF from 'jspdf';
import { TemplateData, TemplateParticipant } from './document-templates-new';

export class TemplateBasedPdfGenerator {
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
      // Column 1: Logo
      pdf.setFont('helvetica', 'normal').setFontSize(10);
      pdf.text('SHA DE VENEZUELA, C.A.', 20, yPosition);
      yPosition += 8;
      
      // Column 2: Title (centered)
      pdf.setFont('helvetica', 'bold').setFontSize(18);
      pdf.text('CERTIFICACIÓN DE COMPETENCIAS', 105, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Column 3: Document info (right-aligned)
      pdf.setFont('helvetica', 'normal').setFontSize(10);
      pdf.text('CÓDIGO: SHA-RG-CAP-006', 190, yPosition, { align: 'right' });
      yPosition += 8;
      pdf.text('FECHA: 01/04/2026', 190, yPosition, { align: 'right' });
      yPosition += 8;
      pdf.text('REVISIÓN: 00', 190, yPosition, { align: 'right' });
      yPosition += 8;
      pdf.text('PÁGINA: 1 de 1', 190, yPosition, { align: 'right' });
      yPosition += 20;
      
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
      // Column 1: Logo
      pdf.setFont('helvetica', 'normal').setFontSize(10);
      pdf.text('SHA DE VENEZUELA, C.A.', 20, yPosition);
      yPosition += 8;
      
      // Column 2: Title (centered)
      pdf.setFont('helvetica', 'bold').setFontSize(18);
      pdf.text('NOTA DE ENTREGA', 105, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Column 3: Document info (right-aligned)
      pdf.setFont('helvetica', 'normal').setFontSize(10);
      pdf.text('CÓDIGO: SHA-RG-CAP-006', 190, yPosition, { align: 'right' });
      yPosition += 8;
      pdf.text('FECHA: 01/04/2026', 190, yPosition, { align: 'right' });
      yPosition += 8;
      pdf.text('REVISIÓN: 00', 190, yPosition, { align: 'right' });
      yPosition += 8;
      pdf.text('PÁGINA: 1 de 1', 190, yPosition, { align: 'right' });
      yPosition += 20;
      
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
      // Column 1: Logo
      pdf.setFont('helvetica', 'normal').setFontSize(10);
      pdf.text('SHA DE VENEZUELA, C.A.', 20, yPosition);
      yPosition += 8;
      
      // Column 2: Title (centered)
      pdf.setFont('helvetica', 'bold').setFontSize(18);
      pdf.text('VALIDACIÓN DE DATOS', 105, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Column 3: Document info (right-aligned)
      pdf.setFont('helvetica', 'normal').setFontSize(10);
      pdf.text('CÓDIGO: SHA-RG-CAP-006', 190, yPosition, { align: 'right' });
      yPosition += 8;
      pdf.text('FECHA: 01/04/2026', 190, yPosition, { align: 'right' });
      yPosition += 8;
      pdf.text('REVISIÓN: 00', 190, yPosition, { align: 'right' });
      yPosition += 8;
      pdf.text('PÁGINA: 1 de 1', 190, yPosition, { align: 'right' });
      yPosition += 20;
      
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
