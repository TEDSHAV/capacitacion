import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get all courses with their carnet settings
    const { data: courses, error } = await supabase
      .from('cursos')
      .select('id, nombre, emite_carnet, is_active')
      .order('nombre');

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Format for debugging
    const formattedCourses = courses?.map(course => ({
      id: course.id,
      name: course.nombre,
      emite_carnet: course.emite_carnet,
      is_active: course.is_active,
      status: course.emite_carnet ? '🎉 GENERATES CARNETS' : '❌ NO CARNETS',
      color: course.emite_carnet ? 'green' : 'red'
    })) || [];

    return NextResponse.json({
      success: true,
      data: formattedCourses
    });

  } catch (error) {
    console.error('Error debugging courses:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
