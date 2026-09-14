import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireDashboardAuth } from "@/utils/api-auth";
import { storage, STORAGE_BUCKET, EMAIL_ATTACHMENT_PREFIX } from "@/lib/b2-storage-client";

export const runtime = "nodejs";

/**
 * Generate a presigned S3 PUT URL for direct-to-B2 browser uploads.
 *
 * This allows the client browser to stream files directly to Backblaze B2,
 * completely bypassing the Next.js server for maximum speed and real-time
 * progress tracking without memory pressure or server bandwidth limits.
 */
export async function POST(request: NextRequest) {
  const auth = await requireDashboardAuth(request);
  if ("unauthorized" in auth) {
    return auth.unauthorized;
  }

  try {
    const body = await request.json();
    const { filename, contentType, size } = body as {
      filename?: string;
      contentType?: string;
      size?: number;
    };

    if (!filename || typeof filename !== "string") {
      return NextResponse.json(
        { error: "No se proporcionó el nombre del archivo" },
        { status: 400 },
      );
    }

    // Generate a unique B2 key under the email-attachments prefix.
    const timestamp = Date.now();
    const randomSuffix = crypto.randomUUID().split("-")[0];
    const sanitizedName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${EMAIL_ATTACHMENT_PREFIX}${timestamp}_${randomSuffix}_${sanitizedName}`;
    const resolvedContentType = contentType || "application/octet-stream";

    const command = new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
      ContentType: resolvedContentType,
    });

    // Generate presigned URL valid for 1 hour for the upload
    const uploadUrl = await getSignedUrl(storage, command, { expiresIn: 3600 });

    return NextResponse.json({
      success: true,
      uploadUrl,
      key,
      name: filename,
      size: size || 0,
      contentType: resolvedContentType,
    });
  } catch (error) {
    console.error("[email-attachments/presign] Error generating presigned upload URL:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Error al preparar la subida: ${error.message}`
            : "Error al preparar la subida directa",
      },
      { status: 500 },
    );
  }
}
