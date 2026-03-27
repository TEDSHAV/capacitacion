import { NextRequest, NextResponse } from 'next/server';
import { getCarnetsRelationships } from '@/app/actions/carnets';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ osiId: string }> }
) {
  try {
    const resolvedParams = await params;
    const osiId = parseInt(resolvedParams.osiId);

    if (isNaN(osiId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid OSI ID' },
        { status: 400 }
      );
    }

    const result = await getCarnetsRelationships(osiId);

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
    console.error('Error fetching OSI relationships:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
