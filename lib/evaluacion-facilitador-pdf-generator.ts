/**
 * Evaluación de Facilitadores PDF generator (jsPDF-based).
 *
 * Generates the RG-CAP-004 document using jsPDF directly — no puppeteer/Chrome
 * needed. Uses the standard SHA document header (logo | title | code box) and
 * footer image, matching other capacitacion PDFs.
 *
 *  - Standard header: logo, centered title, code box (CÓDIGO/FECHA/REVISIÓN/PÁGINA)
 *  - Watermark behind content on every page
 *  - Card-style sections with colored left accent bars
 *  - SVG-based charts (bar + doughnut) rendered via sharp → PNG
 *  - Phase 1: criteria tables + bar chart + compliance doughnut
 *  - Phase 2 (if seguimiento): gestión items + 3 doughnuts + total doughnut
 *  - Phase 3 (if reevaluación): per-OSI table + bar chart + compliance doughnut
 *  - Summary dashboard page with overall result
 *  - Standard footer image (docs_footer.png) on every page
 *
 * Uses manual rect/text/line drawing (no jspdf-autotable dependency).
 */

import jsPDF from "jspdf";
import fs from "fs";
import path from "path";
import type {
  EvaluacionPayload,
  FaseInicial,
  FaseSeguimiento,
  FaseReevaluacion,
} from "@/app/actions/evaluacion-facilitadores";
import {
  CRITERIA_SECTIONS,
  GESTION_ITEMS,
  CLASIFICACION_INICIAL,
  CLASIFICACION_REEVALUACION,
} from "@/lib/evaluacion-facilitadores-criteria";
import {
  computeGestionPct,
  computeReevaluacionTotal,
  classifyReevaluacionCondicion,
} from "@/app/actions/evaluacion-facilitadores-scoring";
import {
  generateBarChartPng,
  generateDoughnutPng,
  generateComplianceDoughnutPng,
  type ChartImage,
} from "@/lib/evaluacion-facilitador-charts";

export interface EvaluacionPdfData extends EvaluacionPayload {
  facilitador_nombre?: string;
  facilitador_cedula?: string | null;
  facilitador_rif?: string | null;
}

// Letter page dimensions (mm)
const PAGE_W = 215.9;
const PAGE_H = 279.4;
const MARGIN_X = 15;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const MARGIN_TOP = 35; // content starts after standard header
const MARGIN_BOTTOM = 18; // footer image + margin

// Document metadata (header code box)
const DOC_CODIGO = "RG-CAP-004";
const DOC_FECHA = "07/09/2026";
const DOC_REVISION = "02";

// Colors
const COLOR_DARK = [12, 63, 105] as const; // brand dark blue
const COLOR_GRAY = [107, 114, 128] as const;
const COLOR_LIGHT_GRAY = [229, 231, 235] as const;
const COLOR_HEADER_BG = [243, 244, 246] as const;
const COLOR_VIOLET = [12, 63, 105] as const; // using brand dark blue instead of purple
const COLOR_VIOLET_LIGHT = [219, 234, 254] as const; // blue-100
const COLOR_GREEN = [16, 185, 129] as const;
const COLOR_AMBER = [245, 158, 11] as const;
const COLOR_RED = [239, 68, 68] as const;

const FONT_SIZE = 8;
const FONT_SIZE_SMALL = 7;
const FONT_SIZE_TITLE = 13;
const FONT_SIZE_HEADING = 10;
const FONT_SIZE_SECTION = 9;
const LINE_HEIGHT = 4;

// ─── Image loading helper ────────────────────────────────────────────────────

const _imageCache = new Map<string, string>();

function getImageBase64(filename: string): string {
  if (_imageCache.has(filename)) return _imageCache.get(filename)!;
  try {
    const imgPath = path.join(process.cwd(), "public", filename);
    const result = `data:image/png;base64,${fs.readFileSync(imgPath).toString("base64")}`;
    _imageCache.set(filename, result);
    return result;
  } catch {
    return "";
  }
}

// ─── Standard page header (logo | title | code box) ──────────────────────────

function drawPageHeader(
  pdf: jsPDF,
  currentPage: number,
  totalPages: number,
): number {
  // Logo (left, proportional width, 12mm height)
  const logoB64 = getImageBase64("logo.png");
  if (logoB64) {
    try {
      const props = pdf.getImageProperties(logoB64);
      const logoH = 12;
      const logoW = logoH * (props.width / props.height);
      pdf.addImage(logoB64, "PNG", MARGIN_X, 8, logoW, logoH, undefined, "FAST");
    } catch {
      pdf.addImage(logoB64, "PNG", MARGIN_X, 8, 28, 12, undefined, "FAST");
    }
  }

  // Title (centered, bold)
  const cx = PAGE_W / 2;
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(FONT_SIZE_TITLE);
  pdf.text("EVALUACIÓN DE FACILITADORES", cx, 17, { align: "center" });

  // Code box (right, grey text, 4 rows)
  const bx = 158;
  const by = 7;
  const bw = 42;
  const rh = 4;
  const labels = ["CÓDIGO", "FECHA", "REVISIÓN", "PÁGINA"];
  const values = [DOC_CODIGO, DOC_FECHA, DOC_REVISION, `${currentPage} de ${totalPages}`];
  pdf.setTextColor(140, 140, 140);
  labels.forEach((lbl, i) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6);
    pdf.text(lbl + ":", bx + 1, by + i * rh + 3.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.text(values[i], bx + bw - 1, by + i * rh + 3.5, { align: "right" });
  });
  pdf.setTextColor(0, 0, 0);

  // Separator line
  pdf.setDrawColor(COLOR_LIGHT_GRAY[0], COLOR_LIGHT_GRAY[1], COLOR_LIGHT_GRAY[2]);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN_X, 28, MARGIN_X + CONTENT_W, 28);

  return MARGIN_TOP;
}

