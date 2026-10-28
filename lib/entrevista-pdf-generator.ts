import jsPDF from "jspdf";
import fs from "fs";
import path from "path";
import type {
  FacilitadorEntrevista,
  UltimoCursoTiempo,
  ManejoHerramientasAudiovisuales,
  CaracteristicaEsencial,
} from "@/types/entrevistas-facilitadores";
import { DEFAULT_EVALUACION_ITEMS } from "@/types/entrevistas-facilitadores";

// Letter dimensions in mm
const PAGE_W = 215.9;
const PAGE_H = 279.4;
const MARGIN_X = 12;
const CONTENT_W = PAGE_W - MARGIN_X * 2; // 191.9 mm
const MAX_CONTENT_Y = PAGE_H - 14;

const _imageCache = new Map<string, string>();

function getImageBase64(filename: string): string {
  if (_imageCache.has(filename)) return _imageCache.get(filename)!;
  try {
    const imgPath = path.join(process.cwd(), "public", filename);
    if (!fs.existsSync(imgPath)) return "";
    const result = `data:image/png;base64,${fs.readFileSync(imgPath).toString("base64")}`;
    _imageCache.set(filename, result);
    return result;
  } catch {
    return "";
  }
}

function cleanText(val: string | null | undefined): string {
  if (!val) return "";
  return String(val).trim();
}

function cleanSingleLine(val: string | null | undefined): string {
  if (!val) return "";
  return String(val).replace(/\s+/g, " ").trim();
}

function formatTiempoCurso(val: UltimoCursoTiempo | null | undefined): string {
  if (val === "6_meses") return "6 Meses";
  if (val === "12_meses") return "12 Meses";
  if (val === "mas_12_meses") return "+ de 12 Meses";
  return "";
}

function formatManejoHerramientas(val: ManejoHerramientasAudiovisuales | null | undefined): string {
  if (val === "totalmente") return "Totalmente";
  if (val === "con_limitacion") return "Con limitación";
  if (val === "en_aprendizaje") return "En aprendizaje";
  if (val === "no_se_manejarlos") return "No sé manejarlos";
  return "";
}

function formatCaracteristica(val: CaracteristicaEsencial | string | null | undefined): string {
  if (val === "empatia") return "Empatía";
  if (val === "introversion") return "Introversión";
  if (val === "autoritarismo") return "Autoritarismo";
  if (val === "indiferencia") return "Indiferencia";
  return cleanText(val);
}

const DOCS_LIST = [
  { key: "doc_resumen_curricular", label: "Resumen Curricular" },
  { key: "doc_cedula_identidad", label: "Cédula de Identidad" },
  { key: "doc_soportes_resumen_curricular", label: "Soportes de Resumen Curricular" },
  { key: "doc_rif_actualizado", label: "Copia de R.I.F. Actualizado" },
  { key: "doc_registro_inpsasel", label: "Certificado de Registro INPSASEL" },
  { key: "doc_factura_fiscal", label: "Factura Fiscal (Si Aplica)" },
  { key: "doc_titulo_universitario", label: "Fondo Negro de Título Universitario" },
  { key: "doc_declaracion_islr", label: "Declaración I.S.L.R. (Si Aplica)" },
  { key: "doc_formacion_docente", label: "Certificado de Formación Docente" },
  { key: "doc_posee_laptop", label: "Posee Laptop" },
];

function drawPageHeader(doc: jsPDF, pageNum: number, totalPages = 2) {
  const y = 8;
  const logoB64 = getImageBase64("logo.png");
  if (logoB64) {
    try {
      doc.addImage(logoB64, "PNG", MARGIN_X, y, 28, 11, undefined, "FAST");
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("SHA VENEZUELA", MARGIN_X, y + 6);
    }
  }

  // Centered Header Text
  const cx = PAGE_W / 2;
  doc.setTextColor(75, 85, 99);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("SHA DE VENEZUELA, C.A.", cx, y + 4, { align: "center" });

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(11);
  doc.text("FORMATO DE ENTREVISTA FACILITADOR", cx, y + 9, { align: "center" });

  // Page number
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`PÁGINA: ${pageNum} de ${totalPages}`, MARGIN_X + CONTENT_W, y + 7, { align: "right" });

  // Border bottom under header
  doc.setDrawColor(31, 41, 55);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, y + 13, MARGIN_X + CONTENT_W, y + 13);
}

/**
 * Helper to split multi-line text (preserving explicit user line breaks and wrapping long lines)
 */
