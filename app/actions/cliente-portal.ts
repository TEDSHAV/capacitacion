"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { signSession, verifySession } from "@/lib/session-signing";
import {
  getClientIp,
  checkLoginRateLimit,
  recordLoginFailure,
  clearLoginFailures,
} from "@/lib/login-rate-limiter";
import { hashPassword, verifyPassword, isBcryptHash } from "@/lib/password-hashing";
import type {
  ClienteCredential,
  ClienteSession,
  ClienteCertificateFilters,
  ClienteMetrics,
  ClienteBatchSummary,
  ClienteCertificateRow,
  ClienteCarnetRow,
  ClienteFilterOptions,
  EmpresaLogo,
  HiddenBatchSummary,
} from "@/types";

// ─── Auth Helpers ───

// Legacy SHA-256 hash for verifying old (unmigrated) credentials
function legacySha256Hash(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// ─── Credential Management (Admin) ───

export async function createClienteCredentials(
  empresaId: number,
  username: string,
  password: string,
  displayName?: string,
  cityId?: number | null,
  sedeIds?: number[] | null,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createAdminClient();
  const passwordHash = await hashPassword(password);

  const { data, error } = await supabase
    .from("cliente_credenciales")
    .insert({
      empresa_id: empresaId,
      username,
      password_hash: passwordHash,
      display_name: displayName || null,
      is_active: true,
      updated_at: new Date().toISOString(),
      id_ciudad: cityId || null,
      id_sede: sedeIds && sedeIds.length > 0 ? sedeIds : null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating cliente credentials:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/capacitacion");
  return { success: true };
}

export async function getClienteCredentials(
  empresaId: number,
): Promise<{ data?: ClienteCredential[]; error?: string }> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("cliente_credenciales")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching cliente credentials:", error);
    return { error: error.message };
  }

  return { data: (data as ClienteCredential[]) || [] };
}

export async function updateClienteCredentials(
  credentialId: number,
  updates: {
    username?: string;
    password?: string;
    display_name?: string;
    is_active?: boolean;
    sedeIds?: number[] | null;
    cityId?: number | null;
  },
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createAdminClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.username !== undefined) updateData.username = updates.username;
  if (updates.display_name !== undefined)
    updateData.display_name = updates.display_name;
  if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
  if (updates.password) {
    updateData.password_hash = await hashPassword(updates.password);
  }
  if (updates.sedeIds !== undefined) {
    updateData.id_sede = updates.sedeIds && updates.sedeIds.length > 0 ? updates.sedeIds : null;
  }
  if (updates.cityId !== undefined) {
    updateData.id_ciudad = updates.cityId || null;
  }

  const { error } = await supabase
    .from("cliente_credenciales")
    .update(updateData)
    .eq("id", credentialId);

  if (error) {
    console.error("Error updating cliente credentials:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/capacitacion");
  return { success: true };
}

export async function deleteClienteCredentials(
  credentialId: number,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("cliente_credenciales")
    .delete()
    .eq("id", credentialId);

  if (error) {
    console.error("Error deleting cliente credentials:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/capacitacion");
  return { success: true };
}

export async function getClienteCompanies(): Promise<{
  data?: { id: number; razon_social: string; rif: string; es_cliente: boolean }[];
  error?: string;
}> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("empresas")
    .select("id, razon_social, rif, es_cliente")
    .eq("es_cliente", true)
    .order("razon_social", { ascending: true });

  if (error) {
    console.error("Error fetching cliente companies:", error);
    return { error: error.message };
  }

  return { data: data || [] };
}

// ─── Portal Auth ───

export async function loginCliente(
  username: string,
  password: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createAdminClient();

  // Rate limiting: check before hitting the DB
  const ip = await getClientIp();
  const rateLimit = await checkLoginRateLimit(ip, username);
  if (!rateLimit.allowed) {
    const minutes = Math.ceil(rateLimit.retryAfterMs / 60000);
    return {
      error: `Demasiados intentos fallidos. Intenta de nuevo en ${minutes} minuto(s).`,
    };
  }

  // Fetch credentials by username only (bcrypt hashes are non-deterministic)
  const { data: creds, error: credError } = await supabase
    .from("cliente_credenciales")
    .select("*, empresas(razon_social, empresa_logos(logo_url))")
    .eq("username", username)
    .eq("is_active", true)
    .maybeSingle();

  if (credError) {
    console.error("[Cliente Portal Login] Database error:", credError);
    return { error: "Error al verificar credenciales" };
  }

  if (!creds) {
    await recordLoginFailure(ip, username);
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
      await supabase
        .from("cliente_credenciales")
        .update({ password_hash: newBcryptHash, updated_at: new Date().toISOString() })
        .eq("id", creds.id)
        .eq("password_hash", storedHash);
    }
  }

  if (!passwordValid) {
    await recordLoginFailure(ip, username);
    return { error: "Credenciales inválidas o cuenta inactiva" };
  }

  // Clear rate-limit counter on successful login
  await clearLoginFailures(ip, username);

  const sessionData: ClienteSession = {
    id: creds.id,
    empresa_id: creds.empresa_id,
    empresa_nombre: creds.empresas?.razon_social || "Empresa",
    username: creds.username,
    display_name: creds.display_name,
    id_ciudad: creds.id_ciudad ?? null,
    id_sede: creds.id_sede ?? null,
    logo_url: creds.empresas?.empresa_logos?.logo_url ?? null,
  };

  const cookieStore = await cookies();
  cookieStore.set("cliente_session", signSession(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_COOKIE_SECURE !== "false",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days — persist until explicit logout
    path: "/",
  });

  return { success: true };
}

export async function getClienteSession(): Promise<ClienteSession | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("cliente_session");
  if (!session) return null;
  const verified = verifySession<ClienteSession>(session.value);
  // Sliding refresh: re-set the cookie with a fresh maxAge on each
  // successful session check so active users never get logged out.
  if (verified) {
    cookieStore.set("cliente_session", session.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_COOKIE_SECURE !== "false",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days from now
      path: "/",
    });
  }
  return verified;
}

