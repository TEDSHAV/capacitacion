"use server";

export async function testDatabaseConnection() {
  try {
    console.log('Test: Starting database connection test...');
    
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    console.log('Test: Supabase client created');
    
    // Test basic query
    const { data, error } = await supabase
      .from('ejecucion_osi')
      .select('id')
      .limit(1);
    
    console.log('Test: Query result:', { data, error });
    
    if (error) {
      console.error('Test: Query failed:', error);
      return { success: false, error: error.message };
    }
    
    return { 
      success: true, 
      message: 'Database connection working',
      data: data 
    };
    
  } catch (error) {
    console.error('Test: Exception occurred:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
