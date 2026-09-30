// @ts-ignore
import PptxGenJS from "pptxgenjs";
import { SlideDefinition, CompilacionPresentacionParams } from "@/types/presentation-studio";

/**
 * SHA Corporate Color Palette
 */
const BRAND = {
  navyDark: "0C3F69",      // Primary SHA Navy
  navyDeep: "07253D",      // Extra deep background for portadas
  skyBlue: "0EA5E9",       // Primary Cyan / Sky
  skyLight: "E0F2FE",      // Soft sky background
  orangeSafety: "F5803E",  // SHA Orange / Safety Accent
  orangeLight: "FFF7ED",   // Soft orange
  slateBg: "F8FAFC",       // Clean light slide background
  cardBg: "FFFFFF",        // Card white
  cardBorder: "E2E8F0",    // Subtle border
  textDark: "0F172A",      // Headings
  textBody: "334155",      // Body copy
  textMuted: "64748B",     // Secondary copy
  textLight: "FFFFFF",     // White text
  alertRed: "EF4444",      // Danger / SWA
  alertAmber: "D97706",    // Caution
  successGreen: "10B981",  // Check / Safe
};

/**
 * Compiles a list of slide definitions into a native, high-performance Microsoft PowerPoint buffer.
 */
export async function compilePresentationToBuffer(
  params: CompilacionPresentacionParams,
): Promise<{ buffer: Buffer; slideCount: number }> {
  const pres = new PptxGenJS();

  // Widescreen 16:9 layout (10 x 5.625 inches standard)
  pres.layout = "LAYOUT_16x9";
  pres.title = params.tituloPresentacion || params.cursoNombre;
  pres.subject = `Material Didáctico - ${params.cursoNombre}`;
  pres.author = "SHA de Venezuela - Capacitación Técnica";
  pres.company = "SHA de Venezuela";

  for (let i = 0; i < params.slides.length; i++) {
    const slideDef = params.slides[i];
    const slideNumber = i + 1;
    const pptSlide = pres.addSlide();

    // Attach speaker notes if present
    if (slideDef.notasFacilitador) {
      pptSlide.addNotes(slideDef.notasFacilitador);
    }

    switch (slideDef.layout) {
      case "portada":
        renderPortadaSlide(pres, pptSlide, slideDef, params);
        break;

      case "modulo_divider":
        renderModuloDividerSlide(pres, pptSlide, slideDef);
        break;

      case "objetivos":
        renderObjetivosSlide(pres, pptSlide, slideDef, slideNumber);
        break;

      case "normativa":
        renderNormativaSlide(pres, pptSlide, slideDef, slideNumber);
        break;

      case "concepto":
        renderConceptoSlide(pres, pptSlide, slideDef, slideNumber);
        break;

      case "proceso_pasos":
        renderProcesoPasosSlide(pres, pptSlide, slideDef, slideNumber);
        break;

      case "alerta_seguridad":
        renderAlertaSeguridadSlide(pres, pptSlide, slideDef, slideNumber);
        break;

      case "caso_practico":
        renderCasoPracticoSlide(pres, pptSlide, slideDef, slideNumber);
        break;

      case "video_recurso":
        renderVideoRecursoSlide(pres, pptSlide, slideDef, slideNumber);
        break;

      case "evaluacion":
        renderEvaluacionSlide(pres, pptSlide, slideDef, slideNumber);
        break;

      default:
        renderConceptoSlide(pres, pptSlide, slideDef, slideNumber);
        break;
    }
  }

  const rawBuffer = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
  return {
    buffer: rawBuffer,
    slideCount: params.slides.length,
  };
}

// -------------------------------------------------------------
// Slide Renderers
// -------------------------------------------------------------

/**
 * 1. Portada Slide
 */
