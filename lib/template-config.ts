import { CertificateLayoutConfig } from "./certificate-config";

/**
 * Individual text element configuration for a template
 */
export interface TextElementConfig {
  x?: number;
  y?: number;
  fontSize?: number;
  fontFamily?: "helvetica" | "times" | "courier" | "Style Script" | "Caprasimo";
  fontStyle?: "normal" | "bold" | "italic" | "bolditalic";
  color?: string;
  prefix?: string;
  transformToUpperCase?: boolean;
}

/**
 * Template-specific text rendering settings
 */
export interface TemplateTextSettings {
  awardPrefix?: TextElementConfig;
  participantName?: TextElementConfig;
  conditionalText?: TextElementConfig;
  courseTitle?: TextElementConfig;
  courseSubtitle?: TextElementConfig;
  date?: TextElementConfig;
  duration?: TextElementConfig;
  facilitatorLabel?: TextElementConfig;
  facilitatorName?: TextElementConfig;
  shaLabel?: TextElementConfig;
  shaName?: TextElementConfig;
  textColor?: string; // Global override
}

/**
 * Template-specific settings for certificate generation
 * Manages QR code visibility, coordinate overrides, and text settings per template
 */
export interface TemplateSettings {
  hideQRCode: boolean;
  coordinates: Partial<CertificateLayoutConfig>;
  textSettings?: TemplateTextSettings;
}

/**
 * Map of template-specific settings
 * Key: template name (e.g., "certificado", "certificado_old")
 */
export const TEMPLATE_SETTINGS: Record<string, TemplateSettings> = {
  certificado: {
    hideQRCode: false,
    coordinates: {},
    textSettings: {
      textColor: "rgb(12, 63, 105)",
      participantName: {
        x: 107.95,
        y: 49,
        fontSize: 18,
        fontFamily: "helvetica",
        fontStyle: "bold",
        color: "rgb(12, 63, 105)",
      },
      conditionalText: {
        x: 107.95,
        y: 55,
        fontSize: 11,
        fontFamily: "helvetica",
        fontStyle: "bold",
        color: "black",
      },
      courseTitle: {
        x: 107.95,
        y: 63,
        fontSize: 18,
        fontFamily: "helvetica",
        fontStyle: "bold",
        color: "rgb(12, 63, 120)",
      },
      courseSubtitle: {
        x: 107.95,
        y: 69,
        fontSize: 10,
        fontFamily: "helvetica",
        fontStyle: "normal",
        color: "rgb(12, 63, 105)",
      },
      duration: {
        prefix: "",
        x: 107.95,
        y: 96.5,
        fontSize: 9,
        fontFamily: "helvetica",
        fontStyle: "normal",
        color: "black",
      },
      date: {
        x: 107.95,
        y: 105,
        fontSize: 9,
        fontFamily: "helvetica",
        fontStyle: "normal",
        color: "black",
      },
      facilitatorName: {
        x: 60,
        y: 98,
        fontSize: 8,
        fontFamily: "helvetica",
        fontStyle: "normal",
        color: "black",
        transformToUpperCase: true,
      },

      shaName: {
        x: 160,
        y: 98,
        fontSize: 8,
        fontFamily: "helvetica",
        fontStyle: "normal",
        color: "black",
        transformToUpperCase: true,
      },
    },
  },
  certificado_old: {
    hideQRCode: true,
    coordinates: {
      centerPoint: 60,
      uniformGap: 5,
      facilitatorName: { x: 50, y: 100 },
      facilitatorSignature: { x: 28, y: 79 },
      shaSignatureOffset: { x: 140, y: -40 },
      dateY: 105,
      durationY: 96.5,
      durationOffsetX: 10,
      qrY: 22.5,
      seal: { x: 160, y: 95, size: 30 },
      signature: {
        y: 118,
        width: 40,
        height: 20,
        leftX: 58,
        rightX: 0,
        textFontSize: 10,
      },
      contentPage: {
        upperHalfHeight: 0,
        margin: 10,
        tableCellHeight: 8,
        sealSize: 30,
        sealX: 160,
      },
    },
    textSettings: {
      textColor: "black",
      awardPrefix: {
        prefix: "Se otorga el presente certificado a:",
        x: 107.95, // Center of Letter size (215.9mm / 2)
        y: 40, // Absolute Y position
        fontSize: 14,
        fontFamily: "Style Script",
        fontStyle: "italic",
        color: "black",
      },
      participantName: {
        x: 107.95,
        y: 48,
        fontSize: 18,
        fontFamily: "Caprasimo",
        fontStyle: "bold",
        color: "black",
      },
      conditionalText: {
        x: 107.95,
        y: 55,
        fontSize: 12,
        fontFamily: "Style Script",
        fontStyle: "italic",
        color: "black",
      },
      courseTitle: {
        x: 107.95,
        y: 63,
        fontSize: 18,
        fontFamily: "Caprasimo",
        fontStyle: "bold",
        color: "black",
      },
      courseSubtitle: {
        x: 107.95,
        y: 70,
        fontSize: 12,
        fontFamily: "Caprasimo",
        fontStyle: "normal",
        color: "black",
      },
      duration: {
        prefix: "Duración: ",
        x: 107.95,
        y: 100,
        fontSize: 9,
        fontFamily: "helvetica",
        fontStyle: "normal",
        color: "black",
      },
      date: {
        x: 107.95,
        y: 105,
        fontSize: 9,
        fontFamily: "helvetica",
        fontStyle: "normal",
        color: "black",
      },
      facilitatorLabel: {
        prefix: "Facilitador",
        x: 50,
        y: 98,
        fontSize: 8,
        fontFamily: "helvetica",
        fontStyle: "bold",
        color: "black",
      },
      facilitatorName: {
        x: 50,
        y: 103,
        fontSize: 8,
        fontFamily: "helvetica",
        fontStyle: "normal",
        color: "black",
        transformToUpperCase: true,
      },
      shaLabel: {
        prefix: "Representante SHA",
        x: 160,
        y: 98,
        fontSize: 8,
        fontFamily: "helvetica",
        fontStyle: "bold",
        color: "black",
      },
      shaName: {
        x: 160,
        y: 103,
        fontSize: 8,
        fontFamily: "helvetica",
        fontStyle: "normal",
        color: "black",
        transformToUpperCase: true,
      },
    },
  },
};

/**
 * Get template settings by template key
 * Returns default settings if template not found
 */
export function getTemplateSettings(templateKey?: string): TemplateSettings {
  if (!templateKey) {
    return TEMPLATE_SETTINGS.certificado;
  }

  // Exact match
  if (TEMPLATE_SETTINGS[templateKey]) {
    return TEMPLATE_SETTINGS[templateKey];
  }

  // Robust matching: if filename contains "old", use "certificado_old"
  if (templateKey.toLowerCase().includes("old")) {
    return TEMPLATE_SETTINGS.certificado_old;
  }

  // Default to standard "certificado" if no other matches found
  return TEMPLATE_SETTINGS.certificado;
}
