"use server";

import {
  TemplateData,
  DocumentTemplateProcessor,
} from "./document-templates-new";
import {
  buildCertificacionCompetenciasHtml,
  buildNotaEntregaHtml,
  buildValidacionDatosHtml,
} from "./document-html-templates";
import { appendFileSync } from "fs";
import { TemplateBasedPdfGenerator } from "./template-based-pdf-generator";

import { join } from "path";
const LOG_FILE = join(process.cwd(), "document-generation.log");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? ` ${JSON.stringify(data)}` : ""}\n`;
  try {
    appendFileSync(LOG_FILE, logMessage);
  } catch (e) {
    // Silent fail if logging doesn't work
  }
}

export interface DocumentGenerationRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  certificates: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  osiData: any;
  firmanteData?: { nombre: string; cargo: string };
  options?: {
    includeCertificacionCompetencias?: boolean;
    includeNotaEntrega?: boolean;
    includeValidacionDatos?: boolean;
    recibidoData?: {
      nombre: string;
      cargo: string;
    };
  };
}

export interface DocumentGenerationResult {
  success: boolean;
  documents?: {
    [key: string]: string; // Base64 encoded documents
  };
  error?: string;
  errors?: string[]; // Add support for multiple errors
}

/**
 * Resolve city name from city ID
 */
async function resolveCityName(
  cityId?: number | null,
  fallbackCity: string = "Puerto La Cruz",
): Promise<string> {
  if (!cityId) return fallbackCity;
  try {
    const { createClient } = await import("@/utils/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("cat_ciudades")
      .select("nombre_ciudad")
      .eq("id", cityId)
      .single();
    if (!error && data) {
      return data.nombre_ciudad;
    }
  } catch (e) {
    // Fallback
  }
  return fallbackCity;
}

/**
 * Resolve course name from course ID
 */
async function resolveCourseName(
  courseId?: number | null,
  fallbackName: string = "",
): Promise<string> {
  if (!courseId) return fallbackName;
  try {
    const { createClient } = await import("@/utils/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("catalogo_servicios")
      .select("nombre")
      .eq("id", courseId)
      .eq("id_departamento_ejecutante", 3)
      .single();
    if (!error && data) {
      return data.nombre;
    }
  } catch (e) {
    // Fallback
  }
  return fallbackName;
}

/**
 * Format cédula with proper prefix
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatCedula = (participant: any): string => {
  // Support multiple field name variations
  const idNumber =
    participant.participant_id_number || participant.idNumber || "";
  if (!idNumber) return "";

  const cleanCedula = idNumber.replace(/[^\d]/g, ""); // Remove non-digits
  if (cleanCedula.length === 0) return idNumber;

  // Check if ID type is explicitly provided (could be "V", "E", "venezolano", or "extranjero")
  const idTypeRaw = participant.participant_id_type || participant.idType;
  if (idTypeRaw) {
    const idType = idTypeRaw.toUpperCase();

    // Handle full nationality strings first to avoid "VENEZOLANO" starting with "V" match
    if (idType === "EXTRANJERO") {
      return `E-${cleanCedula}`;
    }
    if (idType === "VENEZOLANO") {
      return `V-${cleanCedula}`;
    }

    // Handle prefix format (V or E, possibly with a dash already)
    if (idType.startsWith("V") || idType.startsWith("E")) {
      // Extract only the first letter as prefix
      const prefix = idType.charAt(0);
      return `${prefix}-${cleanCedula}`;
    }
  }

  // Check nationality as fallback
  const nationalityRaw =
    participant.participant_nationality || participant.nationality;
  if (nationalityRaw) {
    const nationality = nationalityRaw.toLowerCase();
    if (nationality === "extranjero") {
      return `E-${cleanCedula}`;
    }
  }

  // Default to Venezuelan if no specific info
  return `V-${cleanCedula}`;
};

export async function generateDocumentsServer(
  request: DocumentGenerationRequest,
): Promise<DocumentGenerationResult> {
  log("generateDocumentsServer called", {
    options: request.options,
    certificatesCount: request.certificates?.length,
  });
  try {
    const { certificates, osiData, firmanteData, options } = request;

    if (!certificates || !certificates.length) {
      return {
        success: false,
        documents: {},
        errors: ["No certificates provided"],
      };
    }

    // Fetch course name if id_curso is available
    let cursoNombre = osiData.tema || ""; // fallback to tema
    if (osiData.id_curso && !osiData.curso_nombre) {
      cursoNombre = await resolveCourseName(osiData.id_curso, cursoNombre);
    } else if (osiData.curso_nombre) {
      cursoNombre = osiData.curso_nombre;
    }

    // Fetch city name if id_ciudad is available
    let cityResolved = osiData.ciudad || "Puerto La Cruz";
    if (osiData.id_ciudad) {
      cityResolved = await resolveCityName(osiData.id_ciudad, cityResolved);
    }

    // Prepare template data to match DOCX template structure exactly
    const defaultFirmante = {
      nombre: "DPTO. CAPACITACIÓN / SHA DE VENEZUELA, C.A.",
      cargo: "Jefe de Capacitación",
    };

    // Use execution date from first certificate if available, fallback to today
    const executionDateStr =
      certificates[0]?.execution_date || new Date().toISOString().split("T")[0];
    const executionDate = new Date(
      executionDateStr + (executionDateStr.includes("T") ? "" : "T12:00:00Z"),
    );

    const dateComponents = {
      fecha: executionDate.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      dia: executionDate.getDate().toString(),
      mes: executionDate.toLocaleDateString("es-ES", { month: "long" }),
      anio: executionDate.getFullYear().toString(),
    };

    const today = new Date();
    const formattedToday = today.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Create comprehensive template data with exact field names from templates
    const templateData = {
      // Basic date fields (for certificacion_de_competencias)
      ...dateComponents,
      fecha_hoy: formattedToday,

      // OSI and course information
      nombre_cliente: osiData.cliente_nombre_empresa || "",
      titulo_curso:
        certificates[0]?.course_title || cursoNombre || osiData.tema || "", // Use course_title from certificate records first
      ciudad: cityResolved,
      nro_osi: osiData.nro_osi || "",

      // Firmante information
      nombre_firmante: firmanteData?.nombre || defaultFirmante.nombre,
      cargo_firmante: firmanteData?.cargo || defaultFirmante.cargo,

      // Additional fields for other templates
      nombre_recibido: options?.recibidoData?.nombre || "",
      cargo_recibido: options?.recibidoData?.cargo || "",
      localidad: osiData.localidad || "",
      localidad_cliente: osiData.direccion_ejecucion || "",
      fecha_ejecucion: osiData.fecha_ejecucion || "",

      // Participants array with exact field names from templates
      participantes: certificates.map((cert, index) => ({
        index: index + 1,
        nombre_apellido: cert.participant_name || "",
        cedula: formatCedula(cert), // Use conditional formatting based on participant data
        puntuacion: cert.score?.toString() || "",
        condicion: cert.score && cert.score >= 14 ? "APROBADO" : "REPROBADO",
        numero_control: cert.control_number?.toString() || "", // No fallback - use actual data only
      })),
    } as TemplateData;

    const documents: { [key: string]: string } = {};
    const errors: string[] = [];

    // Define generation tasks
    const tasks = [];

    if (options?.includeCertificacionCompetencias !== false) {
      log("Starting certificacion_competencias generation");
      tasks.push(
        (async () => {
          try {
            const generator = new TemplateBasedPdfGenerator();
            const buffer =
              await generator.generateCertificacionCompetencias(templateData);
            documents.certificacion_competencias = buffer.toString("base64");
            log("certificacion_competencias generated successfully");
          } catch (error) {
            const errorMsg = `Failed to generate certificacion de competencias: ${error instanceof Error ? error.message : "Unknown error"}`;
            log("certificacion_competencias error", errorMsg);
            errors.push(errorMsg);
          }
        })(),
      );
    }

    if (options?.includeNotaEntrega !== false) {
      log("Starting nota_entrega generation");
      tasks.push(
        (async () => {
          try {
            const generator = new TemplateBasedPdfGenerator();
            const buffer = await generator.generateNotaEntrega(templateData);
            documents.nota_entrega = buffer.toString("base64");
            log("nota_entrega generated successfully");
          } catch (error) {
            const errorMsg = `Failed to generate nota de entrega: ${error instanceof Error ? error.message : "Unknown error"}`;
            log("nota_entrega error", errorMsg);
            errors.push(errorMsg);
          }
        })(),
      );
    }

    if (options?.includeValidacionDatos !== false) {
      log("Starting validacion_datos generation");
      tasks.push(
        (async () => {
          try {
            const generator = new TemplateBasedPdfGenerator();
            const buffer =
              await generator.generateValidacionDatos(templateData);
            documents.validacion_datos = buffer.toString("base64");
            log("validacion_datos generated successfully");
          } catch (error) {
            const errorMsg = `Failed to generate validacion de datos: ${error instanceof Error ? error.message : "Unknown error"}`;
            log("validacion_datos error", errorMsg);
            errors.push(errorMsg);
          }
        })(),
      );
    }

    // Run all generation tasks in parallel
    await Promise.all(tasks);

    log("Document generation complete", {
      documentsGenerated: Object.keys(documents).length,
      errors,
    });

    // Return success if at least one document was generated, otherwise return error
    if (Object.keys(documents).length > 0) {
      // Documents are already converted to base64 above
      return {
        success: true,
        documents,
      };
    } else {
      return {
        success: false,
        error: `No documents were generated successfully. Errors: ${errors.join("; ")}`,
      };
    }
  } catch (error) {
    log(
      "generateDocumentsServer unhandled error",
      error instanceof Error ? error.message : error,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Generate HTML previews for additional documents
 */
export async function previewDocumentsServer(
  request: DocumentGenerationRequest,
): Promise<{
  success: boolean;
  html?: { [key: string]: string };
  error?: string;
}> {
  try {
    const { certificates, osiData, firmanteData, options } = request;

    if (!certificates || !certificates.length) {
      return { success: false, error: "No certificates provided" };
    }

    // Fetch names if needed
    let cursoNombre = osiData.tema || "";
    if (osiData.id_curso && !osiData.curso_nombre) {
      cursoNombre = await resolveCourseName(osiData.id_curso, cursoNombre);
    } else if (osiData.curso_nombre) {
      cursoNombre = osiData.curso_nombre;
    }

    let cityResolved = osiData.ciudad || "Puerto La Cruz";
    if (osiData.id_ciudad) {
      cityResolved = await resolveCityName(osiData.id_ciudad, cityResolved);
    }

    const executionDateStr =
      certificates[0]?.execution_date || new Date().toISOString().split("T")[0];
    const executionDate = new Date(
      executionDateStr + (executionDateStr.includes("T") ? "" : "T12:00:00Z"),
    );

    const dateComponents = {
      fecha: executionDate.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      dia: executionDate.getDate().toString(),
      mes: executionDate.toLocaleDateString("es-ES", { month: "long" }),
      anio: executionDate.getFullYear().toString(),
    };

    const today = new Date();
    const formattedToday = today.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const templateData = {
      ...dateComponents,
      fecha_hoy: formattedToday,
      nombre_cliente: osiData.cliente_nombre_empresa || "",
      titulo_curso:
        certificates[0]?.course_title || cursoNombre || osiData.tema || "",
      ciudad: cityResolved,
      nro_osi: osiData.nro_osi || "",
      nombre_firmante:
        firmanteData?.nombre || "DPTO. CAPACITACIÓN / SHA DE VENEZUELA, C.A.",
      cargo_firmante: firmanteData?.cargo || "Jefe de Capacitación",
      nombre_recibido: options?.recibidoData?.nombre || "",
      cargo_recibido: options?.recibidoData?.cargo || "",
      localidad: osiData.localidad || "",
      localidad_cliente: osiData.direccion_ejecucion || "",
      fecha_ejecucion: osiData.fecha_ejecucion || "",
      participantes: certificates.map((cert, index) => ({
        index: index + 1,
        nombre_apellido: cert.participant_name || "",
        cedula: formatCedula(cert),
        puntuacion: cert.score?.toString() || "",
        condicion: cert.score && cert.score >= 14 ? "APROBADO" : "REPROBADO",
        numero_control: cert.control_number?.toString() || "PREVIEW",
      })),
    } as TemplateData;

    return {
      success: true,
      html: {
        certificacion_competencias:
          buildCertificacionCompetenciasHtml(templateData),
        nota_entrega: buildNotaEntregaHtml(templateData),
        validacion_datos: buildValidacionDatosHtml(templateData),
      },
    };
  } catch (error) {
    console.error("Error generating document previews:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
