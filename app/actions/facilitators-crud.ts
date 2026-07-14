"use server";

import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import { revalidatePath } from "next/cache";
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

    // Optimize and convert signature to base64
    const { imagen_base64 } = await saveOptimizedSignature(signatureFile, type);

    // Create signature record with base64
    const { data: signatureData, error: signatureError } = await supabase
      .from("firmas")
      .insert([
        {
          nombre: facilitador.nombre_apellido,
          tipo: type,
          url_imagen: "", // Empty string for backward compatibility
          imagen_base64: imagen_base64,
          facilitador_id: facilitador.id, // Foreign key to facilitadores table
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
      .select("*, datos_bancarios(*)")
      .eq("id", id)
      .single();

    if (error) {
      return { error: error.message, data: null };
    }

    // Flatten data to include bank info in the main object if it exists
    const facilitator = { ...data };
    if (data.datos_bancarios && data.datos_bancarios.length > 0) {
      const bankInfo = data.datos_bancarios.find((b: any) => b.es_principal) || data.datos_bancarios[0];
      facilitator.banco = bankInfo.banco;
      facilitator.nro_cuenta = bankInfo.nro_cuenta;
      facilitator.tipo_cuenta = bankInfo.tipo_cuenta;
      facilitator.telefono_pago_movil = bankInfo.telefono_pago_movil;
      facilitator.cedula_titular = bankInfo.cedula_titular;
    }

    return { data: facilitator, error: null };
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

    // Convert empty strings to null for all optional fields to avoid unique constraint issues
    const fecha_ingreso_to_save = fecha_ingreso || null;
    const cedula_to_save = cedula || null;
    const email_to_save = email || null;
    const telefono_to_save = telefono || null;
    const direccion_to_save = direccion || null;
    const nivel_educacion_to_save = nivel_educacion || null;
    const alcance_to_save = alcance || null;
    const notas_observaciones_to_save = notas_observaciones || null;

    const { data, error } = await supabase
      .from("facilitadores")
      .insert([
        {
          fuente,
          fecha_ingreso: fecha_ingreso_to_save,
          nombre_apellido: toLowerCase(nombre_apellido),
          cedula: cedula_to_save,
          rif: rif || null,
          email: email_to_save,
          telefono: telefono_to_save,
          direccion: direccion_to_save,
          nivel_educacion: nivel_educacion_to_save,
          formacion_docente_certificada,
          alcance: alcance_to_save,
          notas_observaciones: notas_observaciones_to_save,
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

    // Handle bank details if provided
    const banco = formData.get("banco") as string;
    const nro_cuenta = formData.get("nro_cuenta") as string;
    const tipo_cuenta = formData.get("tipo_cuenta") as string;
    const telefono_pago_movil = formData.get("telefono_pago_movil") as string;
    const cedula_titular = formData.get("cedula_titular") as string;

    if (banco || nro_cuenta || telefono_pago_movil) {
      const { error: bankError } = await supabase
        .from("datos_bancarios")
        .insert([
          {
            id_facilitador: facilitador.id,
            banco: banco || "Sin especificar",
            nro_cuenta: nro_cuenta || "00000000000000000000",
            tipo_cuenta: tipo_cuenta || null,
            telefono_pago_movil: telefono_pago_movil || null,
            cedula_titular: cedula_titular || null,
            es_principal: true,
          },
        ]);

      if (bankError) {
        console.error("Error saving bank details:", bankError);
        // We don't return error here because the facilitator was already created
      }
    }

    // Handle signature if provided
    const signatureFile = formData.get("signature") as File | null;
    if (signatureFile && signatureFile.size > 0) {
      await handleFacilitatorSignature(supabase, facilitador, signatureFile);
    }

    revalidatePath("/dashboard/capacitacion");
    revalidatePath("/dashboard/capacitacion/gestion-de-facilitadores");

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

    // Convert empty strings to null for all optional fields to avoid unique constraint issues
    const fecha_ingreso_to_save = fecha_ingreso || null;
    const cedula_to_save = cedula || null;
    const email_to_save = email || null;
    const telefono_to_save = telefono || null;
    const direccion_to_save = direccion || null;
    const nivel_educacion_to_save = nivel_educacion || null;
    const alcance_to_save = alcance || null;
    const notas_observaciones_to_save = notas_observaciones || null;

    const dataToUpdate = {
      fuente,
      fecha_ingreso: fecha_ingreso_to_save,
      nombre_apellido: toLowerCase(nombre_apellido),
      cedula: cedula_to_save,
      rif: rif || null,
      email: email_to_save,
      telefono: telefono_to_save,
      direccion: direccion_to_save,
      nivel_educacion: nivel_educacion_to_save,
      formacion_docente_certificada,
      alcance: alcance_to_save,
      notas_observaciones: notas_observaciones_to_save,
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

    // Handle bank details if provided
    const banco = formData.get("banco") as string;
    const nro_cuenta = formData.get("nro_cuenta") as string;
    const tipo_cuenta = formData.get("tipo_cuenta") as string;
    const telefono_pago_movil = formData.get("telefono_pago_movil") as string;
    const cedula_titular = formData.get("cedula_titular") as string;

    if (banco || nro_cuenta || telefono_pago_movil) {
      // Upsert bank details: try to find existing principal bank details for this facilitator
      const { data: existingBank } = await supabase
        .from("datos_bancarios")
        .select("id")
        .eq("id_facilitador", facilitador.id)
        .eq("es_principal", true)
        .maybeSingle();

      const bankData = {
        id_facilitador: facilitador.id,
        banco: banco || "Sin especificar",
        nro_cuenta: nro_cuenta || "00000000000000000000",
        tipo_cuenta: tipo_cuenta || null,
        telefono_pago_movil: telefono_pago_movil || null,
        cedula_titular: cedula_titular || null,
        es_principal: true,
      };

      if (existingBank) {
        await supabase
          .from("datos_bancarios")
          .update(bankData)
          .eq("id", existingBank.id);
      } else {
        await supabase.from("datos_bancarios").insert([bankData]);
      }
    }

    // Handle signature if provided
    const signatureFile = formData.get("signature") as File | null;
    if (signatureFile && signatureFile.size > 0) {
      await handleFacilitatorSignature(supabase, facilitador, signatureFile);
    }

    revalidatePath("/dashboard/capacitacion");
    revalidatePath("/dashboard/capacitacion/gestion-de-facilitadores");

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

    revalidatePath("/dashboard/capacitacion");
    revalidatePath("/dashboard/capacitacion/gestion-de-facilitadores");

    return { error: null, success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      success: false,
    };
  }
});

// Get all banks from catalog
const getBanks = cache(async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("cat_bancos")
      .select("*")
      .order("nombre");

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

// Add a new bank to catalog
const addBank = async (nombre: string) => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("cat_bancos")
      .insert([{ nombre }])
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
};

// Export server actions
export async function getBanksAction() {
  return await getBanks();
}

export async function addBankAction(nombre: string) {
  return await addBank(nombre);
}

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
