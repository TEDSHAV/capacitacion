import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    const { participantIds } = body;

    if (!participantIds || !Array.isArray(participantIds)) {
      return NextResponse.json({ 
        error: 'participantIds array is required' 
      }, { status: 400 });
    }

    const results = [];

    for (const participantId of participantIds) {
      try {
        // Get current participant data
        const { data: participant, error: fetchError } = await supabase
          .from('participantes_certificados')
          .select('id, cedula, nacionalidad')
          .eq('id', participantId)
          .single();

        if (fetchError) {
          results.push({
            id: participantId,
            success: false,
            error: fetchError.message
          });
          continue;
        }

        if (!participant) {
          results.push({
            id: participantId,
            success: false,
            error: 'Participant not found'
          });
          continue;
        }

        // Determine correct nationality based on cedula
        let correctNationality = 'V-';
        if (participant.cedula) {
          // Check if cedula starts with E- or is in the format that suggests foreign
          const cedulaStr = participant.cedula.toString();
          if (cedulaStr.startsWith('E-') || 
              (participant.nacionalidad === 'extranjero') ||
              (participant.nacionalidad === 'E-')) {
            correctNationality = 'E-';
          }
        }

        // Update if nationality is different or missing
        if (participant.nacionalidad !== correctNationality) {
          const { error: updateError } = await supabase
            .from('participantes_certificados')
            .update({ nacionalidad: correctNationality })
            .eq('id', participantId);

          if (updateError) {
            results.push({
              id: participantId,
              success: false,
              error: updateError.message,
              oldNationality: participant.nacionalidad,
              newNationality: correctNationality
            });
          } else {
            results.push({
              id: participantId,
              success: true,
              oldNationality: participant.nacionalidad,
              newNationality: correctNationality,
              message: 'Nationality fixed successfully'
            });
          }
        } else {
          results.push({
            id: participantId,
            success: true,
            message: 'Nationality already correct',
            nationality: correctNationality
          });
        }

      } catch (error) {
        results.push({
          id: participantId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Summary statistics
    const totalProcessed = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = totalProcessed - successful;
    const actuallyFixed = results.filter(r => r.success && r.newNationality && r.oldNationality !== r.newNationality).length;

    return NextResponse.json({
      summary: {
        totalProcessed,
        successful,
        failed,
        actuallyFixed
      },
      results
    });

  } catch (error) {
    console.error('Error in fix-nationality API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get participants with potential nationality issues
    const { data: participants, error } = await supabase
      .from('participantes_certificados')
      .select('id, cedula, nacionalidad, nombre, apellido')
      .or('nacionalidad.is.null,nacionalidad.eq.venezolano,nacionalidad.eq.extranjero,nacionalidad.not.eq.V-,nacionalidad.not.eq.E-')
      .limit(100);

    if (error) {
      console.error('Error fetching participants with nationality issues:', error);
      return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
    }

    // Analyze and suggest corrections
    const analyzedParticipants = participants?.map(participant => {
      let suggestedNationality = 'V-';
      let reason = 'Default to Venezuelan';
      
      if (participant.cedula) {
        const cedulaStr = participant.cedula.toString();
        if (cedulaStr.startsWith('E-')) {
          suggestedNationality = 'E-';
          reason = 'Cedula starts with E-';
        } else if (participant.nacionalidad === 'extranjero' || participant.nacionalidad === 'E-') {
          suggestedNationality = 'E-';
          reason = 'Current nationality indicates foreign';
        }
      }

      return {
        ...participant,
        suggestedNationality,
        reason,
        needsFix: participant.nacionalidad !== suggestedNationality
      };
    }) || [];

    const needsFixCount = analyzedParticipants.filter(p => p.needsFix).length;

    return NextResponse.json({
      participants: analyzedParticipants,
      summary: {
        totalFound: analyzedParticipants.length,
        needsFix: needsFixCount
      }
    });

  } catch (error) {
    console.error('Error in fix-nationality GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
