/**
 * Resumen de Facilitador PDF generator (jsPDF-based).
 *
 * Generates a clean, modern one-page summary intended to be shared
 * internally with the Negocios department. Layout:
 *  - Branded header bar (SHA blue #0c3f69) with title + "PRISMA · Capacitación".
 *  - Profile row: photo (left) + name/title/location/active pill (right).
 *  - Metrics strip: 4 bordered boxes (overall rating w/ vector stars,
 *    accreditation, OSIs executed, participants certified).
 *  - Course matrix table: course | nivel | rating | encuestas | OSIs,
 *    sorted by skill level then rating.
 *  - Contact line (email/phone).
 *  - Footer: "Generado por PRISMA Capacitación · {fecha} · Documento interno".
 *
 * No banner images — kept light and fast. Stars are drawn as vector polygons.
 */

import jsPDF from "jspdf";
import type { FacilitadorResumen } from "@/app/actions/facilitador-resumen";
import { toTitleCase } from "@/utils/string-utils";

// Letter page dimensions (mm)
const PAGE_W = 215.9;
const PAGE_H = 279.4;
const MARGIN_X = 16;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

// Brand colors
const SHA_BLUE: [number, number, number] = [12, 63, 105]; // #0c3f69
const ACCENT: [number, number, number] = [124, 58, 237]; // #7c3aed
const SLATE_50: [number, number, number] = [248, 250, 252];
const SLATE_200: [number, number, number] = [226, 232, 240];
const SLATE_400: [number, number, number] = [148, 163, 184];
const SLATE_500: [number, number, number] = [100, 116, 139];
const SLATE_600: [number, number, number] = [71, 85, 105];
const SLATE_700: [number, number, number] = [51, 65, 85];
const SLATE_900: [number, number, number] = [15, 23, 42];
const AMBER: [number, number, number] = [245, 158, 11]; // #f59e0b
const EMERALD: [number, number, number] = [5, 150, 105]; // #059669
const AMBER_DARK: [number, number, number] = [217, 119, 6]; // #d97706
const RED: [number, number, number] = [220, 38, 38]; // #dc2626
const WHITE: [number, number, number] = [255, 255, 255];

const PHOTO_SIZE = 26; // mm square

/**
 * Resolve the profile photo to a base64 data URL usable by jsPDF.addImage.
 * Returns null if no photo is available or fetch fails.
 */
async function resolvePhotoData(
  url: string | null,
): Promise<{ base64: string; format: string } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const isJpeg =
      url.toLowerCase().endsWith(".jpg") || url.toLowerCase().endsWith(".jpeg");
    const mime = isJpeg ? "jpeg" : "png";
    const base64 = `data:image/${mime};base64,${buf.toString("base64")}`;
    return { base64, format: isJpeg ? "JPEG" : "PNG" };
  } catch (err) {
    console.error("resolvePhotoData: fetch failed:", err);
    return null;
  }
}

/**
 * Draw a 5-pointed star (filled polygon) centered at (cx, cy).
 * outerR = outer radius, innerR = inner radius (typically ~0.4 * outerR).
 */
function drawStar(
  doc: jsPDF,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  fill: [number, number, number],
): void {
  const verts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    verts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  // Build relative line segments from the first vertex
  const lines: [number, number][] = [];
  for (let i = 1; i < verts.length; i++) {
    lines.push([verts[i][0] - verts[i - 1][0], verts[i][1] - verts[i - 1][1]]);
  }
  doc.setFillColor(fill[0], fill[1], fill[2]);
  doc.lines(lines, verts[0][0], verts[0][1], [1, 1], "F", true);
}

/**
 * Draw a row of 5 stars representing a rating (0-5).
 * Full stars filled amber, empty stars drawn as light slate.
 * Half values round up to a full star for the visual; the precise numeric
 * is rendered separately next to the stars.
 */
function drawStarRow(
  doc: jsPDF,
  cx: number,
  cy: number,
  rating: number,
  starR = 1.8,
  gap = 1.2,
): void {
  const full = Math.round(rating);
  const innerR = starR * 0.4;
  for (let i = 0; i < 5; i++) {
    const x = cx + i * (starR * 2 + gap);
    drawStar(doc, x, cy, starR, innerR, i < full ? AMBER : SLATE_200);
  }
}

/**
 * Draw a rounded rectangle (jsPDF rounded rect).
 */
function roundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: "F" | "S" | "FD" = "F",
): void {
  doc.roundedRect(x, y, w, h, r, r, style);
}

