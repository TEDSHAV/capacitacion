"use server";

import { createAdminClient } from "@/utils/supabase/server";
import { getFacilitatorSession } from "./facilitador-portal";
import { notifyCapacitacionUsersOfUpload } from "./facilitador-notifications";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export interface FacilitadorPurchaseOrder {
  id: string | number;
  poNumber: string;
  osiId: number;
  nroOsi: string;
  empresa: string;
  servicio: string;
  fechaServicio?: string;
  status: "pendiente_factura" | "factura_enviada" | "pagada";
  factura?: {
    id?: string;
    numeroFactura?: string;
    numeroControl?: string;
    fechaEmision?: string;
    fileName?: string;
    publicUrl?: string;
    storagePath?: string;
    uploadedAt?: string;
  };
  issuedAt?: string;
  observaciones?: string;
  isSample?: boolean;
}

/**
 * Fetch Purchase Orders (Órdenes de Compra) assigned to a facilitator.
 *
 * NOTE: The PO issuance feature is managed by the companion application and will be
 * populated from the upcoming `ordenes_compra` table once available.
 * Facilitators only see operational service data and PO references (no internal requisiciones or rates).
 */
export async function getFacilitadorPurchaseOrders(
  facilitadorId: number
): Promise<{ data: FacilitadorPurchaseOrder[]; error?: string }> {
  try {
    const supabase = await createAdminClient();

    // 1. Fetch any invoices already uploaded by this facilitator from ejecucion_osi_asistencia
    const { data: uploadedInvoices } = await supabase
      .from("ejecucion_osi_asistencia")
      .select("*")
      .eq("facilitador_id", facilitadorId)
      .eq("category", "factura")
      .order("created_at", { ascending: false });

    interface UploadedInvoiceInfo {
      id: string;
      osi_id: number | null;
      file_name: string;
      storage_path: string;
      publicUrl?: string;
      created_at: string | null;
      [key: string]: unknown;
    }

    // Map uploaded invoices by osi_id for quick lookup
    const invoicesByOsi = new Map<number, UploadedInvoiceInfo>();
    for (const inv of uploadedInvoices || []) {
      if (inv.osi_id && !invoicesByOsi.has(inv.osi_id)) {
        const { data: urlData } = supabase.storage
          .from("facilitador-uploads")
          .getPublicUrl(inv.storage_path);
        invoicesByOsi.set(inv.osi_id, {
          ...inv,
          publicUrl: urlData?.publicUrl,
        });
      }
    }

    const poList: FacilitadorPurchaseOrder[] = [];

    // 2. Query real Purchase Orders from ejecucion_osi_asistencia
    // Check OSIs where this facilitator is assigned
    const { data: assignments } = await supabase
      .from("facilitador_osi_assignments")
      .select("osi_id")
      .eq("facilitador_id", facilitadorId)
      .eq("is_active", true);

    const assignedOsiIds = (assignments || [])
      .map((a) => a.osi_id)
      .filter((id): id is number => typeof id === "number");

    let poQuery = supabase
      .from("ejecucion_osi_asistencia")
      .select("id, osi_id, facilitador_id, storage_path, file_name, file_size, file_type, created_at")
      .eq("category", "orden_compra");

    if (assignedOsiIds.length > 0) {
      poQuery = poQuery.or(
        `facilitador_id.eq.${facilitadorId},osi_id.in.(${assignedOsiIds.join(",")})`
      );
    } else {
      poQuery = poQuery.eq("facilitador_id", facilitadorId);
    }

    const { data: realPOs, error: poErr } = await poQuery.order("created_at", {
      ascending: false,
    });

    if (poErr) {
      console.warn("[getFacilitadorPurchaseOrders] Real PO query warning:", poErr);
    }

    if (realPOs && realPOs.length > 0) {
      const osiIds = [...new Set(realPOs.map((r) => r.osi_id).filter(Boolean))] as number[];
      const osiMap = new Map<
        number,
        { nro_osi: string; empresa: string; servicio: string; fecha_servicio?: string }
      >();

      if (osiIds.length > 0) {
        const { data: osis } = await supabase
          .from("v_osi_lista")
          .select("id_osi, nro_osi, nombre_empresa, servicio, fecha_inicio_real")
          .in("id_osi", osiIds);

        (osis || []).forEach((o) => {
          osiMap.set(o.id_osi, {
            nro_osi: o.nro_osi ? String(o.nro_osi) : String(o.id_osi),
            empresa: o.nombre_empresa || "Cliente Corporativo",
            servicio: o.servicio || "Servicio de Capacitación",
            fecha_servicio: o.fecha_inicio_real || undefined,
          });
        });
      }

      for (const po of realPOs) {
        const osi = po.osi_id ? osiMap.get(po.osi_id) : undefined;
        const matchingInvoice = po.osi_id ? invoicesByOsi.get(po.osi_id) : undefined;

        // Extract PO number from storage path or filename
        const pathParts = po.storage_path.split("/");
        const extractedPo =
          pathParts.length > 3 ? decodeURIComponent(pathParts[2]) : undefined;
        const poNumber =
          extractedPo && extractedPo !== "OC"
            ? extractedPo
            : `OC-${osi?.nro_osi || po.osi_id || "S/N"}`;

        const poItem: FacilitadorPurchaseOrder = {
          id: po.id,
          poNumber,
          osiId: po.osi_id || 0,
          nroOsi: osi?.nro_osi || String(po.osi_id || 0),
          empresa: osi?.empresa || "Cliente Corporativo",
          servicio: osi?.servicio || "Servicio de Capacitación",
          fechaServicio: osi?.fecha_servicio,
          status: matchingInvoice ? "factura_enviada" : "pendiente_factura",
          factura: matchingInvoice
            ? {
                id: matchingInvoice.id,
                fileName: matchingInvoice.file_name,
                publicUrl: matchingInvoice.publicUrl,
                storagePath: matchingInvoice.storage_path,
                uploadedAt: matchingInvoice.created_at || undefined,
              }
            : undefined,
          issuedAt: po.created_at || undefined,
          observaciones: "Orden de compra emitida y disponible para adjuntar factura.",
          isSample: false,
        };

        poList.push(poItem);
      }
    }

    // 3. Fallback / Test Sample POs (Active & History) STRICTLY for test facilitator (44)
    // Only displayed for testing purposes for facilitator 44 while real `ordenes_compra` are delivered.
    if (facilitadorId === 44 && poList.length === 0) {
      // Check if sample active PO has a real uploaded invoice in DB
      const sample1Invoice = invoicesByOsi.get(108);

      const sampleActivePO: FacilitadorPurchaseOrder = {
        id: "SAMPLE-PO-44-01",
        poNumber: "OC-2026-0044",
        osiId: 108,
        nroOsi: "108",
        empresa: "Siderúrgica del Turbio S.A.",
        servicio: "Seguridad Industrial y Salud Ocupacional (16 hrs)",
        fechaServicio: "28/09/2026",
        status: sample1Invoice ? "factura_enviada" : "pendiente_factura",
        factura: sample1Invoice
          ? {
              id: sample1Invoice.id,
              fileName: sample1Invoice.file_name,
              publicUrl: sample1Invoice.publicUrl,
              storagePath: sample1Invoice.storage_path,
              uploadedAt: sample1Invoice.created_at || undefined,
            }
          : undefined,
        issuedAt: "29/09/2026",
        observaciones:
          "Orden de compra emitida y disponible para adjuntar factura correspondiente al servicio ejecutado.",
        isSample: true,
      };

      const sampleHistoryPO: FacilitadorPurchaseOrder = {
        id: "SAMPLE-PO-44-02",
        poNumber: "OC-2026-0019",
        osiId: 95,
        nroOsi: "95",
        empresa: "Cervecería Polar C.A.",
        servicio: "Formación de Brigadas de Emergencia y Rescate",
        fechaServicio: "12/09/2026",
        status: "factura_enviada",
        factura: {
          numeroFactura: "FAC-0082",
          numeroControl: "00-4921",
          fechaEmision: "14/09/2026",
          fileName: "factura_0082_polar.pdf",
          uploadedAt: "2026-09-14T14:30:00Z",
        },
        issuedAt: "13/09/2026",
        observaciones: "Servicio liquidado y factura recibida a conformidad.",
        isSample: true,
      };

      if (!poList.some((p) => p.poNumber === sampleActivePO.poNumber)) {
        poList.unshift(sampleActivePO);
      }
      if (!poList.some((p) => p.poNumber === sampleHistoryPO.poNumber)) {
        poList.push(sampleHistoryPO);
      }
    }

    return { data: poList };
  } catch (err) {
    console.error("[getFacilitadorPurchaseOrders] Error:", err);
    return { data: [], error: (err as Error).message };
  }
}

