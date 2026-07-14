"use server";

import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import { toLowerCase } from "@/utils/string-utils";
import { saveOptimizedSignature } from "@/lib/image-optimization.server";

// Helper to handle signature upload and linking
async function handleFacilitatorSignature(
  supabase: any,
  facilitador: any,
  signatureFile: File,
) {
  try {
    const type = "facilitador";

    // Optimize and save the signature image
    const { url: imageUrl } = await saveOptimizedSignature(signatureFile, type);

    // Create signature record
    const { data: signatureData, error: signatureError } = await supabase
      .from("firmas")
      .insert([
        {
          nombre: facilitador.nombre_apellido,
          tipo: type,
          url_imagen: imageUrl,
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString(),
          is_active: true,
        },
      ])
      .select()
      .single();

    if (signatureError) {
      console.error("Error creating signature record:", signatureError);
      return { error: signatureError.message };
    }

    // Link signature to facilitator
    const { error: updateError } = await supabase
      .from("facilitadores")
      .update({
        firma_id: signatureData.id,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq("id", facilitador.id);

    if (updateError) {
      console.error("Error linking signature to facilitator:", updateError);
      return { error: updateError.message };
    }

    return { data: signatureData, error: null };
  } catch (uploadError) {
    console.error("Error uploading facilitator signature:", uploadError);
    return {
      error:
        uploadError instanceof Error ? uploadError.message : "Upload error",
    };
  }
}

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
          nombre_apellido: toLowerCase(nombre_apellido),
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

    const facilitador = data;

    // Handle signature if provided
    const signatureFile = formData.get("signature") as File | null;
    if (signatureFile && signatureFile.size > 0) {
      await handleFacilitatorSignature(supabase, facilitador, signatureFile);
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
const updateFacilitator = cache(async (id: string, formData: FormData) => {
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

    const dataToUpdate = {
      fuente,
      fecha_ingreso: fecha_ingreso || null,
      nombre_apellido: toLowerCase(nombre_apellido),
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
      fecha_actualizacion: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("facilitadores")
      .update(dataToUpdate)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { error: error.message, data: null };
    }

    const facilitador = data;

    // Handle signature if provided
    const signatureFile = formData.get("signature") as File | null;
    if (signatureFile && signatureFile.size > 0) {
      await handleFacilitatorSignature(supabase, facilitador, signatureFile);
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

export async function updateFacilitatorAction(id: string, formData: FormData) {
  return await updateFacilitator(id, formData);
}

export async function deleteFacilitatorAction(id: string) {
  return await deleteFacilitator(id);
}