export async function logoutCliente(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete("cliente_session");
  return { success: true };
}

// ─── Data Actions ───

async function verifyClienteEmpresa(empresaId: number): Promise<boolean> {
  const session = await getClienteSession();
  return !!session && session.empresa_id === empresaId;
}

async function getSessionCityId(): Promise<number | null> {
  const session = await getClienteSession();
  return session?.id_ciudad ?? null;
}

async function getSessionSedeIds(): Promise<number[] | null> {
  const session = await getClienteSession();
  return session?.id_sede ?? null;
}

// ─── OSI visibility ("Ocultar para cliente") ───

// Cached per request: the set of nro_osi_secuencial values that are explicitly
// marked VISIBLE for the cliente portal. With the inverted logic, OSIs are
// hidden by default (no row = hidden); staff must explicitly toggle them to
// visible (oculto=false) for clients to see them.
// Uses the admin client to bypass any RLS on the control table.
const getVisibleOsiIds = cache(async (): Promise<Set<number>> => {
  try {
    const supabase = await createAdminClient();
    // Join with ejecucion_osi to get nro_osi_secuencial, which is what
    // certificados.nro_osi and carnets.id_osi actually reference.
    const { data, error } = await supabase
      .from("osi_visibilidad_cliente")
      .select("osi_id, ejecucion_osi(nro_osi_secuencial)")
      .eq("oculto", false);
    if (error) {
      console.error("[getVisibleOsiIds] Error:", JSON.stringify(error));
      return new Set();
    }
    const ids = new Set<number>();
    for (const r of data || []) {
      const osiRow = r.ejecucion_osi as unknown as { nro_osi_secuencial: string } | null;
      if (osiRow?.nro_osi_secuencial) {
        const nro = parseInt(osiRow.nro_osi_secuencial, 10);
        if (!isNaN(nro)) ids.add(nro);
      }
    }
    return ids;
  } catch (err) {
    console.error("[getVisibleOsiIds] Unexpected error:", err);
    return new Set();
  }
});

// Single-OSI check used by the batch-download API routes.
// With inverted logic: hidden by default, visible only if explicitly marked.
export async function isOsiHiddenForCliente(osiId: number): Promise<boolean> {
  if (!Number.isFinite(osiId) || osiId <= 0) return true;
  const visible = await getVisibleOsiIds();
  return !visible.has(osiId);
}

