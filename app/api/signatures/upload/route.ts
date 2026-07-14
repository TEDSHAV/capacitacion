import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;

    if (!file || !name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Save signature record to database
    const supabase = await createClient();
    const imageUrl = `/signatures/${filename}`;

    const { data, error } = await supabase
      .from('signatures')
      .insert([
        {
          name,
          type,
          image_url: imageUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      // If database insert fails, clean up the uploaded file
      try {
        const fs = require('fs/promises');
        await fs.unlink(filepath);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
      
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Signature upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload signature' },
      { status: 500 }
    );
  }
}
