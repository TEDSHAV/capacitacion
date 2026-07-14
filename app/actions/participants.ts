"use server";

import { createClient } from "@/utils/supabase/server";
import { ParticipanteCertificado, ParticipantFormData } from "@/types";

export async function getParticipantsPaginated(
  page: number = 1,
  limit: number = 20,
  search: string = "",
): Promise<{
  participants: ParticipanteCertificado[] | null;
  total: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const offset = (page - 1) * limit;

    let query = supabase
      .from("participantes_certificados")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("nombre", { ascending: true });

    if (search.trim()) {
      query = query.or(`nombre.ilike.%${search}%,cedula.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1,
    );

    if (error) throw error;

    return { participants: data || [], total: count || 0 };
  } catch (error) {
    console.error("Error en participantes:", error);
    return {
      participants: null,
      total: 0,
      error:
        error instanceof Error
          ? error.message
          : "Error al cargar los participantes.",
    };
  }
}

export async function getParticipants(): Promise<{
  participants: ParticipanteCertificado[] | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: participants, error } = await supabase
      .from("participantes_certificados")
      .select("*")
      .eq("is_active", true)
      .order("nombre", { ascending: true });

    if (error) {
      throw error;
    }

    return { participants: participants || [] };
  } catch (error) {
    console.error("Error en participantes:", error);
    return {
      participants: null,
      error:
        error instanceof Error
          ? error.message
          : "Error al cargar los participantes. Por favor intente nuevamente.",
    };
  }
}

export async function getRecentParticipants(): Promise<
  ParticipanteCertificado[] | null
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("participantes_certificados")
      .select("*")
      .eq("is_active", true)
      .order("id", { ascending: false })
      .limit(5);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error en participantes recientes:", error);
    return null;
  }
}

export async function createParticipant(
  formData: ParticipantFormData,
): Promise<{
  success: boolean;
  error?: string;
  data?: ParticipanteCertificado;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("participantes_certificados")
      .insert([
        {
          nombre: formData.nombre.trim(),
          cedula: formData.cedula.trim(),
          nacionalidad: formData.nacionalidad,
          is_active: true, // Ensure new participants are active
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al crear el participante",
    };
  }
}

export async function updateParticipant(
  id: number,
  formData: ParticipantFormData,
): Promise<{
  success: boolean;
  error?: string;
  data?: ParticipanteCertificado;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("participantes_certificados")
      .update({
        nombre: formData.nombre.trim(),
        cedula: formData.cedula.trim(),
        nacionalidad: formData.nacionalidad,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al actualizar el participante",
    };
  }
}

export async function deleteParticipant(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Soft delete: set is_active to false instead of deleting the record
    const { error } = await supabase
      .from("participantes_certificados")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al eliminar el participante",
    };
  }
}

export async function getAnalyticsMetrics(): Promise<any> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("analytics_metrics")
      .select("*")
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error fetching analytics metrics:", error);
    return null;
  }
}

export async function getParticipantStats(): Promise<{
  totalParticipants: number;
  activeCertificates: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Using a simple count request is fast.
    const { count: totalParticipants, error: pError } = await supabase
      .from("participantes_certificados")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    const { count: activeCertificates, error: cError } = await supabase
      .from("certificados")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (pError || cError) throw pError || cError;

    return {
      totalParticipants: totalParticipants || 0,
      activeCertificates: activeCertificates || 0,
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return {
      totalParticipants: 0,
      activeCertificates: 0,
      error: "Error al cargar métricas",
    };
  }
}
