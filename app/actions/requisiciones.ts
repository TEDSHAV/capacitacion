"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/server";
import {
  RequisicionFormData,
  OSIFullData,
  RequisicionItem,
  VerificacionStatus,
  OSIFixedItem,
} from "@/types/requisiciones";
import {
  notifyAdminsOfNewRequisicion,
  notifyCreatorOfProcesada,
  notifyCreatorOfRechazada,
  notifyCreatorOfPartialVerificacion,
  notifyAdminOfAcuseRecibo,
  notifyCreatorOfCoordinadorRechazada,
  notifyCreatorOfLiderRechazada,
  notifyCreatorOfApproverChanges,
  notifyLiderOfPendingInterna,
  notifyCoordinadorOfPendingExterna,
} from "@/lib/requisiciones-notify-bridge";
import { getUsdToVesRate } from "@/lib/exchange-rate";
import {
  isCapacitacionDept,
  resolveInternaApprovalGerencia,
} from "@/lib/requisiciones-gerencia";
import { markRequisicionEnviadaAdminForSessions } from "@/app/actions/capacitacion-proceso-steps";

// Build a JSON snapshot of the editable content fields of a requisicion record.
// Captured at creation and on every creator save (so it always reflects the
// creator's latest version), and used as the baseline for the approver-edit diff
// shown to the solicitor. The approver's edit action does NOT refresh this
// snapshot — that's the whole point: the solicitor sees what changed vs. their
// original request.
function buildRequisicionSnapshot(rec: Record<string, any>): Record<string, any> {
  return {
    additional_items: rec.additional_items,
    osi_fixed_items: rec.osi_fixed_items,
    cant_traslado: rec.cant_traslado,
    cant_impresion: rec.cant_impresion,
    cant_honorarios: rec.cant_honorarios,
    cant_informe_final: rec.cant_informe_final,
    dias_traslado: rec.dias_traslado,
    costo_traslado: rec.costo_traslado,
    impresion_total: rec.impresion_total,
    honorarios_horas: rec.honorarios_horas,
    honorarios_costo_hora: rec.honorarios_costo_hora,
    honorarios_total: rec.honorarios_total,
    informe_final_total: rec.informe_final_total,
    facilitador: rec.facilitador,
    cod_facilitador: rec.cod_facilitador,
    cedula_facilitador: rec.cedula_facilitador,
    rif_facilitador: rec.rif_facilitador,
    telefono_facilitador: rec.telefono_facilitador,
    banco: rec.banco,
    nro_cuenta: rec.nro_cuenta,
    observaciones_compras: rec.observaciones_compras,
    prioridad: rec.prioridad,
    corresponde_a: rec.corresponde_a,
    fecha_solicitud: rec.fecha_solicitud,
    solicitante: rec.solicitante,
    departamento: rec.departamento,
    gerencia_solicitante: rec.gerencia_solicitante,
    tipo_servicio: rec.tipo_servicio,
    id_sesion: rec.id_sesion,
  };
}

// Check if the current user belongs to the Administración department.
// Department-based only — role (admin/superadmin) is NOT considered.
// Wrapped in cache() to deduplicate across multiple calls in the same request
export const isRequisicionesAdmin = cache(async (): Promise<boolean> => {
  try {
    const usuario = await getCurrentUser();
    const deptName = (usuario?.departamentos as any)?.nombre?.toLowerCase() || "";
    return deptName.includes("admin");
  } catch {
    return false;
  }
});

// True when the current user belongs to the Capacitación department.
export const isCurrentUserCapacitacion = cache(async (): Promise<boolean> => {
  try {
    const usuario = await getCurrentUser();
    const deptName = (usuario?.departamentos as any)?.nombre || "";
    return isCapacitacionDept(deptName);
  } catch {
    return false;
  }
});

// Returns the current user's `usuarios.id` (the integer PK, not id_auth).
// Cached per request. Used to match against departamentos.coordinador and
// gerencias.lider.
export const getCurrentUserUsuarioId = cache(async (): Promise<number | null> => {
  try {
    const usuario = await getCurrentUser();
    if (usuario?.id != null) return usuario.id;
    // Fallback: preserve original admin-client path in case RLS ever hides the row.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const admin = await createAdminClient();
    const { data } = await admin
      .from("usuarios")
      .select("id")
      .eq("id_auth", user.id)
      .single();
    return data?.id ?? null;
  } catch {
    return null;
  }
});

// Get current logged in user details with full profile (cached per request).
// Returns the full usuarios row with departamentos join.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("usuarios")
    .select("*, departamentos!usuarios_departamento_fkey(nombre, gerencia)")
    .eq("id_auth", user.id)
    .single();

  if (error) {
    console.error("Error fetching user details:", error);
    return null;
  }

  return data;
});

// Returns the current user's department name (or null). Cached per request.
export const getCurrentUserDepartment = cache(async (): Promise<string | null> => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const admin = await createAdminClient();
    const { data: usuario } = await admin
      .from("usuarios")
      .select("departamentos!usuarios_departamento_fkey(nombre)")
      .eq("id_auth", user.id)
      .single();
    return (usuario?.departamentos as any)?.nombre || null;
  } catch {
    return null;
  }
});

// Returns the gerencia name for the current user's department (via
// departamentos.gerencia FK to gerencias.nombre). Cached per request.
export const getCurrentUserGerencia = cache(async (): Promise<string | null> => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const admin = await createAdminClient();
    const { data: usuario } = await admin
      .from("usuarios")
      .select("departamentos!usuarios_departamento_fkey(gerencia)")
      .eq("id_auth", user.id)
      .single();
    return (usuario?.departamentos as any)?.gerencia || null;
  } catch {
    return null;
  }
});

// True when the current user is the coordinador registered on the
// departamentos row matching the given department name (case-insensitive).
// Driven by the new departamentos.coordinador column (not role slugs).
export const isCoordinadorForDepartment = cache(async (deptName: string | null | undefined): Promise<boolean> => {
  if (!deptName) return false;
  const usuarioId = await getCurrentUserUsuarioId();
  if (!usuarioId) return false;
  try {
    const supabase = await createAdminClient();
    const { data: dept } = await supabase
      .from("departamentos")
      .select("coordinador")
      .ilike("nombre", deptName)
      .maybeSingle();
    return dept?.coordinador === usuarioId;
  } catch {
    return false;
  }
});

// True when the current user is the lider registered on the gerencias row
// matching the given gerencia name (case-insensitive). Driven by
// gerencias.lider (not role slugs).
export const isLiderForGerencia = cache(async (gerenciaName: string | null | undefined): Promise<boolean> => {
  if (!gerenciaName) return false;
  const usuarioId = await getCurrentUserUsuarioId();
  if (!usuarioId) return false;
  try {
    const supabase = await createAdminClient();
    const { data: g } = await supabase
      .from("gerencias")
      .select("lider")
      .ilike("nombre", gerenciaName)
      .maybeSingle();
    return g?.lider === usuarioId;
  } catch {
    return false;
  }
});

// True when the current user is the lider of the gerencia that the given
// department belongs to (departamentos.gerencia → gerencias.nombre).
export const isLiderForDepartmentGerencia = cache(async (deptName: string | null | undefined): Promise<boolean> => {
  if (!deptName) return false;
  try {
    const supabase = await createAdminClient();
    const { data: dept } = await supabase
      .from("departamentos")
      .select("gerencia")
      .ilike("nombre", deptName)
      .maybeSingle();
    if (!dept?.gerencia) return false;
    return isLiderForGerencia(dept.gerencia);
  } catch {
    return false;
  }
});

// True when the current user is the lider who must approve INTERNAS for the given
// department. Honours the TEMPORARY interna routing override
// (resolveInternaApprovalGerencia); otherwise falls back to the lider of the
// department's own gerencia. Externas intentionally keep using
// isLiderForDepartmentGerencia.
export const isLiderForInternaApproval = cache(async (deptName: string | null | undefined): Promise<boolean> => {
  if (!deptName) return false;
  const overrideGerencia = resolveInternaApprovalGerencia(deptName);
  if (overrideGerencia) return isLiderForGerencia(overrideGerencia);
  return isLiderForDepartmentGerencia(deptName);
});

// True when the given department has a coordinador registered
// (departamentos.coordinador is not null).
export const departmentHasCoordinador = cache(async (deptName: string | null | undefined): Promise<boolean> => {
  if (!deptName) return false;
  try {
    const supabase = await createAdminClient();
    const { data: dept } = await supabase
      .from("departamentos")
      .select("coordinador")
      .ilike("nombre", deptName)
      .maybeSingle();
    return dept?.coordinador != null;
  } catch {
    return false;
  }
});

// True when the current user can place an Interna for the given department:
//   - they are the department's coordinador, OR
//   - the department has no coordinador (anyone in the department may place it;
//     it will then route to the approving lider for approval — see
//     resolveInternaApprovalGerencia for the temporary override — unless the
//     creator IS that approving lider, in which case it skips approval and goes
//     straight to admin).
export const canPlaceInterna = cache(async (deptName: string | null | undefined): Promise<boolean> => {
  if (!deptName) return false;
  const isCoord = await isCoordinadorForDepartment(deptName);
  if (isCoord) return true;
  const hasCoord = await departmentHasCoordinador(deptName);
  if (hasCoord) return false;
  // No coordinador → anyone in the department can place an interna. The
  // workflow step in createRequisicionRecord decides whether it needs lider
  // approval (creator is not the approving lider) or skips it (creator is).
  return true;
});

// Names of ALL departments the current user coordinates (departamentos.coordinador).
// A user may coordinate more than one department, and may coordinate a department
// other than the one they belong to, so this must never be derived from
// usuarios.departamento.
export const getCoordinatedDepartments = cache(async (): Promise<string[]> => {
  const usuarioId = await getCurrentUserUsuarioId();
  if (!usuarioId) return [];
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("departamentos")
      .select("nombre")
      .eq("coordinador", usuarioId);
    if (error) {
      console.error("[getCoordinatedDepartments] Error:", error);
      return [];
    }
    return (data || []).map((d: { nombre: string | null }) => d.nombre).filter((n): n is string => !!n);
  } catch {
    return [];
  }
});

// Names of ALL gerencias the current user leads (gerencias.lider). Same rationale
// as getCoordinatedDepartments: never derive this from the user's own department.
export const getLedGerencias = cache(async (): Promise<string[]> => {
  const usuarioId = await getCurrentUserUsuarioId();
  if (!usuarioId) return [];
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("gerencias")
      .select("nombre")
      .eq("lider", usuarioId);
    if (error) {
      console.error("[getLedGerencias] Error:", error);
      return [];
    }
    return (data || []).map((g: { nombre: string | null }) => g.nombre).filter((n): n is string => !!n);
  } catch {
    return [];
  }
});