function renderPortadaSlide(
  pres: PptxGenJS,
  slide: any,
  def: SlideDefinition,
  params: CompilacionPresentacionParams,
) {
  // Dark Navy Canvas
  slide.background = { color: BRAND.navyDeep };

  // Decorative top accent stripe
  slide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.15,
    fill: { color: BRAND.skyBlue },
    line: { color: BRAND.skyBlue },
  });

  // Orange brand accent pillar on the left
  slide.addShape(pres.ShapeType.rect, {
    x: 0.8,
    y: 1.2,
    w: 0.15,
    h: 3.5,
    fill: { color: BRAND.orangeSafety },
    line: { color: BRAND.orangeSafety },
  });

  // Corporate Badge
  slide.addShape(pres.ShapeType.rect, {
    x: 1.2,
    y: 1.2,
    w: 4.8,
    h: 0.35,
    fill: { color: "1E293B" },
    line: { color: "334155" },
    rectRadius: 0.08,
  });

  slide.addText("PROGRAMA OFICIAL DE CAPACITACIÓN TÉCNICA", {
    x: 1.3,
    y: 1.2,
    w: 4.6,
    h: 0.35,
    fontSize: 9,
    fontFace: "Arial",
    bold: true,
    color: BRAND.skyBlue,
    align: "left",
    valign: "middle",
  });

  // Course Title
  slide.addText(def.titulo || params.cursoNombre, {
    x: 1.2,
    y: 1.7,
    w: 10.5,
    h: 1.8,
    fontSize: 34,
    fontFace: "Arial",
    bold: true,
    color: BRAND.textLight,
    valign: "top",
    margin: 0,
  });

  // Subtitle / Module
  if (def.subtitulo || def.badge) {
    slide.addText(def.subtitulo || def.badge || "", {
      x: 1.2,
      y: 3.6,
      w: 10.5,
      h: 0.6,
      fontSize: 16,
      fontFace: "Arial",
      color: BRAND.skyLight,
      valign: "top",
    });
  }

  // Footer metadata card
  slide.addShape(pres.ShapeType.rect, {
    x: 0.8,
    y: 5.8,
    w: 11.7,
    h: 1.0,
    fill: { color: "0C3F69" },
    line: { color: "1E4F7D" },
    rectRadius: 0.1,
  });

  slide.addText(
    [
      { text: "SHA DE VENEZUELA\n", options: { bold: true, color: BRAND.textLight, fontSize: 11 } },
      { text: "Seguridad, Higiene y Ambiente | Formación Industrial Certificada", options: { color: BRAND.skyLight, fontSize: 9 } },
    ],
    { x: 1.1, y: 5.9, w: 8.5, h: 0.8, fontFace: "Arial", valign: "middle" },
  );

  slide.addText(
    [
      { text: "CÓDIGO OFICIAL\n", options: { bold: true, color: BRAND.orangeSafety, fontSize: 8 } },
      { text: params.cursoId ? `CURSO-${params.cursoId}` : "ESPECIAL", options: { bold: true, color: BRAND.textLight, fontSize: 11 } },
    ],
    { x: 10.0, y: 5.9, w: 2.2, h: 0.8, fontFace: "Arial", align: "right", valign: "middle" },
  );
}

/**
 * 2. Modulo Divider Slide
 */
