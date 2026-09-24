"use server";

import { createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import {
  storage,
  STORAGE_BUCKET,
  MATERIAL_DIDACTICO_PREFIX,
  getPresignedDownloadUrl,
} from "@/lib/b2-storage-client";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import {
  optimizePPTXBuffer,
  formatBytes,
} from "@/lib/pptx-optimizer.server";
import type {
  MaterialDidactico,
  MaterialKitInfo,
  TipoMaterial,
} from "@/types/material-didactico";

/**
 * Fetch all materials registered for a course (catalogo_servicios.id)
 */
export async function getMaterialesByCurso(
  cursoId: number,
): Promise<{ data: MaterialDidactico[]; error: string | null }> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("capacitacion_material_didactico")
      .select("*")
      .eq("id_curso", cursoId)
      .is("id_osi", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getMaterialesByCurso] error:", error);
      return { data: [], error: error.message };
    }

    // Add presigned download URLs
    const items = await Promise.all(
      (data || []).map(async (item: any) => {
        try {
          const download_url = await getPresignedDownloadUrl(
            item.b2_key,
            86400, // 24 hours
            item.archivo_nombre,
          );
          return { ...item, download_url };
        } catch {
          return item;
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
 */
export async function getMaterialKitForOSI(
  osiId: number,
): Promise<{ data: MaterialKitInfo | null; error: string | null }> {
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

    // 2. Fetch both course materials and OSI-specific materials
    let query = supabase
      .from("capacitacion_material_didactico")
      .select("*")
      .or(`id_osi.eq.${osiId}${cursoId ? `,id_curso.eq.${cursoId}` : ""}`)
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
 * Upload and optionally optimize a course or OSI material to Backblaze B2.
 */
export async function uploadMaterialDidactico(
  formData: FormData,
): Promise<{ success: boolean; data?: MaterialDidactico; error?: string }> {
  try {
    const file = formData.get("file") as File | null;
    const cursoIdStr = formData.get("id_curso") as string | null;
    const osiIdStr = formData.get("id_osi") as string | null;
    const tipoMaterial = (formData.get("tipo_material") as TipoMaterial) || "otro";
    const titulo = (formData.get("titulo") as string) || file?.name || "Material";
    const descripcion = (formData.get("descripcion") as string) || null;
    const autoOptimize = formData.get("auto_optimize") !== "false";

    if (!file) {
      return { success: false, error: "No se proporcionó ningún archivo" };
    }

    const cursoId = cursoIdStr ? parseInt(cursoIdStr, 10) : null;
    const osiId = osiIdStr ? parseInt(osiIdStr, 10) : null;

    if (!cursoId && !osiId) {
      return {
        success: false,
        error: "Debe especificar un Curso o una OSI para asociar el material",
      };
    }

    const originalArrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(originalArrayBuffer);
    const originalSizeBytes = originalBuffer.length;

    let finalBuffer: Uint8Array = new Uint8Array(originalArrayBuffer);
    let finalSizeBytes = originalSizeBytes;
    let esOptimizado = false;
    let tamanoOriginalBytes: number | null = null;


    const isPptx =
      file.name.toLowerCase().endsWith(".pptx") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation";

    // Perform server-side PPTX optimization if requested
    if (isPptx && autoOptimize) {
      try {
        console.log(
          `[uploadMaterialDidactico] Optimizing PPTX: ${file.name} (${formatBytes(originalSizeBytes)})...`,
        );
        const optResult = await optimizePPTXBuffer(originalBuffer);
        finalBuffer = optResult.optimizedBuffer;
        finalSizeBytes = optResult.optimizedSizeBytes;
        esOptimizado = true;
        tamanoOriginalBytes = originalSizeBytes;
        console.log(
          `[uploadMaterialDidactico] PPTX Optimized successfully: ${optResult.originalFormattedSize} -> ${optResult.optimizedFormattedSize} (-${optResult.reductionPercentage}%)`,
        );
      } catch (optError) {
        console.warn(
          "[uploadMaterialDidactico] Optimization skipped due to error, using original buffer:",
          optError,
        );
      }
    }

    // Generate unique B2 Key
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const scopeFolder = cursoId ? `curso_${cursoId}` : `osi_${osiId}`;
    const b2Key = `${MATERIAL_DIDACTICO_PREFIX}${scopeFolder}/${timestamp}_${sanitizedName}`;

    // Upload to Backblaze B2 using S3 Multipart Upload
    const parallelUploads3 = new Upload({
      client: storage,
      params: {
        Bucket: STORAGE_BUCKET,
        Key: b2Key,
        Body: Uint8Array.from(finalBuffer),
        ContentType: file.type || "application/octet-stream",
      },
    });


    await parallelUploads3.done();

    // Register record in Supabase
    const supabase = await createAdminClient();
    const { data: record, error: dbError } = await supabase
      .from("capacitacion_material_didactico")
      .insert({
        id_curso: cursoId,
        id_osi: osiId,
        tipo_material: tipoMaterial,
        titulo: titulo.trim(),
        descripcion: descripcion?.trim() || null,
        archivo_nombre: file.name,
        b2_key: b2Key,
        file_size_bytes: finalSizeBytes,
        file_size_formatted: formatBytes(finalSizeBytes),
        mime_type: file.type || null,
        es_optimizado: esOptimizado,
        tamano_original_bytes: tamanoOriginalBytes,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[uploadMaterialDidactico] DB insert error:", dbError);
      return { success: false, error: dbError.message };
    }

    // Revalidate relevant paths
    revalidatePath("/dashboard/capacitacion/gestion-cursos");
    if (cursoId) {
      revalidatePath(`/dashboard/capacitacion/gestion-cursos/${cursoId}`);
    }
    revalidatePath("/portal/facilitador/dashboard");

    const download_url = await getPresignedDownloadUrl(b2Key, 86400, file.name);

    return {
      success: true,
      data: { ...record, download_url },
    };
  } catch (err: any) {
    console.error("[uploadMaterialDidactico] exception:", err);
    return { success: false, error: err.message || "Error al subir material" };
  }
}

export interface RegisterUploadedMaterialInput {
  cursoId?: number;
  osiId?: number;
  tipoMaterial: TipoMaterial;
  titulo: string;
  descripcion?: string;
  archivoNombre: string;
  b2Key: string;
  fileSizeBytes: number;
  mimeType?: string;
  autoOptimize?: boolean;
}

/**
 * Register a file already uploaded directly to B2, and optionally optimize it.
 */
export async function registerUploadedMaterial(
  input: RegisterUploadedMaterialInput,
): Promise<{ success: boolean; data?: MaterialDidactico; error?: string }> {
  try {
    const {
      cursoId,
      osiId,
      tipoMaterial,
      titulo,
      descripcion,
      archivoNombre,
      b2Key,
      fileSizeBytes,
      mimeType,
      autoOptimize = true,
    } = input;

    if (!cursoId && !osiId) {
      return {
        success: false,
        error: "Debe especificar un Curso o una OSI para asociar el material",
      };
    }

    let finalSizeBytes = fileSizeBytes;
    let esOptimizado = false;
    let tamanoOriginalBytes: number | null = null;

    const isPptx =
      archivoNombre.toLowerCase().endsWith(".pptx") ||
      mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation";

    // If PPTX optimization is requested, fetch from B2, optimize, and overwrite
    if (isPptx && autoOptimize) {
      try {
        console.log(
          `[registerUploadedMaterial] Fetching PPTX from B2 to optimize: ${archivoNombre} (${formatBytes(fileSizeBytes)})...`,
        );
        const { GetObjectCommand, PutObjectCommand } = await import("@aws-sdk/client-s3");
        const getObjRes = await storage.send(
          new GetObjectCommand({
            Bucket: STORAGE_BUCKET,
            Key: b2Key,
          }),
        );

        if (getObjRes.Body) {
          const rawByteArray = await getObjRes.Body.transformToByteArray();
          const rawBuffer = Buffer.from(rawByteArray);

          const optResult = await optimizePPTXBuffer(rawBuffer);
          console.log(
            `[registerUploadedMaterial] Optimization finished: ${optResult.originalFormattedSize} -> ${optResult.optimizedFormattedSize} (-${optResult.reductionPercentage}%)`,
          );

          // Overwrite with optimized version
          await storage.send(
            new PutObjectCommand({
              Bucket: STORAGE_BUCKET,
              Key: b2Key,
              Body: optResult.optimizedBuffer,
              ContentType: mimeType || "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            }),
          );

          finalSizeBytes = optResult.optimizedSizeBytes;
          esOptimizado = true;
          tamanoOriginalBytes = fileSizeBytes;
        }
      } catch (optError) {
        console.warn(
          "[registerUploadedMaterial] Optimization error, keeping original file:",
          optError,
        );
      }
    }

    // Register record in Supabase
    const supabase = await createAdminClient();
    const { data: record, error: dbError } = await supabase
      .from("capacitacion_material_didactico")
      .insert({
        id_curso: cursoId || null,
        id_osi: osiId || null,
        tipo_material: tipoMaterial,
        titulo: titulo.trim(),
        descripcion: descripcion?.trim() || null,
        archivo_nombre: archivoNombre,
        b2_key: b2Key,
        file_size_bytes: finalSizeBytes,
        file_size_formatted: formatBytes(finalSizeBytes),
        mime_type: mimeType || null,
        es_optimizado: esOptimizado,
        tamano_original_bytes: tamanoOriginalBytes,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[registerUploadedMaterial] DB insert error:", dbError);
      return { success: false, error: dbError.message };
    }

    // Revalidate relevant paths
    revalidatePath("/dashboard/capacitacion/gestion-cursos");
    if (cursoId) {
      revalidatePath(`/dashboard/capacitacion/gestion-cursos/${cursoId}`);
    }
    revalidatePath("/portal/facilitador/dashboard");

    const download_url = await getPresignedDownloadUrl(b2Key, 86400, archivoNombre);

    return {
      success: true,
      data: { ...record, download_url },
    };
  } catch (err: any) {
    console.error("[registerUploadedMaterial] exception:", err);
    return { success: false, error: err.message || "Error al registrar material" };
  }
}


/**
 * Delete a material from Supabase and Backblaze B2.
 */
export async function deleteMaterialDidactico(
  materialId: string,
): Promise<{ success: boolean; error?: string }> {
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
