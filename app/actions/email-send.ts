"use server";

import { createClient } from "@/utils/supabase/server";
import { sendMail, isEmailConfigured } from "@/lib/email/send";
import type { EmailLogStatus } from "@/types/email";

/**
 * Client-callable check: is MXroute configured? Used by the assign modal to
 * show a "correo no configurado" banner. Does NOT leak credentials.
 */
export async function isEmailServerConfigured(): Promise<boolean> {
  return isEmailConfigured();
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
}): Promise<{ status: EmailLogStatus; logId: number | null; error?: string }> {
  const supabase = await createClient();
  const userRes = await supabase.auth.getUser();
  const sentBy = userRes.data.user?.id ?? null;

  if (!input.to?.trim() || !input.subject?.trim() || !input.body?.trim()) {
    return { status: "failed", logId: null, error: "Faltan destinatario, asunto o cuerpo." };
  }

  // Send via MXroute (soft no-op when not configured).
  const result = await sendMail({
    to: input.to,
    subject: input.subject,
    text: input.body,
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
      body_sent: input.body,
      status,
      error_message: result.error ?? null,
      attachments: [],
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