function renderModuloDividerSlide(pres: PptxGenJS, slide: any, def: SlideDefinition) {
  slide.background = { color: BRAND.navyDark };

  // Top Sky accent
  slide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.12,
    fill: { color: BRAND.skyBlue },
    line: { color: BRAND.skyBlue },
  });

  // Module Number Badge
  slide.addShape(pres.ShapeType.rect, {
    x: 1.2,
    y: 2.0,
    w: 2.2,
    h: 0.45,
    fill: { color: BRAND.skyBlue },
    line: { color: BRAND.skyBlue },
    rectRadius: 0.08,
  });

  slide.addText(def.badge || "UNIDAD TEMÁTICA", {
    x: 1.2,
    y: 2.0,
    w: 2.2,
    h: 0.45,
    fontSize: 10,
    fontFace: "Arial",
    bold: true,
    color: BRAND.navyDeep,
    align: "center",
    valign: "middle",
  });

  // Module Title
  slide.addText(def.titulo, {
    x: 1.2,
    y: 2.7,
    w: 10.8,
    h: 1.8,
    fontSize: 32,
    fontFace: "Arial",
    bold: true,
    color: BRAND.textLight,
    valign: "top",
  });

  // Subtitle / Scope
  if (def.subtitulo || def.destacado) {
    slide.addText(def.subtitulo || def.destacado || "", {
      x: 1.2,
      y: 4.6,
      w: 10.8,
      h: 0.9,
      fontSize: 15,
      fontFace: "Arial",
      color: BRAND.skyLight,
      valign: "top",
    });
  }
}

/**
 * 3. Objetivos de Aprendizaje
 */
function renderObjetivosSlide(pres: PptxGenJS, slide: any, def: SlideDefinition, slideNum: number) {
  renderStandardSlideHeader(pres, slide, def, "OBJETIVOS DE APRENDIZAJE", slideNum);

  const bullets = def.bullets && def.bullets.length > 0 ? def.bullets : [
    "Comprender los fundamentos clave de la materia y su aplicación práctica.",
    "Identificar los factores de riesgo asociados y las salvaguardas requeridas.",
    "Aplicar los protocolos de trabajo seguro según las normativas técnicas vigentes.",
  ];

  // Cards layout for objectives
  const startY = 1.6;
  const cardHeight = Math.min(1.1, 4.8 / bullets.length);

  bullets.forEach((bullet, idx) => {
    const yPos = startY + idx * (cardHeight + 0.25);

    // Number Badge
    slide.addShape(pres.ShapeType.rect, {
      x: 0.8,
      y: yPos,
      w: 0.8,
      h: cardHeight,
      fill: { color: BRAND.navyDark },
      line: { color: BRAND.navyDark },
      rectRadius: 0.1,
    });

    slide.addText(`0${idx + 1}`, {
      x: 0.8,
      y: yPos,
      w: 0.8,
      h: cardHeight,
      fontSize: 16,
      fontFace: "Arial",
      bold: true,
      color: BRAND.skyBlue,
      align: "center",
      valign: "middle",
    });

    // Content Card
    slide.addShape(pres.ShapeType.rect, {
      x: 1.7,
      y: yPos,
      w: 10.8,
      h: cardHeight,
      fill: { color: BRAND.cardBg },
      line: { color: BRAND.cardBorder, width: 1 },
      rectRadius: 0.1,
    });

    slide.addText(bullet, {
      x: 1.9,
      y: yPos,
      w: 10.4,
      h: cardHeight,
      fontSize: 13,
      fontFace: "Arial",
      color: BRAND.textBody,
      valign: "middle",
    });
  });
}

/**
 * 4. Normativa y Marco Legal
 */
