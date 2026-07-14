import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract form fields
    const fuente = formData.get('fuente') as string;
    const ano_ingreso = formData.get('ano_ingreso') as string;
    const nombre_apellido = formData.get('nombre_apellido') as string;
    const cedula = formData.get('cedula') as string;
    const rif = formData.get('rif') as string;
    const email = formData.get('email') as string;
    const telefono = formData.get('telefono') as string;
    const direccion = formData.get('direccion') as string;
    const nivel_tecnico = formData.get('nivel_tecnico') as string;
    const formacion_docente_certificada = formData.get('formacion_docente_certificada') === 'true';
    const tipo_impacto = formData.get('tipo_impacto') as string;
    const notas_observaciones = formData.get('notas_observaciones') as string;
    const id_estado_base = formData.get('id_estado_base') ? parseInt(formData.get('id_estado_base') as string) : null;
    const id_ciudad_base = formData.get('id_ciudad_base') ? parseInt(formData.get('id_ciudad_base') as string) : null;
    const id_estado_geografico = formData.get('id_estado_geografico') ? parseInt(formData.get('id_estado_geografico') as string) : null;
    const id_estatus = formData.get('id_estatus') ? parseInt(formData.get('id_estatus') as string) : 1;
    const temas_cursos = JSON.parse(formData.get('temas_cursos') as string || '[]');
    const ficha_tecnica = formData.get('ficha_tecnica') as string;
    const calificacion = formData.get('calificacion') ? parseFloat(formData.get('calificacion') as string) : null;
    const firma_id = formData.get('firma_id') ? parseInt(formData.get('firma_id') as string) : null;
    const resumeFile = formData.get('resume') as File | null;

    // Validate required fields
    if (!nombre_apellido || !cedula || !email || !telefono) {
      return NextResponse.json(
        { error: 'Missing required fields: nombre_apellido, cedula, email, telefono' },
        { status: 400 }
      );
    }

    let url_curriculum = null;
    
    // Handle resume file upload if provided
    if (resumeFile) {
      // Create resumes directory if it doesn't exist
      const resumesDir = join(process.cwd(), 'public', 'resumes');
      try {
        await mkdir(resumesDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `resume_${timestamp}_${resumeFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filepath = join(resumesDir, filename);

      // Save file to public/resumes directory
      const bytes = await resumeFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filepath, buffer);
      
      url_curriculum = `/resumes/${filename}`;
    }

    // Save facilitator record to database
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('facilitadores')
      .insert([
        {
          fuente: fuente || null,
          ano_ingreso: ano_ingreso ? parseInt(ano_ingreso) : null,
          nombre_apellido,
          cedula,
          rif: rif || null,
          email,
          telefono,
          direccion: direccion || null,
          nivel_tecnico: nivel_tecnico || null,
          formacion_docente_certificada,
          tipo_impacto: tipo_impacto || null,
          notas_observaciones: notas_observaciones || null,
          id_estado_base,
          id_ciudad_base,
          id_estado_geografico,
          id_estatus,
          temas_cursos,
          ficha_tecnica: ficha_tecnica || null,
          calificacion,
          url_curriculum: url_curriculum,
          firma_id,
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      // If database insert fails, clean up the uploaded file
      if (url_curriculum) {
        try {
          const fs = require('fs/promises');
          await fs.unlink(join(process.cwd(), 'public', url_curriculum));
        } catch (cleanupError) {
          console.error('Error cleaning up resume file:', cleanupError);
        }
      }
      
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Facilitator creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create facilitator' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('facilitadores')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Facilitators fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch facilitators' },
      { status: 500 }
    );
  }
}
