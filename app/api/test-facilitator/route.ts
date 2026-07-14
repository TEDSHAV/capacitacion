import { NextRequest, NextResponse } from 'next/server';
import { certificateService } from '@/lib/certificate-service';

export async function GET() {
  try {
    // Test facilitator data fetching
    const facilitator = await certificateService.getFacilitatorData('7');
    
    return NextResponse.json({
      facilitator_data: facilitator,
      success: true
    });

  } catch (error) {
    console.error('Error testing facilitator:', error);
    return NextResponse.json(
      { error: 'Failed to test facilitator', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
