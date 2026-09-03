"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type { FacilitadorHistoryEntry } from "@/types";

export async function assignOSIToFacilitador(
  osiId: number,
  facilitadorId: number,
  source: "direct" | "requisicion" = "direct",
  nroSesion?: number | null,
) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const assignedBy = userResponse.data.user?.id || null;

  // nroSesion: null/undefined = all sessions; a specific number = that session only
  const sessionValue = nroSesion ?? null;

  // Find the currently active assignment for THIS session slot (not all assignments)
  let prevQuery = supabase
    .from("facilitador_osi_assignments")
    .select("id, facilitador_id, nro_sesion")
    .eq("osi_id", osiId)
    .eq("is_active", true);

  if (sessionValue === null) {
    prevQuery = prevQuery.is("nro_sesion", null);
  } else {
    prevQuery = prevQuery.eq("nro_sesion", sessionValue);
  }

  const { data: prevAssignment } = await prevQuery.maybeSingle();

  // If reassigning to a different facilitador for this slot, clean up the old one's data
  if (prevAssignment?.facilitador_id && prevAssignment.facilitador_id !== facilitadorId) {
    const oldFacilitadorId = prevAssignment.facilitador_id;
    await supabase
      .from("ejecucion_osi_participantes")
      .delete()
      .eq("osi_id", osiId)
      .eq("facilitador_id", oldFacilitadorId);
    await supabase
      .from("facilitador_acknowledgments")
      .delete()
      .eq("osi_id", osiId)
      .eq("facilitador_id", oldFacilitadorId);
  }

  // Deactivate only the existing active assignment for this session slot
  let deactivateQuery = supabase
    .from("facilitador_osi_assignments")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("osi_id", osiId)
    .eq("is_active", true);

  if (sessionValue === null) {
    deactivateQuery = deactivateQuery.is("nro_sesion", null);
  } else {
    deactivateQuery = deactivateQuery.eq("nro_sesion", sessionValue);
  }

  const { error: deactivateError } = await deactivateQuery;

  if (deactivateError) {
    console.error("Error deactivating previous assignment:", deactivateError);
    return { error: deactivateError.message };
  }

  // Insert new active assignment
  const { data, error } = await supabase
    .from("facilitador_osi_assignments")
    .insert({
      osi_id: osiId,
      facilitador_id: facilitadorId,
      assigned_by: assignedBy,
      source,
      is_active: true,
      nro_sesion: sessionValue,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating assignment:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/capacitacion/gestion-de-facilitadores");
  revalidatePath("/dashboard/capacitacion/gestion-osi");
  revalidatePath("/portal/facilitador/dashboard");

  return { success: true, data };
}

export async function unassignOSIToFacilitador(assignmentId: number) {
  const supabase = await createClient();

  // Fetch the assignment to get osi_id and facilitador_id before deactivating
  const { data: assignment } = await supabase
    .from("facilitador_osi_assignments")
    .select("osi_id, facilitador_id")
    .eq("id", assignmentId)
    .single();

  // Clean up the facilitador's participants and acknowledgments for this OSI
  if (assignment?.osi_id && assignment?.facilitador_id) {
    await supabase
      .from("ejecucion_osi_participantes")
      .delete()
      .eq("osi_id", assignment.osi_id)
      .eq("facilitador_id", assignment.facilitador_id);
    await supabase
      .from("facilitador_acknowledgments")
      .delete()
      .eq("osi_id", assignment.osi_id)
      .eq("facilitador_id", assignment.facilitador_id);
  }

  const { error } = await supabase
    .from("facilitador_osi_assignments")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", assignmentId);

  if (error) {
    console.error("Error unassigning:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/capacitacion/gestion-de-facilitadores");
  revalidatePath("/dashboard/capacitacion/gestion-osi");
  revalidatePath("/portal/facilitador/dashboard");

  return { success: true };
}

export async function getAssignmentsByFacilitador(facilitadorId: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("facilitador_osi_assignments")
    .select(`
      id,
      osi_id,
      facilitador_id,
      nro_sesion,
      source,
      is_active,
      created_at
    `)
    .eq("facilitador_id", facilitadorId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching assignments by facilitador:", error);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { data: [] };
  }

  const osiIds = data.map((a) => a.osi_id);

  const { data: osiData, error: osiError } = await supabase
    .from("v_osi_formato_completo")
    .select("*")
    .in("id_osi", osiIds)
    .order("fecha_emision", { ascending: false });

  if (osiError) {
    console.error("Error fetching OSI details:", osiError);
    return { error: osiError.message };
  }

  const assignments = data.map((assignment) => {
    const osi = osiData?.find((o) => o.id_osi === assignment.osi_id);
    return {
      ...assignment,
      osi,
    };
  });

  return { data: assignments };
}

/**
 * Full course-teaching history for a facilitador — one entry per OSI they were
 * ever assigned to OR were named on a processed requisición for. Inactive
 * assignments are included so the history captures OSIs the facilitador was
 * reassigned away from (they still taught that OSI). Sorted by the OSI's
 * execution start date descending; OSIs with no execution date (pending) sort
 * last.
 *
 * Two sources are unioned (deduped by osi_id):
 *  1. `facilitador_osi_assignments` — operational assignments (active + inactive)
 *  2. `requisiciones` with `estatus_admin = 'procesada'` — payment records. Both
 *     the top-level `id_osi` and each `osi_fixed_items[].id_osi` are read so
 *     multi-OSI requisiciones are fully captured.
 *
 * The `source` field on each row indicates which source(s) referenced the OSI
 * ("asignada" | "requisicion" | "ambas") so the UI can badge requisición-only
 * rows — a `cod_facilitador` on a requisición is technically "who gets paid",
 * usually but not always "who taught", so those rows are surfaced but flagged.
 */
export async function getFacilitadorHistory(
  facilitadorId: number,
): Promise<{ data: FacilitadorHistoryEntry[] | null; error: string | null }> {
  const supabase = await createClient();

  // ── Source A: facilitador_osi_assignments (all rows, active + inactive) ──
  const { data: assignments, error: assignError } = await supabase
    .from("facilitador_osi_assignments")
    .select("osi_id, nro_sesion, is_active, created_at")
    .eq("facilitador_id", facilitadorId)
    .order("created_at", { ascending: false });

  if (assignError) {
    console.error("Error fetching facilitador history assignments:", assignError);
    return { data: null, error: assignError.message };
  }

  // Most recent assignment metadata per osi_id (assignments are ordered
  // created_at desc, so the first occurrence wins).
  const assignmentByOsi = new Map<
    number,
    { is_active: boolean; created_at: string }
  >();
  for (const a of assignments ?? []) {
    if (!assignmentByOsi.has(a.osi_id)) {
      assignmentByOsi.set(a.osi_id, { is_active: a.is_active, created_at: a.created_at });
    }
  }

  // ── Source B: processed requisiciones naming this facilitador ─────────────
  // Read both the top-level id_osi AND each osi_fixed_items[].id_osi so
  // multi-OSI requisiciones are fully captured (per reportes.ts:657-659).
  const requisicionOsiIds = new Set<number>();
  const PAGE_SIZE = 1000;
  const MAX_PAGES = 10;
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data: reqRows, error: reqError } = await supabase
      .from("requisiciones")
      .select("id_osi, osi_fixed_items")
      .eq("cod_facilitador", facilitadorId)
      .eq("estatus_admin", "procesada")
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (reqError) {
      console.error("Error fetching facilitador history requisiciones:", reqError);
      // Non-fatal: keep whatever assignment data we have. Requisición-only
      // OSIs will be missed, but we don't fail the whole history over a
      // secondary source error.
      break;
    }
    const rows = reqRows ?? [];
    for (const r of rows) {
      if (typeof r.id_osi === "number" && Number.isFinite(r.id_osi)) {
        requisicionOsiIds.add(r.id_osi);
      }
      if (Array.isArray(r.osi_fixed_items)) {
        for (const raw of r.osi_fixed_items) {
          const item = raw as { id_osi?: number | null } | null;
          if (item && typeof item.id_osi === "number" && Number.isFinite(item.id_osi)) {
            requisicionOsiIds.add(item.id_osi);
          }
        }
      }
    }
    if (rows.length < PAGE_SIZE) break;
  }

  // ── Union of osi_ids from both sources ────────────────────────────────────
  const allOsiIds = [
    ...new Set<number>([...assignmentByOsi.keys(), ...requisicionOsiIds]),
  ];

  if (allOsiIds.length === 0) {
    return { data: [], error: null };
  }

  // ── Fetch OSI details once for the union (chunked .in() to stay under URL
  // limits, matching indicadores-facilitadores.ts IN_CHUNK_SIZE convention) ──
  type OsiDetailRow = {
    id_osi: number;
    nro_osi: string | null;
    servicio: string | null;
    nombre_empresa: string | null;
    fecha_inicio_real: string | null;
    sesiones_ejecucion: unknown;
    sesiones_programadas: unknown;
  };
  const IN_CHUNK_SIZE = 300;
  const osiById = new Map<number, OsiDetailRow>();
  let osiFetchError: string | null = null;
  for (let i = 0; i < allOsiIds.length; i += IN_CHUNK_SIZE) {
    const chunk = allOsiIds.slice(i, i + IN_CHUNK_SIZE);
    const { data: osiChunk, error: osiError } = await supabase
      .from("v_osi_formato_completo")
      .select(
        "id_osi, nro_osi, servicio, nombre_empresa, fecha_inicio_real, sesiones_ejecucion, sesiones_programadas",
      )
      .in("id_osi", chunk);
    if (osiError) {
      console.error("Error fetching OSI details for history:", osiError);
      osiFetchError = osiError.message;
      break;
    }
    for (const o of osiChunk ?? []) {
      osiById.set(o.id_osi, o);
    }
  }
  if (osiFetchError) {
    return { data: null, error: osiFetchError };
  }

  // ── Build rows: one per osi_id in the union, with source discriminator ───
  const rows: FacilitadorHistoryEntry[] = [];
  for (const osiId of allOsiIds) {
    const osi = osiById.get(osiId);
    if (!osi) continue;
    const inAssignments = assignmentByOsi.has(osiId);
    const inRequisiciones = requisicionOsiIds.has(osiId);
    const assignment = assignmentByOsi.get(osiId);
    rows.push({
      osi_id: osiId,
      nro_osi: osi.nro_osi,
      servicio: osi.servicio,
      nombre_empresa: osi.nombre_empresa,
      fecha_inicio_real: osi.fecha_inicio_real,
      sesiones_ejecucion: osi.sesiones_ejecucion,
      sesiones_programadas: osi.sesiones_programadas,
      assignment_active: assignment ? assignment.is_active : null,
      assigned_at: assignment ? assignment.created_at : null,
      source: inAssignments && inRequisiciones ? "ambas" : inRequisiciones ? "requisicion" : "asignada",
    });
  }

  // Sort by execution date desc, nulls last.
  rows.sort((a, b) => {
    if (!a.fecha_inicio_real && !b.fecha_inicio_real) return 0;
    if (!a.fecha_inicio_real) return 1;
    if (!b.fecha_inicio_real) return -1;
    return b.fecha_inicio_real.localeCompare(a.fecha_inicio_real);
  });

  return { data: rows, error: null };
}

