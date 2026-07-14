"use server";

import { createClient } from '@/utils/supabase/server';

export async function testDatabaseConnection() {
  try {
    console.log('=== Database Connection Test ===');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlPrefix: supabaseUrl?.substring(0, 20) + '...'
    });
    
    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: 'Missing Supabase environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      };
    }
    
    const supabase = await createClient();
    console.log('Supabase client created');
    
    // Test ejecucion_osi table
    console.log('Testing ejecucion_osi table...');
    const { data: osis, error: osiError } = await supabase
      .from("ejecucion_osi")
      .select("id, nro_osi")
      .limit(1);

    if (osiError) {
      return {
        success: false,
        error: 'Cannot access ejecucion_osi table',
        details: {
          message: osiError.message,
          code: osiError.code,
          details: osiError.details,
          hint: osiError.hint
        }
      };
    }
    
    // Test cursos table
    console.log('Testing cursos table...');
    const { data: cursos, error: cursosError } = await supabase
      .from("cursos")
      .select("id, nombre")
      .limit(1);

    if (cursosError) {
      return {
        success: false,
        error: 'Cannot access cursos table',
        details: {
          message: cursosError.message,
          code: cursosError.code,
          details: cursosError.details,
          hint: cursosError.hint
        }
      };
    }
    
    return {
      success: true,
      data: {
        osiSample: osis,
        cursoSample: cursos,
        message: 'Database connection successful'
      }
    };
    
  } catch (error) {
    console.error('Connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
}
