/**
 * Ficha Técnica de Facilitador PDF generator (jsPDF-based).
 *
 * Generates the FT-F document using jsPDF directly — no puppeteer/Chrome
 * needed. Layout matches the reference PDF:
 *  - Full-width header banner image (public/header-ficha-tecnica-facilitador.jpg)
 *    at the top of every page (bleeds to page edges).
 *  - Profile photo top-LEFT (~30×30mm), with name/cédula/título to the RIGHT.
 *  - Three rich-text sections (Formación Académica, Experiencia Laboral,
 *    Competencias y Habilidades), each with a lucide icon to the left of the
 *    heading text.
 *  - Full-width footer image (public/footer-ficha-tecnica.jpg).
 *  - No document control metadata (FT-F code, Rev, Fecha, Página) — matches
 *    the reference PDF which has none.
 *
 * Rich-text fields are TipTap HTML converted to plain text via stripHtml()
 * with list indentation.
 *
 * Section icons are generated at runtime from lucide SVG path data → sharp
 * SVG→PNG → base64 → jsPDF addImage. Cached in a module-level Map.
 */

import jsPDF from "jspdf";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { stripHtml } from "./strip-html";

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
const MARGIN_X = 20;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const SECTION_GAP = 8;
const FONT_SIZE_PT = 10;
const HEADING_PT = 10;
const NAME_PT = 15;
const LINE_HEIGHT = 5.2;

// Header banner — full page width, computed height from aspect ratio
const HEADER_FILE = "header-ficha-tecnica-facilitador.jpg";
const FOOTER_FILE = "footer-ficha-tecnica.jpg";

// Section icon
const ICON_SIZE = 8; // mm square
const ICON_GAP = 4; // mm between icon right edge and heading text
const ICON_COLOR = "#0c3f69"; // brand dark blue

// X position where section titles and content start (to the right of the icon).
// The photo and all section content are left-aligned at this X so they line
// up with the section titles, keeping the icon column on the far left.
const CONTENT_INDENT_X = MARGIN_X + ICON_SIZE + ICON_GAP;

// Photo block — left-aligned with section titles
const PHOTO_SIZE = 30; // mm square
const PHOTO_X = CONTENT_INDENT_X;
const PHOTO_GAP = 6; // gap between photo right edge and name text
const NAME_X = PHOTO_X + PHOTO_SIZE + PHOTO_GAP;

// Content wrap width — reduced by the icon column indent
const CONTENT_WRAP_W = CONTENT_W - (CONTENT_INDENT_X - MARGIN_X);

const _imageCache = new Map<string, { base64: string; format: string }>();
const _iconCache = new Map<string, { base64: string; format: string }>();

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

/**
 * Compute the header banner height (mm) from its aspect ratio.
 * The banner spans the full page width (bleeds to edges).
 */
function getHeaderHeight(): number {
  const headerData = getImageBase64(HEADER_FILE);
  if (!headerData) return 0;
  try {
    const tempPdf = new jsPDF({ unit: "mm", format: "letter" });
    const props = tempPdf.getImageProperties(headerData.base64);
    return PAGE_W * (props.height / props.width);
  } catch {
    return 20; // fallback
  }
}

/**
 * Compute the Y where content should stop (above footer).
 */