function renderNormativaSlide(pres: PptxGenJS, slide: any, def: SlideDefinition, slideNum: number) {
  renderStandardSlideHeader(pres, slide, def, "MARCO REGULATORIO Y NORMATIVO", slideNum);

  // Left card: Highlighted standard banner
  slide.addShape(pres.ShapeType.rect, {
    x: 0.8,
    y: 1.6,
    w: 4.2,
    h: 5.0,
    fill: { color: BRAND.navyDark },
    line: { color: BRAND.navyDark },
    rectRadius: 0.12,
  });

  slide.addText("CUMPLIMIENTO OBLIGATORIO", {
    x: 1.1,
    y: 1.9,
    w: 3.6,
    h: 0.35,
    fontSize: 9,
    fontFace: "Arial",
    bold: true,
    color: BRAND.orangeSafety,
  });

  slide.addText(def.subtitulo || "Normas Nacionales e Internacionales", {
    x: 1.1,
    y: 2.3,
    w: 3.6,
    h: 1.2,
    fontSize: 18,
    fontFace: "Arial",
    bold: true,
    color: BRAND.textLight,
  });

  if (def.destacado) {
    slide.addText(def.destacado, {
      x: 1.1,
      y: 3.6,
      w: 3.6,
      h: 2.6,
      fontSize: 12,
      fontFace: "Arial",
      color: BRAND.skyLight,
    });
  }

  // Right card: Bullets / standards list
  slide.addShape(pres.ShapeType.rect, {
    x: 5.3,
    y: 1.6,
    w: 7.2,
    h: 5.0,
    fill: { color: BRAND.cardBg },
    line: { color: BRAND.cardBorder, width: 1 },
    rectRadius: 0.12,
  });

  const bullets = def.bullets || ["Norma técnica aplicable según requerimiento industrial."];
  const formattedBullets = bullets.map((b) => ({
    text: `${b}\n\n`,
    options: { fontSize: 13, color: BRAND.textBody, fontFace: "Arial", bullet: true },
  }));

  slide.addText(formattedBullets, {
    x: 5.7,
    y: 1.9,
    w: 6.4,
    h: 4.4,
    valign: "top",
  });
}

/**
 * 5. Concepto / Contenido General (2-Column Split)
 */
function renderConceptoSlide(pres: PptxGenJS, slide: any, def: SlideDefinition, slideNum: number) {
  renderStandardSlideHeader(pres, slide, def, def.badge || "CONTENIDO TÉCNICO", slideNum);

  // Left card: Focus concept
  slide.addShape(pres.ShapeType.rect, {
    x: 0.8,
    y: 1.6,
    w: 5.4,
    h: 4.0,
    fill: { color: BRAND.cardBg },
    line: { color: BRAND.skyBlue, width: 1.5 },
    rectRadius: 0.12,
  });

  slide.addText("CONCEPTO CLAVE", {
    x: 1.1,
    y: 1.8,
    w: 4.8,
    h: 0.3,
    fontSize: 9,
    fontFace: "Arial",
    bold: true,
    color: BRAND.skyBlue,
  });

  slide.addText(def.subtitulo || def.titulo, {
    x: 1.1,
    y: 2.2,
    w: 4.8,
    h: 3.1,
    fontSize: 15,
    fontFace: "Arial",
    color: BRAND.textDark,
    valign: "top",
  });

  // Right card: Key takeaways list
  slide.addShape(pres.ShapeType.rect, {
    x: 6.5,
    y: 1.6,
    w: 6.0,
    h: 4.0,
    fill: { color: BRAND.cardBg },
    line: { color: BRAND.cardBorder, width: 1 },
    rectRadius: 0.12,
  });

  slide.addText("PUNTOS RELEVANTES", {
    x: 6.8,
    y: 1.8,
    w: 5.4,
    h: 0.3,
    fontSize: 9,
    fontFace: "Arial",
    bold: true,
    color: BRAND.navyDark,
  });

  const bullets = def.bullets || ["Aspecto técnico principal a considerar."];
  const bulletItems = bullets.map((b) => ({
    text: `${b}\n\n`,
    options: { fontSize: 12, color: BRAND.textBody, fontFace: "Arial", bullet: true },
  }));

  slide.addText(bulletItems, {
    x: 6.8,
    y: 2.2,
    w: 5.4,
    h: 3.1,
    valign: "top",
  });

  // Bottom Highlight Banner (if present)
  if (def.destacado) {
    slide.addShape(pres.ShapeType.rect, {
      x: 0.8,
      y: 5.8,
      w: 11.7,
      h: 0.9,
      fill: { color: BRAND.skyLight },
      line: { color: BRAND.skyBlue, width: 1 },
      rectRadius: 0.08,
    });

    slide.addText(
      [
        { text: "NOTA PRÁCTICA: ", options: { bold: true, color: BRAND.navyDark, fontSize: 11 } },
        { text: def.destacado, options: { color: BRAND.textDark, fontSize: 11 } },
      ],
      { x: 1.1, y: 5.85, w: 11.1, h: 0.8, fontFace: "Arial", valign: "middle" },
    );
  }
}