function wrapMultilineText(doc: jsPDF, text: string, maxWidth: number): string[] {
  if (!text) return [];
  const paragraphs = text.split(/\r?\n/);
  const result: string[] = [];
  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    const wrapped = doc.splitTextToSize(trimmed, maxWidth) as string[];
    result.push(...wrapped);
  }
  return result;
}

export async function generateEntrevistaPdf(
  entrevista: FacilitadorEntrevista
): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
    compress: true,
  });

  // =========================================================================
  // PÁGINA 1
  // =========================================================================
  let curY = 24;

  const drawSectionTitle = (title: string, yPos: number, height = 5.5) => {
    doc.setFillColor(229, 231, 235); // gray-200
    doc.setDrawColor(31, 41, 55);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN_X, yPos, CONTENT_W, height, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(17, 24, 39);
    doc.text(title, MARGIN_X + 2.5, yPos + 3.8);
    return yPos + height;
  };

  // 1. DATOS DEL ASPIRANTE
  curY = drawSectionTitle("DATOS DEL ASPIRANTE", curY);

  // Row 1: Nombre (125mm) | C.I. (66.9mm)
  const r1H = 6.5;
  doc.setFillColor(255, 255, 255);
  doc.rect(MARGIN_X, curY, 125, r1H, "D");
  doc.rect(MARGIN_X + 125, curY, 66.9, r1H, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 39);
  doc.text("NOMBRE Y APELLIDO:", MARGIN_X + 2, curY + 4.5);
  doc.setFont("helvetica", "normal");
  const nombreStr = doc.splitTextToSize(
    cleanSingleLine(entrevista.nombre_apellido).toUpperCase(),
    88
  )[0] || "";
  doc.text(nombreStr, MARGIN_X + 34, curY + 4.5);

  doc.setFont("helvetica", "bold");
  doc.text("C.I. NRO:", MARGIN_X + 127, curY + 4.5);
  doc.setFont("helvetica", "normal");
  doc.text(cleanSingleLine(entrevista.cedula), MARGIN_X + 142, curY + 4.5);
  curY += r1H;

  // Row 2: Dirección (65mm) | Teléfono (50mm) | Email (76.9mm)
  // Dynamic height if address or email wraps to 2 lines
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  const dirLines = wrapMultilineText(doc, cleanSingleLine(entrevista.direccion), 43).slice(0, 2);
  const emailLines = wrapMultilineText(doc, cleanSingleLine(entrevista.email), 61).slice(0, 2);
  const maxR2Lines = Math.max(dirLines.length, emailLines.length, 1);
  const r2H = maxR2Lines > 1 ? 9.5 : 6.5;

  doc.rect(MARGIN_X, curY, 65, r2H, "D");
  doc.rect(MARGIN_X + 65, curY, 50, r2H, "D");
  doc.rect(MARGIN_X + 115, curY, 76.9, r2H, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text("DIRECCIÓN:", MARGIN_X + 2, curY + 4.3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  dirLines.forEach((line, idx) => {
    doc.text(line, MARGIN_X + 20, curY + 4.3 + idx * 3.2);
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text("TELÉFONO:", MARGIN_X + 67, curY + 4.3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(cleanSingleLine(entrevista.telefono), MARGIN_X + 85, curY + 4.3);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text("EMAIL:", MARGIN_X + 117, curY + 4.3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  emailLines.forEach((line, idx) => {
    doc.text(line, MARGIN_X + 128, curY + 4.3 + idx * 3.2);
  });
  doc.setFontSize(7.5);
  curY += r2H;

  // Row 3: Vehículo (64mm) | Laptop (64mm) | Viajar (63.9mm)
  const r3H = 6;
  doc.setFillColor(249, 250, 251);
  doc.rect(MARGIN_X, curY, 64, r3H, "FD");
  doc.rect(MARGIN_X + 64, curY, 64, r3H, "FD");
  doc.rect(MARGIN_X + 128, curY, 63.9, r3H, "FD");

  doc.setFont("helvetica", "bold");
  doc.text("POSEE VEHÍCULO:", MARGIN_X + 2, curY + 4);
  doc.setFont("helvetica", "normal");
  doc.text(entrevista.posee_vehiculo ? "( X ) SI   (   ) NO" : "(   ) SI   (   ) NO", MARGIN_X + 32, curY + 4);

  doc.setFont("helvetica", "bold");
  doc.text("POSEE LAPTOP:", MARGIN_X + 66, curY + 4);
  doc.setFont("helvetica", "normal");
  doc.text(entrevista.posee_laptop ? "( X ) SI   (   ) NO" : "(   ) SI   (   ) NO", MARGIN_X + 93, curY + 4);

  doc.setFont("helvetica", "bold");
  doc.text("DISPONIBILIDAD VIAJAR:", MARGIN_X + 130, curY + 4);
  doc.setFont("helvetica", "normal");
  doc.text(entrevista.disponibilidad_viajar ? "( X ) SI   (   ) NO" : "(   ) SI   (   ) NO", MARGIN_X + 168, curY + 4);
  curY += r3H + 2.5;

  // 2. NIVEL EDUCATIVO
  curY = drawSectionTitle("1. NIVEL EDUCATIVO (DESCRIBA EL ÁREA AL CUAL APLIQUE)", curY);

  const tiempoUltimoCursoStr = formatTiempoCurso(entrevista.ultimo_curso_tiempo);
  const descUltimoCurso = cleanSingleLine(entrevista.ultimo_curso_descripcion);
  const ultimoCursoCombinado = tiempoUltimoCursoStr
    ? `${tiempoUltimoCursoStr}${descUltimoCurso ? ` - ${descUltimoCurso}` : ""}`
    : descUltimoCurso;

  const eduRows = [
    { label: "NIVEL TÉCNICO:", val: cleanSingleLine(entrevista.nivel_tecnico) },
    { label: "UNIVERSITARIO:", val: cleanSingleLine(entrevista.universitario) },
    { label: "ESPECIALIZACIÓN:", val: cleanSingleLine(entrevista.posee_especializacion) },
    { label: "ÚLTIMO CURSO REALIZADO:", val: ultimoCursoCombinado },
    { label: "HERRAMIENTAS AUDIOVISUALES:", val: formatManejoHerramientas(entrevista.manejo_herramientas_audiovisuales) },
  ];

  for (const er of eduRows) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const valLines = wrapMultilineText(doc, er.val, CONTENT_W - 50).slice(0, 2);
    const eH = valLines.length > 1 ? 8.8 : 6;
    doc.setFillColor(255, 255, 255);
    doc.rect(MARGIN_X, curY, CONTENT_W, eH, "D");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(17, 24, 39);
    doc.text(er.label, MARGIN_X + 2, curY + 4.1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    valLines.forEach((line, idx) => {
      doc.text(line, MARGIN_X + 48, curY + 4.1 + idx * 3.3);
    });
    curY += eH;
  }
  curY += 2.5;

  // 3. DOCUMENTOS CONSIGNADOS
  curY = drawSectionTitle("2. DOCUMENTOS CONSIGNADOS", curY);

  // Table header
  const thH = 5.5;
  doc.setFillColor(243, 244, 246);
  doc.rect(MARGIN_X, curY, 12, thH, "FD");
  doc.rect(MARGIN_X + 12, curY, 110, thH, "FD");
  doc.rect(MARGIN_X + 122, curY, 35, thH, "FD");
  doc.rect(MARGIN_X + 157, curY, 34.9, thH, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("N°", MARGIN_X + 6, curY + 3.8, { align: "center" });
  doc.text("DOCUMENTO", MARGIN_X + 15, curY + 3.8);
  doc.text("CONSIGNADO", MARGIN_X + 139.5, curY + 3.8, { align: "center" });
  doc.text("OBSERVACIONES", MARGIN_X + 174.4, curY + 3.8, { align: "center" });
  curY += thH;

  // 10 Document rows
  DOCS_LIST.forEach((docItem, idx) => {
    const isChecked = Boolean(entrevista[docItem.key as keyof FacilitadorEntrevista]);
    const rowH = 5.2;

    doc.setFillColor(idx % 2 === 0 ? 255 : 249, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 251);
    doc.rect(MARGIN_X, curY, 12, rowH, "FD");
    doc.rect(MARGIN_X + 12, curY, 110, rowH, "FD");
    doc.rect(MARGIN_X + 122, curY, 35, rowH, "FD");
    doc.rect(MARGIN_X + 157, curY, 34.9, rowH, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(String(idx + 1), MARGIN_X + 6, curY + 3.6, { align: "center" });
    doc.text(docItem.label, MARGIN_X + 15, curY + 3.6);

    const markStr = isChecked ? "( X ) SI   (   ) NO" : "(   ) SI   ( X ) NO";
    doc.text(markStr, MARGIN_X + 139.5, curY + 3.6, { align: "center" });
    curY += rowH;
  });

  // =========================================================================
  // PÁGINA 2
  // =========================================================================
  doc.addPage("letter", "portrait");
  curY = 24;

  const ensureSpace = (neededH: number) => {
    if (curY + neededH > MAX_CONTENT_Y) {
      doc.addPage("letter", "portrait");
      curY = 24;
    }
  };

  // 4. CONOCIMIENTO Y DESTREZAS DEL FACILITADOR (6 checklist items)
  curY = drawSectionTitle("3. CONOCIMIENTO Y DESTREZAS DEL FACILITADOR", curY);

  // Table header
  const thH2 = 5.5;
  doc.setFillColor(243, 244, 246);
  doc.rect(MARGIN_X, curY, 8, thH2, "FD");
  doc.rect(MARGIN_X + 8, curY, 95, thH2, "FD");
  doc.rect(MARGIN_X + 103, curY, 18, thH2, "FD");
  doc.rect(MARGIN_X + 121, curY, 18, thH2, "FD");
  doc.rect(MARGIN_X + 139, curY, 18, thH2, "FD");
  doc.rect(MARGIN_X + 157, curY, 34.9, thH2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.text("N°", MARGIN_X + 4, curY + 3.8, { align: "center" });
  doc.text("ÍTEMS A EVALUAR", MARGIN_X + 11, curY + 3.8);
  doc.text("CUMPLE", MARGIN_X + 112, curY + 3.8, { align: "center" });
  doc.text("PARCIAL", MARGIN_X + 130, curY + 3.8, { align: "center" });
  doc.text("NO CUMPLE", MARGIN_X + 148, curY + 3.8, { align: "center" });
  doc.text("OBSERVACIÓN", MARGIN_X + 174.4, curY + 3.8, { align: "center" });
  curY += thH2;

  // 6 Evaluation rows from DEFAULT_EVALUACION_ITEMS
  DEFAULT_EVALUACION_ITEMS.forEach((defItem, idx) => {
    const item = Array.isArray(entrevista.evaluacion_items)
      ? entrevista.evaluacion_items.find((i) => i.item_nro === defItem.item_nro)
      : undefined;

    const isCumple = item?.cumplimiento === "cumple";
    const isParcial = item?.cumplimiento === "cumple_parcial";
    const isNoCumple = item?.cumplimiento === "no_cumple";
    const obs = cleanSingleLine(item?.observacion);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    const obsLines = wrapMultilineText(doc, obs, 31).slice(0, 2);
    const rowH = obsLines.length > 1 ? 8 : 5.2;

    doc.setFillColor(idx % 2 === 0 ? 255 : 249, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 251);
    doc.rect(MARGIN_X, curY, 8, rowH, "FD");
    doc.rect(MARGIN_X + 8, curY, 95, rowH, "FD");
    doc.rect(MARGIN_X + 103, curY, 18, rowH, "FD");
    doc.rect(MARGIN_X + 121, curY, 18, rowH, "FD");
    doc.rect(MARGIN_X + 139, curY, 18, rowH, "FD");
    doc.rect(MARGIN_X + 157, curY, 34.9, rowH, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.text(String(defItem.item_nro), MARGIN_X + 4, curY + 3.6, { align: "center" });
    doc.text(defItem.criterio, MARGIN_X + 10, curY + 3.6);

    doc.text(isCumple ? "( X )" : "(   )", MARGIN_X + 112, curY + 3.6, { align: "center" });
    doc.text(isParcial ? "( X )" : "(   )", MARGIN_X + 130, curY + 3.6, { align: "center" });
    doc.text(isNoCumple ? "( X )" : "(   )", MARGIN_X + 148, curY + 3.6, { align: "center" });

    doc.setFontSize(6.3);
    obsLines.forEach((line, lIdx) => {
      doc.text(line, MARGIN_X + 158.5, curY + 3.5 + lIdx * 3);
    });
    curY += rowH;
  });
  curY += 2.5;

  // 5. PREGUNTAS AL FACILITADOR
  ensureSpace(18);
  curY = drawSectionTitle("4. PREGUNTAS AL FACILITADOR", curY);

  const questions = [
    {
      q: "Nombre al menos 2 retos que ha tenido que enfrentar como facilitador:",
      a: cleanText(entrevista.retos_facilitador),
    },
    {
      q: "Nombre al menos 2 logros que ha alcanzado en alguna actividad de formación:",
      a: cleanText(entrevista.logros_formacion),
    },
    {
      q: "¿Cuál característica considera esencial para un facilitador con público heterogéneo?:",
      a: formatCaracteristica(entrevista.caracteristica_esencial),
    },
    {
      q: "¿Por qué debemos contratarte? / Argumentos clave del aspirante:",
      a: cleanText(entrevista.por_que_contratarte || entrevista.ejemplo_liderazgo),
    },
  ];

  const lineSpacing = 3.4;

  for (const qItem of questions) {
    const valText = qItem.a || "No especificado";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const wrappedAns = wrapMultilineText(doc, valText, CONTENT_W - 8);
    const ansLines = wrappedAns.length > 0 ? wrappedAns : ["No especificado"];

    // Dynamic box height: 5.2mm for question header + 3.4mm per answer line + 2.2mm bottom padding
    const qH = Math.max(9.5, 5.4 + ansLines.length * lineSpacing + 1.8);
    ensureSpace(qH + 2);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(31, 41, 55);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN_X, curY, CONTENT_W, qH, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(17, 24, 39);
    doc.text(qItem.q, MARGIN_X + 2, curY + 3.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.9);
    doc.setTextColor(31, 41, 55);
    ansLines.forEach((line, idx) => {
      doc.text(line, MARGIN_X + 4, curY + 7.4 + idx * lineSpacing);
    });

    curY += qH;
  }
  curY += 2.5;

  // Temas a impartir (si existen) — dynamic multi-line height so all topics fit inside box
  if (Array.isArray(entrevista.temas_capacidades) && entrevista.temas_capacidades.length > 0) {
    const temasStr = entrevista.temas_capacidades.join(", ");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    const temasLines = wrapMultilineText(doc, temasStr, CONTENT_W - 8);
    const tH = Math.max(8.5, 5.2 + temasLines.length * 3.3 + 1.8);
    ensureSpace(tH + 3);

    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(31, 41, 55);
    doc.rect(MARGIN_X, curY, CONTENT_W, tH, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(17, 24, 39);
    doc.text("TEMAS / CAPACIDADES A IMPARTIR:", MARGIN_X + 2, curY + 3.6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.7);
    temasLines.forEach((line, idx) => {
      doc.text(line, MARGIN_X + 4, curY + 7.0 + idx * 3.3);
    });
    curY += tH + 2.5;
  }

  // 6. EVALUACIÓN Y DECISIÓN DE LA ENTREVISTA
  const obsText = cleanText(entrevista.observaciones) || "Sin observaciones adicionales registradas.";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.9);
  const obsLines = wrapMultilineText(doc, obsText, CONTENT_W - 8);
  const obsH = Math.max(13, 5.5 + obsLines.length * 3.4 + 2);
  const decH = 6.5;
  const sigH = 22;

  ensureSpace(5.5 + obsH + decH + sigH + 2);
  curY = drawSectionTitle("5. EVALUACIÓN Y DECISIÓN DE LA ENTREVISTA", curY);

  // Observaciones
  doc.setFillColor(255, 255, 255);
  doc.rect(MARGIN_X, curY, CONTENT_W, obsH, "D");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("OBSERVACIONES:", MARGIN_X + 2, curY + 3.8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.9);
  obsLines.forEach((line, idx) => {
    doc.text(line, MARGIN_X + 4, curY + 7.4 + idx * 3.4);
  });
  curY += obsH;

  // Decisión
  doc.setFillColor(243, 244, 246);
  doc.rect(MARGIN_X, curY, CONTENT_W, decH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text("DECISIÓN:", MARGIN_X + 3, curY + 4.5);

  const isAprobado = entrevista.estatus === "aprobado";
  const isRechazado = entrevista.estatus === "rechazado";
  const decStr = isAprobado
    ? "( X ) APROBADO        (   ) NO APROBADO"
    : isRechazado
    ? "(   ) APROBADO        ( X ) NO APROBADO"
    : "(   ) APROBADO        (   ) NO APROBADO (PENDIENTE)";
  doc.text(decStr, MARGIN_X + 25, curY + 4.5);
  curY += decH;

  // Firmas
  const colSigW = CONTENT_W / 2;
  doc.setFillColor(255, 255, 255);
  doc.rect(MARGIN_X, curY, colSigW, sigH, "D");
  doc.rect(MARGIN_X + colSigW, curY, colSigW, sigH, "D");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.text("FIRMA DEL ENTREVISTADO", MARGIN_X + colSigW / 2, curY + sigH - 3, { align: "center" });

  const entrevistador = cleanSingleLine(entrevista.entrevistado_por);
  doc.text(
    entrevistador ? `FIRMA DEL ENTREVISTADOR (${entrevistador})` : "FIRMA DEL ENTREVISTADOR",
    MARGIN_X + colSigW + colSigW / 2,
    curY + sigH - 3,
    { align: "center" }
  );

  // Stamp headers with final total page count on every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageHeader(doc, p, totalPages);
  }

  return Buffer.from(doc.output("arraybuffer"));
}
