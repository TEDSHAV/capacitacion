import jsPDF from 'jspdf';
import { TemplateData } from './document-templates-new';
import fs from 'fs';
import path from 'path';

// Letter page dimensions (mm)
const PAGE_W = 215.9;
const PAGE_H = 279.4;
const ML = 15;              // left margin
const MR = 200;             // right content edge  (PAGE_W - ~16)
const CW = MR - ML;        // content width ≈ 185 mm
const FOOTER_H = 12;
const FOOTER_Y = PAGE_H - FOOTER_H;   // ~267 mm
const MAX_Y = FOOTER_Y - 6;           // ~261 mm — hard stop before footer (fallback)
let actualFooterH = FOOTER_H;         // Will be set dynamically based on image aspect ratio
let actualMaxY = MAX_Y;               // Will be set dynamically

export class TemplateBasedPdfGenerator {
  private getImageBase64(filename: string): string {
    try {
      const imgPath = path.join(process.cwd(), 'public', filename);
      return `data:image/png;base64,${fs.readFileSync(imgPath).toString('base64')}`;
    } catch (error) {
      console.error(`❌ Failed to load ${filename}:`, error);
      return '';
    }
  }

  /**
   * 3-column page header: logo (proportional width) | title (bold) | borderless grey code box.
   * Draws a separator line and returns Y after the header.
   */
  private addPageHeader(pdf: jsPDF, titleLines: string[], codigo: string): number {
    const logoB64 = this.getImageBase64('logo.png');
    if (logoB64) {
      try {
        const props = pdf.getImageProperties(logoB64);
        const logoH = 15;
        const logoW = logoH * (props.width / props.height);
        pdf.addImage(logoB64, 'PNG', ML, 7, logoW, logoH);
      } catch {
        pdf.addImage(logoB64, 'PNG', ML, 7, 35, 15);
      }
    }

    // Title — centred for letter width
    const cx = PAGE_W / 2;
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold').setFontSize(14);
    if (titleLines.length === 1) {
      pdf.text(titleLines[0], cx, 17, { align: 'center' });
    } else {
      pdf.text(titleLines[0], cx, 13, { align: 'center' });
      pdf.text(titleLines[1], cx, 21, { align: 'center' });
    }

    // Code box — borderless, grey text
    const bx = 158, by = 7, bw = 42, rh = 4;
    const labels = ['CÓDIGO', 'FECHA', 'REVISIÓN', 'PÁGINA'];
    const values = [codigo, '01/04/2026', '00', '1 de 1'];
    pdf.setTextColor(140, 140, 140);
    labels.forEach((lbl, i) => {
      pdf.setFont('helvetica', 'bold').setFontSize(6);
      pdf.text(lbl + ':', bx + 1, by + i * rh + 3.5);
      pdf.setFont('helvetica', 'normal').setFontSize(6);
      pdf.text(values[i], bx + bw - 1, by + i * rh + 3.5, { align: 'right' });
    });
    pdf.setTextColor(0, 0, 0);

    // Separator line
    pdf.setLineWidth(0.6);
    pdf.line(ML, 28, MR, 28);
    pdf.setLineWidth(0.2);
    return 35;
  }

  /** Computes actual footer dimensions from image before layout, sets global actualMaxY */
  private initializeFooterDimensions(pdf: jsPDF): void {
    const footerB64 = this.getImageBase64('docs_footer.png');
    if (!footerB64) {
      actualFooterH = FOOTER_H;
      actualMaxY = MAX_Y;
      return;
    }
    try {
      const props = pdf.getImageProperties(footerB64);
      const naturalH = PAGE_W * (props.height / props.width); // height that keeps aspect ratio
      const footerY = PAGE_H - naturalH;
      actualFooterH = naturalH;
      actualMaxY = footerY - 6;
    } catch {
      actualFooterH = FOOTER_H;
      actualMaxY = MAX_Y;
    }
  }

