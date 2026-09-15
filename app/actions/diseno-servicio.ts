"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { notifySolicitanteOfFinalizacion } from "@/lib/diseno-servicio-notifications";
import {
  isCapacitacionDept,
} from "@/lib/requisiciones-gerencia";
import type {
  BloqueRecursosRequisitos,
  BloqueHigieneSeguridadAmbiente,
  BloquePlanificacionFactibilidad,
  BloqueControlesDiseno,
  BloqueSalidasDiseno,
  DisenoServicioFullData,
  DisenoServicioListItem,
} from "@/types/diseno-servicio";

const ESTATUS_PENDIENTE = 35;
const ESTATUS_EN_PROCESO = 36;
const ESTATUS_COMPLETADO = 38;

// Departamento ejecutante IDs (catalogo_servicios.id_departamento_ejecutante).
// Used to scope solicitudes by the executing department: 3 = Capacitación,
// 4 = Servicios Técnicos.
const DEPT_CAPACITACION = 3;
const DEPT_SERVICIOS_TECNICOS = 4;

// Get current logged in user details
export async function getCurrentUserForDiseno() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("usuarios")
    .select("*, departamentos!usuarios_departamento_fkey(nombre)")
    .eq("id_auth", user.id)
    .single();

  if (error) {
    console.error("Error fetching user details:", error);
    return null;
  }

  return data;
}

// Get all solicitudes for list view
//
// Scope: Strictly Capacitación (id_departamento_ejecutante = 3).
// Only Capacitación users may view/manage these services.
// Non-Capacitación users receive an empty list.
export async function getDisenoServicioList(): Promise<DisenoServicioListItem[]> {
  // Resolve the current user's department via the user-scoped (RLS-aware) client.
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  let userDeptName: string | null = null;
  if (user) {
    const { data: usuario } = await userSupabase
      .from("usuarios")
      .select("departamentos!usuarios_departamento_fkey(nombre)")
      .eq("id_auth", user.id)
      .single();
    userDeptName = (usuario?.departamentos as any)?.nombre ?? null;
  }

  // Capacitación module strictly scopes to Capacitación services (dept 3).
  // Non-Capacitación users get an empty list.
  if (!isCapacitacionDept(userDeptName)) {
    return [];
  }
  const scopeDeptId = DEPT_CAPACITACION;

  const supabase = await createAdminClient();

  // Fetch the IDs of services owned by the user's executing department
  // (small, indexed lookup on catalogo_servicios.id_departamento_ejecutante).
  // PostgREST cannot filter on nested join columns, so we resolve the
  // scoped service IDs first and then fetch only matching solicitudes via
  // .in("id_servicio_relacionado", ...), which uses
  // idx_solicitudes_servicio_rel. This avoids over-fetching rows from the
  // other department and discarding them in JS.
  const { data: scopedServices, error: scopedError } = await supabase
    .from("catalogo_servicios")
    .select("id")
    .eq("id_departamento_ejecutante", scopeDeptId);

  if (scopedError) {
    console.error("Error fetching scoped catalogo_servicios:", JSON.stringify(scopedError, null, 2));
    return [];
  }

  const scopedServiceIds = (scopedServices || []).map((s: any) => s.id as number);
  if (scopedServiceIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("solicitudes_diseno_servicio")
    .select(`
      id,
      nombre_sugerido,
      tipo_solicitud,
      id_estatus,
      fecha_solicitud,
      id_solicitante,
      id_servicio_relacionado,
      conf_estatus!solicitudes_diseno_servicio_id_estatus_fkey(nombre_estado),
      usuarios!solicitudes_diseno_servicio_id_solicitante_fkey(nombre_apellido, departamento),
      catalogo_servicios!solicitudes_diseno_servicio_id_servicio_relacionado_fkey(nombre, id_departamento_ejecutante)
    `)
    .in("id_servicio_relacionado", scopedServiceIds)
    .order("id", { ascending: false });

  if (error) {
    console.error("Error fetching solicitudes_diseno_servicio:", JSON.stringify(error, null, 2));
    return [];
  }

  // Batch-fetch department names for the distinct solicitante departamento IDs.
  // Done as a separate one-level join (known to work in getCurrentUserForDiseno)
  // to avoid the two-level nested join which PostgREST can fail to resolve.
  const departamentoIds = Array.from(
    new Set(
      (data || [])
        .map((row: any) => (row.usuarios as any)?.departamento as number | null)
        .filter((id: number | null): id is number => id !== null && id !== undefined),
    ),
  );

  let departamentoMap = new Map<number, string>();
  if (departamentoIds.length > 0) {
    const { data: deptos, error: deptError } = await supabase
      .from("departamentos")
      .select("id, nombre")
      .in("id", departamentoIds);

    if (deptError) {
      console.error("Error fetching departamentos:", JSON.stringify(deptError, null, 2));
    } else {
      departamentoMap = new Map((deptos || []).map((d: any) => [d.id, d.nombre]));
    }
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    nombre_sugerido: row.nombre_sugerido,
    tipo_solicitud: row.tipo_solicitud,
    tipo_servicio: row.catalogo_servicios?.nombre || "",
    id_departamento_ejecutante:
      (row.catalogo_servicios as any)?.id_departamento_ejecutante ?? null,
    id_estatus: row.id_estatus,
    estatus_nombre: row.conf_estatus?.nombre_estado || "",
    solicitante_nombre: row.usuarios?.nombre_apellido || "",
    solicitante_departamento:
      departamentoMap.get((row.usuarios as any)?.departamento) || "",
    fecha_solicitud: row.fecha_solicitud,
  }));
}

