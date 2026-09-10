/**
 * MXroute SMTP integration for the "Asignar Facilitador" email feature.
 *
 * Uses nodemailer with a lazily-created transporter backed by MXroute env vars:
 *   MXROUTE_SMTP_HOST, MXROUTE_SMTP_PORT, MXROUTE_SMTP_USER, MXROUTE_SMTP_PASS,
 *   EMAIL_FROM, EMAIL_FROM_NAME (optional, defaults to "Capacitación SHA").
 *
 * When the SMTP creds are not configured, `sendMail` is a soft no-op: it logs a
 * notice and returns `{ status: "not_configured" }` so the assign flow still
 * works in dev without a mail server. The caller (email-send action) records
 * the attempt in `capacitacion_email_log` regardless of the outcome.
 *
 * This module is server-only (Node runtime). It must never be imported from a
 * client component — only from server actions.
 */

import nodemailer from "nodemailer";
import type { SendMailInput, SendResult } from "@/types/email";

let _transporter: nodemailer.Transporter | null = null;

function isConfigured(): boolean {
  return Boolean(
    process.env.MXROUTE_SMTP_HOST &&
      process.env.MXROUTE_SMTP_USER &&
      process.env.MXROUTE_SMTP_PASS &&
      process.env.EMAIL_FROM,
  );
}

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  const host = process.env.MXROUTE_SMTP_HOST!;
  const port = parseInt(process.env.MXROUTE_SMTP_PORT || "465", 10);
  const user = process.env.MXROUTE_SMTP_USER!;
  const pass = process.env.MXROUTE_SMTP_PASS!;

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465 (implicit TLS), false for 587 (STARTTLS)
    auth: { user, pass },
  });

  return _transporter;
}

function fromAddress(): string {
  const from = process.env.EMAIL_FROM!;
  const name = process.env.EMAIL_FROM_NAME || "Capacitación SHA";
  // Quote the display name if it contains chars that need quoting.
  return `${name} <${from}>`;
}

/**
 * Send an email via MXroute. Returns a SendResult; never throws (errors are
 * captured into `{ status: "failed", error }`).
 *
 * The body is sent as both plain text and a minimal HTML version (line breaks
 * converted to <br>, preserving emojis) so the rich template renders in
 * clients that prefer HTML.
 */
export async function sendMail(input: SendMailInput): Promise<SendResult> {
  if (!isConfigured()) {
    console.warn(
      "[email] MXroute no configurado, omitiendo envío (MXROUTE_SMTP_* / EMAIL_FROM faltan)",
    );
    return { status: "not_configured" };
  }

  try {
    const transporter = getTransporter();
    const html = textToBasicHtml(input.text);

    const info = await transporter.sendMail({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    return { status: "sent", messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] sendMail failed:", message);
    return { status: "failed", error: message };
  }
}

/** Convert plain text to a minimal HTML body (preserve line breaks + emojis). */
function textToBasicHtml(text: string): string {
  // Escape HTML-special chars; emojis are preserved as-is (UTF-8).
  const AMP = String.fromCharCode(38); // &
  const escaped = text
    .replace(/&/g, AMP + "amp;")
    .replace(/</g, AMP + "lt;")
    .replace(/>/g, AMP + "gt;");
  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
    '<body style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">' +
    escaped +
    "</body></html>"
  );
}

/** Exposed for tests / health checks. Not used in the app flow. */
export function isEmailConfigured(): boolean {
  return isConfigured();
}
