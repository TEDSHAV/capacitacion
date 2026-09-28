/**
 * OCR Service for participant list scanning
 * Uses Google Gemini multimodal vision for document understanding & extraction.
 */

export interface OCRResult {
  text: string;
  markdown?: string;
  participants?: ExtractedParticipant[];
  error?: string;
}

export interface ExtractedParticipant {
  name: string;
  idNumber: string;
  nationality?: "venezolano" | "extranjero";
  score?: number;
  confidence?: number;
}

export interface OCRConfig {
  geminiKey?: string;
}

export class OCRService {
  private static readonly GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

  /**
   * Main entrypoint for OCR processing.
   * Uses Google Gemini multimodal vision (fast, free tier, high accuracy).
   * If Gemini fails, returns a clear user-facing error indicating manual entry is required.
   */
  static async processImage(
    file: File,
    keys: string | OCRConfig,
    mode: "certificate" | "portal" = "certificate"
  ): Promise<OCRResult> {
    const config: OCRConfig =
      typeof keys === "string"
        ? { geminiKey: keys }
        : keys;

    if (!config.geminiKey) {
      return {
        text: "",
        error: "No se ha configurado la clave de Google Gemini para el escáner OCR. Contacta al administrador del sistema.",
      };
    }

    console.log(`[OCRService] Processing with Google Gemini (${mode} mode)...`);
    const geminiResult = await this.processWithGemini(file, config.geminiKey, mode);

    if (!geminiResult.error && geminiResult.participants && geminiResult.participants.length > 0) {
      return geminiResult;
    }

    // Gemini failed — return a clear, friendly error so the facilitador knows to enter manually
    console.warn(`[OCRService] Gemini failed or found no participants (${geminiResult.error || "0 participants"}).`);
    return {
      text: geminiResult.text || "",
      markdown: geminiResult.markdown || "",
      participants: [],
      error: "No fue posible reconocer los participantes del archivo automáticamente. Deberás agregarlos manualmente en la lista.",
    };
  }

