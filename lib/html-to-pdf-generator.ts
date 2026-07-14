import jsPDF from 'jspdf';
import { TemplateData, TemplateParticipant } from './document-templates-new';

export class HtmlToPdfGenerator {
  private generateCertificacionCompetenciasHtml(data: TemplateData): string {
    return `
      <div style="font-family: Arial, sans-serif; margin: 40px; line-height: 1.6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <strong style="font-size: 18px;">Puerto La Cruz, ${data.fecha}</strong>
        </div>
        
        <div style="margin-bottom: 20px;">
          <strong>Sres. ${data.nombre_cliente}</strong>
        </div>
        
        <div style="margin-bottom: 20px;">
          SHA DE VENEZUELA, C.A. certifica las competencias de cada uno de los participantes descritos en el cuadro anexo, quienes asistieron al curso de ${data.titulo_curso}, realizado en ${data.ciudad} el ${data.dia} de ${data.mes} del ${data.anio} como parte del proceso de Capacitación bajo la Orden de Servicio Interna ${data.nro_osi}, en consideración de su desempeño y los resultados obtenidos en las evaluaciones efectuadas durante el mismo.
        </div>
        
        <div style="margin-bottom: 20px; font-size: 14px;">
          La nota mínima aprobatoria es de 14 puntos. 
        </div>
        
        <div style="margin-bottom: 20px;">
          <table style="border-collapse: collapse; width: 100%; font-size: 12px;">
            <thead>
              <tr style="background-color: #f0f0f0; font-weight: bold;">
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">N°</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">NOMBRE Y APELLIDO</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">CÉDULA</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">PUNTUACIÓN</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">CONDICIÓN</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">N° DE CONTROL</th>
              </tr>
            </thead>
            <tbody>
              ${data.participantes.map(participant => `
                <tr>
                  <td style="border: 1px solid #000; padding: 8px;">${participant.index}</td>
                  <td style="border: 1px solid #000; padding: 8px;">${participant.nombre_apellido || ''}</td>
                  <td style="border: 1px solid #000; padding: 8px;">${participant.cedula || ''}</td>
                  <td style="border: 1px solid #000; padding: 8px;">${participant.puntuacion || ''}</td>
                  <td style="border: 1px solid #000; padding: 8px;">${participant.condicion || ''}</td>
                  <td style="border: 1px solid #000; padding: 8px;">${participant.numero_control || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  private generateNotaEntregaHtml(data: TemplateData): string {
    return `
      <div style="font-family: Arial, sans-serif; margin: 40px; line-height:1.6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <strong style="font-size: 18px;">Puerto La Cruz, ${data.fecha}</strong>
        </div>
        
        <div style="margin-bottom: 20px;">
          <strong>Sres. ${data.nombre_cliente}</strong>
        </div>
        
        <div style="margin-bottom: 20px;">
          Sirva la presente para hacer entrega de CERTIFICADOS correspondientes a la formación en materia de ${data.titulo_curso}, realizado en ${data.ciudad}, el día ${data.dia} de ${data.mes} del ${data.anio}, como parte del proceso de Capacitación bajo la Orden de Servicio Interna ${data.nro_osi}, siendo aprobados los siguientes participantes:
        </div>
        
        <div style="margin-bottom: 20px;">
          <table style="border-collapse: collapse; width:100%; font-size: 12px;">
            <thead>
              <tr style="background-color: #f0f0f0; font-weight: bold;">
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">N°</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">NOMBRE Y APELLIDO</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">CÉDULA</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">N° DE CONTROL</th>
              </tr>
            </thead>
            <tbody>
              ${data.participantes.map(participant => `
                <tr>
                  <td style="border: 1px solid #000; padding: 8px;">${participant.index}</td>
                  <td style="border: 1px solid #000; padding: 8px;">${participant.nombre_apellido || ''}</td>
                  <td style="border: 1px solid #000; padding: 8px;">${participant.numero_control || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  private generateValidacionDatosHtml(data: TemplateData): string {
    return `
      <div style="font-family: Arial, sans-serif; margin: 40px; line-height:1.6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <strong style="font-size: 18px;">Puerto La Cruz, ${data.fecha}</strong>
        </div>
        
        <div style="margin-bottom: 20px;">
          <strong>Sres. ${data.nombre_cliente}</strong> – ${data.localidad_cliente || ''}
        </div>
        
        <div style="margin-bottom: 20px;">
          Sirva la presente para formalizar el proceso de Validación de Datos de los participantes que asistieron al curso de ${data.titulo_curso}, realizado en ${data.localidad_cliente || data.ciudad}, el (los) día (s) ${data.fecha_ejecucion || data.fecha}, como parte del proceso de Capacitación bajo la Orden de Servicio Interna ${data.nro_osi}. Recibir esta validación es indispensable para proceder a imprimir los certificados y carnet, según aplique. Este proceso es limitativo para la entrega formal y física de los mismos.
        </div>
        
        <div style="margin-bottom: 20px;">
          <table style="border-collapse: collapse; width:100%; font-size: 12px;">
            <thead>
              <tr style="background-color: #f0f0f0; font-weight: bold;">
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">N°</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">NOMBRE Y APELLIDO</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">CÉDULA</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">N° DE CONTROL</th>
              </tr>
            </thead>
            <tbody>
              ${data.participantes.map(participant => `
                <tr>
                  <td style="border: 1px solid #000; padding: 8px;">${participant.index}</td>
                  <td style="border: 1px solid #000; padding: 8px;">${participant.nombre_apellido || ''}</td>
                  <td style="border: 1px solid #000; padding: 8px;">${participant.cedula || ''}</td>
                  <td style="border: 1px solid #000; padding: 8px;">${participant.numero_control || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  async generateCertificacionCompetencias(data: TemplateData): Promise<Buffer> {
    try {
      console.log('🔍 Generating certificacion de competencias with HTML template');
      
      const html = this.generateCertificacionCompetenciasHtml(data);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Add content to PDF (simplified approach)
      let yPosition = 20;
      
      // Title
      pdf.setFont('helvetica', 'bold').setFontSize(18);
      pdf.text('CERTIFICACIÓN DE COMPETENCIAS', 105, yPosition, { align: 'center' });
      yPosition += 20;
      
      // Course information
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text(`Curso: ${data.titulo_curso || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`Empresa: ${data.nombre_cliente || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`Fecha: ${data.fecha || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`OSI N°: ${data.nro_osi || 'N/A'}`, 20, yPosition);
      yPosition += 20;
      
      // Participants
      pdf.setFont('helvetica', 'bold').setFontSize(14);
      pdf.text('PARTICIPANTES:', 20, yPosition);
      yPosition += 15;
      
      pdf.setFont('helvetica', 'normal').setFontSize(10);
      data.participantes.forEach((participant) => {
        const participantText = `${participant.index}. ${participant.nombre_apellido || 'N/A'} - CI: ${participant.cedula || 'N/A'} - ${participant.condicion || 'N/A'} - Puntuación: ${participant.puntuacion || 'N/A'}`;
        pdf.text(participantText, 20, yPosition);
        yPosition += 8;
        
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
      });
      
      // Signature
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
      console.log('✅ Certificacion de competencias generated successfully with HTML template, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating certificacion de competencias with HTML template:', error);
      throw new Error(`Failed to generate certificacion de competencias document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateNotaEntrega(data: TemplateData): Promise<Buffer> {
    try {
      console.log('🔍 Generating nota de entrega with HTML template');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = 20;
      
      // Title
      pdf.setFont('helvetica', 'bold').setFontSize(18);
      pdf.text('NOTA DE ENTREGA', 105, yPosition, { align: 'center' });
      yPosition += 20;
      
      // Course information
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text(`Curso: ${data.titulo_curso || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`Empresa: ${data.nombre_cliente || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`Fecha: ${data.fecha || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`OSI N°: ${data.nro_osi || 'N/A'}`, 20, yPosition);
      yPosition += 20;
      
      // Participants
      pdf.setFont('helvetica', 'bold').setFontSize(14);
      pdf.text('PARTICIPANTES CERTIFICADOS:', 20, yPosition);
      yPosition += 15;
      
      pdf.setFont('helvetica', 'normal').setFontSize(10);
      data.participantes.forEach((participant) => {
        const participantText = `${participant.index}. ${participant.nombre_apellido || 'N/A'} - CI: ${participant.cedula || 'N/A'} - ${participant.condicion || 'N/A'}`;
        pdf.text(participantText, 20, yPosition);
        yPosition += 8;
        
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
      });
      
      // Signature
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
      console.log('✅ Nota de entrega generated successfully with HTML template, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating nota de entrega with HTML template:', error);
      throw new Error(`Failed to generate nota de entrega document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateValidacionDatos(data: TemplateData): Promise<Buffer> {
    try {
      console.log('🔍 Generating validacion de datos with HTML template');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = 20;
      
      // Title
      pdf.setFont('helvetica', 'bold').setFontSize(18);
      pdf.text('VALIDACIÓN DE DATOS', 105, yPosition, { align: 'center' });
      yPosition += 20;
      
      // Course information
      pdf.setFont('helvetica', 'normal').setFontSize(12);
      pdf.text(`Curso: ${data.titulo_curso || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`Empresa: ${data.nombre_cliente || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`Fecha: ${data.fecha || 'N/A'}`, 20, yPosition);
      yPosition += 10;
      
      pdf.text(`OSI N°: ${data.nro_osi || 'N/A'}`, 20, yPosition);
      yPosition += 20;
      
      // Participants
      pdf.setFont('helvetica', 'bold').setFontSize(14);
      pdf.text('DATOS DE PARTICIPANTES:', 20, yPosition);
      yPosition += 15;
      
      pdf.setFont('helvetica', 'normal').setFontSize(10);
      data.participantes.forEach((participant) => {
        pdf.setFont('helvetica', 'bold').setFontSize(10);
        pdf.text(`${participant.index}. Nombre: ${participant.nombre_apellido || 'N/A'}`, 20, yPosition);
        yPosition += 8;
        
        pdf.setFont('helvetica', 'normal').setFontSize(9);
        const detailsText = `   CI: ${participant.cedula || 'N/A'} | Control: ${participant.numero_control || 'N/A'} | Puntuación: ${participant.puntuacion || 'N/A'} | Condición: ${participant.condicion || 'N/A'}`;
        pdf.text(detailsText, 20, yPosition);
        yPosition += 12;
        
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
      });
      
      // Signature
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
      console.log('✅ Validacion de datos generated successfully with HTML template, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating validacion de datos with HTML template:', error);
      throw new Error(`Failed to generate validacion de datos document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
