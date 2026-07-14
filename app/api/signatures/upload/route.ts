import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const facilitadorId = formData.get('facilitadorId') as string;
    const name = formData.get('name') as string;

    if (!file || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate based on signature type
    if (type === 'facilitador' && !facilitadorId) {
      return NextResponse.json(
        { error: 'Facilitador ID is required for facilitator signatures' },
        { status: 400 }
      );
    }

    if (type === 'representante_sha' && !name) {
      return NextResponse.json(
        { error: 'Name is required for SHA representative signatures' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PNG, JPG, and JPEG are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Create signatures directory if it doesn't exist
    const signaturesDir = join(process.cwd(), 'public', 'signatures');
    try {
      await mkdir(signaturesDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${type}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filepath = join(signaturesDir, filename);

    // Save file to public/signatures directory
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Get the name for the signature record
    let signatureName: string;
    const supabase = await createClient();

    if (type === 'facilitador') {
      // Get facilitator information
      const { data: facilitador, error: facilitadorError } = await supabase
        .from('facilitadores')
        .select('nombre_apellido')
        .eq('id', parseInt(facilitadorId))
        .single();

      if (facilitadorError || !facilitador) {
        // Clean up uploaded file if facilitator not found
        try {
          const fs = require('fs/promises');
          await fs.unlink(filepath);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
        
        return NextResponse.json(
          { error: 'Facilitator not found' },
          { status: 404 }
        );
      }
      signatureName = facilitador.nombre_apellido;
    } else {
      signatureName = name.trim();
    }

    // Save signature record to database
    const imageUrl = `/signatures/${filename}`;

    // If it's a representante_sha signature, deactivate all existing ones first
    if (type === 'representante_sha') {
      const { error: deactivateError } = await supabase
        .from('firmas')
        .update({ 
          is_active: false,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('tipo', 'representante_sha');

      if (deactivateError) {
        console.error('Error deactivating existing representante_sha signatures:', deactivateError);
        // Don't fail the operation, but log the error
      }
    }

    const { data: signatureData, error: signatureError } = await supabase
      .from('firmas')
      .insert([
        {
          nombre: signatureName,
          tipo: type,
          url_imagen: imageUrl,
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString(),
          is_active: true,
        },
      ])
      .select()
      .single();

    if (signatureError) {
      // If database insert fails, clean up the uploaded file
      try {
        const fs = require('fs/promises');
        await fs.unlink(filepath);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
      
      throw signatureError;
    }

    // If it's a facilitator signature, update the facilitador with the signature ID
    if (type === 'facilitador') {
      const { error: updateError } = await supabase
        .from('facilitadores')
        .update({
          firma_id: signatureData.id,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id', parseInt(facilitadorId));

      if (updateError) {
        console.error('Error updating facilitator with signature ID:', updateError);
        // Don't fail the operation, but log the error
      }
    }

    return NextResponse.json(signatureData);
  } catch (error) {
    console.error('Signature upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload signature' },
      { status: 500 }
    );
  }
}
