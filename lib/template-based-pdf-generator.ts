import jsPDF from "jspdf";
import { TemplateData } from "./document-templates-new";
import fs from "fs";
import path from "path";

// Letter page dimensions (mm)
const PAGE_W = 215.9;
const PAGE_H = 279.4;
const ML = 15; // left margin
const MR = 200; // right content edge  (PAGE_W - ~16)
const CW = MR - ML; // content width ≈ 185 mm
const FOOTER_H = 12;
const FOOTER_Y = PAGE_H - FOOTER_H; // ~267 mm
const MAX_Y = FOOTER_Y - 6; // ~261 mm — hard stop before footer (fallback)
let actualFooterH = FOOTER_H; // Will be set dynamically based on image aspect ratio
let actualMaxY = MAX_Y; // Will be set dynamically

const _imageCache = new Map<string, string>();

export class TemplateBasedPdfGenerator {
  private getImageBase64(filename: string): string {
    if (_imageCache.has(filename)) return _imageCache.get(filename)!;
    try {
      const imgPath = path.join(process.cwd(), "public", filename);
      const result = `data:image/png;base64,${fs.readFileSync(imgPath).toString("base64")}`;
      _imageCache.set(filename, result);
      return result;
    } catch (error) {
      return "";
    }
  }

  /** Draws watermark.png centred on the current page at 15% opacity */
  private addWatermark(pdf: jsPDF): void {
    const wmB64 = this.getImageBase64("watermark.png");
    if (!wmB64) return;
    try {
      const wmSize = 140; // mm — square watermark
      const x = (PAGE_W - wmSize) / 2;
      const y = (PAGE_H - wmSize) / 2;
      pdf.saveGraphicsState();
      pdf.setGState(pdf.GState({ opacity: 0.12 }));
      pdf.addImage(wmB64, "PNG", x, y, wmSize, wmSize, undefined, "FAST");
      pdf.restoreGraphicsState();
    } catch (error) {
      // Continue without watermark
    }
  }

  private drawMixedText(
    pdf: jsPDF,
    parts: { text: string; bold: boolean }[],
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number = 5.5,
  ): number {
    let currentX = x;
    let currentY = y;

    pdf.setFontSize(10);

    parts.forEach((part) => {
      pdf.setFont("helvetica", part.bold ? "bold" : "normal");
      const words = part.text.split(/(\s+)/);

      words.forEach((word) => {
        const wordW = pdf.getTextWidth(word);
        if (currentX + wordW > x + maxWidth && word.trim().length > 0) {
          currentX = x;
          currentY += lineHeight;
        }
        pdf.text(word, currentX, currentY);
        currentX += wordW;
      });
    });

    return currentY;
  }

  /**
   * 3-column page header: logo (proportional width) | title (bold) | borderless grey code box.
   * Draws a separator line and returns Y after the header.
   */
  private addPageHeader(
    pdf: jsPDF,
    titleLines: string[],
    codigo: string,
    fecha: string = "01/06/2026",
    revision: string = "0",
    currentPage: number = 1,
    totalPages: number = 1,
  ): number {
    const logoB64 = this.getImageBase64("logo.png");
    if (logoB64) {
      try {
        const props = pdf.getImageProperties(logoB64);
        const logoH = 12;
        const logoW = logoH * (props.width / props.height);
        pdf.addImage(logoB64, "PNG", ML, 8, logoW, logoH, undefined, "FAST");
      } catch {
        pdf.addImage(logoB64, "PNG", ML, 8, 28, 12, undefined, "FAST");
      }
    }

    // Title — centred for letter width
    const cx = PAGE_W / 2;
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold").setFontSize(13);
    if (titleLines.length === 1) {
      pdf.text(titleLines[0], cx, 17, { align: "center" });
    } else {
      pdf.text(titleLines[0], cx, 13, { align: "center" });
      pdf.text(titleLines[1], cx, 21, { align: "center" });
    }

    // Code box — borderless, grey text
    const bx = 158,
      by = 7,
      bw = 42,
      rh = 4;
    const labels = ["REVISIÓN", "FECHA", "PÁGINA"];
    const values = [revision, fecha, `${currentPage} de ${totalPages}`];
    pdf.setTextColor(140, 140, 140);
    labels.forEach((lbl, i) => {
      pdf.setFont("helvetica", "bold").setFontSize(6);
      pdf.text(lbl + ":", bx + 1, by + i * rh + 3.5);
      pdf.setFont("helvetica", "normal").setFontSize(6);
      pdf.text(values[i], bx + bw - 1, by + i * rh + 3.5, { align: "right" });
    });
    pdf.setTextColor(0, 0, 0);

    return 35;
  }

