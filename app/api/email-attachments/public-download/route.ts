import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { storage, STORAGE_BUCKET, SIGNED_URL_EXPIRY_SECONDS } from "@/lib/b2-storage-client";

export const runtime = "nodejs";

/**
 * Public download endpoint for email attachments stored in B2.
 *
 * Unlike the authenticated /api/email-attachments/download route (which is
 * used by the dashboard registro-correos page), this route requires no auth
 * and is meant to be embedded in emails as a permanent (non-expiring) link.
 *
 * Each click generates a fresh short-lived presigned B2 URL and redirects
 * (302) to it, so the link itself never expires — it works as long as the
 * underlying B2 object exists (subject to B2 lifecycle rules).
 */
export async function GET(request: NextRequest) {
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

    return NextResponse.redirect(presignedUrl);
  } catch (error) {
    console.error("[email-attachments/public-download] Presigned URL error:", error);
    return NextResponse.json(
      { error: "Error al generar el enlace de descarga" },
      { status: 500 },
    );
  }
}
