"use server";

import { createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import {
  storage,
  STORAGE_BUCKET,
  MATERIAL_DIDACTICO_PREFIX,
  getPresignedDownloadUrl,
} from "@/lib/b2-storage-client";
import { Upload } from "@aws-sdk/lib-storage";
import { compilePresentationToBuffer } from "@/lib/presentation-compiler.server";
import { formatBytes } from "@/lib/pptx-optimizer.server";
import type {
  GeneracionPresentacionParams,
  ResultadoGeneracionEstructura,
  CompilacionPresentacionParams,
  SlideDefinition,
} from "@/types/presentation-studio";

/**
 * Strips HTML tags from curriculum content to feed clean text to the prompt.
 */
function cleanHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>?/gm, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generates the instructional structure and slide sequence for a course presentation.
 * Returns a structured array of slides ready for user review and customization.
 */
export async function generarEstructuraPresentacion(
  params: GeneracionPresentacionParams,
): Promise<ResultadoGeneracionEstructura> {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!groqKey && !geminiKey) {
      return {
        success: false,
        error: "Servicio de diseño instruccional no configurado en el servidor.",
      };
    }

    const contenidoLimpio = cleanHtml(params.contenidoCurso || "");
    const scopeText =
      params.alcance === "modulo_especifico" && params.moduloNombre
        ? `Enfócate exclusivamente en el módulo: "${params.moduloNombre}".`
        : `Estructura la presentación cubriendo el contenido completo del curso.`;

    const normasTexto =
      params.enfoquesNormativos && params.enfoquesNormativos.length > 0
        ? params.enfoquesNormativos.join(", ")
        : params.enfoqueNormativo || "COVENIN / LOPCYMAT / OSHA / Estándares Internacionales";

    const targetSlides =
      params.cantidadLaminasDeseada && params.cantidadLaminasDeseada >= 1
        ? params.cantidadLaminasDeseada
        : params.cargaHorariaStd <= 4
        ? 12
        : params.cargaHorariaStd <= 8
        ? 18
        : params.cargaHorariaStd <= 16
        ? 26
        : 34;

    const systemPrompt = `Eres el Director de Formación Técnica y Seguridad Industrial (HSEQ) de SHA de Venezuela.
Tu labor es diseñar la estructura instruccional para una presentación de PowerPoint corporativa de alto impacto visual y pedagógico.

NORMAS Y LINEAMIENTOS OBLIGATORIOS:
1. Lenguaje: Español técnico, formal, claro y directo.
2. Enfoque: Seguridad, prevención de accidentes, cumplimiento normativo y disciplina operacional.
3. CANTIDAD DE DIAPOSITIVAS: Debes generar EXACTAMENTE ${targetSlides} diapositivas (un arreglo 'slides' con ${targetSlides} elementos).
4. ESTRUCTURA PEDAGÓGICA Y SECUENCIA DE LÁMINAS (Distribuida en las ${targetSlides} diapositivas):
   - Portada Oficial (layout: "portada") [Lámina 1]
   - Objetivos y Alcance de Aprendizaje (layout: "objetivos") [Lámina 2]
   - Marco Legal y Normativa Aplicable (layout: "normativa") [Lámina 3]
   - Desarrollo secuencial de las unidades/módulos temáticos del curso:
     - Separador de unidad (layout: "modulo_divider")
     - Definición y Conceptos clave (layout: "concepto")
     - Procedimiento operativo o Pasos en campo (layout: "proceso_pasos")
     - Alerta crítica / Regla que salva vidas / SWA (layout: "alerta_seguridad")
     - Demostración audiovisual sugerida (layout: "video_recurso") cuando aplique práctica técnica
     - Taller aplicativo o Análisis de caso real (layout: "caso_practico")
   - Evaluación y Preguntas de Cierre (layout: "evaluacion") [Última lámina]

5. INTEGRACIÓN OBLIGATORIA DE REQUERIMIENTOS:
   a) Temario Oficial: Cada lámina debe desarrollar fielmente los temas indicados en el contenido programático.
   b) Marco Normativo: Cita explícitamente artículos, directrices y regulaciones de las normas seleccionadas (${normasTexto}).
   c) Estándar del Cliente (si se adjuntó PDF): Extrae obligatoriamente la terminología del cliente, procedimientos específicos y reglas obligatorias para reflejarlas en las diapositivas.
   d) Directrices Adicionales: Aplica con exactitud el énfasis instruccional solicitado por el usuario.
   e) Notas para el Facilitador: Cada diapositiva DEBE incluir "notasFacilitador" (2 a 4 oraciones con recomendaciones didácticas y preguntas detonantes para el instructor).
6. NO menciones herramientas digitales o inteligencia artificial en ningún texto visible ni en notas.

Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura:
{
  "slides": [
    {
      "id": "slide-1",
      "layout": "portada" | "modulo_divider" | "objetivos" | "normativa" | "concepto" | "proceso_pasos" | "alerta_seguridad" | "caso_practico" | "video_recurso" | "evaluacion",
      "titulo": "Título de la diapositiva",
      "subtitulo": "Subtítulo explicativo o contexto",
      "badge": "MÓDULO I / SEGURIDAD / NORMA",
      "moduloPertenece": "Nombre del módulo",
      "bullets": ["Punto clave 1", "Punto clave 2", "Punto clave 3"],
      "pasos": [
        {"numero": 1, "titulo": "Paso 1", "descripcion": "Detalle breve del paso"}
      ],
      "destacado": "Frase de énfasis o recomendación crítica",
      "tipoAlerta": "peligro" | "advertencia" | "precaucion" | "informativo",
      "notasFacilitador": "Puntos de discusión para el facilitador.",
      "tieneVideo": false,
      "videoTitulo": "Nombre sugerido para el video si layout es video_recurso"
    }
  ]
}`;

    const userPrompt = `Curso: "${params.cursoNombre}"
Duración Oficial: ${params.cargaHorariaStd} horas
Objetivo de Láminas: EXACTAMENTE ${targetSlides} diapositivas
Alcance del Documento: ${scopeText}
Marco Normativo Requerido: ${normasTexto}
Nivel de la Audiencia: ${params.audienciaNivel || "Personal Operativo y Supervisores Técnicos"}
Directrices Específicas / Énfasis Instruccional: ${params.directricesAdicionales || "Ninguna"}
${
  params.pdfEstandarNombre
    ? `\nNORMA / ESTÁNDAR ESPECÍFICO DEL CLIENTE ADJUNTO: "${params.pdfEstandarNombre}".
INSTRUCCIÓN PRIORITARIA: Extrae obligatoriamente del documento PDF adjunto los procedimientos clave, terminología propia del cliente, reglas de seguridad que salvan vidas y requisitos operacionales para integrarlos de forma fidedigna en las láminas.`
    : ""
}

Contenido Programático / Temario del Curso:
${contenidoLimpio || "Desarrollar el temario según las mejores prácticas para este título de curso."}`;

    let jsonResponseText = "";

    // 1. Primary Engine: Gemini (3.5-flash -> 3-flash-preview -> 3.8-flash)
    // Supports native multimodal PDF parsing for client-specific standards
    if (geminiKey) {
      const geminiModels = ["gemini-3.5-flash", "gemini-3-flash-preview", "gemini-3.8-flash"];
      const userParts: any[] = [];

      // If client attached a specific standard PDF, include it directly
      if (params.pdfEstandarBase64) {
        const cleanBase64 = params.pdfEstandarBase64.replace(/^data:[^;]+;base64,/, "");
        userParts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: cleanBase64,
          },
        });
      }

      userParts.push({ text: `${systemPrompt}\n\n${userPrompt}` });

      for (const model of geminiModels) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: userParts,
                  },
                ],
                generationConfig: {
                  responseMimeType: "application/json",
                  temperature: 0.3,
                  maxOutputTokens: Math.min(65536, Math.max(12000, targetSlides * 350)),
                },
              }),
            },
          );

          if (response.ok) {
            const result = await response.json();
            jsonResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (jsonResponseText) break;
          } else {
            console.warn(`[presentation-generator] Gemini ${model} returned ${response.status}`);
          }
        } catch (geminiErr) {
          console.warn(`[presentation-generator] Gemini ${model} error:`, geminiErr);
        }
      }
    }

    // 2. Fallback Engine: Groq (if no PDF was attached and Gemini was not available)
    if (!jsonResponseText && groqKey && !params.pdfEstandarBase64) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 6000,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          jsonResponseText = result.choices?.[0]?.message?.content || "";
        }
      } catch (groqErr) {
        console.warn("[presentation-generator] Groq fallback failed:", groqErr);
      }
    }

    if (!jsonResponseText) {
      return {
        success: false,
        error: "No se pudo generar la estructura de la presentación en este momento.",
      };
    }

    // Parse JSON safely
    const parsed = JSON.parse(jsonResponseText);
    const rawSlides: any[] = Array.isArray(parsed) ? parsed : parsed.slides || [];

    const slides: SlideDefinition[] = rawSlides.map((s, idx) => ({
      id: s.id || `slide-${idx + 1}`,
      layout: s.layout || "concepto",
      titulo: s.titulo || `Diapositiva ${idx + 1}`,
      subtitulo: s.subtitulo || undefined,
      badge: s.badge || undefined,
      moduloPertenece: s.moduloPertenece || undefined,
      bullets: Array.isArray(s.bullets) ? s.bullets : [],
      pasos: Array.isArray(s.pasos) ? s.pasos : undefined,
      destacado: s.destacado || undefined,
      tipoAlerta: s.tipoAlerta || undefined,
      notasFacilitador: s.notasFacilitador || undefined,
      tieneVideo: s.tieneVideo || s.layout === "video_recurso",
      videoTitulo: s.videoTitulo || undefined,
      videoUrl: s.videoUrl || undefined,
    }));

    return {
      success: true,
      slides,
      totalEstimadoMinutos: slides.length * 4,
    };
  } catch (err: any) {
    console.error("[presentation-generator] Error in generarEstructuraPresentacion:", err);
    return {
      success: false,
      error: err.message || "Error al generar la estructura de presentación",
    };
  }
}

