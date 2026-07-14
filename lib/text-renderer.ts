import jsPDF from "jspdf";
import { TextLayoutConfig } from "./certificate-config";
import { TextElementConfig } from "./template-config";

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
    transformToUpperCase: boolean = true,
  ): number {
    this.applyTextStyle(config);

    const processedText = transformToUpperCase ? text.toUpperCase() : text;
    const lines = this.doc.splitTextToSize(processedText, config.maxWidth);

    lines.forEach((line: string, index: number) => {
      const lineY = y + index * config.lineHeight + config.lineHeight;
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
    transformToUpperCase: boolean = true,
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
    config: TextLayoutConfig,
  ): number {
    if (score === undefined || score === null) {
      return 0;
    }

    const conditionalText =
      score >= passingGrade
        ? "Por haber aprobado el curso:"
        : "Por haber asistido al curso:";

    return this.renderCenteredText(conditionalText, x, y, config, false);
  }

  /**
   * Render ID text with nationality-based conditional logic
   */
  renderIDText(
    participant: {
      nationality?: "venezolano" | "extranjero";
      idNumber: string;
    },
    x: number,
    y: number,
  ) {
    const idLabel = "Cédula:";
    const idPrefix = participant.nationality === "extranjero" ? "e-" : "V-";

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    this.doc.text(`${idLabel} ${idPrefix}${participant.idNumber}`, x, y, {
      align: "center",
    });
  }

  /**
   * Render date text in Spanish format
   */
  renderDateText(date: string, x: number, y: number): void {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9);
    this.doc.setTextColor(0, 0, 0);

    const localDate = date.includes("T")
      ? new Date(date)
      : new Date(date + "T12:00:00");
    const formattedDate = localDate.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    this.doc.text(`Puerto la Cruz, ${formattedDate}`, x, y, {
      align: "center",
    });
  }

  /**
   * Render duration text
   */
  renderDurationText(hours: number, x: number, y: number): void {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9);
    this.doc.text(`${hours} horas`, x, y, { align: "center" });
  }

  /**
   * Render a text element based on a template-specific configuration
   */
  renderTextElement(
    text: string,
    defaultX: number,
    defaultY: number,
    config?: TextElementConfig,
    baseConfig?: TextLayoutConfig,
  ): void {
    if (!text) return;

    // Determine final position
    const x = config?.x !== undefined ? config.x : defaultX;
    const y = config?.y !== undefined ? config.y : defaultY;

    // Apply font settings
    const font = config?.fontFamily || baseConfig?.font || "helvetica";
    const style = config?.fontStyle || baseConfig?.style || "normal";
    const color = config?.color || baseConfig?.color || "black";
    const fontSize =
      config?.fontSize ||
      (baseConfig ? this.calculateFontSize(text, baseConfig.maxFontSize) : 9);

    this.doc.setFont(font, style);
    this.doc.setTextColor(color);
    this.doc.setFontSize(fontSize);

    const processedText =
      config?.transformToUpperCase !== false && baseConfig
        ? text.toUpperCase()
        : text;

    this.doc.text(processedText, x, y, { align: "center" });
  }

  /**
   * Render duration text with prefix
   */
  renderDurationTextWithPrefix(
    hours: number,
    x: number,
    y: number,
    config?: TextElementConfig,
  ): void {
    const prefix = config?.prefix || "Duración: ";
    const text = `${prefix}${hours} horas`;
    this.renderTextElement(text, x, y, config);
  }

  /**
   * Render certificate award prefix text
   */
  renderCertificateAwardPrefix(
    x: number,
    y: number,
    config?: TextElementConfig,
  ): void {
    const text = config?.prefix || "Se otorga el presente certificado a: ";
    this.renderTextElement(text, x, y, config);
  }
}
