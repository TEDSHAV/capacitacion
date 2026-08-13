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

const PRIMARY_BLUE = "#0c3f69";

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
  let text: string;

  if (isParticipacion) {
    text =
      "El curso conduce a una certificación de participación. " +
      "Todos los participantes que asistan recibirán su certificado.";
  } else {
    text =
      `El curso conduce a una certificación de aprobación. ` +
      `Nota aprobatoria: ${data.nota_aprobatoria}/20. ` +
      `Los participantes deben aprobar el examen para obtener el certificado.`;
  }

  if (data.emite_carnet) {
    text += " El curso emite carnet además del certificado.";
  }

  return text;
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
    ? `<img src="${logoDataUri}" style="height: 1.6cm; width: auto; object-fit: contain;" />`
    : "";

  return `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      height: 2.2cm;
      padding: 0.3cm 2cm 0 2cm;
      font-family: Arial, Helvetica, sans-serif;
      box-sizing: border-box;
    ">
      <div style="display: flex; align-items: center;">
        ${logoHtml}
      </div>
      <div style="text-align: right; font-size: 9pt; color: #6b7280; line-height: 1.5;">
        <div style="font-weight: bold; color: ${PRIMARY_BLUE}; font-size: 10pt;">${escapeHtml(courseCode)}</div>
        <div>Rev. 1</div>
        <div>Fecha: ${escapeHtml(fecha)}</div>
      </div>
    </div>
  `;
}

/**
 * Build the footer template for puppeteer's displayHeaderFooter.
 * Renders on every page. Uses <span class="pageNumber"></span> and
 * <span class="totalPages"></span> which puppeteer replaces automatically.
 */
export function buildFichaTecnicaFooterTemplate(): string {
  const footerDataUri = loadImageDataUri("footer-ficha-tecnica.jpg");

  const footerImgHtml = footerDataUri
    ? `<img src="${footerDataUri}" style="height: 1.2cm; width: auto; object-fit: contain;" />`
    : "";

  return `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      width: 100%;
      height: 1.7cm;
      padding: 0 2cm 0.3cm 2cm;
      font-family: Arial, Helvetica, sans-serif;
      box-sizing: border-box;
    ">
      <div style="display: flex; align-items: center;">
        ${footerImgHtml}
      </div>
      <div style="font-size: 9pt; color: #6b7280;">
        Página <span class="pageNumber"></span> de <span class="totalPages"></span>
      </div>
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
      font-size: 11pt;
      color: #1f2937;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    .title-block {
      border-bottom: 3px solid ${PRIMARY_BLUE};
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    h1.course-title {
      font-size: 16pt;
      font-weight: bold;
      color: ${PRIMARY_BLUE};
      margin: 0;
      text-transform: uppercase;
      line-height: 1.3;
    }
    .course-subtitle {
      font-size: 11pt;
      color: #4b5563;
      margin-top: 4px;
    }
    .section {
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    .section h2 {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      color: ${PRIMARY_BLUE};
      margin: 0 0 6px 0;
      padding-bottom: 4px;
      border-bottom: 1px solid #d1d5db;
      letter-spacing: 0.5px;
    }
    .section-content {
      font-size: 11pt;
      line-height: 1.65;
      text-align: justify;
    }
    .section-content p {
      margin: 0 0 8px 0;
    }
    .section-content ul,
    .section-content ol {
      margin: 0 0 8px 0;
      padding-left: 22px;
    }
    .section-content li {
      margin-bottom: 4px;
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
