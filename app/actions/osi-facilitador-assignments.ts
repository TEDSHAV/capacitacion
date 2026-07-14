"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function assignOSIToFacilitador(
  osiId: number,
  facilitadorId: number,
  source: "direct" | "requisicion" = "direct"
) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const assignedBy = userResponse.data.user?.id || null;

  // Deactivate any existing active assignment for this OSI
  const { error: deactivateError } = await supabase
    .from("facilitador_osi_assignments")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("osi_id", osiId)
    .eq("is_active", true);

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
    .maybeSingle();

  if (error) {
    console.error("Error fetching assignment by OSI:", error);
    return { error: error.message };
  }

  return { data };
}

export async function getAllOSIsForAssignment() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("v_osi_formato_completo")
    .select("id_osi, nro_osi, nombre_empresa, servicio, tipo_servicio, fecha_emision")
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
