// PDF Layout Configuration for Certificate Generation

export interface PDFOptions {
  orientation: "portrait" | "landscape";
  unit: "mm" | "pt" | "in" | "px";
  format: "a3" | "a4" | "a5" | "letter" | "legal";
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
}

export const CERTIFICATE_CONFIG: CertificateLayoutConfig = {
  page: {
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  },
  
  name: {
    maxWidth: 180,
    maxFontSize: 24,
    lineHeight: 8,
    color: "rgb(12, 63, 105)",
    font: "helvetica",
    style: "bold",
  },
  
  conditionalText: {
    maxWidth: 80,
    maxFontSize: 3,
    lineHeight: 8,
    color: "black",
    font: "helvetica",
    style: "bold",
  },
  
  title: {
    maxWidth: 120,
    maxFontSize: 24,
    lineHeight: 8,
    color: "rgb(12, 63, 120)",
    font: "helvetica",
    style: "bold",
  },
  
  subtitle: {
    maxWidth: 120,
    maxFontSize: 16,
    lineHeight: 8,
    color: "rgb(12, 63, 105)",
    font: "helvetica",
    style: "normal",
  },
  
  centerPoint: 70,
  uniformGap: 3,
  
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
};

// Helper function to get dynamic values
export const getDynamicConfig = (pageWidth: number, pageHeight: number) => ({
  ...CERTIFICATE_CONFIG,
  signature: {
    ...CERTIFICATE_CONFIG.signature,
    rightX: pageWidth - 90,
  },
  contentPage: {
    ...CERTIFICATE_CONFIG.contentPage,
    upperHalfHeight: pageHeight / 2,
  },
});
