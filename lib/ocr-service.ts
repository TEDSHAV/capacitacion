/**
 * OCR Service for participant list scanning
 * Uses Mistral OCR 3 for handwritten text recognition
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
  mistralKey?: string;
}

export class OCRService {
  private static readonly GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
  private static readonly MISTRAL_API_URL = "https://api.mistral.ai/v1/ocr";
  private static readonly MISTRAL_CHAT_URL = "https://api.mistral.ai/v1/chat/completions";

  /**
   * Main entrypoint for OCR processing.
   * Prioritizes Google Gemini (Gemini 2.0/1.5 Flash - fast, free tier, high accuracy),
   * with automatic fallback to Mistral OCR if configured.
   */
  static async processImage(
    file: File,
    keys: string | OCRConfig,
    mode: "certificate" | "portal" = "certificate"
  ): Promise<OCRResult> {
    const config: OCRConfig =
      typeof keys === "string"
        ? keys.startsWith("AIza")
          ? { geminiKey: keys }
          : { mistralKey: keys, geminiKey: undefined }
        : keys;

    // 1. Try Google Gemini first if key is available
    if (config.geminiKey) {
      console.log(`[OCRService] Processing with Google Gemini (${mode} mode)...`);
      const geminiResult = await this.processWithGemini(file, config.geminiKey, mode);

      if (!geminiResult.error) {
        return geminiResult;
      }

      console.warn(`[OCRService] Gemini failed: ${geminiResult.error}. Checking fallback...`);

      // If Gemini failed and we don't have Mistral key, return Gemini's error
      if (!config.mistralKey) {
        return geminiResult;
      }

      console.log("[OCRService] Falling back to Mistral OCR...");
    }

    // 2. Try Mistral OCR if key is available
    if (config.mistralKey) {
      return this.processWithMistral(file, config.mistralKey, mode);
    }

    return {
      text: "",
      error: "No se proporcionó ninguna clave de API válida para OCR (GEMINI_API_KEY o MISTRAL_API_KEY).",
    };
  }

  /**
   * Process document using Google Gemini (Gemini 2.0 Flash / 1.5 Flash)
   * Direct multimodal visual understanding with structured JSON extraction.
   */
  static async processWithGemini(
    file: File,
    apiKey: string,
    mode: "certificate" | "portal" = "certificate"
  ): Promise<OCRResult> {
    try {
      const base64 = await this.fileToBase64(file);
      const mimeType = file.type || "image/jpeg";

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

      // Available multimodal flash models in order of priority
      const models = [
        "gemini-3.7-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
        "gemini-flash-latest",
      ];
      let lastError = "";

      for (const model of models) {
        const url = `${this.GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
        const response = await this.fetchWithRetry(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          lastError = errData?.error?.message || response.statusText;
          console.warn(`[OCR Gemini] Model ${model} returned status ${response.status}: ${lastError}`);
          // On 404 (deprecated/unsupported) or 503 (high demand spike), try next model in cascade
          if (response.status === 404 || response.status === 503 || response.status === 500) {
            continue;
          }
          if (response.status === 429) {
            continue; // Try next model or fallback
          }
          continue;
        }

        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) {
          return { text: "", error: "Google Gemini no devolvió contenido interpretable." };
        }

        let parsed: { markdown?: string; participants?: Array<{ name?: string; cedula?: string; nationality?: string; score?: number | null }> };
        try {
          parsed = JSON.parse(candidateText);
        } catch {
          const match = candidateText.match(/\{[\s\S]*\}/);
          if (match) {
            parsed = JSON.parse(match[0]);
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

      return {
        text: "",
        error: `Error procesando imagen con Google Gemini: ${lastError}`,
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
   * Process an image file using Mistral OCR
   * mode: "certificate" (default, with scores) or "portal" (attendance list, no scores)
   */
  static async processWithMistral(file: File, apiKey: string, mode: "certificate" | "portal" = "certificate"): Promise<OCRResult> {
    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(file);

      // Call Mistral OCR API
      const isPdf = file.type === "application/pdf";
      const requestPayload = JSON.stringify({
        model: "mistral-ocr-latest",
        document: isPdf
          ? {
              type: "document_url",
              document_url: `data:${file.type};base64,${base64}`,
            }
          : {
              type: "image_url",
              image_url: `data:${file.type};base64,${base64}`,
            },
      });

      const response = await this.fetchWithRetry(this.MISTRAL_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: requestPayload,
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        console.error("Mistral API error:", error);

        if (response.status === 429) {
          return {
            text: "",
            error: "Límite de solicitudes de Mistral AI alcanzado (429). Por favor espera un momento o verifica los créditos de tu cuenta en Mistral Console.",
          };
        }

        return {
          text: "",
          error:
            error.message || `OCR processing failed: ${response.statusText}`,
        };
      }

      const data = await response.json();

      // Mistral OCR returns a pages array with markdown
      const fullMarkdown =
        data.pages?.map((p: { markdown?: string }) => p.markdown).join("\n") ||
        data.markdown ||
        data.text ||
        "";

      // Parse the OCR result to extract participants using regex
      const { participants: regexParticipants, potentialNamesFound } = this.parseParticipants(fullMarkdown);

      console.log(`[OCR] Regex found ${regexParticipants.length} participants, buffered ${potentialNamesFound} potential names`);

      let participants = regexParticipants;
      
      const hasLowQualityRegex = regexParticipants.length > 0 && 
        regexParticipants.every(p => p.name.length < 5 || p.idNumber.length < 7);

      const needsAI =
        fullMarkdown.trim().length > 50 &&
        (regexParticipants.length === 0 || 
         potentialNamesFound > regexParticipants.length || 
         hasLowQualityRegex);

      if (needsAI) {
        console.log("[OCR] Falling back to AI extraction...");
        const aiParticipants = await this.extractWithAI(fullMarkdown, apiKey, mode);
        
        if (aiParticipants.length > 0) {
          console.log(`[OCR] AI extraction found ${aiParticipants.length} participants (regex had ${regexParticipants.length})`);
          participants = aiParticipants;
        } else {
          console.log(`[OCR] AI extraction found 0, keeping regex result (${regexParticipants.length})`);
        }
      }

      return {
        text: fullMarkdown,
        markdown: fullMarkdown,
        participants,
      };
    } catch (error) {
      console.error("OCR service error:", error);
      return {
        text: "",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * AI-powered participant extraction using Mistral chat completions.
   * More reliable for cursive handwriting where regex parsing fails.
   */
  private static async extractWithAI(
    ocrMarkdown: string,
    apiKey: string,
    mode: "certificate" | "portal" = "certificate"
  ): Promise<ExtractedParticipant[]> {
    try {
      const systemPrompt = mode === "portal"
        ? `You are a data extraction assistant for Venezuelan training attendance lists (SHA de Venezuela).
You will receive OCR text from a handwritten attendance list.
The document table has columns: NOMBRE Y APELLIDO (full name), CÉDULA DE IDENTIDAD (ID number), CARGO (job title), FIRMA (signature AM/PM).
There is NO score column in this document. Do not attempt to extract scores.
Due to cursive handwriting, the OCR text may have noise, merged words, or misread characters.

IMPORTANT STRICT RULES:
1. The participant table usually starts after headers like "LISTA DE ASISTENCIA" or "NOMBRE Y APELLIDO". Skip EVERYTHING above the actual table rows.
2. extract each participant row and return ONLY a valid JSON array. No explanation, no markdown code blocks, just the raw JSON array.
3. Each object must have: { "name": string, "cedula": string, "score": null, "nationality": "V" | "E" }
4. "cedula" must be digits only (remove dots, spaces, dashes). Must be 6-10 digits.
5. "nationality" is "V" (venezolano) by default unless the ID is prefixed with E or E-
6. "score" must always be null (this document has no scores)
7. "name" should be Title Case.
8. Skip header rows, company info, facilitator names, and any row without a valid cedula.
9. The company RIF (J-31315131-9) is NOT a participant, skip it.
10. VERY IMPORTANT: Ignore the CARGO column. Words like "Analista", "Supervisor", "Gerente", "Operador", "Mecánico", "Conductor", "Pasante" are job titles, NOT names. If a row's name looks like a job title, skip it or find the real name in the same row.
11. If you are unsure if a row is a participant, skip it.`
        : `You are a data extraction assistant for Venezuelan training certificates (SHA de Venezuela).
You will receive OCR text from a handwritten participant list called "CALIFICACIÓN DE LOS PARTICIPANTES".
The document has columns: N° (row number), NOMBRE Y APELLIDO (full name), CÉDULA (ID number), PUNTUACIÓN (score 0-20), CONDICIÓN (Aprobado/Reprobado).
Due to cursive handwriting, the OCR text may have noise, merged words, or misread characters.

IMPORTANT STRICT RULES:
1. The table starts after the header "CALIFICACIÓN DE LOS PARTICIPANTES". Skip everything above it.
2. extract each participant row and return ONLY a valid JSON array. No explanation, no markdown code blocks, just the raw JSON array.
3. Each object must have: { "name": string, "cedula": string, "score": number | null, "nationality": "V" | "E" }
4. "cedula" must be digits only (remove dots, spaces, dashes). Must be 6-10 digits.
5. "nationality" is "V" (venezolano) by default unless the ID is prefixed with E or E-
6. "score" is a number between 0-20, or null if not found.
7. "name" should be Title Case.
8. Skip header rows, company info, facilitator names, and any row without a valid cedula.
9. The company RIF (J-31315131-9) is NOT a participant, skip it.
10. If you are unsure if a row is a participant, skip it.`;

      const userMessage = `Extract participants from this OCR text of a handwritten Venezuelan training document:\n\n${ocrMarkdown}`;

      const chatPayload = JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      });

      const response = await this.fetchWithRetry(this.MISTRAL_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: chatPayload,
      });

      if (!response.ok) {
        console.error("[OCR AI] Chat API error:", response.statusText);
        return [];
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? "";
      console.log("[OCR AI] Raw response:", content.substring(0, 300));

      // Extract JSON array from the response (handle any extra text)
      const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        console.warn("[OCR AI] No JSON array found in response");
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        name: string;
        cedula: string;
        score: number | null;
        nationality: string;
      }>;

      return parsed
        .filter((p) => p.name && p.cedula && p.cedula.replace(/\D/g, "").length >= 6)
        .map((p) => ({
          name: this.cleanName(p.name),
          idNumber: p.cedula.replace(/\D/g, ""),
          nationality:
            p.nationality?.toUpperCase() === "E" ? "extranjero" : "venezolano",
          score: p.score ?? undefined,
          confidence: 0.95,
        }));
    } catch (err) {
      console.error("[OCR AI] Extraction failed:", err);
      return [];
    }
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
   * Parse OCR text to extract participant information
   * This is a heuristic-based parser that looks for patterns like:
   * - Name followed by ID number
   * - V- or E- prefixes for Venezuelan IDs (optional)
   * - Table structures (including Markdown tables)
   * - Dot notation in IDs (e.g., 9.389.140)
   */
  private static parseParticipants(text: string): { participants: ExtractedParticipant[]; potentialNamesFound: number } {
    const participants: ExtractedParticipant[] = [];
    let potentialNamesFound = 0;
    const lines = text.split("\n").filter((line) => line.trim());

    // Blacklist of words that are likely job titles (cargo) or noise
    const forbiddenNames = [
      "Analista", "Supervisor", "Gerente", "Operador", "Mecanico", "Mecánico", 
      "Conductor", "Pasante", "Chofer", "Obrero", "Coordinador", "Jefe", "Presidente",
      "Razón Social", "Ente Didáctico", "Centro De Formación", "Centro Formacion",
      "Sha De Venezuela", "Capacitación", "Curso", "Facilitador", "Fecha", "Página",
      "Nombre Y Apellido", "Cédula", "Identidad", "Firma", "Cargo", "Asistencia"
    ].map(n => n.toLowerCase());

    // Pattern for IDs: Optional V/E, followed by Venezuelan ID format (dots) or raw digits
    const idPattern = /(?:([VE])[-\s]?)?(\d{1,2}(?:\.\d{3}){1,2}|\d{6,9})\b/i;
    // Relaxed fallback pattern for OCR misreads like "18.992167" or "18 992 167"
    const idPatternRelaxed = /(?:([VE])[-\s]?)?(\d(?:[.\s\d]{4,12})\d)\b/i;

    // Pattern for names (fallback for non-table lines)
    // More flexible: allows single names, names with accents, and multiple words, case insensitive
    const namePattern = /([a-zA-ZÁÉÍÓÚÑáéíóúñ']{2,}(?:\s+[a-zA-ZÁÉÍÓÚÑáéíóúñ']{2,})+)/i;

    // Check if Mistral found a formatted table in this document
    const hasTable = lines.some((line) => line.includes("|"));

    console.log("[OCR Parser] Total lines:", lines.length, "hasTable:", hasTable);

    let lastPotentialName = "";
    let lastPotentialNameLineIndex = -1;
    let foundHeader = false;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // HEURISTIC: Skip lines until we find a header-like row (more strict parsing)
      if (!foundHeader) {
        const lowerLine = line.toLowerCase();
        if (
          lowerLine.includes("nombre y apellido") || 
          lowerLine.includes("cédula") || 
          lowerLine.includes("lista de asistencia") ||
          lowerLine.includes("calificación")
        ) {
          foundHeader = true;
          console.log(`[OCR Parser] Found header at line ${lineIndex}: ${line.trim()}`);
          continue;
        }
        // If no header found yet, skip noisy header lines
        if (lineIndex < 15) continue;
      }

      // Skip markdown table headers/separators
      // Only skip "nro"/"cédula" in table header rows (with |), not in plain data lines
      if (
        line.includes("---") ||
        line.toLowerCase().includes("nombre y apellido") ||
        (line.includes("|") &&
          (line.toLowerCase().includes("nro") ||
            line.toLowerCase().includes("cédula") ||
            line.toLowerCase().includes("razón social")))
      )
        continue;

      let name = "";
      let idNumberValue = "";
      let prefix = "V"; // Default to V
      let score: number | undefined = undefined;

      // APPROACH 1: Markdown Table Parsing
      if (line.includes("|")) {
        const cells = line.split("|").map((c) => c.trim()).filter((c) => c);

        // Find ID cell index - try strict pattern first, then relaxed
        let idCellIndex = -1;
        let bestIdMatch = null;
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i].trim();
          if (!cell) continue;

          let match = cell.match(idPattern);
          if (!match) match = cell.match(idPatternRelaxed);
          if (match && match[2]) {
            const digitsOnly = match[2].replace(/[.\s]/g, "");
            
            // EXPLICIT CHECK: RIF of SHA (31315131) is NOT a participant ID
            if (digitsOnly === "31315131") {
              console.log("[OCR Parser] Skipping SHA RIF numeric part as ID");
              continue;
            }

            if (digitsOnly.length >= 6) {
              if (
                !bestIdMatch ||
                digitsOnly.length > bestIdMatch[2].replace(/[.\s]/g, "").length
              ) {
                idCellIndex = i;
                bestIdMatch = match;
              }
            }
          }
        }

        if (idCellIndex >= 0) {
          const idMatch = bestIdMatch;
          if (idMatch) {
            if (idMatch[1]) prefix = idMatch[1].toUpperCase();
            // Remove all dots and spaces from ID
            idNumberValue = idMatch[2].replace(/[.\s]/g, "");

            // IMPROVED NAME DETECTION: Look for the most likely name column
            // Usually it's in columns 0, 1, or 2. Job titles (cargo) are usually later.
            let bestNameCandidate = "";
            for (let i = 0; i < cells.length; i++) {
              if (i === idCellIndex) continue;
              const cell = cells[i].trim();
              
              // Skip headers, empty cells, and numeric-only cells
              if (
                !cell ||
                cell.length < 3 ||
                /^\d+$/.test(cell.replace(/[.,\s]/g, ""))
              )
                continue;
              
              const lowerCell = cell.toLowerCase();
              if (
                lowerCell.includes("nro") ||
                lowerCell.includes("cédula") ||
                lowerCell.includes("razón social")
              )
                continue;

              // Skip known job titles
              if (forbiddenNames.some(f => lowerCell === f || lowerCell.startsWith(f + " "))) {
                console.log(`[OCR Parser] Skipping blacklisted name/cargo: ${cell}`);
                continue;
              }

              // HEURISTIC: Favor columns 0, 1, 2 for names
              const isLikelyNameColumn = i <= 2;
              
              if (isLikelyNameColumn && !bestNameCandidate) {
                bestNameCandidate = cell;
              } else if (cell.length > bestNameCandidate.length && !bestNameCandidate) {
                // Only use length as tie-breaker if we don't have a likely column candidate
                bestNameCandidate = cell;
              }
            }

            if (bestNameCandidate) {
              name = this.cleanName(bestNameCandidate);
            } else if (idCellIndex > 0) {
              // Fallback to previous column
              const prevCell = cells[idCellIndex - 1];
              if (!forbiddenNames.some(f => prevCell.toLowerCase().includes(f))) {
                name = this.cleanName(prevCell);
              }
            }

            // Extract score - Look in ALL columns after the ID
            for (let i = idCellIndex + 1; i < cells.length; i++) {
              const cellText = cells[i].trim();
              if (!cellText) continue;

              // Try to find a number in the cell
              const scoreMatch = cellText.match(/(\d{1,2}(?:[.,]\d)?)/);
              if (scoreMatch) {
                const scoreNum = parseFloat(scoreMatch[1].replace(",", "."));

                // Valid scores are typically between 0 and 20
                if (!isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= 20) {
                  score = Math.round(scoreNum);
                  break; // Found a valid score
                }
              }
            }
          }
        }
      }
      // APPROACH 2: Plain Text Fallback (Supports multi-line)
      else {
        let idMatch = line.match(idPattern);
        if (!idMatch) idMatch = line.match(idPatternRelaxed);
        
        // Skip company RIFs (usually in header)
        const digitsOnly = idMatch ? idMatch[2].replace(/[.\s]/g, "") : "";
        const isRIF = 
          line.toUpperCase().includes("J-") || 
          line.toUpperCase().includes("G-") || 
          (line.toUpperCase().includes("V-") && digitsOnly.startsWith("31")) ||
          digitsOnly === "31315131";

        if (idMatch && !isRIF) {
          if (idMatch[1]) prefix = idMatch[1].toUpperCase();
          // Remove all dots and spaces from ID
          idNumberValue = digitsOnly;

          const idIndex = line.indexOf(idMatch[0]);
          const textBeforeId = line.substring(0, idIndex).trim();

          const nameMatch = textBeforeId.match(namePattern);
          if (nameMatch) {
            name = nameMatch[0];
          } else if (textBeforeId.length > 5 && !/^\d+$/.test(textBeforeId.replace(/[.\s]/g, ""))) {
            name = this.cleanName(textBeforeId);
          } else if (lastPotentialName && (lineIndex - lastPotentialNameLineIndex) <= 3) {
            // Use the name found on a previous line if it was very recent
            name = lastPotentialName;
            console.log(`[OCR Parser] Pairing ID ${idNumberValue} with previous line name: ${name}`);
            
            // IMPORTANT: Clear the buffer so we don't reuse this name for the next ID
            lastPotentialName = ""; 
            lastPotentialNameLineIndex = -1;
          }

          // Try to find a score after the ID in plain text
          const textAfterId = line
            .substring(idIndex + idMatch[0].length)
            .trim();
          const scoreMatch = textAfterId.match(/\b(\d{1,2}(?:[.,]\d)?)\b/);
          if (scoreMatch) {
            const scoreNum = parseFloat(scoreMatch[1].replace(",", "."));

            // Valid scores are typically between 0 and 20
            if (!isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= 20) {
              score = Math.round(scoreNum);
            }
          }
        } else {
          // No ID match on this line, check if it's a potential name for the NEXT line
          const potentialNameMatch = line.match(namePattern);
          // Filter out common header noise
          const isHeaderNoise = 
            line.toUpperCase().includes("SHA") || 
            line.toUpperCase().includes("VENEZUELA") ||
            line.toUpperCase().includes("CURSO") ||
            line.toUpperCase().includes("FACILITADOR") ||
            line.toUpperCase().includes("PAGINA") ||
            line.toUpperCase().includes("FECHA") ||
            line.toUpperCase().includes("RAZÓN SOCIAL") ||
            line.toUpperCase().includes("ENTE DIDÁCTICO");

          if (potentialNameMatch && !isHeaderNoise) {
            const cleanedPotential = this.cleanName(potentialNameMatch[0]);
            
            // Skip job titles in potential names too
            const lowerPotential = cleanedPotential.toLowerCase();
            const isForbidden = forbiddenNames.some(f => lowerPotential === f || lowerPotential.startsWith(f + " "));

            if (cleanedPotential.length > 5 && !isForbidden) {
              lastPotentialName = cleanedPotential;
              lastPotentialNameLineIndex = lineIndex;
              potentialNamesFound++;
              console.log(`[OCR Parser] Buffered potential name: ${lastPotentialName}`);
            }
          }
        }
      }
      
      // Validate extracted data
      if (
        name &&
        name.length > 2 &&
        !name.match(/^[0-9\s.,-]+$/) && // Reject if only numbers/symbols
        idNumberValue &&
        idNumberValue.length >= 6 &&
        !forbiddenNames.some(f => name.toLowerCase() === f || name.toLowerCase().startsWith(f + " "))
      ) {
        participants.push({
          name: name,
          idNumber: idNumberValue,
          nationality: prefix === "E" ? "extranjero" : "venezolano",
          score: score,
          confidence: hasTable ? 0.9 : 0.8, // Boost confidence if structured
        });
      } else {
        // Fallback: If we have something that looks like a name and something that looks like an ID in the line
        // even if they weren't in the "correct" columns or format
        if (!name && idNumberValue && line.includes("|")) {
          // Maybe the name is in any other cell?
          const cells = line.split("|").map((c) => c.trim());
          for (const cell of cells) {
            const lowerCell = cell.toLowerCase();
            const isForbidden = forbiddenNames.some(f => lowerCell === f || lowerCell.startsWith(f + " "));

            if (
              cell &&
              cell.length > 5 &&
              !cell.match(idPattern) &&
              !/^\d+$/.test(cell.replace(/[.\s]/g, "")) &&
              !isForbidden
            ) {
              const cleaned = this.cleanName(cell);
              if (cleaned.length > 5) {
                participants.push({
                  name: cleaned,
                  idNumber: idNumberValue,
                  nationality: prefix === "E" ? "extranjero" : "venezolano",
                  score: score,
                  confidence: 0.7,
                });
                break;
              }
            }
          }
        }
      }
    }

    // Remove duplicates
    const uniqueParticipants = participants.filter(
      (participant, index, self) =>
        index === self.findIndex((p) => p.idNumber === participant.idNumber),
    );

    return { participants: uniqueParticipants, potentialNamesFound };
  }

  /**
   * Clean up and format extracted name to Title Case
   */
  private static cleanName(name: string): string {
    const cleaned = name
      .replace(/^\d+[\.\)]?\s*/, "") // Remove leading numbers (row numbers)
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

  /**
   * Helper to perform fetch with exponential backoff on 429 Rate Limit
   */
  private static async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = 3
  ): Promise<Response> {
    let attempt = 0;
    let delay = 2000;

    while (true) {
      const response = await fetch(url, options);

      if (response.status === 429 && attempt < maxRetries) {
        attempt++;
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 0;
        const waitTime = !isNaN(retryAfterSeconds) && retryAfterSeconds > 0
          ? retryAfterSeconds * 1000
          : delay;

        console.warn(
          `[OCRService] Mistral rate-limited (429), attempt ${attempt}/${maxRetries}. Retrying in ${waitTime}ms...`
        );
        await new Promise((r) => setTimeout(r, waitTime));
        delay *= 2; // exponential backoff (2s -> 4s -> 8s)
        continue;
      }

      return response;
    }
  }
}