/**
 * 6. Proceso por Pasos (Horizontal Flow)
 */
function renderProcesoPasosSlide(pres: PptxGenJS, slide: any, def: SlideDefinition, slideNum: number) {
  renderStandardSlideHeader(pres, slide, def, "SECUENCIA OPERATIVA / PASO A PASO", slideNum);

  const steps = def.pasos && def.pasos.length > 0 ? def.pasos : [
    { numero: 1, titulo: "Inspección Previa", descripcion: "Verificar condiciones seguras antes de iniciar." },
    { numero: 2, titulo: "Permiso de Trabajo", descripcion: "Validar firmas de emisor y ejecutor en sitio." },
    { numero: 3, titulo: "Ejecución Segura", descripcion: "Cumplimiento estricto de controles y EPP." },
    { numero: 4, titulo: "Cierre y Orden", descripcion: "Despeje del área y entrega de la instalación." },
  ];

  const totalSteps = Math.min(4, steps.length);
  const cardWidth = (11.7 - (totalSteps - 1) * 0.3) / totalSteps;

  steps.slice(0, 4).forEach((step, idx) => {
    const xPos = 0.8 + idx * (cardWidth + 0.3);

    // Step Card
    slide.addShape(pres.ShapeType.rect, {
      x: xPos,
      y: 1.8,
      w: cardWidth,
      h: 4.6,
      fill: { color: BRAND.cardBg },
      line: { color: BRAND.cardBorder, width: 1 },
      rectRadius: 0.12,
    });

    // Step Number Badge
    slide.addShape(pres.ShapeType.rect, {
      x: xPos + 0.2,
      y: 2.0,
      w: 0.6,
      h: 0.6,
      fill: { color: idx === 0 ? BRAND.orangeSafety : BRAND.navyDark },
      line: { color: idx === 0 ? BRAND.orangeSafety : BRAND.navyDark },
      rectRadius: 0.08,
    });

    slide.addText(String(step.numero || idx + 1), {
      x: xPos + 0.2,
      y: 2.0,
      w: 0.6,
      h: 0.6,
      fontSize: 16,
      fontFace: "Arial",
      bold: true,
      color: BRAND.textLight,
      align: "center",
      valign: "middle",
    });

    // Step Title
    slide.addText(step.titulo, {
      x: xPos + 0.2,
      y: 2.8,
      w: cardWidth - 0.4,
      h: 0.8,
      fontSize: 14,
      fontFace: "Arial",
      bold: true,
      color: BRAND.textDark,
      valign: "top",
    });

    // Step Description
    slide.addText(step.descripcion, {
      x: xPos + 0.2,
      y: 3.7,
      w: cardWidth - 0.4,
      h: 2.4,
      fontSize: 11,
      fontFace: "Arial",
      color: BRAND.textMuted,
      valign: "top",
    });
  });
}

/**
 * 7. Alerta de Seguridad Crítica
 */
