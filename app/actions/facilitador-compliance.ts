"use server";

import { createAdminClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getFacilitatorSession } from "./facilitador-portal";
import {
  ComplianceDocumentCode,
  FacilitadorComplianceRecord,
  FacilitadorComplianceSummary,
  ComplianceGlobalStats,
  COMPLIANCE_DOCUMENTS,
} from "@/types/compliance-documents";

/**
 * Get the compliance status for a specific facilitador (all 3 documents)
 */
export async function getFacilitadorComplianceStatus(facilitadorId: number): Promise<{
  success: boolean;
  data?: {
    isFullyCompliant: boolean;
    acknowledgedCount: number;
    totalDocuments: number;
    records: Record<ComplianceDocumentCode, FacilitadorComplianceRecord | null>;
  };
  error?: string;
}> {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("facilitador_compliance_documentos")
      .select("*")
      .eq("facilitador_id", facilitadorId);

    if (error) {
      // Graceful fallback if table is not yet migrated
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("[getFacilitadorComplianceStatus] Table facilitador_compliance_documentos does not exist yet.");
        return {
          success: true,
          data: {
            isFullyCompliant: false,
            acknowledgedCount: 0,
            totalDocuments: 3,
            records: {
              identificacion_peligros: null,
              notificacion_riesgos: null,
              politica_operativa: null,
            },
          },
        };
      }
      console.error("[getFacilitadorComplianceStatus] DB Error:", error);
      return { success: false, error: error.message };
    }

    const recordsMap: Record<ComplianceDocumentCode, FacilitadorComplianceRecord | null> = {
      identificacion_peligros: null,
      notificacion_riesgos: null,
      politica_operativa: null,
    };

    let acknowledgedCount = 0;

    for (const row of data || []) {
      const code = row.document_code as ComplianceDocumentCode;
      if (recordsMap[code] !== undefined) {
        recordsMap[code] = row as FacilitadorComplianceRecord;
        if (row.acknowledged) {
          acknowledgedCount++;
        }
      }
    }

    return {
      success: true,
      data: {
        isFullyCompliant: acknowledgedCount === 3,
        acknowledgedCount,
        totalDocuments: 3,
        records: recordsMap,
      },
    };
  } catch (err) {
    console.error("[getFacilitadorComplianceStatus] Unhandled error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Acknowledge (sign digitally) one of the 3 documents
 */
export async function acknowledgeComplianceDocument(
  facilitadorId: number,
  documentCode: ComplianceDocumentCode,
  signatureData: {
    signer_name: string;
    signer_cedula: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getFacilitatorSession();
    // Allow if session matches facilitador_id or if called in admin mode
    if (session && session.facilitador_id !== facilitadorId) {
      return { success: false, error: "No autorizado para firmar por otro facilitador." };
    }

    const supabase = await createAdminClient();
    const docDef = COMPLIANCE_DOCUMENTS[documentCode];
    if (!docDef) {
      return { success: false, error: "Documento normativo no reconocido." };
    }

    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
      headersList.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = headersList.get("user-agent") || "Desconocido";

    const payload = {
      facilitador_id: facilitadorId,
      document_code: documentCode,
      document_title: docDef.title,
      document_version: docDef.version,
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      signer_name: signatureData.signer_name.trim(),
      signer_cedula: signatureData.signer_cedula.trim(),
      ip_address: ip,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("facilitador_compliance_documentos")
      .upsert(payload, { onConflict: "facilitador_id,document_code" });

    if (error) {
      console.error("[acknowledgeComplianceDocument] Upsert error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/portal/facilitador/dashboard");
    revalidatePath("/dashboard/capacitacion/cumplimiento-facilitadores");
    revalidatePath("/dashboard/capacitacion/gestion-de-facilitadores");
    return { success: true };
  } catch (err) {
    console.error("[acknowledgeComplianceDocument] Error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Toggle or set physical delivery status (admin only)
 */
export async function togglePhysicalDelivery(
  facilitadorId: number,
  documentCode: ComplianceDocumentCode,
  entregado: boolean,
  recibidoPor?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createAdminClient();
    const docDef = COMPLIANCE_DOCUMENTS[documentCode];

    const payload = {
      facilitador_id: facilitadorId,
      document_code: documentCode,
      document_title: docDef?.title || documentCode,
      document_version: docDef?.version || "2026-01",
      fisico_entregado: entregado,
      fisico_entregado_at: entregado ? new Date().toISOString() : null,
      fisico_entregado_recibido_por: entregado ? (recibidoPor || "Administración Capacitación") : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("facilitador_compliance_documentos")
      .upsert(payload, { onConflict: "facilitador_id,document_code" });

    if (error) {
      console.error("[togglePhysicalDelivery] Error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/capacitacion/cumplimiento-facilitadores");
    revalidatePath("/dashboard/capacitacion/gestion-de-facilitadores");
    return { success: true };
  } catch (err) {
    console.error("[togglePhysicalDelivery] Error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Get complete compliance overview for administrators across all facilitators
 */
export async function getAdminComplianceOverview(): Promise<{
  success: boolean;
  stats: ComplianceGlobalStats;
  facilitators: FacilitadorComplianceSummary[];
  error?: string;
}> {
  try {
    const supabase = await createAdminClient();

    // 1. Fetch all active facilitadores
    const { data: facs, error: facsError } = await supabase
      .from("facilitadores")
      .select("id, nombre_apellido, cedula, email, telefono, is_active, id_estado_geografico")
      .order("nombre_apellido", { ascending: true });

    if (facsError) {
      console.error("[getAdminComplianceOverview] Error loading facilitadores:", facsError);
      return {
        success: false,
        stats: {
          totalFacilitadores: 0,
          compliantCount: 0,
          partialCount: 0,
          nonCompliantCount: 0,
          complianceRate: 0,
          physicalPendingCount: 0,
        },
        facilitators: [],
        error: facsError.message,
      };
    }

    // 2. Fetch all compliance records
    const { data: compRecords, error: compError } = await supabase
      .from("facilitador_compliance_documentos")
      .select("*");

    if (compError && compError.code !== "42P01") {
      console.error("[getAdminComplianceOverview] Error loading compliance records:", compError);
    }

    // Group compliance records by facilitador_id
    const compMap = new Map<number, Record<ComplianceDocumentCode, FacilitadorComplianceRecord | null>>();
    for (const rec of compRecords || []) {
      const fId = rec.facilitador_id;
      if (!compMap.has(fId)) {
        compMap.set(fId, {
          identificacion_peligros: null,
          notificacion_riesgos: null,
          politica_operativa: null,
        });
      }
      const code = rec.document_code as ComplianceDocumentCode;
      const fMap = compMap.get(fId)!;
      if (fMap[code] !== undefined) {
        fMap[code] = rec as FacilitadorComplianceRecord;
      }
    }

    // 3. Assemble summaries and stats
    const summaries: FacilitadorComplianceSummary[] = [];
    let compliantCount = 0;
    let partialCount = 0;
    let nonCompliantCount = 0;
    let totalPhysicalPending = 0;

    for (const f of facs || []) {
      const docs = compMap.get(f.id) || {
        identificacion_peligros: null,
        notificacion_riesgos: null,
        politica_operativa: null,
      };

      let ackCount = 0;
      let physPending = 0;

      if (docs.identificacion_peligros?.acknowledged) ackCount++;

      if (docs.notificacion_riesgos?.acknowledged) {
        ackCount++;
        if (!docs.notificacion_riesgos.fisico_entregado) physPending++;
      } else {
        physPending++;
      }

      if (docs.politica_operativa?.acknowledged) {
        ackCount++;
        if (!docs.politica_operativa.fisico_entregado) physPending++;
      } else {
        physPending++;
      }

      const isFullyCompliant = ackCount === 3;
      if (isFullyCompliant) compliantCount++;
      else if (ackCount > 0) partialCount++;
      else nonCompliantCount++;

      totalPhysicalPending += physPending;

      summaries.push({
        facilitador_id: f.id,
        nombre_apellido: f.nombre_apellido || "Sin Nombre",
        cedula: f.cedula || "N/A",
        email: f.email,
        telefono: f.telefono,
        is_active: f.is_active ?? true,
        total_documents: 3,
        acknowledged_count: ackCount,
        is_fully_compliant: isFullyCompliant,
        physical_pending_count: physPending,
        documents: docs,
      });
    }

    const totalFacilitadores = facs?.length || 0;
    const complianceRate =
      totalFacilitadores > 0 ? Math.round((compliantCount / totalFacilitadores) * 100) : 0;

    return {
      success: true,
      stats: {
        totalFacilitadores,
        compliantCount,
        partialCount,
        nonCompliantCount,
        complianceRate,
        physicalPendingCount: totalPhysicalPending,
      },
      facilitators: summaries,
    };
  } catch (err) {
    console.error("[getAdminComplianceOverview] Error:", err);
    return {
      success: false,
      stats: {
        totalFacilitadores: 0,
        compliantCount: 0,
        partialCount: 0,
        nonCompliantCount: 0,
        complianceRate: 0,
        physicalPendingCount: 0,
      },
      facilitators: [],
      error: (err as Error).message,
    };
  }
}
