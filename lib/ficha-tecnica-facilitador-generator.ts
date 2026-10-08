/**
 * Ficha Técnica de Facilitador PDF generator (jsPDF-based).
 *
 * Executive, modern redesign:
 *  - Official SHA logo in the header with dual-color accent divider bar.
 *  - Executive Facilitator Hero Card with photo/avatar, typography, and badges.
 *  - High-impact section cards with sharp Lucide icon badges and divider lines.
 *  - Official SHA green footer (public/pdf/sha-footer.png) with full contact details.
 *  - Multi-page support with running headers and dynamic page numbering.
 */

import jsPDF from "jspdf";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { stripHtml } from "./strip-html";
import { toTitleCase } from "@/utils/string-utils";

export interface FichaTecnicaFacilitadorData {
  nombre_apellido: string;
  cedula: string | null;
  titulo_profesional: string | null;
  formacion_academica: string | null;
  experiencia_laboral: string | null;
  competencias_habilidades: string | null;
  /** Public Supabase Storage URL of the optimized profile photo (GET flow). */
  foto_perfil_url?: string | null;
  /**
   * Inline base64 data URL of the photo (POST/preview flow).
   * Takes precedence over foto_perfil_url when both are present.
   */
  foto_base64?: string | null;
  facilitadorId: number | null;
  created_at: string | null;
}

// Letter page dimensions (mm)
const PAGE_W = 215.9;
const PAGE_H = 279.4;
const MARGIN_X = 16;
const CONTENT_W = PAGE_W - MARGIN_X * 2; // 183.9mm
const SECTION_GAP = 6.5;
const FONT_SIZE_PT = 9.5;
const LINE_HEIGHT = 4.6;

// Asset filenames
const LOGO_FILE = "pdf/sha-logo.png";
const LOGO_FALLBACK_FILE = "logo.png";
const FOOTER_FILE = "pdf/sha-footer.png";
const FOOTER_FALLBACK_FILE = "docs_footer.png";

// Brand Colors
const COLOR_NAVY = [12, 63, 105] as const; // #0c3f69
const COLOR_GREEN = [119, 187, 65] as const; // #77bb41 (SHA green)
const COLOR_EMERALD = [5, 150, 105] as const; // #059669
const COLOR_TITLE = [15, 23, 42] as const; // #0f172a
const COLOR_TEXT = [51, 65, 85] as const; // #334155
const COLOR_MUTED = [100, 116, 139] as const; // #64748b
const COLOR_LIGHT_SLATE = [148, 163, 184] as const; // #94a3b8
const COLOR_BORDER = [226, 232, 240] as const; // #e2e8f0
const COLOR_CARD_BG = [248, 250, 252] as const; // #f8fafc

const _imageCache = new Map<string, { base64: string; format: string; width: number; height: number }>();
const _iconCache = new Map<string, { base64: string; format: string }>();

function getImageData(filename: string): { base64: string; format: string; width: number; height: number } | null {
  if (_imageCache.has(filename)) return _imageCache.get(filename)!;
  try {
    const imgPath = path.join(process.cwd(), "public", filename);
    if (!fs.existsSync(imgPath)) return null;
    const buffer = fs.readFileSync(imgPath);
    const ext = path.extname(filename).toLowerCase().slice(1);
    const format = ext === "jpg" || ext === "jpeg" ? "JPEG" : "PNG";
    const mime = ext === "jpg" ? "jpeg" : ext;
    const base64 = `data:image/${mime};base64,${buffer.toString("base64")}`;

    // Get natural dimensions
    let width = 100;
    let height = 100;
    try {
      const tempPdf = new jsPDF({ unit: "mm", format: "letter" });
      const props = tempPdf.getImageProperties(base64);
      width = props.width;
      height = props.height;
    } catch {
      // fallback
    }

    const result = { base64, format, width, height };
    _imageCache.set(filename, result);
    return result;
  } catch {
    return null;
  }
}

function getLogoData() {
  return getImageData(LOGO_FILE) || getImageData(LOGO_FALLBACK_FILE);
}

function getFooterData() {
  return getImageData(FOOTER_FILE) || getImageData(FOOTER_FALLBACK_FILE);
}

/**
 * Lucide SVG path data for section icons.
 */