// ─── Watermark ───────────────────────────────────────────────────────────────

function drawWatermark(pdf: jsPDF) {
  const wmB64 = getImageBase64("watermark.png");
  if (!wmB64) return;
  try {
    const wmSize = 140;
    const x = (PAGE_W - wmSize) / 2;
    const y = (PAGE_H - wmSize) / 2;
    pdf.saveGraphicsState();
    pdf.setGState(pdf.GState({ opacity: 0.12 }));
    pdf.addImage(wmB64, "PNG", x, y, wmSize, wmSize, undefined, "FAST");
    pdf.restoreGraphicsState();
  } catch {
    // Continue without watermark
  }
}

// ─── Standard page footer (docs_footer.png) ──────────────────────────────────

function drawPageFooter(pdf: jsPDF) {
  const footerB64 = getImageBase64("docs_footer.png");
  if (!footerB64) return;
  try {
    const props = pdf.getImageProperties(footerB64);
    const naturalH = CONTENT_W * (props.height / props.width);
    const footerY = PAGE_H - naturalH - 5;
    pdf.addImage(footerB64, "PNG", MARGIN_X, footerY, CONTENT_W, naturalH, undefined, "FAST");
  } catch {
    // Continue without footer
  }
}

// ─── Correct page numbers after all pages are known ──────────────────────────

function correctPageNumbers(pdf: jsPDF) {
  const totalPages = pdf.getNumberOfPages();
  const bx = 158;
  const by = 7;
  const bw = 42;
  const rh = 4;
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    // White-out the PÁGINA value (4th row, index 3)
    pdf.setDrawColor(255, 255, 255);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(bx + bw - 15, by + 3 * rh + 1, 14, 3, "F");
    // Rewrite with correct page number
    pdf.setTextColor(140, 140, 140);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.text(`${p} de ${totalPages}`, bx + bw - 1, by + 3 * rh + 3.5, {
      align: "right",
    });
  }
  pdf.setDrawColor(0, 0, 0);
  pdf.setTextColor(0, 0, 0);
}

// ─── Helper: draw a table row (with text wrapping) ───────────────────────────

interface CellSpec {
  text: string;
  width: number;
  align?: "left" | "center" | "right";
  bold?: boolean;
}

function cleanPdfText(text: string): string {
  if (!text) return "";
  return text
    .replace(/[—–]/g, "-")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=");
}

function drawTableRow(
  pdf: jsPDF,
  y: number,
  cells: CellSpec[],
  isHeader: boolean,
  minRowHeight = 5,
): number {
  const cellPadding = 1.5;
  const lineSpacing = 3; // mm between wrapped lines at 7pt

  // First pass: wrap text for each cell and find max line count
  pdf.setFontSize(FONT_SIZE_SMALL);
  const wrappedCells = cells.map((cell) => {
    pdf.setFont("helvetica", cell.bold || isHeader ? "bold" : "normal");
    const maxTextWidth = cell.width - cellPadding * 2;
    const lines = pdf.splitTextToSize(cleanPdfText(String(cell.text || "")), maxTextWidth);
    return { ...cell, lines };
  });

  const maxLines = Math.max(...wrappedCells.map((c) => c.lines.length), 1);
  const rowHeight = Math.max(minRowHeight, maxLines * lineSpacing + 2);

  // Second pass: draw backgrounds, borders, and text
  let x = MARGIN_X;
  for (const cell of wrappedCells) {
    // Background
    if (isHeader) {
      pdf.setFillColor(COLOR_HEADER_BG[0], COLOR_HEADER_BG[1], COLOR_HEADER_BG[2]);
      pdf.rect(x, y, cell.width, rowHeight, "F");
    }
    // Border
    pdf.setDrawColor(COLOR_LIGHT_GRAY[0], COLOR_LIGHT_GRAY[1], COLOR_LIGHT_GRAY[2]);
    pdf.setLineWidth(0.2);
    pdf.rect(x, y, cell.width, rowHeight, "S");
    // Text (vertically centered)
    pdf.setFontSize(FONT_SIZE_SMALL);
    pdf.setFont("helvetica", cell.bold || isHeader ? "bold" : "normal");
    const textColor = isHeader ? COLOR_DARK : [55, 65, 81] as const;
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    const totalTextH = cell.lines.length * lineSpacing;
    const startY = y + (rowHeight - totalTextH) / 2 + 2;
    for (let li = 0; li < cell.lines.length; li++) {
      const lineY = startY + li * lineSpacing;
      if (cell.align === "center") {
        pdf.text(cell.lines[li], x + cell.width / 2, lineY, { align: "center" });
      } else if (cell.align === "right") {
        pdf.text(cell.lines[li], x + cell.width - cellPadding, lineY, { align: "right" });
      } else {
        pdf.text(cell.lines[li], x + cellPadding, lineY);
      }
    }
    x += cell.width;
  }
  return y + rowHeight;
}

// ─── Helper: ensure space, add page if needed ────────────────────────────────

function ensureSpace(pdf: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN_BOTTOM) {
    // Draw footer on current page before leaving it
    drawPageFooter(pdf);
    pdf.addPage();
    // Draw header + watermark on new page
    drawWatermark(pdf);
    drawPageHeader(pdf, pdf.getNumberOfPages(), 99); // placeholder total
    return MARGIN_TOP;
  }
  return y;
}

