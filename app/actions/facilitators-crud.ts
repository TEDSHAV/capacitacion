"use server";

import { createClient } from "@/utils/supabase/server";
import { cache } from "react";

// Get all facilitators
const getFacilitators = cache(async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("facilitadores")
      .select("*")
      .order("nombre_apellido");

    if (error) {
      return { error: error.message, data: [] };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      data: [],
    };
  }
});

// Get facilitator by ID
const getFacilitatorById = cache(async (id: string) => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("facilitadores")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data, error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      data: null,
    };
  }
});

// Create facilitator
const createFacilitator = cache(async (formData: FormData) => {
  const supabase = await createClient();

  try {
    const fuente = formData.get("fuente") as string;
    const fecha_ingreso = formData.get("fecha_ingreso") as string;
    const nombre_apellido = formData.get("nombre_apellido") as string;
    const cedula = formData.get("cedula") as string;
    const rif = formData.get("rif") as string;
    const email = formData.get("email") as string;
    const telefono = formData.get("telefono") as string;
    const direccion = formData.get("direccion") as string;
    const nivel_educacion = formData.get("nivel_educacion") as string;
    const formacion_docente_certificada =
      formData.get("formacion_docente_certificada") === "true";
    const alcance = formData.get("alcance") as string;
    const notas_observaciones = formData.get("notas_observaciones") as string;
    const id_estado_geografico = formData.get("id_estado_geografico")
      ? parseInt(formData.get("id_estado_geografico") as string)
      : null;
    const id_ciudad = formData.get("id_ciudad")
      ? parseInt(formData.get("id_ciudad") as string)
      : null;
    const temas_cursos = formData.get("temas_cursos")
      ? JSON.parse(formData.get("temas_cursos") as string)
      : [];
    const calificacion = formData.get("calificacion")
      ? parseFloat(formData.get("calificacion") as string)
      : null;
    const tiene_curriculum = formData.get("tiene_curriculum") === "true";
    const tiene_certificaciones =
      formData.get("tiene_certificaciones") === "true";
    const tiene_foto_perfil = formData.get("tiene_foto_perfil") === "true";
    const ano_ingreso = formData.get("ano_ingreso")
      ? parseInt(formData.get("ano_ingreso") as string)
      : null;

    // Convert empty strings to null for date fields
    const fecha_ingreso_to_save = fecha_ingreso || null;

    const { data, error } = await supabase
      .from("facilitadores")
      .insert([
        {
          fuente,
          fecha_ingreso: fecha_ingreso_to_save,
          nombre_apellido,
          cedula,
          rif,
          email,
          telefono,
          direccion,
          nivel_educacion,
          formacion_docente_certificada,
          alcance,
          notas_observaciones,
          id_estado_geografico,
          id_ciudad,
          temas_cursos,
          calificacion,
          tiene_curriculum,
          tiene_certificaciones,
          tiene_foto_perfil,
          ano_ingreso,
        },
      ])
      .select()
      .single();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data, error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      data: null,
    };
  }
});

// Update facilitator
const updateFacilitator = cache(async (id: string, facilitatorData: any) => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("facilitadores")
      .update(facilitatorData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data, error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      data: null,
    };
  }
});

// Delete facilitator
const deleteFacilitator = cache(async (id: string) => {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("facilitadores")
      .delete()
      .eq("id", id);

    if (error) {
      return { error: error.message, success: false };
    }

    return { error: null, success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      success: false,
    };
  }
});

// Export server actions
export async function getFacilitatorsAction() {
  return await getFacilitators();
}

export async function getFacilitatorByIdAction(id: string) {
  return await getFacilitatorById(id);
}

export async function createFacilitatorAction(formData: FormData) {
  return await createFacilitator(formData);
}

export async function updateFacilitatorAction(
  id: string,
  facilitatorData: any,
) {
  return await updateFacilitator(id, facilitatorData);
}

export async function deleteFacilitatorAction(id: string) {
  return await deleteFacilitator(id);
}
