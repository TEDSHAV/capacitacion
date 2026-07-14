import QRCode from 'qrcode';
import { QRCodeData, QRCodeProps, QRCodeVerificationData, ControlNumbers } from '@/types/qr-code';

export class QRService {
  private static readonly baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SHELL_URL || 'http://localhost:3000';

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
      // Extract data from parsed snapshot if available, otherwise use direct fields
      const snapshot = certificate.parsed_snapshot;
      const participantName = snapshot?.participante?.name || 
                             certificate.participantes_certificados?.[0]?.nombre || 
                             'Unknown Participant';
      
      const courseName = snapshot?.curso?.name || 
                        snapshot?.certificado_detalles?.course_content ||
                        certificate.cursos?.nombre || 
                        'Unknown Course';
      
      const issueDate = snapshot?.certificado?.fecha_emision || 
                       certificate.fecha_emision || 
                       'Unknown';
      
      const expirationDate = snapshot?.certificado?.fecha_vencimiento || 
                            certificate.fecha_vencimiento;

      // Get control numbers from certificate record or snapshot
      const controlNumbers = {
        nro_libro: certificate.nro_libro || 
                  snapshot?.certificado?.nro_libro || 
                  snapshot?.certificado_detalles?.nro_libro || 
                  0,
        nro_hoja: certificate.nro_hoja || 
                 snapshot?.certificado?.nro_hoja || 
                 snapshot?.certificado_detalles?.nro_hoja || 
                 0,
        nro_linea: certificate.nro_linea || 
                  snapshot?.certificado?.nro_linea || 
                  snapshot?.certificado_detalles?.nro_linea || 
                  0,
        nro_control: certificate.nro_control || 
                    snapshot?.certificado?.nro_control || 
                    snapshot?.certificado_detalles?.nro_control || 
                    0
      };

      return {
        isValid: true,
        certificate: {
          id: certificate.id,
          participantName,
          courseName,
          issueDate,
          expirationDate,
          controlNumbers
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