function renderAlertaSeguridadSlide(pres: PptxGenJS, slide: any, def: SlideDefinition, slideNum: number) {
  renderStandardSlideHeader(pres, slide, def, "CONTROL DE RIESGO CRÍTICO", slideNum);

  // Main Alert Card (Red/Orange Border)
  slide.addShape(pres.ShapeType.rect, {
    x: 0.8,
    y: 1.6,
    w: 11.7,
    h: 5.0,
    fill: { color: BRAND.cardBg },
    line: { color: BRAND.alertRed, width: 2.5 },
    rectRadius: 0.15,
  });

  // Top Alert Header
  slide.addShape(pres.ShapeType.rect, {
    x: 0.8,
    y: 1.6,
    w: 11.7,
    h: 0.8,
    fill: { color: BRAND.alertRed },
    line: { color: BRAND.alertRed },
  });

  slide.addText("⚠️  ATENCIÓN OBLIGATORIA: REGLA DE SEGURIDAD QUE SALVA VIDAS (SWA)", {
    x: 1.1,
    y: 1.6,
    w: 11.1,
    h: 0.8,
    fontSize: 13,
    fontFace: "Arial",
    bold: true,
    color: BRAND.textLight,
    valign: "middle",
  });

  // Critical points
  const bullets = def.bullets || [
    "Detenga inmediatamente el trabajo (SWA) si las condiciones no son 100% seguras.",
    "El uso de EPP específico es obligatorio y no negociable.",
    "Verifique el aislamiento de energías peligrosas antes de intervenir.",
  ];

  const bulletItems = bullets.map((b) => ({
    text: `• ${b}\n\n`,
    options: { fontSize: 15, bold: true, color: BRAND.textDark, fontFace: "Arial" },
  }));

  slide.addText(bulletItems, {
    x: 1.2,
    y: 2.7,
    w: 10.9,
    h: 2.5,
    valign: "top",
  });

  // Callout at bottom
  slide.addShape(pres.ShapeType.rect, {
    x: 1.2,
    y: 5.3,
    w: 10.9,
    h: 1.0,
    fill: { color: BRAND.orangeLight },
    line: { color: BRAND.orangeSafety, width: 1 },
    rectRadius: 0.08,
  });

  slide.addText(def.destacado || "Recuerde: Ninguna tarea es tan urgente que no pueda realizarse de manera segura.", {
    x: 1.5,
    y: 5.35,
    w: 10.3,
    h: 0.9,
    fontSize: 13,
    fontFace: "Arial",
    bold: true,
    color: BRAND.orangeSafety,
    valign: "middle",
  });
}

/**
 * 8. Caso Práctico / Dinámica
 */
function renderCasoPracticoSlide(pres: PptxGenJS, slide: any, def: SlideDefinition, slideNum: number) {
  renderStandardSlideHeader(pres, slide, def, "ANÁLISIS DE CASO / TALLER PRÁCTICO", slideNum);

  // Scenario Card (Left)
  slide.addShape(pres.ShapeType.rect, {
    x: 0.8,
    y: 1.6,
    w: 6.0,
    h: 5.0,
    fill: { color: BRAND.cardBg },
    line: { color: BRAND.cardBorder, width: 1 },
    rectRadius: 0.12,
  });

  slide.addText("ESCENARIO OPERACIONAL", {
    x: 1.1,
    y: 1.8,
    w: 5.4,
    h: 0.3,
    fontSize: 10,
    fontFace: "Arial",
    bold: true,
    color: BRAND.navyDark,
  });

  slide.addText(def.subtitulo || "Descripción de la situación observada en campo...", {
    x: 1.1,
    y: 2.3,
    w: 5.4,
    h: 4.0,
    fontSize: 13,
    fontFace: "Arial",
    color: BRAND.textBody,
    valign: "top",
  });

  // Questions Card (Right)
  slide.addShape(pres.ShapeType.rect, {
    x: 7.1,
    y: 1.6,
    w: 5.4,
    h: 5.0,
    fill: { color: BRAND.cardBg },
    line: { color: BRAND.skyBlue, width: 1.5 },
    rectRadius: 0.12,
  });

  slide.addText("PREGUNTAS DE ANÁLISIS EN EQUIPO", {
    x: 7.4,
    y: 1.8,
    w: 4.8,
    h: 0.3,
    fontSize: 10,
    fontFace: "Arial",
    bold: true,
    color: BRAND.skyBlue,
  });

  const bullets = def.bullets || [
    "¿Cuáles fueron los actos y condiciones inseguras identificadas?",
    "¿Qué barrera o salvaguarda falló en la secuencia del evento?",
    "¿Cómo evitaríamos que este incidente se repita en nuestro turno?",
  ];

  const formatted = bullets.map((q, idx) => ({
    text: `${idx + 1}. ${q}\n\n`,
    options: { fontSize: 13, bold: true, color: BRAND.textDark, fontFace: "Arial" },
  }));

  slide.addText(formatted, {
    x: 7.4,
    y: 2.3,
    w: 4.8,
    h: 4.0,
    valign: "top",
  });
}

