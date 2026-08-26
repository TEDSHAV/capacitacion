"use server";

// Notification helper for Nuevos Servicios (solicitudes de diseño y desarrollo
// de servicios). Calls the shared Supabase RPC `fan_out_notify_by_config`
// directly using the service-role admin client — both this module and the
// PRISMA shell-app share the same Supabase project, so the notification config
// (app_slug / event_key) and the RPC live in one place.
//
// Best-effort: never throws — a notification failure must not roll back the
// caller's data action (matching the shell-app's behavior).

import { createAdminClient } from "@/utils/supabase/server";

const APP_SLUG = "scapacitacion";
const EVENT_KEY = "diseno_servicio_finalizado";

export async function notifySolicitanteOfFinalizacion(solicitudId: number) {
  try {
    const supabase = await createAdminClient();

    const { data: solicitud, error: solError } = await supabase
      .from("solicitudes_diseno_servicio")
      .select("id_solicitante, nombre_sugerido")
      .eq("id", solicitudId)
      .maybeSingle();

    if (solError || !solicitud?.id_solicitante) {
      console.error(
        "[notifySolicitanteOfFinalizacion] Could not fetch solicitud:",
        solError,
      );
      return;
    }

    const { data: solicitante, error: userError } = await supabase
      .from("usuarios")
      .select("id_auth")
      .eq("id", solicitud.id_solicitante)
      .maybeSingle();

    if (userError || !solicitante?.id_auth) {
      console.warn(
        "[notifySolicitanteOfFinalizacion] Could not resolve solicitante auth id:",
        userError,
      );
      return;
    }

    const nombreSugerido = solicitud.nombre_sugerido || `#${solicitudId}`;

    // Direct RPC call to the shared fan-out function. The link points to the
    // shell-app route (where the solicitante lives) since that is where the
    // original request was created and where the solicitante is notified.
    const { error: rpcError } = await supabase.rpc("fan_out_notify_by_config", {
      p_app_slug: APP_SLUG,
      p_event_key: EVENT_KEY,
      p_title: "Solicitud de Diseño Finalizada",
      p_body: `Tu solicitud de diseño "${nombreSugerido}" ha sido finalizada. Ya puedes consultar los detalles.`,
      p_link_path: `/nuevo-servicio/${solicitudId}`,
      p_metadata: {},
      p_dedupe_key: `diseno_servicio:${solicitudId}:finalizada:${Date.now()}`,
      p_priority: 2,
      p_context: { solicitante_auth: solicitante.id_auth },
    });

    if (rpcError) {
      console.error(
        "[notifySolicitanteOfFinalizacion] RPC fan_out_notify_by_config failed:",
        rpcError,
      );
    }
  } catch (err) {
    console.error("[notifySolicitanteOfFinalizacion] Unexpected error:", err);
  }
}
