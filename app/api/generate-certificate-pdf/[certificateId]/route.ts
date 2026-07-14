import { NextRequest, NextResponse } from 'next/server';
import { getCertificateById } from '@/app/actions/certificados';
import { CertificateGenerator } from '@/lib/certificate-generator';
import { getSignatureDataServer, getFacilitatorDataServer, getCertificateTemplateServer } from '@/app/actions/certificate-data';
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
        { error: 'Certificate not found or inactive' },
        { status: 404 }
      );
    }

    // Parse snapshot to reconstruct certificate data
    let snapshotData = null;
    if (certificate.snapshot_contenido) {
      try {
        snapshotData = JSON.parse(certificate.snapshot_contenido);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid certificate data format' },
          { status: 500 }
        );
      }
    }

    if (!snapshotData) {
      return NextResponse.json(
        { error: 'Certificate snapshot not found' },
        { status: 404 }
      );
    }

    // Validate required snapshot fields
    if (!snapshotData.certificado_detalles || !snapshotData.participante) {
      return NextResponse.json(
        { error: 'Incomplete certificate data' },
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
        nacionalidad: snapshotData.participante?.nacionalidad || 'venezolano',
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
        const shaSignatureData = await getSignatureDataServer(certificateData.sha_signature_id);
        if (shaSignatureData) {
          (certificateData as any).sha_signature_data = shaSignatureData;
        }
      } catch (error) {
        console.warn('Failed to fetch SHA signature data for PDF generation:', error);
      }
    }

    // Fetch facilitator data if ID is available and not already in data
    if (certificateData.facilitator_id && !certificateData.facilitator_data) {
      try {
        const facilitatorData = await getFacilitatorDataServer(certificateData.facilitator_id);
        if (facilitatorData) {
          // Transform to match expected CertificateFacilitator interface
          (certificateData as any).facilitator_data = {
            id: facilitatorData.id,
            name: facilitatorData.nombre_apellido, // Map nombre_apellido to name
            nombre_apellido: facilitatorData.nombre_apellido,
            facilitator: facilitatorData.nombre_apellido,
            cargo: 'Facilitador',
            firma: facilitatorData.firmas?.url_imagen,
            firma_id: facilitatorData.firma_id,
            sha_signature_id: facilitatorData.firma_id?.toString(),
            signature_data: facilitatorData.firmas ? {
              id: facilitatorData.firmas.id,
              representante_sha: facilitatorData.firmas.nombre,
              firma: facilitatorData.firmas.url_imagen,
              url_imagen: facilitatorData.firmas.url_imagen,
            } : undefined,
          };
        }
      } catch (error) {
        console.warn('Failed to fetch facilitator data for PDF generation:', error);
      }
    }

    // Validate reconstructed data
    if (!certificateData.certificate_title || !certificateData.participants[0].name) {
      return NextResponse.json(
        { error: 'Invalid certificate data structure' },
        { status: 500 }
      );
    }

    const participant = certificateData.participants[0];

    // Get template image
    let templateImage = '';
    
    if (certificateData.id_plantilla_certificado) {
      try {
        const template = await getCertificateTemplateServer(certificateData.id_plantilla_certificado);
        
        if (template?.archivo) {
          templateImage = template.archivo.startsWith('/') ? template.archivo : `/templates/${template.archivo}`;
        } else {
          templateImage = '/templates/certificado.png';
        }
      } catch (error) {
        console.warn('Failed to fetch certificate template, using default:', error);
        templateImage = '/templates/certificado.png';
      }
    } else {
      templateImage = '/templates/certificado.png';
    }

    // Get seal image
    let sealImage = '';
    // You can add seal image logic here if needed

    // Debug logging for control numbers
    const controlNumbersForGenerator = {
      nro_libro: certificate.nro_libro || 0,
      nro_hoja: certificate.nro_hoja || 0,
      nro_linea: certificate.nro_linea || 0,
      nro_control: certificate.nro_control || 0
    };

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
        certificateId: certificateId, // Pass actual certificate ID for QR code
        singlePage: true // Use single-page mode for verification certificates
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
      return NextResponse.json(
        { error: 'Failed to generate certificate PDF' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error generating certificate PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error while generating certificate' },
      { status: 500 }
    );
  }
}
