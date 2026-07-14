import { NextRequest, NextResponse } from 'next/server';
import { TemplateBasedPdfGenerator } from '@/lib/template-based-pdf-generator';
import { DocumentTemplateProcessor } from '@/lib/document-templates';

export async function POST(request: NextRequest) {
  try {
    const { certificates, osiData, firmanteData, recibidoData, documentType } = await request.json();

    if (!certificates || !osiData || !firmanteData || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields: certificates, osiData, firmanteData, documentType' },
        { status: 400 }
      );
    }

    const templateData = DocumentTemplateProcessor.prepareTemplateData(
      certificates,
      osiData,
      firmanteData,
      recibidoData
    );

    const processor = new TemplateBasedPdfGenerator();
    console.log('🔧 Using TemplateBasedPdfGenerator for document type:', documentType);
    let documentBuffer: Buffer;

    switch (documentType) {
      case 'certificacion_competencias':
        documentBuffer = await processor.generateCertificacionCompetencias(templateData);
        break;
      case 'nota_entrega':
        documentBuffer = await processor.generateNotaEntrega(templateData);
        break;
      case 'validacion_datos':
        documentBuffer = await processor.generateValidacionDatos(templateData);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid document type. Must be: certificacion_competencias, nota_entrega, or validacion_datos' },
          { status: 400 }
        );
    }

    // Set appropriate headers for PDF file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="${documentType}_${Date.now()}.pdf"`);

    return new NextResponse(documentBuffer as any, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json(
      { error: 'Failed to generate document', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
