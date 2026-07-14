import { NextRequest, NextResponse } from 'next/server';
import { verifyCertificate, getCertificateById } from '@/app/actions/certificados';
import { QRService } from '@/lib/qr-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  try {
    const resolvedParams = await params;
    const certificateId = parseInt(resolvedParams.certificateId);

    if (isNaN(certificateId)) {
      return NextResponse.json(
        { error: 'Invalid certificate ID' },
        { status: 400 }
      );
    }

    const verification = await verifyCertificate(certificateId);

    if (!verification.isValid) {
      return NextResponse.json(
        { 
          isValid: false,
          error: verification.error || 'Certificate not found or invalid'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      isValid: true,
      certificate: verification.certificate,
      verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-certificate/${certificateId}`
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
    const certificateId = parseInt(resolvedParams.certificateId);

    if (isNaN(certificateId)) {
      return NextResponse.json(
        { error: 'Invalid certificate ID' },
        { status: 400 }
      );
    }

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

      // Verify QR data matches the certificate ID
      if (parsedQrData.certificateId !== certificateId) {
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
    const verification = await verifyCertificate(certificateId);

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
    const certificateDetails = await getCertificateById(certificateId);

    return NextResponse.json({
      isValid: true,
      certificate: verification.certificate,
      details: certificateDetails,
      verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-certificate/${certificateId}`,
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
