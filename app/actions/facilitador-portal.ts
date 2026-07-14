"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { optimizeDocumentImage } from "@/lib/image-optimization.server";
import { OSIAttachment } from "@/types";
import { signSession, verifySession } from "@/lib/session-signing";

// Simple hash function using Node.js crypto
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function createFacilitatorCredentials(
  facilitadorId: number,
  username: string,
  password: string
) {
  const supabase = await createAdminClient();
  const passwordHash = hashPassword(password);

  const { data, error } = await supabase
    .from("facilitador_credenciales")
    .upsert(
      {
        facilitador_id: facilitadorId,
        username,
        password_hash: passwordHash,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "facilitador_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Error creating credentials:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/capacitacion/gestion-de-facilitadores");
  return { success: true, data };
}

export async function getFacilitatorCredentials(facilitadorId: number) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("facilitador_credenciales")
    .select("username, is_active")
    .eq("facilitador_id", facilitadorId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching credentials:", error);
    return { error: error.message };
  }

  return { data };
}

export async function deleteFacilitatorCredentials(facilitadorId: number) {
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("facilitador_credenciales")
    .delete()
    .eq("facilitador_id", facilitadorId);

  if (error) {
    console.error("Error deleting credentials:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/capacitacion/gestion-de-facilitadores");
  return { success: true };
}

export async function loginFacilitator(username: string, password: string) {
  const supabase = await createAdminClient();
  const passwordHash = hashPassword(password);

  console.log(`[Portal Login] Attempting login for user: ${username}`);

  const { data: creds, error: credError } = await supabase
    .from("facilitador_credenciales")
    .select("*, facilitadores(nombre_apellido)")
    .eq("username", username)
    .eq("password_hash", passwordHash)
    .eq("is_active", true)
    .maybeSingle();

  if (credError) {
    console.error("[Portal Login] Database error:", credError);
    return { error: "Error al verificar credenciales" };
  }

  if (!creds) {
    console.warn(`[Portal Login] No active account found for username: ${username}`);
    return { error: "Credenciales inválidas o cuenta inactiva" };
  }

  // Set a session cookie (simplified for this custom auth)
  const sessionData = {
    id: creds.id,
    facilitador_id: creds.facilitador_id,
    nombre: creds.facilitadores.nombre_apellido,
    username: creds.username,
  };

  const cookieStore = await cookies();
  cookieStore.set("facilitador_session", signSession(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });

  return { success: true };
}

export async function getFacilitatorSession(): Promise<{
  id: number;
  facilitador_id: number;
  nombre: string;
  username: string;
} | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("facilitador_session");
  if (!session) return null;
  return verifySession<{
    id: number;
    facilitador_id: number;
    nombre: string;
    username: string;
  }>(session.value);
}

export async function logoutFacilitator() {
  const cookieStore = await cookies();
  cookieStore.delete("facilitador_session");
  return { success: true };
}

export async function getAssignedOSIs(facilitadorId: number) {
  const supabase = await createAdminClient();

  // Query the facilitador_osi_assignments table (sole source of truth)
  const { data: assignments, error: assignError } = await supabase
    .from("facilitador_osi_assignments")
    .select("osi_id")
    .eq("facilitador_id", facilitadorId)
    .eq("is_active", true);

  if (assignError) {
    console.error("Error fetching assignments:", assignError);
    return { error: assignError.message };
  }

  const allOsiIds = (assignments || []).map(a => a.osi_id);

  if (allOsiIds.length === 0) {
    return { data: [] };
  }

  // Get the details from v_osi_formato_completo
  const { data, error } = await supabase
    .from("v_osi_formato_completo")
    .select("*")
    .in("id_osi", allOsiIds)
    .order("fecha_emision", { ascending: false });

  if (error) {
    console.error("Error fetching assigned OSIs details:", error);
    return { error: error.message };
  }

  // Fetch participant submission status for each OSI
  let enrichedData = data || [];
  if (allOsiIds.length > 0) {
    const { data: participantsData } = await supabase
      .from("ejecucion_osi_participantes")
      .select("osi_id, status")
      .in("osi_id", allOsiIds);

    const osiStatusMap = new Map<number, string>();
    if (participantsData && participantsData.length > 0) {
      for (const p of participantsData) {
        const current = osiStatusMap.get(p.osi_id);
        if (p.status === "final") {
          osiStatusMap.set(p.osi_id, "final");
        } else if (current !== "final") {
          osiStatusMap.set(p.osi_id, "draft");
        }
      }
    }
    enrichedData = enrichedData.map((osi: any) => ({
      ...osi,
      participant_status: osiStatusMap.get(osi.id_osi) || null,
    }));
  }

  return { data: enrichedData };
}