// ─── Helper: draw section heading (card-style with accent bar) ───────────────

function drawSectionHeading(pdf: jsPDF, y: number, title: string): number {
  y = ensureSpace(pdf, y, 14);
  // Top padding before heading
  y += 3;
  // Left accent bar
  pdf.setFillColor(COLOR_VIOLET[0], COLOR_VIOLET[1], COLOR_VIOLET[2]);
  pdf.rect(MARGIN_X, y, 1.5, 6, "F");
  // Title
  pdf.setFontSize(FONT_SIZE_SECTION);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  pdf.text(title, MARGIN_X + 4, y + 4.5);
  // Underline
  pdf.setDrawColor(COLOR_LIGHT_GRAY[0], COLOR_LIGHT_GRAY[1], COLOR_LIGHT_GRAY[2]);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN_X, y + 7, MARGIN_X + CONTENT_W, y + 7);
  // Bottom padding after heading
  return y + 11;
}

// ─── Helper: draw a label-value pair ─────────────────────────────────────────

function drawLabelValue(
  pdf: jsPDF,
  y: number,
  label: string,
  value: string,
  labelWidth: number,
  valueWidth: number,
): number {
  y = ensureSpace(pdf, y, 6);
  pdf.setDrawColor(COLOR_LIGHT_GRAY[0], COLOR_LIGHT_GRAY[1], COLOR_LIGHT_GRAY[2]);
  pdf.setLineWidth(0.2);
  // Label cell
  pdf.setFillColor(COLOR_HEADER_BG[0], COLOR_HEADER_BG[1], COLOR_HEADER_BG[2]);
  pdf.setDrawColor(COLOR_LIGHT_GRAY[0], COLOR_LIGHT_GRAY[1], COLOR_LIGHT_GRAY[2]);
  pdf.rect(MARGIN_X, y, labelWidth, 5, "DF");
  pdf.setFontSize(FONT_SIZE_SMALL);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  pdf.text(cleanPdfText(label), MARGIN_X + 1.5, y + 3.5);
  // Value cell
  pdf.setFillColor(255, 255, 255);
  pdf.rect(MARGIN_X + labelWidth, y, valueWidth, 5, "S");
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(55, 65, 81);
  const truncatedValue = pdf.splitTextToSize(cleanPdfText(value || "-"), valueWidth - 3);
  pdf.text(truncatedValue[0] || "-", MARGIN_X + labelWidth + 1.5, y + 3.5);
  return y + 5;
}

// ─── Helper: draw vector horizontal bar chart natively in jsPDF ─────────────

function drawVectorBarChart(
  pdf: jsPDF,
  startX: number,
  startY: number,
  width: number,
  title: string,
  items: { label: string; value: number; max: number; color?: readonly [number, number, number] }[],
  scaleMax?: number,
): number {
  let y = startY;
  // Title
  pdf.setFontSize(FONT_SIZE_SECTION);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  pdf.text(cleanPdfText(title), startX, y);
  y += 5;

  const labelW = 46;
  const valW = 20;
  const barW = width - labelW - valW - 4;
  const barH = 3.6;
  const gap = 3.2;
  const maxVal = scaleMax || Math.max(...items.map((i) => i.max), 1);

  for (const item of items) {
    y = ensureSpace(pdf, y, barH + gap);
    // Label on left
    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(55, 65, 81);
    const splitLabel = pdf.splitTextToSize(cleanPdfText(item.label), labelW - 2);
    pdf.text(splitLabel[0] || item.label, startX, y + barH - 0.8);

    // Track
    const trackX = startX + labelW;
    pdf.setFillColor(COLOR_LIGHT_GRAY[0], COLOR_LIGHT_GRAY[1], COLOR_LIGHT_GRAY[2]);
    pdf.roundedRect(trackX, y, barW, barH, 0.8, 0.8, "F");

    // Filled bar
    const filledW = Math.max(0, Math.min(barW, (item.value / maxVal) * barW));
    if (filledW > 0) {
      const color = item.color || COLOR_DARK;
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.roundedRect(trackX, y, filledW, barH, 0.8, 0.8, "F");
    }

    // Value text on right
    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(55, 65, 81);
    const valText = `${item.value.toFixed(1)} / ${item.max.toFixed(0)}`;
    pdf.text(valText, trackX + barW + 2, y + barH - 0.8);

    y += barH + gap;
  }
  return y + 2;
}

// ─── Helper: embed an image (PNG data URL) preserving aspect ratio ───────────

function embedImage(
  pdf: jsPDF,
  imgData: ChartImage,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
) {
  try {
    const nativeRatio = imgData.width / imgData.height;
    const boxRatio = boxW / boxH;
    let drawW: number;
    let drawH: number;
    if (nativeRatio > boxRatio) {
      // Image is wider than box — fit to width
      drawW = boxW;
      drawH = boxW / nativeRatio;
    } else {
      // Image is taller than box — fit to height
      drawH = boxH;
      drawW = boxH * nativeRatio;
    }
    // Center horizontally in the box
    const drawX = x + (boxW - drawW) / 2;
    const drawY = y + (boxH - drawH) / 2;
    pdf.addImage(imgData.base64, imgData.format, drawX, drawY, drawW, drawH, undefined, "FAST");
  } catch (err) {
    console.error("embedImage: failed to embed chart:", err);
  }
}

// ─── Main generator ──────────────────────────────────────────────────────────