  /**
   * Process document using Google Gemini (multimodal Flash models).
   * Direct visual understanding with structured JSON extraction.
   */
  static async processWithGemini(
    file: File,
    apiKey: string,
    mode: "certificate" | "portal" = "certificate"
  ): Promise<OCRResult> {
    try {
      const base64 = await this.fileToBase64(file);
      let mimeType = file.type;
      if (!mimeType || mimeType === "application/octet-stream") {
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith(".pdf")) mimeType = "application/pdf";
        else if (lowerName.endsWith(".png")) mimeType = "image/png";
        else if (lowerName.endsWith(".webp")) mimeType = "image/webp";
        else if (lowerName.endsWith(".heic")) mimeType = "image/heic";
        else mimeType = "image/jpeg";
      }
      if (mimeType === "image/jpg") mimeType = "image/jpeg";

      const systemPrompt = mode === "portal"
        ? `You are an expert OCR and document analysis AI for Venezuelan training attendance lists (SHA de Venezuela).
Analyze the attached document (image/PDF) which contains a handwritten attendance list ("LISTA DE ASISTENCIA").
The document table columns are: NOMBRE Y APELLIDO, CÉDULA DE IDENTIDAD, CARGO, FIRMA.
There is NO score column in this document.

Extract all participant rows.
Strict rules:
1. "name": Full name in Title Case. Ignore CARGO (words like Analista, Supervisor, Gerente, Operador, Mecánico, Conductor, Pasante, Chofer, Obrero, Coordinador, etc. are job titles, NOT names).
2. "cedula": Venezuelan national ID number. Digits ONLY (remove dots, dashes, spaces). Must be 6 to 10 digits.
3. "nationality": "V" (venezolano) or "E" (extranjero). Default is "V".
4. "score": Must be null.
5. Skip header rows, company info (e.g. SHA de Venezuela, RIF J-31315131-9), facilitator names, and empty rows.

Return a JSON object with:
- "markdown": A markdown text representation of the extracted document content
- "participants": Array of objects [{ "name": string, "cedula": string, "nationality": "V"|"E", "score": null }]`
        : `You are an expert OCR and document analysis AI for Venezuelan training evaluation sheets (SHA de Venezuela).
Analyze the attached document (image/PDF) which contains a handwritten participant list ("CALIFICACIÓN DE LOS PARTICIPANTES").
The document table columns are: N°, NOMBRE Y APELLIDO, CÉDULA, PUNTUACIÓN / NOTA (0-20), CONDICIÓN.

Extract all participant rows.
Strict rules:
1. "name": Full name in Title Case.
2. "cedula": Venezuelan national ID number. Digits ONLY (remove dots, dashes, spaces). Must be 6 to 10 digits.
3. "nationality": "V" (venezolano) or "E" (extranjero). Default is "V".
4. "score": Number from 0 to 20 representing the grade, or null if not found.
5. Skip header rows, company info, facilitator names, and empty rows.

Return a JSON object with:
- "markdown": A markdown text representation of the extracted document content
- "participants": Array of objects [{ "name": string, "cedula": string, "nationality": "V"|"E", "score": number|null }]`;

      const requestPayload = {
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64,
                },
              },
              {
                text: `${systemPrompt}\n\nRespond ONLY with a valid JSON object matching this schema:
{
  "markdown": "transcription text here",
  "participants": [
    {
      "name": "Full Name",
      "cedula": "12345678",
      "nationality": "V",
      "score": null
    }
  ]
}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      };

      // Current Gemini 3.x multimodal flash models (2.x are deprecated)
      const models = [
        "gemini-3.8-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.7-flash",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
      ];
      let lastError = "";

      for (const model of models) {
        const url = `${this.GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
        console.log(`[OCR Gemini] Trying model: ${model}...`);

        // Retry logic for transient errors (503 high demand, 429 rate limit)
        const MAX_RETRIES = 2;
        let retryDelay = 2000;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          let response: Response;
          try {
            response = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestPayload),
            });
          } catch (fetchErr) {
            lastError = fetchErr instanceof Error ? fetchErr.message : "Network error";
            console.warn(`[OCR Gemini] Model ${model} fetch error: ${lastError}`);
            break; // Network error — skip to next model
          }

          if (response.ok) {
            // Success — process the response below
            const data = await response.json();
            const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!candidateText) {
              lastError = "Google Gemini no devolvió contenido interpretable.";
              console.warn(`[OCR Gemini] Model ${model}: empty candidate text`);
              break; // Empty response — skip to next model
            }

            // Return early with parsed result
            return this.parseGeminiResponse(candidateText, model);
          }

          const errData = await response.json().catch(() => ({}));
          lastError = errData?.error?.message || response.statusText;

          // Transient errors (503/429) — retry with backoff
          if ((response.status === 503 || response.status === 429) && attempt < MAX_RETRIES) {
            console.warn(`[OCR Gemini] Model ${model} returned ${response.status} (attempt ${attempt + 1}/${MAX_RETRIES + 1}). Retrying in ${retryDelay}ms...`);
            await new Promise((r) => setTimeout(r, retryDelay));
            retryDelay *= 2;
            continue;
          }

          // 404 = deprecated model — skip immediately
          if (response.status === 404) {
            console.warn(`[OCR Gemini] Model ${model} is deprecated (404). Skipping.`);
            break;
          }

          // All other errors or exhausted retries
          console.warn(`[OCR Gemini] Model ${model} returned status ${response.status}: ${lastError}`);
          break;
        }
      } // end model loop

      return {
        text: "",
        error: `No se pudo procesar la imagen. Todos los modelos de Google Gemini fallaron. Último error: ${lastError}`,
      };
    } catch (err) {
      console.error("[OCR Gemini] Error:", err);
      return {
        text: "",
        error: err instanceof Error ? err.message : "Error desconocido en Google Gemini",
      };
    }
  }

  /**
   * Parse the JSON text returned by Gemini and extract participants.
   */
  private static parseGeminiResponse(candidateText: string, model: string): OCRResult {
    let parsed: { markdown?: string; participants?: Array<{ name?: string; cedula?: string; nationality?: string; score?: number | null }> };
    try {
      parsed = JSON.parse(candidateText);
    } catch {
      const match = candidateText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          return { text: candidateText, error: "No se pudo interpretar el formato JSON de Google Gemini." };
        }
      } else {
        return { text: candidateText, error: "No se pudo interpretar el formato JSON de Google Gemini." };
      }
    }

    const rawParticipants = Array.isArray(parsed.participants) ? parsed.participants : [];

    const participants: ExtractedParticipant[] = rawParticipants
      .filter((p) => p && p.name && p.cedula)
      .map((p) => {
        const digits = String(p.cedula).replace(/\D/g, "");
        return {
          name: this.cleanName(String(p.name)),
          idNumber: digits,
          nationality: String(p.nationality).toUpperCase() === "E" ? ("extranjero" as const) : ("venezolano" as const),
          score: typeof p.score === "number" && !isNaN(p.score) ? Math.round(p.score) : undefined,
          confidence: 0.95,
        };
      })
      .filter((p: ExtractedParticipant) => p.name.length > 2 && p.idNumber.length >= 6);

    console.log(`[OCR Gemini] Extracted ${participants.length} participants using ${model}`);

    return {
      text: parsed.markdown || "",
      markdown: parsed.markdown || "",
      participants,
    };
  }

  /**
   * Convert file to base64 (Node.js compatible)
   */
  private static async fileToBase64(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString("base64");
  }

  /**
   * Clean up and format extracted name to Title Case
   */
  private static cleanName(name: string): string {
    const cleaned = name
      .replace(/^\d+[\.)]?\s*/, "") // Remove leading numbers (row numbers)
      .replace(/[|•\-]\s*$/, "") // Remove trailing separators
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
    if (!cleaned) return "";

    return cleaned
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Validate participant data
   */
  static validateParticipant(participant: ExtractedParticipant): boolean {
    const forbiddenNames = [
      "Analista", "Supervisor", "Gerente", "Operador", "Mecanico", "Mecánico", 
      "Conductor", "Pasante", "Chofer", "Obrero", "Coordinador", "Jefe", "Presidente"
    ].map(n => n.toLowerCase());

    const lowerName = participant.name.toLowerCase();
    const isForbidden = forbiddenNames.some(f => lowerName === f || lowerName.startsWith(f + " "));

    return (
      participant.name.length > 2 &&
      !isForbidden &&
      participant.idNumber.length >= 6 &&
      participant.idNumber.length <= 9
    );
  }
}