  /** Adds docs_footer.png spanning the full page width at the very bottom, preserving aspect ratio */
  private addPageFooter(pdf: jsPDF): void {
    const footerB64 = this.getImageBase64('docs_footer.png');
    if (!footerB64) return;
    try {
      const props = pdf.getImageProperties(footerB64);
      const naturalH = PAGE_W * (props.height / props.width); // height that keeps aspect ratio
      const footerY = PAGE_H - naturalH;
      pdf.addImage(footerB64, 'PNG', 0, footerY, PAGE_W, naturalH);
    } catch {
      pdf.addImage(footerB64, 'PNG', 0, FOOTER_Y, PAGE_W, FOOTER_H);
    }
  }

  /**
   * Bordered table with automatic multi-page support.
   * When a row would overflow MAX_Y the current page gets its footer,
   * a new page is added and the column-header row is re-rendered before continuing.
   * Pass rows for ALL participants; the function pads to at least minRows empty rows.
   * Returns [finalY, didOverflow] where didOverflow indicates if table extended to page 2.
   */
  private drawBorderedTable(
    pdf: jsPDF,
    headers: string[],
    colWidths: number[],
    rows: string[][],
    startX: number,
    startY: number,
    minRows: number = 10,
    rowH: number = 8
  ): [number, boolean] {
    pdf.setLineWidth(0.3);

    const renderColHeaders = (yPos: number): number => {
      pdf.setFont('helvetica', 'bold').setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      let x = startX;
      headers.forEach((h, i) => {
        pdf.rect(x, yPos, colWidths[i], rowH);
        const hLines = h.split('\n');
        const hcx = x + colWidths[i] / 2;
        if (hLines.length === 2) {
          pdf.text(hLines[0], hcx, yPos + rowH / 2 - 0.5, { align: 'center' });
          pdf.text(hLines[1], hcx, yPos + rowH / 2 + 3.5, { align: 'center' });
        } else {
          pdf.text(h, hcx, yPos + rowH / 2 + 1.5, { align: 'center' });
        }
        x += colWidths[i];
      });
      return yPos + rowH;
    };

    // Pad rows to minRows if needed
    const totalRows = Math.max(minRows, rows.length);
    const allRows: string[][] = Array.from({ length: totalRows }, (_, i) => {
      const r = rows[i] ?? Array(headers.length).fill('');
      const dr = [...r];
      if (!dr[0]) dr[0] = String(i + 1);
      return dr;
    });

    let y = renderColHeaders(startY);
    let didOverflow = false;

    pdf.setFont('helvetica', 'normal').setFontSize(9);
    for (const row of allRows) {
      if (y + rowH > actualMaxY) {
        this.addPageFooter(pdf);
        pdf.addPage();
        y = 20;
        y = renderColHeaders(y);
        pdf.setFont('helvetica', 'normal').setFontSize(9);
        didOverflow = true;
      }
      let x = startX;
      row.forEach((cell, ci) => {
        pdf.rect(x, y, colWidths[ci], rowH);
        pdf.text(String(cell ?? ''), x + 2, y + rowH / 2 + 1.5, { maxWidth: colWidths[ci] - 3 });
        x += colWidths[ci];
      });
      y += rowH;
    }
    return [y, didOverflow];
  }

  /** "Atentamente," + centred bold SHA signature. Does NOT add page break - caller must check space. */
  private addSHASignature(pdf: jsPDF, y: number): number {
    const cx = PAGE_W / 2;
    pdf.setFont('helvetica', 'bold').setFontSize(10);
    pdf.text('Atentamente,', cx, y, { align: 'center' });
    y += 6;
    pdf.setFont('helvetica', 'bold').setFontSize(12);
    pdf.text('REPRESENTANTE SHA', cx, y, { align: 'center' });
    y += 12;
    return y;
  }

