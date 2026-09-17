"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import {
  CourseCategoryItem,
  DEFAULT_COURSE_CATEGORIES,
} from "@/lib/course-categories";

export async function getCategoriasCursos(): Promise<{
  success: boolean;
  data: CourseCategoryItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("capacitacion_categorias_cursos")
      .select("*")
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true });

    if (error) {
      // Table doesn't exist yet (migration pending) - fallback gracefully to default categories
      if (
        error.code === "42P01" ||
        error.message?.includes("does not exist") ||
        error.message?.includes("schema cache")
      ) {
        return { success: true, data: DEFAULT_COURSE_CATEGORIES };
      }
      console.warn("Could not fetch categories, using defaults:", error.message);
      return { success: true, data: DEFAULT_COURSE_CATEGORIES };
    }

    if (!data || data.length === 0) {
      return { success: true, data: DEFAULT_COURSE_CATEGORIES };
    }

    return { success: true, data };
  } catch (err) {
    console.warn("Error fetching categories, falling back to defaults:", err);
    return { success: true, data: DEFAULT_COURSE_CATEGORIES };
  }
}

export async function createCategoriaCurso(input: {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  color: string;
}): Promise<{
  success?: boolean;
  data?: CourseCategoryItem;
  error?: string;
}> {
  try {
    const codigo = input.codigo.trim().toUpperCase();
    const nombre = input.nombre.trim();
    const descripcion = input.descripcion?.trim() || null;
    const color = input.color?.trim() || "sky";

    if (!codigo) {
      return { error: "El código de categoría es requerido (ej: FG, TI, TP, CO)" };
    }
    if (codigo.length > 10) {
      return { error: "El código no debe exceder 10 caracteres" };
    }
    if (!nombre) {
      return { error: "El nombre de la categoría es requerido" };
    }

    const supabase = await createClient();

    // Check duplicate code
    const { data: existing } = await supabase
      .from("capacitacion_categorias_cursos")
      .select("id, codigo")
      .ilike("codigo", codigo)
      .maybeSingle();

    if (existing) {
      return {
        error: `Ya existe una categoría con el código "${codigo}". Puedes editarla o activarla.`,
      };
    }

    const { data, error } = await supabase
      .from("capacitacion_categorias_cursos")
      .insert({
        codigo,
        nombre,
        descripcion,
        color,
        is_active: true,
        orden: 99,
      })
      .select("*")
      .single();

    if (error) {
      if (
        error.code === "42P01" ||
        error.message?.includes("does not exist") ||
        error.message?.includes("schema cache")
      ) {
        return {
          error:
            "La tabla de categorías aún no ha sido creada en la base de datos. Por favor aplica la migración correspondiente en Supabase.",
        };
      }
      return { error: `Error al crear categoría: ${error.message}` };
    }

    revalidatePath("/dashboard/capacitacion/gestion-cursos");
    return { success: true, data };
  } catch (err) {
    return {
      error: `Error interno: ${err instanceof Error ? err.message : "Desconocido"}`,
    };
  }
}

export async function updateCategoriaCurso(
  id: number,
  input: {
    nombre: string;
    descripcion?: string | null;
    color: string;
    is_active?: boolean;
  },
): Promise<{
  success?: boolean;
  data?: CourseCategoryItem;
  error?: string;
}> {
  try {
    const nombre = input.nombre.trim();
    const descripcion = input.descripcion?.trim() || null;
    const color = input.color?.trim() || "sky";
    const is_active = input.is_active !== undefined ? input.is_active : true;

    if (!nombre) {
      return { error: "El nombre de la categoría es requerido" };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("capacitacion_categorias_cursos")
      .update({
        nombre,
        descripcion,
        color,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return { error: `Error al actualizar categoría: ${error.message}` };
    }

    revalidatePath("/dashboard/capacitacion/gestion-cursos");
    return { success: true, data };
  } catch (err) {
    return {
      error: `Error interno: ${err instanceof Error ? err.message : "Desconocido"}`,
    };
  }
}

export async function deleteCategoriaCurso(
  id: number,
  codigo: string,
): Promise<{
  success?: boolean;
  deactivatedOnly?: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Check if any course is using this category code
    const { count, error: countErr } = await supabase
      .from("catalogo_servicios")
      .select("id", { count: "exact", head: true })
      .eq("categoria", codigo);

    if (!countErr && count && count > 0) {
      // Soft-delete (deactivate) so courses don't become orphaned
      const { error: deactErr } = await supabase
        .from("capacitacion_categorias_cursos")
        .update({ is_active: false })
        .eq("id", id);

      if (deactErr) {
        return { error: `Error al desactivar categoría: ${deactErr.message}` };
      }

      revalidatePath("/dashboard/capacitacion/gestion-cursos");
      return {
        success: true,
        deactivatedOnly: true,
      };
    }

    // Otherwise, delete completely
    const { error: delErr } = await supabase
      .from("capacitacion_categorias_cursos")
      .delete()
      .eq("id", id);

    if (delErr) {
      return { error: `Error al eliminar categoría: ${delErr.message}` };
    }

    revalidatePath("/dashboard/capacitacion/gestion-cursos");
    return { success: true };
  } catch (err) {
    return {
      error: `Error interno: ${err instanceof Error ? err.message : "Desconocido"}`,
    };
  }
}