// Department names whose INTERNAS the current user approves as lider.
//
// Base set: every department in the gerencia(s) they lead. Then the TEMPORARY
// interna routing override is applied — overridden departments are removed from
// their natural gerencia's lider and added to the lider of their target gerencia.
export const getDepartmentsInLedGerencias = cache(async (): Promise<string[]> => {
  const gerencias = await getLedGerencias();
  if (gerencias.length === 0) return [];
  try {
    const supabase = await createAdminClient();
    // All departments, so overridden ones can be re-assigned to the lider of
    // their target gerencia even when that department sits elsewhere.
    const { data, error } = await supabase
      .from("departamentos")
      .select("nombre, gerencia");
    if (error) {
      console.error("[getDepartmentsInLedGerencias] Error:", error);
      return [];
    }
    const ledLower = gerencias.map((g) => g.trim().toLowerCase());
    const result: string[] = [];
    for (const d of (data || []) as { nombre: string | null; gerencia: string | null }[]) {
      if (!d.nombre) continue;
      const overrideGerencia = resolveInternaApprovalGerencia(d.nombre);
      const effectiveGerencia = overrideGerencia || d.gerencia;
      if (!effectiveGerencia) continue;
      if (ledLower.includes(effectiveGerencia.trim().toLowerCase())) {
        result.push(d.nombre);
      }
    }
    return result;
  } catch {
    return [];
  }
});

// Department names WITHOUT a coordinador inside the gerencias the current user
// leads. For those departments the lider is the fallback approver of externas.
export const getCoordinatorlessDepartmentsInLedGerencias = cache(async (): Promise<string[]> => {
  const gerencias = await getLedGerencias();
  if (gerencias.length === 0) return [];
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("departamentos")
      .select("nombre")
      .in("gerencia", gerencias)
      .is("coordinador", null);
    if (error) {
      console.error("[getCoordinatorlessDepartmentsInLedGerencias] Error:", error);
      return [];
    }
    return (data || []).map((d: { nombre: string | null }) => d.nombre).filter((n): n is string => !!n);
  } catch {
    return [];
  }
});

// Back-compat: some callers still reference isRequisicionesCoordinador to decide
// whether to show coordinador-related UI. Derived from the schema (the user is the
// coordinador of AT LEAST ONE department).
export const isRequisicionesCoordinador = cache(async (): Promise<boolean> => {
  return (await getCoordinatedDepartments()).length > 0;
});

// True when the current user is the lider of AT LEAST ONE gerencia.
export const isRequisicionesLider = cache(async (): Promise<boolean> => {
  return (await getLedGerencias()).length > 0;
});

// Derive whether a requisicion record is a "Capacitacion" record based on the
// stored department (preferred) or, for legacy records, gerencia_solicitante.
function recordIsCapacitacion(record: { departamento?: string | null; gerencia_solicitante?: string | null }): boolean {
  if (record.departamento) return isCapacitacionDept(record.departamento);
  return (record.gerencia_solicitante || "").trim().toLowerCase() === "capacitacion";
}

// Get all OSIs for the dropdown (cached 5 minutes)
export const getAllOSIsForRequisiciones = unstable_cache(
  async () => {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("v_osi_formato_completo")
      .select("*")
      .order("id_osi", { ascending: false });

    if (error) {
      console.error("Error fetching OSIs:", error);
      return [];
    }
    return data as OSIFullData[];
  },
  ["osis-for-requisiciones"],
  { tags: ["osis"], revalidate: 300 }
);

// Get lightweight OSI id→nro_osi pairs for lookup maps (cached 5 minutes)
export const getOsiNumbersForLookup = unstable_cache(
  async () => {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("v_osi_lista")
      .select("id_osi, nro_osi")
      .order("id_osi", { ascending: false });

    if (error) {
      console.error("Error fetching OSI numbers for lookup:", error);
      return [];
    }
    return data as { id_osi: number; nro_osi: string | null }[];
  },
  ["osi-numbers-for-lookup"],
  { tags: ["osi-numbers"], revalidate: 300 }
);

// Get all OSI sessions from the osi_sesion table (cached 5 minutes).
// Returns a flat list; the form groups by id_osi.
// Used as a fallback when v_osi_formato_completo.desglose_recursos_sesiones
// is empty (which happens when no recursos are assigned per session).
export const getAllOsiSessions = unstable_cache(
  async () => {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("osi_sesion")
      .select("id, id_osi, nro_sesion, fecha, hora_inicio, hora_fin")
      .order("id_osi", { ascending: true })
      .order("nro_sesion", { ascending: true });

    if (error) {
      console.error("Error fetching OSI sessions:", error);
      return [];
    }
    return data as {
      id: number;
      id_osi: number;
      nro_sesion: number;
      fecha: string | null;
      hora_inicio: string | null;
      hora_fin: string | null;
    }[];
  },
  ["osi-sessions-all"],
  { tags: ["osi-numbers"], revalidate: 300 }
);

// Get all banks for the dropdown (cached 1 hour)
export const getBanksForDropdown = unstable_cache(
  async () => {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("cat_bancos")
      .select("id, nombre")
      .order("nombre");

    if (error) {
      console.error("Error fetching banks:", error);
      return [];
    }
    return data as { id: number; nombre: string }[];
  },
  ["banks-for-dropdown"],
  { tags: ["banks"], revalidate: 3600 }
);

// Get OSI data for auto-population
export async function getOSIForRequisicion(osiId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_osi_formato_completo")
    .select("*")
    .eq("id_osi", osiId)
    .single();

  if (error) throw error;
  return data as OSIFullData;
}

// Create requisition record
export async function createRequisicionRecord(
  formData: RequisicionFormData,
) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const isCapacitacion = !formData.is_general && isCapacitacionDept(formData.departamento);
  const primaryOSI = formData.selectedOSIs[0] || null;
  const isInterna = formData.is_general;

  // --- Workflow ---
  // Internas: placed by the department's coordinador, or by anyone when the
  //   department has no coordinador (e.g. TED, Calidad, SIG, SSST, Servicios
  //   Tecnicos). An interna needs Lider approval before reaching Administración
  //   — UNLESS the creator IS the approving lider (which covers both the
  //   "no coordinador and the creator is the lider" case and the "coordinador
  //   is also the lider" case), in which case there is nobody left to approve
  //   and it goes straight to Administración.
  // Externas: placed by anyone. If the creator IS the coordinador (or the gerencia
  //   lider when the department has no coordinador), it skips approval and goes
  //   straight to Administración. If an analyst places it, it needs Coordinador
  //   approval (or gerencia Lider fallback) before reaching Administración.
  let needsLiderApproval = false;       // internas
  let liderBypassApproval = false;      // internas that skip lider approval
  let needsCoordinadorApproval = false; // externas placed by analyst
  let coordinadorBypassApproval = false;// externas placed by coordinador (or lider fallback)

  if (isInterna) {
    const canPlace = await canPlaceInterna(formData.departamento);
    if (!canPlace) {
      throw new Error(
        "Las requisiciones internas deben ser colocadas por el coordinador de su departamento. " +
        "Solicite a su coordinador que la coloque por usted."
      );
    }
    // If the creator is the approving lider there is no separate approver, so the
    // interna skips the lider gate (this covers the coordinador-less case where
    // the lider places it themselves, and the case where the coordinador is also
    // the lider — otherwise the requisicion would sit pending on its own
    // creator's approval forever). Any other creator (coordinador, or an analyst
    // in a coordinador-less department) needs Lider approval.
    const creatorIsLider = await isLiderForInternaApproval(formData.departamento);
    if (creatorIsLider) {
      liderBypassApproval = true;
    } else {
      needsLiderApproval = true;
    }
  } else {
    // Externa. Check if the creator is the approver (coordinador or lider fallback).
    const isCoord = await isCoordinadorForDepartment(formData.departamento);
    if (isCoord) {
      // Coordinador placed it → skip approval, go straight to Administración.
      coordinadorBypassApproval = true;
    } else {
      const hasCoord = await departmentHasCoordinador(formData.departamento);
      if (!hasCoord) {
        // No coordinador → check if the creator is the gerencia lider.
        const isLider = await isLiderForDepartmentGerencia(formData.departamento);
        if (isLider) {
          // Lider placed it (no coordinador) → skip approval.
          coordinadorBypassApproval = true;
        } else {
          // Analyst placed it, no coordinador → needs lider fallback approval.
          needsCoordinadorApproval = true;
        }
      } else {
        // Analyst placed it, department has coordinador → needs coordinador approval.
        needsCoordinadorApproval = true;
      }
    }
  }

  // Calculate totals for fixed items as requested (Cant is removed from UI, so we use 1)
  const totalTraslado = (formData.dias_traslado || 0) * (formData.costo_traslado || 0);
  const totalImpresion = (formData.impresion_total || 0);
  const totalHonorarios = (formData.honorarios_total || 0);
  const totalInformeFinal = (formData.informe_final_total || 0);

  // Base record (columns that always exist in the DB)
  const baseRecord = {
    id_osi: primaryOSI?.id_osi || null,
    solicitante: formData.solicitante,
    gerencia_solicitante: formData.gerencia_solicitante,
    fecha_solicitud: formData.fecha_solicitud,
    // Auto-derived: Internas = General (no OSI), Externas = OSI-based
    tipo_solicitud: isInterna ? "Interno" : "Externo",
    nro_correlativo: formData.nro_correlativo || null,
    tipo_servicio: formData.tipo_servicio || null,
    prioridad: formData.prioridad || null,
    corresponde_a: formData.corresponde_a || null,

    // Store calculated totals in numeric columns (zeroed when non-Capacitacion)
    costo_traslado: isCapacitacion ? totalTraslado : 0,
    impresion_total: isCapacitacion ? totalImpresion : 0,
    honorarios_total: isCapacitacion ? totalHonorarios : 0,
    informe_final_total: isCapacitacion ? totalInformeFinal : 0,
    dias_traslado: isCapacitacion ? formData.dias_traslado : 0,

    // DB Quantities set to 1 as requested (since we removed them from UI)
    cant_traslado: 1,
    cant_impresion: 1,
    cant_honorarios: 1,
    cant_informe_final: 1,

    // Per-OSI fixed items (Capacitación mode)
    osi_fixed_items: isCapacitacion ? formData.osi_fixed_items : [],

    // Facilitator (null when non-Capacitacion)
    cod_facilitador: isCapacitacion && formData.cod_facilitador ? parseInt(formData.cod_facilitador) : null,
    facilitador: isCapacitacion ? formData.facilitador : null,
    cedula_facilitador: isCapacitacion ? formData.cedula_facilitador : null,
    rif_facilitador: isCapacitacion ? formData.rif_facilitador : null,
    telefono_facilitador: isCapacitacion ? formData.telefono_facilitador : null,
    banco: isCapacitacion ? formData.banco : null,
    nro_cuenta: isCapacitacion ? formData.nro_cuenta : null,

    // Dynamic Items
    additional_items: formData.additional_items,

    observaciones_compras: formData.observaciones,
    created_by: userId,
    updated_by: userId,

    // Schema fields
    item_solicitado: primaryOSI?.servicio || null,
    cantidad: 1,
    id_estatus: 1, // Default status
    estatus_admin: "pendiente",
  };

  // New columns that may not exist yet if the migration hasn't been applied.
  // These are added in a separate layer so the insert can retry without them.
  const newColumns = {
    departamento: formData.departamento || null,
    id_sesion: formData.id_sesion || null,
    // Multi-session selection for Capacitación Externa. Array of
    // {id_osi, id_sesion, nro_sesion}. NULL for internas and legacy records.
    selected_sesiones: !isInterna && formData.selectedSesiones?.length > 0
      ? formData.selectedSesiones.map((s) => ({
          id_osi: primaryOSI?.id_osi ?? formData.selectedOSIs[0]?.id_osi ?? null,
          id_sesion: s.id_sesion,
          nro_sesion: s.nro_sesion,
        }))
      : null,
    // Externas require coordinador approval (or lider fallback) before reaching
    // Administración. Internas never use coordinador_estatus.
    coordinador_estatus: !isInterna && needsCoordinadorApproval ? "pendiente" : null,
    // Internas placed by a coordinador require lider approval. Internas placed
    // by the gerencia lider (no coordinador) skip approval (null). Externas
    // never use lider_estatus.
    lider_estatus: isInterna && needsLiderApproval ? "pendiente" : null,
    // Locked at creation: rev.01 / 20/08/2026 for all new requisiciones.
    revision: "01",
    fecha_revision: "20/08/2026",
  };

  const fullRecord = { ...baseRecord, ...newColumns, original_snapshot: buildRequisicionSnapshot({ ...baseRecord, ...newColumns }) };

  // Try with all columns first; if a column doesn't exist yet, retry with base only.
  let data: any;
  let error: any;
  ({ data, error } = await supabase
    .from("requisiciones")
    .insert(fullRecord)
    .select()
    .single());

  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    console.warn("[createRequisicionRecord] New columns not found, retrying with base record:", error.message);
    ({ data, error } = await supabase
      .from("requisiciones")
      .insert(baseRecord)
      .select()
      .single());
  }

  if (error) throw error;

  await syncRequisicionOsis(data.id, formData);

  // Auto-mark the first planificacion step ("Requisición a Admin") on the
  // selected sessions of all linked OSIs when an externa is created. Internas
  // have no OSI and are excluded. Best-effort: failures are logged but don't
  // block creation.
  if (!isInterna && formData.selectedSesiones?.length > 0) {
    const sessionsToMark = formData.selectedSesiones
      .map((s) => ({
        osiId: primaryOSI?.id_osi ?? formData.selectedOSIs[0]?.id_osi,
        nroSesion: s.nro_sesion,
      }))
      .filter((s) => s.osiId != null) as { osiId: number; nroSesion: number }[];
    if (sessionsToMark.length > 0) {
      await markRequisicionEnviadaAdminForSessions(sessionsToMark).catch((err) =>
        console.error("[createRequisicionRecord] markRequisicionEnviadaAdminForSessions failed:", err)
      );
    }
    revalidatePath("/dashboard/capacitacion/seguimiento-servicios");
  }

  // Notifications based on the workflow path:
  // - Internas that skip the lider gate → notify Administración directly.
  // - Internas placed by coordinador → notify the gerencia's lider to approve.
  // - Externas placed by coordinador (or lider fallback) → notify Administración directly.
  // - Externas placed by analyst → notify the department's coordinador (or lider fallback).
  if (isInterna && liderBypassApproval) {
    await notifyAdminsOfNewRequisicion(data.id, formData.solicitante, "interna");
  } else if (isInterna && needsLiderApproval) {
    await notifyLiderOfPendingInterna(data.id, formData.solicitante, formData.departamento || "");
  } else if (!isInterna && coordinadorBypassApproval) {
    const label = `de la OSI N° ${primaryOSI?.nro_osi || ""}`;
    await notifyAdminsOfNewRequisicion(data.id, formData.solicitante, label);
  } else if (!isInterna && needsCoordinadorApproval) {
    await notifyCoordinadorOfPendingExterna(data.id, formData.solicitante, formData.departamento || "");
  }

  // Revalidate both the shell and potentially the capacitacion app list if needed
  revalidatePath("/dashboard/capacitacion/requisiciones");
  revalidateTag("osis", "default");
  revalidateTag("osi-numbers", "default");
  return data;
}

