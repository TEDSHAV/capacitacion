import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { requireDashboardAuth } from "@/utils/api-auth";
import { storage, STORAGE_BUCKET, EMAIL_ATTACHMENT_PREFIX } from "@/lib/b2-storage-client";

/**
 * Upload a single file to Backblaze B2 for use as an email attachment.
 *
 * Uses multipart/formData (not a server action) so the Next.js server action
 * body size limit doesn't apply — files of any size can be uploaded (B2 has
 * no practical per-object limit on the free tier).
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

    const buffer = Buffer.from(await file.arrayBuffer());

    await storage.send(
      new PutObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      }),
    );

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
