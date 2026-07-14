import { NextRequest, NextResponse } from 'next/server';
import { getCertificateById } from '@/app/actions/certificados';

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

    // Get certificate data from database
    const certificate = await getCertificateById(certificateId);
    
    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      );
    }

    // Return raw certificate data for debugging
    return NextResponse.json({
      certificate: certificate,
      snapshot_contenido: certificate.snapshot_contenido,
      parsed_snapshot: certificate.snapshot_contenido ? JSON.parse(certificate.snapshot_contenido) : null
    });

  } catch (error) {
    console.error('Error debugging certificate:', error);
    return NextResponse.json(
      { error: 'Failed to debug certificate', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
