"use server";

import { createClient } from "@/utils/supabase/server";
import { toTitleCase } from "@/utils/string-utils";

// Type for certificate generation (minimal facilitator data)
export interface CertificateFacilitator {
  id: number;
  name: string;
  nombre_apellido: string;
  facilitator?: string;
  cargo?: string;
  firma?: string;
  firma_id?: number;
  sha_signature_id?: number;
  signature_data?: {
    id: number;
    representante_sha: string;
    firma: string;
    url_imagen?: string; // Legacy field, kept for backward compatibility
    imagen_base64?: string; // New field for base64 storage
  };
}

// Full Facilitador type from the types file
import { Facilitador } from "@/types";

// Get all facilitators
export async function getFacilitators() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("facilitadores")
      .select("*")
      .order("fecha_creacion", { ascending: false });

    if (error) throw error;

    return { facilitadores: data || [] };
  } catch (err) {
    console.error("Error en facilitadores:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Error al cargar los facilitadores. Por favor intente nuevamente.",
      facilitadores: [],
    };
  }
}

// Get all states
export async function getStates() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("cat_estados_venezuela")
      .select(
        `
        id,
        nombre_estado,
        capital_estado
      `,
      )
      .order("nombre_estado", { ascending: true });

    if (error) throw error;

    return { states: data || [] };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Error al cargar los estados",
    };
  }
}

// Update facilitator
export async function updateFacilitator(
  id: number,
  updatedData: Partial<Facilitador>,
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("facilitadores")
      .update({
        ...updatedData,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return { facilitador: data };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Error al actualizar el facilitador",
    };
  }
}

// Delete facilitator
export async function deleteFacilitator(id: number) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("facilitadores")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Error al eliminar el facilitador",
    };
  }
}

/**
 * Get facilitator data by ID using server action
 */
export async function getFacilitatorData(
  facilitatorId: string,
): Promise<CertificateFacilitator | null> {
  try {
    // Validate input
    if (!facilitatorId) {
      return null;
    }

    const facilitatorIdNum = parseInt(facilitatorId);
    if (isNaN(facilitatorIdNum)) {
      return null;
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("facilitadores")
      .select(
        `
        id,
        nombre_apellido,
        firma_id,
        sha_signature_id,
        firmas!facilitadores_firma_id_fkey (
          id,
          nombre,
          tipo,
          url_imagen,
          imagen_base64
        )
      `,
      )
      .eq("id", facilitatorIdNum)
      .single();

    if (error) {
      return null;
    }

    if (!data) {
      return null;
    }

    // Transform the data to match the expected interface
    const facilitator: CertificateFacilitator = {
      id: data.id,
      name: toTitleCase(data.nombre_apellido || ""),
      nombre_apellido: toTitleCase(data.nombre_apellido || ""),
      facilitator: toTitleCase(data.nombre_apellido || ""),
      cargo: "Facilitador",
      firma: data.firmas?.[0]?.url_imagen,
      firma_id: data.firma_id,
      sha_signature_id: data.sha_signature_id,
      signature_data:
        data.firmas && data.firmas.length > 0
          ? {
              id: data.firmas[0].id,
              representante_sha: data.firmas[0].nombre,
              firma: data.firmas[0].url_imagen,
              url_imagen: data.firmas[0].url_imagen,
              imagen_base64: data.firmas[0].imagen_base64,
            }
          : undefined,
    };

    return facilitator;
  } catch (error) {
    return null;
  }
}

/**
 * Get certificate template by ID using server action
 */
export async function getCertificateTemplate(
  templateId: number,
): Promise<{ id: number; nombre: string; archivo: string } | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("plantillas_certificados")
      .select("id, nombre, archivo")
      .eq("id", templateId)
      .single();

    if (error) {
      console.error("Error fetching template:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getCertificateTemplate:", error);
    return null;
  }
}
