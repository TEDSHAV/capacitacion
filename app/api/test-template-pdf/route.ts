import { NextRequest, NextResponse } from 'next/server';
import { CertificateGenerator } from '@/lib/certificate-generator';

export async function GET() {
  try {
    // Test template loading
    const generator = new CertificateGenerator();
    
    const testCertificateData = {
      id: 'test',
      certificate_title: 'Test Certificate',
      date: '2026-03-23',
      location: 'Test Location',
      participants: [{
        id: '1',
        name: 'Test Participant',
        id_number: '12345678',
        nacionalidad: 'V' as const
      }]
    };

    const testParticipant = testCertificateData.participants[0];

    const pdfBlob = await generator.generateCertificate({
      participant: testParticipant,
      certificateData: testCertificateData,
      templateImage: '/templates/certificado.png', // Use actual template
      sealImage: '',
      isPreview: false
    });

    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="test-certificate-with-template.pdf"',
      },
    });

  } catch (error) {
    console.error('Error in test PDF generation with template:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate test PDF with template', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
