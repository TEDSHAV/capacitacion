import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get all states ordered by name
    const { data, error } = await supabase
      .from('cat_estados_venezuela')
      .select(`
        id,
        nombre_estado,
        capital_estado
      `)
      .order('nombre_estado', { ascending: true });

    if (error) {
      console.error('Error fetching states:', error);
      return NextResponse.json(
        { error: 'Failed to fetch states' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('States fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