  /** Computes actual footer dimensions from image before layout, sets global actualMaxY */
  private initializeFooterDimensions(pdf: jsPDF): void {
    const footerB64 = this.getImageBase64("docs_footer.png");
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

  /** Adds docs_footer.png spanning the page content width at the bottom, preserving aspect ratio */
  private addPageFooter(pdf: jsPDF): void {
    const footerB64 = this.getImageBase64("docs_footer.png");
    if (!footerB64) return;
    try {
      const props = pdf.getImageProperties(footerB64);
      const naturalH = CW * (props.height / props.width); // height that keeps aspect ratio
      const footerY = PAGE_H - naturalH - 5; // 5mm margin from bottom
      pdf.addImage(
        footerB64,
        "PNG",
        ML,
        footerY,
        CW,
        naturalH,
        undefined,
        "FAST",
      );
    } catch {
      pdf.addImage(
        footerB64,
        "PNG",
        ML,
        FOOTER_Y,
        CW,
        FOOTER_H,
        undefined,
        "FAST",
      );
    }
  }

  /**
   * Bordered table with automatic multi-page support.
   * When a row would overflow MAX_Y the current page gets its footer,
   * a new page is added and the column-header row is re-rendered before continuing.
   * Returns [finalY, didOverflow].
   */
  private drawBorderedTable(
    pdf: jsPDF,
    headers: string[],
    colWidths: number[],
    rows: string[][],
    startX: number,
    startY: number,
    minRows: number = 1,
    rowH: number = 8,
    config?: {
      titleLines: string[];
      codigo: string;
      fecha?: string;
      revision?: string;
      showAverage?: boolean;
      averageValue?: string;
      alignments?: ("left" | "center" | "right" | "center-left")[];
    },
  ): [number, boolean] {
    pdf.setLineWidth(0.3);

    const renderColHeaders = (yPos: number): number => {
      pdf.setFont("helvetica", "bold").setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      let x = startX;
      headers.forEach((h, i) => {
        pdf.rect(x, yPos, colWidths[i], rowH);
        const hLines = h.split("\n");
        const hcx = x + colWidths[i] / 2;
        if (hLines.length === 2) {
          pdf.text(hLines[0], hcx, yPos + rowH / 2 - 0.5, { align: "center" });
          pdf.text(hLines[1], hcx, yPos + rowH / 2 + 3.5, { align: "center" });
        } else {
          pdf.text(h, hcx, yPos + rowH / 2 + 1.5, { align: "center" });
        }
        x += colWidths[i];
      });
      return yPos + rowH;
    };

    // Pad rows to minRows if needed
    const totalRows = Math.max(minRows, rows.length);
    const allRows: string[][] = Array.from({ length: totalRows }, (_, i) => {
      const r = rows[i] ?? Array(headers.length).fill("");
      const dr = [...r];
      if (!dr[0]) dr[0] = String(i + 1);
      return dr;
    });

    let y = renderColHeaders(startY);
    let didOverflow = false;
    let currentPage = 1;

    pdf.setFont("helvetica", "normal").setFontSize(9);
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      if (y + rowH > actualMaxY) {
        this.addPageFooter(pdf);
        pdf.addPage();
        currentPage++;
        this.addWatermark(pdf);
        if (config) {
          this.addPageHeader(
            pdf,
            config.titleLines,
            config.codigo,
            config.fecha,
            config.revision,
            currentPage,
            99, // Temporary total pages placeholder
          );
        }
        y = 35; // Start after header
        y = renderColHeaders(y);
        pdf.setFont("helvetica", "normal").setFontSize(9);
        didOverflow = true;
      }
      let x = startX;
      row.forEach((cell, ci) => {
        pdf.rect(x, y, colWidths[ci], rowH);
        const alignment = config?.alignments?.[ci] || "left";
        const cellText = String(cell ?? "");

        if (alignment === "center") {
          pdf.text(cellText, x + colWidths[ci] / 2, y + rowH / 2 + 1.5, {
            align: "center",
          });
        } else if (alignment === "center-left") {
          // Fixed padding to align text starts while appearing centered
          const padding = Math.max(2, (colWidths[ci] - 25) / 2);
          pdf.text(cellText, x + padding, y + rowH / 2 + 1.5);
        } else if (alignment === "right") {
          pdf.text(cellText, x + colWidths[ci] - 2, y + rowH / 2 + 1.5, {
            align: "right",
          });
        } else {
          pdf.text(cellText, x + 2, y + rowH / 2 + 1.5, {
            maxWidth: colWidths[ci] - 3,
          });
        }
        x += colWidths[ci];
      });
      y += rowH;
    }

    // Add average row if requested
    if (config?.showAverage && config.averageValue) {
      if (y + rowH > actualMaxY) {
        this.addPageFooter(pdf);
        pdf.addPage();
        currentPage++;
        this.addWatermark(pdf);
        if (config) {
          this.addPageHeader(
            pdf,
            config.titleLines,
            config.codigo,
            config.fecha,
            config.revision,
            currentPage,
            99,
          );
        }
        y = 35;
        y = renderColHeaders(y);
      }

      let x = startX;
      // First cell (N°) empty
      pdf.rect(x, y, colWidths[0], rowH);
      x += colWidths[0];

      // Second and third cells merged or just label
      const labelW = colWidths[1] + colWidths[2];
      pdf.rect(x, y, labelW, rowH);
      pdf.setFont("helvetica", "bold");
      pdf.text("Puntuacion promedio", x + 2, y + rowH / 2 + 1.5);
      x += labelW;

      // Score cell
      pdf.rect(x, y, colWidths[3], rowH);
      pdf.text(config.averageValue, x + colWidths[3] / 2, y + rowH / 2 + 1.5, {
        align: "center",
      });
      x += colWidths[3];

      // Condition cell empty
      pdf.rect(x, y, colWidths[4], rowH);
      x += colWidths[4];

      // Control number cell empty
      pdf.rect(x, y, colWidths[5], rowH);
      y += rowH;
    }

    // Update total pages in all headers
    const totalPages = currentPage;
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      // Overwrite only the PÁGINA part
      const bx = 158,
        by = 7,
        bw = 42,
        rh = 4;
      pdf.setDrawColor(255, 255, 255);
      pdf.setFillColor(255, 255, 255);
      // PÁGINA is the 3rd label (index 2), so y = by + 2 * rh
      pdf.rect(bx + bw - 15, by + 2 * rh + 1, 14, 3, "F"); // Clear previous page number
      pdf.setTextColor(140, 140, 140);
      pdf.setFont("helvetica", "normal").setFontSize(6);
      pdf.text(`${p} de ${totalPages}`, bx + bw - 1, by + 2 * rh + 3.5, {
        align: "right",
      });
    }
    pdf.setPage(totalPages);
    pdf.setDrawColor(0, 0, 0); // Reset draw color
    pdf.setTextColor(0, 0, 0); // Ensure text is black for subsequent content

