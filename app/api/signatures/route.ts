import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('firmas')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Signatures fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch signatures', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Signatures fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