export async function generateEvaluacionFacilitadorPdf(
  data: EvaluacionPdfData,
): Promise<Blob> {
  const pdf = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });

  // Page 1: watermark + header
  drawWatermark(pdf);
  drawPageHeader(pdf, 1, 99); // placeholder total, corrected at end
  let y = MARGIN_TOP;

  // ─── Datos del Facilitador ───
  y = drawSectionHeading(pdf, y, "DATOS DEL FACILITADOR");
  const labelW = 50;
  const valueW = CONTENT_W - labelW;
  y = drawLabelValue(pdf, y, "Nombre y Apellido", toTitleCase(data.facilitador_nombre || "-"), labelW, valueW);
  y = drawLabelValue(pdf, y, "Cédula de Identidad", data.facilitador_cedula || "-", labelW, valueW);
  y = drawLabelValue(pdf, y, "RIF", data.facilitador_rif || "-", labelW, valueW);
  y = drawLabelValue(pdf, y, "Tipo de Proveedor", data.tipo_proveedor || "-", labelW, valueW);
  y = drawLabelValue(pdf, y, "Entrevista", data.entrevista || "-", labelW, valueW);
  y = drawLabelValue(pdf, y, "Evaluador", data.evaluador_nombre || "-", labelW, valueW);
  y = drawLabelValue(pdf, y, "Cargo del Evaluador", data.evaluador_cargo || "-", labelW, valueW);
  y = drawLabelValue(pdf, y, "Recomendado Por", data.recomendado_por || "-", labelW, valueW);
  y = drawLabelValue(pdf, y, "Tipo de Evaluación", getTipoLabel(data.tipo_evaluacion), labelW, valueW);
  y = drawLabelValue(pdf, y, "Fecha de Evaluación", formatDate(data.fecha_evaluacion), labelW, valueW);
  y += 4;

  // ─── Phase 1: Verificación Inicial ───
  y = drawSectionHeading(
    pdf,
    y,
    "VERIFICACIÓN INICIAL - ASPECTOS A EVALUAR",
  );
  y = ensureSpace(pdf, y, 5);
  pdf.setFontSize(FONT_SIZE_SMALL);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(COLOR_GRAY[0], COLOR_GRAY[1], COLOR_GRAY[2]);
  pdf.text(
    "Marque con una 'X' los criterios que cumple el facilitador.",
    MARGIN_X,
    y,
  );
  y += 4;

  const faseInicial = data.fase_inicial as FaseInicial;
  const secciones = faseInicial?.secciones || {};

  // Column widths for criteria tables
  const colCriterio = CONTENT_W * 0.55;
  const colCumple = CONTENT_W * 0.1;
  const colPtos = CONTENT_W * 0.1;
  const colObs = CONTENT_W * 0.25;

  // Collect per-section scores for the bar chart
  const sectionScores: { label: string; value: number; max: number }[] = [];

  for (const section of CRITERIA_SECTIONS) {
    y = ensureSpace(pdf, y, 14);
    // Section title
    pdf.setFontSize(FONT_SIZE);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(COLOR_VIOLET[0], COLOR_VIOLET[1], COLOR_VIOLET[2]);
    pdf.text(section.title, MARGIN_X, y);
    y += 4;

    // Header row
    y = drawTableRow(pdf, y, [
      { text: "Criterio", width: colCriterio },
      { text: "Cumple", width: colCumple, align: "center" },
      { text: "Ptos.", width: colPtos, align: "center" },
      { text: "Observaciones", width: colObs },
    ], true);

    // Option rows
    const sectionData = secciones[section.key as keyof typeof secciones] as any;
    const selectedOption = sectionData?.opcion;
    const selectedOptions: string[] = sectionData?.opciones || [];
    const sectionObs = sectionData?.observacion || "";

    let sectionEarned = 0;
    let sectionMax = 0;

    for (const opt of section.options) {
      y = ensureSpace(pdf, y, 5);
      const isChecked = section.multi
        ? selectedOptions.includes(opt.key)
        : selectedOption === opt.key;
      if (isChecked) sectionEarned += opt.puntos;
      sectionMax = Math.max(sectionMax, opt.puntos);
      y = drawTableRow(pdf, y, [
        { text: opt.label, width: colCriterio },
        { text: isChecked ? "X" : "", width: colCumple, align: "center", bold: isChecked },
        { text: String(opt.puntos), width: colPtos, align: "center" },
        { text: "", width: colObs },
      ], false);
    }

    // For multi-select, max is sum of all options; for single-select, max of options
    if (section.multi) {
      sectionMax = section.options.reduce((s, o) => s + o.puntos, 0);
    }

    sectionScores.push({
      label: section.title.replace(/^\d+\.\s*/, ""),
      value: sectionEarned,
      max: sectionMax,
    });

    // Section observaciones
    if (sectionObs) {
      y = ensureSpace(pdf, y, 5);
      pdf.setFontSize(FONT_SIZE_SMALL);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(COLOR_GRAY[0], COLOR_GRAY[1], COLOR_GRAY[2]);
      const obsLines = pdf.splitTextToSize(`Obs: ${sectionObs}`, CONTENT_W - 3);
      for (const line of obsLines) {
        y = ensureSpace(pdf, y, LINE_HEIGHT);
        pdf.text(line, MARGIN_X + 1.5, y);
        y += LINE_HEIGHT;
      }
    }
    y += 2;
  }

  // Total
  const totalPuntos = computeTotalFromSecciones(secciones);
  const maxPuntos = 30; // max possible from Excel
  y = ensureSpace(pdf, y, 8);
  pdf.setFillColor(COLOR_VIOLET[0], COLOR_VIOLET[1], COLOR_VIOLET[2]);
  pdf.rect(MARGIN_X, y, CONTENT_W, 6, "F");
  pdf.setFontSize(FONT_SIZE_SECTION);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text("TOTAL (VERIFICACIÓN INICIAL)", MARGIN_X + 2, y + 4);
  pdf.text(`${totalPuntos.toFixed(1)} pts`, PAGE_W - MARGIN_X - 2, y + 4, {
    align: "right",
  });
  y += 8;

  // ─── Phase 1 Charts ───
  y = ensureSpace(pdf, y, 60);

  // Section heading for charts
  pdf.setFontSize(FONT_SIZE);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  pdf.text("Resultados Visuales - Verificación Inicial", MARGIN_X, y);
  y += 4;

  // Bar chart (left half) + Doughnut (right half)
  const chartW = CONTENT_W * 0.58;
  const doughnutW = CONTENT_W * 0.38;
  const chartH = 55;

  const barEndY = drawVectorBarChart(
    pdf,
    MARGIN_X,
    y,
    chartW,
    "Puntaje por Criterio",
    sectionScores.map((s, i) => ({
      ...s,
      color: i % 2 === 0 ? COLOR_DARK : ([59, 130, 246] as const),
    })),
    Math.max(...sectionScores.map((s) => s.max), 5),
  );

  // Compliance doughnut (right)
  const compliancePct = totalPuntos / maxPuntos;
  const doughnutImg = await generateComplianceDoughnutPng(compliancePct, {
    width: 300,
    height: 300,
    title: "Cumplimiento",
    centerSubtext: `${totalPuntos.toFixed(1)} / ${maxPuntos} pts`,
  }, `doughnut_phase1_${data.id || "new"}`);
  embedImage(pdf, doughnutImg, MARGIN_X + chartW + 4, y, doughnutW, chartH);

  y = Math.max(barEndY, y + chartH) + 6;

  // Classification table
  y = ensureSpace(pdf, y, 6);
  pdf.setFontSize(FONT_SIZE);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  pdf.text("Tabla de Calificación para la Incorporación del Facilitador", MARGIN_X, y);
  y += 4;

  const clsCol1 = CONTENT_W * 0.25;
  const clsCol2 = CONTENT_W * 0.25;
  const clsCol3 = CONTENT_W * 0.5;
  y = drawTableRow(pdf, y, [
    { text: "Rango de Puntuación", width: clsCol1 },
    { text: "Resultado", width: clsCol2 },
    { text: "Descripción", width: clsCol3 },
  ], true);

  const condicionInicial = classifyInicial(totalPuntos);
  for (const row of CLASIFICACION_INICIAL) {
    const rowCond =
      row.resultado === "APROBADO"
        ? "aprobado"
        : row.resultado === "APROBADO BAJO SUPERVISIÓN"
          ? "aprobado_supervision"
          : "no_aprobado";
    const isMatch = condicionInicial === rowCond;
    if (isMatch) {
      pdf.setFillColor(COLOR_VIOLET_LIGHT[0], COLOR_VIOLET_LIGHT[1], COLOR_VIOLET_LIGHT[2]);
      pdf.rect(MARGIN_X, y, CONTENT_W, 5, "F");
    }
    y = drawTableRow(pdf, y, [
      { text: row.rango, width: clsCol1, bold: isMatch },
      { text: row.resultado, width: clsCol2, bold: isMatch },
      { text: row.descripcion, width: clsCol3 },
    ], false);
  }
  y += 4;

  // Observaciones generales
  if (data.observaciones) {
    y = drawTextField(pdf, y, "Observaciones de la Verificación Inicial", data.observaciones);
  }

  // ─── Reevaluación del Facilitador (Unified) ───
  let avgTotal = 0;
  if (data.tipo_evaluacion === "reevaluacion" || data.tipo_evaluacion === "seguimiento") {
    y = drawSectionHeading(pdf, y, "REEVALUACIÓN DEL FACILITADOR");
    const fr = (data.fase_reevaluacion || data.fase_seguimiento || {}) as FaseReevaluacion & FaseSeguimiento;
    const osis = fr.osis || [];

    // Description text per RG-CAP-004
    y = ensureSpace(pdf, y, 16);
    pdf.setFontSize(FONT_SIZE_SMALL);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(COLOR_GRAY[0], COLOR_GRAY[1], COLOR_GRAY[2]);
    const introLines = [
      "La reevaluación del facilitador se estructura bajo los siguientes criterios (SHA-IT-CAP-001):",
      "1. Verificación del cumplimiento de la documentación inicial (representa el 40 %).",
      "2. Resultados de las encuestas de satisfacción aplicadas en cada actividad (representa el 40 %).",
      "3. Gestión de actividades y compromiso con la organización (representa el 20 %).",
    ];
    for (const line of introLines) {
      pdf.text(line, MARGIN_X, y);
      y += 3.5;
    }
    y += 2;

    // Component percentages
    const docsPct = fr.docs_iniciales_pct ?? (totalPuntos / maxPuntos) * 0.4;
    const encPct = fr.encuestas_pct ?? 0;
    const gestionItems = fr.gestion_actividades?.items || [0, 0, 0, 0, 0, 0];
    const gestPct = computeGestionPct(gestionItems);
    avgTotal = osis.length > 0
      ? computeReevaluacionTotal(fr)
      : (fr.total_pct ?? (docsPct * 0.4 + encPct * 0.4 + gestPct * 0.2));

    // 1. Gestión items table (6 items, 1-5 scale)
    y = ensureSpace(pdf, y, 6);
    pdf.setFontSize(FONT_SIZE);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(COLOR_VIOLET[0], COLOR_VIOLET[1], COLOR_VIOLET[2]);
    pdf.text("Gestión de Actividades y Compromiso (escala 1-5)", MARGIN_X, y);
    y += 4;

    const gCol1 = CONTENT_W * 0.82;
    const gCol2 = CONTENT_W * 0.18;
    y = drawTableRow(pdf, y, [
      { text: "Aspecto a Evaluar", width: gCol1 },
      { text: "Puntos (1-5)", width: gCol2, align: "center" },
    ], true);

    for (let i = 0; i < GESTION_ITEMS.length; i++) {
      y = ensureSpace(pdf, y, 5);
      y = drawTableRow(pdf, y, [
        { text: GESTION_ITEMS[i].label, width: gCol1 },
        { text: String(gestionItems[i] || 0), width: gCol2, align: "center" },
      ], false);
    }
    const gestionTotal = gestionItems.reduce((s, v) => s + (v || 0), 0);
    y = ensureSpace(pdf, y, 5);
    y = drawTableRow(pdf, y, [
      { text: "TOTAL GESTIÓN (sobre 30 pts)", width: gCol1, bold: true },
      { text: `${gestionTotal} / 30 (${(gestPct * 100).toFixed(1)}%)`, width: gCol2, align: "center", bold: true },
    ], false);
    y += 4;

    // 2. Component Results or Multi-OSI matrix
    if (osis.length > 0) {
      y = ensureSpace(pdf, y, 20);
      pdf.setFontSize(FONT_SIZE);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      pdf.text("Matriz de Reevaluación por Actividad / OSI", MARGIN_X, y);
      y += 4;

      const numOsis = osis.length;
      const compW = CONTENT_W * 0.32;
      const osiW = (CONTENT_W * 0.48) / Math.max(numOsis, 1);
      const resW = CONTENT_W * 0.2;

      const headers: CellSpec[] = [{ text: "Componente", width: compW }];
      for (let i = 0; i < numOsis; i++) {
        headers.push({ text: `OSI ${osis[i].nro_osi || i + 1}`, width: osiW, align: "center" });
      }
      headers.push({ text: "Promedio", width: resW, align: "center" });
      y = drawTableRow(pdf, y, headers, true);

      // Data rows
      const rowData = [
        { label: "Documentación Inicial (40%)", key: "docs" as const },
        { label: "Encuestas de Satisfacción (40%)", key: "encuestas" as const },
        { label: "Gestión de Actividades (20%)", key: "gestion" as const },
      ];
      for (const row of rowData) {
        y = ensureSpace(pdf, y, 5);
        const cells: CellSpec[] = [{ text: row.label, width: compW }];
        let rowSum = 0;
        for (const o of osis) {
          const val = (o[row.key] as number) || 0;
          rowSum += val;
          cells.push({
            text: `${(val * 100).toFixed(1)}%`,
            width: osiW,
            align: "center",
          });
        }
        cells.push({ text: `${((rowSum / osis.length) * 100).toFixed(1)}%`, width: resW, align: "center", bold: true });
        y = drawTableRow(pdf, y, cells, false);
      }

      // Total row
      y = ensureSpace(pdf, y, 5);
      const totalCells: CellSpec[] = [{ text: "TOTAL", width: compW, bold: true }];
      for (const o of osis) {
        totalCells.push({
          text: `${((o.total || 0) * 100).toFixed(1)}%`,
          width: osiW,
          align: "center",
          bold: true,
        });
      }
      totalCells.push({
        text: `${(avgTotal * 100).toFixed(1)}%`,
        width: resW,
        align: "center",
        bold: true,
      });
      y = drawTableRow(pdf, y, totalCells, false);
      y += 4;
    } else {
      // Single evaluation component summary
      y = ensureSpace(pdf, y, 12);
      pdf.setFontSize(FONT_SIZE);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      pdf.text("Resultados por Componente", MARGIN_X, y);
      y += 4;

      y = drawLabelValue(pdf, y, "Documentación Inicial (40%)", `${(docsPct * 100).toFixed(1)}%`, 70, CONTENT_W - 70);
      y = drawLabelValue(pdf, y, "Encuestas de Satisfacción (40%)", `${(encPct * 100).toFixed(1)}%`, 70, CONTENT_W - 70);
      y = drawLabelValue(pdf, y, "Gestión de Actividades (20%)", `${(gestPct * 100).toFixed(1)}%`, 70, CONTENT_W - 70);
    }

    // Total Banner
    y = ensureSpace(pdf, y, 8);
    pdf.setFillColor(COLOR_VIOLET[0], COLOR_VIOLET[1], COLOR_VIOLET[2]);
    pdf.rect(MARGIN_X, y, CONTENT_W, 6, "F");
    pdf.setFontSize(FONT_SIZE_SECTION);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text("TOTAL DE REEVALUACIÓN DEL FACILITADOR", MARGIN_X + 2, y + 4);
    pdf.text(`${(avgTotal * 100).toFixed(1)}%`, PAGE_W - MARGIN_X - 2, y + 4, { align: "right" });
    y += 8;

    // Visual results: 3 small doughnuts (Docs, Encuestas, Gestión)
    y = ensureSpace(pdf, y, 48);
    pdf.setFontSize(FONT_SIZE);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    pdf.text("Resultados Visuales - Reevaluación", MARGIN_X, y);
    y += 4;

    const smallDoughnutW = (CONTENT_W - 12) / 3;
    const smallDoughnutH = 40;

    const docsImg = await generateComplianceDoughnutPng(docsPct, {
      width: 250, height: 250,
      title: "Documentación Inicial (40%)",
    }, `doughnut_reev_docs_${data.id || "new"}`);
    embedImage(pdf, docsImg, MARGIN_X, y, smallDoughnutW, smallDoughnutH);

    const encImg = await generateComplianceDoughnutPng(encPct, {
      width: 250, height: 250,
      title: "Encuesta Satisfacción (40%)",
    }, `doughnut_reev_enc_${data.id || "new"}`);
    embedImage(pdf, encImg, MARGIN_X + smallDoughnutW + 6, y, smallDoughnutW, smallDoughnutH);

    const gestImg = await generateComplianceDoughnutPng(gestPct, {
      width: 250, height: 250,
      title: "Gestión Actividades (20%)",
    }, `doughnut_reev_gest_${data.id || "new"}`);
    embedImage(pdf, gestImg, MARGIN_X + (smallDoughnutW + 6) * 2, y, smallDoughnutW, smallDoughnutH);

    y += smallDoughnutH + 6;

    // If multiple OSIs, also show vector bar chart of OSIs
    if (osis.length > 0) {
      y = ensureSpace(pdf, y, 40);
      const osiBarData = osis.map((o, i) => ({
        label: `OSI ${o.nro_osi || i + 1}`,
        value: (o.total || 0) * 100,
        max: 100,
        color: i % 2 === 0 ? COLOR_DARK : ([59, 130, 246] as const),
      }));
      y = drawVectorBarChart(
        pdf,
        MARGIN_X,
        y,
        CONTENT_W,
        "Total por OSI (%)",
        osiBarData,
        100,
      );
      y += 4;
    }

    // Classification table (>= 80% Aceptable, < 80% No Aceptable)
    y = ensureSpace(pdf, y, 6);
    pdf.setFontSize(FONT_SIZE);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    pdf.text("Tabla de Clasificación de los Resultados de la Reevaluación", MARGIN_X, y);
    y += 4;

    const clsCol1 = CONTENT_W * 0.25;
    const clsCol2 = CONTENT_W * 0.25;
    const clsCol3 = CONTENT_W * 0.5;
    y = drawTableRow(pdf, y, [
      { text: "Rango de Calificación", width: clsCol1 },
      { text: "Resultado", width: clsCol2 },
      { text: "Descripción", width: clsCol3 },
    ], true);

    for (const row of CLASIFICACION_REEVALUACION) {
      const isMatch =
        (avgTotal >= 0.8 && row.resultado === "ACEPTABLE") ||
        (avgTotal < 0.8 && row.resultado === "NO ACEPTABLE");
      if (isMatch) {
        pdf.setFillColor(254, 243, 199);
        pdf.rect(MARGIN_X, y, CONTENT_W, 5, "F");
      }
      y = drawTableRow(pdf, y, [
        { text: row.rango, width: clsCol1, bold: isMatch },
        { text: row.resultado, width: clsCol2, bold: isMatch },
        { text: row.descripcion, width: clsCol3 },
      ], false);
    }
    y += 4;

    // Condición después de la reevaluación (>=90% Aprobado, >=80% Aprobado bajo supervisión, <80% No aprobado)
    const condicionReev = fr.condicion || classifyReevaluacionCondicion(avgTotal);
    const condLabel =
      condicionReev === "aprobado"
        ? "APROBADO"
        : condicionReev === "aprobado_supervision"
          ? "APROBADO BAJO SUPERVISIÓN"
          : "NO APROBADO";
    y = drawLabelValue(pdf, y, "Condición después de la Reevaluación", condLabel, 70, CONTENT_W - 70);

    // Qualitative notes
    const obs = fr.observaciones;
    const oport = fr.oportunidades_mejora;
    const metod = fr.metodologias;
    if (obs) y = drawTextField(pdf, y, "Observaciones", obs);
    if (oport) y = drawTextField(pdf, y, "Oportunidades de Mejora", oport);
    if (metod) y = drawTextField(pdf, y, "Metodologías Complementarias", metod);
  }

  // ─── Summary Dashboard Page ───
  drawPageFooter(pdf); // footer on current page
  pdf.addPage();
  drawWatermark(pdf);
  drawPageHeader(pdf, pdf.getNumberOfPages(), 99); // placeholder total
  y = MARGIN_TOP;

  // Section heading
  y = drawSectionHeading(pdf, y, "RESUMEN EJECUTIVO");
  y += 4;

  // Determine overall result
  let overallPct = 0;
  let overallLabel = "";
  let overallColor: readonly [number, number, number] = COLOR_GRAY;
  if (data.tipo_evaluacion === "nuevo") {
    overallPct = totalPuntos / maxPuntos;
    const cond = classifyInicial(totalPuntos);
    overallLabel = cond === "aprobado" ? "APROBADO" : cond === "aprobado_supervision" ? "APROBADO BAJO SUPERVISIÓN" : "NO APROBADO";
    overallColor = cond === "aprobado" ? COLOR_GREEN : cond === "aprobado_supervision" ? COLOR_AMBER : COLOR_RED;
  } else {
    // Reevaluación (or legacy seguimiento)
    overallPct = avgTotal;
    const cond = classifyReevaluacionCondicion(overallPct);
    overallLabel = cond === "aprobado" ? "APROBADO" : cond === "aprobado_supervision" ? "APROBADO BAJO SUPERVISIÓN" : "NO APROBADO";
    overallColor = cond === "aprobado" ? COLOR_GREEN : cond === "aprobado_supervision" ? COLOR_AMBER : COLOR_RED;
  }

  // Large doughnut (left)
  const summaryDoughnutImg = await generateComplianceDoughnutPng(overallPct, {
    width: 400, height: 400,
    title: "Resultado Final",
    centerSubtext: overallLabel,
    color: overallColor === COLOR_GREEN ? "#10b981" : overallColor === COLOR_AMBER ? "#f59e0b" : "#ef4444",
  }, `doughnut_summary_${data.id || "new"}_${data.tipo_evaluacion}`);
  embedImage(pdf, summaryDoughnutImg, MARGIN_X, y, 70, 70);

  // Key metrics grid (right of doughnut)
  const metricsX = MARGIN_X + 80;
  let metricY = y + 4;

  pdf.setFontSize(FONT_SIZE_SECTION);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  pdf.text("Métricas Clave", metricsX, metricY);
  metricY += 6;

  const metrics: { label: string; value: string }[] = [
    { label: "Facilitador", value: toTitleCase(data.facilitador_nombre || "-") },
    { label: "Tipo de Evaluación", value: getTipoLabel(data.tipo_evaluacion) },
    { label: "Fecha", value: formatDate(data.fecha_evaluacion) },
    { label: "Evaluador", value: data.evaluador_nombre || "-" },
  ];

  if (data.tipo_evaluacion === "nuevo") {
    metrics.push({ label: "Puntaje Total", value: `${totalPuntos.toFixed(1)} / ${maxPuntos} pts` });
  } else {
    metrics.push({ label: "Total Reevaluación", value: `${(overallPct * 100).toFixed(1)}%` });
    metrics.push({ label: "Resultado", value: overallPct >= 0.8 ? "ACEPTABLE" : "NO ACEPTABLE" });
  }

  metrics.push({ label: "Condición", value: overallLabel });

  for (const m of metrics) {
    metricY = ensureSpace(pdf, metricY, 6);
    pdf.setFontSize(FONT_SIZE_SMALL);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(COLOR_GRAY[0], COLOR_GRAY[1], COLOR_GRAY[2]);
    pdf.text(m.label, metricsX, metricY);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(55, 65, 81);
    pdf.text(cleanPdfText(m.value), metricsX + 45, metricY);
    metricY += 5;
  }

  y = Math.max(y + 75, metricY + 4);

  // Condition badge (colored pill)
  y = ensureSpace(pdf, y, 12);
  const badgeW = 80;
  const badgeH = 8;
  const badgeX = (PAGE_W - badgeW) / 2;
  pdf.setFillColor(overallColor[0], overallColor[1], overallColor[2]);
  pdf.roundedRect(badgeX, y, badgeW, badgeH, 2, 2, "F");
  pdf.setFontSize(FONT_SIZE_SECTION);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text(cleanPdfText(overallLabel), PAGE_W / 2, y + badgeH / 2 + 1, { align: "center" });
  y += badgeH + 8;

  // Vector bar chart: section scores summary (Phase 1 criteria)
  y = ensureSpace(pdf, y, 45);
  y = drawVectorBarChart(
    pdf,
    MARGIN_X,
    y,
    CONTENT_W,
    "Puntaje por Criterio - Verificación Inicial",
    sectionScores.map((s, i) => ({
      ...s,
      color: i % 2 === 0 ? COLOR_DARK : ([59, 130, 246] as const),
    })),
    Math.max(...sectionScores.map((s) => s.max), 5),
  );

  // ─── Footer on all pages + page number correction ───
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    drawPageFooter(pdf);
  }
  correctPageNumbers(pdf);

  return pdf.output("blob");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function drawTextField(pdf: jsPDF, y: number, label: string, value: string): number {
  y = ensureSpace(pdf, y, 8);
  pdf.setFontSize(FONT_SIZE);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  pdf.text(`${cleanPdfText(label)}:`, MARGIN_X, y);
  y += 4;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(55, 65, 81);
  const lines = pdf.splitTextToSize(cleanPdfText(value), CONTENT_W);
  for (const line of lines) {
    y = ensureSpace(pdf, y, LINE_HEIGHT);
    pdf.text(line, MARGIN_X, y);
    y += LINE_HEIGHT;
  }
  return y + 3;
}