// Get single record by ID with all JSONB blocks
export async function getDisenoServicioById(id: number): Promise<DisenoServicioFullData | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("solicitudes_diseno_servicio")
    .select(`
      *,
      conf_estatus!solicitudes_diseno_servicio_id_estatus_fkey(nombre_estado),
      usuarios!solicitudes_diseno_servicio_id_solicitante_fkey(nombre_apellido),
      catalogo_servicios!solicitudes_diseno_servicio_id_servicio_relacionado_fkey(nombre, id_departamento_ejecutante)
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching solicitud:", JSON.stringify(error, null, 2));
    return null;
  }

  if (!data) return null;

  // Guard: only expose records owned by Capacitación (dept 3).
  // Prevents Capacitación users from accessing Servicios Técnicos-owned solicitudes via direct URL.
  const deptoEjecutante =
    (data.catalogo_servicios as any)?.id_departamento_ejecutante ?? null;
  if (deptoEjecutante !== DEPT_CAPACITACION) {
    console.warn(
      `getDisenoServicioById: solicitud ${id} pertenece a dept ${deptoEjecutante}, acceso denegado para Capacitación.`,
    );
    return null;
  }

  let aprobador_nombre = "";
  if (data.id_usuario_aprobador) {
    const { data: aprobador } = await supabase
      .from("usuarios")
      .select("nombre_apellido")
      .eq("id", data.id_usuario_aprobador)
      .single();
    aprobador_nombre = aprobador?.nombre_apellido || "";
  }

  return {
    id: data.id,
    id_servicio_relacionado: data.id_servicio_relacionado,
    id_solicitante: data.id_solicitante,
    cargo_solicitante: data.cargo_solicitante,
    fecha_solicitud: data.fecha_solicitud,
    tipo_solicitud: data.tipo_solicitud,
    id_estatus: data.id_estatus,
    nombre_sugerido: data.nombre_sugerido,
    objetivo_proposito: data.objetivo_proposito,
    tipo_servicio: data.catalogo_servicios?.nombre || "",
    id_departamento_ejecutante:
      (data.catalogo_servicios as any)?.id_departamento_ejecutante ?? null,
    fecha_aprobacion: data.fecha_aprobacion,
    id_usuario_aprobador: data.id_usuario_aprobador,
    observaciones_cierre: data.observaciones_cierre,
    solicitante_nombre: data.usuarios?.nombre_apellido || "",
    estatus_nombre: data.conf_estatus?.nombre_estado || "",
    servicio_nombre: data.catalogo_servicios?.nombre || "",
    aprobador_nombre,
    bloque_recursos_requisitos: data.bloque_recursos_requisitos || null,
    bloque_higiene_seguridad_ambiente: data.bloque_higiene_seguridad_ambiente || null,
    bloque_planificacion_factibilidad: data.bloque_planificacion_factibilidad || null,
    bloque_controles_diseno: data.bloque_controles_diseno || null,
    bloque_salidas_diseno: data.bloque_salidas_diseno || null,
  };
}

// Helper: set status to "En Proceso" if currently pending
async function ensureEnProceso(supabase: Awaited<ReturnType<typeof createClient>>, id: number) {
  const { data: current } = await supabase
    .from("solicitudes_diseno_servicio")
    .select("id_estatus")
    .eq("id", id)
    .single();

  if (current?.id_estatus === ESTATUS_PENDIENTE) {
    await supabase
      .from("solicitudes_diseno_servicio")
      .update({ id_estatus: ESTATUS_EN_PROCESO })
      .eq("id", id);
  }
}

// Helper: verify the solicitud belongs to Capacitación (dept 3) before any write.
// Throws if the record is missing or owned by another department (e.g., Servicios Técnicos).
async function assertCapOwned(supabase: Awaited<ReturnType<typeof createClient>>, id: number) {
  const { data, error } = await supabase
    .from("solicitudes_diseno_servicio")
    .select(`
      id,
      catalogo_servicios!solicitudes_diseno_servicio_id_servicio_relacionado_fkey(id_departamento_ejecutante)
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error(`Solicitud ${id} no encontrada.`);
  }

  const depto = (data.catalogo_servicios as any)?.id_departamento_ejecutante ?? null;
  if (depto !== DEPT_CAPACITACION) {
    throw new Error(
      `Solicitud ${id} no pertenece a Capacitación (dept ${depto}). Acción denegada.`,
    );
  }
}