export async function getOSIParticipants(osiId: number, facilitadorId?: number): Promise<{ data?: any[]; error?: string }> {
  const supabase = await createAdminClient();
  
  console.log(`[getOSIParticipants] Searching for OSI: ${osiId}, Facilitador: ${facilitadorId || 'ANY'}`);

  let query = supabase
    .from("ejecucion_osi_participantes")
    .select("*")
    .eq("osi_id", osiId);
  
  if (facilitadorId) {
    query = query.eq("facilitador_id", facilitadorId);
  }

  const { data, error } = await query.order("id", { ascending: true });

  if (error) {
    console.error("Error fetching participants:", error);
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function saveAcknowledgment(
  osiId: number,
  facilitadorId: number,
  disclaimerText: string
) {
  const session = await getFacilitatorSession();
  if (!session || session.facilitador_id !== facilitadorId) {
    return { error: "No autorizado" };
  }

  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("facilitador_acknowledgments")
    .upsert(
      {
        osi_id: osiId,
        facilitador_id: facilitadorId,
        disclaimer_text: disclaimerText,
        acknowledged_at: new Date().toISOString(),
      },
      { onConflict: "osi_id,facilitador_id" }
    );

  if (error) {
    console.error("Error saving acknowledgment:", error);
    return { error: error.message };
  }

  return { success: true };
}

export async function getAcknowledgmentByOSI(osiId: number) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("facilitador_acknowledgments")
    .select("acknowledged_at, disclaimer_text, facilitador_id")
    .eq("osi_id", osiId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching acknowledgment:", error);
    return { error: error.message };
  }

  if (!data) {
    return { data: null };
  }

  let facilitador: { id: number; nombre_apellido: string } | null = null;
  if (data.facilitador_id) {
    const { data: facData, error: facError } = await supabase
      .from("facilitadores")
      .select("id, nombre_apellido")
      .eq("id", data.facilitador_id)
      .maybeSingle();

    if (facError) {
      console.error("Error fetching facilitador for acknowledgment:", facError);
    } else {
      facilitador = facData;
    }
  }

  return {
    data: {
      acknowledged_at: data.acknowledged_at,
      disclaimer_text: data.disclaimer_text,
      facilitadores: facilitador,
    },
  };
}

export async function saveParticipants(
  osiId: number,
  facilitadorId: number,
  participants: any[],
  status: "draft" | "final" = "draft",
  acknowledged: boolean = false,
  disclaimerText?: string
) {
  const session = await getFacilitatorSession();
  if (!session || session.facilitador_id !== facilitadorId) {
    return { error: "No autorizado" };
  }

  if (status === "final" && !acknowledged) {
    return { error: "Debes confirmar la declaración para finalizar el envío." };
  }

  const supabase = await createAdminClient();

  // Delete existing ones for this OSI/Facilitator to overwrite
  const { error: deleteError } = await supabase
    .from("ejecucion_osi_participantes")
    .delete()
    .eq("osi_id", osiId)
    .eq("facilitador_id", facilitadorId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  const records = participants.map((p) => ({
    osi_id: osiId,
    facilitador_id: facilitadorId,
    nombre_apellido: p.nombre_apellido,
    cedula: p.cedula,
    score: p.score,
    status: status,
  }));

  if (records.length === 0) {
    // Clear any existing acknowledgment since there are no participants
    await supabase
      .from("facilitador_acknowledgments")
      .delete()
      .eq("osi_id", osiId)
      .eq("facilitador_id", facilitadorId);

    revalidatePath("/portal/facilitador/dashboard");
    return { success: true };
  }

  const { data, error } = await supabase
    .from("ejecucion_osi_participantes")
    .insert(records);

  if (error) {
    return { error: error.message };
  }

  // Save acknowledgment audit record on final submission
  if (status === "final" && acknowledged && disclaimerText) {
    const ackResult = await saveAcknowledgment(osiId, facilitadorId, disclaimerText);
    if (ackResult.error) {
      console.error("Failed to save acknowledgment:", ackResult.error);
    }
  }

  revalidatePath("/portal/facilitador/dashboard");
  return { success: true };
}

export async function getFacilitatorByOSI(osiId: number) {
  const supabase = await createAdminClient();

  // 1. Try to see if anyone has already uploaded participants for this OSI
  // This is the most accurate way to know who the facilitator is for this execution
  const { data: uploadedData } = await supabase
    .from("ejecucion_osi_participantes")
    .select("facilitador_id")
    .eq("osi_id", osiId)
    .limit(1)
    .maybeSingle();

  let facilitatorId = uploadedData?.facilitador_id;

  // 2. If no one uploaded yet, check the facilitador_osi_assignments table (sole source of truth)
  if (!facilitatorId) {
    const { data: assignmentData } = await supabase
      .from("facilitador_osi_assignments")
      .select("facilitador_id")
      .eq("osi_id", osiId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    facilitatorId = assignmentData?.facilitador_id;
  }

  if (!facilitatorId) {
    return { data: null };
  }

  // Fetch full facilitator data including signature
  const { data, error } = await supabase
    .from("facilitadores")
    .select(`
      *,
      firmas!facilitadores_firma_id_fkey (
        id,
        nombre,
        url_imagen,
        imagen_base64,
        tipo,
        is_active
      )
    `)
    .eq("id", facilitatorId)
    .single();

  if (error) {
    console.error("Error fetching facilitator data:", error);
    return { error: error.message };
  }

  return { data };
}

/**
 * Upload an attachment (physical list) for an OSI from the facilitator portal
 */
export async function uploadOSIAttachment(
  osiId: number,
  facilitadorId: number,
  formData: FormData
): Promise<{ success?: boolean; data?: OSIAttachment; error?: string }> {
  console.log("[uploadOSIAttachment] ENTRY", { osiId, facilitadorId });

  const session = await getFacilitatorSession();
  console.log("[uploadOSIAttachment] Session:", session ? { id: session.id, facilitador_id: session.facilitador_id, nombre: session.nombre } : "NULL");
  if (!session || session.facilitador_id !== facilitadorId) {
    console.log("[uploadOSIAttachment] Auth failed — returning No autorizado");
    return { error: "No autorizado" };
  }

  const supabase = await createAdminClient();
  const file = formData.get("file") as File;
  console.log("[uploadOSIAttachment] File from formData:", file ? { name: file.name, type: file.type, size: file.size } : "NULL");

  if (!file) return { error: "No se proporcionó ningún archivo" };

  try {
    const bytes = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(bytes);
    let finalFileType = file.type;
    console.log("[uploadOSIAttachment] Buffer created, size:", buffer.length, "type:", finalFileType);

    // Optimize images (not PDFs)
    if (file.type.startsWith("image/")) {
      const originalSize = buffer.length;
      buffer = await optimizeDocumentImage(buffer) as Buffer;
      finalFileType = "image/jpeg"; // Always output optimized as JPEG
      console.log("[uploadOSIAttachment] After optimizeDocumentImage:", { originalSize, optimizedSize: buffer.length, type: finalFileType });
    }

    // Generate path: osi_id/facilitador_id/timestamp_filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${osiId}/${facilitadorId}/${timestamp}_${sanitizedName}`;
    console.log("[uploadOSIAttachment] Storage path:", storagePath);

    // 1. Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from("facilitador-uploads")
      .upload(storagePath, buffer, {
        contentType: finalFileType,
        upsert: true,
      });

    console.log("[uploadOSIAttachment] Storage upload result:", { error: storageError ? { message: storageError.message, name: storageError.name } : "none", data: storageData ? { path: storageData.path, id: storageData.id } : "null" });

    if (storageError) throw storageError;

    // 2. Insert into metadata table
    const { data, error: dbError } = await supabase
      .from("ejecucion_osi_asistencia")
      .insert({
        osi_id: osiId,
        facilitador_id: facilitadorId,
        storage_path: storagePath,
        file_name: file.name,
        file_type: finalFileType,
        file_size: buffer.length,
      })
      .select()
      .single();

    console.log("[uploadOSIAttachment] DB insert result:", { error: dbError ? { message: dbError.message, code: dbError.code, details: dbError.details } : "none", data: data ? { id: data.id, file_name: data.file_name, storage_path: data.storage_path } : "NULL" });

    if (dbError) {
      // Cleanup storage if DB fails
      await supabase.storage.from("facilitador-uploads").remove([storagePath]);
      throw dbError;
    }

    const returnValue = { success: true, data: data as OSIAttachment };
    console.log("[uploadOSIAttachment] Returning success:", { hasData: !!returnValue.data, dataId: returnValue.data?.id });
    return returnValue;
  } catch (error) {
    console.error("[uploadOSIAttachment] CATCH Error:", error instanceof Error ? { message: error.message, stack: error.stack } : String(error));
    return { error: error instanceof Error ? error.message : "Error al subir el archivo" };
  }
}

/**
 * Get all attachments for a specific OSI
 */
export async function getOSIAttachments(osiId: number, facilitadorId?: number): Promise<{ data?: OSIAttachment[]; error?: string }> {
  console.log("[getOSIAttachments] ENTRY", { osiId, facilitadorId });

  const supabase = await createAdminClient();
  
  let query = supabase
    .from("ejecucion_osi_asistencia")
    .select("*")
    .eq("osi_id", osiId);
  
  if (facilitadorId) {
    query = query.eq("facilitador_id", facilitadorId);
  }
  
  const { data, error } = await query.order("created_at", { ascending: false });

  console.log("[getOSIAttachments] Query result:", { rowCount: data?.length ?? 0, error: error ? { message: error.message, code: error.code, details: error.details } : "none", firstRow: data?.[0] ? { id: data[0].id, storage_path: data[0].storage_path, file_name: data[0].file_name } : "none" });

  if (error) {
    console.error("[getOSIAttachments] Error:", error);
    return { error: error.message };
  }

  // Get public URLs for each file
  const attachmentsWithUrls = (data || []).map(att => {
    const { data: { publicUrl } } = supabase.storage
      .from("facilitador-uploads")
      .getPublicUrl(att.storage_path);
    
    return { ...att, publicUrl } as OSIAttachment;
  });

  console.log("[getOSIAttachments] Returning", { count: attachmentsWithUrls.length, hasUrls: attachmentsWithUrls.every(a => !!a.publicUrl) });
  return { data: attachmentsWithUrls };
}

/**
 * Delete an attachment from storage and DB
 */
export async function deleteOSIAttachment(id: string, storagePath: string): Promise<{ success?: boolean; error?: string }> {
  const session = await getFacilitatorSession();
  if (!session) {
    return { error: "No autorizado" };
  }

  const supabase = await createAdminClient();

  try {
    // Verify ownership: the attachment must belong to this facilitador
    const { data: att } = await supabase
      .from("ejecucion_osi_asistencia")
      .select("facilitador_id")
      .eq("id", id)
      .single();

    if (!att || att.facilitador_id !== session.facilitador_id) {
      return { error: "No autorizado" };
    }

    // 1. Delete from storage
    const { error: storageError } = await supabase.storage
      .from("facilitador-uploads")
      .remove([storagePath]);

    if (storageError) throw storageError;

    // 2. Delete from database
    const { error: dbError } = await supabase
      .from("ejecucion_osi_asistencia")
      .delete()
      .eq("id", id);

    if (dbError) throw dbError;

    return { success: true };
  } catch (error) {
    console.error("[deleteOSIAttachment] Error:", error);
    return { error: error instanceof Error ? error.message : "Error al eliminar el archivo" };
  }
}
