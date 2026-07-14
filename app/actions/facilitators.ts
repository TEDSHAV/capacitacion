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

/**
 * Get aggregated ratings for facilitators based on participant surveys
 */
export async function getFacilitatorRatings() {
  try {
    const supabase = await createClient();

    // 1. Get all surveys
    const { data: surveys, error: surveyError } = await supabase
      .from("course_satisfaction_surveys")
      .select("id_osi, q1, q2, q3, q4, q5");

    if (surveyError) throw surveyError;
    if (!surveys || surveys.length === 0) return { ratings: {} };

    // 2. Get OSI to Facilitator mapping from both control_servicios_ejecutados and certificados
    const [mappingRes, certsRes] = await Promise.all([
      supabase
        .from("control_servicios_ejecutados")
        .select("id_osi, cod_facilitador")
        .not("id_osi", "is", null)
        .not("cod_facilitador", "is", null),
      supabase
        .from("certificados")
        .select("id_facilitador, nro_osi, snapshot_contenido")
        .not("id_facilitador", "is", null)
    ]);

    const { data: mapping, error: mappingError } = mappingRes;
    const { data: certMapping, error: certError } = certsRes;

    if (mappingError) console.error("[getFacilitatorRatings] Mapping error:", mappingError);
    if (certError) console.error("[getFacilitatorRatings] Cert mapping error:", certError);

    // Create a lookup map: OSI ID -> Facilitator ID
    const osiToFacilitator = new Map<number, number>();

    // Step 1: Map from control_servicios_ejecutados (Most direct)
    mapping?.forEach((m) => {
      if (m.id_osi && m.cod_facilitador) {
        osiToFacilitator.set(m.id_osi, m.cod_facilitador);
      }
    });

    // Step 2: Map from certificados (Fallback/Additional)
    if (certMapping) {
      // We also need a way to link nro_osi to id_osi if we only have nro_osi
      const { data: osis } = await supabase
        .from("v_osi_formato_completo")
        .select("id_osi, nro_osi");
      
      const nroOsiToIdOsi = new Map<number, number>();
      osis?.forEach(o => {
        if (o.nro_osi) {
          const numericPart = parseInt(o.nro_osi.replace(/[^\d]/g, ""));
          if (!isNaN(numericPart)) {
            nroOsiToIdOsi.set(numericPart, o.id_osi);
          }
        }
      });

      certMapping.forEach(cert => {
        let osiId = null;

        // Try getting it from numeric nro_osi column if it matches
        if (cert.nro_osi) {
          osiId = nroOsiToIdOsi.get(cert.nro_osi);
        }

        // Try getting it from snapshot_contenido if nro_osi failed
        if (!osiId && cert.snapshot_contenido) {
          try {
            const snapshot = typeof cert.snapshot_contenido === 'string' 
              ? JSON.parse(cert.snapshot_contenido) 
              : cert.snapshot_contenido;
            osiId = snapshot?.osi?.id || snapshot?.id_osi;
          } catch (e) {}
        }

        if (osiId && cert.id_facilitador) {
          osiToFacilitator.set(osiId, cert.id_facilitador);
        }
      });
    }

    // 3. Aggregate scores per facilitator
    const facilitatorStats = new Map<
      number,
      { totalScore: number; count: number }
    >();

    surveys.forEach((survey) => {
      const facilitatorId = osiToFacilitator.get(survey.id_osi);
      if (facilitatorId) {
        // Average of Q1 to Q5 for this specific survey response
        const surveyAvg = (survey.q1 + survey.q2 + survey.q3 + survey.q4 + survey.q5) / 5;

        if (!facilitatorStats.has(facilitatorId)) {
          facilitatorStats.set(facilitatorId, { totalScore: 0, count: 0 });
        }

        const stats = facilitatorStats.get(facilitatorId)!;
        stats.totalScore += surveyAvg;
        stats.count += 1;
      }
    });

    // 4. Calculate final average per facilitator
    const ratings: Record<number, number> = {};
    facilitatorStats.forEach((stats, facilitatorId) => {
      ratings[facilitatorId] = parseFloat((stats.totalScore / stats.count).toFixed(1));
    });

    return { ratings };
  } catch (err) {
    console.error("Error calculating facilitator ratings:", err);
    return { error: "Failed to load ratings", ratings: {} };
  }
}
