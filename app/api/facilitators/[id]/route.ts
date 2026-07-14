import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const id = params.id;

    // First, get the facilitator record to find the resume file
    const { data: facilitator, error: fetchError } = await supabase
      .from('facilitadores')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !facilitator) {
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
      throw deleteError;
    }

    // Delete the resume file from the filesystem if it exists
    if (facilitator.url_curriculum) {
      try {
        const filepath = join(process.cwd(), 'public', facilitator.url_curriculum);
        await unlink(filepath);
      } catch (fileError) {
        // File might not exist, but we don't want to fail the operation
        console.warn('Could not delete resume file:', fileError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Facilitator delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete facilitator' },
      { status: 500 }
    );
  }
}
