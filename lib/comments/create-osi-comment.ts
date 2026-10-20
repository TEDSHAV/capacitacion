import { createAdminClient } from "@/utils/supabase/server";

interface CreateOsiCommentParams {
  osiId: number;
  contenido: string;
  userId?: string | null;
}

/**
 * Creates a comment in `comentarios_contexto` and links it to the OSI via
 * `comentario_entidad_vinculos`. This makes the comment directly visible in the
 * PRISMA centralized comments iframe (/embed/osi-comentarios/[osi_id]).
 */
export async function createOsiComment({
  osiId,
  contenido,
  userId,
}: CreateOsiCommentParams): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(osiId) || osiId <= 0) {
    return { success: false, error: "OSI inválido" };
  }
  const cleanContent = (contenido || "").trim();
  if (!cleanContent) {
    return { success: false, error: "Contenido de comentario vacío" };
  }

  try {
    const admin = await createAdminClient();

    // 1. Resolve parent SOLPED (id_ecc)
    const { data: viewRow } = await admin
      .from("v_osi_formato_completo")
      .select("id_ecc_actual, id_ecc_origen")
      .eq("id_osi", osiId)
      .maybeSingle();

    let resolvedEcc = Number(
      (viewRow as { id_ecc_actual?: number; id_ecc_origen?: number } | null)?.id_ecc_actual ??
        (viewRow as { id_ecc_actual?: number; id_ecc_origen?: number } | null)?.id_ecc_origen ??
        0,
    );

    if (resolvedEcc <= 0) {
      const { data: osiRow } = await admin
        .from("ejecucion_osi")
        .select("id_ecc")
        .eq("id", osiId)
        .maybeSingle();
      resolvedEcc = Number((osiRow as { id_ecc?: number } | null)?.id_ecc ?? 0);
    }

    // 2. Resolve numeric author_user_id (usuarios.id) from auth UUID
    let authorUserId: number | null = null;
    if (userId) {
      const { data: userRow } = await admin
        .from("usuarios")
        .select("id")
        .eq("id_auth", userId)
        .maybeSingle();
      authorUserId = userRow?.id ? Number(userRow.id) : null;
    }

    if (!authorUserId) {
      // Fallback: system or first active user
      const { data: fallbackUser } = await admin
        .from("usuarios")
        .select("id")
        .eq("activo", true)
        .limit(1)
        .maybeSingle();
      authorUserId = fallbackUser?.id ? Number(fallbackUser.id) : 1;
    }

    // 3. Insert into comentarios_contexto
    const { data: inserted, error: insertError } = await admin
      .from("comentarios_contexto")
      .insert({
        context_type: "servicio",
        context_id: resolvedEcc > 0 ? resolvedEcc : null,
        author_user_id: authorUserId,
        contenido: cleanContent,
        comment_kind: "nota",
        visibility_scope: "standard",
        related_entity_type: "osi",
        related_entity_id: osiId,
        related_service_id: resolvedEcc > 0 ? resolvedEcc : null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[createOsiComment] Error inserting comment:", insertError);
      return { success: false, error: insertError.message };
    }

    const commentId = Number(inserted?.id);
    if (commentId > 0) {
      // 4. Link via comentario_entidad_vinculos
      const { error: linkError } = await admin
        .from("comentario_entidad_vinculos")
        .insert({
          comentario_id: commentId,
          entity_type: "osi",
          entity_id: osiId,
        });

      if (linkError) {
        console.error("[createOsiComment] Error linking entity to comment:", linkError);
      }
    }

    return { success: true };
  } catch (err) {
    console.error("[createOsiComment] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error inesperado al registrar comentario",
    };
  }
}
