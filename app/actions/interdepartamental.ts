"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { notifyCapacitacionUsersOfUpload } from "./facilitador-notifications";
import { toTitleCase } from "@/utils/string-utils";
import crypto from "crypto";

const DEPT_NAMES: Record<number, string> = {
  1: "Marketing",
  2: "Negocios",
  3: "Capacitación",
  4: "Servicios Técnicos",
  5: "Administración",
  6: "TED",
  7: "Gerencia General",
  8: "Calidad",
  9: "Recursos Humanos",
};

export interface InterdepartamentalUser {
  id: string;
  name: string;
  email: string;
  departamentoId: number | null;
  departamentoNombre: string;
  initials: string;
}

export interface InterdepartamentalOsi {
  id_osi: number;
  nro_osi: string | null;
  nombre_empresa: string | null;
  servicio: string | null;
  tipo_servicio: string | null;
  fecha_inicio_real: string | null;
  fecha_emision: string | null;
}

export interface InterdepartamentalFacilitador {
  id: number;
  nombre_apellido: string;
  cedula: string | null;
  titulo_profesional: string | null;
  formacion_academica: string | null;
  experiencia_laboral: string | null;
  competencias_habilidades: string[] | string | null;
  foto_perfil_url: string | null;
  is_active: boolean;
  email?: string | null;
  telefono?: string | null;
}

export interface PurchaseOrderRecord {
  id: string;
  osi_id: number | null;
  facilitador_id: number | null;
  facilitador_nombre?: string;
  nro_osi?: string;
  empresa_nombre?: string;
  file_name: string;
  file_size: number | null;
  file_type: string;
  public_url: string;
  storage_path: string;
  created_at: string | null;
  po_number?: string;
}

/**
 * Get context information for the logged-in user (their department and identity).
 */
export async function getInterdepartamentalContext(): Promise<{
  authenticated: boolean;
  user: InterdepartamentalUser | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return { authenticated: false, user: null };
    }

    const admin = await createAdminClient();
    const { data: usuario } = await admin
      .from("usuarios")
      .select("id, nombre_apellido, departamento, correo_empresarial")
      .eq("id_auth", authUser.id)
      .maybeSingle();

    const name = usuario?.nombre_apellido
      ? toTitleCase(usuario.nombre_apellido)
      : authUser.user_metadata?.full_name ||
        authUser.email?.split("@")[0] ||
        "Colaborador";

    const deptId = usuario?.departamento ?? null;
    const deptName =
      (deptId && DEPT_NAMES[deptId]) || "Externo";

    const initials = name
      .split(" ")
      .filter(Boolean)
      .map((w: string) => w[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "US";

    return {
      authenticated: true,
      user: {
        id: authUser.id,
        name,
        email: usuario?.correo_empresarial || authUser.email || "",
        departamentoId: deptId,
        departamentoNombre: deptName,
        initials,
      },
    };
  } catch (err) {
    console.error("[getInterdepartamentalContext] Error:", err);
    return { authenticated: false, user: null };
  }
}

/**
 * Fetch available OSIs for linking with a Purchase Order (all Capacitación OSIs).
 */
export async function getOsisForInterdepartamental(): Promise<InterdepartamentalOsi[]> {
  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("v_osi_lista")
      .select(
        "id_osi, nro_osi, nombre_empresa, servicio, tipo_servicio, fecha_inicio_real, fecha_emision",
      )
      .ilike("tipo_servicio", "%capacitacion%")
      .not("nro_osi", "ilike", "%PEN-%")
      .order("id_osi", { ascending: false });

    if (error) {
      console.error("[getOsisForInterdepartamental] Error:", error);
      return [];
    }

    return (data || []).map((row) => ({
      id_osi: row.id_osi,
      nro_osi: row.nro_osi ? String(row.nro_osi) : null,
      nombre_empresa: row.nombre_empresa,
      servicio: row.servicio,
      tipo_servicio: row.tipo_servicio,
      fecha_inicio_real: row.fecha_inicio_real,
      fecha_emision: row.fecha_emision,
    }));
  } catch (err) {
    console.error("[getOsisForInterdepartamental] Unexpected error:", err);
    return [];
  }
}

/**
 * Fetch active facilitators for selection and Ficha Técnica downloads.
 */
export async function getFacilitatorsForInterdepartamental(): Promise<
  InterdepartamentalFacilitador[]
