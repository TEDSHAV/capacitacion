"use server";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/utils/supabase/server";
import { sendMail, isEmailConfigured } from "@/lib/email/send";
import type { UploadedAttachment, EmailLogStatus } from "@/types/email";
import {
  storage,
  STORAGE_BUCKET,
  DIRECT_ATTACHMENT_LIMIT,
} from "@/lib/b2-storage-client";

/**
 * Client-callable check: is MXroute configured? Used by the assign modal to
 * show a "correo no configurado" banner. Does NOT leak credentials.
 */
export async function isEmailServerConfigured(): Promise<boolean> {
  return isEmailConfigured();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Send the "Asignación de Facilitador" email and record the outcome in
 * `capacitacion_email_log`.
 *
 * The assignment is assumed to already exist (created by
 * `assignOSIToFacilitador`); this action only handles the email side. If the
 * SMTP server is not configured, the send is a soft no-op and the log records
 * `status = 'not_configured'` so there is still an audit trail.
 *
 * Attachments are files already uploaded to Backblaze B2 via the
 * `/api/email-attachments/upload` route. Small files (<10MB) are downloaded
 * and attached directly to the email; large files (≥10MB) get a 7-day signed
 * download URL appended to the email body.
 *
 * @returns `{ status, logId, error? }` — never throws.
 */
export async function sendAssignmentEmail(input: {
  osiId: number;
  facilitadorId: number;
  assignmentId?: number | null;
  to: string;
  subject: string;
  body: string;
  templateId?: number | null;
  attachments?: UploadedAttachment[];
  linkExpiryDays?: number;
}): Promise<{ status: EmailLogStatus; logId: number | null; error?: string }> {
  const supabase = await createClient();
  const userRes = await supabase.auth.getUser();
  const sentBy = userRes.data.user?.id ?? null;

  if (!input.to?.trim() || !input.subject?.trim() || !input.body?.trim()) {
    return { status: "failed", logId: null, error: "Faltan destinatario, asunto o cuerpo." };
  }

  // Process attachments: small files are downloaded from B2 and attached
  // directly; large files get a signed URL appended to the email body.
  const directAttachments: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }> = [];
  const largeFileLinks: Array<{ name: string; size: number; url: string; key: string }> = [];
  const attachmentMeta: Array<{ key: string; name: string; size: number; url?: string }> = [];

  for (const att of input.attachments ?? []) {
    try {
      if (att.size < DIRECT_ATTACHMENT_LIMIT) {
        // Download from B2 and attach directly.
        const { Body } = await storage.send(
          new GetObjectCommand({
            Bucket: STORAGE_BUCKET,
            Key: att.key,
          }),
        );
        if (Body) {
          const buffer = Buffer.from(await Body.transformToByteArray());
          directAttachments.push({
            filename: att.name,
            content: buffer,
            contentType: att.contentType,
          });
        }
        attachmentMeta.push({ key: att.key, name: att.name, size: att.size });
      } else {
        // Generate a download URL for the email body.
        const noExpiry = input.linkExpiryDays === 0;
        let url: string;
        if (noExpiry) {
          // "No expiration": link to our public download route which generates
          // a fresh presigned URL on each click. The link never expires.
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
          url = `${appUrl}/api/email-attachments/public-download?key=${encodeURIComponent(att.key)}&name=${encodeURIComponent(att.name)}`;
        } else {
          // Time-limited signed B2 URL.
          const command = new GetObjectCommand({
            Bucket: STORAGE_BUCKET,
            Key: att.key,
            ResponseContentDisposition: `attachment; filename="${encodeURIComponent(att.name)}"`,
          });
          url = await getSignedUrl(storage, command, {
            expiresIn: (input.linkExpiryDays ?? 7) * 24 * 60 * 60,
          });
        }
        largeFileLinks.push({ name: att.name, size: att.size, url, key: att.key });
        attachmentMeta.push({ key: att.key, name: att.name, size: att.size, url });
      }
    } catch (err) {
      console.error(`[sendAssignmentEmail] Error processing attachment "${att.name}":`, err);
      // Record the failure in metadata but continue — the email should still send.
      attachmentMeta.push({ key: att.key, name: att.name, size: att.size });
    }
  }

  // Append large-file download links to the email body.
  let emailBody = input.body;
  if (largeFileLinks.length > 0) {
    const expiryDays = input.linkExpiryDays ?? 7;
    const expiryText =
      expiryDays === 0
        ? "enlace sin vencimiento"
        : `enlace válido por ${expiryDays} ${expiryDays === 1 ? "día" : "días"}`;
    emailBody +=
      "\n\n--- Archivos adjuntos grandes ---\n" +
      `Los siguientes archivos están disponibles para descarga (${expiryText}):\n\n` +
      largeFileLinks
        .map((f) => `• ${f.name} (${formatFileSize(f.size)}) — ${f.url}`)
        .join("\n");
  }

  // Send via MXroute (soft no-op when not configured).
  const result = await sendMail({
    to: input.to,
    subject: input.subject,
    text: emailBody,
    attachments: directAttachments.length > 0 ? directAttachments : undefined,
  });

  const status: EmailLogStatus =
    result.status === "sent" ? "sent" : result.status === "failed" ? "failed" : "not_configured";

  // Always log the attempt.
  const { data: logRow, error: logErr } = await supabase
    .from("capacitacion_email_log")
    .insert({
      osi_id: input.osiId,
      facilitador_id: input.facilitadorId,
      assignment_id: input.assignmentId ?? null,
      template_id: input.templateId ?? null,
      to_email: input.to,
      subject: input.subject,
      body_sent: emailBody,
      status,
      error_message: result.error ?? null,
      attachments: attachmentMeta,
      sent_by: sentBy,
    })
    .select("id")
    .single();

  if (logErr) {
    console.error("[sendAssignmentEmail] log insert error:", logErr);
  }

  return {
    status,
    logId: logRow?.id ?? null,
    error: result.error,
  };
}
