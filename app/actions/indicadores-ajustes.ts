"use server";

import { createAdminClient, createClient } from "@/utils/supabase/server";

export interface SaveIndicadorAjusteParams {
  osiId: number;
  fechaEjecucion?: string | null;
  fechaEmision?: string | null;
  motivo?: string | null;
  emitidoEnOtraOsi?: boolean;
  osiReferenciaId?: number | null;
  nroOsiReferencia?: string | null;
}

export interface OsiReferenciaOption {
  osiId: number;
  nroOsi: string;
  empresa: string;
  servicio: string;
  fechaEmision: string | null;
  tieneCertificados: boolean;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Persist manual date adjustments for an OSI in the 72h certificates indicators view.
 * Kept strictly in `capacitacion_indicadores_ajustes` so core operational tables
 * (ejecucion_osi, osi_sesion, certificados) remain untouched.
 */
export async function saveIndicadorAjuste({
  osiId,
  fechaEjecucion,
  fechaEmision,
  motivo,
  emitidoEnOtraOsi = false,
  osiReferenciaId = null,
  nroOsiReferencia = null,
}: SaveIndicadorAjusteParams): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(osiId) || osiId <= 0) {
    return { success: false, error: "ID de OSI inválido" };
  }

  // Normalize dates: trim and ensure YYYY-MM-DD or null
  const cleanEjecucion = fechaEjecucion?.trim() ? fechaEjecucion.trim() : null;
  const cleanEmision = fechaEmision?.trim() ? fechaEmision.trim() : null;
  let cleanMotivo = motivo?.trim() ? motivo.trim() : null;
  const isOtraOsi = Boolean(emitidoEnOtraOsi);
  const cleanNroRef = nroOsiReferencia?.trim() ? nroOsiReferencia.trim() : null;

  if (cleanEjecucion && !DATE_REGEX.test(cleanEjecucion)) {
    return { success: false, error: "Formato de fecha de ejecución inválido (debe ser YYYY-MM-DD)" };
  }

  if (cleanEmision && !DATE_REGEX.test(cleanEmision)) {
    return { success: false, error: "Formato de fecha de emisión inválido (debe ser YYYY-MM-DD)" };
  }

  if (isOtraOsi && cleanNroRef && !cleanMotivo) {
    cleanMotivo = `Certificados emitidos en ${cleanNroRef}`;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = await createAdminClient();

    // If both dates are empty/null and not linked to another OSI, clear the adjustment record
    if (!cleanEjecucion && !cleanEmision && !isOtraOsi) {
      const { error: delError } = await admin
        .from("capacitacion_indicadores_ajustes")
        .delete()
        .eq("osi_id", osiId);

      if (delError) {
        console.error("[indicadores-ajustes] Error deleting record:", delError);
        return { success: false, error: delError.message };
      }
      return { success: true };
    }

    // Try saving with new columns first (if migration has been run)
    const fullPayload: Record<string, unknown> = {
      osi_id: osiId,
      fecha_ejecucion: cleanEjecucion,
      fecha_emision: cleanEmision,
      motivo: cleanMotivo,
      emitido_en_otra_osi: isOtraOsi,
      osi_referencia_id: isOtraOsi ? osiReferenciaId : null,
      nro_osi_referencia: isOtraOsi ? cleanNroRef : null,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    };

    const { error: upsertError } = await admin
      .from("capacitacion_indicadores_ajustes")
      .upsert(fullPayload, { onConflict: "osi_id" });

    if (upsertError) {
      // If error is caused by missing column (before migration runs in Supabase), fallback gracefully
      const isColumnMissing =
        upsertError.message.includes("column") ||
        upsertError.message.includes("emitido_en_otra_osi") ||
        upsertError.message.includes("osi_referencia_id");

      if (isColumnMissing) {
        console.warn("[indicadores-ajustes] New columns not found in DB yet, falling back to basic columns:", upsertError.message);
        const fallbackMotivo = isOtraOsi && cleanNroRef && !cleanMotivo?.includes(cleanNroRef)
          ? `[Emitido en ${cleanNroRef}] ${cleanMotivo || ""}`.trim()
          : cleanMotivo;

        const { error: fallbackError } = await admin
          .from("capacitacion_indicadores_ajustes")
          .upsert(
            {
              osi_id: osiId,
              fecha_ejecucion: cleanEjecucion,
              fecha_emision: cleanEmision,
              motivo: fallbackMotivo,
              updated_at: new Date().toISOString(),
              updated_by: user?.id ?? null,
            },
            { onConflict: "osi_id" }
          );

        if (fallbackError) {
          console.error("[indicadores-ajustes] Error in fallback upsert:", fallbackError);
          return { success: false, error: fallbackError.message };
        }
        return { success: true };
      }

      console.error("[indicadores-ajustes] Error upserting ajuste:", upsertError);
      return { success: false, error: upsertError.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[indicadores-ajustes] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido al guardar el ajuste",
    };
  }
}

