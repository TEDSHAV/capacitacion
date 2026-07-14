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
  id_number: string;
  nationality?: 'venezolano' | 'extranjero';
  score?: number;
  confidence?: number;
}

export class OCRService {
  private static readonly MISTRAL_API_URL = 'https://api.mistral.ai/v1/ocr';
  
  /**
   * Process an image file using Mistral OCR
   */
  static async processImage(file: File, apiKey: string): Promise<OCRResult> {
    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      console.log('File converted to base64, length:', base64.length);

      // Call Mistral OCR API
      console.log('Calling Mistral OCR API...');
      const isPdf = file.type === 'application/pdf';
      const response = await fetch(this.MISTRAL_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral-ocr-latest',
          document: isPdf ? {
            type: 'document_url',
            document_url: `data:${file.type};base64,${base64}`,
          } : {
            type: 'image_url',
            image_url: `data:${file.type};base64,${base64}`,
          },
        }),
      });

      console.log('Mistral API response status:', response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        console.error('Mistral API error:', error);
        return {
          text: '',
          error: error.message || `OCR processing failed: ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log('Mistral API response data keys:', Object.keys(data));

      // Mistral OCR returns a pages array with markdown
      const fullMarkdown = data.pages?.map((p: any) => p.markdown).join('\n') || data.markdown || data.text || '';
      console.log('Full markdown length:', fullMarkdown.length);

      // Parse the OCR result to extract participants
      const participants = this.parseParticipants(fullMarkdown);
      console.log('Parsed participants:', participants.length);

      return {
        text: fullMarkdown,
        markdown: fullMarkdown,
        participants,
      };
    } catch (error) {
      console.error('OCR service error:', error);
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Convert file to base64 (Node.js compatible)
   */
  private static async fileToBase64(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return buffer.toString('base64')
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
    const lines = text.split('\n').filter(line => line.trim());
    
    // Pattern for IDs: Optional V/E, followed by 6-9 digits with optional dots
    const idPattern = /(?:([VE])[-\s]?)?(\d{1,2}(?:\.\d{3}){1,2}|\d{6,9})\b/i;
    
    // Pattern for names (fallback for non-table lines)
    const namePattern = /([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)/;

    // Check if Mistral found a formatted table in this document
    const hasTable = lines.some(line => line.includes('|'));

    for (const line of lines) {
      // TABLE LOCK: If a table exists in the document, ignore all non-table lines
      if (hasTable && !line.includes('|')) continue;

      // Skip markdown table headers/separators
      if (line.includes('---') || line.toLowerCase().includes('nombre y apellido')) continue;

      let name = '';
      let idNumber = '';
      let prefix = 'V'; // Default to V
      let score: number | undefined = undefined;

      // APPROACH 1: Markdown Table Parsing
      if (line.includes('|')) {
        const cells = line.split('|').map(c => c.trim()).filter(c => c);
        const idCellIndex = cells.findIndex(cell => idPattern.test(cell));

        if (idCellIndex >= 0) {
          const idMatch = cells[idCellIndex].match(idPattern);
          if (idMatch) {
            if (idMatch[1]) prefix = idMatch[1].toUpperCase();
            idNumber = idMatch[2].replace(/\./g, '');

            if (idCellIndex > 0) {
               name = this.cleanName(cells[idCellIndex - 1]);
            }

            // Extract score from the column after ID (if exists)
            if (idCellIndex + 1 < cells.length) {
              const scoreText = cells[idCellIndex + 1].replace(/[^0-9]/g, '');
              const scoreNum = parseInt(scoreText, 10);
              if (!isNaN(scoreNum)) {
                score = scoreNum;
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
          idNumber = idMatch[2].replace(/\./g, '');
          
          const idIndex = line.indexOf(idMatch[0]);
          const textBeforeId = line.substring(0, idIndex).trim();
          
          const nameMatch = textBeforeId.match(namePattern);
          name = nameMatch ? nameMatch[0] : this.cleanName(textBeforeId);
        }
      }

      if (name && name.length > 2 && idNumber && idNumber.length >= 6) {
        participants.push({
          name: name,
          id_number: idNumber,
          nationality: prefix === 'E' ? 'extranjero' : 'venezolano',
          score: score,
          confidence: hasTable ? 0.9 : 0.8, // Boost confidence if structured
        });
      }
    }
    
    // Remove duplicates
    const uniqueParticipants = participants.filter((participant, index, self) =>
      index === self.findIndex(p => p.id_number === participant.id_number)
    );
    
    return uniqueParticipants;
  }

  /**
   * Clean up extracted name
   */
  private static cleanName(name: string): string {
    return name
      .replace(/^\d+[\.\)]?\s*/, '') // Remove leading numbers
      .replace(/[|•-]\s*$/, '') // Remove trailing separators
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Validate participant data
   */
  static validateParticipant(participant: ExtractedParticipant): boolean {
    return (
      participant.name.length > 2 &&
      participant.id_number.length >= 6 &&
      participant.id_number.length <= 9
    );
  }
}
