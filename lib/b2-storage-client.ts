import { S3Client } from "@aws-sdk/client-s3";

/**
 * Backblaze B2 storage client (S3-compatible).
 *
 * Configured via runtime env vars (NOT build ARGs):
 *   B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_ENDPOINT, B2_REGION
 *
 * B2 uses an account-specific S3 endpoint URL.
 */
export const storage = new S3Client({
  region: process.env.B2_REGION || "us-east-005",
  endpoint: `https://${process.env.B2_ENDPOINT!}`,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
});

export const STORAGE_BUCKET = process.env.B2_BUCKET_NAME || "calidad-documentos";

/** Prefix used for all email attachment objects in B2. */
export const EMAIL_ATTACHMENT_PREFIX = "email-attachments/";

/** Prefix used for course materials and presentations in B2. */
export const MATERIAL_DIDACTICO_PREFIX = "capacitacion-materiales/";

/** Threshold (bytes) above which a file is linked instead of attached. */
export const DIRECT_ATTACHMENT_LIMIT = 10 * 1024 * 1024; // 10MB

/** Signed URL expiry for large-file download links (7 days). */
export const SIGNED_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Generate a presigned download URL for a B2 object key.
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds: number = SIGNED_URL_EXPIRY_SECONDS,
  overrideFilename?: string,
): Promise<string> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const command = new GetObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: key,
    ResponseContentDisposition: overrideFilename
      ? `attachment; filename="${encodeURIComponent(overrideFilename)}"`
      : undefined,
  });

  return getSignedUrl(storage, command, { expiresIn: expiresInSeconds });
}