// Persist the multi-OSI links in the junction table
async function syncRequisicionOsis(
  requisicionId: number,
  formData: RequisicionFormData,
) {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("requisiciones_osis")
    .delete()
    .eq("id_requisicion", requisicionId);

  if (deleteError) {
    console.error("Error clearing requisicion OSI links:", deleteError);
  }

  if (formData.selectedOSIs.length === 0) return;

  const rows = formData.selectedOSIs.map((osi) => ({
    id_requisicion: requisicionId,
    id_osi: osi.id_osi,
  }));

  const { error } = await supabase.from("requisiciones_osis").insert(rows);
  if (error) {
    console.error("Error saving requisicion OSI links:", error);
  }
}

// Get single record for editing
export async function getRequisicionRecord(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requisiciones")
    .select(`
      *,
      v_osi_formato_completo!left (
        id_osi,
        nro_osi,
        servicio
      ),
      requisiciones_osis!requisiciones_osis_id_requisicion_fkey (
        id_osi
      )
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    console.error("Error fetching requisicion record:", error);
    return null;
  }

  // Collect verificador ids from additional_items and osi_fixed_items
  const verificadorIds = new Set<string>();
  for (const item of (data?.additional_items || []) as RequisicionItem[]) {
    if (item.verificado_por) verificadorIds.add(item.verificado_por);
  }
  for (const fi of (data?.osi_fixed_items || []) as OSIFixedItem[]) {
    for (const key of ["verificado_por_traslado", "verificado_por_impresion", "verificado_por_honorarios", "verificado_por_informe_final"] as const) {
      const v = fi[key];
      if (v) verificadorIds.add(v);
    }
  }

  const promises: Promise<void>[] = [];

  if (data?.procesada_por) {
    promises.push(
      (async () => {
        const { data: procesadaPorUser } = await supabase
          .from("usuarios")
          .select("nombre_apellido")
          .eq("id_auth", data.procesada_por!)
          .single();
        (data as Record<string, unknown>).procesada_por_nombre = procesadaPorUser?.nombre_apellido || null;
      })(),
    );
  }

  // Resolve the approver who modified the requisicion (aprobador_edito_por is a
  // usuarios.id FK, not an id_auth).
  if (data?.aprobador_edito_por) {
    promises.push(
      (async () => {
        const { data: approverUser } = await supabase
          .from("usuarios")
          .select("nombre_apellido")
          .eq("id", data.aprobador_edito_por!)
          .single();
        (data as Record<string, unknown>).aprobador_edito_por_nombre = approverUser?.nombre_apellido || null;
      })(),
    );
  }

  // Resolve the gerencia from the DB (departamentos.gerencia) for accurate display.
  // Falls back to the stored gerencia_solicitante for legacy records without a
  // departamento, or to mapGerenciaSolicitante as a last resort.
  if (data?.departamento) {
    promises.push(
      (async () => {
        const { data: dept } = await supabase
          .from("departamentos")
          .select("gerencia")
          .ilike("nombre", data.departamento!)
          .maybeSingle();
        (data as Record<string, unknown>).gerencia_display = dept?.gerencia || data.gerencia_solicitante || null;
      })(),
    );
  } else {
    (data as Record<string, unknown>).gerencia_display = data?.gerencia_solicitante || null;
  }

  if (verificadorIds.size > 0) {
    promises.push(
      (async () => {
        const { data: verificadores } = await supabase
          .from("usuarios")
          .select("id_auth, nombre_apellido")
          .in("id_auth", Array.from(verificadorIds));
        const map: Record<string, string> = {};
        (verificadores || []).forEach((u: { id_auth: string | null; nombre_apellido: string }) => {
          if (u.id_auth) map[u.id_auth] = u.nombre_apellido;
        });
        (data as Record<string, unknown>).verificado_por_map = map;
      })(),
    );
  }

  await Promise.all(promises);

  return data;
}

// Get OSI details for a list of ids (used by the view page)
export async function getOsisByIds(ids: number[]) {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_osi_formato_completo")
    .select("*")
    .in("id_osi", ids);

  if (error) {
    console.error("Error fetching OSIs by ids:", error);
    return [];
  }
  return data as OSIFullData[];
}

// Update requisition record
export async function updateRequisicionRecord(
  id: number,
  formData: RequisicionFormData,
) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  // Locked once Administración marks it as procesada or rechazada (unless caller is admin).
  // Also locked once an approver (lider/coordinador) has modified it — the approver's
  // version becomes authoritative and the creator can no longer edit it.
  const { data: existing } = await supabase
    .from("requisiciones")
    .select("estatus_admin, aprobador_edito")
    .eq("id", id)
    .single();

  const isLocked = existing?.estatus_admin === "procesada" || existing?.estatus_admin === "rechazada";
  if (isLocked && !(await isRequisicionesAdmin())) {
    throw new Error("Esta requisición ya fue procesada por Administración y no puede editarse.");
  }
  if (existing?.aprobador_edito === true && !(await isRequisicionesAdmin())) {
    throw new Error("El aprobador ya modificó esta requisición. No puede editarla.");
  }

  const isCapacitacion = !formData.is_general && isCapacitacionDept(formData.departamento);
  const primaryOSI = formData.selectedOSIs[0] || null;
  const isInterna = formData.is_general;

  // Calculate totals for fixed items
  const totalTraslado = (formData.dias_traslado || 0) * (formData.costo_traslado || 0);
  const totalImpresion = (formData.impresion_total || 0);
  const totalHonorarios = (formData.honorarios_total || 0);
  const totalInformeFinal = (formData.informe_final_total || 0);

  // Base record (columns that always exist in the DB)
  const baseRecord = {
    id_osi: primaryOSI?.id_osi || null,
    solicitante: formData.solicitante,
    gerencia_solicitante: formData.gerencia_solicitante,
    fecha_solicitud: formData.fecha_solicitud,
    // Auto-derived: Internas = General (no OSI), Externas = OSI-based
    tipo_solicitud: isInterna ? "Interno" : "Externo",
    nro_correlativo: formData.nro_correlativo || null,
    tipo_servicio: formData.tipo_servicio || null,
    prioridad: formData.prioridad || null,
    corresponde_a: formData.corresponde_a || null,

    // Store calculated totals in numeric columns (zeroed when non-Capacitacion)
    costo_traslado: isCapacitacion ? totalTraslado : 0,
    impresion_total: isCapacitacion ? totalImpresion : 0,
    honorarios_total: isCapacitacion ? totalHonorarios : 0,
    informe_final_total: isCapacitacion ? totalInformeFinal : 0,
    dias_traslado: isCapacitacion ? formData.dias_traslado : 0,

    // DB Quantities set to 1
    cant_traslado: 1,
    cant_impresion: 1,
    cant_honorarios: 1,
    cant_informe_final: 1,

    // Per-OSI fixed items (Capacitación mode)
    osi_fixed_items: isCapacitacion ? formData.osi_fixed_items : [],

    // Facilitator (null when non-Capacitacion)
    cod_facilitador: isCapacitacion && formData.cod_facilitador ? parseInt(formData.cod_facilitador) : null,
    facilitador: isCapacitacion ? formData.facilitador : null,
    cedula_facilitador: isCapacitacion ? formData.cedula_facilitador : null,
    rif_facilitador: isCapacitacion ? formData.rif_facilitador : null,
    telefono_facilitador: isCapacitacion ? formData.telefono_facilitador : null,
    banco: isCapacitacion ? formData.banco : null,
    nro_cuenta: isCapacitacion ? formData.nro_cuenta : null,

    additional_items: formData.additional_items,
    observaciones_compras: formData.observaciones,
    updated_by: userId,

    // Schema fields
    item_solicitado: primaryOSI?.servicio || null,
  };

  // New columns that may not exist yet if the migration hasn't been applied.
  const newColumns = {
    departamento: formData.departamento || null,
    id_sesion: formData.id_sesion || null,
    selected_sesiones: !isInterna && formData.selectedSesiones?.length > 0
      ? formData.selectedSesiones.map((s) => ({
          id_osi: primaryOSI?.id_osi ?? formData.selectedOSIs[0]?.id_osi ?? null,
          id_sesion: s.id_sesion,
          nro_sesion: s.nro_sesion,
        }))
      : null,
  };

  // Refresh the original_snapshot on every creator save so it always reflects the
  // creator's latest version. The approver's edit action does NOT refresh it.
  const fullRecord = { ...baseRecord, ...newColumns, original_snapshot: buildRequisicionSnapshot({ ...baseRecord, ...newColumns }) };

  // Try with all columns first; if a column doesn't exist yet, retry with base only.
  let data: any;
  let error: any;
  ({ data, error } = await supabase
    .from("requisiciones")
    .update(fullRecord)
    .eq("id", id)
    .select()
    .single());

  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    console.warn("[updateRequisicionRecord] New columns not found, retrying with base record:", error.message);
    ({ data, error } = await supabase
      .from("requisiciones")
      .update(baseRecord)
      .eq("id", id)
      .select()
      .single());
  }

  if (error) throw error;

  await syncRequisicionOsis(id, formData);

  revalidatePath("/dashboard/capacitacion/requisiciones");
  revalidateTag("osis", "default");
  revalidateTag("osi-numbers", "default");
  return data;
}

// Get requisitions for list view.
// Administración (admin/superadmin) sees all records; regular users only their own.
export async function getAllRequisiciones(isAdmin?: boolean) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id;

  if (!userId) return [];

  if (isAdmin === undefined) {
    isAdmin = await isRequisicionesAdmin();
  }

  let query = supabase
    .from("requisiciones")
    .select(`
      *,
      v_osi_formato_completo!left (
        id_osi,
        nro_osi,
        servicio,
        nombre_empresa,
        fecha_inicio_real,
        desglose_recursos_sesiones
      ),
      requisiciones_osis!requisiciones_osis_id_requisicion_fkey (
        id_osi
      )
    `)
    .order("id", { ascending: false })
    .is("deleted_at", null);

  if (isAdmin) {
    // Administración should not see records still awaiting approval:
    //   - internas with lider_estatus = 'pendiente' (or 'rechazada')
    //   - externas with coordinador_estatus = 'pendiente' (or 'rechazada')
    // Internas use lider_estatus (coordinador_estatus is null); externas use
    // coordinador_estatus (lider_estatus is null). So requiring BOTH gates to be
    // null/aprobada correctly hides pending records of either type.
    query = query
      .or("lider_estatus.is.null,lider_estatus.eq.aprobada")
      .or("coordinador_estatus.is.null,coordinador_estatus.eq.aprobada");
    let { data, error } = await query;
    // If the new columns don't exist yet, retry without the filters (admin sees all).
    if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
      console.warn("[getAllRequisiciones] approval columns not found, admin sees all");
      const fallback = await supabase
        .from("requisiciones")
        .select(`
          *,
          v_osi_formato_completo!left (
            id_osi,
            nro_osi,
            servicio,
            nombre_empresa,
            fecha_inicio_real,
            desglose_recursos_sesiones
          ),
          requisiciones_osis!requisiciones_osis_id_requisicion_fkey (
            id_osi
          )
        `)
        .order("id", { ascending: false })
        .is("deleted_at", null);
      data = fallback.data;
      error = fallback.error;
    }
    if (error) {
      console.error("Error fetching requisiciones:", error);
      return [];
    }
    return data;
  }

  // Non-admin: start with the user's own requisiciones.
  const isCapDept = await isCurrentUserCapacitacion();
  if (isCapDept) {
    const { data: dept } = await supabase
      .from("departamentos")
      .select("id")
      .ilike("nombre", "%capacitacion%")
      .maybeSingle();
    let creatorIds: string[] = [userId];
    if (dept?.id) {
      const { data: deptUsers } = await supabase
        .from("usuarios")
        .select("id_auth")
        .eq("departamento", dept.id)
        .not("id_auth", "is", null)
        .eq("esta_activo", true);
      creatorIds = (deptUsers || [])
        .map((u: any) => u.id_auth)
        .filter((id: string | null): id is string => Boolean(id));
      if (!creatorIds.includes(userId)) creatorIds.push(userId);
    }
    query = query.in("created_by", creatorIds);
  } else {
    query = query.eq("created_by", userId);
  }

  const { data: ownData, error: ownError } = await query;
  if (ownError) {
    console.error("Error fetching requisiciones:", ownError);
    return [];
  }

  // --- Approval queues for non-admin users ---
  // Liders see pending internas from their gerencia (awaiting their approval).
  // Coordinadors see pending externas from their department (awaiting their approval).
  // A gerencia lider whose department has no coordinador also sees that department's
  // pending externas (fallback approver).
  const merged = [...(ownData || [])];
  const ownIds = new Set(merged.map((r: any) => r.id));

  const SELECT_RELATIONS = `
    *,
    v_osi_formato_completo!left (
      id_osi,
      nro_osi,
      servicio,
      nombre_empresa,
      fecha_inicio_real,
      desglose_recursos_sesiones
    ),
    requisiciones_osis!requisiciones_osis_id_requisicion_fkey (
      id_osi
    )
  `;

  // Resolve prerequisites (all cache-warm from page.tsx Step 2)
  const ledGerencias = await getLedGerencias();
  const isLider = ledGerencias.length > 0;
  const coordDepts = await getCoordinatedDepartments();
  const isCoord = coordDepts.length > 0;
  const historyUsuarioId = await getCurrentUserUsuarioId();

  // Fetch department lists for lider queries (cache-warm)
  const [deptNames, noCoordDeptNames] = await Promise.all([
    isLider ? getDepartmentsInLedGerencias() : Promise.resolve([] as string[]),
    isLider ? getCoordinatorlessDepartmentsInLedGerencias() : Promise.resolve([] as string[]),
  ]);

  // Parallelize the 5 supplementary queries (all independent)
  const [
    pendingInternaResult,
    pendingExternaResult,
    pendingExternaFallbackResult,
    liderHistoryResult,
    coordHistoryResult,
  ] = await Promise.all([
    // 1) Lider: pending internas from every department in the gerencia(s) they lead.
    isLider && deptNames.length > 0
      ? supabase
          .from("requisiciones")
          .select(SELECT_RELATIONS)
          .eq("tipo_solicitud", "Interno")
          .eq("lider_estatus", "pendiente")
          .neq("created_by", userId)
          .is("deleted_at", null)
          .in("departamento", deptNames)
          .order("id", { ascending: false })
      : Promise.resolve({ data: null, error: null }),
    // 2) Coordinador: pending externas from EVERY department they coordinate
    isCoord
      ? supabase
          .from("requisiciones")
          .select(SELECT_RELATIONS)
          .eq("tipo_solicitud", "Externo")
          .eq("coordinador_estatus", "pendiente")
          .neq("created_by", userId)
          .is("deleted_at", null)
          .in("departamento", coordDepts)
          .order("id", { ascending: false })
      : Promise.resolve({ data: null, error: null }),
    // 3) Gerencia Lider fallback: pending externas from departments with NO coordinador
    isLider && noCoordDeptNames.length > 0
      ? supabase
          .from("requisiciones")
          .select(SELECT_RELATIONS)
          .eq("tipo_solicitud", "Externo")
          .eq("coordinador_estatus", "pendiente")
          .neq("created_by", userId)
          .is("deleted_at", null)
          .in("departamento", noCoordDeptNames)
          .order("id", { ascending: false })
      : Promise.resolve({ data: null, error: null }),
    // 4) Lider history: internas the current user approved/rejected as lider.
    isLider && historyUsuarioId
      ? supabase
          .from("requisiciones")
          .select(SELECT_RELATIONS)
          .eq("tipo_solicitud", "Interno")
          .eq("lider_por", historyUsuarioId)
          .in("lider_estatus", ["aprobada", "rechazada"])
          .is("deleted_at", null)
          .order("id", { ascending: false })
      : Promise.resolve({ data: null, error: null }),
    // 5) Coordinador history: externas the current user approved/rejected as coordinador
    isCoord && userId
      ? supabase
          .from("requisiciones")
          .select(SELECT_RELATIONS)
          .eq("tipo_solicitud", "Externo")
          .eq("coordinador_por", userId)
          .in("coordinador_estatus", ["aprobada", "rechazada"])
          .is("deleted_at", null)
          .order("id", { ascending: false })
      : Promise.resolve({ data: null, error: null }),
  ]);

  // Process results in order (preserving original merge logic)
  const addPending = (rows: any[] | null) => {
    for (const r of rows || []) {
      if (!ownIds.has(r.id)) {
        merged.push(r);
        ownIds.add(r.id);
      }
    }
  };

  const addHistory = (rows: any[] | null) => {
    for (const r of rows || []) {
      if (!r) continue;
      r._isApprovalHistory = true;
      if (!ownIds.has(r.id)) {
        merged.push(r);
        ownIds.add(r.id);
      } else {
        const existing = merged.find((m: any) => m.id === r.id);
        if (existing) existing._isApprovalHistory = true;
      }
    }
  };

  // 1) Pending internas
  if (pendingInternaResult.error && (pendingInternaResult.error.message || "").includes("column") && (pendingInternaResult.error.message || "").includes("does not exist")) {
    console.warn("[getAllRequisiciones] lider_estatus column not found, skipping lider queue");
  } else if (pendingInternaResult.error) {
    console.error("[getAllRequisiciones] Error fetching pending internas for lider:", pendingInternaResult.error);
  } else {
    addPending(pendingInternaResult.data);
  }

  // 2) Pending externas (coordinador)
  if (pendingExternaResult.error && (pendingExternaResult.error.message || "").includes("column") && (pendingExternaResult.error.message || "").includes("does not exist")) {
    console.warn("[getAllRequisiciones] coordinador_estatus column not found, skipping coordinador queue");
  } else if (pendingExternaResult.error) {
    console.error("[getAllRequisiciones] Error fetching pending externas for coordinador:", pendingExternaResult.error);
  } else {
    addPending(pendingExternaResult.data);
  }

  // 3) Pending externas (lider fallback)
  if (pendingExternaFallbackResult.error && (pendingExternaFallbackResult.error.message || "").includes("column") && (pendingExternaFallbackResult.error.message || "").includes("does not exist")) {
    console.warn("[getAllRequisiciones] coordinador_estatus column not found, skipping lider-fallback queue");
  } else if (pendingExternaFallbackResult.error) {
    console.error("[getAllRequisiciones] Error fetching pending externas for lider fallback:", pendingExternaFallbackResult.error);
  } else {
    addPending(pendingExternaFallbackResult.data);
  }

  // 4) Lider history
  if (liderHistoryResult.error && (liderHistoryResult.error.message || "").includes("column") && (liderHistoryResult.error.message || "").includes("does not exist")) {
    console.warn("[getAllRequisiciones] lider_por column not found, skipping lider history");
  } else if (liderHistoryResult.error) {
    console.error("[getAllRequisiciones] Error fetching lider history:", liderHistoryResult.error);
  } else {
    addHistory(liderHistoryResult.data);
  }

  // 5) Coordinador history
  if (coordHistoryResult.error && (coordHistoryResult.error.message || "").includes("column") && (coordHistoryResult.error.message || "").includes("does not exist")) {
    console.warn("[getAllRequisiciones] coordinador_por column not found, skipping coordinador history");
  } else if (coordHistoryResult.error) {
    console.error("[getAllRequisiciones] Error fetching coordinador history:", coordHistoryResult.error);
  } else {
    addHistory(coordHistoryResult.data);
  }

  merged.sort((a: any, b: any) => b.id - a.id);
  return merged;
}

// Delete requisition record
// Admin users: soft delete (sets deleted_at). Regular users: hard delete (only pending records).
export async function deleteRequisicionRecord(id: number) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("requisiciones")
    .select("estatus_admin")
    .eq("id", id)
    .single();

  const isLocked = existing?.estatus_admin === "procesada" || existing?.estatus_admin === "rechazada";
  if (isLocked && !(await isRequisicionesAdmin())) {
    throw new Error("Esta requisición ya fue procesada por Administración y no puede eliminarse.");
  }

  const isAdmin = await isRequisicionesAdmin();

  if (isAdmin) {
    const { error } = await supabase
      .from("requisiciones")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("requisiciones")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  revalidatePath("/dashboard/capacitacion/requisiciones");
}

// Mark a requisition as procesada / pendiente / rechazada (Administración only).
// When rejecting, a motivo (reason) is required and persisted + included in the
// creator notification.
export async function setRequisicionEstatus(
  id: number,
  estatus: "pendiente" | "procesada" | "rechazada",
  motivoRechazo?: string,
  tasaCambio?: number | null,
) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("No tiene permisos para cambiar el estatus de requisiciones.");
  }

  if (estatus === "rechazada" && !motivoRechazo?.trim()) {
    throw new Error("Debe indicar el motivo del rechazo.");
  }

  const userClient = await createClient();
  const userResponse = await userClient.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const isResolved = estatus === "procesada" || estatus === "rechazada";

  const update: Record<string, unknown> = {
    estatus_admin: estatus,
    procesada_por: isResolved ? userId : null,
    procesada_at: isResolved ? new Date().toISOString() : null,
  };
  if (estatus === "rechazada") {
    update.motivo_rechazo = motivoRechazo!.trim();
  }
  // Snapshot the exchange rate when processing so future views show the rate
  // that was actually used at payment time, not today's live rate.
  if (estatus === "procesada" && tasaCambio != null && !isNaN(tasaCambio)) {
    update.tasa_cambio = tasaCambio;
    update.tasa_cambio_at = new Date().toISOString();
  }

  const adminClient = await createAdminClient();
  let { error } = await adminClient
    .from("requisiciones")
    .update(update)
    .eq("id", id);

  // If the tasa_cambio columns don't exist yet (migration not applied), retry
  // without them so the estatus change still goes through.
  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    console.warn("[setRequisicionEstatus] tasa_cambio columns not found, retrying without rate snapshot");
    const { tasa_cambio, tasa_cambio_at, ...updateWithoutRate } = update;
    void tasa_cambio; void tasa_cambio_at;
    const retry = await adminClient
      .from("requisiciones")
      .update(updateWithoutRate)
      .eq("id", id);
    error = retry.error;
  }

  if (error) {
    console.error("[setRequisicionEstatus] Supabase update error:", JSON.stringify(error));
    throw error;
  }

  if (isResolved) {
    const { data: req, error: fetchError } = await adminClient
      .from("requisiciones")
      .select(`
        created_by,
        tipo_solicitud,
        v_osi_formato_completo!left (nro_osi)
      `)
      .eq("id", id)
      .single();

    console.log(`[setRequisicionEstatus] id=${id} estatus=${estatus} created_by=${req?.created_by} fetchError=${fetchError?.message}`);

    if (req?.created_by) {
      const requisicionLabel = req.tipo_solicitud === "Interno"
        ? "interna"
        : `de la OSI N° ${(req.v_osi_formato_completo as any)?.nro_osi || ""}`;
      if (estatus === "procesada") {
        console.log(`[setRequisicionEstatus] Calling notifyCreatorOfProcesada for creator ${req.created_by}`);
        await notifyCreatorOfProcesada(id, req.created_by, requisicionLabel);
      } else if (estatus === "rechazada") {
        console.log(`[setRequisicionEstatus] Calling notifyCreatorOfRechazada for creator ${req.created_by}`);
        await notifyCreatorOfRechazada(id, req.created_by, requisicionLabel, motivoRechazo!.trim());
      }
    } else {
      console.warn(`[setRequisicionEstatus] No created_by found for requisicion ${id}, skipping creator notification`);
    }
  }

  revalidatePath("/dashboard/capacitacion/requisiciones");
}

// Coordinador (or gerencia Lider fallback) approves a pending EXTERNA. After
// approval, Administración is notified (the requisicion becomes visible to them).
export async function approveRequisicionByCoordinador(id: number) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const admin = await createAdminClient();

  // Try selecting with new columns; fall back to base columns if they don't exist.
  let existing: any;
  let fetchError: any;
  ({ data: existing, error: fetchError } = await admin
    .from("requisiciones")
    .select("tipo_solicitud, coordinador_estatus, solicitante, created_by, departamento, v_osi_formato_completo!left (nro_osi)")
    .eq("id", id)
    .single());

  if (fetchError && (fetchError.message || "").includes("column") && (fetchError.message || "").includes("does not exist")) {
    const fallback = await admin
      .from("requisiciones")
      .select("tipo_solicitud, solicitante, created_by, v_osi_formato_completo!left (nro_osi)")
      .eq("id", id)
      .single();
    existing = fallback.data;
    fetchError = fallback.error;
  }

  if (fetchError || !existing) throw new Error("Requisición no encontrada.");
  if (existing.tipo_solicitud === "Interno") {
    throw new Error("Las requisiciones internas se aprueban por el lider, no por el coordinador.");
  }
  if (existing.coordinador_estatus !== undefined && existing.coordinador_estatus !== "pendiente") {
    throw new Error("Esta requisición externa ya fue procesada por el coordinador.");
  }
  // Approver for externas: the department's coordinador, OR (if the department
  // has no coordinador) the gerencia's lider.
  if (existing.departamento) {
    const isCoord = await isCoordinadorForDepartment(existing.departamento);
    if (!isCoord) {
      const hasCoord = await departmentHasCoordinador(existing.departamento);
      if (hasCoord) {
        throw new Error("Solo el coordinador del departamento puede aprobar esta requisición externa.");
      }
      const isLider = await isLiderForDepartmentGerencia(existing.departamento);
      if (!isLider) {
        throw new Error("Solo el lider de la gerencia puede aprobar esta requisición externa (el departamento no tiene coordinador).");
      }
    }
  }

  // Try updating with new columns; fall back to just notifying admin if they don't exist.
  // NOTE: coordinador_por is a UUID column (stores auth uid), unlike lider_por
  // which is int4 (stores usuarios.id). Use the auth UUID here.
  const { error } = await admin
    .from("requisiciones")
    .update({
      coordinador_estatus: "aprobada",
      coordinador_por: userId,
      coordinador_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    console.warn("[approveRequisicionByCoordinador] coordinador columns not found, notifying admin only");
  } else if (error) {
    throw error;
  }

  // Now that the approver approved, surface the requisicion to Administración.
  const requisicionLabel = `de la OSI N° ${(existing.v_osi_formato_completo as any)?.nro_osi || ""}`;
  await notifyAdminsOfNewRequisicion(id, existing.solicitante || "", requisicionLabel);

  revalidatePath("/dashboard/capacitacion/requisiciones");
  revalidatePath(`/dashboard/capacitacion/requisiciones/view/${id}`);
}

// Coordinador (or gerencia Lider fallback) rejects a pending EXTERNA with a
// reason. The creator is notified and the requisicion is locked for further editing.
export async function rejectRequisicionByCoordinador(id: number, motivo: string) {
  if (!motivo?.trim()) {
    throw new Error("Debe indicar el motivo del rechazo.");
  }

  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const admin = await createAdminClient();

  // Try selecting with new columns; fall back to base columns if they don't exist.
  let existing: any;
  let fetchError: any;
  ({ data: existing, error: fetchError } = await admin
    .from("requisiciones")
    .select("tipo_solicitud, coordinador_estatus, solicitante, created_by, departamento, v_osi_formato_completo!left (nro_osi)")
    .eq("id", id)
    .single());

  if (fetchError && (fetchError.message || "").includes("column") && (fetchError.message || "").includes("does not exist")) {
    const fallback = await admin
      .from("requisiciones")
      .select("tipo_solicitud, solicitante, created_by, v_osi_formato_completo!left (nro_osi)")
      .eq("id", id)
      .single();
    existing = fallback.data;
    fetchError = fallback.error;
  }

  if (fetchError || !existing) throw new Error("Requisición no encontrada.");
  if (existing.tipo_solicitud === "Interno") {
    throw new Error("Las requisiciones internas se rechazan por el lider, no por el coordinador.");
  }
  if (existing.coordinador_estatus !== undefined && existing.coordinador_estatus !== "pendiente") {
    throw new Error("Esta requisición externa ya fue procesada por el coordinador.");
  }
  // Approver for externas: the department's coordinador, OR (if the department
  // has no coordinador) the gerencia's lider.
  if (existing.departamento) {
    const isCoord = await isCoordinadorForDepartment(existing.departamento);
    if (!isCoord) {
      const hasCoord = await departmentHasCoordinador(existing.departamento);
      if (hasCoord) {
        throw new Error("Solo el coordinador del departamento puede rechazar esta requisición externa.");
      }
      const isLider = await isLiderForDepartmentGerencia(existing.departamento);
      if (!isLider) {
        throw new Error("Solo el lider de la gerencia puede rechazar esta requisición externa (el departamento no tiene coordinador).");
      }
    }
  }

  // Try updating with new columns; fall back to just notifying creator if they don't exist.
  // NOTE: coordinador_por is a UUID column (stores auth uid), unlike lider_por
  // which is int4 (stores usuarios.id). Use the auth UUID here.
  const { error } = await admin
    .from("requisiciones")
    .update({
      coordinador_estatus: "rechazada",
      coordinador_por: userId,
      coordinador_at: new Date().toISOString(),
      motivo_rechazo_coordinador: motivo.trim(),
    })
    .eq("id", id);

  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    console.warn("[rejectRequisicionByCoordinador] coordinador columns not found, notifying creator only");
  } else if (error) {
    throw error;
  }

  if (existing.created_by) {
    const requisicionLabel = `de la OSI N° ${(existing.v_osi_formato_completo as any)?.nro_osi || ""}`;
    await notifyCreatorOfCoordinadorRechazada(id, existing.created_by, requisicionLabel, motivo.trim());
  }

  revalidatePath("/dashboard/capacitacion/requisiciones");
  revalidatePath(`/dashboard/capacitacion/requisiciones/view/${id}`);
}

// Lider approves a pending INTERNA. After approval, Administración is notified
// (the requisicion becomes visible to them).
export async function approveRequisicionByLider(id: number) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;
  const usuarioId = await getCurrentUserUsuarioId();

  const admin = await createAdminClient();

  // Try selecting with new columns; fall back to base columns if they don't exist.
  let existing: any;
  let fetchError: any;
  ({ data: existing, error: fetchError } = await admin
    .from("requisiciones")
    .select("tipo_solicitud, lider_estatus, solicitante, created_by, departamento, v_osi_formato_completo!left (nro_osi)")
    .eq("id", id)
    .single());

  if (fetchError && (fetchError.message || "").includes("column") && (fetchError.message || "").includes("does not exist")) {
    const fallback = await admin
      .from("requisiciones")
      .select("tipo_solicitud, solicitante, created_by, v_osi_formato_completo!left (nro_osi)")
      .eq("id", id)
      .single();
    existing = fallback.data;
    fetchError = fallback.error;
  }

  if (fetchError || !existing) throw new Error("Requisición no encontrada.");
  if (existing.tipo_solicitud !== "Interno") {
    throw new Error("Solo las requisiciones internas requieren aprobación del lider.");
  }
  if (existing.lider_estatus !== undefined && existing.lider_estatus !== "pendiente") {
    throw new Error("Esta requisición interna ya fue procesada por el lider.");
  }
  // A creator can never approve their own interna.
  if (existing.created_by && userId && existing.created_by === userId) {
    throw new Error("No puede aprobar su propia requisición interna.");
  }
  // Verify the caller is the lider who approves internas for this department.
  if (existing.departamento) {
    const isLider = await isLiderForInternaApproval(existing.departamento);
    if (!isLider) {
      throw new Error("Solo el lider de la gerencia puede aprobar esta requisición interna.");
    }
  }

  // Try updating with new columns; fall back to just notifying admin if they don't exist.
  const { error } = await admin
    .from("requisiciones")
    .update({
      lider_estatus: "aprobada",
      lider_por: usuarioId,
      lider_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    console.warn("[approveRequisicionByLider] lider columns not found, notifying admin only");
  } else if (error) {
    throw error;
  }

  // Now that the lider approved, surface the requisicion to Administración.
  await notifyAdminsOfNewRequisicion(id, existing.solicitante || "", "interna");

  revalidatePath("/dashboard/capacitacion/requisiciones");
  revalidatePath(`/dashboard/capacitacion/requisiciones/view/${id}`);
}

// Lider rejects a pending INTERNA with a reason. The creator is notified and
// the requisicion is locked for further editing.
export async function rejectRequisicionByLider(id: number, motivo: string) {
  if (!motivo?.trim()) {
    throw new Error("Debe indicar el motivo del rechazo.");
  }

  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;
  const usuarioId = await getCurrentUserUsuarioId();

  const admin = await createAdminClient();

  // Try selecting with new columns; fall back to base columns if they don't exist.
  let existing: any;
  let fetchError: any;
  ({ data: existing, error: fetchError } = await admin
    .from("requisiciones")
    .select("tipo_solicitud, lider_estatus, solicitante, created_by, departamento, v_osi_formato_completo!left (nro_osi)")
    .eq("id", id)
    .single());

  if (fetchError && (fetchError.message || "").includes("column") && (fetchError.message || "").includes("does not exist")) {
    const fallback = await admin
      .from("requisiciones")
      .select("tipo_solicitud, solicitante, created_by, v_osi_formato_completo!left (nro_osi)")
      .eq("id", id)
      .single();
    existing = fallback.data;
    fetchError = fallback.error;
  }

  if (fetchError || !existing) throw new Error("Requisición no encontrada.");
  if (existing.tipo_solicitud !== "Interno") {
    throw new Error("Solo las requisiciones internas requieren aprobación del lider.");
  }
  if (existing.lider_estatus !== undefined && existing.lider_estatus !== "pendiente") {
    throw new Error("Esta requisición interna ya fue procesada por el lider.");
  }
  // A creator can never reject their own interna.
  if (existing.created_by && userId && existing.created_by === userId) {
    throw new Error("No puede rechazar su propia requisición interna.");
  }
  // Verify the caller is the lider who approves internas for this department.
  if (existing.departamento) {
    const isLider = await isLiderForInternaApproval(existing.departamento);
    if (!isLider) {
      throw new Error("Solo el lider de la gerencia puede rechazar esta requisición interna.");
    }
  }

  // Try updating with new columns; fall back to just notifying creator if they don't exist.
  const { error } = await admin
    .from("requisiciones")
    .update({
      lider_estatus: "rechazada",
      lider_por: usuarioId,
      lider_at: new Date().toISOString(),
      motivo_rechazo_lider: motivo.trim(),
    })
    .eq("id", id);

  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    console.warn("[rejectRequisicionByLider] lider columns not found, notifying creator only");
  } else if (error) {
    throw error;
  }

  if (existing.created_by) {
    await notifyCreatorOfLiderRechazada(id, existing.created_by, "interna", motivo.trim());
  }

  revalidatePath("/dashboard/capacitacion/requisiciones");
  revalidatePath(`/dashboard/capacitacion/requisiciones/view/${id}`);
}

// Approver (lider for internas, coordinador/lider-fallback for externas) edits the
// CONTENT of a pending requisicion before approving. The original_snapshot is
// preserved (captured at creation or, for legacy records, from the current state
// on the first edit) so the solicitor can see a diff of what changed. This action
// does NOT change lider_estatus / coordinador_estatus — that stays "pendiente"
// until the approver explicitly approves/rejects.
export async function updateRequisicionByApprover(
  id: number,
  updates: {
    additional_items?: any[];
    observaciones_compras?: string;
    prioridad?: string;
    corresponde_a?: string;
    fecha_solicitud?: string;
    solicitante?: string;
  },
) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;
  const usuarioId = await getCurrentUserUsuarioId();

  const admin = await createAdminClient();

  // Fetch the record with approval + snapshot columns. Fall back to base columns
  // if the new columns don't exist yet (migration not applied).
  let existing: any;
  let fetchError: any;
  ({ data: existing, error: fetchError } = await admin
    .from("requisiciones")
    .select("tipo_solicitud, estatus_admin, lider_estatus, coordinador_estatus, departamento, created_by, original_snapshot, aprobador_edito, additional_items, observaciones_compras, prioridad, corresponde_a, fecha_solicitud, solicitante, gerencia_solicitante, tipo_servicio, id_sesion, cant_traslado, cant_impresion, cant_honorarios, cant_informe_final, dias_traslado, costo_traslado, impresion_total, honorarios_total, informe_final_total, facilitador, cod_facilitador, cedula_facilitador, rif_facilitador, telefono_facilitador, banco, nro_cuenta, osi_fixed_items")
    .eq("id", id)
    .single());

  if (fetchError && (fetchError.message || "").includes("column") && (fetchError.message || "").includes("does not exist")) {
    const fallback = await admin
      .from("requisiciones")
      .select("tipo_solicitud, estatus_admin, departamento, created_by, additional_items, observaciones_compras, prioridad, corresponde_a, fecha_solicitud, solicitante, gerencia_solicitante, tipo_servicio, id_sesion, cant_traslado, cant_impresion, cant_honorarios, cant_informe_final, dias_traslado, costo_traslado, impresion_total, honorarios_total, informe_final_total, facilitador, cod_facilitador, cedula_facilitador, rif_facilitador, telefono_facilitador, banco, nro_cuenta, osi_fixed_items")
      .eq("id", id)
      .single();
    existing = fallback.data;
    fetchError = fallback.error;
  }

  if (fetchError || !existing) throw new Error("Requisición no encontrada.");

  const isInterna = existing.tipo_solicitud === "Interno";
  const adminProcessed = existing.estatus_admin === "procesada" || existing.estatus_admin === "rechazada";

  // Verify the caller is the approver (lider for internas, coordinador/lider-fallback
  // for externas). Edits are allowed while the approval is pending OR after the
  // approver has approved (they may realize they need to change something before
  // Administración processes it) — but NOT after a rejection (that's final) and
  // NOT after Administración has processed it.
  if (isInterna) {
    if (existing.lider_estatus === "rechazada") {
      throw new Error("Esta requisición interna fue rechazada por el lider y no puede editarse.");
    }
    if (adminProcessed) {
      throw new Error("Esta requisición ya fue procesada por Administración y no puede editarse.");
    }
    if (existing.departamento) {
      const isLider = await isLiderForInternaApproval(existing.departamento);
      if (!isLider) {
        throw new Error("Solo el lider de la gerencia puede editar esta requisición interna.");
      }
    }
  } else {
    if (existing.coordinador_estatus === "rechazada") {
      throw new Error("Esta requisición externa fue rechazada por el coordinador y no puede editarse.");
    }
    if (adminProcessed) {
      throw new Error("Esta requisición ya fue procesada por Administración y no puede editarse.");
    }
    if (existing.departamento) {
      const isCoord = await isCoordinadorForDepartment(existing.departamento);
      if (!isCoord) {
        const hasCoord = await departmentHasCoordinador(existing.departamento);
        if (hasCoord) {
          throw new Error("Solo el coordinador del departamento puede editar esta requisición externa.");
        }
        const isLider = await isLiderForDepartmentGerencia(existing.departamento);
        if (!isLider) {
          throw new Error("Solo el lider de la gerencia puede editar esta requisición externa (el departamento no tiene coordinador).");
        }
      }
    }
  }

  // A creator can never edit their own requisicion as an approver.
  if (existing.created_by && userId && existing.created_by === userId) {
    throw new Error("No puede modificar su propia requisición como aprobador.");
  }

  // Build the update payload from the provided fields only.
  const updatePayload: Record<string, any> = {};
  if (updates.additional_items !== undefined) updatePayload.additional_items = updates.additional_items;
  if (updates.observaciones_compras !== undefined) updatePayload.observaciones_compras = updates.observaciones_compras;
  if (updates.prioridad !== undefined) updatePayload.prioridad = updates.prioridad;
  if (updates.corresponde_a !== undefined) updatePayload.corresponde_a = updates.corresponde_a;
  if (updates.fecha_solicitud !== undefined) updatePayload.fecha_solicitud = updates.fecha_solicitud;
  if (updates.solicitante !== undefined) updatePayload.solicitante = updates.solicitante;

  // If this is the first approver edit and no original_snapshot exists (legacy
  // record created before the migration), capture it NOW from the current live
  // state so the diff has a baseline.
  const isFirstEdit = existing.aprobador_edito !== true;
  if (isFirstEdit && !existing.original_snapshot) {
    updatePayload.original_snapshot = buildRequisicionSnapshot(existing);
  }

  // Mark that the approver modified the requisicion.
  updatePayload.aprobador_edito = true;
  updatePayload.aprobador_edito_por = usuarioId;
  updatePayload.aprobador_edito_at = new Date().toISOString();

  const { error } = await admin
    .from("requisiciones")
    .update(updatePayload)
    .eq("id", id);

  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    // New columns not found — retry with just the content fields (no snapshot/approver tracking).
    console.warn("[updateRequisicionByApprover] approver columns not found, updating content only");
    const contentOnly: Record<string, any> = {};
    if (updates.additional_items !== undefined) contentOnly.additional_items = updates.additional_items;
    if (updates.observaciones_compras !== undefined) contentOnly.observaciones_compras = updates.observaciones_compras;
    if (updates.prioridad !== undefined) contentOnly.prioridad = updates.prioridad;
    if (updates.corresponde_a !== undefined) contentOnly.corresponde_a = updates.corresponde_a;
    if (updates.fecha_solicitud !== undefined) contentOnly.fecha_solicitud = updates.fecha_solicitud;
    if (updates.solicitante !== undefined) contentOnly.solicitante = updates.solicitante;
    const { error: contentErr } = await admin
      .from("requisiciones")
      .update(contentOnly)
      .eq("id", id);
    if (contentErr) throw contentErr;
  } else if (error) {
    throw error;
  }

  // Notify the creator on the FIRST edit only (avoid spam on subsequent saves).
  if (isFirstEdit && existing.created_by) {
    const approverRole = isInterna ? "Lider" : "Coordinador";
    const requisicionLabel = isInterna
      ? `interna #${id}`
      : `de la OSI N° ${(existing as any).v_osi_formato_completo?.nro_osi || ""}`;
    await notifyCreatorOfApproverChanges(id, existing.created_by, requisicionLabel, approverRole);
  }

  revalidatePath("/dashboard/capacitacion/requisiciones");
  revalidatePath(`/dashboard/capacitacion/requisiciones/view/${id}`);
}

