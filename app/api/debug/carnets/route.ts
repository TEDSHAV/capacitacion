import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get all carnets with basic info
    const { data: carnets, error } = await supabase
      .from('carnets')
      .select(`
        id,
        id_certificado,
        id_participante,
        nombre_participante,
        cedula_participante,
        titulo_curso,
        created_at,
        is_active
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        totalCarnets: carnets?.length || 0,
        carnets: carnets || [],
        message: carnets?.length === 0 ? 'No carnets found in database' : `Found ${carnets?.length} carnets`
      }
    });

  } catch (error) {
    console.error('Error getting carnets:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