/**
 * Reset one or both adjusted dates for an OSI back to original system calculations.
 */
export async function resetIndicadorAjuste(
  osiId: number,
  tipo: "all" | "ejecucion" | "emision" = "all"
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(osiId) || osiId <= 0) {
    return { success: false, error: "ID de OSI inválido" };
  }

  try {
    const admin = await createAdminClient();

    if (tipo === "all") {
      const { error: delError } = await admin
        .from("capacitacion_indicadores_ajustes")
        .delete()
        .eq("osi_id", osiId);

      if (delError) {
        console.error("[indicadores-ajustes] Error resetting all:", delError);
        return { success: false, error: delError.message };
      }
      return { success: true };
    }

    // Single date reset: check existing row
    const { data: existing, error: selError } = await admin
      .from("capacitacion_indicadores_ajustes")
      .select("*")
      .eq("osi_id", osiId)
      .single();

    if (selError || !existing) {
      // Nothing to reset
      return { success: true };
    }

    const newEjecucion = tipo === "ejecucion" ? null : existing.fecha_ejecucion;
    const newEmision = tipo === "emision" ? null : existing.fecha_emision;

    if (!newEjecucion && !newEmision) {
      // Both are now null, delete row
      await admin
        .from("capacitacion_indicadores_ajustes")
        .delete()
        .eq("osi_id", osiId);
      return { success: true };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const updatePayload: Record<string, unknown> = {
      fecha_ejecucion: newEjecucion,
      fecha_emision: newEmision,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    };

    if (tipo === "emision") {
      updatePayload.emitido_en_otra_osi = false;
      updatePayload.osi_referencia_id = null;
      updatePayload.nro_osi_referencia = null;
    }

    const { error: updateError } = await admin
      .from("capacitacion_indicadores_ajustes")
      .update(updatePayload)
      .eq("osi_id", osiId);

    if (updateError) {
      // If error is caused by missing column, update without new columns
      delete updatePayload.emitido_en_otra_osi;
      delete updatePayload.osi_referencia_id;
      delete updatePayload.nro_osi_referencia;

      const { error: retryError } = await admin
        .from("capacitacion_indicadores_ajustes")
        .update(updatePayload)
        .eq("osi_id", osiId);

      if (retryError) {
        console.error("[indicadores-ajustes] Error resetting single date:", retryError);
        return { success: false, error: retryError.message };
      }
    }

    return { success: true };
  } catch (err) {
    console.error("[indicadores-ajustes] Unexpected error resetting:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al restablecer fechas",
    };
  }
}

/**
 * Search available OSIs to link as the reference where certificates were issued.
 * Returns OSIs with their company, service, and existing certificate emission date if any.
 */