> {
  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("facilitadores")
      .select(
        "id, nombre_apellido, cedula, titulo_profesional, formacion_academica, experiencia_laboral, competencias_habilidades, foto_perfil_url, is_active, email, telefono",
      )
      .order("nombre_apellido", { ascending: true });

    if (error) {
      console.error("[getFacilitatorsForInterdepartamental] Error:", error);
      return [];
    }

    return (data || []).map((f) => ({
      ...f,
      nombre_apellido: toTitleCase(f.nombre_apellido),
      is_active: Boolean(f.is_active),
    }));
  } catch (err) {
    console.error("[getFacilitatorsForInterdepartamental] Unexpected error:", err);
    return [];
  }
}

/**
 * Fetch active facilitators assigned to a specific OSI.
 */
export async function getAssignedFacilitatorForOsi(osiId: number): Promise<{
  id: number;
  nombre_apellido: string;
  cedula: string | null;
  titulo_profesional: string | null;
  foto_perfil_url: string | null;
} | null> {
  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("facilitador_osi_assignments")
      .select("facilitador_id, facilitadores(id, nombre_apellido, cedula, titulo_profesional, foto_perfil_url)")
      .eq("osi_id", osiId)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data || !data.facilitadores) {
      return null;
    }

    const f = data.facilitadores as unknown as {
      id: number;
      nombre_apellido: string;
      cedula: string | null;
      titulo_profesional: string | null;
      foto_perfil_url: string | null;
    };
    return {
      id: f.id,
      nombre_apellido: toTitleCase(f.nombre_apellido),
      cedula: f.cedula,
      titulo_profesional: f.titulo_profesional,
      foto_perfil_url: f.foto_perfil_url,
    };
  } catch (err) {
    console.error("[getAssignedFacilitatorForOsi] Error:", err);
    return null;
  }
}

/**
 * Upload a Purchase Order (Orden de Compra) document linked to an OSI and Facilitator.
 */
