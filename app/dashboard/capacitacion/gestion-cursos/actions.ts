"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Helper function to format error messages
function formatSupabaseError(error: any): string {
  if (error?.message) {
    return error.message;
  }
  return "Error desconocido de la base de datos";
}

// Helper: check for an existing Capacitacion course (tipo_servicio=1) with the
// same uppercased trimmed name. Returns the existing row (any esta_activo) or
// null. Used to block duplicate course creation.
async function findDuplicateCurso(
  supabase: Awaited<ReturnType<typeof createClient>>,
  nombre: string,
  excludeId?: string | number | null,
): Promise<{ id: number; nombre: string; esta_activo: boolean } | null> {
  const normalized = nombre.trim().toUpperCase();
  if (!normalized) return null;

  let query = supabase
    .from("catalogo_servicios")
    .select("id, nombre, esta_activo")
    .eq("id_departamento_ejecutante", 3)
    .eq("tipo_servicio", 1)
    .ilike("nombre", normalized);

  if (excludeId !== undefined && excludeId !== null) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data as { id: number; nombre: string; esta_activo: boolean };
}

export async function createCurso(formData: FormData) {
  try {
    // Get form data with proper type checking
    const titulo = formData.get("titulo") as string;
    // const cliente_asociado = formData.get('cliente_asociado') as string; // Removed - column doesn't exist
    const subtitulo = formData.get("subtitulo") as string;
    const contenido = formData.get("contenido") as string;
    const horas_estimadas = formData.get("horas_estimadas") as string;
    const nota_aprobatoria = formData.get("nota_aprobatoria") as string;
    const emite_carnet = formData.get("emite_carnet") as string;
    const para_quien = formData.get("para_quien") as string;
    const modalidad = formData.get("modalidad") as string;
    const objetivo_general = formData.get("objetivo_general") as string;
    const objetivo_especifico = formData.get("objetivo_especifico") as string;
    const categoria = (formData.get("categoria") as string)?.trim().toUpperCase() || null;

    // Validate required fields
    if (!titulo?.trim()) {
      return { error: "El título es requerido" };
    }

    if (!contenido?.trim()) {
      return { error: "El contenido es requerido" };
    }

    // Create the course in catalogo_servicios table
    const supabase = await createClient();

    // Duplicate-name guard: block creation if another Capacitacion course
    // (active or inactive) already has the same uppercased trimmed name.
    const existing = await findDuplicateCurso(supabase, titulo);
    if (existing) {
      return {
        error: `Ya existe un curso con el nombre "${existing.nombre}" (ID: ${existing.id}). Considera editarlo en su lugar o verifica si es una variante.`,
        existingId: existing.id,
      };
    }

    console.log("Creating course:", {
      titulo,
      subtitulo,
      contenido,
      horas_estimadas,
      nota_aprobatoria,
      emite_carnet,
      para_quien,
      modalidad,
      objetivo_general,
      objetivo_especifico,
      categoria,
    });

    const coursePayload: Record<string, unknown> = {
      nombre: titulo.trim().toUpperCase(),
      subtitulo: subtitulo?.trim() ? subtitulo.trim().toUpperCase() : null,
      contenido_curso: contenido.trim(),
      carga_horaria_std: horas_estimadas ? parseInt(horas_estimadas) : null,
      created_at: new Date().toISOString().split("T")[0], // Format as YYYY-MM-DD
      esta_activo: true,
      nota_aprobatoria: nota_aprobatoria ? parseInt(nota_aprobatoria) : 14,
      emite_carnet: emite_carnet === "true", // Convert string to boolean
      para_quien: para_quien?.trim() ? para_quien.trim() : null,
      modalidad: modalidad || "Presencial",
      objetivo_general: objetivo_general?.trim()
        ? objetivo_general.trim()
        : null,
      objetivo_especifico: objetivo_especifico?.trim()
        ? objetivo_especifico.trim()
        : null,
      id_departamento_ejecutante: 3, // Capacitacion department
      tipo_servicio: 1,
    };

    if (categoria) {
      coursePayload.categoria = categoria;
    }

    let { data, error } = await supabase
      .from("catalogo_servicios")
      .insert(coursePayload)
      .select("*")
      .single();

    // Fallback if column 'categoria' does not exist yet in DB schema
    if (error && error.code === "42703" && coursePayload.categoria) {
      console.warn("Column 'categoria' not found in catalogo_servicios, retrying insert without it");
      delete coursePayload.categoria;
      const retry = await supabase
        .from("catalogo_servicios")
        .insert(coursePayload)
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("Supabase error creating course:", error);
      return {
        error: `Error al crear el curso: ${formatSupabaseError(error)}`,
      };
    }

    console.log("Course created successfully:", data);

    revalidatePath("/dashboard/capacitacion/gestion-cursos");

    return { success: true, data };
  } catch (err) {
    return {
      error: `Error al crear el curso: ${err instanceof Error ? err.message : "Error desconocido"}`,
    };
  }
}