export async function buscarOsisParaReferencia(
  query: string,
  excludeOsiId?: number
): Promise<{ success: boolean; data?: OsiReferenciaOption[]; error?: string }> {
  try {
    const supabase = await createClient();
    const clean = query.trim().replace(/[%_]/g, "");

    let builder = supabase
      .from("v_osi_formato_completo")
      .select("id_osi, nro_osi, nombre_empresa, servicio, tipo_servicio")
      .ilike("tipo_servicio", "%capacitacion%")
      .not("nro_osi", "ilike", "%PEN-%");

    if (clean) {
      builder = builder.or(`nro_osi.ilike.%${clean}%,nombre_empresa.ilike.%${clean}%,servicio.ilike.%${clean}%`);
    }

    const { data: osis, error } = await builder
      .order("nro_osi", { ascending: false })
      .limit(30);

    if (error) {
      console.error("[indicadores-ajustes] Error searching OSIs for reference:", error);
      return { success: false, error: error.message };
    }

    const filteredOsis = (osis || []).filter(
      (o: { id_osi: number | null }) => o.id_osi != null && o.id_osi !== excludeOsiId
    );

    if (filteredOsis.length === 0) {
      return { success: true, data: [] };
    }

    const osiIds = filteredOsis.map((o: { id_osi: number }) => o.id_osi);

    // Fetch numeric OSI sequential for certificates lookup
    const { data: ejecRows } = await supabase
      .from("ejecucion_osi")
      .select("id, nro_osi_secuencial")
      .in("id", osiIds);

    const numericMap = new Map<number, number>();
    const numericList: number[] = [];
    for (const e of ejecRows || []) {
      if (e.nro_osi_secuencial != null) {
        const n = typeof e.nro_osi_secuencial === "number" ? e.nro_osi_secuencial : parseInt(String(e.nro_osi_secuencial), 10);
        if (Number.isFinite(n)) {
          numericMap.set(e.id, n);
          numericList.push(n);
        }
      }
    }

    // Check certificates table
    const certDateMap = new Map<number, string>();
    if (numericList.length > 0) {
      const { data: certRows } = await supabase
        .from("certificados")
        .select("nro_osi, created_at, fecha_emision")
        .in("nro_osi", numericList)
        .order("id", { ascending: true });

      for (const c of certRows || []) {
        if (c.nro_osi == null) continue;
        const d = c.created_at || c.fecha_emision;
        if (!d) continue;
        const cur = certDateMap.get(c.nro_osi);
        const parsed = d.split("T")[0];
        if (!cur || parsed < cur) {
          certDateMap.set(c.nro_osi, parsed);
        }
      }
    }

    // Also check manual adjustments
    const { data: ajusteRows } = await supabase
      .from("capacitacion_indicadores_ajustes")
      .select("osi_id, fecha_emision")
      .in("osi_id", osiIds);

    const ajusteDateMap = new Map<number, string>();
    for (const a of ajusteRows || []) {
      if (a.fecha_emision) {
        ajusteDateMap.set(a.osi_id, a.fecha_emision);
      }
    }

    const result: OsiReferenciaOption[] = filteredOsis.map((o: {
      id_osi: number;
      nro_osi: string | null;
      nombre_empresa: string | null;
      servicio: string | null;
    }) => {
      const num = numericMap.get(o.id_osi);
      const certDate = (num != null ? certDateMap.get(num) : null) || ajusteDateMap.get(o.id_osi) || null;

      return {
        osiId: o.id_osi,
        nroOsi: o.nro_osi ?? "",
        empresa: o.nombre_empresa ?? "",
        servicio: o.servicio ?? "",
        fechaEmision: certDate,
        tieneCertificados: Boolean(certDate),
      };
    });

    return { success: true, data: result };
  } catch (err) {
    console.error("[indicadores-ajustes] Unexpected error searching OSIs:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error inesperado al buscar OSIs",
    };
  }
}

/**
 * Link multiple OSIs together so they represent a single course/service delivery in 72h SLA.
 * One OSI is chosen as the primary (parent) OSI. All other child OSIs will point to it.
 */
