/**
 * Server-side renderer for the Survey Tabulation PDF.
 *
 * Uses @react-pdf/renderer's `renderToBuffer` to produce a PDF Buffer
 * from the declarative <SurveyTabulacionPdfDocument /> component.
 *
 * Replaces the legacy jsPDF generator (lib/survey-tabulacion-generator.ts)
 * with the same exported function signature so the API route only needs
 * an import swap.
 */

import fs from "fs";
import path from "path";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import SurveyTabulacionPdfDocument from "@/lib/survey-tabulacion-pdf-document";
import { SurveyTabulacionData } from "@/types";

// ─── Image cache ─────────────────────────────────────────────────────────────
const _imageCache = new Map<string, string>();

function getImageDataUri(filename: string): string | null {
  if (_imageCache.has(filename)) return _imageCache.get(filename)!;
  try {
    const imgPath = path.join(process.cwd(), "public", filename);
    if (!fs.existsSync(imgPath)) return null;
    const buffer = fs.readFileSync(imgPath);
    const ext = path.extname(filename).toLowerCase().slice(1);
    const mime = ext === "jpg" || ext === "jpeg" ? "jpeg" : ext;
    const dataUri = `data:image/${mime};base64,${buffer.toString("base64")}`;
    _imageCache.set(filename, dataUri);
    return dataUri;
  } catch {
    return null;
  }
}

function formatGeneratedAt(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

/**
 * Generate the survey tabulation PDF and return it as a Buffer.
 */
export async function generateSurveyTabulacionPdf(
  data: SurveyTabulacionData,
): Promise<Buffer> {
  const logoSrc = getImageDataUri("logo.png") || "";
  const footerSrc = getImageDataUri("docs_footer.png") || undefined;
  const generatedAt = formatGeneratedAt(new Date());

  const buffer = await renderToBuffer(
    <SurveyTabulacionPdfDocument
      data={data}
      logoSrc={logoSrc}
      footerSrc={footerSrc}
      generatedAt={generatedAt}
    />,
  );

  return buffer;
}