export async function getClienteCertificates(
  empresaId: number,
  filters: ClienteCertificateFilters,
  page: number = 1,
  itemsPerPage: number = 10,
): Promise<{ data?: ClienteCertificateRow[]; totalCount?: number; error?: string }> {
  if (!(await verifyClienteEmpresa(empresaId))) {
    return { error: "No autorizado" };
  }
  const sessionCityId = await getSessionCityId();
  const sessionSedeIds = await getSessionSedeIds();
  const supabase = await createClient();
  const visibleOsiIds = await getVisibleOsiIds();
  const visibleArr = [...visibleOsiIds];
  if (visibleArr.length === 0) return { data: [], totalCount: 0 };

  // When filtering by OSI number, query directly since the RPC doesn't support nro_osi
  if (filters.nroOsi) {
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase
      .from("certificados")
      .select(
        `id, fecha_emision, fecha_vencimiento, is_active, calificacion, nro_osi, snapshot_contenido,
         participantes_certificados!inner(nombre, cedula, nacionalidad),
         catalogo_servicios!left(id, nombre, emite_carnet),
         cat_estados_venezuela!left(id, nombre_estado),
         cat_ciudades!left(id, nombre_ciudad),
         empresas!inner(razon_social)`,
        { count: "exact" },
      )
      .eq("id_empresa", empresaId)
      .eq("is_active", true)
      .eq("nro_osi", filters.nroOsi);

    // Only include OSIs visible to the cliente portal
    if (visibleArr.length > 0) query = query.in("nro_osi", visibleArr);

    if (sessionSedeIds && sessionSedeIds.length > 0) query = query.in("id_sede", sessionSedeIds);
    else if (sessionCityId) query = query.eq("id_ciudad", sessionCityId);
    if (filters.sedeId) query = query.eq("id_sede", filters.sedeId);

    if (filters.searchTerm) {
      query = query.or(
        `nombre.ilike.%${filters.searchTerm}%,cedula.ilike.%${filters.searchTerm}%`,
        { referencedTable: "participantes_certificados" },
      );
    }

    if (filters.courseId) query = query.eq("id_curso", filters.courseId);
    if (filters.stateId) query = query.eq("id_estado", filters.stateId);
    if (filters.dateFrom) query = query.gte("fecha_emision", filters.dateFrom);
    if (filters.dateTo) query = query.lte("fecha_emision", filters.dateTo);

    query = query.order("fecha_emision", { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching cliente certificates by OSI:", error);
      return { error: error.message };
    }

    const rows: ClienteCertificateRow[] = (data || []).map((row: Record<string, unknown>) => {
      const participant = row.participantes_certificados as Record<string, string>;
      const course = row.catalogo_servicios as Record<string, unknown> | null;
      const state = row.cat_estados_venezuela as Record<string, unknown> | null;
      const city = row.cat_ciudades as Record<string, unknown> | null;
      const company = row.empresas as Record<string, string>;

      // Fallback: extract course name from snapshot if catalogo_servicios is null
      let courseNombre = (course?.nombre as string) || "";
      if (!courseNombre && row.snapshot_contenido) {
        try {
          const snapshot = typeof row.snapshot_contenido === "string"
            ? JSON.parse(row.snapshot_contenido)
            : row.snapshot_contenido;
          courseNombre = snapshot?.certificado_detalles?.title || snapshot?.curso?.name || "";
        } catch {
          // ignore parse errors
        }
      }

      return {
        id: row.id as number,
        participant_nombre: participant?.nombre || "",
        participant_cedula: participant?.cedula || "",
        participant_nacionalidad: participant?.nacionalidad || "V",
        course_nombre: courseNombre,
        course_id: (course?.id as number) || 0,
        course_emite_carnet: (course?.emite_carnet as boolean) || false,
        fecha_emision: (row.fecha_emision as string) || "",
        fecha_vencimiento: (row.fecha_vencimiento as string) || "",
        is_active: (row.is_active as boolean) || false,
        nro_osi: (row.nro_osi as number) || 0,
        state_nombre_estado: (state?.nombre_estado as string) || "",
        state_id: (state?.id as number) || 0,
        city_nombre_ciudad: (city?.nombre_ciudad as string) || "",
        company_razon_social: (company?.razon_social as string) || "",
        calificacion: (row.calificacion as number) || 0,
        total_count: count || 0,
      };
    });

    return { data: rows, totalCount: count || 0 };
  }

  // When multiple sedes are assigned and no specific sede filter is selected,
  // use a direct query instead of the RPC (which only accepts a single sede ID)
  if (!filters.sedeId && sessionSedeIds && sessionSedeIds.length > 1) {
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase
      .from("certificados")
      .select(
        `id, fecha_emision, fecha_vencimiento, is_active, calificacion, nro_osi, snapshot_contenido,
         participantes_certificados!inner(nombre, cedula, nacionalidad),
         catalogo_servicios!left(id, nombre, emite_carnet),
         cat_estados_venezuela!left(id, nombre_estado),
         cat_ciudades!left(id, nombre_ciudad),
         empresas!inner(razon_social)`,
        { count: "exact" },
      )
      .eq("id_empresa", empresaId)
      .eq("is_active", true)
      .in("id_sede", sessionSedeIds);

    // Only include OSIs visible to the cliente portal
    if (visibleArr.length > 0) query = query.in("nro_osi", visibleArr);

    if (filters.searchTerm) {
      query = query.or(
        `nombre.ilike.%${filters.searchTerm}%,cedula.ilike.%${filters.searchTerm}%`,
        { referencedTable: "participantes_certificados" },
      );
    }
    if (filters.courseId) query = query.eq("id_curso", filters.courseId);
    if (filters.stateId) query = query.eq("id_estado", filters.stateId);
    if (filters.dateFrom) query = query.gte("fecha_emision", filters.dateFrom);
    if (filters.dateTo) query = query.lte("fecha_emision", filters.dateTo);

    query = query.order("fecha_emision", { ascending: false }).range(from, to);

    const { data: directData, error: directError, count: directCount } = await query;

    if (directError) {
      console.error("Error fetching cliente certificates (multi-sede):", directError);
      return { error: directError.message };
    }

    const directRows: ClienteCertificateRow[] = (directData || []).map((row: Record<string, unknown>) => {
      const participant = row.participantes_certificados as Record<string, string>;
      const course = row.catalogo_servicios as Record<string, unknown> | null;
      const state = row.cat_estados_venezuela as Record<string, unknown> | null;
      const city = row.cat_ciudades as Record<string, unknown> | null;
      const company = row.empresas as Record<string, string>;

      let courseNombre = (course?.nombre as string) || "";
      if (!courseNombre && row.snapshot_contenido) {
        try {
          const snapshot = typeof row.snapshot_contenido === "string"
            ? JSON.parse(row.snapshot_contenido)
            : row.snapshot_contenido;
          courseNombre = snapshot?.certificado_detalles?.title || snapshot?.curso?.name || "";
        } catch {
          // ignore parse errors
        }
      }

      return {
        id: row.id as number,
        participant_nombre: participant?.nombre || "",
        participant_cedula: participant?.cedula || "",
        participant_nacionalidad: participant?.nacionalidad || "V",
        course_nombre: courseNombre,
        course_id: (course?.id as number) || 0,
        course_emite_carnet: (course?.emite_carnet as boolean) || false,
        fecha_emision: (row.fecha_emision as string) || "",
        fecha_vencimiento: (row.fecha_vencimiento as string) || "",
        is_active: (row.is_active as boolean) || false,
        nro_osi: (row.nro_osi as number) || 0,
        state_nombre_estado: (state?.nombre_estado as string) || "",
        state_id: (state?.id as number) || 0,
        city_nombre_ciudad: (city?.nombre_ciudad as string) || "",
        company_razon_social: (company?.razon_social as string) || "",
        calificacion: (row.calificacion as number) || 0,
        total_count: directCount || 0,
      };
    });

    return { data: directRows, totalCount: directCount || 0 };
  }

  // Direct query path: always filter to visible OSIs only (the RPC can't
  // restrict to a specific set of nro_osi values, so we use a direct query).
  const from = (page - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  let query = supabase
    .from("certificados")
    .select(
      `id, fecha_emision, fecha_vencimiento, is_active, calificacion, nro_osi, snapshot_contenido,
       participantes_certificados!inner(nombre, cedula, nacionalidad),
       catalogo_servicios!left(id, nombre, emite_carnet),
       cat_estados_venezuela!left(id, nombre_estado),
       cat_ciudades!left(id, nombre_ciudad),
       empresas!inner(razon_social)`,
      { count: "exact" },
    )
    .eq("id_empresa", empresaId)
    .eq("is_active", true)
    .in("nro_osi", visibleArr);

  if (filters.sedeId) query = query.eq("id_sede", filters.sedeId);
  else if (sessionSedeIds && sessionSedeIds.length === 1) query = query.eq("id_sede", sessionSedeIds[0]);
  else if (sessionSedeIds && sessionSedeIds.length > 1) query = query.in("id_sede", sessionSedeIds);
  else if (sessionCityId) query = query.eq("id_ciudad", sessionCityId);

  if (filters.searchTerm) {
    query = query.or(
      `nombre.ilike.%${filters.searchTerm}%,cedula.ilike.%${filters.searchTerm}%`,
      { referencedTable: "participantes_certificados" },
    );
  }
  if (filters.courseId) query = query.eq("id_curso", filters.courseId);
  if (filters.stateId) query = query.eq("id_estado", filters.stateId);
  if (filters.dateFrom) query = query.gte("fecha_emision", filters.dateFrom);
  if (filters.dateTo) query = query.lte("fecha_emision", filters.dateTo);

  query = query.order("fecha_emision", { ascending: false }).range(from, to);

  const { data: directData, error: directError, count: directCount } = await query;

  if (directError) {
    console.error("Error fetching cliente certificates (visible-only):", directError);
    return { error: directError.message };
  }

  const directRows: ClienteCertificateRow[] = (directData || []).map((row: Record<string, unknown>) => {
    const participant = row.participantes_certificados as Record<string, string>;
    const course = row.catalogo_servicios as Record<string, unknown> | null;
    const state = row.cat_estados_venezuela as Record<string, unknown> | null;
    const city = row.cat_ciudades as Record<string, unknown> | null;
    const company = row.empresas as Record<string, string>;

    let courseNombre = (course?.nombre as string) || "";
    if (!courseNombre && row.snapshot_contenido) {
      try {
        const snapshot = typeof row.snapshot_contenido === "string"
          ? JSON.parse(row.snapshot_contenido)
          : row.snapshot_contenido;
        courseNombre = snapshot?.certificado_detalles?.title || snapshot?.curso?.name || "";
      } catch {
        // ignore parse errors
      }
    }

    return {
      id: row.id as number,
      participant_nombre: participant?.nombre || "",
      participant_cedula: participant?.cedula || "",
      participant_nacionalidad: participant?.nacionalidad || "V",
      course_nombre: courseNombre,
      course_id: (course?.id as number) || 0,
      course_emite_carnet: (course?.emite_carnet as boolean) || false,
      fecha_emision: (row.fecha_emision as string) || "",
      fecha_vencimiento: (row.fecha_vencimiento as string) || "",
      is_active: (row.is_active as boolean) || false,
      nro_osi: (row.nro_osi as number) || 0,
      state_nombre_estado: (state?.nombre_estado as string) || "",
      state_id: (state?.id as number) || 0,
      city_nombre_ciudad: (city?.nombre_ciudad as string) || "",
      company_razon_social: (company?.razon_social as string) || "",
      calificacion: (row.calificacion as number) || 0,
      total_count: directCount || 0,
    };
  });

  return { data: directRows, totalCount: directCount || 0 };
}

export async function getClienteCarnets(
  empresaId: number,
  filters: ClienteCertificateFilters,
  page: number = 1,
  itemsPerPage: number = 10,
): Promise<{ data?: ClienteCarnetRow[]; totalCount?: number; error?: string }> {
  if (!(await verifyClienteEmpresa(empresaId))) {
    return { error: "No autorizado" };
  }
  const sessionCityId = await getSessionCityId();
  const sessionSedeIds = await getSessionSedeIds();
  const supabase = await createClient();
  const visibleOsiIds = await getVisibleOsiIds();
  const visibleArr = [...visibleOsiIds];
  if (visibleArr.length === 0) return { data: [], totalCount: 0 };

  const from = (page - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  let query = supabase
    .from("carnets")
    .select(
      `id, nombre_participante, cedula_participante, titulo_curso, 
       fecha_emision, fecha_vencimiento, is_active, id_empresa, 
       id_certificado, id_osi,
       certificados!inner(id_estado, fecha_emision, nro_osi, id_ciudad, id_sede)`,
      { count: "exact" },
    )
    .eq("id_empresa", empresaId)
    .eq("is_active", true);

  // Only include OSIs visible to the cliente portal
  if (visibleArr.length > 0) query = query.in("id_osi", visibleArr);

  if (sessionSedeIds && sessionSedeIds.length > 0) {
    query = query.in("certificados.id_sede", sessionSedeIds);
  } else if (sessionCityId) {
    query = query.eq("certificados.id_ciudad", sessionCityId);
  }

  if (filters.nroOsi) {
    query = query.eq("id_osi", filters.nroOsi);
  }

  if (filters.searchTerm) {
    query = query.or(
      `nombre_participante.ilike.%${filters.searchTerm}%,cedula_participante.ilike.%${filters.searchTerm}%`,
    );
  }

  if (filters.dateFrom) {
    query = query.gte("fecha_emision", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("fecha_emision", filters.dateTo);
  }

  query = query
    .order("fecha_emision", { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching cliente carnets:", error);
    return { error: error.message };
  }

  return { data: (data as ClienteCarnetRow[]) || [], totalCount: count || 0 };
}

export async function getClienteMetrics(
  empresaId: number,
): Promise<{ data?: ClienteMetrics; error?: string }> {
  if (!(await verifyClienteEmpresa(empresaId))) {
    return { error: "No autorizado" };
  }
  const sessionCityId = await getSessionCityId();
  const sessionSedeIds = await getSessionSedeIds();
  const supabase = await createClient();
  const visibleOsiIds = await getVisibleOsiIds();
  const visibleArr = [...visibleOsiIds];
  if (visibleArr.length === 0) return { data: { totalCertificates: 0, totalCarnets: 0, totalParticipants: 0, courseWithMostParticipants: null, certificatesByCourse: [] } };

  // Count total certificates for this company
  let certCountQuery = supabase
    .from("certificados")
    .select("id", { count: "exact", head: true })
    .eq("id_empresa", empresaId)
    .eq("is_active", true);
  if (visibleArr.length > 0) certCountQuery = certCountQuery.in("nro_osi", visibleArr);
  if (sessionSedeIds && sessionSedeIds.length > 0) certCountQuery = certCountQuery.in("id_sede", sessionSedeIds);
  else if (sessionCityId) certCountQuery = certCountQuery.eq("id_ciudad", sessionCityId);
  const { count: certCount, error: certError } = await certCountQuery;

  if (certError) {
    console.error("Error counting certificates:", certError);
  }

  // Count carnets for this company (filter by city via certificados join)
  let carnetCountQuery = supabase
    .from("carnets")
    .select(
      (sessionSedeIds && sessionSedeIds.length > 0 || sessionCityId)
        ? "id, certificados!inner(id_ciudad, id_sede)"
        : "id",
      { count: "exact", head: true },
    )
    .eq("id_empresa", empresaId)
    .eq("is_active", true);
  if (visibleArr.length > 0) carnetCountQuery = carnetCountQuery.in("id_osi", visibleArr);
  if (sessionSedeIds && sessionSedeIds.length > 0) {
    carnetCountQuery = carnetCountQuery.in("certificados.id_sede", sessionSedeIds);
  } else if (sessionCityId) {
    carnetCountQuery = carnetCountQuery.eq("certificados.id_ciudad", sessionCityId);
  }
  const { count: carnetCount, error: carnetError } = await carnetCountQuery;

  if (carnetError) {
    console.error("Error counting carnets:", carnetError);
  }

  // Count unique participants from certificates
  let participantCountQuery = supabase
    .from("certificados")
    .select("id_participante", { count: "exact", head: true })
    .eq("id_empresa", empresaId)
    .eq("is_active", true);
  if (visibleArr.length > 0) participantCountQuery = participantCountQuery.in("nro_osi", visibleArr);
  if (sessionSedeIds && sessionSedeIds.length > 0) participantCountQuery = participantCountQuery.in("id_sede", sessionSedeIds);
  else if (sessionCityId) participantCountQuery = participantCountQuery.eq("id_ciudad", sessionCityId);
  const { count: participantCount, error: participantError } =
    await participantCountQuery;

  if (participantError) {
    console.error("Error counting participants:", participantError);
  }

  // Get certificates by course for "course with most participants"
  let byCourseQuery = supabase
    .from("certificados")
    .select(
      `id_curso, catalogo_servicios!inner(id, nombre)`,
    )
    .eq("id_empresa", empresaId)
    .eq("is_active", true);
  if (visibleArr.length > 0) byCourseQuery = byCourseQuery.in("nro_osi", visibleArr);
  if (sessionSedeIds && sessionSedeIds.length > 0) byCourseQuery = byCourseQuery.in("id_sede", sessionSedeIds);
  else if (sessionCityId) byCourseQuery = byCourseQuery.eq("id_ciudad", sessionCityId);
  const { data: byCourseData, error: byCourseError } = await byCourseQuery;

  const courseMap = new Map<number, { name: string; count: number }>();
  if (!byCourseError && byCourseData) {
    for (const row of byCourseData) {
      const courseInfo = row.catalogo_servicios as unknown as {
        id: number;
        nombre: string;
      };
      if (courseInfo) {
        const existing = courseMap.get(courseInfo.id);
        if (existing) {
          existing.count++;
        } else {
          courseMap.set(courseInfo.id, { name: courseInfo.nombre, count: 1 });
        }
      }
    }
  }

  let courseWithMost: {
    courseId: number;
    courseName: string;
    count: number;
  } | null = null;
  const certificatesByCourse: {
    courseId: number;
    courseName: string;
    count: number;
  }[] = [];

  for (const [courseId, info] of courseMap) {
    certificatesByCourse.push({
      courseId,
      courseName: info.name,
      count: info.count,
    });
    if (!courseWithMost || info.count > courseWithMost.count) {
      courseWithMost = {
        courseId,
        courseName: info.name,
        count: info.count,
      };
    }
  }

  certificatesByCourse.sort((a, b) => b.count - a.count);

  const metrics: ClienteMetrics = {
    totalCertificates: certCount || 0,
    totalCarnets: carnetCount || 0,
    totalParticipants: participantCount || 0,
    courseWithMostParticipants: courseWithMost,
    certificatesByCourse: certificatesByCourse.slice(0, 5),
  };

  return { data: metrics };
}

export async function getClienteRecentBatches(
  empresaId: number,
  limit: number = 5,
): Promise<{ data?: ClienteBatchSummary[]; error?: string }> {
  if (!(await verifyClienteEmpresa(empresaId))) {
    return { error: "No autorizado" };
  }
  const sessionCityId = await getSessionCityId();
  const sessionSedeIds = await getSessionSedeIds();
  const supabase = await createClient();
  const visibleOsiIds = await getVisibleOsiIds();
  const visibleArr = [...visibleOsiIds];
  if (visibleArr.length === 0) return { data: [] };

  // Fetch certificates grouped by nro_osi — get all for this company first
  let batchQuery = supabase
    .from("certificados")
    .select(
      `id, nro_osi, fecha_emision, id_curso, id_ciudad, id_sede,
       catalogo_servicios!inner(nombre),
       cat_ciudades!left(id, nombre_ciudad),
       empresa_sedes!left(id, nombre_sede)`,
    )
    .eq("id_empresa", empresaId)
    .eq("is_active", true)
    .not("nro_osi", "is", null);
  if (visibleArr.length > 0) batchQuery = batchQuery.in("nro_osi", visibleArr);
  if (sessionSedeIds && sessionSedeIds.length > 0) batchQuery = batchQuery.in("id_sede", sessionSedeIds);
  else if (sessionCityId) batchQuery = batchQuery.eq("id_ciudad", sessionCityId);
  const { data, error } = await batchQuery
    .order("fecha_emision", { ascending: false })
    .limit(10000);

  if (error) {
    console.error("Error fetching recent batches:", error);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { data: [] };
  }

  // Group by nro_osi in JS (Supabase can't do GROUP BY easily)
  const batchMap = new Map<number, ClienteBatchSummary>();

  for (const row of data) {
    const nroOsi = row.nro_osi as number;
    if (!nroOsi) continue;

    const cityInfo = row.cat_ciudades as unknown as { nombre_ciudad: string } | null;
    const sedeInfo = row.empresa_sedes as unknown as { nombre_sede: string } | null;

    if (!batchMap.has(nroOsi)) {
      const courseInfo = row.catalogo_servicios as unknown as {
        nombre: string;
      };
      batchMap.set(nroOsi, {
        nro_osi: nroOsi,
        course_name: courseInfo?.nombre || "N/A",
        fecha_emision: row.fecha_emision || "",
        participant_count: 0,
        certificate_ids: [],
        city_names: [],
        sede_names: [],
      });
    }

    const batch = batchMap.get(nroOsi)!;
    batch.participant_count++;
    batch.certificate_ids.push(row.id);
    if (cityInfo?.nombre_ciudad && !batch.city_names.includes(cityInfo.nombre_ciudad)) {
      batch.city_names.push(cityInfo.nombre_ciudad);
    }
    if (sedeInfo?.nombre_sede && !batch.sede_names.includes(sedeInfo.nombre_sede)) {
      batch.sede_names.push(sedeInfo.nombre_sede);
    }
  }

  // Sort by fecha_emision desc and take top N
  const batches = Array.from(batchMap.values())
    .sort(
      (a, b) =>
        new Date(b.fecha_emision).getTime() -
        new Date(a.fecha_emision).getTime(),
    )
    .slice(0, limit);

  return { data: batches };
}

export async function getClienteBatchesFiltered(
  empresaId: number,
  filters: ClienteCertificateFilters,
  page: number = 1,
  itemsPerPage: number = 10,
): Promise<{ data?: ClienteBatchSummary[]; totalCount?: number; error?: string }> {
  if (!(await verifyClienteEmpresa(empresaId))) {
    return { error: "No autorizado" };
  }
  const sessionCityId = await getSessionCityId();
  const sessionSedeIds = await getSessionSedeIds();
  const supabase = await createClient();
  const visibleOsiIds = await getVisibleOsiIds();
  const visibleArr = [...visibleOsiIds];
  if (visibleArr.length === 0) return { data: [], totalCount: 0 };

  let query = supabase
    .from("certificados")
    .select(
      `id, nro_osi, fecha_emision, id_curso, snapshot_contenido, id_ciudad, id_sede,
       catalogo_servicios!inner(nombre),
       participantes_certificados!inner(nombre, cedula, nacionalidad),
       cat_ciudades!left(id, nombre_ciudad),
       empresa_sedes!left(id, nombre_sede)`,
    )
    .eq("id_empresa", empresaId)
    .eq("is_active", true)
    .not("nro_osi", "is", null);

  // Only include OSIs visible to the cliente portal
  if (visibleArr.length > 0) {
    query = query.in("nro_osi", visibleArr);
  }

  if (sessionSedeIds && sessionSedeIds.length > 0) query = query.in("id_sede", sessionSedeIds);
  else if (sessionCityId) query = query.eq("id_ciudad", sessionCityId);
  if (filters.sedeId) query = query.eq("id_sede", filters.sedeId);
  if (filters.cityId) query = query.eq("id_ciudad", filters.cityId);

  if (filters.courseId) query = query.eq("id_curso", filters.courseId);
  if (filters.stateId) query = query.eq("id_estado", filters.stateId);
  if (filters.dateFrom) query = query.gte("fecha_emision", filters.dateFrom);
  if (filters.dateTo) query = query.lte("fecha_emision", filters.dateTo);
  if (filters.searchTerm) {
    query = query.or(
      `nombre.ilike.%${filters.searchTerm}%,cedula.ilike.%${filters.searchTerm}%`,
      { referencedTable: "participantes_certificados" },
    );
  }

  query = query.order("fecha_emision", { ascending: false }).limit(10000);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching cliente batches filtered:", error);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { data: [], totalCount: 0 };
  }

  // Group by nro_osi in JS
  const batchMap = new Map<number, ClienteBatchSummary>();

  for (const row of data) {
    const nroOsi = row.nro_osi as number;
    if (!nroOsi) continue;

    const cityInfo = row.cat_ciudades as unknown as { nombre_ciudad: string } | null;
    const sedeInfo = row.empresa_sedes as unknown as { nombre_sede: string } | null;

    if (!batchMap.has(nroOsi)) {
      const courseInfo = row.catalogo_servicios as unknown as { nombre: string };
      let courseNombre = courseInfo?.nombre || "";
      if (!courseNombre && row.snapshot_contenido) {
        try {
          const snapshot = typeof row.snapshot_contenido === "string"
            ? JSON.parse(row.snapshot_contenido)
            : row.snapshot_contenido;
          courseNombre = snapshot?.certificado_detalles?.title || snapshot?.curso?.name || "N/A";
        } catch {
          // ignore parse errors
        }
      }
      batchMap.set(nroOsi, {
        nro_osi: nroOsi,
        course_name: courseNombre || "N/A",
        fecha_emision: row.fecha_emision || "",
        participant_count: 0,
        certificate_ids: [],
        city_names: [],
        sede_names: [],
      });
    }

    const batch = batchMap.get(nroOsi)!;
    batch.participant_count++;
    batch.certificate_ids.push(row.id);
    if (cityInfo?.nombre_ciudad && !batch.city_names.includes(cityInfo.nombre_ciudad)) {
      batch.city_names.push(cityInfo.nombre_ciudad);
    }
    if (sedeInfo?.nombre_sede && !batch.sede_names.includes(sedeInfo.nombre_sede)) {
      batch.sede_names.push(sedeInfo.nombre_sede);
    }
  }

  // Sort by fecha_emision desc
  const allBatches = Array.from(batchMap.values()).sort(
    (a, b) =>
      new Date(b.fecha_emision).getTime() -
      new Date(a.fecha_emision).getTime(),
  );

  const totalCount = allBatches.length;
  const from = (page - 1) * itemsPerPage;
  const paginatedBatches = allBatches.slice(from, from + itemsPerPage);

  return { data: paginatedBatches, totalCount };
}

export async function getClienteFilterOptions(
  empresaId: number,
): Promise<{ data?: ClienteFilterOptions; error?: string }> {
  if (!(await verifyClienteEmpresa(empresaId))) {
    return { error: "No autorizado" };
  }
  const sessionCityId = await getSessionCityId();
  const sessionSedeIds = await getSessionSedeIds();
  const supabase = await createClient();
  const visibleOsiIds = await getVisibleOsiIds();
  const visibleArr = [...visibleOsiIds];
  if (visibleArr.length === 0) return { data: { courses: [], states: [], cities: [], sedes: [] } };

  // Get distinct courses for this company's certificates
  let certDataQuery = supabase
    .from("certificados")
    .select(`id_curso, catalogo_servicios!inner(id, nombre)`)
    .eq("id_empresa", empresaId)
    .eq("is_active", true)
    .not("id_curso", "is", null);
  if (visibleArr.length > 0) certDataQuery = certDataQuery.in("nro_osi", visibleArr);
  if (sessionSedeIds && sessionSedeIds.length > 0) certDataQuery = certDataQuery.in("id_sede", sessionSedeIds);
  else if (sessionCityId) certDataQuery = certDataQuery.eq("id_ciudad", sessionCityId);
  const { data: certData, error: certError } = await certDataQuery;

  if (certError) {
    console.error("Error fetching course options:", certError);
  }

  const courseMap = new Map<number, string>();
  if (certData) {
    for (const row of certData) {
      const courseInfo = row.catalogo_servicios as unknown as {
        id: number;
        nombre: string;
      };
      if (courseInfo && !courseMap.has(courseInfo.id)) {
        courseMap.set(courseInfo.id, courseInfo.nombre);
      }
    }
  }

  // States are no longer exposed in the client portal UI
  // Get distinct cities for this company's certificates
  let cityDataQuery = supabase
    .from("certificados")
    .select(`id_ciudad, cat_ciudades!inner(id, nombre_ciudad)`)
    .eq("id_empresa", empresaId)
    .eq("is_active", true)
    .not("id_ciudad", "is", null);
  if (visibleArr.length > 0) cityDataQuery = cityDataQuery.in("nro_osi", visibleArr);
  if (sessionSedeIds && sessionSedeIds.length > 0) cityDataQuery = cityDataQuery.in("id_sede", sessionSedeIds);
  else if (sessionCityId) cityDataQuery = cityDataQuery.eq("id_ciudad", sessionCityId);
  const { data: cityData, error: cityError } = await cityDataQuery;

  if (cityError) {
    console.error("Error fetching city options:", cityError);
  }

  const cityMap = new Map<number, string>();
  if (cityData) {
    for (const row of cityData) {
      const cityInfo = row.cat_ciudades as unknown as {
        id: number;
        nombre_ciudad: string;
      };
      if (cityInfo && !cityMap.has(cityInfo.id)) {
        cityMap.set(cityInfo.id, cityInfo.nombre_ciudad);
      }
    }
  }

  // Get distinct sedes for this company's certificates
  const sedeMap = new Map<number, string>();
  if (sessionSedeIds && sessionSedeIds.length > 1) {
    // Multi-sede client: fetch names for their assigned sedes
    const { data: sedeData, error: sedeError } = await supabase
      .from("empresa_sedes")
      .select("id, nombre_sede")
      .in("id", sessionSedeIds)
      .eq("esta_activo", true)
      .order("nombre_sede", { ascending: true });

    if (sedeError) {
      console.error("Error fetching sede options:", sedeError);
    }

    if (sedeData) {
      for (const row of sedeData) {
        sedeMap.set(row.id, row.nombre_sede);
      }
    }
  } else if (!sessionSedeIds || sessionSedeIds.length === 0) {
    // No sedes assigned: fetch all sedes for this company
    let sedeDataQuery = supabase
      .from("certificados")
      .select(`id_sede, empresa_sedes!inner(id, nombre_sede)`)
      .eq("id_empresa", empresaId)
      .eq("is_active", true)
      .not("id_sede", "is", null);
    if (visibleArr.length > 0) sedeDataQuery = sedeDataQuery.in("nro_osi", visibleArr);
    if (sessionCityId) sedeDataQuery = sedeDataQuery.eq("id_ciudad", sessionCityId);
    const { data: sedeData, error: sedeError } = await sedeDataQuery;

    if (sedeError) {
      console.error("Error fetching sede options:", sedeError);
    }

    if (sedeData) {
      for (const row of sedeData) {
        const sedeInfo = row.empresa_sedes as unknown as {
          id: number;
          nombre_sede: string;
        };
        if (sedeInfo && !sedeMap.has(sedeInfo.id)) {
          sedeMap.set(sedeInfo.id, sedeInfo.nombre_sede);
        }
      }
    }
  }

  return {
    data: {
      courses: Array.from(courseMap.entries()).map(([id, nombre]) => ({
        id,
        nombre,
      })),
      states: [],
      cities: sessionSedeIds && sessionSedeIds.length > 0 ? [] : Array.from(cityMap.entries()).map(([id, nombre_ciudad]) => ({
        id,
        nombre_ciudad,
      })),
      sedes: Array.from(sedeMap.entries()).map(([id, nombre_sede]) => ({
        id,
        nombre_sede,
      })),
    },
  };
}

// ─── Company Logo Management ───

export async function getEmpresaLogoAction(
  empresaId: number,
): Promise<{ data?: EmpresaLogo | null; error?: string }> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("empresa_logos")
      .select("*")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching empresa logo:", error);
      return { error: error.message };
    }

    return { data: (data as EmpresaLogo) || null };
  } catch (error) {
    console.error("Error in getEmpresaLogoAction:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unknown error fetching logo",
    };
  }
}

export async function uploadEmpresaLogoAction(
  empresaId: number,
  base64Data: string,
): Promise<{ success?: boolean; error?: string; logoUrl?: string }> {
  try {
    const supabase = await createAdminClient();

    // Ensure the storage bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === "empresa-logos");
    if (!bucketExists) {
      const { error: bucketError } = await supabase.storage.createBucket(
        "empresa-logos",
        { public: true },
      );
      if (bucketError) {
        console.error("Error creating bucket:", bucketError);
        return { error: `Error creating storage bucket: ${bucketError.message}` };
      }
    }

    // Check if logo already exists (to delete old file)
    const { data: existing } = await supabase
      .from("empresa_logos")
      .select("storage_path")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (existing?.storage_path) {
      await supabase.storage
        .from("empresa-logos")
        .remove([existing.storage_path]);
    }

    // Convert base64 to blob
    const base64Parts = base64Data.split(",");
    const base64String = base64Parts[1] || base64Parts[0];
    const buffer = Buffer.from(base64String, "base64");

    const timestamp = Date.now();
    const storagePath = `empresa-${empresaId}-${timestamp}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("empresa-logos")
      .upload(storagePath, buffer, {
        contentType: "image/webp",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading logo:", uploadError);
      return { error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from("empresa-logos")
      .getPublicUrl(storagePath);

    const logoUrl = publicUrlData.publicUrl;

    // Upsert into empresa_logos table
    const { error: dbError } = await supabase
      .from("empresa_logos")
      .upsert(
        {
          empresa_id: empresaId,
          logo_url: logoUrl,
          storage_path: storagePath,
          uploaded_at: new Date().toISOString(),
        },
        { onConflict: "empresa_id" },
      );

    if (dbError) {
      console.error("Error saving logo record:", dbError);
      return { error: dbError.message };
    }

    revalidatePath("/dashboard/capacitacion");
    return { success: true, logoUrl };
  } catch (error) {
    console.error("Error in uploadEmpresaLogoAction:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unknown error uploading logo",
    };
  }
}

export async function removeEmpresaLogoAction(
  empresaId: number,
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createAdminClient();

    const { data: existing } = await supabase
      .from("empresa_logos")
      .select("storage_path")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (existing?.storage_path) {
      await supabase.storage
        .from("empresa-logos")
        .remove([existing.storage_path]);
    }

    const { error: dbError } = await supabase
      .from("empresa_logos")
      .delete()
      .eq("empresa_id", empresaId);

    if (dbError) {
      console.error("Error deleting logo record:", dbError);
      return { error: dbError.message };
    }

    revalidatePath("/dashboard/capacitacion");
    return { success: true };
  } catch (error) {
    console.error("Error in removeEmpresaLogoAction:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unknown error removing logo",
    };
  }
}

// ─── Hidden OSIs ("Pendiente de pago" cards) ───

// Returns minimal batch metadata for OSIs hidden from the cliente portal that
// belong to the given empresa (and the session's sede/ciudad scope). Deliberately
// omits certificate_ids and per-participant data so nothing downloadable leaks.
export async function getClienteHiddenBatches(
  empresaId: number,
): Promise<{ data?: HiddenBatchSummary[]; totalCount?: number; error?: string }> {
  if (!(await verifyClienteEmpresa(empresaId))) {
    return { error: "No autorizado" };
  }
  const visibleOsiIds = await getVisibleOsiIds();
  const visibleArr = [...visibleOsiIds];
  const sessionCityId = await getSessionCityId();
  const sessionSedeIds = await getSessionSedeIds();
  const supabase = await createClient();

  let query = supabase
    .from("certificados")
    .select(
      `id, nro_osi, fecha_emision, id_curso, snapshot_contenido, id_ciudad, id_sede,
       catalogo_servicios!inner(nombre),
       cat_ciudades!left(id, nombre_ciudad),
       empresa_sedes!left(id, nombre_sede)`,
    )
    .eq("id_empresa", empresaId)
    .eq("is_active", true)
    .not("nro_osi", "is", null);

  // Show batches that are NOT visible (hidden). When visibleOsiIds is empty,
  // all OSIs are hidden, so no filter is needed (show all as pending).
  if (visibleArr.length > 0) {
    query = query.not("nro_osi", "in", `(${visibleArr.join(",")})`);
  }

  if (sessionSedeIds && sessionSedeIds.length > 0) query = query.in("id_sede", sessionSedeIds);
  else if (sessionCityId) query = query.eq("id_ciudad", sessionCityId);

  query = query.order("fecha_emision", { ascending: false }).limit(10000);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching cliente hidden batches:", error);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { data: [], totalCount: 0 };
  }

  // Group by nro_osi (no certificate_ids leaked)
  const batchMap = new Map<number, HiddenBatchSummary>();

  for (const row of data) {
    const nroOsi = row.nro_osi as number;
    if (!nroOsi) continue;

    const cityInfo = row.cat_ciudades as unknown as { nombre_ciudad: string } | null;
    const sedeInfo = row.empresa_sedes as unknown as { nombre_sede: string } | null;

    if (!batchMap.has(nroOsi)) {
      const courseInfo = row.catalogo_servicios as unknown as { nombre: string };
      let courseNombre = courseInfo?.nombre || "";
      if (!courseNombre && row.snapshot_contenido) {
        try {
          const snapshot = typeof row.snapshot_contenido === "string"
            ? JSON.parse(row.snapshot_contenido)
            : row.snapshot_contenido;
          courseNombre = snapshot?.certificado_detalles?.title || snapshot?.curso?.name || "N/A";
        } catch {
          // ignore parse errors
        }
      }
      batchMap.set(nroOsi, {
        nro_osi: nroOsi,
        course_name: courseNombre || "N/A",
        fecha_emision: row.fecha_emision || "",
        participant_count: 0,
        city_names: [],
        sede_names: [],
      });
    }

    const batch = batchMap.get(nroOsi)!;
    batch.participant_count++;
    if (cityInfo?.nombre_ciudad && !batch.city_names.includes(cityInfo.nombre_ciudad)) {
      batch.city_names.push(cityInfo.nombre_ciudad);
    }
    if (sedeInfo?.nombre_sede && !batch.sede_names.includes(sedeInfo.nombre_sede)) {
      batch.sede_names.push(sedeInfo.nombre_sede);
    }
  }

  const allBatches = Array.from(batchMap.values()).sort(
    (a, b) =>
      new Date(b.fecha_emision).getTime() -
      new Date(a.fecha_emision).getTime(),
  );

  return { data: allBatches, totalCount: allBatches.length };
}