/**
 * Build the course matrix rows: merge temas_cursos with niveles_habilidad
 * and topic_ratings. Sorted by skill level (experto > intermedio > basico >
 * none) then rating desc then name asc — matches the profile drawer.
 */
interface CourseRow {
  topic: string;
  level: string | undefined;
  avgRating: number;
  reviewCount: number;
  sessionsCount: number;
}

function buildCourseMatrix(data: FacilitadorResumen): CourseRow[] {
  const niveles = data.niveles_habilidad || {};
  const levelForTopic = (topicName: string): string | undefined => {
    const matchKey = Object.keys(niveles).find(
      (k) => k.toLowerCase().trim() === topicName.toLowerCase().trim(),
    );
    return matchKey ? niveles[matchKey] : undefined;
  };
  const ratingForTopic = (topicName: string) => {
    const tr = data.topic_ratings.find(
      (t) => t.topic.toLowerCase().trim() === topicName.toLowerCase().trim(),
    );
    return tr || null;
  };

  const topics = (data.temas_cursos || []).map((topicName) => {
    const tr = ratingForTopic(topicName);
    return {
      topic: topicName,
      level: levelForTopic(topicName),
      avgRating: tr?.avg_rating || 0,
      reviewCount: tr?.review_count || 0,
      sessionsCount: tr?.sessions_count || 0,
    };
  });

  const rank = (lvl: string | undefined) =>
    lvl === "experto" ? 3 : lvl === "intermedio" ? 2 : lvl === "basico" ? 1 : 0;

  topics.sort((a, b) => {
    const lvlDiff = rank(b.level) - rank(a.level);
    if (lvlDiff !== 0) return lvlDiff;
    if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
    return a.topic.localeCompare(b.topic);
  });

  return topics;
}

const LEVEL_LABEL: Record<string, string> = {
  experto: "Experto",
  intermedio: "Intermedio",
  basico: "Básico",
};

function levelColor(level: string | undefined): [number, number, number] {
  switch (level) {
    case "experto":
      return EMERALD;
    case "intermedio":
      return AMBER_DARK;
    case "basico":
      return SLATE_600;
    default:
      return SLATE_400;
  }
}

function accreditationLabel(cond: string | null): {
  text: string;
  color: [number, number, number];
} {
  switch (cond) {
    case "aprobado":
    case "aceptable":
      return { text: "Aprobado", color: EMERALD };
    case "aprobado_supervision":
      return { text: "Bajo supervisión", color: AMBER_DARK };
    case "no_aprobado":
    case "no_aceptable":
      return { text: "No aprobado", color: RED };
    default:
      return { text: "Sin evaluación", color: SLATE_400 };
  }
}

/**
 * Generate the Resumen de Facilitador PDF and return it as a Blob.
 */
