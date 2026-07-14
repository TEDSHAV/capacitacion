import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const supabase = await createClient();
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', received: resolvedParams.id, type: typeof resolvedParams.id },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('facilitadores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Facilitator not found', details: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const supabase = await createClient();
    const id = parseInt(resolvedParams.id);
    const body = await request.json();

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('facilitadores')
      .update({
        ...body,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update facilitator', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const supabase = await createClient();
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    // First, get the facilitator record to find the resume file
    const { data: facilitator, error: fetchError } = await supabase
      .from('facilitadores')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Facilitator not found', details: fetchError.message },
        { status: 404 }
      );
    }

    if (!facilitator) {
      return NextResponse.json(
        { error: 'Facilitator not found' },
        { status: 404 }
      );
    }

    // Delete the facilitator record from database
    const { error: deleteError } = await supabase
      .from('facilitadores')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete facilitator', details: deleteError.message },
        { status: 400 }
      );
    }

    // Delete the resume file from the filesystem if it exists
    if (facilitator.url_curriculum) {
      try {
        const filepath = join(process.cwd(), 'public', facilitator.url_curriculum);
        await unlink(filepath);
      } catch (fileError) {
        // Continue even if file deletion fails
      }
    }

    return NextResponse.json({ message: 'Facilitator deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
