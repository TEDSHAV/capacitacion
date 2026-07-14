import jsPDF from "jspdf";
import { TextLayoutConfig } from "./certificate-config";

export class TextRenderer {
  private doc: jsPDF;

  constructor(doc: jsPDF) {
    this.doc = doc;
  }

  /**
   * Calculate font size based on text length and maximum allowed size
   */
  calculateFontSize(text: string, maxFontSize: number): number {
    const textLength = text.length;
    if (textLength <= 20) return maxFontSize;
    if (textLength <= 30) return maxFontSize - 4;
    if (textLength <= 40) return maxFontSize - 8;
    if (textLength <= 50) return maxFontSize - 12;
    return Math.max(maxFontSize - 16, 12);
  }

  /**
   * Apply text styling based on configuration
   */
  private applyTextStyle(config: TextLayoutConfig, fontSize?: number): void {
    this.doc.setFont(config.font, config.style);
    this.doc.setTextColor(config.color);
    this.doc.setFontSize(fontSize || config.maxFontSize);
  }

  /**
   * Render centered text with automatic line wrapping
   */
  renderCenteredText(
    text: string,
    x: number,
    y: number,
    config: TextLayoutConfig,
    transformToUpperCase: boolean = true
  ): number {
    this.applyTextStyle(config);
    
    const processedText = transformToUpperCase ? text.toUpperCase() : text;
    const lines = this.doc.splitTextToSize(processedText, config.maxWidth);
    
    lines.forEach((line: string, index: number) => {
      const lineY = y + (index * config.lineHeight) + config.lineHeight;
      this.doc.text(line, x, lineY, { align: "center" });
    });
    
    return lines.length * config.lineHeight;
  }

  /**
   * Render text with dynamic font sizing
   */
  renderDynamicText(
    text: string,
    x: number,
    y: number,
    config: TextLayoutConfig,
    transformToUpperCase: boolean = true
  ): number {
    const fontSize = this.calculateFontSize(text, config.maxFontSize);
    this.applyTextStyle(config, fontSize);
    
    return this.renderCenteredText(text, x, y, config, transformToUpperCase);
  }

  /**
   * Render conditional text (approval/attendance message)
   */
  renderConditionalText(
    score: number | undefined,
    passingGrade: number,
    x: number,
    y: number,
    config: TextLayoutConfig
  ): number {
    if (score === undefined || score === null) {
      return 0;
    }

    const conditionalText = score >= passingGrade
      ? "Por haber aprobado el curso:"
      : "Por haber asistido al curso:";

    return this.renderCenteredText(conditionalText, x, y, config, false);
  }

  /**
   * Render ID text with nationality-based conditional logic
   */
  renderIDText(
    participant: { nacionalidad?: 'venezolano' | 'extranjero'; id_number: string },
    x: number,
    y: number
  ): void {
    // Debug logging to see what we're receiving
    console.log('renderIDText received participant:', JSON.stringify(participant, null, 2));
    
    // Use nacionalidad field to determine prefix and label
    const isVenezolano = participant.nacionalidad === 'venezolano';
    const idLabel = isVenezolano ? "CI:" : "Pasaporte:";
    const idPrefix = isVenezolano ? "V-" : "E-";
    
    console.log('ID rendering logic:', {
      nacionalidad: participant.nacionalidad,
      isVenezolano,
      idLabel,
      idPrefix,
      finalText: `${idLabel} ${idPrefix}${participant.id_number}`
    });
    
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    this.doc.text(
      `${idLabel} ${idPrefix}${participant.id_number}`,
      x,
      y,
      { align: "center" }
    );
  }

  /**
   * Render date text in Spanish format
   */
  renderDateText(date: string, x: number, y: number): void {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9);
    this.doc.setTextColor(0, 0, 0);

    const localDate = new Date(date + "T12:00:00");
    const formattedDate = localDate.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    this.doc.text(
      `Puerto la Cruz, ${formattedDate}`,
      x,
      105,
      { align: "center" }
    );
  }

  /**
   * Render duration text
   */
  renderDurationText(hours: number, x: number, y: number): void {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9);
    this.doc.text(`${hours} horas`, 114, 96.15, { align: "center" });
  }
}