export async function generateResumenFacilitadorPdf(
  data: FacilitadorResumen,
): Promise<Blob> {
  const doc = new jsPDF({
    unit: "mm",
    format: "letter",
    orientation: "portrait",
  });

  let y = MARGIN_X;

  // --- Header bar ---
  const headerH = 14;
  doc.setFillColor(SHA_BLUE[0], SHA_BLUE[1], SHA_BLUE[2]);
  roundedRect(doc, MARGIN_X, y, CONTENT_W, headerH, 2, "F");
  // Accent underline
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(MARGIN_X, y + headerH, CONTENT_W, 0.8, "F");

  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Resumen de Facilitador", MARGIN_X + 5, y + headerH / 2 + 1.6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "PRISMA · Capacitación",
    PAGE_W - MARGIN_X - 5,
    y + headerH / 2 + 1.4,
    { align: "right" },
  );

  y += headerH + 6;

  // --- Profile row ---
  const photoData = await resolvePhotoData(data.foto_perfil_url);
  const photoX = MARGIN_X;
  const photoY = y;

  if (photoData) {
    try {
      doc.addImage(
        photoData.base64,
        photoData.format,
        photoX,
        photoY,
        PHOTO_SIZE,
        PHOTO_SIZE,
        undefined,
        "FAST",
      );
      doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
      doc.setLineWidth(0.3);
      doc.rect(photoX, photoY, PHOTO_SIZE, PHOTO_SIZE);
    } catch (err) {
      console.error("generateResumenFacilitadorPdf: photo embed failed:", err);
      drawInitialsBlock(doc, photoX, photoY, PHOTO_SIZE, data.nombre_apellido);
    }
  } else {
    drawInitialsBlock(doc, photoX, photoY, PHOTO_SIZE, data.nombre_apellido);
  }

  // Status dot on photo
  doc.setFillColor(
    data.is_active ? EMERALD[0] : RED[0],
    data.is_active ? EMERALD[1] : RED[1],
    data.is_active ? EMERALD[2] : RED[2],
  );
  doc.circle(photoX + PHOTO_SIZE - 2, photoY + 2, 2.2, "F");
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.circle(photoX + PHOTO_SIZE - 2, photoY + 2, 2.2, "S");
  doc.setFillColor(
    data.is_active ? EMERALD[0] : RED[0],
    data.is_active ? EMERALD[1] : RED[1],
    data.is_active ? EMERALD[2] : RED[2],
  );
  doc.circle(photoX + PHOTO_SIZE - 2, photoY + 2, 1.8, "F");

  // Name + title + location to the right of the photo
  const textX = photoX + PHOTO_SIZE + 6;
  const textW = PAGE_W - MARGIN_X - textX;
  const nombre = toTitleCase(data.nombre_apellido || "");

  doc.setTextColor(SLATE_900[0], SLATE_900[1], SLATE_900[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const nameLines = doc.splitTextToSize(nombre, textW);
  let textY = photoY + 5.5;
  for (const line of nameLines.slice(0, 2)) {
    doc.text(line, textX, textY);
    textY += 6.5;
  }

  if (data.titulo_profesional) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(SLATE_600[0], SLATE_600[1], SLATE_600[2]);
    const titleLines = doc.splitTextToSize(data.titulo_profesional, textW);
    for (const line of titleLines.slice(0, 2)) {
      doc.text(line, textX, textY);
      textY += 4.6;
    }
  }

  // Location + reach + active pill line
  doc.setFontSize(9);
  doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
  const locParts: string[] = [];
  if (data.ciudad_nombre) locParts.push(data.ciudad_nombre);
  if (data.estado_nombre) locParts.push(data.estado_nombre);
  const locText = locParts.length ? locParts.join(", ") : "Ubicación no especificada";
  doc.text(locText, textX, textY);

  // Active/inactive pill (right side of the location line)
  const pillText = data.is_active ? "Activo" : "Inactivo";
  const pillW = 16;
  const pillH = 4.5;
  const pillX = textX + textW - pillW;
  const pillY = textY - 3.6;
  doc.setFillColor(
    data.is_active ? EMERALD[0] : RED[0],
    data.is_active ? EMERALD[1] : RED[1],
    data.is_active ? EMERALD[2] : RED[2],
  );
  roundedRect(doc, pillX, pillY, pillW, pillH, 2, "F");
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(pillText, pillX + pillW / 2, pillY + 3.1, { align: "center" });

  textY += 5;

  // Reach badge if present
  if (data.alcance) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(SLATE_600[0], SLATE_600[1], SLATE_600[2]);
    doc.text(`Alcance: ${data.alcance}`, textX, textY);
    textY += 4.5;
  }

  // Ensure y is below the photo block
  y = Math.max(photoY + PHOTO_SIZE, textY) + 6;

  // --- Metrics strip (4 boxes) ---
  const boxGap = 3;
  const boxW = (CONTENT_W - boxGap * 3) / 4;
  const boxH = 18;
  const boxY = y;

  const drawMetricBox = (
    x: number,
    label: string,
    drawValue: (vx: number, vy: number) => void,
  ) => {
    doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
    doc.setLineWidth(0.2);
    doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
    roundedRect(doc, x, boxY, boxW, boxH, 1.5, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
    doc.text(label, x + boxW / 2, boxY + 4.5, { align: "center" });
    drawValue(x + boxW / 2, boxY + boxH / 2 + 2);
  };

  // Box 1: Overall rating (stars + numeric)
  drawMetricBox(MARGIN_X + 0 * (boxW + boxGap), "Rating de Encuestas", (vx, vy) => {
    if (data.overall_rating > 0) {
      const starR = 1.6;
      const totalW = 5 * starR * 2 + 4 * 1;
      const startX = vx - totalW / 2 + starR;
      drawStarRow(doc, startX, vy - 2.5, data.overall_rating, starR, 1);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(SLATE_900[0], SLATE_900[1], SLATE_900[2]);
      doc.text(`${data.overall_rating.toFixed(1)} / 5`, vx, vy + 4, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(SLATE_400[0], SLATE_400[1], SLATE_400[2]);
      doc.text(`${data.review_count} encuestas`, vx, vy + 7, {
        align: "center",
      });
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(SLATE_400[0], SLATE_400[1], SLATE_400[2]);
      doc.text("—", vx, vy + 1, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text("Sin encuestas", vx, vy + 5, { align: "center" });
    }
  });

  // Box 2: Accreditation
  drawMetricBox(MARGIN_X + 1 * (boxW + boxGap), "Acreditación RG-CAP-004", (vx, vy) => {
    const acc = accreditationLabel(data.evaluacion_condicion);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(acc.color[0], acc.color[1], acc.color[2]);
    const lines = doc.splitTextToSize(acc.text, boxW - 4);
    let ly = vy - ((lines.length - 1) * 4) / 2;
    for (const line of lines) {
      doc.text(line, vx, ly, { align: "center" });
      ly += 4;
    }
    if (data.evaluacion_porcentaje != null) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(SLATE_400[0], SLATE_400[1], SLATE_400[2]);
      doc.text(`${Number(data.evaluacion_porcentaje).toFixed(0)}%`, vx, vy + 6, {
        align: "center",
      });
    }
  });

  // Box 3: OSIs executed
  drawMetricBox(MARGIN_X + 2 * (boxW + boxGap), "Servicios (OSIs)", (vx, vy) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(SLATE_900[0], SLATE_900[1], SLATE_900[2]);
    doc.text(String(data.total_osis), vx, vy, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(SLATE_400[0], SLATE_400[1], SLATE_400[2]);
    doc.text("ejecutadas", vx, vy + 4.5, { align: "center" });
  });

  // Box 4: Participants certified
  drawMetricBox(MARGIN_X + 3 * (boxW + boxGap), "Participantes", (vx, vy) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(SLATE_900[0], SLATE_900[1], SLATE_900[2]);
    doc.text(String(data.total_certificados), vx, vy, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(SLATE_400[0], SLATE_400[1], SLATE_400[2]);
    doc.text("certificados", vx, vy + 4.5, { align: "center" });
  });

  y = boxY + boxH + 4;

  // Year joined caption
  if (data.ano_ingreso) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(SLATE_400[0], SLATE_400[1], SLATE_400[2]);
    doc.text(`Facilitador desde ${data.ano_ingreso}`, MARGIN_X, y);
  }
  y += 6;

  // --- Course matrix table ---
  const matrix = buildCourseMatrix(data);
  const tableX = MARGIN_X;
  const tableW = CONTENT_W;
  // Column widths (mm): Curso | Nivel | Rating | Encuestas | OSIs
  const colW = [tableW * 0.46, tableW * 0.18, tableW * 0.14, tableW * 0.12, tableW * 0.10];
  const colX = [tableX];
  for (let i = 0; i < colW.length - 1; i++) colX.push(colX[i] + colW[i]);
  const headers = ["Curso / Tema", "Nivel", "Rating", "Encuestas", "OSIs"];
  const rowH = 7;
  const headerH2 = 8;

  // Section title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(SLATE_700[0], SLATE_700[1], SLATE_700[2]);
  doc.text("Cursos y Temas que Dicta", tableX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(SLATE_400[0], SLATE_400[1], SLATE_400[2]);
  doc.text(
    `${matrix.length} tema${matrix.length === 1 ? "" : "s"}`,
    tableX + tableW,
    y,
    { align: "right" },
  );
  y += 4;

  const tableTop = y;

  // Header row
  doc.setFillColor(SHA_BLUE[0], SHA_BLUE[1], SHA_BLUE[2]);
  doc.rect(tableX, tableTop, tableW, headerH2, "F");
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  for (let i = 0; i < headers.length; i++) {
    const align = i === 0 ? "left" : "center";
    const tx = align === "left" ? colX[i] + 3 : colX[i] + colW[i] / 2;
    doc.text(headers[i], tx, tableTop + headerH2 / 2 + 1.2, {
      align: align as "left" | "center",
    });
  }

  let rowY = tableTop + headerH2;
  const contentBottomY = PAGE_H - 22; // leave room for footer

  if (matrix.length === 0) {
    doc.setFillColor(SLATE_50[0], SLATE_50[1], SLATE_50[2]);
    doc.rect(tableX, rowY, tableW, rowH, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(SLATE_400[0], SLATE_400[1], SLATE_400[2]);
    doc.text("Sin temas asignados", tableX + tableW / 2, rowY + rowH / 2 + 1, {
      align: "center",
    });
    rowY += rowH;
  } else {
    for (let r = 0; r < matrix.length; r++) {
      const row = matrix[r];

      // Page break
      if (rowY + rowH > contentBottomY) {
        doc.addPage();
        // Re-draw header on new page
        doc.setFillColor(SHA_BLUE[0], SHA_BLUE[1], SHA_BLUE[2]);
        doc.rect(tableX, MARGIN_X, tableW, headerH2, "F");
        doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        for (let i = 0; i < headers.length; i++) {
          const align = i === 0 ? "left" : "center";
          const tx = align === "left" ? colX[i] + 3 : colX[i] + colW[i] / 2;
          doc.text(headers[i], tx, MARGIN_X + headerH2 / 2 + 1.2, {
            align: align as "left" | "center",
          });
        }
        rowY = MARGIN_X + headerH2;
      }

      // Row background (zebra)
      if (r % 2 === 1) {
        doc.setFillColor(SLATE_50[0], SLATE_50[1], SLATE_50[2]);
        doc.rect(tableX, rowY, tableW, rowH, "F");
      }

      // Curso / Tema
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(SLATE_700[0], SLATE_700[1], SLATE_700[2]);
      const topicLines = doc.splitTextToSize(row.topic, colW[0] - 6);
      doc.text(topicLines[0] || "", colX[0] + 3, rowY + rowH / 2 + 1);

      // Nivel
      const lc = levelColor(row.level);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(lc[0], lc[1], lc[2]);
      doc.text(
        row.level ? LEVEL_LABEL[row.level] || "—" : "Sin nivel",
        colX[1] + colW[1] / 2,
        rowY + rowH / 2 + 1,
        { align: "center" },
      );

      // Rating
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      if (row.avgRating > 0) {
        doc.setTextColor(AMBER_DARK[0], AMBER_DARK[1], AMBER_DARK[2]);
        doc.text(
          `★ ${row.avgRating.toFixed(1)}`,
          colX[2] + colW[2] / 2,
          rowY + rowH / 2 + 1,
          { align: "center" },
        );
      } else {
        doc.setTextColor(SLATE_400[0], SLATE_400[1], SLATE_400[2]);
        doc.text("—", colX[2] + colW[2] / 2, rowY + rowH / 2 + 1, {
          align: "center",
        });
      }

      // Encuestas
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(SLATE_600[0], SLATE_600[1], SLATE_600[2]);
      doc.text(
        String(row.reviewCount),
        colX[3] + colW[3] / 2,
        rowY + rowH / 2 + 1,
        { align: "center" },
      );

      // OSIs
      doc.text(
        String(row.sessionsCount),
        colX[4] + colW[4] / 2,
        rowY + rowH / 2 + 1,
        { align: "center" },
      );

      rowY += rowH;
    }
  }

  // Table border
  doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
  doc.setLineWidth(0.2);
  doc.rect(tableX, tableTop, tableW, rowY - tableTop, "S");

  y = rowY + 6;

  // --- Contact line ---
  const contactParts: string[] = [];
  if (data.email) contactParts.push(data.email);
  if (data.telefono) contactParts.push(data.telefono);
  if (contactParts.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
    doc.text(`Contacto: ${contactParts.join("  ·  ")}`, MARGIN_X, y);
    y += 5;
  }

  // --- Footer ---
  const footerY = PAGE_H - 14;
  doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, footerY, PAGE_W - MARGIN_X, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(SLATE_400[0], SLATE_400[1], SLATE_400[2]);
  const fecha = new Date().toLocaleDateString("es-VE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  doc.text(
    `Generado por PRISMA Capacitación · ${fecha} · Documento interno para Negocios`,
    PAGE_W / 2,
    footerY + 4.5,
    { align: "center" },
  );

  return doc.output("blob");
}

/**
 * Draw a gradient initials block as a photo fallback.
 */
function drawInitialsBlock(
  doc: jsPDF,
  x: number,
  y: number,
  size: number,
  name: string,
): void {
  doc.setFillColor(SHA_BLUE[0], SHA_BLUE[1], SHA_BLUE[2]);
  doc.rect(x, y, size, size, "F");
  const initials = (name || "F")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(initials, x + size / 2, y + size / 2 + 3, { align: "center" });
  doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
  doc.setLineWidth(0.3);
  doc.rect(x, y, size, size);
}


