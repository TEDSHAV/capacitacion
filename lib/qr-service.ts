import QRCode from 'qrcode';
import { QRCodeData, QRCodeProps, QRCodeVerificationData, ControlNumbers } from '@/types/qr-code';

export class QRService {
  private static baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  /**
   * Generate QR code data for a certificate
   */
  static generateQRData(certificateId: number, controlNumbers?: ControlNumbers): QRCodeData {
    const verificationUrl = `${this.baseUrl}/verify-certificate/${certificateId}`;
    
    return {
      certificateId,
      verificationUrl,
      controlNumbers,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate QR code as data URL for display in UI
   */
  static async generateQRDataURL(props: QRCodeProps): Promise<string> {
    const { data, size = 150, level = 'M', includeMargin = true } = props;
    
    // Use the verification URL directly instead of JSON
    const qrData = data.verificationUrl;

    const options = {
      width: size,
      margin: includeMargin ? 1 : 0,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: level as any
    };

    try {
      return await QRCode.toDataURL(qrData, options);
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code as buffer for database storage
   */
  static async generateQRBuffer(props: QRCodeProps): Promise<Buffer> {
    const { data, size = 150, level = 'M', includeMargin = true } = props;
    
    // Use the verification URL directly instead of JSON
    const qrData = data.verificationUrl;

    const options = {
      width: size,
      margin: includeMargin ? 1 : 0,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: level as any
    };

    try {
      return await QRCode.toBuffer(qrData, options);
    } catch (error) {
      console.error('Error generating QR code buffer:', error);
      throw new Error('Failed to generate QR code buffer');
    }
  }

  /**
   * Parse QR code data from scanned QR code
   */
  static parseQRData(qrDataString: string): QRCodeData | null {
    try {
      // Check if it's a valid verification URL
      if (!this.isValidCertificateUrl(qrDataString)) {
        return null;
      }

      // Extract certificate ID from URL
      const certificateId = this.extractCertificateId(qrDataString);
      if (!certificateId) {
        return null;
      }

      return {
        certificateId,
        verificationUrl: qrDataString,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error parsing QR data:', error);
      return null;
    }
  }

  /**
   * Create verification data response
   */
  static createVerificationData(
    isValid: boolean, 
    certificate?: any,
    error?: string
  ): QRCodeVerificationData {
    if (isValid && certificate) {
      return {
        isValid: true,
        certificate: {
          id: certificate.id,
          participantName: certificate.participante?.name || 'Unknown',
          courseName: certificate.curso?.name || 'Unknown Course',
          issueDate: certificate.certificado?.fecha_emision || 'Unknown',
          expirationDate: certificate.certificado?.fecha_vencimiento,
          controlNumbers: {
            nro_libro: certificate.certificado?.nro_libro || 0,
            nro_hoja: certificate.certificado?.nro_hoja || 0,
            nro_linea: certificate.certificado?.nro_linea || 0,
            nro_control: certificate.certificado?.nro_control || 0
          }
        }
      };
    }

    return {
      isValid: false,
      error: error || 'Certificate not found or invalid'
    };
  }

  /**
   * Generate complete QR code for certificate with control numbers
   */
  static async generateCertificateQR(
    certificateId: number,
    controlNumbers?: ControlNumbers,
    options?: Partial<QRCodeProps>
  ): Promise<{ dataUrl: string; buffer: Buffer; data: QRCodeData }> {
    const qrData = this.generateQRData(certificateId, controlNumbers);
    const props: QRCodeProps = {
      data: qrData,
      size: 150,
      level: 'M',
      includeMargin: true,
      ...options
    };

    const [dataUrl, buffer] = await Promise.all([
      this.generateQRDataURL(props),
      this.generateQRBuffer(props)
    ]);

    return {
      dataUrl,
      buffer,
      data: qrData
    };
  }

  /**
   * Validate QR code URL format
   */
  static isValidCertificateUrl(url: string): boolean {
    const pattern = /^https?:\/\/.+\/verify-certificate\/\d+$/;
    return pattern.test(url);
  }

  /**
   * Extract certificate ID from verification URL
   */
  static extractCertificateId(url: string): number | null {
    const match = url.match(/\/verify-certificate\/(\d+)$/);
    return match ? parseInt(match[1]) : null;
  }
}