export interface FacilitadorInvoiceAttachment {
  id: string;
  file_name: string;
  storage_path: string;
  numeroFactura?: string | null;
  numeroControl?: string | null;
  fechaEmision?: string | null;
}

export async function uploadFacilitadorInvoice(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  attachment?: FacilitadorInvoiceAttachment;
}> {
  try {
    const session = await getFacilitatorSession();
    if (!session) {
      return { success: false, error: "No autorizado. Sesión expirada." };
    }

    const file = formData.get("file") as File | null;
    const osiIdStr = formData.get("osiId") as string | null;
    const nroOsi = (formData.get("nroOsi") as string | null) || "0";
    const numeroFactura = formData.get("numeroFactura") as string | null;
    const numeroControl = formData.get("numeroControl") as string | null;
    const fechaEmision = formData.get("fechaEmision") as string | null;

    if (!file || file.size === 0) {
      return { success: false, error: "Debes seleccionar un archivo de factura." };
    }

    const osiId = osiIdStr ? parseInt(osiIdStr) : 0;
    const facilitadorId = session.facilitador_id;

    const supabase = await createAdminClient();

    // 1. Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString("hex");
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `facturas/${osiId}/${facilitadorId}/${timestamp}_${randomSuffix}_${sanitizedName}`;

    const { error: storageError } = await supabase.storage
      .from("facilitador-uploads")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/pdf",
        upsert: false,
      });

    if (storageError) {
      console.error("[uploadFacilitadorInvoice] Storage upload error:", storageError);
      return { success: false, error: "Error al guardar el archivo en el servidor." };
    }

    // 2. Insert record into ejecucion_osi_asistencia with category = 'factura'
    const { data: dbData, error: dbError } = await supabase
      .from("ejecucion_osi_asistencia")
      .insert({
        osi_id: osiId,
        facilitador_id: facilitadorId,
        storage_path: storagePath,
        file_name: file.name,
        file_type: file.type || "application/pdf",
        file_size: buffer.length,
        category: "factura",
        nro_sesion: 1,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[uploadFacilitadorInvoice] DB insert error:", dbError);
      await supabase.storage.from("facilitador-uploads").remove([storagePath]);
      return { success: false, error: "Error al registrar la factura en la base de datos." };
    }

    // 3. Notify Capacitación & Administración
    try {
      await notifyCapacitacionUsersOfUpload({
        osiId,
        nroOsi: String(nroOsi),
        facilitadorName: session.nombre,
        category: "factura",
      });
    } catch (notifErr) {
      console.error("[uploadFacilitadorInvoice] Notification error (non-fatal):", notifErr);
    }

    revalidatePath("/portal/facilitador/dashboard");

    return {
      success: true,
      attachment: {
        id: dbData.id,
        file_name: file.name,
        storage_path: storagePath,
        numeroFactura,
        numeroControl,
        fechaEmision,
      },
    };
  } catch (err) {
    console.error("[uploadFacilitadorInvoice] Unexpected error:", err);
    return { success: false, error: (err as Error).message || "Error inesperado al subir la factura." };
  }
}
