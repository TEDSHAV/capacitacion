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

export class OCRService {
  private static readonly MISTRAL_API_URL = "https://api.mistral.ai/v1/ocr";
  private static readonly MISTRAL_CHAT_URL = "https://api.mistral.ai/v1/chat/completions";

  /**
   * Process an image file using Mistral OCR
   * mode: "certificate" (default, with scores) or "portal" (attendance list, no scores)
   */
  static async processImage(file: File, apiKey: string, mode: "certificate" | "portal" = "certificate"): Promise<OCRResult> {
    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(file);

      // Call Mistral OCR API
      const isPdf = file.type === "application/pdf";
      const response = await fetch(this.MISTRAL_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
        }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        console.error("Mistral API error:", error);
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

      // Fall back to AI extraction if:
      // - Regex found 0 participants, OR
      // - More names were buffered than participants found (column-by-column OCR, cursive)
      let participants = regexParticipants;
      const needsAI =
        fullMarkdown.trim().length > 50 &&
        (regexParticipants.length === 0 || potentialNamesFound > regexParticipants.length);

      if (needsAI) {
        console.log("[OCR] Falling back to AI extraction (buffered names exceed found participants)...");
        const aiParticipants = await this.extractWithAI(fullMarkdown, apiKey, mode);
        if (aiParticipants.length > regexParticipants.length) {
          console.log(`[OCR] AI extraction found ${aiParticipants.length} participants (regex had ${regexParticipants.length})`);
          participants = aiParticipants;
        } else {
          console.log(`[OCR] AI extraction found ${aiParticipants.length}, keeping regex result (${regexParticipants.length})`);
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
Your task: extract each participant row and return ONLY a valid JSON array. No explanation, no markdown code blocks, just the raw JSON array.
Each object must have: { "name": string, "cedula": string, "score": null, "nationality": "V" | "E" }
- "cedula" must be digits only (remove dots, spaces, dashes). Must be 6-10 digits.
- "nationality" is "V" (venezolano) by default unless the ID is prefixed with E or E-
- "score" must always be null (this document has no scores)
- "name" should be Title Case
- Skip header rows, company info, facilitator names, and any row without a valid cedula
- The company RIF (J-31315131-9) is NOT a participant, skip it
- Ignore the CARGO and FIRMA columns, only extract name and cédula`
        : `You are a data extraction assistant for Venezuelan training certificates (SHA de Venezuela).
You will receive OCR text from a handwritten participant list called "CALIFICACIÓN DE LOS PARTICIPANTES".
The document has columns: N° (row number), NOMBRE Y APELLIDO (full name), CÉDULA (ID number), PUNTUACIÓN (score 0-20), CONDICIÓN (Aprobado/Reprobado).
Due to cursive handwriting, the OCR text may have noise, merged words, or misread characters.
Your task: extract each participant row and return ONLY a valid JSON array. No explanation, no markdown code blocks, just the raw JSON array.
Each object must have: { "name": string, "cedula": string, "score": number | null, "nationality": "V" | "E" }
- "cedula" must be digits only (remove dots, spaces, dashes). Must be 6-10 digits.
- "nationality" is "V" (venezolano) by default unless the ID is prefixed with E or E-
- "score" is a number between 0-20, or null if not found
- "name" should be Title Case
- Skip header rows, company info, facilitator names, and any row without a valid cedula
- The company RIF (J-31315131-9) is NOT a participant, skip it`;

      const userMessage = `Extract participants from this OCR text of a handwritten Venezuelan training document:\n\n${ocrMarkdown}`;

      const response = await fetch(this.MISTRAL_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.1,
          max_tokens: 2048,
        }),
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
    if (lines.length > 0) {
      console.log("[OCR Parser] First 5 lines:", lines.slice(0, 5));
    }

    let lastPotentialName = "";
    let lastPotentialNameLineIndex = -1;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      // Skip markdown table headers/separators
      // Only skip "nro"/"cédula" in table header rows (with |), not in plain data lines
      if (
        line.includes("---") ||
        line.toLowerCase().includes("nombre y apellido") ||
        (line.includes("|") &&
          (line.toLowerCase().includes("nro") ||
            line.toLowerCase().includes("cédula")))
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
            // Usually it's the longest non-numeric cell that isn't the ID itself
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
              if (
                cell.toLowerCase().includes("nro") ||
                cell.toLowerCase().includes("cédula")
              )
                continue;

              if (cell.length > bestNameCandidate.length) {
                bestNameCandidate = cell;
              }
            }

            if (bestNameCandidate) {
              name = this.cleanName(bestNameCandidate);
            } else if (idCellIndex > 0) {
              // Fallback to previous column
              name = this.cleanName(cells[idCellIndex - 1]);
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
        const isRIF = line.toUpperCase().includes("J-") || line.toUpperCase().includes("G-") || line.toUpperCase().includes("V-") && line.replace(/[^0-9]/g, "").startsWith("31");

        if (idMatch && !isRIF) {
          if (idMatch[1]) prefix = idMatch[1].toUpperCase();
          // Remove all dots and spaces from ID
          idNumberValue = idMatch[2].replace(/[.\s]/g, "");

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
            line.toUpperCase().includes("FECHA");

          if (potentialNameMatch && !isHeaderNoise) {
            const cleanedPotential = this.cleanName(potentialNameMatch[0]);
            if (cleanedPotential.length > 5) {
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
        idNumberValue.length >= 6
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
            if (
              cell &&
              cell.length > 5 &&
              !cell.match(idPattern) &&
              !/^\d+$/.test(cell.replace(/[.\s]/g, ""))
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
    return (
      participant.name.length > 2 &&
      participant.idNumber.length >= 6 &&
      participant.idNumber.length <= 9
    );
  }
}
