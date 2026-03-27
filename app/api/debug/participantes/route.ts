import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get all participants to check ID patterns
    const { data: participants, error } = await supabase
      .from('participantes_certificados')
      .select('id, nombre, cedula')
      .order('id')
      .limit(20); // Just first 20 for debugging

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Analyze ID patterns
    const idAnalysis = {
      totalParticipants: participants?.length || 0,
      idRange: {
        min: participants?.[0]?.id || 'N/A',
        max: participants?.[participants.length - 1]?.id || 'N/A',
      },
      idTypes: participants?.map(p => ({
        id: p.id,
        idType: typeof p.id,
        idLength: p.id.toString().length,
        isNumeric: /^\d+$/.test(p.id.toString()),
        isWithinIntegerRange: parseInt(p.id) <= 2147483647 // Max int value
      })),
      problematicIds: participants?.filter(p => 
        parseInt(p.id) > 2147483647 || !/^\d+$/.test(p.id.toString())
      )
    };

    return NextResponse.json({
      success: true,
      data: idAnalysis
    });

  } catch (error) {
    console.error('Error debugging participants:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
