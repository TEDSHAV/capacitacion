"use server";

import { createClient } from '@/utils/supabase/server';

// Simple OSI query without joins to test basic connectivity
export async function getSimpleOSIs() {
  try {
    const supabase = await createClient();
    
    // 1. Test basic table access
    const { data: basicData, error: basicError } = await supabase
      .from('osi')
      .select('*')
      .limit(5);
    
    if (basicError) {
      return { error: basicError.message, data: null };
    }
    
    // 2. Test count
    const { count, error: countError } = await supabase
      .from('osi')
      .select('*', { count: 'exact', head: true });
    
    // 3. Test with ordering
    const { data: orderedData, error: orderedError } = await supabase
      .from('osi')
      .select('*')
      .order('fecha_emision', { ascending: false })
      .limit(5);
    
    return {
      data: basicData,
      count: count,
      orderedData: orderedData,
      columns: basicData && basicData.length > 0 ? Object.keys(basicData[0]) : []
    };
    
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Unknown error',
      data: null
    };
  }
}