  async generateCertificacionCompetencias(data: TemplateData): Promise<Buffer> {
    try {
      console.log('🔍 Generating certificacion de competencias with template-based approach');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      this.initializeFooterDimensions(pdf); // Set actualMaxY before any layout
      let y = this.addPageHeader(pdf, ['CERTIFICACIÓN DE', 'COMPETENCIAS'], 'SHA-RG-CAP-006');

      pdf.setFont('helvetica', 'normal').setFontSize(11);
      pdf.text(`Puerto La Cruz, ${data.fecha || ''}`, MR, y, { align: 'right' });
      y += 12;

      pdf.setFont('helvetica', 'bold').setFontSize(11);
      pdf.text(`Sres. ${data.nombre_cliente || ''}`, ML, y);
      y += 14;

      pdf.setFont('helvetica', 'normal').setFontSize(10);
      const bodyText =
        `SHA DE VENEZUELA, C.A. certifica las competencias de cada uno de los participantes` +
        ` descritos en el cuadro anexo, quienes asistieron al curso de ${data.titulo_curso || ''},` +
        ` realizado en ${data.ciudad || ''} el ${data.dia || ''} de ${data.mes || ''} del ${data.anio || ''}` +
        ` como parte del proceso de Capacitación bajo la Orden de Servicio Interna ${data.nro_osi || ''},` +
        ` en consideración de su desempeño y los resultados obtenidos en las evaluaciones efectuadas durante el mismo.`;
      const bodyLines = pdf.splitTextToSize(bodyText, CW);
      pdf.text(bodyLines, ML, y);
      y += bodyLines.length * 5.5 + 8;

      pdf.text('La nota mínima aprobatoria es de 14 puntos.', ML, y);
      y += 12;

      const certHeaders = ['N°', 'NOMBRE Y APELLIDO', 'CÉDULA', 'PUNTUACIÓN', 'CONDICIÓN', 'N° DE\nCONTROL'];
      const certColWidths = [10, 50, 32, 25, 30, 38];
      const certRows: string[][] = data.participantes.map((p, i) => [
        String(p.index ?? i + 1), p.nombre_apellido || '', p.cedula || '',
        p.puntuacion || '', p.condicion || '', p.numero_control || '',
      ]);
      [y] = this.drawBorderedTable(pdf, certHeaders, certColWidths, certRows, ML, y);
      y += 10;

      y = this.addSHASignature(pdf, y);

      this.addPageFooter(pdf);

      const buffer = Buffer.from(pdf.output('arraybuffer'));
      console.log('✅ Certificacion de competencias generated successfully, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating certificacion de competencias:', error);
      throw new Error(`Failed to generate certificacion de competencias document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateNotaEntrega(data: TemplateData): Promise<Buffer> {
    try {
      console.log('🔍 Generating nota de entrega with template-based approach');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      this.initializeFooterDimensions(pdf); // Set actualMaxY before any layout
      let y = this.addPageHeader(pdf, ['NOTA DE ENTREGA'], 'SHA-RG-CAP-006');

      pdf.setFont('helvetica', 'normal').setFontSize(11);
      pdf.text(`Puerto La Cruz, ${data.fecha || ''}`, MR, y, { align: 'right' });
      y += 12;

      pdf.setFont('helvetica', 'bold').setFontSize(11);
      pdf.text(`Sres. ${data.nombre_cliente || ''}`, ML, y);
      y += 14;

      pdf.setFont('helvetica', 'normal').setFontSize(10);
      const bodyText =
        `Sirva la presente para hacer entrega de CERTIFICADOS correspondientes a la formación en materia de` +
        ` ${data.titulo_curso || ''}, realizado en ${data.ciudad || ''}, el día ${data.dia || ''} de` +
        ` ${data.mes || ''} del ${data.anio || ''}, como parte del proceso de Capacitación bajo la Orden` +
        ` de Servicio Interna ${data.nro_osi || ''}, siendo aprobados los siguientes participantes:`;
      const bodyLines = pdf.splitTextToSize(bodyText, CW);
      pdf.text(bodyLines, ML, y);
      y += bodyLines.length * 5.5 + 8;

      const neHeaders = ['N°', 'NOMBRE Y APELLIDO', 'CÉDULA', 'N° DE CONTROL'];
      const neColWidths = [10, 75, 45, 55];
      const neRows: string[][] = data.participantes.map((p, i) => [
        String(p.index ?? i + 1), p.nombre_apellido || '', p.cedula || '', p.numero_control || '',
      ]);
      const [tableY, tableOverflowed] = this.drawBorderedTable(pdf, neHeaders, neColWidths, neRows, ML, y, 1);
      y = tableY + 10;

      // Only add page break if table itself overflowed to page 2
      // Signature sections stay on page 1 as long as table fits on page 1
      if (tableOverflowed) {
        this.addPageFooter(pdf);
        pdf.addPage();
        y = 30;
      }

      y = this.addSHASignature(pdf, y);
      y += 14;

      const cx = PAGE_W / 2;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal').setFontSize(11);
      pdf.text('Recibido por:', ML, y);
      y += 22;

      pdf.setLineWidth(0.4);
      pdf.line(55, y, 155, y);
      y += 6;

      pdf.setFont('helvetica', 'bold').setFontSize(10);
      pdf.text('SELLO Y FIRMA DEL CLIENTE', cx, y, { align: 'center' });
      y += 6;
      pdf.text(data.nombre_recibido || '[NOMBRE Y APELLIDO]', cx, y, { align: 'center' });
      y += 6;
      pdf.text(data.cargo_recibido || '[CARGO]', cx, y, { align: 'center' });
      y += 12;

      // Italic footnote — no individual page break check since we handle pagination based on table overflow
      pdf.setFont('helvetica', 'italic').setFontSize(8);
      pdf.text(
        '(Devolver sellado y firmado para validar la recepción de los documentos descritos en el documento)',
        cx, y, { align: 'center' }
      );

      this.addPageFooter(pdf);

      const buffer = Buffer.from(pdf.output('arraybuffer'));
      console.log('✅ Nota de entrega generated successfully, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating nota de entrega:', error);
      throw new Error(`Failed to generate nota de entrega document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateValidacionDatos(data: TemplateData): Promise<Buffer> {
    try {
      console.log('🔍 Generating validacion de datos with template-based approach');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      this.initializeFooterDimensions(pdf); // Set actualMaxY before any layout
      let y = this.addPageHeader(pdf, ['VALIDACIÓN DE DATOS'], 'SHA-RG-CAP-004');

      pdf.setFont('helvetica', 'normal').setFontSize(11);
      pdf.text(`Puerto La Cruz, ${data.fecha || ''}`, MR, y, { align: 'right' });
      y += 12;

      pdf.setFont('helvetica', 'bold').setFontSize(11);
      const clientLine = data.localidad_cliente
        ? `Sres. ${data.nombre_cliente || ''} – ${data.localidad_cliente}`
        : `Sres. ${data.nombre_cliente || ''}`;
      pdf.text(clientLine, ML, y);
      y += 14;

      pdf.setFont('helvetica', 'normal').setFontSize(10);
      const bodyText =
        `Sirva la presente para formalizar el proceso de Validación de Datos de los participantes que asistieron` +
        ` al curso de ${data.titulo_curso || ''}, realizado en ${data.localidad_cliente || data.ciudad || ''},` +
        ` el (los) día (s) ${data.fecha_ejecucion || data.fecha || ''}, como parte del proceso de Capacitación` +
        ` bajo la Orden de Servicio Interna ${data.nro_osi || ''}. Recibir esta validación es indispensable para` +
        ` proceder a imprimir los certificados y carnet, según aplique. Este proceso es limitativo para la` +
        ` entrega formal y física de los mismos.`;
      const bodyLines = pdf.splitTextToSize(bodyText, CW);
      pdf.text(bodyLines, ML, y);
      y += bodyLines.length * 5.5 + 8;

      const vdHeaders = ['N°', 'NOMBRE Y APELLIDO', 'CÉDULA', 'N° DE CONTROL'];
      const vdColWidths = [10, 75, 45, 55];
      const vdRows: string[][] = data.participantes.map((p, i) => [
        String(p.index ?? i + 1), p.nombre_apellido || '', p.cedula || '', p.numero_control || '',
      ]);
      [y] = this.drawBorderedTable(pdf, vdHeaders, vdColWidths, vdRows, ML, y);
      y += 10;

      y = this.addSHASignature(pdf, y);

      this.addPageFooter(pdf);

      const buffer = Buffer.from(pdf.output('arraybuffer'));
      console.log('✅ Validacion de datos generated successfully, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating validacion de datos:', error);
      throw new Error(`Failed to generate validacion de datos document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