export async function getAssignmentByOSI(osiId: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("facilitador_osi_assignments")
    .select(`
      id,
      osi_id,
      facilitador_id,
      nro_sesion,
      source,
      is_active,
      created_at,
      facilitadores (
        id,
        nombre_apellido,
        cedula,
        email,
        telefono
      )
    `)
    .eq("osi_id", osiId)
    .eq("is_active", true)
    .order("nro_sesion", { ascending: true, nullsFirst: true });

  if (error) {
    console.error("Error fetching assignments by OSI:", error);
    return { error: error.message };
  }

  // Return array (multiple facilitadores possible — one per session)
  return { data: data || [] };
}

/**
 * Get the active assignment for a specific session of an OSI.
 * Falls back to the NULL (all-sessions) assignment if no session-specific one exists.
 */
export async function getAssignmentByOSIAndSession(osiId: number, nroSesion: number) {
  const supabase = await createClient();

  // 1. Try session-specific assignment
  const { data: sessionAssignment } = await supabase
    .from("facilitador_osi_assignments")
    .select(`
      id,
      osi_id,
      facilitador_id,
      nro_sesion,
      source,
      is_active,
      created_at,
      facilitadores (
        id,
        nombre_apellido,
        cedula,
        email,
        telefono
      )
    `)
    .eq("osi_id", osiId)
    .eq("nro_sesion", nroSesion)
    .eq("is_active", true)
    .maybeSingle();

  if (sessionAssignment) return { data: sessionAssignment };

  // 2. Fall back to all-sessions assignment (nro_sesion IS NULL)
  const { data: allSessionsAssignment, error } = await supabase
    .from("facilitador_osi_assignments")
    .select(`
      id,
      osi_id,
      facilitador_id,
      nro_sesion,
      source,
      is_active,
      created_at,
      facilitadores (
        id,
        nombre_apellido,
        cedula,
        email,
        telefono
      )
    `)
    .eq("osi_id", osiId)
    .is("nro_sesion", null)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching assignment by OSI and session:", error);
    return { error: error.message };
  }

  return { data: allSessionsAssignment };
}