// Toggle LISTO/PENDIENTE for an item of a General requisition (Administración only)
export async function updateItemVerificacion(
  requisicionId: number,
  itemId: string,
  verificacion: VerificacionStatus,
) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("No tiene permisos para verificar items de requisiciones.");
  }

  const userClient = await createClient();
  const userResponse = await userClient.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const adminClient = await createAdminClient();
  const { data: record, error: fetchError } = await adminClient
    .from("requisiciones")
    .select("additional_items")
    .eq("id", requisicionId)
    .single();

  if (fetchError) {
    console.error("[updateItemVerificacion] Fetch error:", JSON.stringify(fetchError));
    throw fetchError;
  }

  const isListo = verificacion === "listo";
  const items: RequisicionItem[] = (record?.additional_items || []).map(
    (item: RequisicionItem) =>
      item.id === itemId
        ? {
            ...item,
            verificacion,
            verificado_por: isListo ? userId : null,
            verificado_en: isListo ? new Date().toISOString() : null,
          }
        : item,
  );

  const { error } = await adminClient
    .from("requisiciones")
    .update({ additional_items: items })
    .eq("id", requisicionId);

  if (error) {
    console.error("[updateItemVerificacion] Update error:", JSON.stringify(error));
    throw error;
  }
  revalidatePath("/dashboard/capacitacion/requisiciones");
}

