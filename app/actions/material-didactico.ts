"use server";

import { createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import {
  storage,
  STORAGE_BUCKET,
  MATERIAL_DIDACTICO_PREFIX,
  getPresignedDownloadUrl,
} from "@/lib/b2-storage-client";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import {
  optimizePPTXBuffer,
  formatBytes,
} from "@/lib/pptx-optimizer.server";
import type {
  MaterialDidactico,
  MaterialKitInfo,
  TipoMaterial,
  MaterialSugerencia,
  EstadoSugerencia,
} from "@/types/material-didactico";
import { isMaterialesEnabled } from "@/lib/materiales-flags";

/**
 * Fetch all materials registered for a course (catalogo_servicios.id)
 */
export async function getMaterialesByCurso(
  cursoId: number,
  options: { includeHistorical?: boolean } = {},
): Promise<{ data: MaterialDidactico[]; error: string | null }> {
  if (!isMaterialesEnabled()) {
    return { data: [], error: null };
  }
  try {
    const supabase = await createAdminClient();
    let query = supabase
      .from("capacitacion_material_didactico")
      .select("*")
      .eq("id_curso", cursoId)
      .is("id_osi", null);

    if (!options.includeHistorical) {
      query = query.eq("is_latest", true);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("[getMaterialesByCurso] error:", error);
      return { data: [], error: error.message };
    }

    // Add presigned download URLs & suggestion counts
    const items = await Promise.all(
      (data || []).map(async (item: any) => {
        try {
          const download_url = await getPresignedDownloadUrl(
            item.b2_key,
            86400, // 24 hours
            item.archivo_nombre,
          );

          // Count pending suggestions
          const { count } = await supabase
            .from("capacitacion_material_sugerencias")
            .select("id", { count: "exact", head: true })
            .eq("id_material", item.id);

          return {
            ...item,
            visible_facilitador: item.visible_facilitador !== false,
            is_latest: item.is_latest !== false,
            download_url,
            sugerencias_count: count || 0,
          };
        } catch {
          return {
            ...item,
            visible_facilitador: item.visible_facilitador !== false,
            is_latest: item.is_latest !== false,
          };
        }
      }),
    );

    return { data: items, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || "Error al obtener materiales" };
  }
}

/**
 * Fetch the complete "Kit de Ejecución" for an OSI.
 * Resolves course-level master materials and any OSI-specific overrides.
 * Strictly respects `visible_facilitador = true` and `is_latest = true`.
 */
export async function getMaterialKitForOSI(
  osiId: number,
): Promise<{ data: MaterialKitInfo | null; error: string | null }> {
  if (!isMaterialesEnabled()) {
    return { data: null, error: null };
  }
  try {
    const supabase = await createAdminClient();

    // 1. Fetch OSI details to find course id and company name
    const { data: osi, error: osiError } = await supabase
      .from("v_osi_formato_completo")
      .select("id_osi, nro_osi, id_servicio, servicio, nombre_empresa")
      .eq("id_osi", osiId)
      .maybeSingle();

    if (osiError || !osi) {
      return { data: null, error: osiError?.message || "OSI no encontrada" };
    }

    let cursoId = osi.id_servicio;
    // Fallback: If id_servicio is missing or null, lookup course by name in catalogo_servicios
    if (!cursoId && osi.servicio) {
      const { data: matchedCourse } = await supabase
        .from("catalogo_servicios")
        .select("id")
        .ilike("nombre", osi.servicio.trim())
        .limit(1)
        .maybeSingle();
      if (matchedCourse) {
        cursoId = matchedCourse.id;
      }
    }

    // 2. Fetch both course materials and OSI-specific materials (only active & visible to facilitators)
    const query = supabase
      .from("capacitacion_material_didactico")
      .select("*")
      .or(`id_osi.eq.${osiId}${cursoId ? `,id_curso.eq.${cursoId}` : ""}`)
      .eq("visible_facilitador", true)
      .eq("is_latest", true)
      .order("created_at", { ascending: false });

    const { data: rawMaterials, error: matError } = await query;
    if (matError) {
      return { data: null, error: matError.message };
    }

    // OSI-specific materials take precedence over course-level materials of the same type
    const materialsByType = new Map<string, any>();
    for (const m of rawMaterials || []) {
      const existing = materialsByType.get(m.tipo_material);
      if (!existing) {
        materialsByType.set(m.tipo_material, m);
      } else if (m.id_osi === osiId && existing.id_osi !== osiId) {
        // OSI-specific override wins
        materialsByType.set(m.tipo_material, m);
      }
    }

    const allMaterials = Array.from(materialsByType.values());

    // Generate fresh presigned download URLs for all materials
    const enrichedMaterials: MaterialDidactico[] = await Promise.all(
      allMaterials.map(async (item) => {
        try {
          const download_url = await getPresignedDownloadUrl(
            item.b2_key,
            86400 * 3, // 3 days for facilitator session
            item.archivo_nombre,
          );
          return { ...item, download_url, curso_nombre: osi.servicio };
        } catch {
          return { ...item, curso_nombre: osi.servicio };
        }
      }),
    );

    const kit: MaterialKitInfo = {
      cursoId: cursoId ?? null,
      cursoNombre: osi.servicio || "Curso no especificado",
      osiId: osi.id_osi,
      osiNumber: String(osi.nro_osi),
      empresaNombre: osi.nombre_empresa || "Cliente",
      materiales: enrichedMaterials,
      presentacionPptx: enrichedMaterials.find(
        (m) => m.tipo_material === "presentacion_pptx",
      ),
      presentacionPdf: enrichedMaterials.find(
        (m) => m.tipo_material === "presentacion_pdf",
      ),
      materialesImprimibles: enrichedMaterials.filter((m) =>
        [
          "material_imprimible",
          "guia_participante",
          "guia_facilitador",
        ].includes(m.tipo_material),
      ),
      evaluaciones: enrichedMaterials.filter(
        (m) => m.tipo_material === "evaluacion",
      ),
      otros: enrichedMaterials.filter((m) => m.tipo_material === "otro"),
    };

    return { data: kit, error: null };
  } catch (err: any) {
    console.error("[getMaterialKitForOSI] exception:", err);
    return { data: null, error: err.message || "Error al obtener kit de recursos" };
  }
}

/**
 * Toggle facilitator visibility for a specific material.
 */
export async function toggleMaterialVisibility(
  materialId: string,
  visible: boolean,
): Promise<{ success: boolean; error?: string }> {
  if (!isMaterialesEnabled()) {
    return { success: false, error: "Función no disponible en producción" };
  }
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("capacitacion_material_didactico")
      .update({
        visible_facilitador: visible,
        updated_at: new Date().toISOString(),
      })
      .eq("id", materialId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/capacitacion/gestion-cursos");
    revalidatePath("/portal/facilitador/dashboard");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al actualizar visibilidad" };
  }
}

/**
 * Fetch all versions in a material's history.
 */
export async function getMaterialVersionHistory(
  materialId: string,
): Promise<{ data: MaterialDidactico[]; error?: string }> {
  if (!isMaterialesEnabled()) {
    return { data: [], error: "Función no disponible en producción" };
  }
  try {
    const supabase = await createAdminClient();

    // 1. Fetch current item to find parent or check if it's the root
    const { data: item } = await supabase
      .from("capacitacion_material_didactico")
      .select("*")
      .eq("id", materialId)
      .single();

    if (!item) {
      return { data: [], error: "Material no encontrado" };
    }

    const rootId = item.parent_material_id || item.id;

    // Fetch all versions linked to this root
    const { data: versions, error } = await supabase
      .from("capacitacion_material_didactico")
      .select("*")
      .or(`id.eq.${rootId},parent_material_id.eq.${rootId}`)
      .order("version", { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    const enriched = await Promise.all(
      (versions || []).map(async (v: any) => {
        try {
          const download_url = await getPresignedDownloadUrl(
            v.b2_key,
            86400,
            v.archivo_nombre,
          );
          return { ...v, download_url };
        } catch {
          return v;
        }
      }),
    );

    return { data: enriched };
  } catch (err: any) {
    return { data: [], error: err.message || "Error al obtener historial de versiones" };
  }
}

/**
 * Facilitator Suggestion / Feedback System
 */
export async function submitMaterialSugerencia(payload: {
  id_material: string;
  id_curso?: number | null;
  id_osi?: number | null;
  facilitador_id?: number | null;
  facilitador_nombre: string;
  diapositiva_nro?: number | null;
  tipo_sugerencia?: string;
  comentario: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!isMaterialesEnabled()) {
    return { success: false, error: "Función no disponible en producción" };
  }
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("capacitacion_material_sugerencias").insert({
      id_material: payload.id_material,
      id_curso: payload.id_curso || null,
      id_osi: payload.id_osi || null,
      facilitador_id: payload.facilitador_id || null,
      facilitador_nombre: payload.facilitador_nombre.trim(),
      diapositiva_nro: payload.diapositiva_nro || null,
      tipo_sugerencia: payload.tipo_sugerencia || "mejora",
      comentario: payload.comentario.trim(),
      estado: "pendiente",
    });

    if (error) {
      console.error("[submitMaterialSugerencia] DB error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/capacitacion/gestion-cursos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al enviar sugerencia" };
  }
}

/**
 * Fetch suggestions received for a material or course.
 */
export async function getMaterialSugerencias(
  materialId?: string,
  cursoId?: number,
): Promise<{ data: MaterialSugerencia[]; error?: string }> {
  if (!isMaterialesEnabled()) {
    return { data: [], error: "Función no disponible en producción" };
  }
  try {
    const supabase = await createAdminClient();
    let query = supabase
      .from("capacitacion_material_sugerencias")
      .select("*, capacitacion_material_didactico(titulo, archivo_nombre)");

    if (materialId) {
      query = query.eq("id_material", materialId);
    } else if (cursoId) {
      query = query.eq("id_curso", cursoId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    const mapped = (data || []).map((s: any) => ({
      ...s,
      material_titulo: s.capacitacion_material_didactico?.titulo,
      archivo_nombre: s.capacitacion_material_didactico?.archivo_nombre,
    }));

    return { data: mapped };
  } catch (err: any) {
    return { data: [], error: err.message || "Error al obtener sugerencias" };
  }
}

/**
 * Update the review status of a facilitator suggestion.
 */
export async function updateMaterialSugerenciaEstado(
  sugerenciaId: string,
  estado: EstadoSugerencia,
): Promise<{ success: boolean; error?: string }> {
  if (!isMaterialesEnabled()) {
    return { success: false, error: "Función no disponible en producción" };
  }
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("capacitacion_material_sugerencias")
      .update({ estado, updated_at: new Date().toISOString() })
      .eq("id", sugerenciaId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/capacitacion/gestion-cursos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al actualizar estado" };
  }
}

/**
 * Delete a material from Supabase and Backblaze B2.
 */
export async function deleteMaterialDidactico(
  materialId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isMaterialesEnabled()) {
    return { success: false, error: "Función no disponible en producción" };
  }
  try {
    const supabase = await createAdminClient();

    // 1. Fetch item to get B2 key and course/osi id
    const { data: item, error: fetchError } = await supabase
      .from("capacitacion_material_didactico")
      .select("id, b2_key, id_curso, id_osi")
      .eq("id", materialId)
      .maybeSingle();

    if (fetchError || !item) {
      return { success: false, error: "Material no encontrado" };
    }

    // 2. Delete from B2
    try {
      await storage.send(
        new DeleteObjectCommand({
          Bucket: STORAGE_BUCKET,
          Key: item.b2_key,
        }),
      );
    } catch (b2Error) {
      console.warn("[deleteMaterialDidactico] B2 delete warning:", b2Error);
    }

    // 3. Delete from Supabase
    const { error: dbError } = await supabase
      .from("capacitacion_material_didactico")
      .delete()
      .eq("id", materialId);

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    revalidatePath("/dashboard/capacitacion/gestion-cursos");
    revalidatePath("/portal/facilitador/dashboard");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al eliminar material" };
  }
}
