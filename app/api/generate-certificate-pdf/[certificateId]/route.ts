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
        nationality: (snapshotData.participante?.nacionalidad || 'venezolano') as 'venezolano' | 'extranjero',
        score: snapshotData.participante?.score
      }],
      facilitator_id: snapshotData.firmas?.facilitator_id?.toString(),
      facilitator_data: snapshotData.firmas?.facilitator_data || null,
      sha_signature_id: snapshotData.firmas?.sha_signature_id?.toString() || null,
      sha_signature_data: snapshotData.firmas?.sha_signature_data || undefined,
      fecha_vencimiento: snapshotData.certificado?.fecha_vencimiento,
      id_estado: snapshotData.certificado?.id_estado,
      id_plantilla_certificado: snapshotData.plantilla?.id_plantilla_certificado || null
    };

    // Fetch sha signature, facilitator and template in parallel — they are independent
    const [shaSignatureData, facilitatorRaw, templateData] = await Promise.all([
      (certificateData.sha_signature_id && !(certificateData as any).sha_signature_data)
        ? getSignatureDataServer(certificateData.sha_signature_id).catch(e => { console.warn('Failed to fetch SHA signature data for PDF generation:', e); return null; })
        : Promise.resolve(null),
      (certificateData.facilitator_id && !certificateData.facilitator_data)
        ? getFacilitatorDataServer(certificateData.facilitator_id).catch(e => { console.warn('Failed to fetch facilitator data for PDF generation:', e); return null; })
        : Promise.resolve(null),
      certificateData.id_plantilla_certificado
        ? getCertificateTemplateServer(certificateData.id_plantilla_certificado).catch(e => { console.warn('Failed to fetch certificate template, using default:', e); return null; })
        : Promise.resolve(null),
    ]);

    if (shaSignatureData) {
      (certificateData as any).sha_signature_data = shaSignatureData;
    }

    if (facilitatorRaw) {
      (certificateData as any).facilitator_data = {
        id: facilitatorRaw.id,
        name: facilitatorRaw.nombre_apellido,
        nombre_apellido: facilitatorRaw.nombre_apellido,
        facilitator: facilitatorRaw.nombre_apellido,
        cargo: 'Facilitador',
        firma: facilitatorRaw.firmas?.url_imagen,
        firma_id: facilitatorRaw.firma_id,
        sha_signature_id: facilitatorRaw.firma_id?.toString(),
        signature_data: facilitatorRaw.firmas ? {
          id: facilitatorRaw.firmas.id,
          representante_sha: facilitatorRaw.firmas.nombre,
          firma: facilitatorRaw.firmas.url_imagen,
          url_imagen: facilitatorRaw.firmas.url_imagen,
        } : undefined,
      };
    }

    // Validate reconstructed data
    if (!certificateData.certificate_title || !certificateData.participants[0].name) {
      return NextResponse.json(
        { error: 'Invalid certificate data structure' },
        { status: 500 }
      );
    }

    const participant = certificateData.participants[0];

    // Resolve template path from parallel fetch result
    let templateImage = '/templates/certificado.png';
    if (templateData?.archivo) {
      templateImage = templateData.archivo.startsWith('/') ? templateData.archivo : `/templates/${templateData.archivo}`;
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
