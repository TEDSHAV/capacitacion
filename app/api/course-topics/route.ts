import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get all active courses
    const { data, error } = await supabase
      .from('cursos')
      .select(`
        id,
        nombre
      `)
      .eq('is_active', true)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error fetching course topics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch course topics' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Course topics fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