/**
 * Compiles the presentation slides into a PPTX file, optionally saves it in Backblaze B2,
 * registers it as a course material, and returns a download payload.
 */
export async function compilarYGuardarPresentacionAction(
  params: CompilacionPresentacionParams,
): Promise<{
  success: boolean;
  materialId?: string;
  downloadUrl?: string;
  base64Data?: string;
  fileName?: string;
  fileSizeBytes?: number;
  fileSizeFormatted?: string;
  error?: string;
}> {
  try {
    // 1. Compile native PowerPoint presentation
    const { buffer, slideCount } = await compilePresentationToBuffer(params);

    const cleanCourseName = params.cursoNombre.replace(/[^a-zA-Z0-9_\-]/g, "_").substring(0, 30);
    const fileName = `${cleanCourseName}_Presentacion_Oficial.pptx`;
    const fileSizeFormatted = formatBytes(buffer.length);

    let materialId: string | undefined;
    let downloadUrl: string | undefined;

    // 2. Upload to Backblaze B2 and register in database if requested
    if (params.guardarEnServidor) {
      const supabase = await createAdminClient();
      const b2Key = `${MATERIAL_DIDACTICO_PREFIX}curso_${params.cursoId || "general"}/${Date.now()}_${fileName}`;

      // Upload buffer to B2
      const uploader = new Upload({
        client: storage,
        params: {
          Bucket: STORAGE_BUCKET,
          Key: b2Key,
          Body: buffer,
          ContentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        },
      });
      await uploader.done();

      // Insert record in capacitacion_material_didactico
      const { data: inserted, error: dbError } = await supabase
        .from("capacitacion_material_didactico")
        .insert({
          id_curso: params.cursoId || null,
          tipo_material: "presentacion_pptx",
          titulo: params.tituloPresentacion || `${params.cursoNombre} - Presentación Oficial`,
          descripcion: `Presentación institucional generada en formato digital (${slideCount} diapositivas).`,
          archivo_nombre: fileName,
          b2_key: b2Key,
          file_size_bytes: buffer.length,
          file_size_formatted: fileSizeFormatted,
          mime_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          es_optimizado: true,
          visible_facilitador: true,
          is_latest: true,
          version: 1,
        })
        .select("id")
        .single();

      if (dbError) {
        console.error("[compilarYGuardarPresentacionAction] DB insert error:", dbError);
      } else {
        materialId = inserted?.id;
        try {
          downloadUrl = await getPresignedDownloadUrl(b2Key, 86400 * 7, fileName);
        } catch {
          // fallback
        }
      }

      revalidatePath("/dashboard/capacitacion/gestion-cursos");
    }

    return {
      success: true,
      materialId,
      downloadUrl,
      base64Data: buffer.toString("base64"),
      fileName,
      fileSizeBytes: buffer.length,
      fileSizeFormatted,
    };
  } catch (err: any) {
    console.error("[compilarYGuardarPresentacionAction] Compilation error:", err);
    return {
      success: false,
      error: err.message || "Error al compilar la presentación",
    };
  }
}