export async function getAllOSIsForAssignment() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("v_osi_lista")
    .select("id_osi, nro_osi, nombre_empresa, servicio, tipo_servicio, fecha_emision, sesiones_ejecucion")
    .order("id_osi", { ascending: false });

  if (error) {
    console.error("Error fetching OSIs for assignment:", error);
    return [];
  }

  return data || [];
}

export async function getActiveFacilitatorsForDropdown() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("facilitadores")
    .select("id, nombre_apellido, cedula, email, is_active")
    .eq("is_active", true)
    .order("nombre_apellido");

  if (error) {
    console.error("Error fetching facilitators for dropdown:", error);
    return [];
  }

  return data || [];
}

/**
 * Get all assignments (active and/or inactive) enriched with facilitador + OSI data.
 * Used by the "Asignaciones y Credenciales" management page.
 *
 * - activeOnly: true → only is_active=true; false → only is_active=false; undefined → all
 * - staleDays: when provided, computes days_since_end and is_stale flag based on
 *   the OSI's fecha_fin_real. Assignments whose OSI has no fecha_fin_real are never stale.
 */
export async function getAllAssignments(opts?: {
  activeOnly?: boolean;
  staleDays?: number;
}) {
  const supabase = await createClient();
  const staleDays = opts?.staleDays ?? 30;

  let query = supabase
    .from("facilitador_osi_assignments")
    .select(`
      id,
      osi_id,
      facilitador_id,
      nro_sesion,
      source,
      is_active,
      assigned_by,
      created_at,
      updated_at,
      facilitadores (
        id,
        nombre_apellido,
        cedula,
        email,
        is_active
      )
    `)
    .order("created_at", { ascending: false });

  if (opts?.activeOnly === true) {
    query = query.eq("is_active", true);
  } else if (opts?.activeOnly === false) {
    query = query.eq("is_active", false);
  }

  const { data: assignments, error } = await query;

  if (error) {
    console.error("Error fetching all assignments:", error);
    return { error: error.message };
  }

  if (!assignments || assignments.length === 0) {
    return { data: [] };
  }

  const osiIds = Array.from(new Set(assignments.map((a) => a.osi_id)));

  const { data: osiData, error: osiError } = await supabase
    .from("v_osi_formato_completo")
    .select("id_osi, nro_osi, nombre_empresa, servicio, fecha_fin_real, fecha_emision, id_estatus")
    .in("id_osi", osiIds);

  if (osiError) {
    console.error("Error fetching OSI details for all assignments:", osiError);
    return { error: osiError.message };
  }

  const osiMap = new Map((osiData || []).map((o) => [o.id_osi, o]));
  const now = Date.now();

  const enriched = assignments.map((a) => {
    const osi = osiMap.get(a.osi_id);
    const fechaFinReal = osi?.fecha_fin_real ?? null;
    let daysSinceEnd: number | null = null;
    if (fechaFinReal) {
      const diff = now - new Date(fechaFinReal).getTime();
      daysSinceEnd = Math.floor(diff / 86400000);
    }
    return {
      ...a,
      osi: osi || null,
      days_since_end: daysSinceEnd,
      is_stale: daysSinceEnd != null && daysSinceEnd > staleDays,
    };
  });

  return { data: enriched };
}

