import { NextRequest, NextResponse } from 'next/server';
import { getCertificateById } from '@/app/actions/certificados';
import { CertificateGenerator } from '@/lib/certificate-generator';
import { certificateService } from '@/lib/certificate-service';
import { CertificateGeneration } from '@/types';

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

    // Debug logging for control numbers
    console.log('Certificate object:', JSON.stringify(certificate, null, 2));
    console.log('Control numbers from certificate:', {
      nro_libro: certificate.nro_libro,
      nro_hoja: certificate.nro_hoja,
      nro_linea: certificate.nro_linea,
      nro_control: certificate.nro_control
    });

    // Parse snapshot to reconstruct certificate data
    let snapshotData = null;
    if (certificate.snapshot_contenido) {
      try {
        snapshotData = JSON.parse(certificate.snapshot_contenido);
        console.log('Parsed snapshot data:', JSON.stringify(snapshotData, null, 2));
        
        // Debug logging for control numbers in snapshot
        if (snapshotData.certificado) {
          console.log('Control numbers from snapshot:', {
            nro_libro: snapshotData.certificado.nro_libro,
            nro_hoja: snapshotData.certificado.nro_hoja,
            nro_linea: snapshotData.certificado.nro_linea,
            nro_control: snapshotData.certificado.nro_control
          });
        }
      } catch (error) {
        console.error('Failed to parse snapshot:', error);
        return NextResponse.json(
          { error: 'Invalid certificate data' },
          { status: 500 }
        );
      }
    }

    if (!snapshotData) {
      console.error('No snapshot data found for certificate:', certificateId);
      return NextResponse.json(
        { error: 'Certificate snapshot not found' },
        { status: 404 }
      );
    }

    // Validate required snapshot fields
    if (!snapshotData.certificado_detalles || !snapshotData.participante) {
      console.error('Missing required fields in snapshot:', JSON.stringify(snapshotData, null, 2));
      return NextResponse.json(
        { error: 'Incomplete certificate data in snapshot' },
        { status: 500 }
      );
    }

    // Reconstruct certificate data from snapshot
    const certificateData: CertificateGeneration = {
      id: certificateId.toString(),
      certificate_title: snapshotData.certificado_detalles?.title || 'Certificate',
      certificate_subtitle: snapshotData.certificado_detalles?.subtitle,
      date: snapshotData.certificado_detalles?.date || new Date().toISOString().split('T')[0],
      location: snapshotData.certificado_detalles?.location || 'Unknown',
      horas_estimadas: snapshotData.certificado_detalles?.horas_estimadas,
      passing_grade: snapshotData.certificado_detalles?.passing_grade,
      osi_id: snapshotData.osi?.nro_osi?.toString() || '',
      osi_data: {
        ...snapshotData.osi,
        direccion_ejecucion: (snapshotData.osi as any)?.direccion_ejecucion || snapshotData.osi?.direccion_fiscal || ''
      },
      course_topic_id: snapshotData.curso?.id?.toString() || '',
      course_topic_data: snapshotData.curso,
      course_content: snapshotData.certificado_detalles?.course_content,
      participants: [{
        id: snapshotData.participante?.id?.toString() || '1',
        name: snapshotData.participante?.name || 'Unknown Participant',
        id_number: snapshotData.participante?.cedula || 'Unknown ID',
        nacionalidad: snapshotData.participante?.nacionalidad || 'V',
        score: snapshotData.participante?.score
      }],
      facilitator_id: snapshotData.firmas?.facilitator_id?.toString(),
      facilitator_data: snapshotData.firmas?.facilitator_data || null,
      sha_signature_id: snapshotData.firmas?.sha_signature_id?.toString() || null,
      sha_signature_data: undefined, // Will be populated below
      fecha_vencimiento: snapshotData.certificado?.fecha_vencimiento,
      id_estado: snapshotData.certificado?.id_estado,
      id_plantilla_certificado: snapshotData.plantilla?.id_plantilla_certificado || null
    };

    // Fetch SHA signature data if ID is available
    if (certificateData.sha_signature_id) {
      try {
        const shaSignatureData = await certificateService.getSignatureData(certificateData.sha_signature_id);
        if (shaSignatureData) {
          (certificateData as any).sha_signature_data = shaSignatureData;
          console.log('Fetched SHA signature data for PDF generation:', shaSignatureData);
        }
      } catch (error) {
        console.warn('Failed to fetch SHA signature data for PDF generation:', error);
      }
    }

    // Fetch facilitator data if ID is available and not already in data
    if (certificateData.facilitator_id && !certificateData.facilitator_data) {
      try {
        const facilitatorData = await certificateService.getFacilitatorData(certificateData.facilitator_id);
        if (facilitatorData) {
          (certificateData as any).facilitator_data = facilitatorData;
          console.log('Fetched facilitator data for PDF generation:', facilitatorData);
        }
      } catch (error) {
        console.warn('Failed to fetch facilitator data for PDF generation:', error);
      }
    }

    // Validate reconstructed data
    if (!certificateData.certificate_title || !certificateData.participants[0].name) {
      console.error('Invalid reconstructed certificate data:', JSON.stringify(certificateData, null, 2));
      return NextResponse.json(
        { error: 'Invalid certificate data structure' },
        { status: 500 }
      );
    }

    console.log('Successfully reconstructed certificate data:', JSON.stringify(certificateData, null, 2));

    const participant = certificateData.participants[0];

    // Get template image
    let templateImage = ''; // Start with empty template
    if (certificateData.id_plantilla_certificado) {
      try {
        const template = await certificateService.getCertificateTemplate(certificateData.id_plantilla_certificado);
        if (template?.archivo) {
          templateImage = template.archivo;
          console.log('Using template image:', templateImage);
        } else {
          console.log('Template found but no archivo field, using default');
          templateImage = '/templates/certificado.png';
        }
      } catch (error) {
        console.warn('Failed to fetch certificate template, using default:', error);
        templateImage = '/templates/certificado.png';
      }
    } else {
      console.log('No template specified, using default');
      templateImage = '/templates/certificado.png';
    }

    // Get seal image
    let sealImage = '';
    // You can add seal image logic here if needed

    console.log('Generating PDF with template:', templateImage);
    console.log('Participant data:', JSON.stringify(participant, null, 2));

    // Debug logging for control numbers being passed to generator
    const controlNumbersForGenerator = {
      nro_libro: certificate.nro_libro,
      nro_hoja: certificate.nro_hoja,
      nro_linea: certificate.nro_linea,
      nro_control: certificate.nro_control
    };
    console.log('Control numbers being passed to generator:', controlNumbersForGenerator);

    // Generate certificate PDF
    const generator = new CertificateGenerator();
    
    try {
      const pdfBlob = await generator.generateCertificate({
        participant,
        certificateData,
        templateImage,
        sealImage,
        controlNumbers: controlNumbersForGenerator,
        isPreview: false,
        certificateId: certificateId // Pass actual certificate ID for QR code
      });

      // Return PDF as response
      return new NextResponse(pdfBlob, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="certificate-${certificateId}.pdf"`,
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      });
    } catch (pdfError) {
      console.error('Error in PDF generation:', pdfError);
      console.error('Certificate data:', JSON.stringify(certificateData, null, 2));
      console.error('Template image:', templateImage);
      throw pdfError;
    }

  } catch (error) {
    console.error('Error generating certificate PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate certificate PDF' },
      { status: 500 }
    );
  }
}
