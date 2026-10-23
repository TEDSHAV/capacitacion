"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type { FacilitadorHistoryEntry } from "@/types";
import { notifyMercadeoFacilitadorAssigned } from "@/lib/email/notify-mercadeo-assignment";
import { getSessionCount } from "@/lib/osi-utils";

import { toTitleCase } from "@/utils/string-utils";


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

  // 1. Fetch ALL active assignments for this OSI to validate session collision
  const { data: activeAssignments, error: activeErr } = await supabase
    .from("facilitador_osi_assignments")
    .select(`
      id,
      facilitador_id,
      nro_sesion,
      facilitadores (
        id,
        nombre_apellido
      )
    `)
    .eq("osi_id", osiId)
    .eq("is_active", true);

  if (activeErr) {
    console.error("Error fetching active assignments:", activeErr);
    return { error: activeErr.message };
  }

  const otherAssignments = (activeAssignments || []).filter(
    (a) => a.facilitador_id !== facilitadorId
  );

  const getFacilitadorName = (record: any) => {
    if (!record) return "otro facilitador";
    const fac = record.facilitadores;
    if (Array.isArray(fac) && fac.length > 0) {
      return toTitleCase(fac[0]?.nombre_apellido || "otro facilitador");
    }
    if (fac && typeof fac === "object" && "nombre_apellido" in fac) {
      return toTitleCase((fac as any).nombre_apellido || "otro facilitador");
    }
    return "otro facilitador";
  };

  // Validation 1: Assigning "Todas las sesiones" (sessionValue === null)
  if (sessionValue === null) {
    if (otherAssignments.length > 0) {
      const allAssigned = otherAssignments.find((a) => a.nro_sesion === null);
      if (allAssigned) {
        const otherName = getFacilitadorName(allAssigned);
        return {
          error: `No se puede asignar 'Todas las sesiones' porque ya están asignadas al facilitador ${otherName}. Desasigne primero al facilitador actual en Gestión OSI.`,
        };
      }
      const sessionsList = otherAssignments
        .map((a) => `Sesión ${a.nro_sesion} (${getFacilitadorName(a)})`)
        .join(", ");
      return {
        error: `No se puede asignar 'Todas las sesiones' porque ya existen sesiones asignadas a otros facilitadores: ${sessionsList}. Debe desasignar dichas sesiones primero.`,
      };
    }
  } else {
    // Validation 2: Assigning a specific session (sessionValue !== null, e.g. 1, 2, ...)
    // 2a. Does another facilitador have "Todas las sesiones"?
    const globalOther = otherAssignments.find((a) => a.nro_sesion === null);
    if (globalOther) {
      const otherName = getFacilitadorName(globalOther);
      return {
        error: `No se puede asignar la Sesión ${sessionValue} porque el facilitador ${otherName} tiene asignadas todas las sesiones de esta OSI. Desasígnelo primero en Gestión OSI.`,
      };
    }

    // 2b. Does another facilitador have this exact session?
    const slotOther = otherAssignments.find((a) => a.nro_sesion === sessionValue);
    if (slotOther) {
      const otherName = getFacilitadorName(slotOther);
      return {
        error: `La Sesión ${sessionValue} ya está asignada al facilitador ${otherName}. Desasigne esa sesión primero para poder reasignarla a otro facilitador.`,
      };
    }
  }

  // Deactivate previous assignment for this slot
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

  // Also if this same facilitador previously had a global assignment and is now assigned to a specific session,
  // deactivate their global row so they are now scoped to specific sessions
  if (sessionValue !== null) {
    await supabase
      .from("facilitador_osi_assignments")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("osi_id", osiId)
      .eq("facilitador_id", facilitadorId)
      .is("nro_sesion", null)
      .eq("is_active", true);
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

  // Asynchronously notify Mercadeo
  notifyMercadeoFacilitadorAssigned({
    osiId,
    facilitadorId,
    assignmentId: data.id,
    assignedBy,
  }).catch((err) => {
    console.error("[assignOSIToFacilitador] Error sending notification to Mercadeo:", err);
  });

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

  const { error } = await supabase
    .from("facilitador_osi_assignments")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", assignmentId);

  if (error) {
    console.error("Error unassigning:", error);
    return { error: error.message };
  }

  // Clean up the facilitador's participants ONLY if they have no other active assignments on this OSI
  if (assignment?.osi_id && assignment?.facilitador_id) {
    const { count } = await supabase
      .from("facilitador_osi_assignments")
      .select("id", { count: "exact", head: true })
      .eq("osi_id", assignment.osi_id)
      .eq("facilitador_id", assignment.facilitador_id)
      .eq("is_active", true);

    if (!count || count === 0) {
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
    .select("id, nombre_apellido, cedula, email, telefono, is_active")
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

  // 3. Fetch OSI data, participant uploads, and attachment counts (in parallel)
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

  const participantInfoMap = new Map<string, { status: "final" | "draft"; count: number }>();
  const attachmentCountMap = new Map<string, number>();

  const [osiDataRes, participantsRes, attachmentsRes, canManageUploads] = await Promise.all([
    osiIds.length > 0
      ? supabase
          .from("v_osi_formato_completo")
          .select("id_osi, nro_osi, nombre_empresa, servicio, fecha_fin_real, fecha_emision, id_estatus")
          .in("id_osi", osiIds)
      : Promise.resolve({ data: [], error: null }),
    osiIds.length > 0
      ? supabase
          .from("ejecucion_osi_participantes")
          .select("osi_id, facilitador_id, status")
          .in("osi_id", osiIds)
      : Promise.resolve({ data: [], error: null }),
    osiIds.length > 0
      ? supabase
          .from("ejecucion_osi_asistencia")
          .select("osi_id, facilitador_id")
          .in("osi_id", osiIds)
      : Promise.resolve({ data: [], error: null }),
    checkCanResetOsiUploads(),
  ]);

  if (osiDataRes.error) {
    console.error("Error fetching OSI details for page data:", osiDataRes.error);
  } else {
    osiMap = new Map((osiDataRes.data || []).map((o) => [o.id_osi, o]));
  }

  for (const p of participantsRes.data || []) {
    const key = `${p.osi_id}_${p.facilitador_id}`;
    const existing = participantInfoMap.get(key) || { status: "draft", count: 0 };
    existing.count += 1;
    if (p.status === "final") {
      existing.status = "final";
    }
    participantInfoMap.set(key, existing);
  }

  for (const a of attachmentsRes.data || []) {
    const key = `${a.osi_id}_${a.facilitador_id}`;
    attachmentCountMap.set(key, (attachmentCountMap.get(key) || 0) + 1);
  }

  // Enrich assignments with OSI data + stale computation + upload status
  const now = Date.now();
  const enrichedAssignments = (assignments || []).map((a) => {
    const osi = osiMap.get(a.osi_id) || null;
    const fechaFinReal = osi?.fecha_fin_real ?? null;
    let daysSinceEnd: number | null = null;
    if (fechaFinReal) {
      const diff = now - new Date(fechaFinReal).getTime();
      daysSinceEnd = Math.floor(diff / 86400000);
    }
    const partInfo = participantInfoMap.get(`${a.osi_id}_${a.facilitador_id}`);
    const attCount = attachmentCountMap.get(`${a.osi_id}_${a.facilitador_id}`) || 0;

    return {
      ...a,
      osi,
      days_since_end: daysSinceEnd,
      is_stale: daysSinceEnd != null && daysSinceEnd > staleDays,
      participant_status: partInfo ? partInfo.status : null,
      participants_count: partInfo ? partInfo.count : 0,
      attachments_count: attCount,
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
        can_manage_uploads: canManageUploads.authorized,
      },
    },
  };
}

export interface OsiSessionDetail {
  nro_sesion: number;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
}

export interface OsiSessionInfoResult {
  totalCount: number;
  sessions: OsiSessionDetail[];
}

/**
 * Returns full session details and real total count for an OSI, taking the maximum
 * across all sources (osi_sesion, desglose, sesiones_programadas, sesiones_solped,
 * sesiones_ejecucion, existing assignments). Ensures that sessions without a confirmed
 * date are still visible and assignable to facilitadores.
 */
export async function getOsiSessionInfo(osiId: number): Promise<OsiSessionInfoResult> {
  try {
    const admin = await createAdminClient();

    const [osiSesionRes, viewRes, assignRes] = await Promise.all([
      admin
        .from("osi_sesion")
        .select("nro_sesion, fecha, hora_inicio, hora_fin")
        .eq("id_osi", osiId)
        .order("nro_sesion", { ascending: true }),
      admin
        .from("v_osi_formato_completo")
        .select("desglose_recursos_sesiones, sesiones_programadas, sesiones_solped, sesiones_ejecucion")
        .eq("id_osi", osiId)
        .maybeSingle(),
      admin
        .from("facilitador_osi_assignments")
        .select("nro_sesion")
        .eq("osi_id", osiId)
        .eq("is_active", true),
    ]);

    const osiSesionRows = osiSesionRes.data || [];
    const viewData: Record<string, any> = (viewRes.data as any) || {};
    const assignRows = assignRes.data || [];

    const osiSesionCount = osiSesionRows.length;
    const maxOsiSesionNro = osiSesionRows.reduce((max, s) => Math.max(max, s.nro_sesion || 0), 0);
    const viewCount = getSessionCount(viewData);
    const maxAssignNro = assignRows.reduce((max, a) => Math.max(max, a.nro_sesion || 0), 0);

    const totalCount = Math.max(
      osiSesionCount,
      maxOsiSesionNro,
      viewCount,
      maxAssignNro,
      1,
    );

    const sessionsMap = new Map<number, OsiSessionDetail>();

    // Seed 1..totalCount so every session number exists
    for (let n = 1; n <= totalCount; n++) {
      sessionsMap.set(n, {
        nro_sesion: n,
        fecha: null,
        hora_inicio: null,
        hora_fin: null,
      });
    }

    // Populate from desglose_recursos_sesiones if available
    if (Array.isArray(viewData.desglose_recursos_sesiones)) {
      viewData.desglose_recursos_sesiones.forEach((item: any, idx: number) => {
        const nro = Number(item.nro_sesion ?? item.id_sesion ?? idx + 1);
        if (nro >= 1) {
          const cur = sessionsMap.get(nro) || { nro_sesion: nro, fecha: null, hora_inicio: null, hora_fin: null };
          if (item.fecha && typeof item.fecha === "string" && item.fecha.trim()) {
            cur.fecha = item.fecha.trim();
          }
          if (item.hora_inicio) cur.hora_inicio = String(item.hora_inicio).trim() || null;
          if (item.hora_fin) cur.hora_fin = String(item.hora_fin).trim() || null;
          sessionsMap.set(nro, cur);
        }
      });
    }

    // Populate from sesiones_programadas if available
    if (Array.isArray(viewData.sesiones_programadas)) {
      viewData.sesiones_programadas.forEach((item: any, idx: number) => {
        const nro = Number(item.nro_sesion ?? idx + 1);
        if (nro >= 1) {
          const cur = sessionsMap.get(nro) || { nro_sesion: nro, fecha: null, hora_inicio: null, hora_fin: null };
          if (item.fecha && typeof item.fecha === "string" && item.fecha.trim()) {
            cur.fecha = item.fecha.trim();
          }
          if (item.hora_inicio) cur.hora_inicio = String(item.hora_inicio).trim() || null;
          if (item.hora_fin) cur.hora_fin = String(item.hora_fin).trim() || null;
          sessionsMap.set(nro, cur);
        }
      });
    }

    // Populate/override from osi_sesion rows (highest fidelity for confirmed dates)
    for (const row of osiSesionRows) {
      const nro = row.nro_sesion;
      if (nro >= 1) {
        const cur = sessionsMap.get(nro) || { nro_sesion: nro, fecha: null, hora_inicio: null, hora_fin: null };
        if (row.fecha && typeof row.fecha === "string" && row.fecha.trim()) {
          cur.fecha = row.fecha.trim();
        }
        if (row.hora_inicio) cur.hora_inicio = String(row.hora_inicio).trim() || null;
        if (row.hora_fin) cur.hora_fin = String(row.hora_fin).trim() || null;
        sessionsMap.set(nro, cur);
      }
    }

    const sessions = Array.from(sessionsMap.values()).sort((a, b) => a.nro_sesion - b.nro_sesion);

    return {
      totalCount: Math.max(totalCount, sessions.length),
      sessions,
    };
  } catch (err) {
    console.error("[getOsiSessionInfo] Error:", err);
    return {
      totalCount: 1,
      sessions: [{ nro_sesion: 1, fecha: null, hora_inicio: null, hora_fin: null }],
    };
  }
}

/**
 * Verifies if the current user has permission to reset or unlock facilitador uploads.
 * Restricted to:
 * 1. Admin or Superadmin (from JWT claims / user role)
 * 2. TED members (departamento id 6, or departamento nombre containing TED / Tecnologia)
 * 3. Coordinador de Capacitacion (departamentos.coordinador for Capacitacion, or
 *    Capacitacion department member with cargo containing 'coordinador', or coordinador role in authprisma)
 */
export async function checkCanResetOsiUploads(): Promise<{ authorized: boolean; reason?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { authorized: false, reason: "No autenticado" };

    // 1. Fast-path: Check JWT claims for admin/superadmin or department 6 (TED)
    const { data: claimsData } = await supabase.auth.getClaims();
    const userRole =
      ((claimsData?.claims as Record<string, unknown> | undefined)?.user_role as string) ??
      ((claimsData?.claims?.app_metadata as Record<string, unknown> | undefined)?.role as string) ??
      null;

    if (userRole === "admin" || userRole === "superadmin") {
      return { authorized: true };
    }

    const deptoClaim = (claimsData?.claims?.app_metadata as Record<string, unknown> | undefined)?.departamento;
    if (typeof deptoClaim === "number" && deptoClaim === 6) {
      return { authorized: true };
    }

    // 2. Query usuarios table with department join
    const admin = await createAdminClient();
    const { data: usuario } = await admin
      .from("usuarios")
      .select("id, cargo, departamento, departamentos!usuarios_departamento_fkey(id, nombre, coordinador)")
      .eq("id_auth", user.id)
      .maybeSingle();

    if (!usuario) {
      return { authorized: false, reason: "Usuario no registrado en la base de datos" };
    }

    const deptId = usuario.departamento || (usuario.departamentos as any)?.id;
    const deptName = (usuario.departamentos as any)?.nombre || "";

    // TED check: department id 6 or name matching TED / Tecnología
    if (deptId === 6 || /ted|tecnolog/i.test(deptName)) {
      return { authorized: true };
    }

    // Capacitación Coordinador check:
    // a) Is user the designated coordinador in departamentos table for Capacitación?
    const { data: capDept } = await admin
      .from("departamentos")
      .select("id, nombre, coordinador")
      .ilike("nombre", "%capacitaci%")
      .maybeSingle();

    if (capDept && capDept.coordinador === usuario.id) {
      return { authorized: true };
    }

    // b) Does user belong to Capacitación and have cargo containing "coordinador"?
    const isCapacitacion = deptId === 3 || /capacitaci/i.test(deptName);
    const isCoordinadorCargo = /coordinador/i.test(usuario.cargo || "");
    if (isCapacitacion && isCoordinadorCargo) {
      return { authorized: true };
    }

    // c) Check user roles in authprisma for scapacitacion
    const { data: appRoles } = await supabase
      .schema("authprisma")
      .from("user_app_roles")
      .select("apps!inner(slug), roles!inner(slug)")
      .eq("id_usuario", usuario.id);

    if (Array.isArray(appRoles)) {
      const hasCapRole = appRoles.some((r: any) =>
        r.apps?.slug === "scapacitacion" &&
        (r.roles?.slug === "admin" || r.roles?.slug === "superadmin" || r.roles?.slug === "coordinador")
      );
      if (hasCapRole) return { authorized: true };
    }

    return { authorized: false, reason: "Solo usuarios de TED o el Coordinador de Capacitación tienen permisos para esta acción" };
  } catch (err) {
    console.error("[checkCanResetOsiUploads] Error checking permissions:", err);
    return { authorized: false, reason: "Error al verificar permisos" };
  }
}

/**
 * Returns count of certificates already generated for an OSI.
 */
export async function getOsiCertificatesCount(osiId: number, nroOsi?: string | number): Promise<number> {
  const supabase = await createAdminClient();
  let query = supabase.from("certificados").select("id", { count: "exact", head: true });

  if (nroOsi) {
    const num = typeof nroOsi === "number" ? nroOsi : parseInt(String(nroOsi).replace(/\D/g, ""), 10);
    if (!isNaN(num)) {
      query = query.or(`id_osi.eq.${osiId},nro_osi.eq.${num}`);
    } else {
      query = query.eq("id_osi", osiId);
    }
  } else {
    query = query.eq("id_osi", osiId);
  }

  const { count, error } = await query;
  if (error) {
    console.error("Error checking certificates count:", error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Option A: Reopen an OSI for editing (remove final block).
 * Keeps uploaded participants and support files, but reverts participant status to 'draft'
 * and removes acknowledgment, so the facilitator can edit and resend.
 */
export async function reopenFacilitadorOSI(osiId: number, facilitadorId: number) {
  const authCheck = await checkCanResetOsiUploads();
  if (!authCheck.authorized) {
    return { error: authCheck.reason || "No autorizado" };
  }

  const supabase = await createAdminClient();

  // 1. Update participants to draft
  const { error: partErr } = await supabase
    .from("ejecucion_osi_participantes")
    .update({ status: "draft" })
    .eq("osi_id", osiId)
    .eq("facilitador_id", facilitadorId);

  if (partErr) {
    console.error("[reopenFacilitadorOSI] Error updating participants:", partErr);
    return { error: partErr.message };
  }

  // 2. Delete acknowledgment so facilitator must re-confirm upon submission
  await supabase
    .from("facilitador_acknowledgments")
    .delete()
    .eq("osi_id", osiId)
    .eq("facilitador_id", facilitadorId);

  revalidatePath("/dashboard/capacitacion/gestion-asignaciones");
  revalidatePath(`/portal/facilitador/osi/${osiId}`);
  revalidatePath("/portal/facilitador/dashboard");
  revalidatePath("/dashboard/capacitacion/auditoria-soportes");
  revalidatePath("/dashboard/capacitacion/seguimiento-servicios");

  return { success: true, message: "El servicio fue reabierto exitosamente. El facilitador ya puede editar los participantes y documentos en su portal." };
}

/**
 * Option B: Full reset of facilitator uploads for an OSI.
 * Deletes participants, attachments, storage files, acknowledgment, and resets process steps.
 */
export async function resetFacilitadorOSI(
  osiId: number,
  facilitadorId: number,
  force = false,
  nroOsi?: string | number,
) {
  const authCheck = await checkCanResetOsiUploads();
  if (!authCheck.authorized) {
    return { error: authCheck.reason || "No autorizado" };
  }

  const supabase = await createAdminClient();

  // Check certificates if not forced
  if (!force) {
    const certCount = await getOsiCertificatesCount(osiId, nroOsi);
    if (certCount > 0) {
      return {
        error: "EXISTING_CERTIFICATES",
        certCount,
        message: `Existen ${certCount} certificado(s) emitidos para esta OSI. Confirma que deseas reiniciar la carga a pesar de ello.`,
      };
    }
  }

  // 1. Delete participants
  const { error: partErr } = await supabase
    .from("ejecucion_osi_participantes")
    .delete()
    .eq("osi_id", osiId)
    .eq("facilitador_id", facilitadorId);

  if (partErr) {
    console.error("[resetFacilitadorOSI] Error deleting participants:", partErr);
    return { error: partErr.message };
  }

  // 2. Delete acknowledgment
  await supabase
    .from("facilitador_acknowledgments")
    .delete()
    .eq("osi_id", osiId)
    .eq("facilitador_id", facilitadorId);

  // 3. Delete attachments in Storage bucket
  const { data: attachments } = await supabase
    .from("ejecucion_osi_asistencia")
    .select("storage_path")
    .eq("osi_id", osiId)
    .eq("facilitador_id", facilitadorId);

  const storagePaths = (attachments || []).map((a) => a.storage_path).filter(Boolean);
  if (storagePaths.length > 0) {
    const { error: storageErr } = await supabase.storage
      .from("facilitador-uploads")
      .remove(storagePaths);
    if (storageErr) {
      console.warn("[resetFacilitadorOSI] Warning removing files from storage:", storageErr);
    }
  }

  // 4. Delete attachment records in DB
  await supabase
    .from("ejecucion_osi_asistencia")
    .delete()
    .eq("osi_id", osiId)
    .eq("facilitador_id", facilitadorId);

  // 5. Reset execution process steps for this OSI
  await supabase
    .from("capacitacion_proceso_steps")
    .update({ completed: false, completed_at: null, completed_by: null })
    .eq("osi_id", osiId)
    .eq("phase", "ejecucion")
    .in("step_key", ["lista_asistencia", "calificacion", "material_fotografico", "en_proceso"]);

  // 6. Reset attachment_received flag on the assignment
  await supabase
    .from("facilitador_osi_assignments")
    .update({ attachment_received: false, updated_at: new Date().toISOString() })
    .eq("osi_id", osiId)
    .eq("facilitador_id", facilitadorId);

  revalidatePath("/dashboard/capacitacion/gestion-asignaciones");
  revalidatePath(`/portal/facilitador/osi/${osiId}`);
  revalidatePath("/portal/facilitador/dashboard");
  revalidatePath("/dashboard/capacitacion/auditoria-soportes");
  revalidatePath("/dashboard/capacitacion/seguimiento-servicios");

  return { success: true, message: "La carga del servicio fue reiniciada por completo. El facilitador podrá cargar todo desde cero." };
}