export async function updateCurso(id: string, formData: FormData) {
  try {
    const supabase = await createClient();

    const titulo = formData.get("titulo") as string;
    const subtitulo = formData.get("subtitulo") as string;
    const contenido = formData.get("contenido") as string;
    const horas_estimadas = formData.get("horas_estimadas") as string;
    const nota_aprobatoria = formData.get("nota_aprobatoria") as string;
    const emite_carnet = formData.get("emite_carnet") as string;
    const para_quien = formData.get("para_quien") as string;
    const modalidad = formData.get("modalidad") as string;
    const objetivo_general = formData.get("objetivo_general") as string;
    const objetivo_especifico = formData.get("objetivo_especifico") as string;
    const categoria = (formData.get("categoria") as string)?.trim().toUpperCase() || null;

    console.log(`Updating course ${id}:`, {
      titulo,
      subtitulo,
      contenido,
      horas_estimadas,
      nota_aprobatoria,
      emite_carnet,
      para_quien,
      modalidad,
      objetivo_general,
      objetivo_especifico,
      categoria,
    });

    // Validate required fields
    if (!titulo?.trim()) {
      return { error: "El título es requerido" };
    }

    if (!contenido?.trim()) {
      return { error: "El contenido es requerido" };
    }

    // Duplicate-name guard: block rename if another Capacitacion course
    // (active or inactive) already has the same uppercased trimmed name.
    const existing = await findDuplicateCurso(supabase, titulo, id);
    if (existing) {
      return {
        error: `Ya existe un curso con el nombre "${existing.nombre}" (ID: ${existing.id}). Considera editarlo en su lugar o verifica si es una variante.`,
        existingId: existing.id,
      };
    }

    const updatePayload: Record<string, unknown> = {
      nombre: titulo.trim().toUpperCase(),
      subtitulo: subtitulo?.trim() ? subtitulo.trim().toUpperCase() : null,
      contenido_curso: contenido.trim(),
      carga_horaria_std: horas_estimadas ? parseInt(horas_estimadas) : null,
      nota_aprobatoria: nota_aprobatoria ? parseInt(nota_aprobatoria) : 14,
      emite_carnet: emite_carnet === "true", // Convert string to boolean
      para_quien: para_quien?.trim() ? para_quien.trim() : null,
      modalidad: modalidad || "Presencial",
      objetivo_general: objetivo_general?.trim()
        ? objetivo_general.trim()
        : null,
      objetivo_especifico: objetivo_especifico?.trim()
        ? objetivo_especifico.trim()
        : null,
      categoria: categoria,
    };

    let { data, error } = await supabase
      .from("catalogo_servicios")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    // Fallback if column 'categoria' does not exist yet in DB schema
    if (error && error.code === "42703" && "categoria" in updatePayload) {
      console.warn("Column 'categoria' not found in catalogo_servicios, retrying update without it");
      delete updatePayload.categoria;
      const retry = await supabase
        .from("catalogo_servicios")
        .update(updatePayload)
        .eq("id", id)
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("Supabase error updating course:", error);
      return {
        error: `Error al actualizar el curso: ${formatSupabaseError(error)}`,
      };
    }

    console.log("Course updated successfully:", data);

    revalidatePath("/dashboard/capacitacion/gestion-cursos");

    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error updating course:", error);
    return { error: "Error interno del servidor" };
  }
}

