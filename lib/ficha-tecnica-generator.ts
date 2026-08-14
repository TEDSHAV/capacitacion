/**
 * Ficha Técnica PDF generator (jsPDF-based).
 *
 * Generates the FT-CO-XXX document using jsPDF directly — no puppeteer/Chrome
 * needed. Follows the same pattern as lib/template-based-pdf-generator.ts and
 * lib/certificate-generator.ts, both already proven in production.
 *
 * Rich-text fields (objetivo_general, objetivo_especifico, contenido_curso)
 * are TipTap HTML converted to plain text via stripHtml() with list indentation.
 */

import jsPDF from "jspdf";
import fs from "fs";
import path from "path";
import { stripHtml } from "./strip-html";

export interface FichaTecnicaData {
  nombre: string;
  subtitulo: string | null;
  carga_horaria_std: number | null;
  para_quien: string | null;
  modalidad: string | null;
  objetivo_general: string | null;
  objetivo_especifico: string | null;
  contenido_curso: string | null;
  nota_aprobatoria: number | null;
  emite_carnet: boolean | null;
  created_at: string | null;
  cursoId: number | null;
}

// Letter page dimensions (mm)
const PAGE_W = 215.9;
const PAGE_H = 279.4;
const MARGIN_X = 20;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const HEADER_Y = 12;
const HEADER_BOTTOM = 30;
const TITLE_Y = 42;
const SECTION_GAP = 8;
const FONT_SIZE_PT = 10;
const HEADING_PT = 10;
const TITLE_PT = 15;
const LINE_HEIGHT = 5.2;

const _imageCache = new Map<string, { base64: string; format: string }>();