/**
 * 9. Video Recurso Slide (Supports embedded MP4 base64/path or URL fallback)
 */
function renderVideoRecursoSlide(pres: PptxGenJS, slide: any, def: SlideDefinition, slideNum: number) {
  renderStandardSlideHeader(pres, slide, def, "RECURSO AUDIOVISUAL DE SOPORTE", slideNum);

  // If the user uploaded a custom video file as base64
  if (def.videoFileBase64) {
    try {
      slide.addMedia({
        type: "video",
        data: def.videoFileBase64,
        x: 0.8,
        y: 1.6,
        w: 7.2,
        h: 4.8,
      });
    } catch (e) {
      console.warn("Failed to embed video base64, drawing placeholder card instead:", e);
      renderVideoPlaceholder(pres, slide, def);
    }
  } else {
    // Video Frame / Placeholder Card
    renderVideoPlaceholder(pres, slide, def);
  }

  // Right Side: Reflection / Instructions Card
  slide.addShape(pres.ShapeType.rect, {
    x: 8.3,
    y: 1.6,
    w: 4.2,
    h: 5.0,
    fill: { color: BRAND.cardBg },
    line: { color: BRAND.cardBorder, width: 1 },
    rectRadius: 0.12,
  });

  slide.addText("OBJETIVO DEL RECURSO", {
    x: 8.6,
    y: 1.9,
    w: 3.6,
    h: 0.3,
    fontSize: 9,
    fontFace: "Arial",
    bold: true,
    color: BRAND.navyDark,
  });

  slide.addText(def.videoTitulo || def.subtitulo || "Análisis visual de procedimiento en campo.", {
    x: 8.6,
    y: 2.3,
    w: 3.6,
    h: 1.2,
    fontSize: 14,
    fontFace: "Arial",
    bold: true,
    color: BRAND.textDark,
  });

  const bullets = def.bullets || [
    "Observe la coordinación de la maniobra.",
    "Identifique la zona de línea de fuego.",
    "Comente con el grupo las acciones correctivas.",
  ];

  const bulletItems = bullets.map((b) => ({
    text: `• ${b}\n\n`,
    options: { fontSize: 12, color: BRAND.textBody, fontFace: "Arial" },
  }));

  slide.addText(bulletItems, {
    x: 8.6,
    y: 3.7,
    w: 3.6,
    h: 2.6,
    valign: "top",
  });
}

function renderVideoPlaceholder(pres: PptxGenJS, slide: any, def: SlideDefinition) {
  slide.addShape(pres.ShapeType.rect, {
    x: 0.8,
    y: 1.6,
    w: 7.2,
    h: 5.0,
    fill: { color: "0F172A" },
    line: { color: "1E293B" },
    rectRadius: 0.12,
  });

  // Play button shape
  slide.addShape(pres.ShapeType.rect, {
    x: 3.9,
    y: 3.6,
    w: 1.0,
    h: 1.0,
    fill: { color: BRAND.skyBlue },
    line: { color: BRAND.skyBlue },
    rectRadius: 0.5,
  });

  slide.addText("▶", {
    x: 3.9,
    y: 3.6,
    w: 1.0,
    h: 1.0,
    fontSize: 22,
    fontFace: "Arial",
    color: BRAND.textLight,
    align: "center",
    valign: "middle",
  });

  slide.addText(def.videoFileName || def.videoUrl || "Video Didáctico Ilustrativo", {
    x: 1.2,
    y: 4.8,
    w: 6.4,
    h: 0.8,
    fontSize: 12,
    fontFace: "Arial",
    color: BRAND.skyLight,
    align: "center",
  });
}

