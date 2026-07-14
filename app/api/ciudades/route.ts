import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get cities with their state information
    const { data, error } = await supabase
      .from('cat_ciudades')
      .select(`
        id,
        nombre_ciudad,
        id_estado,
        cat_estados_venezuela (
          id,
          nombre_estado
        )
      `)
      .order('nombre_ciudad', { ascending: true });

    if (error) {
      console.error('Error fetching cities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cities' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Cities fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id_estado, nombre_ciudad } = body;

    if (!id_estado || !nombre_ciudad) {
      return NextResponse.json(
        { error: 'id_estado and nombre_ciudad are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('cat_ciudades')
      .insert([{ id_estado, nombre_ciudad }])
      .select()
      .single();

    if (error) {
      console.error('Error creating city:', error);
      return NextResponse.json(
        { error: 'Failed to create city' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('City creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