function toTitleCase(s: string): string {
  if (!s) return s;
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      // Keep common connectors lowercase, capitalize everything else
      const lower = ["de", "del", "la", "las", "el", "los", "y", "en", "da", "di", "van", "von"];
      if (lower.includes(word) && word.length <= 3) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function getTipoLabel(tipo: string): string {
  switch (tipo) {
    case "nuevo":
      return "NUEVO (Verificación Inicial)";
    case "seguimiento":
    case "reevaluacion":
      return "REEVALUACIÓN";
    default:
      return tipo;
  }
}

function formatDate(iso: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function computeTotalFromSecciones(secciones: FaseInicial["secciones"]): number {
  let total = 0;
  for (const section of CRITERIA_SECTIONS) {
    const sd = secciones[section.key as keyof typeof secciones] as any;
    if (section.multi) {
      const opts: string[] = sd?.opciones || [];
      for (const opt of opts) {
        total += section.options.find((o) => o.key === opt)?.puntos ?? 0;
      }
    } else {
      const opt = sd?.opcion;
      if (opt) {
        total += section.options.find((o) => o.key === opt)?.puntos ?? 0;
      }
    }
  }
  return total;
}

function classifyInicial(puntaje: number): string {
  if (puntaje >= 25) return "aprobado";
  if (puntaje >= 20) return "aprobado_supervision";
  return "no_aprobado";
}
