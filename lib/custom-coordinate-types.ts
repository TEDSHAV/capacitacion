export interface CertCoordinateConfig {
  name: { maxWidth: number; maxFontSize: number; lineHeight: number; color: string };
  title: { maxWidth: number; maxFontSize: number; lineHeight: number; color: string };
  subtitle: { maxWidth: number; maxFontSize: number; lineHeight: number; color: string };
  centerPoint: number;
  uniformGap: number;
  facilitatorName: { x: number; y: number };
  facilitatorSignature: { x: number; y: number };
  shaSignatureOffset: { x: number; y: number };
  dateY: number;
  durationY: number;
  durationOffsetX: number;
  seal: { x: number; y: number; size: number };
}

export interface CarnetCoordinateConfig {
  participantName: { x: number; y: number; fontSize: number };
  participantId: { x: number; y: number; fontSize: number };
  courseTitle: { x: number; y: number; maxWidth: number; fontSize: number };
  subtitle: { x: number; y: number; maxWidth: number; fontSize: number };
  emissionDate: { x: number; y: number; fontSize?: number };
  expirationDate: { x: number; y: number; fontSize?: number };
  controlNumber: { x: number; y: number; fontSize?: number };
}

export const DEFAULT_CERT_COORDINATES: CertCoordinateConfig = {
  name: { maxWidth: 180, maxFontSize: 18, lineHeight: 10, color: "rgb(12, 63, 105)" },
  title: { maxWidth: 160, maxFontSize: 18, lineHeight: 7, color: "rgb(12, 63, 120)" },
  subtitle: { maxWidth: 140, maxFontSize: 14, lineHeight: 4, color: "rgb(12, 63, 105)" },
  centerPoint: 60,
  uniformGap: 5,
  facilitatorName: { x: 56, y: 100 },
  facilitatorSignature: { x: 38, y: 72 },
  shaSignatureOffset: { x: 10, y: -45 },
  dateY: 105,
  durationY: 98.5,
  durationOffsetX: 8,
  seal: { x: 160, y: 45, size: 25 },
};

export const DEFAULT_CARNET_COORDINATES: CarnetCoordinateConfig = {
  participantName: { x: 3, y: 32, fontSize: 8 },
  participantId: { x: 3, y: 37, fontSize: 8 },
  courseTitle: { x: 33, y: 21, maxWidth: 60, fontSize: 8 },
  subtitle: { x: 33, y: 25, maxWidth: 50, fontSize: 6 },
  emissionDate: { x: 3, y: 42, fontSize: 8 },
  expirationDate: { x: 50, y: 42, fontSize: 8 },
  controlNumber: { x: 64.5, y: 14, fontSize: 6 },
};
