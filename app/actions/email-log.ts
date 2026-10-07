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
 * Helper to enrich log entries with sequential OSI numbers (`nro_osi_secuencial`)
 * from `ejecucion_osi`, since `capacitacion_email_log.osi_id` stores the internal DB ID.
 */
async function enrichLogsWithNroOsi(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: any[],
): Promise<EmailLogEntry[]> {
  if (!rows || rows.length === 0) return [];

  const osiIds = Array.from(
    new Set(
      rows
        .map((r) => r.osi_id)
        .filter((id): id is number => typeof id === "number" && !isNaN(id)),
    ),
  );

  const nroOsiMap = new Map<number, string>();
  if (osiIds.length > 0) {
    const { data: osiRows } = await supabase
      .from("ejecucion_osi")
      .select("id, nro_osi_secuencial")
      .in("id", osiIds);

    if (osiRows) {
      for (const row of osiRows) {
        if (row.nro_osi_secuencial) {
          nroOsiMap.set(row.id, String(row.nro_osi_secuencial).trim());
        }
      }
    }
  }

  return rows.map((r) => ({
    ...r,
    nro_osi: r.osi_id != null ? (nroOsiMap.get(r.osi_id) ?? null) : null,
  })) as EmailLogEntry[];
}

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

  return enrichLogsWithNroOsi(supabase, data || []);
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

  return enrichLogsWithNroOsi(supabase, data || []);
}
