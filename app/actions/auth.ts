"use server";

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function handleSignup(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;

  // Validate required fields
  if (!email || !password || !name) {
    return { error: 'Todos los campos son requeridos' };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    });

    if (error) {
      return { error: error.message };
    }

    return { 
      success: 'Cuenta creada exitosamente. Por favor verifica tu email.',
      redirect: '/login'
    };

  } catch (error) {
    return { error: 'Error al crear la cuenta' };
  }
}

export async function handleLogout() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath('/dashboard');
    redirect('/login');
  } catch (error) {
    return { error: 'Error al cerrar sesión' };
  }
}
