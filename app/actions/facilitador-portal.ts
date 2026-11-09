"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { optimizeDocumentImage, optimizePdfToImage, isHeicBuffer } from "@/lib/image-optimization.server";
import { OSIAttachment } from "@/types";
import { signSession, verifySession } from "@/lib/session-signing";
import { getSessionCount } from "@/lib/osi-utils";
import { getOsiSessionInfo } from "./osi-facilitador-assignments";
import { notifyCapacitacionUsersOfUpload } from "./facilitador-notifications";
import { syncOsiEjecutadoToShell } from "@/lib/sync/sync-osi-estatus";
import {
  getClientIp,
  checkLoginRateLimit,
  recordLoginFailure,
  clearLoginFailures,
} from "@/lib/login-rate-limiter";
import { hashPassword, verifyPassword, isBcryptHash } from "@/lib/password-hashing";
import { isMaterialesEnabled } from "@/lib/materiales-flags";
import { toTitleCase } from "@/utils/string-utils";

// Legacy SHA-256 hash for verifying old (unmigrated) credentials
function legacySha256Hash(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function createFacilitatorCredentials(
  facilitadorId: number,
  username: string,
  password: string
) {
  const supabase = await createAdminClient();
  const passwordHash = await hashPassword(password);

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

  const cleanUsername = username.trim().toLowerCase();

  // Rate limiting: check before hitting the DB
  const ip = await getClientIp();
  const rateLimit = await checkLoginRateLimit(ip, cleanUsername);
  if (!rateLimit.allowed) {
    const minutes = Math.ceil(rateLimit.retryAfterMs / 60000);
    return {
      error: `Demasiados intentos fallidos. Intenta de nuevo en ${minutes} minuto(s).`,
    };
  }

  // Fetch credentials by username (case-insensitive)
  // Also try without dots if user entered a dot (e.g., "carlos.castro" -> "carloscastro")
  let { data: creds, error: credError } = await supabase
    .from("facilitador_credenciales")
    .select("*, facilitadores(nombre_apellido)")
    .ilike("username", cleanUsername)
    .eq("is_active", true)
    .maybeSingle();

  if (!creds && cleanUsername.includes(".")) {
    const noDotUsername = cleanUsername.replace(/\./g, "");
    const retryRes = await supabase
      .from("facilitador_credenciales")
      .select("*, facilitadores(nombre_apellido)")
      .ilike("username", noDotUsername)
      .eq("is_active", true)
      .maybeSingle();

    if (retryRes.data) {
      creds = retryRes.data;
      credError = null;
    }
  }

  if (credError) {
    console.error("[Portal Login] Database error:", credError);
    return { error: "Error al verificar credenciales" };
  }

  if (!creds) {
    await recordLoginFailure(ip, cleanUsername);
    return { error: "Credenciales inválidas o cuenta inactiva" };
  }

  // Verify password: support both legacy SHA-256 and bcrypt hashes
  const storedHash: string = creds.password_hash;
  let passwordValid = false;

  if (isBcryptHash(storedHash)) {
    passwordValid = await verifyPassword(password, storedHash);
  } else {
    // Legacy SHA-256 path — verify, then transparently migrate to bcrypt
    passwordValid = legacySha256Hash(password) === storedHash;
    if (passwordValid) {
      const newBcryptHash = await hashPassword(password);
      // Optimistic update: only re-hash if the stored hash hasn't already
      // been migrated by a concurrent login (race-safe).
      await supabase
        .from("facilitador_credenciales")
        .update({ password_hash: newBcryptHash, updated_at: new Date().toISOString() })
        .eq("id", creds.id)
        .eq("password_hash", storedHash);
    }
  }

  if (!passwordValid) {
    await recordLoginFailure(ip, cleanUsername);
    return { error: "Credenciales inválidas o cuenta inactiva" };
  }

  // Clear rate-limit counter on successful login
  await clearLoginFailures(ip, cleanUsername);

  const formattedName = toTitleCase(creds.facilitadores.nombre_apellido);

  // Set a session cookie (simplified for this custom auth)
  const sessionData = {
    id: creds.id,
    facilitador_id: creds.facilitador_id,
    nombre: formattedName,
    username: creds.username,
  };

  const cookieStore = await cookies();
  cookieStore.set("facilitador_session", signSession(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_COOKIE_SECURE !== "false",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days — persist until explicit logout
    path: "/",
  });

  return { success: true, nombre: formattedName, facilitadorId: creds.facilitador_id };
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
  const data = verifySession<{
    id: number;
    facilitador_id: number;
    nombre: string;
    username: string;
  }>(session.value);
  if (!data) return null;

  // Validate that the credentials record is still active in the database
  try {
    const supabase = await createAdminClient();
    const { data: cred, error } = await supabase
      .from("facilitador_credenciales")
      .select("is_active")
      .eq("id", data.id)
      .maybeSingle();

    if (error || !cred || cred.is_active === false) {
      cookieStore.delete("facilitador_session");
      return null;
    }
  } catch (err) {
    // If DB check encounters a transient network error, proceed with cryptographic verification
    console.warn("[getFacilitatorSession] Transient DB check error, relying on cryptographic signature:", err);
  }

  return {
    ...data,
    nombre: toTitleCase(data.nombre),
  };
}

export async function logoutFacilitator() {
  const cookieStore = await cookies();
  cookieStore.delete("facilitador_session");
  return { success: true };
}

export async function getAssignedOSIs(facilitadorId: number) {
  const supabase = await createAdminClient();

  // Query the facilitador_osi_assignments table (sole source of truth)
  // Include nro_sesion and attachment_received so the dashboard knows completion status
  const { data: assignments, error: assignError } = await supabase
    .from("facilitador_osi_assignments")
    .select("osi_id, nro_sesion, attachment_received")
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

  // Build a map: osi_id → { specificSessions: number[], hasAllSessions: boolean, receivedSessions: Set<number | null> }
  const sessionsByOsi = new Map<number, { specificSessions: number[]; hasAllSessions: boolean; receivedSessions: Set<number | null> }>();
  for (const a of assignments || []) {
    const entry = sessionsByOsi.get(a.osi_id) || { specificSessions: [], hasAllSessions: false, receivedSessions: new Set<number | null>() };
    if (a.nro_sesion === null) {
      entry.hasAllSessions = true;
    } else {
      entry.specificSessions.push(a.nro_sesion);
    }
    if (a.attachment_received) {
      entry.receivedSessions.add(a.nro_sesion);
    }
    sessionsByOsi.set(a.osi_id, entry);
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
    let participantsData: Array<{ osi_id: number; status: string; nro_sesion?: number | null }> = [];
    const { data: pData, error: pError } = await supabase
      .from("ejecucion_osi_participantes")
      .select("osi_id, status, nro_sesion")
      .in("osi_id", allOsiIds);

    if (pError && pError.code === "42703") {
      const fb = await supabase
        .from("ejecucion_osi_participantes")
        .select("osi_id, status")
        .in("osi_id", allOsiIds);
      participantsData = (fb.data || []).map((p) => ({ ...p, nro_sesion: 1 }));
    } else {
      participantsData = pData || [];
    }

    const nroOsiInts = (data || [])
      .map((o) => parseInt(String(o.nro_osi || "").replace(/[^\d]/g, ""), 10))
      .filter((n) => !isNaN(n) && n > 0);

    const [osiSessionsRes, attachmentsRes, certsRes] = await Promise.all([
      supabase
        .from("osi_sesion")
        .select("id_osi, nro_sesion, fecha, fecha_ejecutada, hora_inicio, hora_fin")
        .in("id_osi", allOsiIds)
        .order("nro_sesion", { ascending: true }),
      supabase
        .from("ejecucion_osi_asistencia")
        .select("osi_id, nro_sesion, category")
        .eq("facilitador_id", facilitadorId)
        .in("osi_id", allOsiIds),
      nroOsiInts.length > 0
        ? supabase
            .from("certificados")
            .select("nro_osi")
            .in("nro_osi", nroOsiInts)
            .is("motivo_anulacion", null)
        : Promise.resolve({ data: [] }),
    ]);

    const osisWithCertificates = new Set<number>();
    for (const c of (certsRes.data || []) as { nro_osi: number }[]) {
      if (c.nro_osi) osisWithCertificates.add(c.nro_osi);
    }

    const osiStatusMap = new Map<number, string>();
    const sessionStatusMap = new Map<string, string>();
    if (participantsData && participantsData.length > 0) {
      for (const p of participantsData) {
        const sesNum = p.nro_sesion ?? 1;
        const key = `${p.osi_id}_${sesNum}`;
        const currentSes = sessionStatusMap.get(key);
        if (p.status === "final") {
          sessionStatusMap.set(key, "final");
        } else if (currentSes !== "final") {
          sessionStatusMap.set(key, "draft");
        }

        const currentOsi = osiStatusMap.get(p.osi_id);
        if (p.status === "final") {
          osiStatusMap.set(p.osi_id, "final");
        } else if (currentOsi !== "final") {
          osiStatusMap.set(p.osi_id, "draft");
        }
      }
    }

    const sessionsListByOsi = new Map<number, Array<{
      nro_sesion: number;
      fecha: string | null;
      fecha_ejecutada: string | null;
      hora_inicio?: string | null;
      hora_fin?: string | null;
    }>>();

    for (const s of osiSessionsRes.data || []) {
      const list = sessionsListByOsi.get(s.id_osi) || [];
      list.push(s);
      sessionsListByOsi.set(s.id_osi, list);
    }

    const attachmentsListByOsi = new Map<number, Array<{
      nro_sesion: number | null;
      category: string;
    }>>();

    for (const a of attachmentsRes.data || []) {
      const list = attachmentsListByOsi.get(a.osi_id) || [];
      list.push(a);
      attachmentsListByOsi.set(a.osi_id, list);
    }

    const materialesActive = isMaterialesEnabled();
    const courseMaterialsMap = new Map<number, number>();
    const osiMaterialsMap = new Map<number, number>();
    const courseNameToIdMap = new Map<string, number>();

    if (materialesActive) {
      // Fetch material existence for these OSIs / courses
      const [materialsRes, coursesRes] = await Promise.all([
        supabase
          .from("capacitacion_material_didactico")
          .select("id, id_curso, id_osi, tipo_material"),
        supabase
          .from("catalogo_servicios")
          .select("id, nombre"),
      ]);

      for (const c of coursesRes.data || []) {
        if (c.nombre) {
          const norm = c.nombre.trim().toLowerCase();
          courseNameToIdMap.set(norm, c.id);
        }
      }

      for (const m of materialsRes.data || []) {
        if (m.id_osi) {
          osiMaterialsMap.set(m.id_osi, (osiMaterialsMap.get(m.id_osi) || 0) + 1);
        }
        if (m.id_curso) {
          courseMaterialsMap.set(m.id_curso, (courseMaterialsMap.get(m.id_curso) || 0) + 1);
        }
      }
    }

    enrichedData = enrichedData.map((osi: any) => {
      const sessionInfo = sessionsByOsi.get(osi.id_osi);
      const osiServicioNorm = (osi.servicio || "").trim().toLowerCase();
      const resolvedCourseId = osi.id_servicio || courseNameToIdMap.get(osiServicioNorm);

      const matCount = materialesActive
        ? (osiMaterialsMap.get(osi.id_osi) || 0) +
          (resolvedCourseId ? courseMaterialsMap.get(resolvedCourseId) || 0 : 0)
        : 0;

      const allSessionsForOsi = sessionsListByOsi.get(osi.id_osi) || [];
      const relevantSessions =
        sessionInfo && !sessionInfo.hasAllSessions && sessionInfo.specificSessions.length > 0
          ? allSessionsForOsi.filter((s) => sessionInfo.specificSessions.includes(s.nro_sesion))
          : allSessionsForOsi;

      let display_date: string | null = null;
      let display_date_label: string | null = null;
      let display_date_type: "single" | "next_pending" | "last_executed" | "fallback" = "fallback";

      if (relevantSessions.length === 1) {
        // Single session: exact execution date (planned or executed)
        const s = relevantSessions[0];
        display_date = s.fecha_ejecutada || s.fecha || osi.fecha_inicio_real || osi.fecha_emision || null;
        display_date_label = `Sesión ${s.nro_sesion}`;
        display_date_type = "single";
      } else if (relevantSessions.length > 1) {
        // Multiple sessions: next session to execute, or last session executed if all finished
        const unexecuted = relevantSessions.filter((s) => !s.fecha_ejecutada);
        if (unexecuted.length > 0) {
          const next = unexecuted[0];
          display_date = next.fecha || next.fecha_ejecutada || osi.fecha_inicio_real || null;
          display_date_label = `Próx: Sesión ${next.nro_sesion}`;
          display_date_type = "next_pending";
        } else {
          const last = relevantSessions[relevantSessions.length - 1];
          display_date = last.fecha_ejecutada || last.fecha || osi.fecha_fin_real || osi.fecha_inicio_real || null;
          display_date_label = `Últ: Sesión ${last.nro_sesion}`;
          display_date_type = "last_executed";
        }
      }

      // Safe fallback if osi_sesion rows were missing
      if (!display_date) {
        display_date =
          osi.fecha_inicio_real ||
          (Array.isArray(osi.sesiones_programadas) && osi.sesiones_programadas[0]?.fecha) ||
          osi.fecha_emision ||
          null;
        display_date_type = "fallback";
      }

      const osiAttachments = attachmentsListByOsi.get(osi.id_osi) || [];
      const fullSessionCount = Math.max(
        getSessionCount(osi),
        relevantSessions.length,
        ...(sessionInfo?.specificSessions || [])
      );

      const sessionNumbers =
        sessionInfo && !sessionInfo.hasAllSessions && sessionInfo.specificSessions.length > 0
          ? sessionInfo.specificSessions
          : Array.from({ length: Math.max(1, fullSessionCount) }, (_, i) => i + 1);

      const enrichedSessionsList = sessionNumbers.map((n) => {
        const found = relevantSessions.find((s) => s.nro_sesion === n);
        const forSes =
          sessionNumbers.length > 1
            ? osiAttachments.filter((a) => a.nro_sesion === n || (n === 1 && a.nro_sesion == null))
            : osiAttachments.filter((a) => a.nro_sesion === n || a.nro_sesion == null);
        const hasAsist = forSes.some((a) => a.category === "lista_asistencia");
        const hasFotos = forSes.some((a) => a.category === "material_fotografico") || osi.id_estatus === 12;
        const partStatus = sessionStatusMap.get(`${osi.id_osi}_${n}`) || (n === 1 ? osiStatusMap.get(osi.id_osi) : null);
        const isReceived =
          sessionNumbers.length > 1
            ? Boolean(sessionInfo?.receivedSessions.has(n))
            : Boolean(sessionInfo?.receivedSessions.has(null) || sessionInfo?.receivedSessions.has(n));
        const isSessionCompleted = (hasAsist && hasFotos && partStatus === "final") || isReceived;

        let sessionDate = found?.fecha_ejecutada || found?.fecha || null;
        if (!sessionDate && Array.isArray(osi.sesiones_programadas) && osi.sesiones_programadas[n - 1]?.fecha) {
          sessionDate = osi.sesiones_programadas[n - 1].fecha;
        }

        const nroInt = parseInt(String(osi.nro_osi || "").replace(/[^\d]/g, ""), 10);
        const hasCertificates = osisWithCertificates.has(nroInt);

        return {
          nro_sesion: n,
          fecha: sessionDate,
          fecha_ejecutada: found?.fecha_ejecutada || null,
          hora_inicio: found?.hora_inicio || null,
          hora_fin: found?.hora_fin || null,
          is_completed: isSessionCompleted,
          participant_status: partStatus || null,
          has_certificates: hasCertificates,
        };
      });

      const completedSessionsCount = enrichedSessionsList.filter((s) => s.is_completed).length;
      const allSessionsCompleted = completedSessionsCount === sessionNumbers.length && sessionNumbers.length > 0;
      const nroInt = parseInt(String(osi.nro_osi || "").replace(/[^\d]/g, ""), 10);
      const hasCertificates = osisWithCertificates.has(nroInt);

      return {
        ...osi,
        has_certificates: hasCertificates,
        participant_status: allSessionsCompleted ? "final" : osiStatusMap.get(osi.id_osi) || null,
        assigned_sessions: sessionInfo?.specificSessions || [],
        assigned_all_sessions: sessionInfo?.hasAllSessions || false,
        session_count: getSessionCount(osi),
        has_material: matCount > 0,
        material_count: matCount,
        display_date,
        display_date_label,
        display_date_type,
        sessions_list: enrichedSessionsList,
        all_sessions_completed: allSessionsCompleted,
        completed_sessions_count: completedSessionsCount,
        total_sessions_count: sessionNumbers.length,
      };
    });
  }



  console.log("[getAssignedOSIs] Enriched data sample:", JSON.stringify((enrichedData as any[])?.slice(0, 2).map(o => ({
    id_osi: o.id_osi,
    nro_osi: o.nro_osi,
    assigned_sessions: o.assigned_sessions,
    assigned_all_sessions: o.assigned_all_sessions,
    session_count: o.session_count,
    sesiones_ejecucion: o.sesiones_ejecucion,
    desglose_recursos_sesiones: Array.isArray(o.desglose_recursos_sesiones) ? `array[${o.desglose_recursos_sesiones.length}]` : o.desglose_recursos_sesiones,
    sesiones_programadas: Array.isArray(o.sesiones_programadas) ? `array[${o.sesiones_programadas.length}]` : o.sesiones_programadas,
  })), null, 2));

  return { data: enrichedData };
}

export interface FacilitadorFullData {
  facilitador: {
    id: number;
    nombre_apellido: string;
    cedula: string | null;
    rif: string | null;
    email: string | null;
    telefono: string | null;
    direccion: string | null;
    nivel_educacion: string | null;
    formacion_docente_certificada: boolean;
    foto_perfil_url: string | null;
    calificacion: number | null;
    rating: number | null;
    review_count: number;
    fecha_ingreso: string | null;
    estado_nombre: string | null;
    ciudad_nombre: string | null;
    temas_cursos: any[];
    niveles_habilidad: Record<string, string>;
    tiene_firma: boolean;
  };
  osis: any[];
  historial: Array<{
    id_osi: number;
    nro_osi: string | number;
    empresa: string;
    cliente_rif: string;
    servicio: string;
    fecha: string;
    fecha_raw: string | null;
    año: number;
    mes: string;
    ubicacion: string;
    modalidad: string;
    duracion_horas: number;
    sesiones: number;
    is_final: boolean;
  }>;
  stats: {
    totalServicios: number;
    totalFinalizados: number;
    totalPendientes: number;
    totalEmpresas: number;
    totalHoras: number;
    cursosUnicos: number;
  };
}

export async function getFacilitatorPortalData(facilitadorId: number): Promise<{
  data?: FacilitadorFullData;
  error?: string;
}> {
  try {
    const supabase = await createAdminClient();

    // 1. Fetch facilitator record, ratings from v_facilitador_resumen, and assigned OSIs in parallel
    const [facResult, resumenResult, osisResult] = await Promise.all([
      supabase
        .from("facilitadores")
        .select(`
          id,
          nombre_apellido,
          cedula,
          rif,
          email,
          telefono,
          direccion,
          nivel_educacion,
          formacion_docente_certificada,
          foto_perfil_url,
          calificacion,
          fecha_ingreso,
          id_estado_geografico,
          id_ciudad,
          temas_cursos,
          niveles_habilidad,
          firma_id
        `)
        .eq("id", facilitadorId)
        .single(),
      supabase
        .from("v_facilitador_resumen")
        .select("overall_rating, review_count")
        .eq("id", facilitadorId)
        .maybeSingle(),
      getAssignedOSIs(facilitadorId),
    ]);

    const { data: facData, error: facErr } = facResult;
    if (facErr || !facData) {
      console.error("[getFacilitatorPortalData] Error fetching facilitator:", facErr);
      return { error: facErr?.message || "Facilitador no encontrado" };
    }

    // Resolve overall rating and review count from satisfaction surveys (fallback to facilitador.calificacion)
    const numResumenRating = Number(resumenResult.data?.overall_rating);
    const reviewCount = Number(resumenResult.data?.review_count) || 0;
    const rating =
      numResumenRating > 0
        ? numResumenRating
        : facData.calificacion && Number(facData.calificacion) > 0
        ? Number(facData.calificacion)
        : null;

    // Resolve state and city names
    let estado_nombre: string | null = null;
    let ciudad_nombre: string | null = null;

    if (facData.id_estado_geografico) {
      const { data: estadoData } = await supabase
        .from("cat_estados")
        .select("nombre")
        .eq("id", facData.id_estado_geografico)
        .single();
      estado_nombre = estadoData?.nombre || null;
    }

    if (facData.id_ciudad) {
      const { data: ciudadData } = await supabase
        .from("ciudades")
        .select("nombre")
        .eq("id", facData.id_ciudad)
        .single();
      ciudad_nombre = ciudadData?.nombre || null;
    }

    // Resolve course topic names
    let resolvedTemas: any[] = facData.temas_cursos || [];
    if (Array.isArray(resolvedTemas) && resolvedTemas.length > 0) {
      const numericIds = resolvedTemas.filter(
        (t) => typeof t === "number" || (!isNaN(Number(t)) && Number(t) > 0),
      );
      if (numericIds.length > 0) {
        const { data: catCursos } = await supabase
          .from("catalogo_servicios")
          .select("id, nombre")
          .in("id", numericIds.map(Number));
        if (catCursos && catCursos.length > 0) {
          const map = new Map(catCursos.map((c) => [c.id, c.nombre]));
          resolvedTemas = resolvedTemas.map((t) => map.get(Number(t)) || t);
        }
      }
    }

    // 2. Assigned OSIs loaded in parallel
    const { data: osis = [] } = osisResult;

    // 3. Build comprehensive history of services
    const historial = (osis || []).map((osi: any) => {
      const dateStr = osi.fecha_inicio_real || osi.fecha_emision || osi.created_at;
      let año = new Date().getFullYear();
      let mes = "S/F";
      let fechaFormatted = "Por definir";

      if (dateStr) {
        try {
          const d = new Date(dateStr);
          año = d.getFullYear();
          mes = d.toLocaleString("es-VE", { month: "short" }).toUpperCase().replace(".", "");
          fechaFormatted = d.toLocaleDateString("es-VE", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        } catch {
          // fallback
        }
      }

      const ubicacionArr = [osi.ciudad, osi.estado].filter(Boolean);
      const ubicacion =
        ubicacionArr.length > 0
          ? ubicacionArr.join(", ")
          : osi.direccion_servicio || "Instalaciones del Cliente";

      return {
        id_osi: osi.id_osi,
        nro_osi: osi.nro_osi,
        empresa: osi.nombre_empresa || "Empresa Cliente",
        cliente_rif: osi.cliente_rif || "N/A",
        servicio: osi.servicio || "Capacitación Técnica",
        fecha: fechaFormatted,
        fecha_raw: dateStr || null,
        año,
        mes,
        ubicacion,
        modalidad: osi.modalidad || "Presencial",
        duracion_horas: Number(osi.duracion_horas) || Number(osi.horas_teoricas) || 8,
        sesiones: osi.session_count || 1,
        is_final: osi.participant_status === "final",
      };
    });

    // 4. Calculate consolidated metrics
    const totalServicios = historial.length;
    const totalFinalizados = historial.filter((h) => h.is_final).length;
    const totalPendientes = totalServicios - totalFinalizados;
    const totalEmpresas = new Set(historial.map((h) => h.empresa)).size;
    const totalHoras = historial.reduce((sum, h) => sum + (h.duracion_horas || 0), 0);
    const cursosUnicos = new Set(historial.map((h) => h.servicio)).size;

    return {
      data: {
        facilitador: {
          id: facData.id,
          nombre_apellido: facData.nombre_apellido,
          cedula: facData.cedula || null,
          rif: facData.rif || null,
          email: facData.email || null,
          telefono: facData.telefono || null,
          direccion: facData.direccion || null,
          nivel_educacion: facData.nivel_educacion || null,
          formacion_docente_certificada: Boolean(facData.formacion_docente_certificada),
          foto_perfil_url: facData.foto_perfil_url || null,
          calificacion: facData.calificacion ? Number(facData.calificacion) : null,
          rating,
          review_count: reviewCount,
          fecha_ingreso: facData.fecha_ingreso || null,
          estado_nombre,
          ciudad_nombre,
          temas_cursos: resolvedTemas,
          niveles_habilidad: (facData.niveles_habilidad as Record<string, string>) || {},
          tiene_firma: Boolean(facData.firma_id),
        },
        osis: osis || [],
        historial,
        stats: {
          totalServicios,
          totalFinalizados,
          totalPendientes,
          totalEmpresas,
          totalHoras,
          cursosUnicos,
        },
      },
    };
  } catch (err: any) {
    console.error("[getFacilitatorPortalData] Unexpected error:", err);
    return { error: err?.message || "Error al cargar datos del facilitador" };
  }
}

export async function getOSIParticipants(
  osiId: number,
  facilitadorId?: number,
  nroSesion?: number
): Promise<{ data?: any[]; error?: string }> {
  const supabase = await createAdminClient();
  
  console.log(`[getOSIParticipants] Searching for OSI: ${osiId}, Facilitador: ${facilitadorId || 'ANY'}, Sesión: ${nroSesion ?? 'ANY'}`);

  let query = supabase
    .from("ejecucion_osi_participantes")
    .select("*")
    .eq("osi_id", osiId);
  
  if (facilitadorId) {
    query = query.eq("facilitador_id", facilitadorId);
  }

  if (nroSesion !== undefined && nroSesion !== null) {
    const { data, error } = await query.eq("nro_sesion", nroSesion).order("id", { ascending: true });
    if (error && error.code === "42703") {
      // Column nro_sesion does not exist yet: fall back without nro_sesion filter
      let fallbackQuery = supabase
        .from("ejecucion_osi_participantes")
        .select("*")
        .eq("osi_id", osiId);
      if (facilitadorId) fallbackQuery = fallbackQuery.eq("facilitador_id", facilitadorId);
      const fb = await fallbackQuery.order("id", { ascending: true });
      return { data: fb.data || [] };
    }
    // If no records found for session 1, also check for legacy rows where nro_sesion is NULL
    if ((!data || data.length === 0) && nroSesion === 1) {
      let legacyQuery = supabase
        .from("ejecucion_osi_participantes")
        .select("*")
        .eq("osi_id", osiId)
        .is("nro_sesion", null);
      if (facilitadorId) legacyQuery = legacyQuery.eq("facilitador_id", facilitadorId);
      const leg = await legacyQuery.order("id", { ascending: true });
      if (leg.data && leg.data.length > 0) {
        return { data: leg.data };
      }
    }
    return { data: data || [] };
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
  disclaimerText: string,
  nroSesion: number = 1
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
        nro_sesion: nroSesion,
        disclaimer_text: disclaimerText,
        acknowledged_at: new Date().toISOString(),
      },
      { onConflict: "osi_id,facilitador_id,nro_sesion" }
    );

  if (error) {
    if (error.code === "42703" || error.message.includes("nro_sesion")) {
      const fb = await supabase
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
      if (fb.error) {
        console.error("Error saving acknowledgment fallback:", fb.error);
        return { error: fb.error.message };
      }
      return { success: true };
    }
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
  disclaimerText?: string,
  nroSesion: number = 1
) {
  const session = await getFacilitatorSession();
  if (!session || session.facilitador_id !== facilitadorId) {
    return { error: "No autorizado" };
  }

  const supabase = await createAdminClient();

  if (status === "final") {
    // 1. Mandatory declaration / acknowledgment
    if (!acknowledged) {
      return { error: "Debes confirmar la declaración de veracidad para finalizar el envío." };
    }

    // 2. Mandatory participants list & scores (either manual or OCR)
    if (!Array.isArray(participants) || participants.length === 0) {
      return { error: "Debes registrar al menos un participante con su calificación antes de finalizar." };
    }

    const validParticipants = participants.filter(
      (p) => (p.nombre_apellido || "").trim() && (p.cedula || "").trim(),
    );

    if (validParticipants.length === 0) {
      return { error: "Debes registrar al menos un participante con nombre y cédula antes de finalizar." };
    }

    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const name = (p.nombre_apellido || "").trim();
      const cedula = (p.cedula || "").trim();

      if (name || cedula || (p.score !== null && p.score !== undefined && p.score !== "")) {
        if (!name || name.length < 2) {
          return { error: `El participante en la fila ${i + 1} debe tener nombre y apellido completos.` };
        }
        if (!cedula || cedula.length < 4) {
          return { error: `El participante ${name || `#${i + 1}`} debe tener una cédula válida.` };
        }
        const scoreVal = p.score;
        if (scoreVal === null || scoreVal === undefined || scoreVal === "") {
          return { error: `El participante ${name} no tiene calificación asignada. Todos deben tener nota de 0 a 20.` };
        }
        const numScore = Number(scoreVal);
        if (isNaN(numScore) || numScore < 0 || numScore > 20) {
          return { error: `La calificación de ${name} (${scoreVal}) no es válida. Debe ser un número entre 0 y 20.` };
        }
      }
    }

    // Fetch active assignments for this facilitador
    const { data: assignments } = await supabase
      .from("facilitador_osi_assignments")
      .select("nro_sesion")
      .eq("osi_id", osiId)
      .eq("facilitador_id", facilitadorId)
      .eq("is_active", true);

    const sessionInfo = await getOsiSessionInfo(osiId);

    const { data: osiRow } = await supabase
      .from("v_osi_formato_completo")
      .select("id_servicio, servicio, desglose_recursos_sesiones, sesiones_programadas, sesiones_solped, sesiones_ejecucion")
      .eq("id_osi", osiId)
      .maybeSingle();

    const specificSessions = (assignments || [])
      .map((a) => a.nro_sesion)
      .filter((n): n is number => n !== null);

    const totalSessions = Math.max(
      sessionInfo.totalCount,
      getSessionCount(osiRow || {}),
      ...specificSessions
    );

    // Check if course requires passing grade (if passingGrade === 0, qualification sheet is optional)
    let isParticipationOnly = false;
    if (osiRow?.id_servicio) {
      const { data: curso } = await supabase
        .from("catalogo_servicios")
        .select("nota_aprobatoria")
        .eq("id", osiRow.id_servicio)
        .maybeSingle();
      if (curso && curso.nota_aprobatoria === 0) {
        isParticipationOnly = true;
      }
    }

    // 3. Mandatory attachments for THIS session (nroSesion): asistencia, calificacion, photos
    const { data: attachments, error: attError } = await supabase
      .from("ejecucion_osi_asistencia")
      .select("category, nro_sesion")
      .eq("osi_id", osiId)
      .eq("facilitador_id", facilitadorId);

    if (attError) {
      console.error("[saveParticipants] Error validating attachments:", attError);
      return { error: "Error al verificar los soportes adjuntos del servicio." };
    }

    const attList = attachments || [];
    const forSes =
      totalSessions > 1
        ? attList.filter((a) => a.nro_sesion === nroSesion || (nroSesion === 1 && a.nro_sesion == null))
        : attList.filter((a) => a.nro_sesion === nroSesion || a.nro_sesion == null);
    const hasAsist = forSes.some((a) => a.category === "lista_asistencia");
    const hasCalif = isParticipationOnly || forSes.some((a) => a.category === "hoja_calificacion");
    const hasFotos = forSes.some((a) => a.category === "material_fotografico");

    if (!hasAsist) {
      return { error: `Falta adjuntar la lista de asistencia física firmada para la Sesión ${nroSesion}.` };
    }
    if (!hasCalif) {
      return { error: `Falta adjuntar la hoja de calificación física firmada para la Sesión ${nroSesion}.` };
    }
    if (!hasFotos) {
      return { error: `Falta adjuntar al menos una foto de soporte para la Sesión ${nroSesion}.` };
    }
  }

  // Guard: if this session is already finalized AND has complete attachments, prevent overwriting.
  let sessionFinalCheck = supabase
    .from("ejecucion_osi_participantes")
    .select("id")
    .eq("osi_id", osiId)
    .eq("facilitador_id", facilitadorId)
    .eq("status", "final");

  const { data: existingFinal, error: finalCheckErr } = await sessionFinalCheck.eq("nro_sesion", nroSesion).limit(1);
  let hasFinalForThisSession = false;
  if (finalCheckErr && finalCheckErr.code === "42703") {
    // Column nro_sesion not yet present: fall back to checking without nro_sesion
    const { data: fbFinal } = await supabase
      .from("ejecucion_osi_participantes")
      .select("id")
      .eq("osi_id", osiId)
      .eq("facilitador_id", facilitadorId)
      .eq("status", "final")
      .limit(1);
    hasFinalForThisSession = Boolean(fbFinal && fbFinal.length > 0);
  } else {
    hasFinalForThisSession = Boolean(existingFinal && existingFinal.length > 0);
  }

  if (hasFinalForThisSession) {
    const { data: allAtts } = await supabase
      .from("ejecucion_osi_asistencia")
      .select("category, nro_sesion")
      .eq("osi_id", osiId)
      .eq("facilitador_id", facilitadorId);

    const forSes = (allAtts || []).filter((a) => a.nro_sesion === nroSesion || a.nro_sesion == null);
    const hasAsist = forSes.some((a) => a.category === "lista_asistencia");
    const hasFotos = forSes.some((a) => a.category === "material_fotografico");

    if (hasAsist && hasFotos) {
      return { error: `La Sesión ${nroSesion} ya ha sido finalizada y sus datos no pueden ser modificados.` };
    }
  }

  if (status === "draft") {
    // Clear any premature acknowledgment for this session so draft state is clean
    const { error: delAckErr } = await supabase
      .from("facilitador_acknowledgments")
      .delete()
      .eq("osi_id", osiId)
      .eq("facilitador_id", facilitadorId)
      .eq("nro_sesion", nroSesion);

    if (delAckErr && delAckErr.code === "42703") {
      await supabase
        .from("facilitador_acknowledgments")
        .delete()
        .eq("osi_id", osiId)
        .eq("facilitador_id", facilitadorId);
    }
  }

  // Delete existing ones for this (OSI, Facilitator, nroSesion) to overwrite
  const delQuery = supabase
    .from("ejecucion_osi_participantes")
    .delete()
    .eq("osi_id", osiId)
    .eq("facilitador_id", facilitadorId);

  const { error: deleteError } = await delQuery.eq("nro_sesion", nroSesion);
  if (deleteError && deleteError.code === "42703") {
    // Column nro_sesion does not exist yet: fallback delete
    await supabase
      .from("ejecucion_osi_participantes")
      .delete()
      .eq("osi_id", osiId)
      .eq("facilitador_id", facilitadorId);
  } else if (deleteError) {
    return { error: deleteError.message };
  }

  const recordsWithSession = participants.map((p) => ({
    osi_id: osiId,
    facilitador_id: facilitadorId,
    nro_sesion: nroSesion,
    nombre_apellido: p.nombre_apellido,
    cedula: p.cedula,
    score: p.score != null && p.score !== "" ? Number(p.score) : 0,
    status: status,
  }));

  if (recordsWithSession.length === 0) {
    // Clear acknowledgment if participants are cleared
    const { error: delAckErr } = await supabase
      .from("facilitador_acknowledgments")
      .delete()
      .eq("osi_id", osiId)
      .eq("facilitador_id", facilitadorId)
      .eq("nro_sesion", nroSesion);

    if (delAckErr && delAckErr.code === "42703") {
      await supabase
        .from("facilitador_acknowledgments")
        .delete()
        .eq("osi_id", osiId)
        .eq("facilitador_id", facilitadorId);
    }

    revalidatePath("/portal/facilitador/dashboard");
    return { success: true };
  }

  let { error: insertError } = await supabase
    .from("ejecucion_osi_participantes")
    .insert(recordsWithSession);

  if (insertError && insertError.code === "42703") {
    // Fallback without nro_sesion if column not yet migrated
    const recordsWithoutSession = participants.map((p) => ({
      osi_id: osiId,
      facilitador_id: facilitadorId,
      nombre_apellido: p.nombre_apellido,
      cedula: p.cedula,
      score: p.score != null && p.score !== "" ? Number(p.score) : 0,
      status: status,
    }));
    const fbInsert = await supabase
      .from("ejecucion_osi_participantes")
      .insert(recordsWithoutSession);
    insertError = fbInsert.error;
  }

  if (insertError) {
    return { error: insertError.message };
  }

  // Save acknowledgment audit record on final submission
  if (status === "final" && acknowledged && disclaimerText) {
    const ackResult = await saveAcknowledgment(osiId, facilitadorId, disclaimerText, nroSesion);
    if (ackResult.error) {
      console.error("Failed to save acknowledgment:", ackResult.error);
    }
  }

  // Notify capacitacion users when the facilitador submits the final participant list
  // and auto-mark execution process steps for this session
  if (status === "final") {
    try {
      const now = new Date().toISOString();
      await supabase
        .from("capacitacion_proceso_steps")
        .upsert(
          {
            osi_id: osiId,
            nro_sesion: nroSesion,
            phase: "ejecucion",
            step_key: "nomina_participantes",
            completed: true,
            completed_at: now,
            completed_by: null,
          },
          { onConflict: "osi_id,nro_sesion,phase,step_key" }
        );

      const { data: osiInfo } = await supabase
        .from("v_osi_lista")
        .select("nro_osi")
        .eq("id_osi", osiId)
        .maybeSingle();

      await notifyCapacitacionUsersOfUpload({
        osiId,
        nroOsi: osiInfo?.nro_osi ?? `ID ${osiId}`,
        facilitadorName: session.nombre,
        category: "servicio_finalizado",
      });
    } catch (notifErr) {
      console.error("[saveParticipants] Notification/Step error (non-fatal):", notifErr);
    }
  }

  revalidatePath("/portal/facilitador/dashboard");
  revalidatePath("/dashboard/capacitacion/seguimiento-servicios");
  return { success: true };
}

/**
 * Toggles attachment_received on the facilitador assignment row
 * so the session marks as completed and moves out of "Pendientes" on the dashboard.
 * Does NOT alter participants, files, nor process steps.
 * Allowed in development OR for any OSI that already has certificates generated.
 */
export async function markSessionCompletedDev(
  osiId: number,
  facilitadorId: number,
  nroSesion: number = 1,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createAdminClient();

  if (process.env.NODE_ENV !== "development") {
    // In production, verify that certificates have already been generated for this OSI
    const { data: osiRow } = await supabase
      .from("v_osi_lista")
      .select("nro_osi")
      .eq("id_osi", osiId)
      .maybeSingle();

    const nroInt = parseInt(String(osiRow?.nro_osi || "").replace(/[^\d]/g, ""), 10);
    const { data: certs } = nroInt
      ? await supabase
          .from("certificados")
          .select("id")
          .eq("nro_osi", nroInt)
          .is("motivo_anulacion", null)
          .limit(1)
      : { data: [] };

    if (!certs || certs.length === 0) {
      return {
        success: false,
        error: "Esta acción solo está permitida para servicios que ya tienen certificados emitidos o en entorno de desarrollo.",
      };
    }
  }

  const { data: assignments, error: queryErr } = await supabase
    .from("facilitador_osi_assignments")
    .select("id, attachment_received, nro_sesion, assigned_by, source, is_active")
    .eq("osi_id", osiId)
    .eq("facilitador_id", facilitadorId)
    .eq("is_active", true);

  if (queryErr) {
    return { success: false, error: queryErr.message };
  }

  // 1. If an exact assignment for nroSesion exists, toggle that specific row
  const exactTarget = (assignments || []).find((a) => a.nro_sesion === nroSesion);
  if (exactTarget) {
    const newStatus = !exactTarget.attachment_received;
    const { error: updateErr } = await supabase
      .from("facilitador_osi_assignments")
      .update({
        attachment_received: newStatus,
        attachment_received_at: newStatus ? new Date().toISOString() : null,
      })
      .eq("id", exactTarget.id);

    if (updateErr) return { success: false, error: updateErr.message };

    revalidatePath("/portal/facilitador/dashboard");
    revalidatePath(`/portal/facilitador/osi/${osiId}`);
    return { success: true };
  }

  // 2. If no exact row for nroSesion exists, check for an all-sessions row (nro_sesion === null)
  const allSessionsRow = (assignments || []).find((a) => a.nro_sesion === null);
  if (allSessionsRow) {
    // Determine if this OSI has multiple sessions
    const { data: osiSesRows } = await supabase
      .from("osi_sesion")
      .select("nro_sesion")
      .eq("id_osi", osiId);

    const { data: osiRow } = await supabase
      .from("v_osi_formato_completo")
      .select("sesiones_programadas, sesiones_solped")
      .eq("id_osi", osiId)
      .maybeSingle();

    const totalSessionCount = Math.max(
      osiSesRows?.length || 0,
      osiRow?.sesiones_solped || 0,
      Array.isArray(osiRow?.sesiones_programadas) ? osiRow.sesiones_programadas.length : 0,
      1
    );

    if (totalSessionCount > 1) {
      // Multi-session OSI: split all-sessions assignment into per-session rows so only nroSesion is completed
      const { error: updateErr } = await supabase
        .from("facilitador_osi_assignments")
        .update({
          nro_sesion: nroSesion,
          attachment_received: true,
          attachment_received_at: new Date().toISOString(),
        })
        .eq("id", allSessionsRow.id);

      if (updateErr) return { success: false, error: updateErr.message };

      const otherSessionsToInsert = [];
      for (let s = 1; s <= totalSessionCount; s++) {
        if (s !== nroSesion) {
          otherSessionsToInsert.push({
            osi_id: osiId,
            facilitador_id: facilitadorId,
            nro_sesion: s,
            is_active: true,
            attachment_received: false,
            assigned_by: allSessionsRow.assigned_by,
            source: allSessionsRow.source || "direct",
          });
        }
      }

      if (otherSessionsToInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from("facilitador_osi_assignments")
          .insert(otherSessionsToInsert);

        if (insertErr) return { success: false, error: insertErr.message };
      }
    } else {
      // Single session OSI
      const newStatus = !allSessionsRow.attachment_received;
      const { error: updateErr } = await supabase
        .from("facilitador_osi_assignments")
        .update({
          nro_sesion: 1,
          attachment_received: newStatus,
          attachment_received_at: newStatus ? new Date().toISOString() : null,
        })
        .eq("id", allSessionsRow.id);

      if (updateErr) return { success: false, error: updateErr.message };
    }

    revalidatePath("/portal/facilitador/dashboard");
    revalidatePath(`/portal/facilitador/osi/${osiId}`);
    return { success: true };
  }

  // 3. Fallback: check all assignments (including historical / inactive) for this facilitador and OSI
  const { data: anyAssignments, error: anyErr } = await supabase
    .from("facilitador_osi_assignments")
    .select("id, attachment_received, nro_sesion, is_active, assigned_by, source")
    .eq("osi_id", osiId)
    .eq("facilitador_id", facilitadorId);

  if (anyErr) {
    return { success: false, error: anyErr.message };
  }

  const existingForSession = (anyAssignments || []).find((a) => a.nro_sesion === nroSesion);
  if (existingForSession) {
    const newStatus = !existingForSession.attachment_received;
    const { error: updateErr } = await supabase
      .from("facilitador_osi_assignments")
      .update({
        is_active: true,
        attachment_received: newStatus,
        attachment_received_at: newStatus ? new Date().toISOString() : null,
      })
      .eq("id", existingForSession.id);

    if (updateErr) return { success: false, error: updateErr.message };

    revalidatePath("/portal/facilitador/dashboard");
    revalidatePath(`/portal/facilitador/osi/${osiId}`);
    return { success: true };
  }

  // If facilitator has any assignment for this OSI (e.g. historical all-sessions assignment like Alexander on OSI 3609):
  // create/activate the assignment for this specific session directly
  if (anyAssignments && anyAssignments.length > 0) {
    const template = anyAssignments[0];
    const { error: insertErr } = await supabase
      .from("facilitador_osi_assignments")
      .insert({
        osi_id: osiId,
        facilitador_id: facilitadorId,
        nro_sesion: nroSesion,
        is_active: true,
        attachment_received: true,
        attachment_received_at: new Date().toISOString(),
        assigned_by: template.assigned_by || null,
        source: template.source || "direct",
      });

    if (insertErr) return { success: false, error: insertErr.message };

    revalidatePath("/portal/facilitador/dashboard");
    revalidatePath(`/portal/facilitador/osi/${osiId}`);
    return { success: true };
  }

  return { success: false, error: "No se encontró asignación para este servicio ni en historial." };

  revalidatePath("/portal/facilitador/dashboard");
  revalidatePath(`/portal/facilitador/osi/${osiId}`);
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
  formData: FormData,
  category: string = "lista_asistencia",
  nroSesion?: number,
): Promise<{ success?: boolean; data?: OSIAttachment; error?: string }> {
  console.log("[uploadOSIAttachment] ENTRY", { osiId, facilitadorId, category, nroSesion });

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

  // Max file size: 10MB — reject before any processing to save storage and bandwidth
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return { error: `El archivo excede el tamaño máximo de 10MB (tamaño actual: ${(file.size / 1024 / 1024).toFixed(1)}MB)` };
  }

  try {
    const bytes = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(bytes);
    let finalFileType = file.type;
    console.log("[uploadOSIAttachment] Buffer created, size:", buffer.length, "type:", finalFileType);

    // Category-aware optimization: documents need higher resolution for legibility,
    // photos (material_fotografico) can be smaller to save storage.
    const isPhotoCategory = category === "material_fotografico";
    const imageOpts = isPhotoCategory
      ? { maxWidth: 1200, maxHeight: 1200, quality: 70 }
      : { maxWidth: 2000, maxHeight: 2000, quality: 80 };

    // Optimize images (including HEIC / HEIF, JPG, PNG, WebP)
    const isImage =
      file.type.startsWith("image/") ||
      file.name.match(/\.(jpe?g|png|webp|heic|heif)$/i) ||
      isHeicBuffer(buffer);

    if (isImage) {
      const originalSize = buffer.length;
      buffer = await optimizeDocumentImage(buffer, imageOpts) as Buffer;
      finalFileType = "image/jpeg"; // Always output optimized as JPEG
      console.log("[uploadOSIAttachment] After optimizeDocumentImage:", { originalSize, optimizedSize: buffer.length, type: finalFileType, category });
    }

    // Rasterize PDFs to JPEG to save storage (best-effort — falls back to original if sharp can't process)
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const originalSize = buffer.length;
      const pdfImage = await optimizePdfToImage(buffer, { maxWidth: 1500, maxHeight: 2000, quality: 70 });
      if (pdfImage) {
        buffer = pdfImage;
        finalFileType = "image/jpeg";
        console.log("[uploadOSIAttachment] PDF rasterized to JPEG:", { originalSize, optimizedSize: buffer.length });
      } else {
        console.log("[uploadOSIAttachment] PDF rasterization unavailable, storing original PDF");
      }
    }

    // Generate path: osi_id/facilitador_id/timestamp_random_filename
    // Use random suffix to avoid path collisions (upsert: false means collisions error)
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString("hex");
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const ext = finalFileType === "image/jpeg" ? ".jpg" : "";
    const baseName = sanitizedName.replace(/\.[^.]+$/, "");
    const storagePath = `${osiId}/${facilitadorId}/${timestamp}_${randomSuffix}_${baseName}${ext}`;
    console.log("[uploadOSIAttachment] Storage path:", storagePath);

    // 1. Upload to Supabase Storage (upsert: false — don't silently overwrite existing files)
    const { data: storageData, error: storageError } = await supabase.storage
      .from("facilitador-uploads")
      .upload(storagePath, buffer, {
        contentType: finalFileType,
        upsert: false,
      });

    console.log("[uploadOSIAttachment] Storage upload result:", { error: storageError ? { message: storageError.message, name: storageError.name } : "none", data: storageData ? { path: storageData.path, id: storageData.id } : "null" });

    if (storageError) throw storageError;

    // 2. Insert into metadata table
    const storedFileName =
      finalFileType === "image/jpeg" && file.name.match(/\.hei[cf]$/i)
        ? file.name.replace(/\.hei[cf]$/i, ".jpg")
        : file.name;

    const insertPayload: Record<string, unknown> = {
      osi_id: osiId,
      facilitador_id: facilitadorId,
      storage_path: storagePath,
      file_name: storedFileName,
      file_type: finalFileType,
      file_size: buffer.length,
      category,
      nro_sesion: nroSesion ?? 1,
    };

    const { data, error: dbError } = await supabase
      .from("ejecucion_osi_asistencia")
      .insert(insertPayload)
      .select()
      .single();

    console.log("[uploadOSIAttachment] DB insert result:", { error: dbError ? { message: dbError.message, code: dbError.code, details: dbError.details } : "none", data: data ? { id: data.id, file_name: data.file_name, storage_path: data.storage_path } : "NULL" });

    if (dbError) {
      // Cleanup storage if DB fails
      await supabase.storage.from("facilitador-uploads").remove([storagePath]);
      throw dbError;
    }

    // Auto-mark the corresponding ejecucion process step as completed
    // Maps upload category → process step key
    const CATEGORY_TO_STEP: Record<string, string> = {
      lista_asistencia: "lista_asistencia",
      hoja_calificacion: "calificacion",
      material_fotografico: "material_fotografico",
    };
    const stepKey = CATEGORY_TO_STEP[category];
    const sessionForStep = nroSesion ?? 1;
    console.log("[uploadOSIAttachment] Auto-mark check:", { category, stepKey, sessionForStep, nroSesion });
    if (stepKey) {
      try {
        const now = new Date().toISOString();
        const { error: stepError } = await supabase
          .from("capacitacion_proceso_steps")
          .upsert(
            {
              osi_id: osiId,
              nro_sesion: sessionForStep,
              phase: "ejecucion",
              step_key: stepKey,
              completed: true,
              completed_at: now,
              completed_by: null, // system auto-mark (null distinguishes from user toggles)
            },
            { onConflict: "osi_id,nro_sesion,phase,step_key" },
          );

        if (stepError) {
          console.error("[uploadOSIAttachment] Step upsert error:", stepError);
        } else {
          console.log("[uploadOSIAttachment] ✅ Auto-marked step for session:", { stepKey, sessionForStep, osiId });

          // Guard clause: uploaded attachment proves execution took place FOR THIS SESSION ONLY.
          // Never auto-mark other/future sessions as ejecutado.
          await supabase
            .from("capacitacion_proceso_steps")
            .upsert(
              {
                osi_id: osiId,
                nro_sesion: sessionForStep,
                phase: "ejecucion",
                step_key: "en_proceso",
                completed: true,
                completed_at: now,
                completed_by: null,
              },
              { onConflict: "osi_id,nro_sesion,phase,step_key" },
            );

          await syncOsiEjecutadoToShell(osiId, sessionForStep, true).catch((err) =>
            console.error("[uploadOSIAttachment] syncOsiEjecutadoToShell error:", err),
          );
        }
      } catch (stepErr) {
        // Non-fatal: the upload succeeded, step marking is a bonus
        console.error("[uploadOSIAttachment] Failed to auto-mark step:", stepErr);
      }
    }

    // Always revalidate the seguimiento-servicios page so any auto-marked step is visible
    revalidatePath("/dashboard/capacitacion/seguimiento-servicios");

    // Notify capacitacion users that a facilitador uploaded documentation
    // Fire-and-forget — don't block the upload on notification errors
    try {
      const { data: osiInfo } = await supabase
        .from("v_osi_lista")
        .select("nro_osi")
        .eq("id_osi", osiId)
        .maybeSingle();

      await notifyCapacitacionUsersOfUpload({
        osiId,
        nroOsi: osiInfo?.nro_osi ?? `ID ${osiId}`,
        facilitadorName: session.nombre,
        category,
        nroSesion,
      });
    } catch (notifErr) {
      console.error("[uploadOSIAttachment] Notification error (non-fatal):", notifErr);
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
export async function getOSIAttachments(osiId: number, facilitadorId?: number, category?: string, nroSesion?: number): Promise<{ data?: OSIAttachment[]; error?: string }> {
  console.log("[getOSIAttachments] ENTRY", { osiId, facilitadorId, category, nroSesion });

  const supabase = await createAdminClient();

  let query = supabase
    .from("ejecucion_osi_asistencia")
    .select("*")
    .eq("osi_id", osiId);

  if (facilitadorId) {
    query = query.eq("facilitador_id", facilitadorId);
  }

  if (category) {
    query = query.eq("category", category);
  }

  if (nroSesion != null) {
    // Include uploads for the specific session AND legacy uploads where nro_sesion is null
    query = query.or(`nro_sesion.eq.${nroSesion},nro_sesion.is.null`);
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
      .select("facilitador_id, osi_id")
      .eq("id", id)
      .single();

    if (!att || att.facilitador_id !== session.facilitador_id) {
      return { error: "No autorizado" };
    }

    // Guard: if OSI is already finalized, prevent deletion
    if (att.osi_id) {
      const { data: finalParts } = await supabase
        .from("ejecucion_osi_participantes")
        .select("id")
        .eq("osi_id", att.osi_id)
        .eq("status", "final")
        .limit(1);

      if (finalParts && finalParts.length > 0) {
        return { error: "No se pueden eliminar archivos de un servicio que ya ha sido finalizado." };
      }
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

/**
 * Get all facilitador portal credentials with facilitador profile info.
 * Used by the "Asignaciones y Credenciales" management page.
 */
export async function getAllFacilitatorCredentials() {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("facilitador_credenciales")
    .select(`
      id,
      facilitador_id,
      username,
      is_active,
      created_at,
      updated_at,
      facilitadores (
        id,
        nombre_apellido,
        cedula,
        email,
        is_active
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all facilitator credentials:", error);
    return { error: error.message };
  }

  return { data: data || [] };
}

/**
 * Toggle the is_active flag on a facilitador's portal credentials without
 * deleting them. Useful for temporarily suspending portal access.
 */
export async function toggleFacilitatorCredentialsActive(
  facilitadorId: number,
  isActive: boolean,
) {
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("facilitador_credenciales")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("facilitador_id", facilitadorId);

  if (error) {
    console.error("Error toggling facilitator credentials active state:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/capacitacion/gestion-asignaciones");
  revalidatePath("/dashboard/capacitacion/gestion-de-facilitadores");

  return { success: true };
}

/**
 * Reopen a prematurely finalized OSI so the facilitador can continue editing
 * and uploading pending session attachments.
 */
export async function reopenOSIForFacilitador(osiId: number) {
  const supabase = await createAdminClient();

  // Revert participant status to draft
  const { error: partError } = await supabase
    .from("ejecucion_osi_participantes")
    .update({ status: "draft" })
    .eq("osi_id", osiId);

  if (partError) {
    console.error("[reopenOSIForFacilitador] Error reverting status:", partError);
    return { error: partError.message };
  }

  // Remove acknowledgment audit record
  await supabase
    .from("facilitador_acknowledgments")
    .delete()
    .eq("osi_id", osiId);

  revalidatePath(`/portal/facilitador/osi/${osiId}`);
  revalidatePath("/portal/facilitador/dashboard");
  revalidatePath("/dashboard/capacitacion/seguimiento-servicios");

  return { success: true };
}

