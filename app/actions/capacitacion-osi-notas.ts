"use server";

import { createAdminClient, createClient } from "@/utils/supabase/server";
import type { OsiNota } from "@/types";

/**
 * Fetch notes for multiple OSIs, grouped by osi_id.
 * Resolves author names via usuarios.id_auth.
 */
export async function getOsiNotas(
  osiIds: number[],
): Promise<{ success: boolean; data?: Record<number, OsiNota[]>; error?: string }> {
  if (!Array.isArray(osiIds) || osiIds.length === 0) {
    return { success: true, data: {} };
  }

  try {
    const admin = await createAdminClient();

    // Fetch all notes for the given OSIs
    const { data: notas, error: notasError } = await admin
      .from("capacitacion_osi_notas")
      .select("id, osi_id, nota, created_at, created_by")
      .in("osi_id", osiIds)
      .order("created_at", { ascending: false });

    if (notasError) {
      console.error("[capacitacion-osi-notas] Error fetching notas:", notasError);
      return { success: false, error: notasError.message };
    }

    // Collect unique created_by UUIDs to resolve names
    const userIds = new Set<string>();
    for (const n of notas ?? []) {
      if (n.created_by) userIds.add(n.created_by);
    }

    let userNameMap: Record<string, string | null> = {};
    if (userIds.size > 0) {
      const { data: usuarios, error: usuariosError } = await admin
        .from("usuarios")
        .select("id_auth, nombre")
        .in("id_auth", Array.from(userIds));

      if (!usuariosError && usuarios) {
        for (const u of usuarios) {
          userNameMap[u.id_auth] = u.nombre ?? null;
        }
      }
    }

    // Group by osi_id and build OsiNota objects
    const result: Record<number, OsiNota[]> = {};
    for (const osiId of osiIds) {
      result[osiId] = [];
    }

    for (const n of notas ?? []) {
      const autorNombre = n.created_by ? userNameMap[n.created_by] ?? null : null;
      result[n.osi_id].push({
        id: n.id as number,
        osiId: n.osi_id as number,
        nota: n.nota as string,
        createdAt: n.created_at as string,
        autorNombre,
      });
    }

    return { success: true, data: result };
  } catch (err) {
    console.error("[capacitacion-osi-notas] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

/**
 * Add a new note to an OSI.
 * Stamps created_by from the current user.
 */
export async function addOsiNota(
  osiId: number,
  nota: string,
): Promise<{ success: boolean; data?: OsiNota; error?: string }> {
  if (!Number.isFinite(osiId) || osiId <= 0) {
    return { success: false, error: "OSI id inválido" };
  }

  const trimmed = (nota ?? "").trim();
  if (!trimmed) {
    return { success: false, error: "La nota no puede estar vacía" };
  }

  if (trimmed.length > 2000) {
    return { success: false, error: "La nota no puede exceder 2000 caracteres" };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    const admin = await createAdminClient();

    // Insert the note
    const { data: inserted, error: insertError } = await admin
      .from("capacitacion_osi_notas")
      .insert({
        osi_id: osiId,
        nota: trimmed,
        created_by: userId,
      })
      .select("id, osi_id, nota, created_at, created_by")
      .single();

    if (insertError) {
      console.error("[capacitacion-osi-notas] Error inserting nota:", insertError);
      return { success: false, error: insertError.message };
    }

    // Resolve author name
    let autorNombre: string | null = null;
    if (userId) {
      const { data: usuario } = await admin
        .from("usuarios")
        .select("nombre")
        .eq("id_auth", userId)
        .single();
      autorNombre = usuario?.nombre ?? null;
    }

    return {
      success: true,
      data: {
        id: inserted.id as number,
        osiId: inserted.osi_id as number,
        nota: inserted.nota as string,
        createdAt: inserted.created_at as string,
        autorNombre,
      },
    };
  } catch (err) {
    console.error("[capacitacion-osi-notas] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

/**
 * Delete a note by id.
 * (No author check — authenticated users can delete any note.)
 */
export async function deleteOsiNota(
  notaId: number,
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(notaId) || notaId <= 0) {
    return { success: false, error: "Nota id inválido" };
  }

  try {
    const admin = await createAdminClient();

    const { error: deleteError } = await admin
      .from("capacitacion_osi_notas")
      .delete()
      .eq("id", notaId);

    if (deleteError) {
      console.error("[capacitacion-osi-notas] Error deleting nota:", deleteError);
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[capacitacion-osi-notas] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}
