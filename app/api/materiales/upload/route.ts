import { NextRequest, NextResponse } from "next/server";
import { requireDashboardAuth } from "@/utils/api-auth";
import { createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import {
  storage,
  STORAGE_BUCKET,
  MATERIAL_DIDACTICO_PREFIX,
  getPresignedDownloadUrl,
} from "@/lib/b2-storage-client";
import { Upload } from "@aws-sdk/lib-storage";
import {
  optimizePPTXBuffer,
  formatBytes,
} from "@/lib/pptx-optimizer.server";
import type { TipoMaterial, MaterialDidactico } from "@/types/material-didactico";
import { isMaterialesEnabled } from "@/lib/materiales-flags";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

/**
 * Single-pass direct server upload:
 * Streams incoming file directly to disk, optimizes images & videos with FFmpeg/Sharp,
 * and uploads ONLY the final lightweight file directly to Backblaze B2.
 * Eliminates all B2 download bandwidth consumption and egress costs.
 */
export async function POST(request: NextRequest) {
  if (!isMaterialesEnabled()) {
    return NextResponse.json(
      { error: "Endpoint no disponible en este entorno" },
      { status: 403 },
    );
  }

  const auth = await requireDashboardAuth(request);
  if ("unauthorized" in auth) {
    return auth.unauthorized;
  }

  const tempId = crypto.randomUUID();
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const cursoIdStr = formData.get("id_curso") as string | null;
    const osiIdStr = formData.get("id_osi") as string | null;
    const tipoMaterial = (formData.get("tipo_material") as TipoMaterial) || "otro";
    const titulo = (formData.get("titulo") as string) || file?.name || "Material";
    const descripcion = (formData.get("descripcion") as string) || null;
    const autoOptimize = formData.get("auto_optimize") !== "false";

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 },
      );
    }

    const cursoId = cursoIdStr ? parseInt(cursoIdStr, 10) : null;
    const osiId = osiIdStr ? parseInt(osiIdStr, 10) : null;

    if (!cursoId && !osiId) {
      return NextResponse.json(
        { error: "Debe especificar un Curso o una OSI para asociar el material" },
        { status: 400 },
      );
    }

    const originalSizeBytes = file.size;
    const isPptx =
      file.name.toLowerCase().endsWith(".pptx") ||
      file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation";

    // Write incoming stream to temporary disk file
    const fileExtension = path.extname(file.name) || (isPptx ? ".pptx" : "");
    tempFilePath = path.join(os.tmpdir(), `material_in_${tempId}${fileExtension}`);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempFilePath, fileBuffer);

    let finalBuffer: Buffer = fileBuffer;
    let finalSizeBytes = originalSizeBytes;
    let esOptimizado = false;
    let tamanoOriginalBytes: number | null = null;

    // Run Server-side PPTX Image & FFmpeg Video Optimization
    if (isPptx && autoOptimize) {
      try {
        console.log(
          `[api/materiales/upload] Optimizing PPTX with Sharp & FFmpeg: ${file.name} (${formatBytes(originalSizeBytes)})...`,
        );
        const optResult = await optimizePPTXBuffer(fileBuffer, { compressVideos: true });
        finalBuffer = optResult.optimizedBuffer;
        finalSizeBytes = optResult.optimizedSizeBytes;
        esOptimizado = true;
        tamanoOriginalBytes = originalSizeBytes;

        console.log(
          `[api/materiales/upload] Optimization completed: ${optResult.originalFormattedSize} -> ${optResult.optimizedFormattedSize} (-${optResult.reductionPercentage}%)`,
        );
      } catch (optError) {
        console.warn(
          "[api/materiales/upload] Optimization error, using original buffer:",
          optError,
        );
        finalBuffer = fileBuffer;
      }
    }

    // Generate unique B2 Key
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const scopeFolder = cursoId ? `curso_${cursoId}` : `osi_${osiId}`;
    const b2Key = `${MATERIAL_DIDACTICO_PREFIX}${scopeFolder}/${timestamp}_${sanitizedName}`;

    // Upload directly to Backblaze B2 (Only the final optimized file is uploaded)
    const parallelUpload = new Upload({
      client: storage,
      params: {
        Bucket: STORAGE_BUCKET,
        Key: b2Key,
        Body: finalBuffer,
        ContentType: file.type || "application/octet-stream",
      },
    });

    await parallelUpload.done();

    // Register metadata in Supabase
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
      console.error("[api/materiales/upload] DB error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Invalidate caches
    revalidatePath("/dashboard/capacitacion/gestion-cursos");
    if (cursoId) {
      revalidatePath(`/dashboard/capacitacion/gestion-cursos/${cursoId}`);
    }
    revalidatePath("/portal/facilitador/dashboard");

    const download_url = await getPresignedDownloadUrl(b2Key, 86400 * 3, file.name);

    return NextResponse.json({
      success: true,
      data: { ...record, download_url } as MaterialDidactico,
    });
  } catch (error: any) {
    console.error("[api/materiales/upload] exception:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar y subir el archivo" },
      { status: 500 },
    );
  } finally {
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
  }
}