function getImageBase64(filename: string): { base64: string; format: string } | null {
  if (_imageCache.has(filename)) return _imageCache.get(filename)!;
  try {
    const imgPath = path.join(process.cwd(), "public", filename);
    if (!fs.existsSync(imgPath)) return null;
    const buffer = fs.readFileSync(imgPath);
    const ext = path.extname(filename).toLowerCase().slice(1);
    const format = ext === "jpg" || ext === "jpeg" ? "JPEG" : "PNG";
    const mime = ext === "jpg" ? "jpeg" : ext;
    const base64 = `data:image/${mime};base64,${buffer.toString("base64")}`;
    const result = { base64, format };
    _imageCache.set(filename, result);
    return result;
  } catch {
    return null;
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return new Date().toISOString().split("T")[0];
  try {
    const date = new Date(dateString + "T00:00:00");
    if (isNaN(date.getTime())) return new Date().toISOString().split("T")[0];
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

function padCourseCode(id: number | null): string {
  if (id == null) return "000";
  return String(id).padStart(3, "0");
}

function buildCertificacionText(data: FichaTecnicaData): string {
  const isParticipacion =
    data.nota_aprobatoria === 0 || data.nota_aprobatoria === null;

  if (isParticipacion) {
    return "El curso conduce a una certificación de participación.";
  }

  return "El curso conduce a una certificación de aprobación.";
}

/**
 * Compute the Y where content should stop (above footer).
 */
function getContentBottomY(): number {
  const footerData = getImageBase64("footer-ficha-tecnica.jpg");
  if (!footerData) return PAGE_H - 25;

  try {
    const tempPdf = new jsPDF({ unit: "mm", format: "letter" });
    const props = tempPdf.getImageProperties(footerData.base64);
    const naturalH = CONTENT_W * (props.height / props.width);
    return PAGE_H - naturalH - 12;
  } catch {
    return PAGE_H - 25;
  }
}

/**
 * Draw the page header: logo (left) + meta block (right).
 * Returns the Y position where content can begin.
 */
function drawHeader(
  pdf: jsPDF,
  data: FichaTecnicaData,
  currentPage: number,
  totalPages: number,
): number {
  const courseCode = `FT-CO-${padCourseCode(data.cursoId)}`;
  const fecha = formatDate(data.created_at);
  const rightX = PAGE_W - MARGIN_X;

  // Logo — top left, height 14mm, proportional width
  const logoData = getImageBase64("logo.png");
  if (logoData) {
    try {
      const props = pdf.getImageProperties(logoData.base64);
      const logoH = 14;
      const logoW = logoH * (props.width / props.height);
      pdf.addImage(logoData.base64, logoData.format, MARGIN_X, HEADER_Y, logoW, logoH, undefined, "FAST");
    } catch {
      pdf.addImage(logoData.base64, logoData.format, MARGIN_X, HEADER_Y, 30, 14, undefined, "FAST");
    }
  }

  // Meta block — top right, right-aligned, starts at same Y as logo
  let metaY = HEADER_Y + 3;
  pdf.setTextColor(0, 0, 0);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(courseCode, rightX, metaY, { align: "right" });

  metaY += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Rev. 1", rightX, metaY, { align: "right" });

  metaY += 5;
  pdf.text(`Fecha: ${fecha}`, rightX, metaY, { align: "right" });

  metaY += 5;
  pdf.text(`Página ${currentPage} de ${totalPages}`, rightX, metaY, { align: "right" });

  return HEADER_BOTTOM;
}

/**
 * Draw the footer image full content width.
 */
function drawFooter(pdf: jsPDF): void {
  const footerData = getImageBase64("footer-ficha-tecnica.jpg");
  if (!footerData) return;
  try {
    const props = pdf.getImageProperties(footerData.base64);
    const naturalH = CONTENT_W * (props.height / props.width);
    const footerY = PAGE_H - naturalH - 8;
    pdf.addImage(footerData.base64, footerData.format, MARGIN_X, footerY, CONTENT_W, naturalH, undefined, "FAST");
  } catch {
    const footerY = PAGE_H - 20;
    pdf.addImage(footerData.base64, footerData.format, MARGIN_X, footerY, CONTENT_W, 12, undefined, "FAST");
  }
}

/**
 * Render a section heading with a thin gray underline.
 * Returns the Y position after the heading.
 */
function drawSectionHeading(pdf: jsPDF, heading: string, y: number): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(HEADING_PT);
  pdf.setTextColor(0, 0, 0);
  pdf.text(heading.toUpperCase(), MARGIN_X, y);

  // Thin gray line below heading
  pdf.setDrawColor(209, 213, 219);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN_X, y + 1.5, PAGE_W - MARGIN_X, y + 1.5);

  return y + 5;
}

/**
 * Wrap a paragraph for PDF rendering, preserving list indentation.
 * Detects lines starting with "    - " (bullet) or "    N. " (numbered)
 * from stripHtml and converts them to a proper indent (mm) + hanging wrap.
 *
 * Returns the wrapped lines (with marker prefix on first line) and the
 * indent offset in mm to use for the X position.
 */
function wrapParagraph(
  doc: jsPDF,
  para: string,
  maxWidth: number,
): { lines: string[]; indent: number } {
  // Detect list item: 4 spaces + "- " or "N. "
  const listMatch = para.match(/^    (- \s*|\d+\.\s*)(.*)$/);
  if (listMatch) {
    const marker = listMatch[1]; // Keep trailing space: "1. " or "- "
    const text = listMatch[2].trim();
    const indentMm = 8; // indent for list items
    const markerW = doc.getTextWidth(marker);
    const wrapW = maxWidth - indentMm - markerW;

    const wrapped = doc.splitTextToSize(text, wrapW);
    const lines = wrapped.map((l: string, i: number) =>
      i === 0 ? `${marker}${l}` : `${" ".repeat(marker.length)}${l}`,
    );
    return { lines, indent: indentMm };
  }

  // Normal paragraph — no indent
  const trimmed = para.trim();
  const lines = doc.splitTextToSize(trimmed, maxWidth);
  return { lines, indent: 0 };
}

/**
 * Generate the Ficha Técnica PDF and return it as a Blob.
 */
export async function generateFichaTecnicaPdf(data: FichaTecnicaData): Promise<Blob> {
  const contentBottomY = getContentBottomY();
  const nombre = (data.nombre || "CURSO SIN NOMBRE").toUpperCase();
  const subtitulo = data.subtitulo ? data.subtitulo.toUpperCase() : "";

  const sections: { heading: string; content: string }[] = [
    { heading: "Objetivo del Curso", content: stripHtml(data.objetivo_general || "") },
    { heading: "Objetivos Específicos", content: stripHtml(data.objetivo_especifico || "") },
    { heading: "¿Para Quién Es?", content: stripHtml(data.para_quien || "") },
    { heading: "Contenido", content: stripHtml(data.contenido_curso || "") },
    { heading: "Certificación", content: buildCertificacionText(data) },
  ];

  // Use a placeholder total — we'll fix page numbers after rendering
  const PLACEHOLDER = 999;
  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });

  let currentPage = 1;
  doc.setPage(currentPage);

  // Header + footer on first page
  let y = drawHeader(doc, data, currentPage, PLACEHOLDER);
  drawFooter(doc);

  // Title — centered
  y = TITLE_Y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(TITLE_PT);
  doc.setTextColor(0, 0, 0);
  const titleLines = doc.splitTextToSize(nombre, CONTENT_W);
  for (const line of titleLines) {
    if (y > contentBottomY) {
      doc.addPage();
      currentPage++;
      doc.setPage(currentPage);
      y = drawHeader(doc, data, currentPage, PLACEHOLDER);
      drawFooter(doc);
      y = HEADER_BOTTOM + 5;
    }
    doc.text(line, PAGE_W / 2, y, { align: "center" });
    y += 7;
  }

  if (subtitulo) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_SIZE_PT);
    doc.setTextColor(51, 51, 51);
    const subLines = doc.splitTextToSize(subtitulo, CONTENT_W);
    for (const line of subLines) {
      if (y > contentBottomY) {
        doc.addPage();
        currentPage++;
        doc.setPage(currentPage);
        y = drawHeader(doc, data, currentPage, PLACEHOLDER);
        drawFooter(doc);
        y = HEADER_BOTTOM + 5;
      }
      doc.text(line, PAGE_W / 2, y, { align: "center" });
      y += 5;
    }
  }

  y += 4; // spacing after title

  // Sections
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];

    // Pre-measure section height to decide on page break
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_SIZE_PT);
    const paraTexts = sec.content.split("\n").filter((p) => p.trim());
    let estimatedHeight = 5; // heading
    for (const para of paraTexts) {
      const { lines: wrapped } = wrapParagraph(doc, para, CONTENT_W);
      estimatedHeight += wrapped.length * LINE_HEIGHT + 1.5;
    }

    // If section won't fit and we're not at the top of a page, break
    if (y + estimatedHeight > contentBottomY && y > HEADER_BOTTOM + 10) {
      doc.addPage();
      currentPage++;
      doc.setPage(currentPage);
      y = drawHeader(doc, data, currentPage, PLACEHOLDER);
      drawFooter(doc);
      y = HEADER_BOTTOM + 5;
    }

    // Draw heading
    y = drawSectionHeading(doc, sec.heading, y);

    // Draw content line by line with page break support
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_SIZE_PT);
    doc.setTextColor(0, 0, 0);

    for (const para of paraTexts) {
      const { lines: wrapped, indent } = wrapParagraph(doc, para, CONTENT_W);
      const textX = MARGIN_X + indent;
      const wrapW = CONTENT_W - indent;

      for (const line of wrapped) {
        if (y > contentBottomY) {
          doc.addPage();
          currentPage++;
          doc.setPage(currentPage);
          y = drawHeader(doc, data, currentPage, PLACEHOLDER);
          drawFooter(doc);
          y = HEADER_BOTTOM + 5;
          // Re-set font after page break
          doc.setFont("helvetica", "normal");
          doc.setFontSize(FONT_SIZE_PT);
          doc.setTextColor(0, 0, 0);
        }
        doc.text(line, textX, y);
        y += LINE_HEIGHT;
      }
      y += 1.5; // paragraph spacing
    }

    y += SECTION_GAP;
  }

  // Now fix page numbers with the real total
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Overwrite the "Página X de 999" with white rectangle
    const rightX = PAGE_W - MARGIN_X;
    const pnY = HEADER_Y + 3 + 15; // Y position of page number line
    doc.setFillColor(255, 255, 255);
    doc.rect(rightX - 45, pnY - 4, 45, 6, "F");

    // Re-draw with correct total
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Página ${p} de ${totalPages}`, rightX, pnY, { align: "right" });
  }

  return doc.output("blob");
}