export async function uploadPurchaseOrderDocument(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  record?: PurchaseOrderRecord;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, error: "Sesión no válida o expirada. Por favor inicie sesión." };
    }

    const file = formData.get("file") as File | null;
    const osiIdStr = formData.get("osiId") as string | null;
    const nroOsi = (formData.get("nroOsi") as string | null) || "";
    const facilitadorIdStr = formData.get("facilitadorId") as string | null;
    const poNumber = ((formData.get("poNumber") as string | null) || "").trim();
    const fechaEmision = (formData.get("fechaEmision") as string | null) || "";
    const observaciones = ((formData.get("observaciones") as string | null) || "").trim();

    if (!file || file.size === 0) {
      return { success: false, error: "Debes seleccionar el archivo de la orden de compra." };
    }

    if (!osiIdStr) {
      return { success: false, error: "Debes seleccionar una OSI para vincular la orden de compra." };
    }

    const osiId = parseInt(osiIdStr, 10);
    const facilitadorId = facilitadorIdStr ? parseInt(facilitadorIdStr, 10) : null;

    if (isNaN(osiId)) {
      return { success: false, error: "El ID de la OSI no es válido." };
    }

    const admin = await createAdminClient();

    // Get user details for logging & notification
    const { data: usuario } = await admin
      .from("usuarios")
      .select("id, nombre_apellido, departamento")
      .eq("id_auth", authUser.id)
      .maybeSingle();

    const userName = usuario?.nombre_apellido
      ? toTitleCase(usuario.nombre_apellido)
      : authUser.email || "Usuario de otro departamento";
    const deptId = usuario?.departamento;
    const deptName = (deptId && DEPT_NAMES[deptId]) || "Otro Departamento";

    // 1. Upload to Supabase Storage in 'facilitador-uploads'
    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString("hex");
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const cleanPo = (poNumber || "OC").trim();
    const storagePath = `ordenes_compra/${osiId}/${encodeURIComponent(cleanPo)}/${timestamp}_${randomSuffix}_${sanitizedName}`;

    const { error: storageError } = await admin.storage
      .from("facilitador-uploads")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/pdf",
        upsert: false,
      });

    if (storageError) {
      console.error("[uploadPurchaseOrderDocument] Storage error:", storageError);
      return { success: false, error: "Error al almacenar el archivo en el servidor." };
    }

    const { data: publicUrlData } = admin.storage
      .from("facilitador-uploads")
      .getPublicUrl(storagePath);

    // 2. Insert record into dedicated ordenes_compra table (with fallback to ejecucion_osi_asistencia)
    let dbRecordId: string = "";
    let dbCreatedAt: string | null = new Date().toISOString();

    const ocInsertPayload = {
      po_number: cleanPo,
      osi_id: osiId,
      facilitador_id: facilitadorId,
      fecha_emision: fechaEmision || new Date().toISOString().split("T")[0],
      observaciones: observaciones || null,
      file_name: file.name,
      file_type: file.type || "application/pdf",
      file_size: buffer.length,
      storage_provider: "supabase",
      storage_path: storagePath,
      uploaded_by: authUser.id,
      uploaded_by_nombre: userName,
      uploaded_by_departamento: deptName,
    };

    const { data: ocData, error: ocError } = await admin
      .from("ordenes_compra")
      .insert(ocInsertPayload)
      .select()
      .maybeSingle();

    if (ocError) {
      console.warn("[uploadPurchaseOrderDocument] ordenes_compra insert failed, falling back to ejecucion_osi_asistencia:", ocError.message);
      const { data: dbData, error: dbError } = await admin
        .from("ejecucion_osi_asistencia")
        .insert({
          osi_id: osiId,
          facilitador_id: facilitadorId,
          storage_path: storagePath,
          file_name: file.name,
          file_type: file.type || "application/pdf",
          file_size: buffer.length,
          category: "orden_compra",
          nro_sesion: 1,
        })
        .select()
        .single();

      if (dbError) {
        console.error("[uploadPurchaseOrderDocument] DB insert error:", dbError);
        await admin.storage.from("facilitador-uploads").remove([storagePath]);
        return { success: false, error: "Error al registrar la orden de compra en la base de datos." };
      }
      dbRecordId = String(dbData.id);
      dbCreatedAt = dbData.created_at;
    } else if (ocData) {
      dbRecordId = String(ocData.id);
      dbCreatedAt = ocData.created_at;
    }

    // 3. Register audit note in capacitacion_osi_notas
    try {
      const notaContent = [
        `[Orden de Compra${poNumber ? `: ${poNumber}` : ""}]`,
        `Cargada por ${userName} (${deptName}).`,
        `Archivo: ${file.name}.`,
        fechaEmision ? `Fecha emisión: ${fechaEmision}.` : "",
        observaciones ? `Observaciones: ${observaciones}` : "",
      ]
        .filter(Boolean)
        .join(" ");

      await admin.from("capacitacion_osi_notas").insert({
        osi_id: osiId,
        created_by_auth: authUser.id,
        nota: notaContent,
      });
    } catch (noteErr) {
      console.warn("[uploadPurchaseOrderDocument] Note insertion warning:", noteErr);
    }

    // 4. Notify Capacitación & Admin department in PRISMA
    try {
      let facilitadorName = "Facilitador asignado";
      if (facilitadorId) {
        const { data: facData } = await admin
          .from("facilitadores")
          .select("nombre_apellido")
          .eq("id", facilitadorId)
          .maybeSingle();
        if (facData?.nombre_apellido) {
          facilitadorName = toTitleCase(facData.nombre_apellido);
        }
      }

      await notifyCapacitacionUsersOfUpload({
        osiId,
        nroOsi: nroOsi || String(osiId),
        facilitadorName: `${facilitadorName} (Cargado por ${userName} - ${deptName})`,
        category: "orden_compra",
      });
    } catch (notifErr) {
      console.warn("[uploadPurchaseOrderDocument] Notification error (non-fatal):", notifErr);
    }

    return {
      success: true,
      record: {
        id: dbRecordId,
        osi_id: osiId,
        facilitador_id: facilitadorId,
        file_name: file.name,
        file_size: buffer.length,
        file_type: file.type || "application/pdf",
        public_url: publicUrlData?.publicUrl || "",
        storage_path: storagePath,
        created_at: dbCreatedAt,
        po_number: poNumber,
      },
    };
  } catch (err) {
    console.error("[uploadPurchaseOrderDocument] Unexpected error:", err);
    return {
      success: false,
      error: (err as Error).message || "Error inesperado al cargar la orden de compra.",
    };
  }
}

/**
 * Fetch recently uploaded purchase orders to display in the workspace history.
 */
