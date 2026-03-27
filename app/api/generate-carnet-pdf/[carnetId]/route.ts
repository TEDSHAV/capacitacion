import { NextRequest, NextResponse } from 'next/server';
import { getCarnetById } from '@/app/actions/carnets';
import { CarnetGenerator } from '@/lib/carnet-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ carnetId: string }> }
) {
  try {
    const resolvedParams = await params;
    const carnetId = parseInt(resolvedParams.carnetId);

    console.log('🎯 Generating carnet PDF for ID:', carnetId);

    if (isNaN(carnetId)) {
      console.error('❌ Invalid carnet ID:', resolvedParams.carnetId);
      return NextResponse.json(
        { success: false, error: 'Invalid carnet ID' },
        { status: 400 }
      );
    }

    // Get carnet data from database
    console.log('📋 Fetching carnet from database...');
    const carnetResult = await getCarnetById(carnetId);

    if (!carnetResult.success || !carnetResult.data) {
      console.error('❌ Carnet not found:', carnetResult);
      return NextResponse.json(
        { success: false, error: carnetResult.error || 'Carnet not found' },
        { status: 404 }
      );
    }

    const carnet = carnetResult.data;
    console.log('✅ Carnet found:', { id: carnet.id, participant: carnet.nombre_participante });

    // Generate carnet PDF
    console.log('🎨 Initializing carnet generator...');
    const generator = new CarnetGenerator();
    
    const carnetRequest = {
      participant: {
        name: carnet.nombre_participante,
        id_number: carnet.cedula_participante,
        company: carnet.empresa_participante || undefined
      },
      carnetData: {
        id_certificado: carnet.id_certificado!,
        id_participante: carnet.id_participante!,
        id_empresa: carnet.id_empresa,
        id_curso: carnet.id_curso!,
        id_osi: carnet.id_osi!,
        titulo_curso: carnet.titulo_curso,
        fecha_emision: carnet.fecha_emision,
        fecha_vencimiento: carnet.fecha_vencimiento,
        nombre_participante: carnet.nombre_participante,
        cedula_participante: carnet.cedula_participante,
        empresa_participante: carnet.empresa_participante
      },
      templateImage: '/templates/carnet.png',
      isPreview: false,
      carnetId: carnet.id
    };

    console.log('🔄 Generating carnet PDF with request:', {
      participant: carnetRequest.participant.name,
      template: carnetRequest.templateImage,
      carnetId: carnetRequest.carnetId
    });

    const pdfBlob = await generator.generateCarnet(carnetRequest);
    console.log('✅ Carne PDF generated successfully');

    // Return PDF as response
    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="carnet-${carnet.id}.pdf"`,
      },
    });

  } catch (error) {
    console.error('💥 Error generating carnet PDF:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate carnet PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
