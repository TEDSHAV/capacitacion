/**
 * Ficha Técnica PDF generator.
 *
 * Builds the body HTML + header/footer templates for puppeteer's
 * displayHeaderFooter mode, replicating the FT-CO-XXX document layout.
 *
 * Rich-text fields (objetivo_general, objetivo_especifico, contenido_curso)
 * are TipTap HTML rendered directly with CSS so lists, bold, etc. are preserved.
 */

import fs from "fs";
import path from "path";

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

const BLACK = "#000000";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function section(heading: string, contentHtml: string): string {
  return `
    <div class="section">
      <h2>${escapeHtml(heading)}</h2>
      <div class="section-content">${contentHtml}</div>
    </div>
  `;
}

function richContent(html: string | null, fallback: string): string {
  if (!html || !html.trim()) return `<p class="empty">${escapeHtml(fallback)}</p>`;
  return html;
}

function plainContent(text: string | null, fallback: string): string {
  if (!text || !text.trim()) return `<p class="empty">${escapeHtml(fallback)}</p>`;
  return `<p>${escapeHtml(text)}</p>`;
}

/**
 * Read an image from the public folder and return a base64 data URI.
 * Returns null if the file doesn't exist.
 */
function loadImageDataUri(filename: string): string | null {
  try {
    const filePath = path.join(process.cwd(), "public", filename);
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase().slice(1);
    const mime = ext === "jpg" ? "jpeg" : ext;
    return `data:image/${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Build the header template for puppeteer's displayHeaderFooter.
 * This renders on every page. Must be self-contained with inline styles.
 * Available template variables: date, title, url, pageNumber, totalPages
 */
export function buildFichaTecnicaHeaderTemplate(data: FichaTecnicaData): string {
  const courseCode = `FT-CO-${padCourseCode(data.cursoId)}`;
  const fecha = formatDate(data.created_at);
  const logoDataUri = loadImageDataUri("logo.png");

  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" style="height: 1.1cm; width: auto; object-fit: contain;" />`
    : "";

  return `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
      height: 1.8cm;
      padding: 0.2cm 2cm 0 2cm;
      font-family: Arial, Helvetica, sans-serif;
      box-sizing: border-box;
    ">
      <div style="display: flex; align-items: flex-start;">
        ${logoHtml}
      </div>
      <div style="text-align: right; font-size: 9pt; color: ${BLACK}; line-height: 1.5;">
        <div style="font-weight: bold; color: ${BLACK}; font-size: 10pt;">${escapeHtml(courseCode)}</div>
        <div>Rev. 1</div>
        <div>Fecha: ${escapeHtml(fecha)}</div>
        <div>Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>
      </div>
    </div>
  `;
}

/**
 * Build the footer template for puppeteer's displayHeaderFooter.
 * Renders on every page. Full-width centered footer image.
 */
export function buildFichaTecnicaFooterTemplate(): string {
  const footerDataUri = loadImageDataUri("footer-ficha-tecnica.jpg");

  const footerImgHtml = footerDataUri
    ? `<img src="${footerDataUri}" style="width: 100%; height: auto; object-fit: contain;" />`
    : "";

  return `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      width: 100%;
      height: 2cm;
      padding: 0.3cm 2cm 0.2cm 2cm;
      font-family: Arial, Helvetica, sans-serif;
      box-sizing: border-box;
    ">
      ${footerImgHtml}
    </div>
  `;
}

/**
 * Build the body HTML (content only — no header/footer).
 * Header/footer are handled by puppeteer's displayHeaderFooter.
 */
export function buildFichaTecnicaHtml(data: FichaTecnicaData): string {
  const nombre = (data.nombre || "CURSO SIN NOMBRE").toUpperCase();
  const subtitulo = data.subtitulo
    ? escapeHtml(data.subtitulo.toUpperCase())
    : "";

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5pt;
      color: ${BLACK};
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    .title-block {
      padding-bottom: 8px;
      margin-top: 20px;
      margin-bottom: 12px;
      text-align: center;
    }
    h1.course-title {
      font-size: 15pt;
      font-weight: bold;
      color: ${BLACK};
      margin: 0;
      text-transform: uppercase;
      line-height: 1.3;
      text-align: center;
    }
    .course-subtitle {
      font-size: 10.5pt;
      color: #333333;
      margin-top: 4px;
      text-align: center;
    }
    .section {
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .section h2 {
      font-size: 10.5pt;
      font-weight: bold;
      text-transform: uppercase;
      color: ${BLACK};
      margin: 0 0 4px 0;
      padding-bottom: 3px;
      border-bottom: 1px solid #d1d5db;
      letter-spacing: 0.5px;
    }
    .section-content {
      font-size: 10.5pt;
      line-height: 1.5;
      text-align: justify;
    }
    .section-content p {
      margin: 0 0 6px 0;
    }
    .section-content ul,
    .section-content ol {
      margin: 0 0 6px 0;
      padding-left: 20px;
    }
    .section-content li {
      margin-bottom: 3px;
    }
    .section-content strong { font-weight: bold; }
    .section-content em { font-style: italic; }
    .section-content u { text-decoration: underline; }
    .empty {
      color: #9ca3af;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="title-block">
    <h1 class="course-title">${escapeHtml(nombre)}</h1>
    ${subtitulo ? `<div class="course-subtitle">${subtitulo}</div>` : ""}
  </div>

  ${section(
    "Objetivo del Curso",
    richContent(data.objetivo_general, "No definido."),
  )}

  ${section(
    "Objetivos Específicos",
    richContent(data.objetivo_especifico, "No definidos."),
  )}

  ${section("¿Para Quién Es?", plainContent(data.para_quien, "No definido."))}

  ${section(
    "Contenido",
    richContent(data.contenido_curso, "No definido."),
  )}

  ${section("Certificación", `<p>${escapeHtml(buildCertificacionText(data))}</p>`)}
</body>
</html>`;

  return html;
}
