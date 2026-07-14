// PDF Layout Configuration for Certificate Generation

export interface PDFOptions {
  orientation: "portrait" | "landscape";
  unit: "mm" | "pt" | "in" | "px";
  format: "a3" | "a4" | "a5" | "letter" | "legal";
  compress?: boolean;
}

export interface TextLayoutConfig {
  maxWidth: number; // in mm
  maxFontSize: number;
  lineHeight: number; // in mm
  color: string;
  font: "helvetica" | "times" | "courier";
  style: "normal" | "bold" | "italic" | "bolditalic";
}

export interface CertificateLayoutConfig {
  // Page configuration
  page: PDFOptions;

  // Text elements configuration
  name: TextLayoutConfig;
  conditionalText: TextLayoutConfig;
  title: TextLayoutConfig;
  subtitle: TextLayoutConfig;

  // Layout positioning
  centerPoint: number; // Y position for main content centering
  uniformGap: number; // Gap between text elements in mm

  // Signature configuration
  signature: {
    y: number;
    width: number;
    height: number;
    leftX: number;
    rightX: number;
    textFontSize: number;
  };

  // Content page configuration
  contentPage: {
    upperHalfHeight: number;
    margin: number;
    tableCellHeight: number;
    sealSize: number;
  };

  // Additional elements positioning
  facilitatorName: { x: number; y: number };
  facilitatorSignature: { x: number; y: number };
  shaSignatureOffset: { x: number; y: number };
  dateY: number;
  durationY: number;
  durationOffsetX: number;
  qrY: number;
}

export const CERTIFICATE_CONFIG: CertificateLayoutConfig = {
  page: {
    orientation: "portrait",
    unit: "mm",
    format: "letter",
    compress: true,
  },

  name: {
    maxWidth: 180,
    maxFontSize: 18,
    lineHeight: 10,
    color: "rgb(12, 63, 105)",
    font: "helvetica",
    style: "bold",
  },

  conditionalText: {
    maxWidth: 80,
    maxFontSize: 11,
    lineHeight: 2,
    color: "black",
    font: "helvetica",
    style: "bold",
  },

  title: {
    maxWidth: 160,
    maxFontSize: 18,
    lineHeight: 7,
    color: "rgb(12, 63, 120)",
    font: "helvetica",
    style: "bold",
  },

  subtitle: {
    maxWidth: 140,
    maxFontSize: 14,
    lineHeight: 4,
    color: "rgb(12, 63, 105)",
    font: "helvetica",
    style: "normal",
  },

  centerPoint: 60,
  uniformGap: 5,

  signature: {
    y: 118,
    width: 40,
    height: 20,
    leftX: 58,
    rightX: 0, // Will be calculated dynamically
    textFontSize: 10,
  },

  contentPage: {
    upperHalfHeight: 0, // Will be calculated dynamically (pageHeight / 2)
    margin: 10,
    tableCellHeight: 8,
    sealSize: 30,
  },

  facilitatorName: { x: 60, y: 100 },
  facilitatorSignature: { x: 38, y: 72 },
  shaSignatureOffset: { x: 10, y: -45 },
  dateY: 105,
  durationY: 96.5,
  durationOffsetX: 10,
  qrY: 22.5,
};

/**
 * Helper to get a stable key from template filename for coordinate overrides
 * e.g. "templates/certificado_old.jpg" -> "certificado_old"
 */
export function getTemplateKey(filename?: string): string {
  if (!filename) return "certificado";
  // Strip path prefix and extension: "certificado_old.jpg" -> "certificado_old"
  return filename.replace(/^.*\//, "").replace(/\.[^.]+$/, "");
}

/**
 * Map of coordinate overrides per template key.
 * Initially, old template uses same values as standard to avoid breaking while testing.
 */
export const TEMPLATE_COORD_MAP: Record<
  string,
  Partial<CertificateLayoutConfig>
> = {
  certificado: {}, // uses all defaults
  certificado_old: {
    centerPoint: 60,
    facilitatorName: { x: 50, y: 100 },
    facilitatorSignature: { x: 28, y: 72 },
    shaSignatureOffset: { x: 150, y: -45 },
    dateY: 105,
    durationY: 96.5,
    durationOffsetX: 10,
    qrY: -22.5,
    signature: {
      ...CERTIFICATE_CONFIG.signature,
      y: 118,
      leftX: 58,
    },
  },
};

// Helper function to get dynamic values
export const getDynamicConfig = (
  pageWidth: number,
  pageHeight: number,
  templateKey?: string,
) => {
  const base = {
    ...CERTIFICATE_CONFIG,
    signature: {
      ...CERTIFICATE_CONFIG.signature,
      rightX: pageWidth - 90,
    },
    contentPage: {
      ...CERTIFICATE_CONFIG.contentPage,
      upperHalfHeight: pageHeight / 2,
    },
  };

  const overrides =
    (templateKey ? TEMPLATE_COORD_MAP[templateKey] : null) ?? {};

  // Deep merge for signature if it exists in overrides
  if (overrides.signature) {
    overrides.signature = {
      ...base.signature,
      ...overrides.signature,
    };
  }

  return { ...base, ...overrides };
};