export async function getRecentPurchaseOrders(limit = 10): Promise<PurchaseOrderRecord[]> {
  try {
    const admin = await createAdminClient();

    // 1. Try dedicated ordenes_compra table first
    const { data: ocRows, error: ocErr } = await admin
      .from("ordenes_compra")
      .select("id, po_number, osi_id, facilitador_id, storage_path, file_name, file_type, file_size, created_at, fecha_emision")
      .order("created_at", { ascending: false })
      .limit(limit);

    let rowsToProcess: {
      id: string | number;
      osi_id: number | null;
      facilitador_id: number | null;
      storage_path: string;
      file_name: string;
      file_type: string;
      file_size: number | null;
      created_at: string | null;
      po_number?: string;
    }[] = [];

    if (!ocErr && ocRows && ocRows.length > 0) {
      rowsToProcess = ocRows.map((r) => ({
        id: String(r.id),
        osi_id: r.osi_id,
        facilitador_id: r.facilitador_id,
        storage_path: r.storage_path,
        file_name: r.file_name,
        file_type: r.file_type,
        file_size: r.file_size,
        created_at: r.created_at,
        po_number: r.po_number,
      }));
    } else {
      // Fallback to ejecucion_osi_asistencia
      const { data: legacyRows, error: legacyErr } = await admin
        .from("ejecucion_osi_asistencia")
        .select("id, osi_id, facilitador_id, storage_path, file_name, file_type, file_size, created_at")
        .eq("category", "orden_compra")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!legacyErr && legacyRows) {
        rowsToProcess = legacyRows.map((r) => {
          const pathSegments = r.storage_path.split("/");
          const extractedPo =
            pathSegments.length > 3 ? decodeURIComponent(pathSegments[2]) : undefined;
          return {
            id: String(r.id),
            osi_id: r.osi_id,
            facilitador_id: r.facilitador_id,
            storage_path: r.storage_path,
            file_name: r.file_name,
            file_type: r.file_type,
            file_size: r.file_size,
            created_at: r.created_at,
            po_number: extractedPo,
          };
        });
      }
    }

    if (rowsToProcess.length === 0) {
      return [];
    }

    // Collect osi IDs and facilitador IDs
    const osiIds = [...new Set(rowsToProcess.map((r) => r.osi_id).filter(Boolean))] as number[];
    const facIds = [...new Set(rowsToProcess.map((r) => r.facilitador_id).filter(Boolean))] as number[];

    // Fetch OSI metadata
    const osiMap = new Map<number, { nro_osi: string; empresa: string }>();
    if (osiIds.length > 0) {
      const { data: osis } = await admin
        .from("v_osi_lista")
        .select("id_osi, nro_osi, nombre_empresa")
        .in("id_osi", osiIds);

      (osis || []).forEach((o) => {
        osiMap.set(o.id_osi, {
          nro_osi: o.nro_osi ? String(o.nro_osi) : String(o.id_osi),
          empresa: o.nombre_empresa || "Empresa no especificada",
        });
      });
    }

    // Fetch Facilitador metadata
    const facMap = new Map<number, string>();
    if (facIds.length > 0) {
      const { data: facs } = await admin
        .from("facilitadores")
        .select("id, nombre_apellido")
        .in("id", facIds);

      (facs || []).forEach((f) => {
        facMap.set(f.id, toTitleCase(f.nombre_apellido));
      });
    }

    return rowsToProcess.map((r) => {
      const { data: urlData } = admin.storage
        .from("facilitador-uploads")
        .getPublicUrl(r.storage_path);

      const osiInfo = r.osi_id ? osiMap.get(r.osi_id) : undefined;
      const facName = r.facilitador_id ? facMap.get(r.facilitador_id) : undefined;

      return {
        id: String(r.id),
        osi_id: r.osi_id,
        facilitador_id: r.facilitador_id,
        facilitador_nombre: facName,
        nro_osi: osiInfo?.nro_osi,
        empresa_nombre: osiInfo?.empresa,
        file_name: r.file_name,
        file_size: r.file_size,
        file_type: r.file_type,
        public_url: urlData?.publicUrl || "",
        storage_path: r.storage_path,
        created_at: r.created_at,
        po_number: r.po_number,
      };
    });
  } catch (err) {
    console.error("[getRecentPurchaseOrders] Error:", err);
    return [];
  }
}
