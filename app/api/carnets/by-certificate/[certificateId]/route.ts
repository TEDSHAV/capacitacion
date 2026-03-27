import { NextRequest, NextResponse } from 'next/server';
import { getCarnetsByCertificateId } from '@/app/actions/carnets';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  try {
    const resolvedParams = await params;
    const certificateId = parseInt(resolvedParams.certificateId);

    if (isNaN(certificateId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid certificate ID' },
        { status: 400 }
      );
    }

    const result = await getCarnetsByCertificateId(certificateId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error fetching carnets by certificate ID:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
