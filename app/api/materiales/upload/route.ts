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
  PPTXOptimizationResult,
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
 * Single-pass direct server upload with real-time NDJSON streaming progress:
 * Streams incoming file, optimizes images & videos with FFmpeg/Sharp while sending
 * fine-grained progress updates to the client, and uploads ONLY the final lightweight file to B2.
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

  // Set up streaming response for live progress events
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (data: Record<string, any>) => {
    try {
      await writer.write(encoder.encode(JSON.stringify(data) + "\n"));
    } catch {
      // client disconnected
    }
  };

  // Background processing runner
  (async () => {
    try {
      await sendEvent({
        stage: "upload_received",
        message: "Archivo recibido por el servidor. Procesando contenido...",
        percent: 5,
      });

      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const cursoIdStr = formData.get("id_curso") as string | null;
      const osiIdStr = formData.get("id_osi") as string | null;
      const tipoMaterial = (formData.get("tipo_material") as TipoMaterial) || "otro";
      const titulo = (formData.get("titulo") as string) || file?.name || "Material";
      const descripcion = (formData.get("descripcion") as string) || null;
      const autoOptimize = formData.get("auto_optimize") !== "false";

      if (!file) {
        await sendEvent({
          stage: "error",
          error: "No se proporcionó ningún archivo",
        });
        await writer.close();
        return;
      }

      const cursoId = cursoIdStr ? parseInt(cursoIdStr, 10) : null;
      const osiId = osiIdStr ? parseInt(osiIdStr, 10) : null;

      if (!cursoId && !osiId) {
        await sendEvent({
          stage: "error",
          error: "Debe especificar un Curso o una OSI para asociar el material",
        });
        await writer.close();
        return;
      }

      const originalSizeBytes = file.size;
      const isPptx =
        file.name.toLowerCase().endsWith(".pptx") ||
        file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation";

      // Write incoming stream to temporary disk file
      const fileExtension = path.extname(file.name) || (isPptx ? ".pptx" : "");
      tempFilePath = path.join(os.tmpdir(), `material_in_${tempId}${fileExtension}`);

      await sendEvent({
        stage: "preparing",
        message: `Leyendo archivo (${formatBytes(originalSizeBytes)})...`,
        percent: 8,
      });

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(tempFilePath, fileBuffer);

      let finalBuffer: Buffer = fileBuffer;
      let finalSizeBytes = originalSizeBytes;
      let esOptimizado = false;
      let tamanoOriginalBytes: number | null = null;
      let optTelemetry: PPTXOptimizationResult | null = null;

      // Run Server-side PPTX Image & FFmpeg Video Optimization
      if (isPptx && autoOptimize) {
        try {
          console.log(
            `[api/materiales/upload] Optimizing PPTX with Sharp & FFmpeg: ${file.name} (${formatBytes(originalSizeBytes)})...`,
          );

          optTelemetry = await optimizePPTXBuffer(fileBuffer, {
            compressVideos: true,
            onProgress: async (optProg) => {
              // Map optimization progress (0-100) to global server progress (10% to 85%)
              const mappedPercent = Math.round(10 + (optProg.percent * 0.75));
              await sendEvent({
                stage: "optimizing",
                subStage: optProg.stage,
                message: optProg.message,
                detail: optProg.detail,
                current: optProg.current,
                total: optProg.total,
                percent: mappedPercent,
              });
            },
          });

          finalBuffer = optTelemetry.optimizedBuffer;
          finalSizeBytes = optTelemetry.optimizedSizeBytes;
          esOptimizado = true;
          tamanoOriginalBytes = originalSizeBytes;

          console.log(
            `[api/materiales/upload] Optimization completed: ${optTelemetry.originalFormattedSize} -> ${optTelemetry.optimizedFormattedSize} (-${optTelemetry.reductionPercentage}%)`,
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

      await sendEvent({
        stage: "saving",
        subStage: "b2_upload",
        message: `Guardando versión final (${formatBytes(finalSizeBytes)}) en Backblaze B2...`,
        percent: 88,
      });

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

      parallelUpload.on("httpUploadProgress", (progress) => {
        if (progress.total && progress.loaded) {
          const b2Percent = Math.min(
            97,
            Math.round(88 + ((progress.loaded / progress.total) * 9)),
          );
          sendEvent({
            stage: "saving",
            subStage: "b2_upload",
            message: `Transmitiendo a nube segura B2 (${Math.round((progress.loaded / progress.total) * 100)}%)...`,
            percent: b2Percent,
          });
        }
      });

      await parallelUpload.done();

      await sendEvent({
        stage: "saving",
        subStage: "db",
        message: "Registrando metadatos en el catálogo...",
        percent: 98,
      });

      const visibleFacilitador = formData.get("visible_facilitador") !== "false";
      const versionNotes = (formData.get("version_notes") as string) || null;
      const parentMaterialId = (formData.get("parent_material_id") as string) || null;

      // Register metadata in Supabase with versioning
      const supabase = await createAdminClient();
      let newVersion = 1;

      if (parentMaterialId) {
        // Fetch parent version number
        const { data: parentRecord } = await supabase
          .from("capacitacion_material_didactico")
          .select("version, id, parent_material_id")
          .eq("id", parentMaterialId)
          .single();

        if (parentRecord) {
          newVersion = (parentRecord.version || 1) + 1;
          const rootId = parentRecord.parent_material_id || parentRecord.id;

          // Mark all previous versions in this family as not latest
          await supabase
            .from("capacitacion_material_didactico")
            .update({ is_latest: false })
            .or(`id.eq.${rootId},parent_material_id.eq.${rootId}`);
        }
      }

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
          visible_facilitador: visibleFacilitador,
          is_latest: true,
          version: newVersion,
          parent_material_id: parentMaterialId || null,
          version_notes: versionNotes?.trim() || null,
        })
        .select()
        .single();

      if (dbError) {
        console.error("[api/materiales/upload] DB error:", dbError);
        await sendEvent({
          stage: "error",
          error: `Error al guardar en base de datos: ${dbError.message}`,
        });
        await writer.close();
        return;
      }

      // Invalidate caches
      revalidatePath("/dashboard/capacitacion/gestion-cursos");
      if (cursoId) {
        revalidatePath(`/dashboard/capacitacion/gestion-cursos/${cursoId}`);
      }
      revalidatePath("/portal/facilitador/dashboard");

      const download_url = await getPresignedDownloadUrl(b2Key, 86400 * 3, file.name);

      await sendEvent({
        stage: "completed",
        success: true,
        percent: 100,
        message: "¡Material procesado y guardado con éxito!",
        data: { ...record, download_url } as MaterialDidactico,
        optResult: optTelemetry
          ? {
              originalSize: optTelemetry.originalFormattedSize,
              finalSize: optTelemetry.optimizedFormattedSize,
              reduction: `${optTelemetry.reductionPercentage}%`,
              images: optTelemetry.imagesProcessedCount,
              videos: optTelemetry.videosProcessedCount,
            }
          : null,
      });
    } catch (error: any) {
      console.error("[api/materiales/upload] exception:", error);
      await sendEvent({
        stage: "error",
        error: error.message || "Error inesperado al procesar y subir el archivo",
      });
    } finally {
      if (tempFilePath) {
        await fs.unlink(tempFilePath).catch(() => {});
      }
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
