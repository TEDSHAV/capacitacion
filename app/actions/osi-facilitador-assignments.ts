"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

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
