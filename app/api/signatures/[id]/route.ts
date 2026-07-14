import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const id = params.id;

    const { data, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Signature not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Signature fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signature' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const id = params.id;

    // First, get the signature record to find the image file
    const { data: signature, error: fetchError } = await supabase
      .from('signatures')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !signature) {
      return NextResponse.json(
        { error: 'Signature not found' },
        { status: 404 }
      );
    }

    // Delete the signature record from database
    const { error: deleteError } = await supabase
      .from('signatures')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    // Delete the image file from the filesystem
    try {
      const filepath = join(process.cwd(), 'public', signature.image_url);
      await unlink(filepath);
    } catch (fileError) {
      // File might not exist, but we don't want to fail the operation
      console.warn('Could not delete signature file:', fileError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Signature delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete signature' },
      { status: 500 }
    );
  }
}
