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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const supabase = await createClient();
    const id = parseInt(resolvedParams.id);
    
    const body = await request.json();
    const { activate } = body;

    if (typeof activate !== 'boolean') {
      return NextResponse.json(
        { error: 'activate field is required and must be boolean' },
        { status: 400 }
      );
    }

    // If activating, check if there's already an active signature of the same type
    if (activate) {
      // First get the signature type
      const { data: signature, error: fetchError } = await supabase
        .from('firmas')
        .select('tipo')
        .eq('id', id)
        .single();

      if (fetchError || !signature) {
        return NextResponse.json(
          { error: 'Signature not found' },
          { status: 404 }
        );
      }

      // For SHA representatives, ensure only one is active at a time
      if (signature.tipo === 'representante_sha') {
        // Deactivate all other SHA representative signatures
        await supabase
          .from('firmas')
          .update({
            is_active: false,
            fecha_actualizacion: new Date().toISOString(),
          })
          .eq('tipo', 'representante_sha')
          .neq('id', id);
      }
    }

    // Update the signature
    const { error: updateError } = await supabase
      .from('firmas')
      .update({
        is_active: activate,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ 
      success: true, 
      message: activate ? 'Signature activated successfully' : 'Signature deactivated successfully'
    });
  } catch (error) {
    console.error('Signature patch error:', error);
    return NextResponse.json(
      { error: 'Failed to update signature' },
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

    // First, get signature record to check if it exists and get its type
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

    // Soft delete: set is_active to false instead of deleting record
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

    // If it's a facilitator signature, also clear firma_id from facilitador
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
