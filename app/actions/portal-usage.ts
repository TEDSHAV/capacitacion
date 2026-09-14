"use server";

import { createClient } from "@/utils/supabase/server";

export interface PortalUsageStats {
  /** 0..1, null if no answered batches */
  rate: number | null;
  /** Number of batches where the facilitador used the portal */
  portalBatches: number;
  /** Total number of answered batches */
  totalBatches: number;
}

/**
 * Compute the per-facilitador "portal usage" average.
 *
 * Each distinct (nro_osi, id_curso, fecha_emision) group counts as 1 generation
 * batch. NULL values of `uso_portal_facilitador` (older certificates) are
 * excluded from the average. The average is per-batch (not per-certificate),
 * so a 50-participant batch and a 2-participant batch weigh equally.
 */
export async function getPortalUsageByFacilitador(
  facilitadorId: number,
): Promise<PortalUsageStats> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("certificados")
      .select("nro_osi, id_curso, fecha_emision, uso_portal_facilitador")
      .eq("id_facilitador", facilitadorId)
      .eq("is_active", true)
      .not("uso_portal_facilitador", "is", null);

    if (error || !data || data.length === 0) {
      return { rate: null, portalBatches: 0, totalBatches: 0 };
    }

    // Collapse to distinct batches. Within a batch all rows share the same
    // uso_portal_facilitador value by construction, so last-write-wins is safe.
    const batchKeys = new Map<string, boolean>();
    for (const r of data) {
      const key = `${r.nro_osi ?? "null"}|${r.id_curso ?? "null"}|${r.fecha_emision ?? "null"}`;
      batchKeys.set(key, !!r.uso_portal_facilitador);
    }

    const total = batchKeys.size;
    const portal = [...batchKeys.values()].filter(Boolean).length;
    return {
      rate: total > 0 ? portal / total : null,
      portalBatches: portal,
      totalBatches: total,
    };
  } catch (err) {
    console.error("Error en getPortalUsageByFacilitador:", err);
    return { rate: null, portalBatches: 0, totalBatches: 0 };
  }
}