const LUCIDE_ICONS: Record<string, string> = {
  // GraduationCap — Formación Académica
  graduation_cap: [
    '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>',
    '<path d="M22 10v6"/>',
    '<path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  ].join(""),
  // Briefcase — Experiencia Laboral
  briefcase: [
    '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    '<rect width="20" height="14" x="2" y="6" rx="2"/>',
  ].join(""),
  // Award — Competencias y Habilidades
  award: [
    '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/>',
    '<circle cx="12" cy="8" r="6"/>',
  ].join(""),
};

/**
 * Generate a modern badge icon as a PNG base64 data URL using sharp.
 * High-res rounded square badge with corporate navy background and white icon.
 */
async function getBadgeIcon(iconKey: string): Promise<{ base64: string; format: string } | null> {
  if (_iconCache.has(iconKey)) return _iconCache.get(iconKey)!;

  const paths = LUCIDE_ICONS[iconKey];
  if (!paths) return null;

  try {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
        <rect width="96" height="96" rx="22" fill="#0c3f69"/>
        <g transform="translate(20, 20) scale(2.333)" stroke="#ffffff" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          ${paths}
        </g>
      </svg>
    `;

    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    const base64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;
    const result = { base64, format: "PNG" as const };
    _iconCache.set(iconKey, result);
    return result;
  } catch (err) {
    console.error(`getBadgeIcon: failed to render ${iconKey}:`, err);
    return null;
  }
}

/**
 * Resolve profile photo to a base64 data URL usable by jsPDF.
 */
async function resolvePhotoData(
  data: FichaTecnicaFacilitadorData,
): Promise<{ base64: string; format: string } | null> {
  if (data.foto_base64) {
    const isJpeg = /^data:image\/jpe?g/i.test(data.foto_base64);
    return { base64: data.foto_base64, format: isJpeg ? "JPEG" : "PNG" };
  }

  if (!data.foto_perfil_url) return null;

  try {
    const res = await fetch(data.foto_perfil_url, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const isJpeg =
      data.foto_perfil_url.toLowerCase().endsWith(".jpg") ||
      data.foto_perfil_url.toLowerCase().endsWith(".jpeg");
    const mime = isJpeg ? "jpeg" : "png";
    const base64 = `data:image/${mime};base64,${buf.toString("base64")}`;
    return { base64, format: isJpeg ? "JPEG" : "PNG" };
  } catch (err) {
    console.error("resolvePhotoData: fetch failed:", err);
    return null;
  }
}

/**
 * Draw executive primary header on page 1:
 * - SHA logo (left)
 * - Title, Gerencia & Doc Code (right)
 * - Dual-color accent divider bar (bottom)
 * Returns the Y position where content/hero card begins.
 */
function drawPage1Header(pdf: jsPDF, data: FichaTecnicaFacilitadorData): number {
  const headerY = 12;
  const rightX = MARGIN_X + CONTENT_W;

  // 1. Logo
  const logo = getLogoData();
  if (logo) {
    try {
      const logoH = 13.5;
      const logoW = logoH * (logo.width / logo.height);
      pdf.addImage(logo.base64, logo.format, MARGIN_X, headerY, logoW, logoH, undefined, "FAST");
    } catch {
      // fallback text
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(...COLOR_NAVY);
      pdf.text("SHA DE VENEZUELA", MARGIN_X, headerY + 8);
    }
  }

  // 2. Right Title Block
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(...COLOR_NAVY);
  pdf.text("FICHA TÉCNICA DE FACILITADOR", rightX, headerY + 8, { align: "right" });

  // 3. Dual-color accent divider bar
  const barY = 28;
  const navyW = CONTENT_W * 0.72;
  const greenW = CONTENT_W - navyW;

  pdf.setFillColor(...COLOR_NAVY);
  pdf.rect(MARGIN_X, barY, navyW, 0.8, "F");

  pdf.setFillColor(...COLOR_GREEN);
  pdf.rect(MARGIN_X + navyW, barY, greenW, 0.8, "F");

  return barY + 4.5; // content starts below divider
}

/**
 * Draw running header for pages 2+.
 */
function drawRunningHeader(pdf: jsPDF, nombre: string): number {
  const headerY = 10;
  const rightX = MARGIN_X + CONTENT_W;

  const logo = getLogoData();
  if (logo) {
    try {
      const logoH = 8.5;
      const logoW = logoH * (logo.width / logo.height);
      pdf.addImage(logo.base64, logo.format, MARGIN_X, headerY, logoW, logoH, undefined, "FAST");
    } catch {
      // ignore
    }
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...COLOR_MUTED);
  pdf.text(`FICHA TÉCNICA DE FACILITADOR • ${nombre.toUpperCase()}`, rightX, headerY + 6, { align: "right" });

  const lineY = headerY + 11;
  pdf.setDrawColor(...COLOR_BORDER);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN_X, lineY, rightX, lineY);

  return lineY + 5;
}

/**
 * Draw the official green footer image (public/pdf/sha-footer.png) on a given page.
 */
function drawPageFooter(pdf: jsPDF, currentPage: number, totalPages: number): void {
  const footer = getFooterData();
  const footerY = PAGE_H - 13.5;
  const rightX = MARGIN_X + CONTENT_W;

  // 1. Page number right above footer image
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...COLOR_MUTED);
  pdf.text(`Página ${currentPage} de ${totalPages}`, rightX, PAGE_H - 15.5, { align: "right" });

  // 2. Green footer image
  if (footer) {
    try {
      const footerH = CONTENT_W * (footer.height / footer.width);
      pdf.addImage(footer.base64, footer.format, MARGIN_X, footerY, CONTENT_W, footerH, undefined, "FAST");
    } catch {
      // fallback green line
      pdf.setFillColor(...COLOR_GREEN);
      pdf.rect(MARGIN_X, footerY, CONTENT_W, 2, "F");
    }
  }
}

/**
 * Wrap paragraphs preserving list items.
 */
function wrapParagraph(
  doc: jsPDF,
  para: string,
  maxWidth: number,
): { lines: string[]; isListItem: boolean } {
  const listMatch = para.match(/^(\s*[-•]\s*|\s*\d+\.\s*)(.*)$/);
  if (listMatch) {
    const text = listMatch[2].trim();
    const wrapped = doc.splitTextToSize(text, maxWidth - 5);
    return { lines: wrapped, isListItem: true };
  }

  const trimmed = para.trim();
  const lines = doc.splitTextToSize(trimmed, maxWidth);
  return { lines, isListItem: false };
}

/**
 * Generate the Ficha Técnica de Facilitador PDF and return it as a Blob.
 */
export async function generateFichaTecnicaFacilitadorPdf(
  data: FichaTecnicaFacilitadorData,
): Promise<Blob> {
  const nombre = toTitleCase(data.nombre_apellido) || "Facilitador Sin Nombre";
  const cedula = data.cedula ? data.cedula.trim() : "";
  const titulo = data.titulo_profesional ? data.titulo_profesional.toUpperCase().trim() : "";

  const sections: { heading: string; content: string; icon: string }[] = [
    {
      heading: "Formación Académica",
      content: stripHtml(data.formacion_academica || ""),
      icon: "graduation_cap",
    },
    {
      heading: "Experiencia Laboral",
      content: stripHtml(data.experiencia_laboral || ""),
      icon: "briefcase",
    },
    {
      heading: "Competencias y Habilidades",
      content: stripHtml(data.competencias_habilidades || ""),
      icon: "award",
    },
  ].filter((s) => s.content.trim().length > 0);

  // Resolve photo data (if available)
  const photoData = await resolvePhotoData(data);

  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
  let currentPage = 1;
  doc.setPage(currentPage);

  // Content bottom limit above footer
  const contentBottomY = PAGE_H - 20;

  // 1. Draw Page 1 Header
  let y = drawPage1Header(doc, data);

  // 2. Executive Facilitator Hero Card
  const cardY = y;
  const cardH = 41;

  // Card Background
  doc.setFillColor(...COLOR_CARD_BG);
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN_X, cardY, CONTENT_W, cardH, 3, 3, "FD");

  // Left vertical accent stripe
  doc.setFillColor(...COLOR_NAVY);
  doc.roundedRect(MARGIN_X, cardY, 2.5, cardH, 1, 1, "F");

  // Profile Photo or Initials Monogram
  const photoSize = 31;
  const photoX = MARGIN_X + 6;
  const photoY = cardY + 5;

  // White framing box for photo
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(photoX - 0.7, photoY - 0.7, photoSize + 1.4, photoSize + 1.4, 2, 2, "FD");

  if (photoData) {
    try {
      doc.addImage(
        photoData.base64,
        photoData.format,
        photoX,
        photoY,
        photoSize,
        photoSize,
        undefined,
        "FAST",
      );
    } catch (err) {
      console.error("Photo embed failed:", err);
    }
  } else {
    // Elegant monogram circle avatar
    const centerX = photoX + photoSize / 2;
    const centerY = photoY + photoSize / 2;
    doc.setFillColor(...COLOR_NAVY);
    doc.circle(centerX, centerY, 13.5, "F");

    const initials = nombre
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(initials || "FT", centerX, centerY + 4.5, { align: "center" });
  }

  // Details block (right of photo)
  const infoX = photoX + photoSize + 7;
  const infoW = (MARGIN_X + CONTENT_W) - infoX - 4;

  let textY = cardY + 9;

  // Facilitator Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_TITLE);
  const nameLines = doc.splitTextToSize(nombre, infoW);
  for (const line of nameLines) {
    doc.text(line, infoX, textY);
    textY += 5.2;
  }

  // Professional Title
  if (titulo) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_NAVY);
    const titleLines = doc.splitTextToSize(titulo, infoW);
    for (const line of titleLines) {
      doc.text(line, infoX, textY);
      textY += 4.2;
    }
  }

  // Badges Row
  const badgeY = Math.max(textY + 1.5, cardY + cardH - 10);
  let currentBadgeX = infoX;

  if (cedula) {
    // Cédula Pill
    const cedulaText = `C.I. ${cedula}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const cedulaW = doc.getTextWidth(cedulaText) + 6;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(currentBadgeX, badgeY - 3.8, cedulaW, 5.2, 1.5, 1.5, "FD");

    doc.setTextColor(...COLOR_TEXT);
    doc.text(cedulaText, currentBadgeX + 3, badgeY);

    currentBadgeX += cedulaW + 3;
  }

  // Certified Facilitator Pill
  const certText = "• FACILITADOR CERTIFICADO";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  const certW = doc.getTextWidth(certText) + 6;

  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.setLineWidth(0.25);
  doc.roundedRect(currentBadgeX, badgeY - 3.8, certW, 5.2, 1.5, 1.5, "FD");

  doc.setTextColor(...COLOR_EMERALD);
  doc.text(certText, currentBadgeX + 3, badgeY);

  // Position for sections below the card
  y = cardY + cardH + 7;

  // 3. Content Sections
  const iconSize = 7.5;
  const contentIndentX = MARGIN_X + iconSize + 3.5;
  const contentW = CONTENT_W - (iconSize + 3.5);

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const paraTexts = sec.content.split("\n").filter((p) => p.trim());
    if (paraTexts.length === 0) continue;

    // Check space for heading + 2 lines
    const minSpace = 16;
    if (y + minSpace > contentBottomY) {
      doc.addPage();
      currentPage++;
      doc.setPage(currentPage);
      y = drawRunningHeader(doc, nombre);
    }

    // A. Section Heading with Badge Icon
    const badgeData = await getBadgeIcon(sec.icon);
    if (badgeData) {
      try {
        doc.addImage(
          badgeData.base64,
          badgeData.format,
          MARGIN_X,
          y - 1,
          iconSize,
          iconSize,
          undefined,
          "FAST",
        );
      } catch (err) {
        console.error("Icon embed failed:", err);
      }
    }

    // Heading Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_NAVY);
    const headingText = sec.heading.toUpperCase();
    doc.text(headingText, contentIndentX, y + 4.2);

    // Elegant horizontal accent hairline
    const textWidth = doc.getTextWidth(headingText);
    const lineStartX = contentIndentX + textWidth + 3.5;
    const lineEndX = MARGIN_X + CONTENT_W;
    if (lineEndX > lineStartX) {
      doc.setDrawColor(...COLOR_BORDER);
      doc.setLineWidth(0.3);
      doc.line(lineStartX, y + 3.5, lineEndX, y + 3.5);
    }

    y += iconSize + 3;

    // B. Section Content Lines
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_SIZE_PT);
    doc.setTextColor(...COLOR_TEXT);

    for (const para of paraTexts) {
      const { lines: wrapped, isListItem } = wrapParagraph(doc, para, contentW);

      for (let li = 0; li < wrapped.length; li++) {
        const line = wrapped[li];

        if (y > contentBottomY) {
          doc.addPage();
          currentPage++;
          doc.setPage(currentPage);
          y = drawRunningHeader(doc, nombre);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(FONT_SIZE_PT);
          doc.setTextColor(...COLOR_TEXT);
        }

        if (isListItem) {
          if (li === 0) {
            // Draw clean emerald bullet dot
            doc.setFillColor(...COLOR_EMERALD);
            doc.circle(contentIndentX + 1.2, y - 1.2, 0.65, "F");
          }
          doc.text(line, contentIndentX + 4.2, y);
        } else {
          doc.text(line, contentIndentX, y);
        }

        y += LINE_HEIGHT;
      }
      y += 1.2; // paragraph spacing
    }

    y += SECTION_GAP;
  }

  // 4. Final Pass: Draw Footers and Page Numbers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageFooter(doc, p, totalPages);
  }

  return doc.output("blob");
}
