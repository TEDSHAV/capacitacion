import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireDashboardAuth } from "@/utils/api-auth";
import { storage, STORAGE_BUCKET, MATERIAL_DIDACTICO_PREFIX } from "@/lib/b2-storage-client";

export const runtime = "nodejs";

/**
 * Generate a presigned S3 PUT URL for direct-to-B2 course material uploads.
 *
 * Streams large files (PPTX, PDF, ZIP) directly from the client's browser to
 * Backblaze B2, avoiding Next.js Server Action body size limits (10MB default)
 * and enabling live byte-level progress reporting.
 */
export async function POST(request: NextRequest) {
  const auth = await requireDashboardAuth(request);
  if ("unauthorized" in auth) {
    return auth.unauthorized;
  }

  try {
    const body = await request.json();
    const { filename, contentType, size, cursoId, osiId } = body as {
      filename?: string;
      contentType?: string;
      size?: number;
      cursoId?: number;
      osiId?: number;
    };

    if (!filename || typeof filename !== "string") {
      return NextResponse.json(
        { error: "No se proporcionó el nombre del archivo" },
        { status: 400 },
      );
    }

    if (!cursoId && !osiId) {
      return NextResponse.json(
        { error: "Debe especificar un cursoId o osiId" },
        { status: 400 },
      );
    }

    const timestamp = Date.now();
    const randomSuffix = crypto.randomUUID().split("-")[0];
    const sanitizedName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const scopeFolder = cursoId ? `curso_${cursoId}` : `osi_${osiId}`;
    const key = `${MATERIAL_DIDACTICO_PREFIX}${scopeFolder}/${timestamp}_${randomSuffix}_${sanitizedName}`;
    const resolvedContentType = contentType || "application/octet-stream";

    const command = new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
      ContentType: resolvedContentType,
    });

    // Valid for 2 hours to allow large uploads on slower connections
    const uploadUrl = await getSignedUrl(storage, command, { expiresIn: 7200 });

    return NextResponse.json({
      success: true,
      uploadUrl,
      key,
      name: filename,
      size: size || 0,
      contentType: resolvedContentType,
    });
  } catch (error: any) {
    console.error("[api/materiales/presign] error:", error);
    return NextResponse.json(
      { error: error.message || "Error al generar enlace de subida" },
      { status: 500 },
    );
  }
}
