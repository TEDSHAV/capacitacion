/**
 * Survey Tabulation PDF generator ("Resultado de la Actividad").
 *
 * Generates the printable tabulation report that aggregates all
 * course_satisfaction_surveys for an OSI into the weighted section
 * breakdown defined by the reference PDF (Rev.04).
 *
 * Layout (Legal, portrait, 612×1008 pt) — matches reference PDF:
 *  - Header: logo left, title center, "Anexo / Rev.04 / Fecha" right
 *  - OSI info grid (Facilitador, OSI, Curso, Cliente, Ejecutivo, Fecha)
 *  - ISO 9001:2015 boilerplate paragraph
 *  - Two-column layout:
 *    Left:  data tables with colored rows (gray sub-headers, blue TOTAL,
 *           peach section headers, blue Excelente in Resultados, yellow
 *           TOTAL PARTICIPANTES)
 *    Right: vertical bar charts per section + horizontal bar chart for
 *           Motivación, with % labels above and level labels below
 *  - Observaciones
 *  - Footer image (public/docs_footer.png), centered
 *
 * Uses jsPDF directly — no puppeteer/Chrome needed.
 */

import jsPDF from "jspdf";
import fs from "fs";
import path from "path";
import { SurveyTabulacionData } from "@/types";

// ─── Page geometry (Legal, points) ────────────────────────────────────────────
const PAGE_W = 612;
const PAGE_H = 1008;
const MARGIN_LEFT = 18;
const MARGIN_RIGHT = 586; // right edge of content
const CONTENT_W = MARGIN_RIGHT - MARGIN_LEFT; // 568

// Two-column layout
const LEFT_COL_X = 18;
const LEFT_COL_W = 225; // x=18 to x=243
const RIGHT_COL_X = 243;
const RIGHT_COL_W = 342; // x=243 to x=585

// ─── Colors (from reference PDF) ──────────────────────────────────────────────
const COLOR_BLUE = [0, 111, 192];       // #006FC0 — TOTAL rows, bars
const COLOR_LIGHT_BLUE = [91, 155, 212]; // #5B9BD4 — Resultados bars
const COLOR_ORANGE = [255, 192, 0];     // #FFC000 — Muy Bueno accent
const COLOR_YELLOW = [255, 255, 0];     // #FFFF00 — TOTAL PARTICIPANTES
const COLOR_PEACH = [248, 202, 172];    // #F8CAAC — section headers
const COLOR_GRAY = [190, 191, 190];     // #BEBFBE — sub-section labels
const COLOR_WHITE = [255, 255, 255];
const COLOR_BLACK = [0, 0, 0];

// ─── Level definitions ────────────────────────────────────────────────────────
const LEVELS = [
  { value: 5, label: "Excelente" },
  { value: 4, label: "Muy Bueno" },
  { value: 3, label: "Bueno" },
  { value: 2, label: "Poco Aceptable" },
  { value: 1, label: "Malo" },
];

const ATTENDANCE_REASONS = [
  "Requerimiento de la empresa",
  "Crecimiento laboral",
  "Desarrollo Personal",
];

// ─── Image cache ──────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(2).replace(".", ",")}%`;
}

function setFill(doc: jsPDF, c: number[]) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setText(doc: jsPDF, c: number[]) {
  doc.setTextColor(c[0], c[1], c[2]);
}

/**
 * Draw a filled rectangle with optional border.
 */
function fillRect(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  fill: number[] | null,
  border = false,
) {
  if (fill) {
    setFill(doc, fill);
    if (border) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(x, y, w, h, "FD");
    } else {
      doc.rect(x, y, w, h, "F");
    }
  } else if (border) {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h);
  }
}

/**
 * Draw a horizontal line.
 */
function hLine(doc: jsPDF, x1: number, x2: number, y: number) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
}

/**
 * Draw a vertical line.
 */
function vLine(doc: jsPDF, x: number, y1: number, y2: number) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(x, y1, x, y2);
}

// ─── Header ───────────────────────────────────────────────────────────────────
/**
 * Draw the document header: logo left, title center, metadata right.
 * No border box — just a horizontal line at the bottom.
 * Returns Y where content can begin.
 */