    return [y, didOverflow];
  }

  /** "Atentamente," + centred bold SHA signature. Does NOT add page break - caller must check space. */
  private addSHASignature(pdf: jsPDF, y: number): number {
    const cx = PAGE_W / 2;
    pdf.setFont("helvetica", "bold").setFontSize(10);
    pdf.text("Atentamente,", 15, y, { align: "left" });
    y += 10;
    pdf.setFont("helvetica", "bold").setFontSize(11);
    pdf.text("DPTO. CAPACITACIÓN / SHA DE VENEZUELA, C.A.", cx, y, {
      align: "center",
    });
    y += 15;
    return y;
  }

  async generateCertificacionCompetencias(data: TemplateData): Promise<Buffer> {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
        compress: true,
      });
      this.initializeFooterDimensions(pdf); // Set actualMaxY before any layout
      this.addWatermark(pdf);
      let y = this.addPageHeader(
        pdf,
        ["CERTIFICACIÓN DE COMPETENCIAS"],
        "SHA-RG-CAP-006",
      );

      pdf.setFont("helvetica", "normal").setFontSize(11);
      pdf.text(`Puerto La Cruz, ${data.fecha || ""}`, MR, y, {
        align: "right",
      });
      y += 12;

      pdf.setFont("helvetica", "bold").setFontSize(11);
      pdf.text(`Sres. ${data.nombre_cliente || ""}`, ML, y);
      y += 8; // Reduced space

      pdf.setFont("helvetica", "normal").setFontSize(10);

      const introParts = [
        { text: "SHA DE VENEZUELA, C.A.", bold: true },
        {
          text: " certifica las competencias de cada uno de los participantes descritos en el cuadro anexo, quienes asistieron al curso de ",
          bold: false,
        },
        { text: data.titulo_curso || "", bold: true },
        { text: ", realizado en ", bold: false },
        { text: (data.ciudad || "").toUpperCase(), bold: true },
        {
          text: ` el ${data.dia || ""} de ${data.mes || ""} del ${data.anio || ""} como parte del proceso de Capacitación bajo la Orden de Servicio Interna `,
          bold: false,
        },
        { text: data.nro_osi || "", bold: true },
        {
          text: ", en consideración de su desempeño y los resultados obtenidos en las evaluaciones efectuadas durante el mismo.",
          bold: false,
        },
      ];

      y = this.drawMixedText(pdf, introParts, ML, y, CW);
      y += 8; // Space to "La nota mínima..."

      pdf.setFont("helvetica", "normal");
      pdf.text("La nota mínima aprobatoria es de 14 puntos.", ML, y);
      y += 10;

      const certHeaders = [
        "N°",
        "NOMBRE Y APELLIDO",
        "CÉDULA",
        "PUNTUACIÓN",
        "CONDICIÓN",
        "N° DE\nCONTROL",
      ];
      const certColWidths = [10, 50, 40, 25, 30, 30];
      const certRows: string[][] = data.participantes.map((p, i) => {
        return [
          String(p.index ?? i + 1),
          (p.nombre_apellido || "").toUpperCase(),
          p.cedula || "",
          p.puntuacion || "",
          p.condicion || "",
          p.numero_control || "",
        ];
      });

      // Calculate average score
      const validScores = data.participantes
        .map((p) => Number(p.puntuacion))
        .filter((score) => !isNaN(score) && score > 0);
      const averageScore =
        validScores.length > 0
          ? (
              validScores.reduce((sum, score) => sum + score, 0) /
              validScores.length
            ).toFixed(2)
          : "0.00";

      [y] = this.drawBorderedTable(
        pdf,
        certHeaders,
        certColWidths,
        certRows,
        ML,
        y,
        1,
        8,
        {
          titleLines: ["CERTIFICACIÓN DE COMPETENCIAS"],
          codigo: "SHA-RG-CAP-006",
          showAverage: true,
          averageValue: averageScore,
          alignments: [
            "center",
            "left",
            "center-left",
            "center",
            "center",
            "center",
          ],
        },
      );
      y += 10;

      // Check space for signature
      const SIGNATURE_BLOCK_H = 30;
      if (y + SIGNATURE_BLOCK_H > actualMaxY) {
        this.addPageFooter(pdf);
        pdf.addPage();
        this.addWatermark(pdf);
        y = 35;
        this.addPageHeader(
          pdf,
          ["CERTIFICACIÓN DE", "COMPETENCIAS"],
          "SHA-RG-CAP-006",
          undefined,
          undefined,
          pdf.getNumberOfPages(),
          pdf.getNumberOfPages(),
        );
      }

      y = this.addSHASignature(pdf, y);

      this.addPageFooter(pdf);

      const buffer = Buffer.from(pdf.output("arraybuffer"));
      return buffer;
    } catch (error) {
      throw new Error(
        `Failed to generate certificacion de competencias document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async generateNotaEntrega(data: TemplateData): Promise<Buffer> {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
        compress: true,
      });
      this.initializeFooterDimensions(pdf); // Set actualMaxY before any layout
      this.addWatermark(pdf);
      let y = this.addPageHeader(pdf, ["NOTA DE ENTREGA"], "SHA-RG-CAP-006");

      pdf.setFont("helvetica", "normal").setFontSize(11);
      pdf.text(`Puerto La Cruz, ${data.fecha || ""}`, MR, y, {
        align: "right",
      });
      y += 12;

      pdf.setFont("helvetica", "bold").setFontSize(11);
      pdf.text(`Sres. ${data.nombre_cliente || ""}`, ML, y);
      y += 14;

      pdf.setFont("helvetica", "normal").setFontSize(10);

      const neIntroParts = [
        {
          text: "Sirva la presente para hacer entrega de CERTIFICADOS correspondientes a la formación en materia de ",
          bold: false,
        },
        { text: data.titulo_curso || "", bold: true },
        { text: ", realizado en ", bold: false },
        { text: (data.ciudad || "").toUpperCase(), bold: true },
        {
          text: `, el día ${data.dia || ""} de ${data.mes || ""} del ${data.anio || ""}, como parte del proceso de Capacitación bajo la Orden de Servicio Interna `,
          bold: false,
        },
        { text: data.nro_osi || "", bold: true },
        {
          text: ", siendo aprobados los siguientes participantes:",
          bold: false,
        },
      ];

      y = this.drawMixedText(pdf, neIntroParts, ML, y, CW);
      y += 8;

      const neHeaders = ["N°", "NOMBRE Y APELLIDO", "CÉDULA", "N° DE CONTROL"];
      const neColWidths = [10, 75, 45, 55];
      const neRows: string[][] = data.participantes.map((p, i) => {
        return [
          String(p.index ?? i + 1),
          (p.nombre_apellido || "").toUpperCase(),
          p.cedula || "",
          p.numero_control || "",
        ];
      });
      const [tableY, tableOverflowed] = this.drawBorderedTable(
        pdf,
        neHeaders,
        neColWidths,
        neRows,
        ML,
        y,
        1,
        8,
        {
          titleLines: ["NOTA DE ENTREGA"],
          codigo: "SHA-RG-CAP-006",
          alignments: ["center", "left", "center-left", "center"],
        },
      );
      y = tableY + 6;

      // Break to new page if the full signature block won't fit before the footer
      const SIGNATURE_BLOCK_H = 85; // mm: SHA sig + Recibido por + line + names + footnote
      if (y + SIGNATURE_BLOCK_H > actualMaxY) {
        this.addPageFooter(pdf);
        pdf.addPage();
        this.addWatermark(pdf);
        y = 35;
        this.addPageHeader(
          pdf,
          ["NOTA DE ENTREGA"],
          "SHA-RG-CAP-006",
          undefined,
          undefined,
          pdf.getNumberOfPages(),
          pdf.getNumberOfPages(),
        );
      }

      y = this.addSHASignature(pdf, y);
      y += 8; // Reduced from 14

      const cx = PAGE_W / 2;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "normal").setFontSize(11);
      pdf.text("Recibido por:", ML, y);
      y += 18; // Reduced from 22

      pdf.setLineWidth(0.4);
      pdf.line(55, y, 155, y);
      y += 6;

      pdf.setFont("helvetica", "bold").setFontSize(10);
      pdf.text("SELLO Y FIRMA DEL CLIENTE", cx, y, { align: "center" });
      y += 6;
      pdf.text(data.nombre_recibido || "", cx, y, {
        align: "center",
      });
      y += 6;
      pdf.text(data.cargo_recibido || "", cx, y, { align: "center" });
      y += 12;

      // Italic footnote — no individual page break check since we handle pagination based on table overflow
      pdf.setFont("helvetica", "italic").setFontSize(8);
      pdf.text(
        "(Devolver sellado y firmado para validar la recepción de los documentos descritos en el documento)",
        cx,
        y,
        { align: "center" },
      );

      this.addPageFooter(pdf);

      const buffer = Buffer.from(pdf.output("arraybuffer"));
      return buffer;
    } catch (error) {
      throw new Error(
        `Failed to generate nota de entrega document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async generateValidacionDatos(data: TemplateData): Promise<Buffer> {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
        compress: true,
      });
      this.initializeFooterDimensions(pdf); // Set actualMaxY before any layout
      this.addWatermark(pdf);
      let y = this.addPageHeader(
        pdf,
        ["VALIDACIÓN DE DATOS"],
        "SHA-RG-CAP-004",
      );

      pdf.setFont("helvetica", "normal").setFontSize(11);
      pdf.text(`Puerto La Cruz, ${data.fecha || ""}`, MR, y, {
        align: "right",
      });
      y += 12;

      pdf.setFont("helvetica", "bold").setFontSize(11);
      const clientLine = data.localidad_cliente
        ? `Sres. ${data.nombre_cliente || ""} – ${data.localidad_cliente}`
        : `Sres. ${data.nombre_cliente || ""}`;
      pdf.text(clientLine, ML, y);
      y += 14;

      pdf.setFont("helvetica", "normal").setFontSize(10);

      const vdIntroParts = [
        {
          text: "Sirva la presente para formalizar el proceso de Validación de Datos de los participantes que asistieron al curso de ",
          bold: false,
        },
        { text: data.titulo_curso || "", bold: true },
        { text: ", realizado en ", bold: false },
        { text: (data.ciudad || "").toUpperCase(), bold: true },
        {
          text: `, el (los) día (s) ${data.fecha_ejecucion || data.fecha || ""}, como parte del proceso de Capacitación bajo la Orden de Servicio Interna `,
          bold: false,
        },
        { text: data.nro_osi || "", bold: true },
        {
          text: ". Recibir esta validación es indispensable para proceder a imprimir los certificados y carnet, según aplique. Este proceso es limitativo para la entrega formal y física de los mismos.",
          bold: false,
        },
      ];

      y = this.drawMixedText(pdf, vdIntroParts, ML, y, CW);
      y += 8;

      const vdHeaders = ["N°", "NOMBRE Y APELLIDO", "CÉDULA", "N° DE CONTROL"];
      const vdColWidths = [10, 75, 45, 55];
      const vdRows: string[][] = data.participantes.map((p, i) => {
        return [
          String(p.index ?? i + 1),
          (p.nombre_apellido || "").toUpperCase(),
          p.cedula || "",
          p.numero_control || "",
        ];
      });
      [y] = this.drawBorderedTable(
        pdf,
        vdHeaders,
        vdColWidths,
        vdRows,
        ML,
        y,
        1,
        8,
        {
          titleLines: ["VALIDACIÓN DE DATOS"],
          codigo: "SHA-RG-CAP-004",
          alignments: ["center", "left", "center-left", "center"],
        },
      );
      y += 10;

      // Check space for signature
      const SIGNATURE_BLOCK_H = 30;
      if (y + SIGNATURE_BLOCK_H > actualMaxY) {
        this.addPageFooter(pdf);
        pdf.addPage();
        this.addWatermark(pdf);
        y = 35;
        this.addPageHeader(
          pdf,
          ["VALIDACIÓN DE DATOS"],
          "SHA-RG-CAP-004",
          undefined,
          undefined,
          pdf.getNumberOfPages(),
          pdf.getNumberOfPages(),
        );
      }

      y = this.addSHASignature(pdf, y);

      this.addPageFooter(pdf);

      const buffer = Buffer.from(pdf.output("arraybuffer"));
      return buffer;
    } catch (error) {
      throw new Error(
        `Failed to generate validacion de datos document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
