import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const idNumber = resolvedParams.id;

    if (!idNumber) {
      return NextResponse.json({ error: 'ID number is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Clean ID number - remove any V- or E- prefix and ensure it's numeric only
    const cleanIdNumber = idNumber.replace(/^[VE]-/i, '').replace(/[^0-9]/g, '');

    // Validate that we have a numeric ID
    if (!cleanIdNumber || !/^\d+$/.test(cleanIdNumber)) {
      return NextResponse.json({ error: 'Invalid ID number format. Please enter only numbers.' }, { status: 400 });
    }

    // Search for participants by ID number (both V and E nationalities)
    const { data: participants, error: participantError } = await supabase
      .from('participantes_certificados')
      .select('*')
      .eq('cedula', cleanIdNumber);

    if (participantError) {
      console.error('Error fetching participants:', participantError);
      return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Get all certificates for all matching participants
    const participantIds = participants.map(p => p.id);
    const { data: certificates, error: certificatesError } = await supabase
      .from('certificados')
      .select(`
        *,
        cursos!inner (
          id,
          nombre,
          contenido,
          horas_estimadas,
          nota_aprobatoria,
          emite_carnet
        ),
        empresas!certificados_id_empresa_fkey (
          id,
          razon_social,
          rif
        ),
        facilitadores!certificados_id_facilitador_fkey (
          id,
          nombre_apellido,
          cedula,
          email
        )
      `)
      .in('id_participante', participantIds)
      .eq('is_active', true)
      .order('fecha_emision', { ascending: false });

    if (certificatesError) {
      console.error('Error fetching certificates:', certificatesError);
      return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
    }

    
    // Parse snapshot content for each certificate
    const certificatesWithParsedData = certificates?.map(cert => {
      let parsedSnapshot = null;
      if (cert.snapshot_contenido) {
        try {
          parsedSnapshot = JSON.parse(cert.snapshot_contenido);
        } catch (error) {
          console.warn('Failed to parse snapshot for certificate:', cert.id);
        }
      }
      return {
        ...cert,
        parsed_snapshot: parsedSnapshot
      };
    }) || [];

    // Calculate statistics
    const totalCertificates = certificatesWithParsedData.length;
    const totalHours = certificatesWithParsedData.reduce((sum, cert) => {
      return sum + (cert.parsed_snapshot?.certificado_detalles?.horas_estimadas || 
                   cert.cursos?.horas_estimadas || 0);
    }, 0);

    const averageScore = certificatesWithParsedData.length > 0 
      ? certificatesWithParsedData.reduce((sum, cert) => 
          sum + (cert.parsed_snapshot?.participante?.score || cert.calificacion || 0), 0) / 
        certificatesWithParsedData.length
      : 0;

    // Get unique companies
    const uniqueCompanies = [...new Set(
      certificatesWithParsedData
        .map(cert => cert.empresas?.razon_social)
        .filter(Boolean)
    )];

    // Get unique courses
    const uniqueCourses = [...new Set(
      certificatesWithParsedData
        .map(cert => cert.cursos?.nombre)
        .filter(Boolean)
    )];

    // Use the first participant as the primary record for display
    const primaryParticipant = participants[0];
    
    // Determine nationality - check database field first, then determine from cedula if needed
    let nationality = primaryParticipant.nacionalidad;
    
    // Handle legacy formats and determine correct nationality
    if (!nationality) {
      nationality = idNumber.startsWith('E-') ? 'E-' : 'V-';
    } else if (nationality === 'venezolano') {
      nationality = 'V-';
    } else if (nationality === 'extranjero') {
      nationality = 'E-';
    } else if (nationality !== 'V-' && nationality !== 'E-') {
      // If it's some other format, determine from the original ID
      nationality = idNumber.startsWith('E-') ? 'E-' : 'V-';
    }
    
    const response = {
      participant: {
        ...primaryParticipant,
        nacionalidad: nationality,
        total_records: participants.length
      },
      certificates: certificatesWithParsedData,
      statistics: {
        totalCertificates,
        totalHours,
        averageScore: Math.round(averageScore * 100) / 100,
        uniqueCompaniesCount: uniqueCompanies.length,
        uniqueCoursesCount: uniqueCourses.length,
        uniqueCompanies,
        uniqueCourses
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in participant lookup API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
