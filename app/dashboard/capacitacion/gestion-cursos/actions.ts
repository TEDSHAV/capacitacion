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

    // Validate required fields
    if (!titulo?.trim()) {
      return { error: "El título es requerido" };
    }

    if (!contenido?.trim()) {
      return { error: "El contenido es requerido" };
    }

    // Create the course in catalogo_servicios table
    const supabase = await createClient();

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
    });

    const { data, error } = await supabase
      .from("catalogo_servicios")
      .insert({
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
      })
      .select("*")
      .single();

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
    });

    // Validate required fields
    if (!titulo?.trim()) {
      return { error: "El título es requerido" };
    }

    if (!contenido?.trim()) {
      return { error: "El contenido es requerido" };
    }

    // Update the course in catalogo_servicios table
    const { data, error } = await supabase
      .from("catalogo_servicios")
      .update({
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
      })
      .eq("id", id)
      .select("*")
      .single();

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

    // Create a duplicate in catalogo_servicios table
    const { data, error } = await supabase
      .from("catalogo_servicios")
      .insert({
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
      })
      .select("*")
      .single();

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
