"use server";

import { createAdminClient } from "@/utils/supabase/server";

const APP_SLUG = "scapacitacion";
const EVENT_KEY = "facilitador_upload";

const CATEGORY_LABELS: Record<string, string> = {
  lista_asistencia: "lista de asistencia",
  hoja_calificacion: "hoja de calificación",
  material_fotografico: "material fotográfico",
  lista_participantes: "listado de participantes",
};

/**
 * Notify capacitacion department users when a facilitador uploads
 * documentation or submits a final participant list.
 *
 * Uses the same legacy direct-insert pattern as the shell's
 * legacyNotifySessionStatusChange: finds recipients by department,
 * inserts rows into notify.inbox.
 *
 * Fire-and-forget: errors are logged but do not block the caller.
 */
export async function notifyCapacitacionUsersOfUpload(params: {
  osiId: number;
  nroOsi: string;
  facilitadorName: string;
  category: string;
  nroSesion?: number;
}): Promise<void> {
  const { osiId, nroOsi, facilitadorName, category, nroSesion } = params;

  try {
    const supabase = await createAdminClient();

    // --- Resolve recipients: users in capacitacion or admin departments ---
    const { data: deptos } = await supabase
      .from("departamentos")
      .select("id, nombre")
      .or("nombre.ilike.%admin%,nombre.ilike.%capacitacion%");

    const deptIds = (deptos || []).map((d: { id: number }) => d.id);
    if (deptIds.length === 0) {
      console.warn("[notifyCapacitacionUsersOfUpload] No matching departments found");
      return;
    }

    const { data: deptUsers } = await supabase
      .from("usuarios")
      .select("id_auth")
      .in("departamento", deptIds)
      .not("id_auth", "is", null)
      .eq("esta_activo", true);

    const recipientIds = (deptUsers || [])
      .map((u: { id_auth: string | null }) => u.id_auth)
      .filter((id: string | null): id is string => id !== null);

    if (recipientIds.length === 0) {
      console.warn("[notifyCapacitacionUsersOfUpload] No recipients with id_auth found");
      return;
    }

    // --- Build notification ---
    const categoryLabel = CATEGORY_LABELS[category] || category;
    const sessionSuffix = nroSesion ? ` (Sesión ${nroSesion})` : "";

    const title = "Facilitador subió documentación";
    const body = `El facilitador ${facilitadorName} subió ${categoryLabel} para la OSI ${nroOsi}${sessionSuffix}.`;

    const rows = recipientIds.map((recipientIdAuth) => ({
      app_slug: APP_SLUG,
      event_key: EVENT_KEY,
      recipient_id_auth: recipientIdAuth,
      title,
      body,
      link_path: "/dashboard/capacitacion/seguimiento-servicios",
      metadata: {
        osi_id: osiId,
        nro_osi: nroOsi,
        facilitador_name: facilitadorName,
        category,
        nro_sesion: nroSesion ?? null,
      },
      dedupe_key: `facilitador_upload:${osiId}:${category}:${nroSesion ?? 0}:${Date.now()}`,
      priority: 2,
    }));

    const { error: insertError } = await supabase
      .schema("notify")
      .from("inbox")
      .insert(rows);

    if (insertError) {
      console.error("[notifyCapacitacionUsersOfUpload] Insert error:", insertError);
    } else {
      console.log(`[notifyCapacitacionUsersOfUpload] Notified ${recipientIds.length} user(s) for OSI ${nroOsi}, category=${category}`);
    }
  } catch (err) {
    console.error("[notifyCapacitacionUsersOfUpload] Unexpected error:", err);
  }
}
