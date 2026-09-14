import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireDashboardAuth } from "@/utils/api-auth";
import { storage, STORAGE_BUCKET, SIGNED_URL_EXPIRY_SECONDS } from "@/lib/b2-storage-client";

/**
 * Generate a 7-day presigned download URL for an email attachment stored in B2.
 *
 * Used by the registro-correos page to offer downloads of large attachments
 * that were linked (not directly attached) in the original email.
 */
export async function GET(request: NextRequest) {
  const auth = await requireDashboardAuth(request);
  if ("unauthorized" in auth) {
    return auth.unauthorized;
  }

  const key = request.nextUrl.searchParams.get("key");
  const fileName = request.nextUrl.searchParams.get("name") || undefined;

  if (!key) {
    return NextResponse.json(
      { error: "Falta el parámetro 'key'" },
      { status: 400 },
    );
  }

  try {
    const command = new GetObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
      ...(fileName
        ? {
            ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
          }
        : {}),
    });

    const presignedUrl = await getSignedUrl(storage, command, {
      expiresIn: SIGNED_URL_EXPIRY_SECONDS,
    });

    return NextResponse.json({ url: presignedUrl });
  } catch (error) {
    console.error("[email-attachments/download] Presigned URL error:", error);
    return NextResponse.json(
      { error: "Error al generar el enlace de descarga" },
      { status: 500 },
    );
  }
}
