"use server";

import { createClient } from '@/utils/supabase/server';
import { cache } from 'react';

// Create OSI
const createOSI = cache(async (osiData: any) => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('osi')
      .insert([osiData])
      .select()
      .single();
    
    if (error) {
      return { error: error.message, data: null };
    }
    
    return { data, error: null };
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Unknown error',
      data: null 
    };
  }
});

// Update OSI
const updateOSI = cache(async (id: number, osiData: any) => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('osi')
      .update(osiData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return { error: error.message, data: null };
    }
    
    return { data, error: null };
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Unknown error',
      data: null 
    };
  }
});

// Get OSI by ID
const getOSIById = cache(async (id: number) => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('osi')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return { error: error.message, data: null };
    }
    
    return { data, error: null };
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Unknown error',
      data: null 
    };
  }
});

// Delete OSI
const deleteOSI = cache(async (id: number) => {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase
      .from('osi')
      .delete()
      .eq('id', id);
    
    if (error) {
      return { error: error.message, success: false };
    }
    
    return { error: null, success: true };
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Unknown error',
      success: false 
    };
  }
});

// Export server actions
export async function createOSIAction(osiData: any) {
  return await createOSI(osiData);
}

export async function updateOSIAction(id: number, osiData: any) {
  return await updateOSI(id, osiData);
}

export async function getOSIByIdAction(id: number) {
  return await getOSIById(id);
}

export async function deleteOSIAction(id: number) {
  return await deleteOSI(id);
}
