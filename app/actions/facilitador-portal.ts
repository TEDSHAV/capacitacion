"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { optimizeDocumentImage } from "@/lib/image-optimization.server";
import { OSIAttachment } from "@/types";

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
  cookieStore.set("facilitador_session", JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });

  return { success: true };
}

export async function getFacilitatorSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("facilitador_session");
  if (!session) return null;
  try {
    return JSON.parse(session.value);
  } catch (e) {
    return null;
  }
}

export async function logoutFacilitator() {
  const cookieStore = await cookies();
  cookieStore.delete("facilitador_session");
  return { success: true };
}

export async function getAssignedOSIs(facilitadorId: number) {
  const supabase = await createAdminClient();
  
  // Check both control_servicios_ejecutados and requisiciones for assignments
  const [controlRes, requisicionesRes] = await Promise.all([
    supabase
      .from("control_servicios_ejecutados")
      .select("id_osi")
      .eq("cod_facilitador", facilitadorId),
    supabase
      .from("requisiciones")
      .select("id_osi")
      .eq("cod_facilitador", facilitadorId)
  ]);

  if (controlRes.error) {
    console.error("Error fetching control_servicios_ejecutados:", controlRes.error);
  }
  
  if (requisicionesRes.error) {
    console.error("Error fetching requisiciones:", requisicionesRes.error);
  }

  // Combine and deduplicate OSI IDs
  const controlIds = (controlRes.data || []).map(c => c.id_osi).filter(id => id !== null);
  const requisicionIds = (requisicionesRes.data || []).map(r => r.id_osi).filter(id => id !== null);
  
  const allOsiIds = Array.from(new Set([...controlIds, ...requisicionIds])) as number[];

  if (allOsiIds.length === 0) {
    return { data: [] };
  }

  // Then we get the details from v_osi_formato_completo
  const { data, error } = await supabase
    .from("v_osi_formato_completo")
    .select("*")
    .in("id_osi", allOsiIds)
    .order("fecha_emision", { ascending: false });

  if (error) {
    console.error("Error fetching assigned OSIs details:", error);
    return { error: error.message };
  }

  return { data };
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

  // Fallback: If we searched for a specific facilitator but found nothing, 
  // try searching for ANY participants for this OSI (useful for the dashboard import)
  if (facilitadorId && (!data || data.length === 0)) {
    console.log(`[getOSIParticipants] No data for facilitator ${facilitadorId}, trying fallback to any facilitator for OSI ${osiId}`);
    const { data: fallbackData } = await supabase
      .from("ejecucion_osi_participantes")
      .select("*")
      .eq("osi_id", osiId)
      .order("id", { ascending: true });
    
    if (fallbackData && fallbackData.length > 0) {
      return { data: fallbackData };
    }
  }

  return { data: data || [] };
}

export async function saveParticipants(
  osiId: number,
  facilitadorId: number,
  participants: any[],
  status: "draft" | "final" = "draft"
) {
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

  const { data, error } = await supabase
    .from("ejecucion_osi_participantes")
    .insert(records);

  if (error) {
    return { error: error.message };
  }

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

  // 2. If no one uploaded yet, check assignment tables
  if (!facilitatorId) {
    const [controlRes, requisicionRes] = await Promise.all([
      supabase
        .from("control_servicios_ejecutados")
        .select("cod_facilitador")
        .eq("id_osi", osiId)
        .not("cod_facilitador", "is", null)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("requisiciones")
        .select("cod_facilitador")
        .eq("id_osi", osiId)
        .not("cod_facilitador", "is", null)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    facilitatorId = controlRes.data?.cod_facilitador || requisicionRes.data?.cod_facilitador;
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
  const supabase = await createAdminClient();
  const file = formData.get("file") as File;

  if (!file) return { error: "No se proporcionó ningún archivo" };

  try {
    const bytes = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(bytes);
    let finalFileType = file.type;

    // Optimize images (not PDFs)
    if (file.type.startsWith("image/")) {
      buffer = await optimizeDocumentImage(buffer) as Buffer;
      finalFileType = "image/jpeg"; // Always output optimized as JPEG
    }

    // Generate path: osi_id/facilitador_id/timestamp_filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${osiId}/${facilitadorId}/${timestamp}_${sanitizedName}`;

    // 1. Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from("facilitador-uploads")
      .upload(storagePath, buffer, {
        contentType: finalFileType,
        upsert: true,
      });

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

    if (dbError) {
      // Cleanup storage if DB fails
      await supabase.storage.from("facilitador-uploads").remove([storagePath]);
      throw dbError;
    }

    return { success: true, data: data as OSIAttachment };
  } catch (error) {
    console.error("[uploadOSIAttachment] Error:", error);
    return { error: error instanceof Error ? error.message : "Error al subir el archivo" };
  }
}

/**
 * Get all attachments for a specific OSI
 */
export async function getOSIAttachments(osiId: number): Promise<{ data?: OSIAttachment[]; error?: string }> {
  const supabase = await createAdminClient();
  
  const { data, error } = await supabase
    .from("ejecucion_osi_asistencia")
    .select("*")
    .eq("osi_id", osiId)
    .order("created_at", { ascending: false });

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

  return { data: attachmentsWithUrls };
}

/**
 * Delete an attachment from storage and DB
 */
export async function deleteOSIAttachment(id: string, storagePath: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createAdminClient();

  try {
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