export async function duplicateCurso(id: string) {
  try {
    const supabase = await createClient();

    // First, get the original course from catalogo_servicios table
    const { data: originalCourse, error: fetchError } = await supabase
      .from("catalogo_servicios")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !originalCourse) {
      console.error("Error fetching original course:", fetchError);
      return { error: "No se encontró el curso original" };
    }

    console.log("Original course:", originalCourse);

    const duplicatePayload: Record<string, unknown> = {
      nombre: `${originalCourse.nombre} (COPIA)`.toUpperCase(),
      subtitulo: originalCourse.subtitulo || null,
      contenido_curso: originalCourse.contenido_curso,
      carga_horaria_std: originalCourse.carga_horaria_std,
      created_at: new Date().toISOString().split("T")[0], // Format as YYYY-MM-DD
      esta_activo: true,
      nota_aprobatoria: originalCourse.nota_aprobatoria || 14,
      emite_carnet: originalCourse.emite_carnet || false,
      para_quien: originalCourse.para_quien || null,
      modalidad: originalCourse.modalidad || "Presencial",
      objetivo_general: originalCourse.objetivo_general || null,
      objetivo_especifico: originalCourse.objetivo_especifico || null,
      id_departamento_ejecutante: 3, // Capacitacion department
      tipo_servicio: 1,
    };

    if (originalCourse.categoria) {
      duplicatePayload.categoria = originalCourse.categoria;
    }

    let { data, error } = await supabase
      .from("catalogo_servicios")
      .insert(duplicatePayload)
      .select("*")
      .single();

    if (error && error.code === "42703" && duplicatePayload.categoria) {
      delete duplicatePayload.categoria;
      const retry = await supabase
        .from("catalogo_servicios")
        .insert(duplicatePayload)
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("Error duplicating course:", error);
      return {
        error: `Error al duplicar el curso: ${formatSupabaseError(error)}`,
      };
    }

    console.log("Duplicated course:", data);

    // Revalidate the cursos page to refresh the cache
    revalidatePath("/dashboard/capacitacion/gestion-cursos");

    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error in duplicateCurso:", error);
    return { error: "Error interno del servidor" };
  }
}

export async function deleteCurso(id: string) {
  try {
    const supabase = await createClient();

    // Soft delete: set esta_activo to false
    const { error } = await supabase
      .from("catalogo_servicios")
      .update({ esta_activo: false })
      .eq("id", id);

    if (error) {
      return {
        error: `Error al eliminar el curso: ${formatSupabaseError(error)}`,
      };
    }

    revalidatePath("/dashboard/capacitacion/gestion-cursos");

    return { success: true };
  } catch (error) {
    return { error: "Error interno del servidor" };
  }
}

export async function getCursos() {
  try {
    const supabase = await createClient();

    // Get all active services from catalogo_servicios where id_departamento_ejecutante = 3 (capacitacion)
    const { data, error } = await supabase
      .from("catalogo_servicios")
      .select("*")
      .eq("esta_activo", true)
      .eq("id_departamento_ejecutante", 3)
      .eq("tipo_servicio", 1)
      .order("id", { ascending: false });

    if (error) {
      return {
        error: `Error al obtener los cursos: ${error.message || "Error desconocido"}`,
      };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { error: "Error interno del servidor" };
  }
}