function drawHeader(doc: jsPDF): number {
  const top = 22;
  const bottom = 64;

  // Logo (left)
  const logoData = getImageBase64("logo.png");
  if (logoData) {
    try {
      const props = doc.getImageProperties(logoData.base64);
      const logoH = 32;
      const logoW = logoH * (props.width / props.height);
      doc.addImage(logoData.base64, logoData.format, 18, top, logoW, logoH, undefined, "FAST");
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setText(doc, COLOR_BLUE);
      doc.text("SHA DE VENEZUELA, C.A.", 18, top + 16);
    }
  }

  // Title (center)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setText(doc, COLOR_BLACK);
  doc.text("Tabulación de Encuestas", PAGE_W / 2, top + 6, { align: "center" });
  doc.text("Aplicada a los Participantes", PAGE_W / 2, top + 22, { align: "center" });

  // Metadata (right)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(doc, COLOR_BLACK);
  doc.text("Anexo", MARGIN_RIGHT, top, { align: "right" });
  doc.text("Rev.04", MARGIN_RIGHT, top + 10, { align: "right" });
  doc.text("Fecha de actualización: 03/06/2024", MARGIN_RIGHT, top + 20, { align: "right" });

  // Horizontal line below header
  hLine(doc, MARGIN_LEFT, MARGIN_RIGHT, bottom);

  return bottom + 4;
}

// ─── OSI Info Grid ────────────────────────────────────────────────────────────
/**
 * Draw the OSI info grid: 4 rows with gray label cells and white value cells.
 * Row 1: Nombre del | <facilitador> | OSI | <nro_osi>
 * Row 2: Nombre del curso | <curso>
 * Row 3: Cliente | <cliente>
 * Row 4: Ejecutivo de Negocios | <ejecutivo> | Fecha: | <fecha>
 */
function drawOsiInfo(doc: jsPDF, data: SurveyTabulacionData, y: number): number {
  const col1W = 108; // label column 1
  const col2W = 108; // value column 1
  const col3W = 108; // label column 2 (OSI / Fecha:)
  const col4W = CONTENT_W - col1W - col2W - col3W; // value column 2
  const rowH = 20;
  const gridH = rowH * 4;

  // Outer border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(MARGIN_LEFT, y, CONTENT_W, gridH);

  // Row dividers
  for (let i = 1; i < 4; i++) {
    hLine(doc, MARGIN_LEFT, MARGIN_RIGHT, y + rowH * i);
  }

  // Column dividers (vary per row)
  // Row 1: label | value | label | value
  vLine(doc, MARGIN_LEFT + col1W, y, y + rowH);
  vLine(doc, MARGIN_LEFT + col1W + col2W, y, y + rowH);
  vLine(doc, MARGIN_LEFT + col1W + col2W + col3W, y, y + rowH);

  // Row 2: label | value (value spans rest)
  vLine(doc, MARGIN_LEFT + col1W, y + rowH, y + rowH * 2);

  // Row 3: label | value (value spans rest)
  vLine(doc, MARGIN_LEFT + col1W, y + rowH * 2, y + rowH * 3);

  // Row 4: label | value | label | value
  vLine(doc, MARGIN_LEFT + col1W, y + rowH * 3, y + rowH * 4);
  vLine(doc, MARGIN_LEFT + col1W + col2W, y + rowH * 3, y + rowH * 4);
  vLine(doc, MARGIN_LEFT + col1W + col2W + col3W, y + rowH * 3, y + rowH * 4);

  // Fill label cells with gray
  fillRect(doc, MARGIN_LEFT, y, col1W, rowH, COLOR_GRAY);
  fillRect(doc, MARGIN_LEFT + col1W + col2W, y, col3W, rowH, COLOR_GRAY);
  fillRect(doc, MARGIN_LEFT, y + rowH, col1W, rowH, COLOR_GRAY);
  fillRect(doc, MARGIN_LEFT, y + rowH * 2, col1W, rowH, COLOR_GRAY);
  fillRect(doc, MARGIN_LEFT, y + rowH * 3, col1W, rowH, COLOR_GRAY);
  fillRect(doc, MARGIN_LEFT + col1W + col2W, y + rowH * 3, col3W, rowH, COLOR_GRAY);

  // Re-draw column dividers over fills
  vLine(doc, MARGIN_LEFT + col1W, y, y + rowH * 4);
  vLine(doc, MARGIN_LEFT + col1W + col2W, y, y + rowH);
  vLine(doc, MARGIN_LEFT + col1W + col2W + col3W, y, y + rowH);
  vLine(doc, MARGIN_LEFT + col1W + col2W, y + rowH * 3, y + rowH * 4);
  vLine(doc, MARGIN_LEFT + col1W + col2W + col3W, y + rowH * 3, y + rowH * 4);

  // Text
  doc.setFontSize(10);
  const mid = (row: number) => y + rowH * row + rowH / 2;

  // Row 1
  doc.setFont("helvetica", "bold");
  setText(doc, COLOR_BLACK);
  doc.text("Nombre del", MARGIN_LEFT + 4, mid(0) - 2, { baseline: "middle" });
  doc.text("Facilitador", MARGIN_LEFT + 4, mid(0) + 5, { baseline: "middle" });
  doc.setFont("helvetica", "normal");
  doc.text(data.facilitador_nombre || "—", MARGIN_LEFT + col1W + 4, mid(0), { baseline: "middle" });
  doc.setFont("helvetica", "bold");
  doc.text("OSI", MARGIN_LEFT + col1W + col2W + 4, mid(0), { baseline: "middle" });
  doc.setFont("helvetica", "normal");
  doc.text(data.nro_osi, MARGIN_LEFT + col1W + col2W + col3W + 4, mid(0), { baseline: "middle" });

  // Row 2
  doc.setFont("helvetica", "bold");
  doc.text("Nombre del curso", MARGIN_LEFT + 4, mid(1), { baseline: "middle" });
  doc.setFont("helvetica", "normal");
  doc.text(data.servicio || "—", MARGIN_LEFT + col1W + 4, mid(1), { baseline: "middle" });

  // Row 3
  doc.setFont("helvetica", "bold");
  doc.text("Cliente", MARGIN_LEFT + 4, mid(2), { baseline: "middle" });
  doc.setFont("helvetica", "normal");
  doc.text(data.nombre_empresa || "—", MARGIN_LEFT + col1W + 4, mid(2), { baseline: "middle" });

  // Row 4
  doc.setFont("helvetica", "bold");
  doc.text("Ejecutivo de", MARGIN_LEFT + 4, mid(3) - 2, { baseline: "middle" });
  doc.text("Negocios", MARGIN_LEFT + 4, mid(3) + 5, { baseline: "middle" });
  doc.setFont("helvetica", "normal");
  doc.text(data.ejecutivo_negocios || "—", MARGIN_LEFT + col1W + 4, mid(3), { baseline: "middle" });
  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", MARGIN_LEFT + col1W + col2W + 4, mid(3), { baseline: "middle" });
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(data.fecha_inicio_real), MARGIN_LEFT + col1W + col2W + col3W + 4, mid(3), { baseline: "middle" });

  return y + gridH + 4;
}