// Partial save: Bloque Recursos y Requisitos
export async function saveBloqueRecursos(id: number, data: BloqueRecursosRequisitos) {
  const supabase = await createClient();
  await assertCapOwned(supabase, id);
  const { error } = await supabase
    .from("solicitudes_diseno_servicio")
    .update({ bloque_recursos_requisitos: data })
    .eq("id", id);

  if (error) throw error;
  await ensureEnProceso(supabase, id);
  revalidatePath("/dashboard/capacitacion/nuevos-servicios");
  return { success: true };
}

// Partial save: Bloque Higiene, Seguridad y Ambiente
export async function saveBloqueHigieneSeguridad(id: number, data: BloqueHigieneSeguridadAmbiente) {
  const supabase = await createClient();
  await assertCapOwned(supabase, id);
  const { error } = await supabase
    .from("solicitudes_diseno_servicio")
    .update({ bloque_higiene_seguridad_ambiente: data })
    .eq("id", id);

  if (error) throw error;
  await ensureEnProceso(supabase, id);
  revalidatePath("/dashboard/capacitacion/nuevos-servicios");
  return { success: true };
}

// Partial save: Bloque Planificación y Factibilidad
export async function saveBloquePlanificacion(id: number, data: BloquePlanificacionFactibilidad) {
  const supabase = await createClient();
  await assertCapOwned(supabase, id);
  const { error } = await supabase
    .from("solicitudes_diseno_servicio")
    .update({ bloque_planificacion_factibilidad: data })
    .eq("id", id);

  if (error) throw error;
  await ensureEnProceso(supabase, id);
  revalidatePath("/dashboard/capacitacion/nuevos-servicios");
  return { success: true };
}

// Partial save: Bloque Controles del Diseño
export async function saveBloqueControles(id: number, data: BloqueControlesDiseno) {
  const supabase = await createClient();
  await assertCapOwned(supabase, id);
  const { error } = await supabase
    .from("solicitudes_diseno_servicio")
    .update({ bloque_controles_diseno: data })
    .eq("id", id);

  if (error) throw error;
  await ensureEnProceso(supabase, id);
  revalidatePath("/dashboard/capacitacion/nuevos-servicios");
  return { success: true };
}

// Partial save: Bloque Salidas del Diseño
export async function saveBloqueSalidas(id: number, data: BloqueSalidasDiseno) {
  const supabase = await createClient();
  await assertCapOwned(supabase, id);
  const { error } = await supabase
    .from("solicitudes_diseno_servicio")
    .update({ bloque_salidas_diseno: data })
    .eq("id", id);

  if (error) throw error;
  await ensureEnProceso(supabase, id);
  revalidatePath("/dashboard/capacitacion/nuevos-servicios");
  return { success: true };
}

// Finalize solicitud: set status to completed + set approval fields
export async function finalizarSolicitud(id: number) {
  const supabase = await createClient();
  await assertCapOwned(supabase, id);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userId: number | null = null;
  if (user) {
    const { data: userData } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id_auth", user.id)
      .single();
    userId = userData?.id || null;
  }

  const { error } = await supabase
    .from("solicitudes_diseno_servicio")
    .update({
      id_estatus: ESTATUS_COMPLETADO,
      fecha_aprobacion: new Date().toISOString(),
      id_usuario_aprobador: userId,
    })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/dashboard/capacitacion/nuevos-servicios");

  // Notify the original solicitante that their request has been finalized.
  // Non-throwing: a notify-schema issue must not roll back the finalize.
  await notifySolicitanteOfFinalizacion(id);

  return { success: true };
}
