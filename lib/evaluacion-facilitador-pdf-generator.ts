/**
 * Evaluación de Facilitadores PDF generator (jsPDF-based).
 *
 * Generates the RG-CAP-004 document using jsPDF directly — no puppeteer/Chrome
 * needed. Layout matches the reference Excel form:
 *
 *  - Header: "EVALUACIÓN DE FACILITADORES COMO PROVEEDORES" + RG-CAP-004 code
 *  - Datos del Facilitador block
 *  - Phase 1: 6 criteria sections as tables (Criterio | Cumple | Ptos | %B | Obs.)
 *  - Phase 1 total + classification table
 *  - Phase 2 (if seguimiento): gestión items + resultados finales
 *  - Phase 3 (if reevaluación): per-OSI results table + classification
 *  - Footer: page numbers + date generated
 *
 * Uses manual rect/text/line drawing (no jspdf-autotable dependency).
 */

import jsPDF from "jspdf";
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
const MARGIN_TOP = 18;
const MARGIN_BOTTOM = 20;

// Colors
const COLOR_DARK = [12, 63, 105] as const; // brand dark blue
const COLOR_GRAY = [107, 114, 128] as const;
const COLOR_LIGHT_GRAY = [229, 231, 235] as const;
const COLOR_HEADER_BG = [243, 244, 246] as const;
const COLOR_VIOLET = [124, 58, 237] as const;

const FONT_SIZE = 8;
const FONT_SIZE_SMALL = 7;
const FONT_SIZE_TITLE = 13;
const FONT_SIZE_HEADING = 10;
const FONT_SIZE_SECTION = 9;
const LINE_HEIGHT = 4;

// ─── Helper: draw a table row ────────────────────────────────────────────────

interface CellSpec {
  text: string;
  width: number;
  align?: "left" | "center" | "right";
  bold?: boolean;
}

function drawTableRow(
  pdf: jsPDF,
  y: number,
  cells: CellSpec[],
  isHeader: boolean,
  rowHeight = 5,
): number {
  let x = MARGIN_X;
  for (const cell of cells) {
    // Background
    if (isHeader) {
      pdf.setFillColor(COLOR_HEADER_BG[0], COLOR_HEADER_BG[1], COLOR_HEADER_BG[2]);
      pdf.rect(x, y, cell.width, rowHeight, "F");
    }
    // Border
    pdf.setDrawColor(COLOR_LIGHT_GRAY[0], COLOR_LIGHT_GRAY[1], COLOR_LIGHT_GRAY[2]);
    pdf.setLineWidth(0.2);
    pdf.rect(x, y, cell.width, rowHeight, "S");
    // Text
    pdf.setFontSize(FONT_SIZE_SMALL);
    pdf.setFont("helvetica", cell.bold || isHeader ? "bold" : "normal");
    const textColor = isHeader ? COLOR_DARK : [55, 65, 81] as const;
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    const textY = y + rowHeight / 2 + 1;
    if (cell.align === "center") {
      pdf.text(cell.text, x + cell.width / 2, textY, { align: "center" });
    } else if (cell.align === "right") {
      pdf.text(cell.text, x + cell.width - 1, textY, { align: "right" });
    } else {
      pdf.text(cell.text, x + 1.5, textY);
    }
    x += cell.width;
  }
  return y + rowHeight;
}

// ─── Helper: ensure space, add page if needed ────────────────────────────────

function ensureSpace(pdf: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN_BOTTOM) {
    pdf.addPage();
    return MARGIN_TOP;
  }
  return y;
}

// ─── Helper: draw section heading ────────────────────────────────────────────

function drawSectionHeading(pdf: jsPDF, y: number, title: string): number {
  y = ensureSpace(pdf, y, 8);
  pdf.setFillColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  pdf.rect(MARGIN_X, y, CONTENT_W, 6, "F");
  pdf.setFontSize(FONT_SIZE_SECTION);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text(title, MARGIN_X + 2, y + 4);
  return y + 8;
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
  pdf.text(label, MARGIN_X + 1.5, y + 3.5);
  // Value cell
  pdf.setFillColor(255, 255, 255);
  pdf.rect(MARGIN_X + labelWidth, y, valueWidth, 5, "S");
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(55, 65, 81);
  const truncatedValue = pdf.splitTextToSize(value || "—", valueWidth - 3);
  pdf.text(truncatedValue[0] || "—", MARGIN_X + labelWidth + 1.5, y + 3.5);
  return y + 5;
}