// ─── ISO Paragraph ────────────────────────────────────────────────────────────
function drawIsoParagraph(doc: jsPDF, y: number): number {
  const text =
    "De acuerdo a lo establecido en la NORMA ISO 9001:2015, en su apartado 9. " +
    "Evaluación del Desempeño, cláusula 9.1.3 Análisis y Evaluación, SHA DE " +
    "VENEZUELA, C.A. ha utilizado la metodología Kirkpatrick para el desarrollo " +
    "de esta encuesta, con el propósito de hacer que la capacitación sea " +
    "flexible, dinámica y satisfactoria para los participantes, de modo que " +
    "logren aplicar nuevos conocimientos y habilidades de la manera más efectiva " +
    "posible. A continuación se presentan los resultados arrojados para su " +
    "conocimiento.";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, COLOR_BLACK);
  const wrapped = doc.splitTextToSize(text, CONTENT_W);
  const lineH = 12; // explicit line height for 9pt font
  // Draw each line manually with baseline:top so text starts at y, not above it
  for (let i = 0; i < wrapped.length; i++) {
    doc.text(wrapped[i], MARGIN_LEFT, y + i * lineH, { baseline: "top" });
  }
  return y + wrapped.length * lineH + 8;
}

// ─── Section Header Bar ───────────────────────────────────────────────────────
function drawSectionHeader(doc: jsPDF, text: string, y: number, h = 17): number {
  fillRect(doc, MARGIN_LEFT, y, CONTENT_W, h, COLOR_PEACH);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN_LEFT, y, CONTENT_W, h);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText(doc, COLOR_BLACK);
  doc.text(text, MARGIN_LEFT + CONTENT_W / 2, y + h / 2, { align: "center", baseline: "middle" });
  return y + h;
}