// Toggle verification for a fixed item field within an OSI block (Administración only)
export async function updateFixedItemVerificacion(
  requisicionId: number,
  idOsi: number,
  field: "verificacion_traslado" | "verificacion_impresion" | "verificacion_honorarios" | "verificacion_informe_final",
  verificacion: VerificacionStatus,
) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("No tiene permisos para verificar items de requisiciones.");
  }

  const userClient = await createClient();
  const userResponse = await userClient.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const adminClient = await createAdminClient();
  const { data: record, error: fetchError } = await adminClient
    .from("requisiciones")
    .select("osi_fixed_items")
    .eq("id", requisicionId)
    .single();

  if (fetchError) {
    console.error("[updateFixedItemVerificacion] Fetch error:", JSON.stringify(fetchError));
    throw fetchError;
  }

  const isListo = verificacion === "listo";
  const suffixMap: Record<string, string> = {
    verificacion_traslado: "traslado",
    verificacion_impresion: "impresion",
    verificacion_honorarios: "honorarios",
    verificacion_informe_final: "informe_final",
  };
  const suffix = suffixMap[field];
  const fixedItems: OSIFixedItem[] = (record?.osi_fixed_items || []).map(
    (fi: OSIFixedItem) =>
      fi.id_osi === idOsi
        ? {
            ...fi,
            [field]: verificacion,
            [`verificado_por_${suffix}`]: isListo ? userId : null,
            [`verificado_en_${suffix}`]: isListo ? new Date().toISOString() : null,
          }
        : fi,
  );

  const { error } = await adminClient
    .from("requisiciones")
    .update({ osi_fixed_items: fixedItems })
    .eq("id", requisicionId);

  if (error) {
    console.error("[updateFixedItemVerificacion] Update error:", JSON.stringify(error));
    throw error;
  }
  revalidatePath("/dashboard/capacitacion/requisiciones");
}

