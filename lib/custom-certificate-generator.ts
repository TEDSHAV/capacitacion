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
    },
    title: {
      ...CERTIFICATE_CONFIG.title,
      maxWidth: coords.title.maxWidth,
      maxFontSize: coords.title.maxFontSize,
      lineHeight: coords.title.lineHeight,
      color: coords.title.color,
    },
    subtitle: {
      ...CERTIFICATE_CONFIG.subtitle,
      maxWidth: coords.subtitle.maxWidth,
      maxFontSize: coords.subtitle.maxFontSize,
      lineHeight: coords.subtitle.lineHeight,
      color: coords.subtitle.color,
    },
    centerPoint: coords.centerPoint,
    uniformGap: coords.uniformGap,
    facilitatorName: coords.facilitatorName,
    facilitatorSignature: coords.facilitatorSignature,
    shaSignatureOffset: coords.shaSignatureOffset,
    dateY: coords.dateY,
    durationY: coords.durationY,
    durationOffsetX: coords.durationOffsetX,
    seal: coords.seal,
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
