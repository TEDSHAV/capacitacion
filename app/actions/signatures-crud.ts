"use server";

import { createClient } from '@/utils/supabase/server';
import { cache } from 'react';

// Get all signatures
const getSignatures = cache(async () => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('firmas')
      .select('*')
      .order('fecha_creacion', { ascending: false });
    
    if (error) {
      return { error: error.message, data: [] };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Unknown error',
      data: [] 
    };
  }
});

// Get signature by ID
const getSignatureById = cache(async (id: string) => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('firmas')
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

// Create signature
const createSignature = cache(async (signatureData: any) => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('firmas')
      .insert([signatureData])
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

// Update signature
const updateSignature = cache(async (id: string, signatureData: any) => {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('firmas')
      .update(signatureData)
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

// Delete signature
const deleteSignature = cache(async (id: string) => {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase
      .from('firmas')
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
export async function getSignaturesAction() {
  return await getSignatures();
}

export async function getSignatureByIdAction(id: string) {
  return await getSignatureById(id);
}

export async function createSignatureAction(signatureData: any) {
  return await createSignature(signatureData);
}

export async function updateSignatureAction(id: string, signatureData: any) {
  return await updateSignature(id, signatureData);
}

export async function deleteSignatureAction(id: string) {
  return await deleteSignature(id);
}