// Mark all additional_items and osi_fixed_items as "listo" (Administración only)
export async function markAllItemsVerificadas(requisicionId: number) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("No tiene permisos para verificar items de requisiciones.");
  }

  const userClient = await createClient();
  const userResponse = await userClient.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const adminClient = await createAdminClient();
  const { data: record, error: fetchError } = await adminClient
    .from("requisiciones")
    .select("additional_items, osi_fixed_items")
    .eq("id", requisicionId)
    .single();

  if (fetchError) {
    console.error("[markAllItemsVerificadas] Fetch error:", JSON.stringify(fetchError));
    throw fetchError;
  }

  const items: RequisicionItem[] = (record?.additional_items || []).map(
    (item: RequisicionItem) => ({ ...item, verificacion: "listo", verificado_por: userId, verificado_en: new Date().toISOString() }),
  );

  const nowIso = new Date().toISOString();
  const fixedItems: OSIFixedItem[] = (record?.osi_fixed_items || []).map(
    (fi: OSIFixedItem) => ({
      ...fi,
      verificacion_traslado: "listo" as const,
      verificacion_impresion: "listo" as const,
      verificacion_honorarios: "listo" as const,
      verificacion_informe_final: "listo" as const,
      verificado_por_traslado: userId,
      verificado_en_traslado: nowIso,
      verificado_por_impresion: userId,
      verificado_en_impresion: nowIso,
      verificado_por_honorarios: userId,
      verificado_en_honorarios: nowIso,
      verificado_por_informe_final: userId,
      verificado_en_informe_final: nowIso,
    }),
  );

  const { error } = await adminClient
    .from("requisiciones")
    .update({ additional_items: items, osi_fixed_items: fixedItems })
    .eq("id", requisicionId);

  if (error) {
    console.error("[markAllItemsVerificadas] Update error:", JSON.stringify(error));
    throw error;
  }
  revalidatePath("/dashboard/capacitacion/requisiciones");
}

