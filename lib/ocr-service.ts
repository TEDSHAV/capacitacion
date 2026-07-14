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

  /**
   * Process an image file using Mistral OCR
   */
  static async processImage(file: File, apiKey: string): Promise<OCRResult> {
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

      // Parse the OCR result to extract participants
      const participants = this.parseParticipants(fullMarkdown);

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
  private static parseParticipants(text: string): ExtractedParticipant[] {
    const participants: ExtractedParticipant[] = [];
    const lines = text.split("\n").filter((line) => line.trim());

    // Pattern for IDs: Optional V/E, followed by 6-9 digits with any separators
    // Much more relaxed to handle OCR misreads like "18.992167" or "18 992 167"
    const idPattern = /(?:([VE])[-\s]?)?(\d(?:[.\s\d]{5,12})\d)\b/i;

    // Pattern for names (fallback for non-table lines)
    // More flexible: allows single names, names with accents, and multiple words
    const namePattern =
      /([A-ZÁÉÍÓÚÑ][a-záéíóúñ'\-]*(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ'\-]*)+)/;

    // Check if Mistral found a formatted table in this document
    const hasTable = lines.some((line) => line.includes("|"));

    for (const line of lines) {
      // Skip markdown table headers/separators
      if (
        line.includes("---") ||
        line.toLowerCase().includes("nombre y apellido") ||
        line.toLowerCase().includes("nro") ||
        line.toLowerCase().includes("cédula")
      )
        continue;

      let name = "";
      let idNumberValue = "";
      let prefix = "V"; // Default to V
      let score: number | undefined = undefined;

      // APPROACH 1: Markdown Table Parsing
      if (line.includes("|")) {
        const cells = line.split("|").map((c) => c.trim());

        // Find ID cell index - look for cells that contain ID patterns
        // Prioritize cells with clear ID matches
        let idCellIndex = -1;
        let bestIdMatch = null;
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i].trim();
          if (!cell) continue;

          const match = cell.match(idPattern);
          if (match && match[2]) {
            // Check if it's likely an ID (mostly digits)
            const digitsOnly = match[2].replace(/[.\s]/g, "");
            if (digitsOnly.length >= 6 && digitsOnly.length <= 9) {
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
      // APPROACH 2: Plain Text Fallback (Only runs if no table exists anywhere in the document)
      else {
        const idMatch = line.match(idPattern);
        if (idMatch) {
          if (idMatch[1]) prefix = idMatch[1].toUpperCase();
          // Remove all dots and spaces from ID
          idNumberValue = idMatch[2].replace(/[.\s]/g, "");

          const idIndex = line.indexOf(idMatch[0]);
          const textBeforeId = line.substring(0, idIndex).trim();

          const nameMatch = textBeforeId.match(namePattern);
          name = nameMatch ? nameMatch[0] : this.cleanName(textBeforeId);

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
        }
      }
      // Validate extracted data
      if (
        name &&
        name.length > 2 &&
        !name.match(/^[0-9\s.,-]+$/) && // Reject if only numbers/symbols
        idNumberValue &&
        idNumberValue.length >= 6 &&
        idNumberValue.length <= 9
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

    return uniqueParticipants;
  }

  /**
   * Clean up and format extracted name to Title Case
   */
  private static cleanName(name: string): string {
    const trimmed = name.replace(/\s+/g, " ").trim();
    if (!trimmed) return "";

    return trimmed
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
