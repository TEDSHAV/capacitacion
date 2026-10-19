import { NextRequest, NextResponse } from 'next/server';
import { verifyCertificate, getCertificateById } from '@/app/actions/certificados';
import { QRService } from '@/lib/qr-service';

// Public base URL of this capacitacion module, used to build verification URLs
// embedded in QR codes. Prefer NEXT_PUBLIC_APP_URL (this app's own domain);
// fall back to NEXT_PUBLIC_SHELL_URL for backward compatibility.
const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SHELL_URL ||
  'http://localhost:3000';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  try {
    const resolvedParams = await params;
    const rawId = resolvedParams.certificateId;
    const isUuid = UUID_REGEX.test(rawId);
    const isNumeric = /^\d+$/.test(rawId);

    if (!isUuid && !isNumeric) {
      return NextResponse.json(
        { error: 'Invalid certificate ID' },
        { status: 400 }
      );
    }

    const certificateIdentifier = isNumeric ? parseInt(rawId, 10) : rawId;
    const verification = await verifyCertificate(certificateIdentifier);

    if (!verification.isValid) {
      return NextResponse.json(
        { 
          isValid: false,
          error: verification.error || 'Certificate not found or invalid'
        },
        { status: 404 }
      );
    }

    const publicId = verification.certificate?.uuid || certificateIdentifier;

    return NextResponse.json({
      isValid: true,
      certificate: verification.certificate,
      verificationUrl: `${APP_BASE_URL}/verify-certificate/${publicId}`
    });

  } catch (error) {
    console.error('Certificate verification API error:', error);
    return NextResponse.json(
      { 
        isValid: false,
        error: 'Internal server error during verification'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  try {
    const resolvedParams = await params;
    const rawId = resolvedParams.certificateId;
    const isUuid = UUID_REGEX.test(rawId);
    const isNumeric = /^\d+$/.test(rawId);

    if (!isUuid && !isNumeric) {
      return NextResponse.json(
        { error: 'Invalid certificate ID' },
        { status: 400 }
      );
    }

    const certificateIdentifier = isNumeric ? parseInt(rawId, 10) : rawId;
    const body = await request.json();
    const { qrData } = body;

    // If QR data is provided, validate it matches the certificate
    if (qrData) {
      const parsedQrData = QRService.parseQRData(qrData);
      
      if (!parsedQrData) {
        return NextResponse.json(
          { error: 'Invalid QR code data' },
          { status: 400 }
        );
      }

      // Verify QR data matches the certificate ID or UUID
      const qrIdStr = String(parsedQrData.certificateId).toLowerCase();
      const currentIdStr = String(certificateIdentifier).toLowerCase();
      let matches = qrIdStr === currentIdStr;

      if (!matches) {
        const cert = await getCertificateById(certificateIdentifier);
        matches = !!cert && (
          String(cert.id) === qrIdStr ||
          String(cert.uuid || '').toLowerCase() === qrIdStr
        );
      }

      if (!matches) {
        return NextResponse.json(
          { error: 'QR code does not match this certificate' },
          { status: 400 }
        );
      }

      // Verify the URL is valid
      if (!QRService.isValidCertificateUrl(parsedQrData.verificationUrl)) {
        return NextResponse.json(
          { error: 'Invalid verification URL in QR code' },
          { status: 400 }
        );
      }
    }

    // Perform standard verification
    const verification = await verifyCertificate(certificateIdentifier);

    if (!verification.isValid) {
      return NextResponse.json(
        { 
          isValid: false,
          error: verification.error || 'Certificate not found or invalid'
        },
        { status: 404 }
      );
    }

    // Get full certificate details
    const certificateDetails = await getCertificateById(certificateIdentifier);
    const publicId = verification.certificate?.uuid || certificateIdentifier;

    return NextResponse.json({
      isValid: true,
      certificate: verification.certificate,
      details: certificateDetails,
      verificationUrl: `${APP_BASE_URL}/verify-certificate/${publicId}`,
      verifiedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Certificate verification API error:', error);
    return NextResponse.json(
      { 
        isValid: false,
        error: 'Internal server error during verification'
      },
      { status: 500 }
    );
  }
}