// ─── Helper: draw footer on every page ───────────────────────────────────────

function drawFooter(pdf: jsPDF) {
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(FONT_SIZE_SMALL);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(COLOR_GRAY[0], COLOR_GRAY[1], COLOR_GRAY[2]);
    pdf.text(
      `RG-CAP-004 · Evaluación de Facilitadores`,
      MARGIN_X,
      PAGE_H - 8,
    );
    pdf.text(
      `Página ${i} de ${pageCount}`,
      PAGE_W - MARGIN_X,
      PAGE_H - 8,
      { align: "right" },
    );
    pdf.text(
      `Generado: ${new Date().toLocaleDateString("es-VE")}`,
      PAGE_W / 2,
      PAGE_H - 8,
      { align: "center" },
    );
  }
}

// ─── Main generator ──────────────────────────────────────────────────────────

export async function generateEvaluacionFacilitadorPdf(
  data: EvaluacionPdfData,
): Promise<Blob> {
  const pdf = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
  let y = MARGIN_TOP;

  // ─── Title ───
  pdf.setFontSize(FONT_SIZE_TITLE);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  pdf.text("EVALUACIÓN DE FACILITADORES COMO PROVEEDORES", PAGE_W / 2, y, {
    align: "center",
  });
  y += 6;
  pdf.setFontSize(FONT_SIZE_SMALL);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(COLOR_GRAY[0], COLOR_GRAY[1], COLOR_GRAY[2]);
  pdf.text("RG-CAP-004", PAGE_W / 2, y, { align: "center" });
  y += 6;

  // ─── Datos del Facilitador ───
  y = drawSectionHeading(pdf, y, "DATOS DEL FACILITADOR");
  const labelW = 50;
  const valueW = CONTENT_W - labelW;
  y = drawLabelValue(pdf, y, "Nombre y Apellido", data.facilitador_nombre || "—", labelW, valueW);
  y = drawLabelValue(pdf, y, "Cédula de Identidad", data.facilitador_cedula || "—", labelW, valueW);
  y = drawLabelValue(pdf, y, "RIF", data.facilitador_rif || "—", labelW, valueW);
  y = drawLabelValue(pdf, y, "Tipo de Proveedor", data.tipo_proveedor || "—", labelW, valueW);
  y = drawLabelValue(pdf, y, "Entrevista", data.entrevista || "—", labelW, valueW);
  y = drawLabelValue(pdf, y, "Evaluador", data.evaluador_nombre || "—", labelW, valueW);
  y = drawLabelValue(pdf, y, "Cargo del Evaluador", data.evaluador_cargo || "—", labelW, valueW);
  y = drawLabelValue(pdf, y, "Recomendado Por", data.recomendado_por || "—", labelW, valueW);
  y = drawLabelValue(pdf, y, "Tipo de Evaluación", getTipoLabel(data.tipo_evaluacion), labelW, valueW);
  y = drawLabelValue(pdf, y, "Fecha de Evaluación", formatDate(data.fecha_evaluacion), labelW, valueW);
  y += 4;

  // ─── Phase 1: Verificación Inicial ───
  y = drawSectionHeading(
    pdf,
    y,
    "VERIFICACIÓN INICIAL — ASPECTOS A EVALUAR",
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
  const colCriterio = CONTENT_W * 0.5;
  const colCumple = CONTENT_W * 0.1;
  const colPtos = CONTENT_W * 0.1;
  const colPct = CONTENT_W * 0.1;
  const colObs = CONTENT_W * 0.2;

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
      { text: "%B", width: colPct, align: "center" },
      { text: "Observaciones", width: colObs },
    ], true);

    // Option rows
    const sectionData = secciones[section.key as keyof typeof secciones] as any;
    const selectedOption = sectionData?.opcion;
    const selectedOptions: string[] = sectionData?.opciones || [];
    const sectionObs = sectionData?.observacion || "";

    for (const opt of section.options) {
      y = ensureSpace(pdf, y, 5);
      const isChecked = section.multi
        ? selectedOptions.includes(opt.key)
        : selectedOption === opt.key;
      y = drawTableRow(pdf, y, [
        { text: opt.label, width: colCriterio },
        { text: isChecked ? "X" : "", width: colCumple, align: "center", bold: isChecked },
        { text: String(opt.puntos), width: colPtos, align: "center" },
        { text: opt.pct != null ? String(opt.pct) : "—", width: colPct, align: "center" },
        { text: "", width: colObs },
      ], false);
    }

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
      pdf.setFillColor(221, 214, 254); // violet-100
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
    y = ensureSpace(pdf, y, 10);
    pdf.setFontSize(FONT_SIZE);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    pdf.text("Observaciones de la Verificación Inicial:", MARGIN_X, y);
    y += 4;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(55, 65, 81);
    const obsLines = pdf.splitTextToSize(data.observaciones, CONTENT_W);
    for (const line of obsLines) {
      y = ensureSpace(pdf, y, LINE_HEIGHT);
      pdf.text(line, MARGIN_X, y);
      y += LINE_HEIGHT;
    }
    y += 4;
  }

  // ─── Phase 2: Seguimiento ───
  if (data.tipo_evaluacion === "seguimiento" && data.fase_seguimiento) {
    y = drawSectionHeading(pdf, y, "EVALUACIÓN DE SEGUIMIENTO");
    const fs = data.fase_seguimiento as FaseSeguimiento;

    // Gestión items table
    y = ensureSpace(pdf, y, 6);
    pdf.setFontSize(FONT_SIZE);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(COLOR_VIOLET[0], COLOR_VIOLET[1], COLOR_VIOLET[2]);
    pdf.text("Gestión de Actividades y Compromiso (escala 1-5)", MARGIN_X, y);
    y += 4;

    const gCol1 = CONTENT_W * 0.8;
    const gCol2 = CONTENT_W * 0.2;
    y = drawTableRow(pdf, y, [
      { text: "Aspecto", width: gCol1 },
      { text: "Puntos", width: gCol2, align: "center" },
    ], true);

    const items = fs.gestion_actividades?.items || [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < GESTION_ITEMS.length; i++) {
      y = ensureSpace(pdf, y, 5);
      y = drawTableRow(pdf, y, [
        { text: GESTION_ITEMS[i].label, width: gCol1 },
        { text: String(items[i] || 0), width: gCol2, align: "center" },
      ], false);
    }
    // Total row
    const gestionTotal = items.reduce((s, v) => s + (v || 0), 0);
    y = ensureSpace(pdf, y, 5);
    y = drawTableRow(pdf, y, [
      { text: "TOTAL", width: gCol1, bold: true },
      { text: String(gestionTotal), width: gCol2, align: "center", bold: true },
    ], false);
    y += 4;

    // Resultados finales
    y = ensureSpace(pdf, y, 12);
    pdf.setFontSize(FONT_SIZE);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    pdf.text("Resultados Finales", MARGIN_X, y);
    y += 4;

    const docsPct = fs.docs_iniciales_pct ?? 0;
    const encPct = fs.encuestas_pct ?? 0;
    const gestPct = fs.gestion_actividades?.pct ?? 0;
    const totalPct = fs.total_pct ?? docsPct * 0.4 + encPct * 0.4 + gestPct * 0.2;

    y = drawLabelValue(pdf, y, "Documentación Inicial (40%)", `${(docsPct * 100).toFixed(1)}%`, 70, CONTENT_W - 70);
    y = drawLabelValue(pdf, y, "Encuestas de Satisfacción (40%)", `${(encPct * 100).toFixed(1)}%`, 70, CONTENT_W - 70);
    y = drawLabelValue(pdf, y, "Gestión de Actividades (20%)", `${(gestPct * 100).toFixed(1)}%`, 70, CONTENT_W - 70);
    y = ensureSpace(pdf, y, 6);
    pdf.setFillColor(COLOR_VIOLET[0], COLOR_VIOLET[1], COLOR_VIOLET[2]);
    pdf.rect(MARGIN_X, y, CONTENT_W, 6, "F");
    pdf.setFontSize(FONT_SIZE_SECTION);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text("TOTAL DE EVALUACIÓN DE SEGUIMIENTO", MARGIN_X + 2, y + 4);
    pdf.text(`${(totalPct * 100).toFixed(1)}%`, PAGE_W - MARGIN_X - 2, y + 4, {
      align: "right",
    });
    y += 8;

    // Text fields
    if (fs.observaciones) {
      y = drawTextField(pdf, y, "Observaciones", fs.observaciones);
    }
    if (fs.oportunidades_mejora) {
      y = drawTextField(pdf, y, "Oportunidades de Mejora", fs.oportunidades_mejora);
    }
    if (fs.metodologias) {
      y = drawTextField(pdf, y, "Metodologías Complementarias", fs.metodologias);
    }
  }

  // ─── Phase 3: Reevaluación ───
  if (data.tipo_evaluacion === "reevaluacion" && data.fase_reevaluacion) {
    y = drawSectionHeading(pdf, y, "REEVALUACIÓN DEL FACILITADOR");
    const fr = data.fase_reevaluacion as FaseReevaluacion;
    const osis = fr.osis || [];

    if (osis.length > 0) {
      // Table: Componente | OSI 1 | OSI 2 | OSI 3 | Resultado
      const numOsis = osis.length;
      const compW = CONTENT_W * 0.3;
      const osiW = (CONTENT_W * 0.5) / Math.max(numOsis, 1);
      const resW = CONTENT_W * 0.2;

      const headers: CellSpec[] = [
        { text: "Componente", width: compW },
      ];
      for (let i = 0; i < numOsis; i++) {
        headers.push({ text: `N° OSI`, width: osiW, align: "center" });
      }
      headers.push({ text: "Resultado", width: resW, align: "center" });
      y = drawTableRow(pdf, y, headers, true);

      // OSI numbers row
      const osiNumRow: CellSpec[] = [{ text: "N° OSI", width: compW, bold: true }];
      for (const o of osis) {
        osiNumRow.push({ text: o.nro_osi || "—", width: osiW, align: "center" });
      }
      osiNumRow.push({ text: "—", width: resW, align: "center" });
      y = drawTableRow(pdf, y, osiNumRow, false);

      // Data rows
      const rowData = [
        { label: "Documentación Inicial (40%)", key: "docs" as const },
        { label: "Encuestas de Satisfacción (40%)", key: "encuestas" as const },
        { label: "Gestión de Actividades (20%)", key: "gestion" as const },
      ];
      for (const row of rowData) {
        y = ensureSpace(pdf, y, 5);
        const cells: CellSpec[] = [{ text: row.label, width: compW }];
        for (const o of osis) {
          cells.push({
            text: `${(((o[row.key] as number) || 0) * 100).toFixed(1)}%`,
            width: osiW,
            align: "center",
          });
        }
        cells.push({ text: "—", width: resW, align: "center" });
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
      const avgTotal =
        osis.reduce((s, o) => s + (o.total || 0), 0) / osis.length;
      totalCells.push({
        text: `Prom: ${(avgTotal * 100).toFixed(1)}%`,
        width: resW,
        align: "center",
        bold: true,
      });
      y = drawTableRow(pdf, y, totalCells, false);
      y += 4;

      // Classification
      y = ensureSpace(pdf, y, 6);
      pdf.setFontSize(FONT_SIZE);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      pdf.text("Tabla de Clasificación de los Resultados de la Reevaluación", MARGIN_X, y);
      y += 4;

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
          pdf.setFillColor(254, 243, 199); // amber-100
          pdf.rect(MARGIN_X, y, CONTENT_W, 5, "F");
        }
        y = drawTableRow(pdf, y, [
          { text: row.rango, width: clsCol1, bold: isMatch },
          { text: row.resultado, width: clsCol2, bold: isMatch },
          { text: row.descripcion, width: clsCol3 },
        ], false);
      }
      y += 4;

      // Condición final
      y = drawLabelValue(
        pdf,
        y,
        "Condición después de la Reevaluación",
        fr.condicion === "aprobado"
          ? "APROBADO"
          : fr.condicion === "aprobado_supervision"
            ? "APROBADO BAJO SUPERVISIÓN"
            : fr.condicion === "no_aprobado"
              ? "NO APROBADO"
              : "—",
        70,
        CONTENT_W - 70,
      );
    }
  }

  // ─── Footer ───
  drawFooter(pdf);

  return pdf.output("blob");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function drawTextField(pdf: jsPDF, y: number, label: string, value: string): number {
  y = ensureSpace(pdf, y, 8);
  pdf.setFontSize(FONT_SIZE);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  pdf.text(`${label}:`, MARGIN_X, y);
  y += 4;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(55, 65, 81);
  const lines = pdf.splitTextToSize(value, CONTENT_W);
  for (const line of lines) {
    y = ensureSpace(pdf, y, LINE_HEIGHT);
    pdf.text(line, MARGIN_X, y);
    y += LINE_HEIGHT;
  }
  return y + 3;
}

function getTipoLabel(tipo: string): string {
  switch (tipo) {
    case "nuevo":
      return "NUEVO (Verificación Inicial)";
    case "seguimiento":
      return "SEGUIMIENTO";
    case "reevaluacion":
      return "REEVALUACIÓN";
    default:
      return tipo;
  }
}

function formatDate(iso: string): string {
  if (!iso) return "—";
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