// Save partial verification progress and notify the creator (Administración only)
export async function saveVerificacionProgress(requisicionId: number) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("No tiene permisos para guardar el avance de verificación.");
  }

  const supabase = await createAdminClient();

  const { data: record, error: fetchError } = await supabase
    .from("requisiciones")
    .select(`
      created_by,
      additional_items,
      osi_fixed_items,
      tipo_solicitud,
      v_osi_formato_completo!left (nro_osi)
    `)
    .eq("id", requisicionId)
    .single();

  if (fetchError) throw fetchError;

  const fixedItems: OSIFixedItem[] = record?.osi_fixed_items || [];
  const additionalItems: RequisicionItem[] = record?.additional_items || [];

  const fixedVerifiedCount = fixedItems.reduce(
    (sum, fi) =>
      sum +
      (fi.verificacion_traslado === "listo" ? 1 : 0) +
      (fi.verificacion_impresion === "listo" ? 1 : 0) +
      (fi.verificacion_honorarios === "listo" ? 1 : 0) +
      (fi.verificacion_informe_final === "listo" ? 1 : 0),
    0,
  );
  const fixedTotalCount = fixedItems.length * 4;
  const additionalVerifiedCount = additionalItems.filter(
    (item) => item.verificacion === "listo",
  ).length;
  const verifiedCount = fixedVerifiedCount + additionalVerifiedCount;
  const totalCount = fixedTotalCount + additionalItems.length;

  if (record?.created_by) {
    const requisicionLabel = record.tipo_solicitud === "Interno"
      ? "interna"
      : `de la OSI N° ${(record.v_osi_formato_completo as any)?.nro_osi || ""}`;
    await notifyCreatorOfPartialVerificacion(
      requisicionId,
      record.created_by,
      verifiedCount,
      totalCount,
      requisicionLabel,
    );
  }

  revalidatePath("/dashboard/capacitacion/requisiciones");
  return { verifiedCount, totalCount };
}