export async function agruparOsisComoServicio({
  parentOsiId,
  childOsiIds,
  motivo,
}: {
  parentOsiId: number;
  childOsiIds: number[];
  motivo?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(parentOsiId) || parentOsiId <= 0) {
    return { success: false, error: "ID de OSI principal inválido" };
  }
  const validChildren = (childOsiIds || []).filter(
    (id) => Number.isFinite(id) && id > 0 && id !== parentOsiId
  );
  if (validChildren.length === 0) {
    return { success: false, error: "Debe seleccionar al menos una OSI secundaria para agrupar" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const admin = await createAdminClient();

    // Fetch parent OSI number
    const { data: parentRow, error: pError } = await supabase
      .from("v_osi_formato_completo")
      .select("id_osi, nro_osi")
      .eq("id_osi", parentOsiId)
      .single();

    if (pError || !parentRow) {
      console.error("[indicadores-ajustes] Could not find parent OSI:", pError);
      return { success: false, error: "No se encontró la OSI principal seleccionada" };
    }

    const parentNro = parentRow.nro_osi || `OSI-${parentOsiId}`;
    const defaultMotivo = motivo?.trim() || `Vinculada a ${parentNro} (mismo servicio)`;

    // Check if parent has an existing emission date or manual adjustment
    const { data: parentAjuste } = await admin
      .from("capacitacion_indicadores_ajustes")
      .select("fecha_emision, fecha_ejecucion")
      .eq("osi_id", parentOsiId)
      .maybeSingle();

    const parentFechaEmision = parentAjuste?.fecha_emision ?? null;

    // Upsert each child OSI
    for (const childId of validChildren) {
      // Check existing child record to preserve manual execution date if any
      const { data: existingChild } = await admin
        .from("capacitacion_indicadores_ajustes")
        .select("fecha_ejecucion, fecha_emision")
        .eq("osi_id", childId)
        .maybeSingle();

      const payload: Record<string, unknown> = {
        osi_id: childId,
        fecha_ejecucion: existingChild?.fecha_ejecucion ?? null,
        fecha_emision: parentFechaEmision || existingChild?.fecha_emision || null,
        motivo: defaultMotivo,
        emitido_en_otra_osi: true,
        osi_referencia_id: parentOsiId,
        nro_osi_referencia: parentNro,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      };

      const { error: upsertErr } = await admin
        .from("capacitacion_indicadores_ajustes")
        .upsert(payload, { onConflict: "osi_id" });

      if (upsertErr) {
        console.error(`[indicadores-ajustes] Error grouping child OSI ${childId}:`, upsertErr);
        return { success: false, error: `Error al vincular OSI ${childId}: ${upsertErr.message}` };
      }
    }

    return { success: true };
  } catch (err) {
    console.error("[indicadores-ajustes] Error in agruparOsisComoServicio:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error inesperado al agrupar OSIs",
    };
  }
}

/**
 * Unlink a single OSI from any group reference.
 */
export async function desagruparOsi(
  osiId: number
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(osiId) || osiId <= 0) {
    return { success: false, error: "ID de OSI inválido" };
  }

  try {
    const admin = await createAdminClient();
    const { data: existing, error: selErr } = await admin
      .from("capacitacion_indicadores_ajustes")
      .select("*")
      .eq("osi_id", osiId)
      .maybeSingle();

    if (selErr || !existing) {
      return { success: true };
    }

    // If there are no dates adjusted, delete the record completely
    if (!existing.fecha_ejecucion && !existing.fecha_emision) {
      const { error: delErr } = await admin
        .from("capacitacion_indicadores_ajustes")
        .delete()
        .eq("osi_id", osiId);
      if (delErr) {
        return { success: false, error: delErr.message };
      }
      return { success: true };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Clear reference fields
    const { error: updateErr } = await admin
      .from("capacitacion_indicadores_ajustes")
      .update({
        osi_referencia_id: null,
        nro_osi_referencia: null,
        emitido_en_otra_osi: false,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      })
      .eq("osi_id", osiId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[indicadores-ajustes] Error in desagruparOsi:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error inesperado al desvincular OSI",
    };
  }
}

/**
 * Dissolve an entire service group by unlinking all child OSIs that reference the given parent OSI.
 */
export async function desagruparGrupo(
  parentOsiId: number
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(parentOsiId) || parentOsiId <= 0) {
    return { success: false, error: "ID de OSI principal inválido" };
  }

  try {
    const admin = await createAdminClient();
    const { data: children, error: selErr } = await admin
      .from("capacitacion_indicadores_ajustes")
      .select("osi_id")
      .eq("osi_referencia_id", parentOsiId);

    if (selErr) {
      return { success: false, error: selErr.message };
    }

    for (const child of children || []) {
      await desagruparOsi(child.osi_id);
    }

    return { success: true };
  } catch (err) {
    console.error("[indicadores-ajustes] Error in desagruparGrupo:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error inesperado al desagrupar servicio",
    };
  }
}

