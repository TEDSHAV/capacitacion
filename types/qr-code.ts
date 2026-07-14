// QR Code related interfaces
import type { ControlNumbers } from './index';

export type { ControlNumbers };

export interface QRCodeData {
  certificateId: number;
  verificationUrl: string;
  controlNumbers?: ControlNumbers;
  generatedAt: string;
}

export interface QRCodeProps {
  data: QRCodeData;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  image?: string; // Optional logo to embed in center
}

export interface CertificateQRCodeProps extends QRCodeProps {
  showLabel?: boolean;
  label?: string;
}

export interface QRCodeVerificationData {
  isValid: boolean;
  certificate?: {
    id: number;
    participantName: string;
    courseName: string;
    issueDate: string;
    expirationDate?: string;
    controlNumbers: ControlNumbers;
  };
  error?: string;
}