function getContentBottomY(): number {
  const footerData = getImageBase64(FOOTER_FILE);
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
 * Draw the header banner — full page width, bleeds to the top edges.
 * Returns the Y position where content can begin.
 */
function drawHeader(pdf: jsPDF): number {
  const headerData = getImageBase64(HEADER_FILE);
  if (!headerData) return 30; // fallback: leave space for a missing header

  try {
    const props = pdf.getImageProperties(headerData.base64);
    const headerH = PAGE_W * (props.height / props.width);
    // Bleed to page edges (x=0, full page width)
    pdf.addImage(headerData.base64, headerData.format, 0, 0, PAGE_W, headerH, undefined, "FAST");
    return headerH + 6; // 6mm gap below header
  } catch {
    // Fallback: draw a simple rectangle
    pdf.setFillColor(12, 63, 105);
    pdf.rect(0, 0, PAGE_W, 20, "F");
    return 26;
  }
}

/**
 * Draw the footer image full content width.
 */
function drawFooter(pdf: jsPDF): void {
  const footerData = getImageBase64(FOOTER_FILE);
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
 * Lucide SVG path data for the 3 section icons.
 * Source: node_modules/lucide-react/dist/esm/icons/*.js
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
 * Generate a lucide icon as a PNG base64 data URL using sharp.
 * Cached in _iconCache after first generation.
 */
async function getLucideIcon(
  iconKey: string,
): Promise<{ base64: string; format: string } | null> {
  if (_iconCache.has(iconKey)) return _iconCache.get(iconKey)!;

  const paths = LUCIDE_ICONS[iconKey];
  if (!paths) return null;

  try {
    // Render at 96px (high enough for ~8mm at print resolution)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${ICON_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    const base64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;
    const result = { base64, format: "PNG" as const };
    _iconCache.set(iconKey, result);
    return result;
  } catch (err) {
    console.error(`getLucideIcon: failed to render ${iconKey}:`, err);
    return null;
  }
}

/**
 * Render a section heading with an icon to the left (top-aligned with the
 * heading text). No underline. Returns the Y position after the heading.
 */
async function drawSectionHeadingWithIcon(
  pdf: jsPDF,
  heading: string,
  iconKey: string,
  y: number,
): Promise<number> {
  // Draw the icon (left of heading text), top-aligned with the heading text.
  // jsPDF positions text at the baseline; the visual top of 10pt helvetica
  // caps is ~2.5mm above the baseline. Lucide SVGs have ~3/24 internal top
  // padding, so the icon's visible top is ~1mm below the image top edge.
  // Offset: text cap top (y - 2.5) minus icon internal padding (~1mm) = y - 3.5
  const iconY = y - 3.5;

  const iconData = await getLucideIcon(iconKey);
  if (iconData) {
    try {
      pdf.addImage(
        iconData.base64,
        iconData.format,
        MARGIN_X,
        iconY,
        ICON_SIZE,
        ICON_SIZE,
        undefined,
        "FAST",
      );
    } catch (err) {
      console.error(`drawSectionHeadingWithIcon: icon embed failed for ${iconKey}:`, err);
    }
  }

  // Draw heading text to the right of the icon (at CONTENT_INDENT_X)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(HEADING_PT);
  pdf.setTextColor(0, 0, 0);
  pdf.text(heading.toUpperCase(), CONTENT_INDENT_X, y);

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
  // The marker is prepended inline to the text (no extra indent) so the
  // text left-aligns with the section title at CONTENT_INDENT_X.
  const listMatch = para.match(/^    (- \s*|\d+\.\s*)(.*)$/);
  if (listMatch) {
    const marker = listMatch[1]; // Keep trailing space: "1. " or "- "
    const text = listMatch[2].trim();

    // Wrap the full "marker + text" as one unit at the full width.
    // Continuation lines get spaces to align after the marker.
    const markerW = doc.getTextWidth(marker);
    const firstLineWrapW = maxWidth - markerW;
    const wrapped = doc.splitTextToSize(text, firstLineWrapW);
    const lines = wrapped.map((l: string, i: number) =>
      i === 0 ? `${marker}${l}` : `${" ".repeat(marker.length)}${l}`,
    );
    return { lines, indent: 0 };
  }

  // Normal paragraph — no indent
  const trimmed = para.trim();
  const lines = doc.splitTextToSize(trimmed, maxWidth);
  return { lines, indent: 0 };
}

/**
 * Resolve the profile photo to a base64 data URL usable by jsPDF.addImage.
 * Priority: inline foto_base64 (preview) → fetch foto_perfil_url (storage).
 * Returns null if no photo is available or fetch fails.
 */
async function resolvePhotoData(
  data: FichaTecnicaFacilitadorData,
): Promise<{ base64: string; format: string } | null> {
  if (data.foto_base64) {
    // Already a data URL — detect format from the prefix
    const isJpeg = /^data:image\/jpe?g/i.test(data.foto_base64);
    return { base64: data.foto_base64, format: isJpeg ? "JPEG" : "PNG" };
  }

  if (!data.foto_perfil_url) return null;

  try {
    const res = await fetch(data.foto_perfil_url, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const isJpeg = data.foto_perfil_url.toLowerCase().endsWith(".jpg") ||
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
 * Generate the Ficha Técnica de Facilitador PDF and return it as a Blob.
 */
export async function generateFichaTecnicaFacilitadorPdf(
  data: FichaTecnicaFacilitadorData,
): Promise<Blob> {
  const contentBottomY = getContentBottomY();
  const headerBottomY = drawHeader; // placeholder, computed per-page below
  void headerBottomY; // (no meta block anymore)

  const nombre = (data.nombre_apellido || "FACILITADOR SIN NOMBRE").toUpperCase();
  const cedula = data.cedula || "";
  const titulo = data.titulo_profesional ? data.titulo_profesional.toUpperCase() : "";

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

  // Resolve the photo once (may be a remote fetch)
  const photoData = await resolvePhotoData(data);

  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });

  let currentPage = 1;
  doc.setPage(currentPage);

  // Header + footer on first page
  let y = drawHeader(doc);
  drawFooter(doc);

  // --- Photo (top-LEFT) + Name block (to the RIGHT, top-aligned with photo) ---
  const nameAreaW = (PAGE_W - MARGIN_X) - NAME_X; // from name start to right margin

  // Top of the photo/name block. jsPDF text is positioned at the baseline;
  // for 15pt helvetica the cap height is ~3.7mm above the baseline. To
  // top-align the name text with the photo, place the photo top at blockTopY
  // and the first name baseline at blockTopY + 3.7.
  const blockTopY = y + 2;
  const photoY = blockTopY;

  let nameY = blockTopY + 3.7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(NAME_PT);
  doc.setTextColor(0, 0, 0);
  const nameLines = doc.splitTextToSize(nombre, nameAreaW);
  for (const line of nameLines) {
    doc.text(line, NAME_X, nameY);
    nameY += 7;
  }

  if (cedula) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FONT_SIZE_PT);
    doc.setTextColor(0, 0, 0);
    doc.text(cedula, NAME_X, nameY);
    nameY += 5;
  }

  if (titulo) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FONT_SIZE_PT);
    doc.setTextColor(0, 0, 0);
    const tituloLines = doc.splitTextToSize(titulo, nameAreaW);
    for (const line of tituloLines) {
      doc.text(line, NAME_X, nameY);
      nameY += 5;
    }
  }

  // Draw the photo (top-LEFT, cover-fit square).
  if (photoData) {
    try {
      doc.addImage(
        photoData.base64,
        photoData.format,
        PHOTO_X,
        photoY,
        PHOTO_SIZE,
        PHOTO_SIZE,
        undefined,
        "FAST",
      );
      // Thin border around the photo
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.3);
      doc.rect(PHOTO_X, photoY, PHOTO_SIZE, PHOTO_SIZE);
    } catch (err) {
      console.error("generateFichaTecnicaFacilitadorPdf: photo embed failed:", err);
    }
  }

  // Ensure y is below both the name block and the photo, with extra margin
  // before the first section so it's not too close to the profile pic.
  const belowPhoto = photoY + PHOTO_SIZE + 10;
  const belowName = nameY + 6;
  y = Math.max(belowName, belowPhoto);

  // --- Sections ---
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];

    // Pre-measure section height for page break decision.
    // Only require room for the heading + a couple of lines — the per-line
    // page break in the content loop below handles the rest. This avoids
    // pushing an entire section to the next page when part of it would fit.
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_SIZE_PT);
    const paraTexts = sec.content.split("\n").filter((p) => p.trim());
    const minSpaceForHeading = 5 + 2 * (LINE_HEIGHT + 1.5); // heading + 2 lines

    // If there's not even room for the heading + 2 lines, break to next page
    if (y + minSpaceForHeading > contentBottomY && y > getHeaderHeight() + 10) {
      doc.addPage();
      currentPage++;
      doc.setPage(currentPage);
      y = drawHeader(doc);
      drawFooter(doc);
      y = y + 5;
    }

    // Draw heading with icon
    y = await drawSectionHeadingWithIcon(doc, sec.heading, sec.icon, y);

    // Draw content line by line with page break support
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_SIZE_PT);
    doc.setTextColor(0, 0, 0);

    for (const para of paraTexts) {
      const { lines: wrapped, indent } = wrapParagraph(doc, para, CONTENT_WRAP_W);
      const textX = CONTENT_INDENT_X + indent;

      for (const line of wrapped) {
        if (y > contentBottomY) {
          doc.addPage();
          currentPage++;
          doc.setPage(currentPage);
          y = drawHeader(doc);
          drawFooter(doc);
          y = y + 5;
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

  return doc.output("blob");
}