// Get facilitators for dropdown with banking details (cached 5 minutes)
export const getFacilitatorsForDropdown = unstable_cache(
  async () => {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("facilitadores")
      .select(`
        id, 
        nombre_apellido, 
        cedula, 
        rif,
        telefono,
        datos_bancarios (
          banco,
          nro_cuenta,
          tipo_cuenta,
          es_principal
        )
      `)
      .eq("is_active", true)
      .order("nombre_apellido");

    if (error) throw error;
    return data;
  },
  ["facilitators-for-dropdown"],
  { tags: ["facilitators"], revalidate: 300 }
);

// Get USD→VES exchange rate for display in requisicion view
export async function getExchangeRate(): Promise<number | null> {
  return await getUsdToVesRate();
}

// Update facilitador banking details from admin requisicion view.
// Updates both the requisiciones snapshot AND the facilitadores/datos_bancarios master tables.
export async function updateFacilitadorBankingDetails(
  requisicionId: number,
  updates: {
    banco: string;
    nro_cuenta: string;
    telefono_facilitador: string;
    cedula_facilitador: string;
    rif_facilitador: string;
  },
) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("Solo Administración puede editar los datos del facilitador.");
  }

  const supabase = await createAdminClient();

  // Fetch the requisicion to get cod_facilitador
  const { data: requisicion, error: reqError } = await supabase
    .from("requisiciones")
    .select("cod_facilitador")
    .eq("id", requisicionId)
    .single();

  if (reqError || !requisicion) {
    throw new Error("No se pudo encontrar la requisición.");
  }

  const facilitadorId = requisicion.cod_facilitador;

  // 1. Update the requisiciones snapshot
  const { error: snapshotError } = await supabase
    .from("requisiciones")
    .update({
      banco: updates.banco,
      nro_cuenta: updates.nro_cuenta,
      telefono_facilitador: updates.telefono_facilitador,
      cedula_facilitador: updates.cedula_facilitador,
      rif_facilitador: updates.rif_facilitador,
    })
    .eq("id", requisicionId);

  if (snapshotError) {
    console.error("[updateFacilitadorBankingDetails] Snapshot update error:", JSON.stringify(snapshotError));
    throw new Error("Error al actualizar el snapshot de la requisición.");
  }

  // 2. Update facilitadores master table if we have a valid facilitador id
  if (facilitadorId) {
    const { error: facError } = await supabase
      .from("facilitadores")
      .update({
        cedula: updates.cedula_facilitador,
        rif: updates.rif_facilitador,
        telefono: updates.telefono_facilitador,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq("id", facilitadorId);

    if (facError) {
      console.error("Error updating facilitadores table:", facError);
      throw new Error("Error al actualizar los datos del facilitador.");
    }

    // 3. Update or insert the principal datos_bancarios record
    const { data: existingBank } = await supabase
      .from("datos_bancarios")
      .select("id")
      .eq("id_facilitador", facilitadorId)
      .eq("es_principal", true)
      .single();

    if (existingBank) {
      const { error: bankError } = await supabase
        .from("datos_bancarios")
        .update({
          banco: updates.banco,
          nro_cuenta: updates.nro_cuenta,
        })
        .eq("id", existingBank.id);

      if (bankError) {
        console.error("Error updating datos_bancarios:", bankError);
        throw new Error("Error al actualizar los datos bancarios.");
      }
    } else {
      // No principal banking record exists — create one
      const { error: bankInsertError } = await supabase
        .from("datos_bancarios")
        .insert({
          id_facilitador: facilitadorId,
          banco: updates.banco,
          nro_cuenta: updates.nro_cuenta,
          es_principal: true,
          cedula_titular: updates.cedula_facilitador,
          nombre_titular: null,
          tipo_cuenta: null,
          telefono_pago_movil: updates.telefono_facilitador,
        });

      if (bankInsertError) {
        console.error("Error inserting datos_bancarios:", bankInsertError);
        throw new Error("Error al crear los datos bancarios.");
      }
    }
  }

  revalidatePath(`/dashboard/capacitacion/requisiciones/view/${requisicionId}`);
  return { success: true };
}

// Refresh requisicion data (fixed items snapshot) from the master OSI record.
// This resolves inconsistencies between the historical snapshot and the current OSI truth.
export async function refreshRequisicionFromOSI(requisicionId: number) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("Solo Administración puede sincronizar datos con la OSI.");
  }

  const supabase = await createClient();

  // 1. Get the current requisicion record to find linked OSIs
  const { data: record, error: fetchError } = await supabase
    .from("requisiciones")
    .select(`
      *,
      requisiciones_osis!requisiciones_osis_id_requisicion_fkey (id_osi)
    `)
    .eq("id", requisicionId)
    .single();

  if (fetchError || !record) {
    throw new Error("No se pudo encontrar la requisición.");
  }

  // 2. Identify all OSI IDs to refresh
  const osiIds: number[] = [];
  if (record.id_osi) osiIds.push(record.id_osi);
  
  if (record.requisiciones_osis && record.requisiciones_osis.length > 0) {
    record.requisiciones_osis.forEach((ro: any) => {
      if (ro.id_osi && !osiIds.includes(ro.id_osi)) {
        osiIds.push(ro.id_osi);
      }
    });
  }

  if (osiIds.length === 0) {
    throw new Error("Esta requisición no tiene OSIs vinculadas para sincronizar.");
  }

  // 3. Fetch fresh data for these OSIs
  const { data: freshOsis, error: freshError } = await supabase
    .from("v_osi_formato_completo")
    .select("*")
    .in("id_osi", osiIds);

  if (freshError || !freshOsis || freshOsis.length === 0) {
    throw new Error("No se pudo obtener información actualizada de las OSIs.");
  }

  const freshOsiMap = new Map(freshOsis.map((o: any) => [o.id_osi, o]));

  // 4. Update osi_fixed_items array
  const currentFixedItems: OSIFixedItem[] = record.osi_fixed_items || [];
  const updatedFixedItems: OSIFixedItem[] = currentFixedItems.map((fi) => {
    const fresh = freshOsiMap.get(fi.id_osi);
    if (!fresh) return fi;

    return {
      ...fi,
      nro_osi: fresh.nro_osi,
      costo_traslado: fresh.costo_traslado || 0,
      impresion_total: fresh.costo_impresion_material || 0,
      honorarios_horas: fresh.horas_honorarios_instructor || 0,
      honorarios_costo_hora: fresh.tarifa_hora_honorarios || 0,
      honorarios_total: fresh.costo_honorarios_instructor || 0,
    };
  });

  // 5. Update legacy snapshot fields from the first (primary) OSI
  const primaryOsi = freshOsiMap.get(record.id_osi || osiIds[0]);
  const updates: any = {
    osi_fixed_items: updatedFixedItems,
  };

  if (primaryOsi) {
    updates.costo_traslado = (record.dias_traslado || 1) * (primaryOsi.costo_traslado || 0);
    updates.impresion_total = primaryOsi.costo_impresion_material || 0;
    updates.honorarios_total = primaryOsi.costo_honorarios_instructor || 0;
  }

  // 6. Save updates
  const { error: updateError } = await supabase
    .from("requisiciones")
    .update(updates)
    .eq("id", requisicionId);

  if (updateError) {
    console.error("Error updating requisicion from OSI:", updateError);
    throw new Error("Error al guardar los datos actualizados.");
  }

  revalidatePath(`/dashboard/capacitacion/requisiciones/view/${requisicionId}`);
  return { success: true };
}

// Acknowledge receipt of a processed requisicion (creator only)
export async function acknowledgeRequisicionReceipt(id: number) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id;

  if (!userId) {
    throw new Error("Debe iniciar sesión para confirmar la recepción.");
  }

  // Fetch the requisicion to verify ownership and status
  const { data: req, error: fetchError } = await supabase
    .from("requisiciones")
    .select("created_by, estatus_admin, acuse_recibido, procesada_por, tipo_solicitud, v_osi_formato_completo!left (nro_osi)")
    .eq("id", id)
    .single();

  if (fetchError || !req) {
    throw new Error("No se encontró la requisición.");
  }

  // Only the creator can acknowledge
  if (req.created_by !== userId) {
    throw new Error("Solo el solicitante puede confirmar la recepción.");
  }

  // Only when procesada
  if (req.estatus_admin !== "procesada") {
    throw new Error("Solo se puede confirmar la recepción de requisiciones procesadas.");
  }

  // Prevent double acknowledge
  if (req.acuse_recibido) {
    throw new Error("Ya se ha confirmado la recepción de esta requisición.");
  }

  // Update the record
  const { error: updateError } = await supabase
    .from("requisiciones")
    .update({
      acuse_recibido: true,
      acuse_recibido_at: new Date().toISOString(),
      acuse_recibido_por: userId,
    })
    .eq("id", id);

  if (updateError) throw updateError;

  // Notify the admin who processed it
  if (req.procesada_por) {
    const adminClient = await createAdminClient();
    const { data: creator } = await adminClient
      .from("usuarios")
      .select("nombre_apellido")
      .eq("id_auth", userId)
      .single();

    const solicitanteName = creator?.nombre_apellido || "El solicitante";
    const requisicionLabel = req.tipo_solicitud === "Interno"
      ? "interna"
      : `de la OSI N° ${(req.v_osi_formato_completo as any)?.nro_osi || ""}`;

    await notifyAdminOfAcuseRecibo(id, req.procesada_por, solicitanteName, requisicionLabel);
  }

  revalidatePath("/dashboard/capacitacion/requisiciones");
  revalidatePath(`/dashboard/capacitacion/requisiciones/view/${id}`);
}
