import { NextRequest, NextResponse } from "next/server";
import { Upload } from "@aws-sdk/lib-storage";
import { requireDashboardAuth } from "@/utils/api-auth";
import { storage, STORAGE_BUCKET, EMAIL_ATTACHMENT_PREFIX } from "@/lib/b2-storage-client";

// Large file uploads (700MB+) can take several minutes to stream to B2.
// Allow up to 5 minutes.
export const maxDuration = 300;
// Must run in Node.js runtime (not Edge) for streaming and crypto.
export const runtime = "nodejs";

/**
 * Upload a single file to Backblaze B2 for use as an email attachment.
 *
 * Uses multipart/formData (not a server action) so the Next.js server action
 * body size limit doesn't apply — files of any size can be uploaded (B2 has
 * no practical per-object limit on the free tier).
 *
 * Uses @aws-sdk/lib-storage Upload (multipart) with file.stream() so the file
 * is streamed to B2 in chunks rather than loaded entirely into memory.
 *
 * Returns { success, key, name, size, contentType } on success.
 */
export async function POST(request: NextRequest) {
  const auth = await requireDashboardAuth(request);
  if ("unauthorized" in auth) {
    return auth.unauthorized;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 },
      );
    }

    // Generate a unique B2 key under the email-attachments prefix.
    const timestamp = Date.now();
    const randomSuffix = crypto.randomUUID().split("-")[0];
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${EMAIL_ATTACHMENT_PREFIX}${timestamp}_${randomSuffix}_${sanitizedName}`;

    // Stream the file to B2 using multipart upload — avoids loading the
    // entire file into memory (critical for large files like 700MB+ PPTs).
    const upload = new Upload({
      client: storage,
      params: {
        Bucket: STORAGE_BUCKET,
        Key: key,
        Body: file.stream(),
        ContentType: file.type || "application/octet-stream",
      },
      // 5MB is the minimum part size for S3-compatible APIs.
      partSize: 5 * 1024 * 1024,
      // Leave queueSize at default to avoid excessive memory usage.
    });

    await upload.done();

    return NextResponse.json({
      success: true,
      key,
      name: file.name,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    });
  } catch (error) {
    console.error("[email-attachments/upload] B2 upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Error al subir el archivo: ${error.message}`
            : "Error al subir el archivo al almacenamiento",
      },
      { status: 500 },
    );
  }
}
