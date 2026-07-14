"use server";

import { TemplateData } from "./document-templates-new";
import { generatePdfFromHtml } from "./pdf-service";
import {
  buildCertificacionCompetenciasHtml,
  buildNotaEntregaHtml,
  buildValidacionDatosHtml,
} from "./document-html-templates";

export interface DocumentTestRequest {
  templateData: TemplateData;
  options: {
    includeCertificacionCompetencias?: boolean;
    includeNotaEntrega?: boolean;
    includeValidacionDatos?: boolean;
  };
}

export interface DocumentTestResult {
  success: boolean;
  documents?: {
    [key: string]: string; // Base64 encoded documents
  };
  error?: string;
  errors?: string[];
}

/**
 * Generates documents for testing without database operations
 */
export async function testGenerateDocumentsAction(
  request: DocumentTestRequest,
): Promise<DocumentTestResult> {
  try {
    const { templateData, options } = request;

    if (!templateData.participantes || !templateData.participantes.length) {
      return {
        success: false,
        error: "No hay participantes para generar documentos.",
      };
    }

    const documents: { [key: string]: string } = {};
    const errors: string[] = [];
    const tasks = [];

    if (options.includeCertificacionCompetencias) {
      tasks.push(
        (async () => {
          try {
            const html = buildCertificacionCompetenciasHtml(templateData);
            const buffer = await generatePdfFromHtml(html);
            documents.certificacion_competencias = buffer.toString("base64");
          } catch (error) {
            errors.push(`Error en Certificación de Competencias: ${error instanceof Error ? error.message : "Error desconocido"}`);
          }
        })(),
      );
    }

    if (options.includeNotaEntrega) {
      tasks.push(
        (async () => {
          try {
            const html = buildNotaEntregaHtml(templateData);
            const buffer = await generatePdfFromHtml(html);
            documents.nota_entrega = buffer.toString("base64");
          } catch (error) {
            errors.push(`Error en Nota de Entrega: ${error instanceof Error ? error.message : "Error desconocido"}`);
          }
        })(),
      );
    }

    if (options.includeValidacionDatos) {
      tasks.push(
        (async () => {
          try {
            const html = buildValidacionDatosHtml(templateData);
            const buffer = await generatePdfFromHtml(html);
            documents.validacion_datos = buffer.toString("base64");
          } catch (error) {
            errors.push(`Error en Validación de Datos: ${error instanceof Error ? error.message : "Error desconocido"}`);
          }
        })(),
      );
    }

    await Promise.all(tasks);

    if (Object.keys(documents).length > 0) {
      return {
        success: true,
        documents,
        errors: errors.length > 0 ? errors : undefined,
      };
    } else {
      return {
        success: false,
        error: "No se pudo generar ningún documento.",
        errors,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error inesperado durante la generación.",
    };
  }
}
