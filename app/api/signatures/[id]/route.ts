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

    const { data, error } = await supabase
      .from('firmas')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const supabase = await createClient();
    const id = parseInt(resolvedParams.id);

    // First, get the signature record to check if it exists and get its type
    const { data: signature, error: fetchError } = await supabase
      .from('firmas')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !signature) {
      return NextResponse.json(
        { error: 'Signature not found' },
        { status: 404 }
      );
    }

    // Soft delete: set is_active to false instead of deleting the record
    const { error: updateError } = await supabase
      .from('firmas')
      .update({
        is_active: false,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // If it's a facilitator signature, also clear the firma_id from the facilitador
    if (signature.tipo === 'facilitador') {
      const { error: facilitatorUpdateError } = await supabase
        .from('facilitadores')
        .update({
          firma_id: null,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('firma_id', id);

      if (facilitatorUpdateError) {
        console.error('Error updating facilitator to remove signature ID:', facilitatorUpdateError);
        // Don't fail the operation, but log the error
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Signature deactivated successfully' 
    });
  } catch (error) {
    console.error('Signature delete error:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate signature' },
      { status: 500 }
    );
  }
}