// ─── Section Data Table (left column) ─────────────────────────────────────────
/**
 * Draw a weighted section sub-table in the left column.
 *   Sub-header (gray): label
 *   Header row: Nivel | Total | Total (%)
 *   5 level rows
 *   TOTAL row (blue)
 * Returns Y after the table.
 */
function drawSectionTable(
  doc: jsPDF,
  section: { label: string; weight: number; distributions: { [level: number]: number }; total: number },
  y: number,
  colX: number,
  colW: number,
): number {
  const nivelW = colW * 0.44;
  const totalW = colW * 0.28;
  const pctW = colW * 0.28;
  const subH = 15;
  const headerH = 14;
  const rowH = 15;

  // Sub-section label (gray)
  fillRect(doc, colX, y, colW, subH, COLOR_GRAY);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(colX, y, colW, subH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(doc, COLOR_BLACK);
  doc.text(section.label, colX + 3, y + subH / 2, { baseline: "middle" });
  y += subH;

  // Header row
  doc.rect(colX, y, colW, headerH);
  vLine(doc, colX + nivelW, y, y + headerH);
  vLine(doc, colX + nivelW + totalW, y, y + headerH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Nivel", colX + 3, y + headerH / 2, { baseline: "middle" });
  doc.text("Total", colX + nivelW + totalW / 2, y + headerH / 2, { align: "center", baseline: "middle" });
  doc.text("Total (%)", colX + nivelW + totalW + pctW / 2, y + headerH / 2, { align: "center", baseline: "middle" });
  y += headerH;

  // Data rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  for (const lvl of LEVELS) {
    const count = section.distributions[lvl.value] || 0;
    const pct = section.total > 0 ? (count * section.weight) / section.total : 0;

    doc.rect(colX, y, colW, rowH);
    vLine(doc, colX + nivelW, y, y + rowH);
    vLine(doc, colX + nivelW + totalW, y, y + rowH);
    doc.text(lvl.label, colX + 3, y + rowH / 2, { baseline: "middle" });
    doc.text(String(count), colX + nivelW + totalW / 2, y + rowH / 2, { align: "center", baseline: "middle" });
    doc.text(formatPct(pct), colX + nivelW + totalW + pctW / 2, y + rowH / 2, { align: "center", baseline: "middle" });
    y += rowH;
  }

  // TOTAL row (blue)
  fillRect(doc, colX, y, colW, rowH, COLOR_BLUE);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(colX, y, colW, rowH);
  vLine(doc, colX + nivelW, y, y + rowH);
  vLine(doc, colX + nivelW + totalW, y, y + rowH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setText(doc, COLOR_WHITE);
  doc.text("TOTAL", colX + 3, y + rowH / 2, { baseline: "middle" });
  doc.text(String(section.total), colX + nivelW + totalW / 2, y + rowH / 2, { align: "center", baseline: "middle" });
  doc.text(formatPct(section.total > 0 ? section.weight : 0), colX + nivelW + totalW + pctW / 2, y + rowH / 2, { align: "center", baseline: "middle" });
  setText(doc, COLOR_BLACK);
  y += rowH;

  return y;
}

// ─── Vertical Bar Chart (right column) ────────────────────────────────────────
/**
 * Draw a vertical bar chart for a section in the right column.
 * Each level gets a column with:
 *   - % label above the bar
 *   - Vertical bar (height proportional to pct)
 *   - Level label below
 */
function drawSectionChart(
  doc: jsPDF,
  title: string,
  section: { weight: number; distributions: { [level: number]: number }; total: number },
  yTop: number,
  yBottom: number,
  barColor: number[] = COLOR_BLUE,
): void {
  const chartX = RIGHT_COL_X;
  const chartW = RIGHT_COL_W;
  const chartH = yBottom - yTop;

  // White background
  fillRect(doc, chartX, yTop, chartW, chartH, COLOR_WHITE);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(chartX, yTop, chartW, chartH);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(doc, COLOR_BLACK);
  doc.text(title, chartX + chartW / 2, yTop + 14, { align: "center", baseline: "middle" });

  // Chart area dimensions
  const titleH = 28;
  const labelH = 24; // bottom level labels (needs room for "Poco Aceptable" 2 lines)
  const pctLabelH = 12; // top % labels
  const barAreaTop = yTop + titleH + pctLabelH;
  const barAreaBottom = yBottom - labelH;
  const barAreaH = barAreaBottom - barAreaTop;
  const maxBarH = barAreaH;

  // 5 columns
  const colW = chartW / 5;
  const barW = colW * 0.6;
  const barGap = (colW - barW) / 2;

  // Max reference for scaling: use the weight as the max possible
  const maxRef = section.weight;

  for (let i = 0; i < LEVELS.length; i++) {
    const lvl = LEVELS[i];
    const count = section.distributions[lvl.value] || 0;
    const pct = section.total > 0 ? (count * section.weight) / section.total : 0;
    const barH = maxRef > 0 ? (pct / maxRef) * maxBarH : 0;

    const colX = chartX + i * colW;
    const barX = colX + barGap;
    const barY = barAreaBottom - barH;

    // % label above bar
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, COLOR_BLACK);
    doc.text(formatPct(pct), colX + colW / 2, barAreaTop - 2, { align: "center", baseline: "bottom" });

    // Bar
    if (barH > 0.5) {
      fillRect(doc, barX, barY, barW, barH, barColor);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(barX, barY, barW, barH);
    }

    // Level label below — centered in the label area at the bottom
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setText(doc, COLOR_BLACK);
    const labelCenterY = yBottom - labelH / 2;
    if (lvl.label === "Poco Aceptable") {
      doc.text("Poco", colX + colW / 2, labelCenterY - 4, { align: "center", baseline: "middle" });
      doc.text("Aceptable", colX + colW / 2, labelCenterY + 4, { align: "center", baseline: "middle" });
    } else {
      doc.text(lvl.label, colX + colW / 2, labelCenterY, { align: "center", baseline: "middle" });
    }
  }
}

// ─── Resultados del Servicio (left column) ────────────────────────────────────
/**
 * Draw the Resultados del servicio table in the left column.
 *   Orange header: "Resultados del servicio"
 *   Header: PONDERACIONES | %
 *   5 level rows (Excelente in blue with white text)
 *   TOTAL PARTICIPANTES row (yellow)
 */
function drawResultadosTable(
  doc: jsPDF,
  data: SurveyTabulacionData,
  y: number,
  colX: number,
  colW: number,
): number {
  const nivelW = colW * 0.6;
  const pctW = colW * 0.4;
  const headerH = 14;
  const rowH = 15;

  // Orange sub-header
  fillRect(doc, colX, y, colW, headerH, COLOR_ORANGE);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(colX, y, colW, headerH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(doc, COLOR_BLACK);
  doc.text("Resultados del servicio", colX + 3, y + headerH / 2, { baseline: "middle" });
  y += headerH;

  // PONDERACIONES header
  doc.rect(colX, y, colW, headerH);
  vLine(doc, colX + nivelW, y, y + headerH);
  doc.text("PONDERACIONES", colX + 3, y + headerH / 2, { baseline: "middle" });
  doc.text("%", colX + nivelW + pctW / 2, y + headerH / 2, { align: "center", baseline: "middle" });
  y += headerH;

  // Level rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  for (const lvl of LEVELS) {
    const pct = data.resultados_servicio[lvl.value] || 0;
    const isExcelente = lvl.value === 5;

    if (isExcelente) {
      fillRect(doc, colX, y, colW, rowH, COLOR_BLUE);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(colX, y, colW, rowH);
      vLine(doc, colX + nivelW, y, y + rowH);
      setText(doc, COLOR_WHITE);
    } else {
      doc.rect(colX, y, colW, rowH);
      vLine(doc, colX + nivelW, y, y + rowH);
      setText(doc, COLOR_BLACK);
    }

    doc.text(lvl.label, colX + 3, y + rowH / 2, { baseline: "middle" });
    doc.text(formatPct(pct), colX + nivelW + pctW / 2, y + rowH / 2, { align: "center", baseline: "middle" });
    y += rowH;
  }

  // TOTAL PARTICIPANTES row (yellow)
  const totalRowH = 29;
  fillRect(doc, colX, y, colW, totalRowH, COLOR_YELLOW);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(colX, y, colW, totalRowH);
  vLine(doc, colX + nivelW, y, y + totalRowH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setText(doc, COLOR_BLACK);
  doc.text("TOTAL", colX + 3, y + totalRowH / 2 - 4, { baseline: "middle" });
  doc.text("PARTICIPANTES", colX + 3, y + totalRowH / 2 + 4, { baseline: "middle" });
  doc.text(String(data.total_participantes), colX + nivelW + pctW / 2, y + totalRowH / 2, { align: "center", baseline: "middle" });
  setText(doc, COLOR_BLACK);
  y += totalRowH;

  return y;
}

// ─── Resultados Chart (right column) ──────────────────────────────────────────
/**
 * Draw a vertical bar chart for Resultados del servicio.
 * Uses lighter blue bars and scales to 100% max.
 */
function drawResultadosChart(
  doc: jsPDF,
  data: SurveyTabulacionData,
  yTop: number,
  yBottom: number,
): void {
  const chartX = RIGHT_COL_X;
  const chartW = RIGHT_COL_W;
  const chartH = yBottom - yTop;

  // White background
  fillRect(doc, chartX, yTop, chartW, chartH, COLOR_WHITE);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(chartX, yTop, chartW, chartH);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(doc, COLOR_BLACK);
  doc.text("RESULTADOS DEL SERVICIO", chartX + chartW / 2, yTop + 14, { align: "center", baseline: "middle" });

  const titleH = 28;
  const labelH = 24;
  const pctLabelH = 12;
  const barAreaTop = yTop + titleH + pctLabelH;
  const barAreaBottom = yBottom - labelH;
  const barAreaH = barAreaBottom - barAreaTop;
  const maxBarH = barAreaH;

  const colW = chartW / 5;
  const barW = colW * 0.5;
  const barGap = (colW - barW) / 2;
  const maxRef = 1.0; // 100% max for Resultados

  for (let i = 0; i < LEVELS.length; i++) {
    const lvl = LEVELS[i];
    const pct = data.resultados_servicio[lvl.value] || 0;
    const barH = (pct / maxRef) * maxBarH;

    const colX = chartX + i * colW;
    const barX = colX + barGap;
    const barY = barAreaBottom - barH;

    // % label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, COLOR_BLACK);
    doc.text(formatPct(pct), colX + colW / 2, barAreaTop - 2, { align: "center", baseline: "bottom" });

    // Bar
    if (barH > 0.5) {
      fillRect(doc, barX, barY, barW, barH, COLOR_LIGHT_BLUE);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(barX, barY, barW, barH);
    }

    // Level label — centered in the label area
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setText(doc, COLOR_BLACK);
    const labelCenterY = yBottom - labelH / 2;
    if (lvl.label === "Poco Aceptable") {
      doc.text("Poco", colX + colW / 2, labelCenterY - 4, { align: "center", baseline: "middle" });
      doc.text("Aceptable", colX + colW / 2, labelCenterY + 4, { align: "center", baseline: "middle" });
    } else {
      doc.text(lvl.label, colX + colW / 2, labelCenterY, { align: "center", baseline: "middle" });
    }
  }
}

// ─── Motivación Table (left column) ───────────────────────────────────────────
function drawMotivacionTable(
  doc: jsPDF,
  data: SurveyTabulacionData,
  y: number,
  colX: number,
  colW: number,
): number {
  const labelW = colW * 0.7;
  const totalW = colW * 0.3;
  const headerH = 14;
  const rowH = 15;

  // Sub-header
  fillRect(doc, colX, y, colW, headerH, COLOR_GRAY);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(colX, y, colW, headerH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(doc, COLOR_BLACK);
  doc.text("¿Por qué asististe al curso?", colX + 3, y + headerH / 2, { baseline: "middle" });
  y += headerH;

  // Column header
  doc.rect(colX, y, colW, headerH);
  vLine(doc, colX + labelW, y, y + headerH);
  doc.text("Nivel", colX + 3, y + headerH / 2, { baseline: "middle" });
  doc.text("Total", colX + labelW + totalW / 2, y + headerH / 2, { align: "center", baseline: "middle" });
  y += headerH;

  // Reason rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const seen = new Set<string>();
  const allReasons = [...ATTENDANCE_REASONS];
  for (const [r] of Object.entries(data.attendance_reasons)) {
    if (!allReasons.some(a => a.toLowerCase() === r.toLowerCase())) allReasons.push(r);
  }

  for (const reason of allReasons) {
    const key = reason.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const count = data.attendance_reasons[reason] || data.attendance_reasons[reason.replace(/personal/i, "Personal")] || 0;

    doc.rect(colX, y, colW, rowH);
    vLine(doc, colX + labelW, y, y + rowH);
    // Wrap long reason text
    const wrapped = doc.splitTextToSize(reason, labelW - 6);
    if (wrapped.length > 1) {
      doc.text(wrapped, colX + 3, y + rowH / 2 - 3, { baseline: "middle" });
    } else {
      doc.text(reason, colX + 3, y + rowH / 2, { baseline: "middle" });
    }
    doc.text(String(count), colX + labelW + totalW / 2, y + rowH / 2, { align: "center", baseline: "middle" });
    y += rowH;
  }

  return y;
}

// ─── Motivación Chart (right column) ──────────────────────────────────────────
/**
 * Draw a horizontal bar chart for attendance reasons.
 */
function drawMotivacionChart(
  doc: jsPDF,
  data: SurveyTabulacionData,
  yTop: number,
  yBottom: number,
): void {
  const chartX = RIGHT_COL_X;
  const chartW = RIGHT_COL_W;
  const chartH = yBottom - yTop;

  // White background
  fillRect(doc, chartX, yTop, chartW, chartH, COLOR_WHITE);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(chartX, yTop, chartW, chartH);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(doc, COLOR_BLACK);
  doc.text("MOTIVACIÓN DE LOS PARTICIPANTES", chartX + chartW / 2, yTop + 14, { align: "center", baseline: "middle" });

  const titleH = 28;
  const labelH = 22;
  const barAreaTop = yTop + titleH;
  const barAreaBottom = yBottom - labelH;
  const barAreaH = barAreaBottom - barAreaTop;

  // Gather reasons
  const seen = new Set<string>();
  const allReasons = [...ATTENDANCE_REASONS];
  for (const [r] of Object.entries(data.attendance_reasons)) {
    if (!allReasons.some(a => a.toLowerCase() === r.toLowerCase())) allReasons.push(r);
  }

  const counts = allReasons.filter(r => {
    const k = r.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).map(r => {
    const count = data.attendance_reasons[r] || data.attendance_reasons[r.replace(/personal/i, "Personal")] || 0;
    return { reason: r, count };
  });

  const maxCount = Math.max(1, ...counts.map(c => c.count));
  const maxBarW = chartW - 80; // leave space for count labels
  const barH = 14;
  const barGap = (barAreaH - counts.length * barH) / (counts.length + 1);

  for (let i = 0; i < counts.length; i++) {
    const { reason, count } = counts[i];
    const barY = barAreaTop + barGap * (i + 1) + barH * i;
    const barW = (count / maxCount) * maxBarW;
    const barX = chartX + 30;

    // Count label above bar
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, COLOR_BLACK);
    doc.text(String(count), barX + barW + 4, barY + barH / 2, { baseline: "middle" });

    // Bar
    if (barW > 0.5) {
      fillRect(doc, barX, barY, barW, barH, COLOR_BLUE);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(barX, barY, barW, barH);
    }

    // Reason label below
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setText(doc, COLOR_BLACK);
    const labelY = yBottom - 6;
    const labelX = chartX + chartW / (counts.length * 2) * (i * 2 + 1);
    const wrapped = doc.splitTextToSize(reason, chartW / counts.length - 4);
    if (wrapped.length > 1) {
      doc.text(wrapped, labelX, labelY - 4, { align: "center", baseline: "middle" });
    } else {
      doc.text(reason, labelX, labelY, { align: "center", baseline: "middle" });
    }
  }
}

// ─── Observaciones ────────────────────────────────────────────────────────────
function drawObservaciones(doc: jsPDF, y: number): number {
  const headerH = 14;
  const bodyH = 40;

  // Yellow header bar
  fillRect(doc, MARGIN_LEFT, y, CONTENT_W, headerH, COLOR_YELLOW);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN_LEFT, y, CONTENT_W, headerH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(doc, COLOR_BLACK);
  doc.text("OBSERVACIONES", MARGIN_LEFT + 4, y + headerH / 2, { baseline: "middle" });
  y += headerH;

  // Body
  doc.rect(MARGIN_LEFT, y, CONTENT_W, bodyH);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  setText(doc, [80, 80, 80]);
  doc.text("SIN COMENTARIOS", MARGIN_LEFT + 4, y + 12);

  return y + bodyH;
}

// ─── Footer ───────────────────────────────────────────────────────────────────
/**
 * Draw the footer image centered near the bottom of the page.
 */
function drawFooter(doc: jsPDF): void {
  const footerData = getImageBase64("docs_footer.png");
  if (!footerData) return;
  try {
    const props = doc.getImageProperties(footerData.base64);
    const footerW = CONTENT_W; // same width as all content above
    const footerH = footerW * (props.height / props.width);
    const footerX = MARGIN_LEFT;
    const footerY = PAGE_H - footerH - 22;
    doc.addImage(footerData.base64, footerData.format, footerX, footerY, footerW, footerH, undefined, "FAST");
  } catch {
    // ignore
  }
}

// ─── Main Generator ───────────────────────────────────────────────────────────
/**
 * Generate the survey tabulation PDF and return it as a Blob.
 */
export async function generateSurveyTabulacionPdf(
  data: SurveyTabulacionData,
): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "legal", orientation: "portrait" });

  // Exact table heights (must match the row sizes in each draw function):
  //   Section table:  subH(15) + headerH(14) + 5*rowH(75) + totalRow(15) = 119
  //   Resultados:     orangeH(14) + ponderacionesH(14) + 5*rowH(75) + totalRow(29) = 132
  //   Motivación:     subH(14) + headerH(14) + 3*rowH(45) = 73 (minimum)
  const SECTION_TABLE_H = 119;
  const RESULTADOS_TABLE_H = 132;
  const MOTIVACION_TABLE_H = 73;
  const SECTION_GAP = 8;

  // Header
  let y = drawHeader(doc);

  // OSI info grid
  y = drawOsiInfo(doc, data, y);

  // ISO paragraph
  y = drawIsoParagraph(doc, y);

  // ── Main section header ──
  y = drawSectionHeader(doc, "ASPECTOS DEL SERVICIO PRESTADO POR SHA DE VENEZUELA, C.A.", y);

  // ── Section 1: Facilitador (60%) — left table + right chart ──
  const sec1Top = y;
  const sec1Bottom = sec1Top + SECTION_TABLE_H;
  drawSectionTable(doc, data.sections.facilitador, sec1Top, LEFT_COL_X, LEFT_COL_W);
  drawSectionChart(doc, "DESENVOLVIMIENTO DEL FACILITADOR", data.sections.facilitador, sec1Top, sec1Bottom);

  // ── Section 2: Capacitación (40%) ──
  const sec2Top = sec1Bottom + SECTION_GAP;
  const sec2Bottom = sec2Top + SECTION_TABLE_H;
  drawSectionTable(doc, data.sections.capacitacion, sec2Top, LEFT_COL_X, LEFT_COL_W);
  drawSectionChart(doc, "ASPECTOS DE LA CAPACITACIÓN", data.sections.capacitacion, sec2Top, sec2Bottom);

  // ── Resultados del servicio ──
  const resTop = sec2Bottom + SECTION_GAP;
  const resBottom = resTop + RESULTADOS_TABLE_H;
  drawResultadosTable(doc, data, resTop, LEFT_COL_X, LEFT_COL_W);
  drawResultadosChart(doc, data, resTop, resBottom);

  // ── Additional aspects header ──
  y = resBottom + SECTION_GAP;
  y = drawSectionHeader(doc, "ASPECTOS ADICIONALES DEL SERVICIO", y, 14);

  // ── Section 3: Calidad del Entorno (5%) ──
  const sec3Top = y;
  const sec3Bottom = sec3Top + SECTION_TABLE_H;
  drawSectionTable(doc, data.sections.entorno, sec3Top, LEFT_COL_X, LEFT_COL_W);
  drawSectionChart(doc, "CALIDAD DEL ENTORNO", data.sections.entorno, sec3Top, sec3Bottom);

  // ── Motivación ──
  const motTop = sec3Bottom + SECTION_GAP;
  const motBottom = motTop + 90;
  drawMotivacionTable(doc, data, motTop, LEFT_COL_X, LEFT_COL_W);
  drawMotivacionChart(doc, data, motTop, motBottom);

  // ── Observaciones ──
  y = motBottom + SECTION_GAP;
  y = drawObservaciones(doc, y);

  // Footer
  drawFooter(doc);

  return doc.output("blob");
}
