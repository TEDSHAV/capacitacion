"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cache } from "react";

export interface Feriado {
  id: number;
  fecha: string;
  nombre: string;
  es_nacional: boolean;
}

/**
 * Fetch all feriados as a Set of "YYYY-MM-DD" strings.
 * Used by indicadores calculations for business-day counting.
 * Cached per-request.
 *
 * Gracefully returns an empty set if the table doesn't exist yet
 * (e.g. migration not applied), so the indicadores page keeps working.
 */
export const getFeriadosSet = cache(async (): Promise<Set<string>> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("cat_feriados_venezuela")
      .select("fecha");

    if (error) {
      // Table may not exist yet — log and return empty set
      console.error("Error fetching feriados (table may not exist):", error.message);
      return new Set();
    }

    return new Set((data || []).map((r: { fecha: string }) => r.fecha));
  } catch (err) {
    console.error("Unexpected error fetching feriados:", err);
    return new Set();
  }
});

/**
 * Fetch all feriados for the admin management page.
 * Returns full records sorted by fecha descending.
 */
export async function getFeriadosAdmin(): Promise<{
  data: Feriado[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cat_feriados_venezuela")
    .select("id, fecha, nombre, es_nacional")
    .order("fecha", { ascending: false });

  if (error) {
    console.error("Error fetching feriados for admin:", error);
    return { data: null, error: error.message };
  }

  return { data: data as Feriado[], error: null };
}

/**
 * Create a new feriado.
 */
export async function createFeriado(
  fecha: string,
  nombre: string,
  esNacional: boolean = true,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("cat_feriados_venezuela")
    .insert({ fecha, nombre: nombre.trim(), es_nacional: esNacional });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un feriado en esa fecha." };
    }
    console.error("Error creating feriado:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/capacitacion/configuracion/feriados");
  revalidatePath("/dashboard/capacitacion/indicadores");
  return { error: null };
}

/**
 * Delete a feriado by id.
 */
export async function deleteFeriado(id: number): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("cat_feriados_venezuela")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting feriado:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/capacitacion/configuracion/feriados");
  revalidatePath("/dashboard/capacitacion/indicadores");
  return { error: null };
}