/**
 * 10. Evaluación / Verificación de Conocimientos
 */
function renderEvaluacionSlide(pres: PptxGenJS, slide: any, def: SlideDefinition, slideNum: number) {
  renderStandardSlideHeader(pres, slide, def, "EVALUACIÓN Y CIERRE", slideNum);

  slide.addShape(pres.ShapeType.rect, {
    x: 0.8,
    y: 1.6,
    w: 11.7,
    h: 5.0,
    fill: { color: BRAND.cardBg },
    line: { color: BRAND.cardBorder, width: 1 },
    rectRadius: 0.15,
  });

  slide.addText("VERIFICACIÓN DE APRENDIZAJE", {
    x: 1.2,
    y: 1.9,
    w: 10.9,
    h: 0.35,
    fontSize: 10,
    fontFace: "Arial",
    bold: true,
    color: BRAND.orangeSafety,
  });

  slide.addText(def.subtitulo || "¿Qué aprendimos hoy? Preguntas clave de autoevaluación:", {
    x: 1.2,
    y: 2.3,
    w: 10.9,
    h: 0.8,
    fontSize: 16,
    fontFace: "Arial",
    bold: true,
    color: BRAND.textDark,
  });

  const bullets = def.bullets || [
    "¿Cuáles son los 3 pasos indispensables antes de firmar el Permiso de Trabajo?",
    "¿En qué circunstancia tiene usted la autoridad para detener una tarea?",
    "¿Cuál es el procedimiento de aislamiento y bloqueo seguro (LOTO)?",
  ];

  const formatted = bullets.map((q, idx) => ({
    text: `Pregunta ${idx + 1}: ${q}\n\n`,
    options: { fontSize: 13, bold: true, color: BRAND.navyDark, fontFace: "Arial" },
  }));

  slide.addText(formatted, {
    x: 1.2,
    y: 3.2,
    w: 10.9,
    h: 3.1,
    valign: "top",
  });
}

// -------------------------------------------------------------
// Common Slide Header Helper
// -------------------------------------------------------------
function renderStandardSlideHeader(
  pres: PptxGenJS,
  slide: any,
  def: SlideDefinition,
  categoryBadge: string,
  slideNum: number,
) {
  // Light Background
  slide.background = { color: BRAND.slateBg };

  // Top Navy accent line
  slide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.08,
    fill: { color: BRAND.navyDark },
    line: { color: BRAND.navyDark },
  });

  // Category Badge (Small uppercase)
  slide.addText((def.badge || categoryBadge).toUpperCase(), {
    x: 0.8,
    y: 0.3,
    w: 9.0,
    h: 0.3,
    fontSize: 8.5,
    fontFace: "Arial",
    bold: true,
    color: BRAND.skyBlue,
    valign: "middle",
  });

  // Slide Title
  slide.addText(def.titulo, {
    x: 0.8,
    y: 0.6,
    w: 10.5,
    h: 0.8,
    fontSize: 20,
    fontFace: "Arial",
    bold: true,
    color: BRAND.textDark,
    valign: "top",
  });

  // Slide Number Pill
  slide.addShape(pres.ShapeType.rect, {
    x: 12.0,
    y: 0.4,
    w: 0.55,
    h: 0.55,
    fill: { color: "E2E8F0" },
    line: { color: "CBD5E1" },
    rectRadius: 0.08,
  });

  slide.addText(String(slideNum), {
    x: 12.0,
    y: 0.4,
    w: 0.55,
    h: 0.55,
    fontSize: 10,
    fontFace: "Arial",
    bold: true,
    color: BRAND.textBody,
    align: "center",
    valign: "middle",
  });
}