/**
 * Bulk-deactivate assignments. Reuses the cleanup logic from unassignOSIToFacilitador:
 * for each assignment, deletes the facilitador's participants and acknowledgments for
 * that OSI, then sets is_active=false.
 */
export async function bulkUnassignAssignments(assignmentIds: number[]) {
  const supabase = await createClient();
  const succeeded: number[] = [];
  const failed: { id: number; error: string }[] = [];

  for (const assignmentId of assignmentIds) {
    try {
      const { data: assignment } = await supabase
        .from("facilitador_osi_assignments")
        .select("osi_id, facilitador_id")
        .eq("id", assignmentId)
        .single();

      if (assignment?.osi_id && assignment?.facilitador_id) {
        await supabase
          .from("ejecucion_osi_participantes")
          .delete()
          .eq("osi_id", assignment.osi_id)
          .eq("facilitador_id", assignment.facilitador_id);
        await supabase
          .from("facilitador_acknowledgments")
          .delete()
          .eq("osi_id", assignment.osi_id)
          .eq("facilitador_id", assignment.facilitador_id);
      }

      const { error } = await supabase
        .from("facilitador_osi_assignments")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", assignmentId);

      if (error) {
        failed.push({ id: assignmentId, error: error.message });
      } else {
        succeeded.push(assignmentId);
      }
    } catch (err) {
      failed.push({
        id: assignmentId,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  revalidatePath("/dashboard/capacitacion/gestion-de-facilitadores");
  revalidatePath("/dashboard/capacitacion/gestion-osi");
  revalidatePath("/dashboard/capacitacion/gestion-asignaciones");
  revalidatePath("/portal/facilitador/dashboard");

  return { success: succeeded.length, failed };
}

/**
 * Aggregate stats for the metrics row on the Asignaciones y Credenciales page.
 * staleDays controls the stale_count threshold (based on fecha_fin_real).
 */
export async function getAssignmentStats(staleDays = 30) {
  const supabase = await createClient();

  // Active assignments count
  const { count: totalActive, error: activeErr } = await supabase
    .from("facilitador_osi_assignments")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  if (activeErr) {
    console.error("Error counting active assignments:", activeErr);
  }

  // Inactive assignments count
  const { count: totalInactive, error: inactiveErr } = await supabase
    .from("facilitador_osi_assignments")
    .select("*", { count: "exact", head: true })
    .eq("is_active", false);

  if (inactiveErr) {
    console.error("Error counting inactive assignments:", inactiveErr);
  }

  // Active credentials count
  const { count: activeCredentials, error: credActiveErr } = await supabase
    .from("facilitador_credenciales")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  if (credActiveErr) {
    console.error("Error counting active credentials:", credActiveErr);
  }

  // Total credentials count
  const { count: totalCredentials, error: credTotalErr } = await supabase
    .from("facilitador_credenciales")
    .select("*", { count: "exact", head: true });

  if (credTotalErr) {
    console.error("Error counting total credentials:", credTotalErr);
  }

  // Stale count: active assignments whose OSI fecha_fin_real is older than staleDays
  let staleCount = 0;
  const { data: activeAssignments } = await supabase
    .from("facilitador_osi_assignments")
    .select("osi_id")
    .eq("is_active", true);

  if (activeAssignments && activeAssignments.length > 0) {
    const osiIds = Array.from(new Set(activeAssignments.map((a) => a.osi_id)));
    const { data: osis } = await supabase
      .from("v_osi_formato_completo")
      .select("id_osi, fecha_fin_real")
      .in("id_osi", osiIds);

    const now = Date.now();
    const staleOsiIds = new Set<number>();
    for (const o of osis || []) {
      if (o.fecha_fin_real) {
        const diff = now - new Date(o.fecha_fin_real).getTime();
        if (Math.floor(diff / 86400000) > staleDays) {
          staleOsiIds.add(o.id_osi);
        }
      }
    }
    staleCount = activeAssignments.filter((a) => staleOsiIds.has(a.osi_id)).length;
  }

  return {
    total_active: totalActive ?? 0,
    total_inactive: totalInactive ?? 0,
    stale_count: staleCount,
    total_credentials: totalCredentials ?? 0,
    active_credentials: activeCredentials ?? 0,
  };
}

/**
 * Single consolidated fetch for the Asignaciones y Credenciales page.
 * Returns all assignments (active + inactive), all credentials, and computed stats
 * in ONE server action call with 3 DB queries instead of 4 action calls + 11 queries.
 *
 * Stats are computed from the already-fetched data, avoiding redundant count queries.
 */
export async function getAsignacionesPageData(staleDays = 30) {
  const supabase = await createClient();

  // 1. Fetch ALL assignments (active + inactive) in a single query
  const { data: assignments, error: assignError } = await supabase
    .from("facilitador_osi_assignments")
    .select(`
      id,
      osi_id,
      facilitador_id,
      nro_sesion,
      source,
      is_active,
      assigned_by,
      created_at,
      updated_at,
      facilitadores (
        id,
        nombre_apellido,
        cedula,
        email,
        is_active
      )
    `)
    .order("created_at", { ascending: false });

  // 2. Fetch all credentials in parallel
  const { data: credentials, error: credError } = await supabase
    .from("facilitador_credenciales")
    .select(`
      id,
      facilitador_id,
      username,
      is_active,
      created_at,
      updated_at,
      facilitadores (
        id,
        nombre_apellido,
        cedula,
        email,
        is_active
      )
    `)
    .order("created_at", { ascending: false });

  if (assignError) {
    console.error("Error fetching all assignments:", assignError);
    return { error: assignError.message };
  }
  if (credError) {
    console.error("Error fetching all credentials:", credError);
    return { error: credError.message };
  }

  // 3. Fetch OSI data for all referenced OSIs (single query)
  const osiIds = Array.from(new Set((assignments || []).map((a) => a.osi_id)));
  let osiMap = new Map<number, {
    id_osi: number;
    nro_osi: string;
    nombre_empresa: string | null;
    servicio: string | null;
    fecha_fin_real: string | null;
    fecha_emision: string | null;
    id_estatus: number | null;
  }>();

  if (osiIds.length > 0) {
    const { data: osiData, error: osiError } = await supabase
      .from("v_osi_formato_completo")
      .select("id_osi, nro_osi, nombre_empresa, servicio, fecha_fin_real, fecha_emision, id_estatus")
      .in("id_osi", osiIds);

    if (osiError) {
      console.error("Error fetching OSI details for page data:", osiError);
    } else {
      osiMap = new Map((osiData || []).map((o) => [o.id_osi, o]));
    }
  }

  // Enrich assignments with OSI data + stale computation
  const now = Date.now();
  const enrichedAssignments = (assignments || []).map((a) => {
    const osi = osiMap.get(a.osi_id) || null;
    const fechaFinReal = osi?.fecha_fin_real ?? null;
    let daysSinceEnd: number | null = null;
    if (fechaFinReal) {
      const diff = now - new Date(fechaFinReal).getTime();
      daysSinceEnd = Math.floor(diff / 86400000);
    }
    return {
      ...a,
      osi,
      days_since_end: daysSinceEnd,
      is_stale: daysSinceEnd != null && daysSinceEnd > staleDays,
    };
  });

  // Compute stats from the already-fetched data (no extra DB queries)
  const activeAssignments = enrichedAssignments.filter((a) => a.is_active === true);
  const inactiveAssignments = enrichedAssignments.filter((a) => a.is_active === false);
  const staleCount = activeAssignments.filter((a) => a.is_stale).length;
  const allCreds = credentials || [];
  const activeCreds = allCreds.filter((c) => c.is_active === true);

  return {
    data: {
      assignments: enrichedAssignments,
      credentials: allCreds,
      stats: {
        total_active: activeAssignments.length,
        total_inactive: inactiveAssignments.length,
        stale_count: staleCount,
        total_credentials: allCreds.length,
        active_credentials: activeCreds.length,
      },
    },
  };
}
