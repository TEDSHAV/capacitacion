"use server";

import { createClient } from "@/utils/supabase/server";
import type { EmailLogEntry, EmailLogStatus } from "@/types/email";

/**
 * Read-only server actions for `capacitacion_email_log`.
 *
 * The log is append-only (inserted by `sendAssignmentEmail`); these actions
 * only fetch rows for display in the assign modal badges and the
 * /registro-correos page.
 */

/**
 * Fetch all email log entries for a given OSI, ordered newest-first.
 * Used by the assign modal to show "Correo enviado" badges per facilitador.
 */
export async function getEmailLogsForOSI(osiId: number): Promise<EmailLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("capacitacion_email_log")
    .select(
      "id, osi_id, facilitador_id, assignment_id, template_id, to_email, subject, body_sent, status, error_message, attachments, sent_by, sent_at, facilitadores(nombre_apellido)",
    )
    .eq("osi_id", osiId)
    .order("sent_at", { ascending: false });

  if (error) {
    console.error("[getEmailLogsForOSI] error:", error);
    return [];
  }

  return (data || []) as unknown as EmailLogEntry[];
}

/**
 * Fetch email log entries with optional filters, ordered newest-first.
 * Used by the /registro-correos page. Defaults to the latest 100 entries.
 */
export async function getEmailLogs(filters?: {
  osiId?: number;
  facilitadorId?: number;
  status?: EmailLogStatus;
  limit?: number;
}): Promise<EmailLogEntry[]> {
  const supabase = await createClient();
  let query = supabase
    .from("capacitacion_email_log")
    .select(
      "id, osi_id, facilitador_id, assignment_id, template_id, to_email, subject, body_sent, status, error_message, attachments, sent_by, sent_at, facilitadores(nombre_apellido)",
    );

  if (filters?.osiId != null) {
    query = query.eq("osi_id", filters.osiId);
  }
  if (filters?.facilitadorId != null) {
    query = query.eq("facilitador_id", filters.facilitadorId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const limit = filters?.limit ?? 100;
  const { data, error } = await query
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getEmailLogs] error:", error);
    return [];
  }

  return (data || []) as unknown as EmailLogEntry[];
}
