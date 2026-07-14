import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const participantId = searchParams.get('participantId');
    const courseId = searchParams.get('courseId');
    const companyId = searchParams.get('companyId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
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
        ),
        participantes_certificados!certificados_id_participante_fkey (
          id,
          nombre,
          apellido,
          cedula,
          nacionalidad
        )
      `)
      .eq('is_active', true)
      .order('fecha_emision', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters if provided
    if (participantId) {
      query = query.eq('id_participante', participantId);
    }
    if (courseId) {
      query = query.eq('id_curso', courseId);
    }
    if (companyId) {
      query = query.eq('id_empresa', companyId);
    }

    const { data: certificates, error, count } = await query;

    if (error) {
      console.error('Error fetching certificates:', error);
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

    return NextResponse.json({
      certificates: certificatesWithParsedData,
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error in certificates API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    const { 
      id_participante, 
      id_curso, 
      id_empresa, 
      id_facilitador,
      calificacion,
      fecha_emision,
      fecha_vencimiento,
      control_numbers,
      snapshot_contenido
    } = body;

    // Validate required fields
    if (!id_participante || !id_curso || !id_empresa) {
      return NextResponse.json({ 
        error: 'Missing required fields: participant, course, and company are required' 
      }, { status: 400 });
    }

    const { data: certificate, error } = await supabase
      .from('certificados')
      .insert({
        id_participante,
        id_curso,
        id_empresa,
        id_facilitador,
        calificacion,
        fecha_emision: fecha_emision || new Date().toISOString(),
        fecha_vencimiento,
        control_numbers,
        snapshot_contenido,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating certificate:', error);
      return NextResponse.json({ error: 'Failed to create certificate' }, { status: 500 });
    }

    return NextResponse.json({ certificate }, { status: 201 });

  } catch (error) {
    console.error('Error in certificate creation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
