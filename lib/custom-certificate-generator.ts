import { CertificateParticipant, CertificateGeneration, CertificateRequest } from "@/types";
import { CertificateGenerator } from "./certificate-generator";
import { TEMPLATE_COORD_MAP, CERTIFICATE_CONFIG, CertificateLayoutConfig } from "./certificate-config";
import { CertCoordinateConfig } from "./custom-coordinate-types";

let customKeyCounter = 0;

export function registerCustomCoordinates(
  coords: CertCoordinateConfig,
): string {
  customKeyCounter++;
  const key = `custom_${Date.now()}_${customKeyCounter}`;

  const partialConfig: Partial<CertificateLayoutConfig> = {
    name: {
      ...CERTIFICATE_CONFIG.name,
      maxWidth: coords.name.maxWidth,
      maxFontSize: coords.name.maxFontSize,
      lineHeight: coords.name.lineHeight,
      color: coords.name.color,
      font: (coords.name.font as any) || CERTIFICATE_CONFIG.name.font,
      style: (coords.name.style as any) || CERTIFICATE_CONFIG.name.style,
    },
    title: {
      ...CERTIFICATE_CONFIG.title,
      maxWidth: coords.title.maxWidth,
      maxFontSize: coords.title.maxFontSize,
      lineHeight: coords.title.lineHeight,
      color: coords.title.color,
      font: (coords.title.font as any) || CERTIFICATE_CONFIG.title.font,
      style: (coords.title.style as any) || CERTIFICATE_CONFIG.title.style,
    },
    subtitle: {
      ...CERTIFICATE_CONFIG.subtitle,
      maxWidth: coords.subtitle.maxWidth,
      maxFontSize: coords.subtitle.maxFontSize,
      lineHeight: coords.subtitle.lineHeight,
      color: coords.subtitle.color,
      font: (coords.subtitle.font as any) || CERTIFICATE_CONFIG.subtitle.font,
      style: (coords.subtitle.style as any) || CERTIFICATE_CONFIG.subtitle.style,
    },
    centerPoint: coords.centerPoint !== undefined ? coords.centerPoint : CERTIFICATE_CONFIG.centerPoint,
    uniformGap: coords.uniformGap !== undefined ? coords.uniformGap : CERTIFICATE_CONFIG.uniformGap,
    facilitatorName: coords.facilitatorName || CERTIFICATE_CONFIG.facilitatorName,
    facilitatorSignature: coords.facilitatorSignature || CERTIFICATE_CONFIG.facilitatorSignature,
    shaSignatureOffset: coords.shaSignatureOffset || CERTIFICATE_CONFIG.shaSignatureOffset,
    dateY: coords.dateY !== undefined ? coords.dateY : CERTIFICATE_CONFIG.dateY,
    durationY: coords.durationY !== undefined ? coords.durationY : CERTIFICATE_CONFIG.durationY,
    durationOffsetX: coords.durationOffsetX !== undefined ? coords.durationOffsetX : CERTIFICATE_CONFIG.durationOffsetX,
    seal: coords.seal || CERTIFICATE_CONFIG.seal,
    presentationText: coords.presentationText ? {
      text: coords.presentationText.text || "Se otorga el presente certificado a:",
      x: coords.presentationText.x !== undefined ? coords.presentationText.x : 104.95,
      y: coords.presentationText.y !== undefined ? coords.presentationText.y : 40,
      fontSize: coords.presentationText.fontSize !== undefined ? coords.presentationText.fontSize : 11,
      color: coords.presentationText.color || "rgb(12, 63, 105)",
      font: coords.presentationText.font || "helvetica",
      style: coords.presentationText.style || "normal",
    } : {
      text: "Se otorga el presente certificado a:",
      x: 104.95,
      y: 40,
      fontSize: 11,
      color: "rgb(12, 63, 105)",
      font: "helvetica",
      style: "normal"
    }
  };

  TEMPLATE_COORD_MAP[key] = partialConfig;
  return key;
}

export async function generateCustomCertificate(
  participant: CertificateParticipant,
  certificateData: CertificateGeneration,
  templateImage: string,
  coords: CertCoordinateConfig,
  options?: {
    sealImage?: string;
    isPreview?: boolean;
    singlePage?: boolean;
    paperSize?: "letter" | "half-letter-custom";
    preloadedAssets?: CertificateRequest["preloadedAssets"];
  },
): Promise<Blob> {
  const customKey = registerCustomCoordinates(coords);

  const updatedData: CertificateGeneration = {
    ...certificateData,
    plantilla_certificado_archivo: customKey,
  };

  const generator = new CertificateGenerator();
  return await generator.generateCertificate({
    participant,
    certificateData: updatedData,
    templateImage,
    sealImage: options?.sealImage,
    isPreview: options?.isPreview || false,
    certificateId: 0,
    singlePage: options?.singlePage,
    paperSize: options?.paperSize || "half-letter-custom",
    skipQR: true,
    preloadedAssets: options?.preloadedAssets,
  });
}

export async function previewCustomCertificate(
  participant: CertificateParticipant,
  certificateData: CertificateGeneration,
  templateImage: string,
  coords: CertCoordinateConfig,
  options?: {
    sealImage?: string;
    singlePage?: boolean;
    paperSize?: "letter" | "half-letter-custom";
    preloadedAssets?: CertificateRequest["preloadedAssets"];
  },
): Promise<string> {
  const blob = await generateCustomCertificate(
    participant,
    certificateData,
    templateImage,
    coords,
    { ...options, isPreview: true },
  );
  return URL.createObjectURL(blob);
}
