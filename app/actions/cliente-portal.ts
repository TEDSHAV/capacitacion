"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { signSession, verifySession } from "@/lib/session-signing";
import type {
  ClienteCredential,
  ClienteSession,
  ClienteCertificateFilters,
  ClienteMetrics,
  ClienteBatchSummary,
  ClienteCertificateRow,
  ClienteCarnetRow,
  ClienteFilterOptions,
} from "@/types";

// ─── Auth Helpers ───

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// ─── Credential Management (Admin) ───

export async function createClienteCredentials(
  empresaId: number,
  username: string,
  password: string,
  displayName?: string,
  cityId?: number | null,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createAdminClient();
  const passwordHash = hashPassword(password);

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
    updateData.password_hash = hashPassword(updates.password);
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
  const passwordHash = hashPassword(password);

  const { data: creds, error: credError } = await supabase
    .from("cliente_credenciales")
    .select("*, empresas(razon_social)")
    .eq("username", username)
    .eq("password_hash", passwordHash)
    .eq("is_active", true)
    .maybeSingle();

  if (credError) {
    console.error("[Cliente Portal Login] Database error:", credError);
    return { error: "Error al verificar credenciales" };
  }

  if (!creds) {
    return { error: "Credenciales inválidas o cuenta inactiva" };
  }

  const sessionData: ClienteSession = {
    id: creds.id,
    empresa_id: creds.empresa_id,
    empresa_nombre: creds.empresas?.razon_social || "Empresa",
    username: creds.username,
    display_name: creds.display_name,
    id_ciudad: creds.id_ciudad ?? null,
  };

  const cookieStore = await cookies();
  cookieStore.set("cliente_session", signSession(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });

  return { success: true };
}

export async function getClienteSession(): Promise<ClienteSession | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("cliente_session");
  if (!session) return null;
  return verifySession<ClienteSession>(session.value);
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
  const supabase = await createClient();

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
         empresas!inner(razon_social)`,
        { count: "exact" },
      )
      .eq("id_empresa", empresaId)
      .eq("is_active", true)
      .eq("nro_osi", filters.nroOsi);

    if (sessionCityId) query = query.eq("id_ciudad", sessionCityId);

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
        company_razon_social: (company?.razon_social as string) || "",
        calificacion: (row.calificacion as number) || 0,
        total_count: count || 0,
      };
    });

    return { data: rows, totalCount: count || 0 };
  }

  // Default: use the search_certificates RPC
  const rpcParams: Record<string, unknown> = {
    p_company_id: empresaId,
    p_is_active: true,
    p_page: page,
    p_limit: itemsPerPage,
  };

  if (sessionCityId) rpcParams.p_city_id = sessionCityId;
  if (filters.searchTerm) rpcParams.p_search_term = filters.searchTerm;
  if (filters.courseId) rpcParams.p_course_id = filters.courseId;
  if (filters.stateId) rpcParams.p_state_id = filters.stateId;
  if (filters.dateFrom) rpcParams.p_date_from = filters.dateFrom;
  if (filters.dateTo) rpcParams.p_date_to = filters.dateTo;

  const { data, error } = await supabase.rpc("search_certificates", rpcParams);

  if (error) {
    console.error("Error fetching cliente certificates:", error);
    return { error: error.message };
  }

  const rows = (data as ClienteCertificateRow[]) || [];
  const totalCount = rows.length > 0 ? rows[0].total_count : 0;

  return { data: rows, totalCount };
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
  const supabase = await createClient();

  const from = (page - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  let query = supabase
    .from("carnets")
    .select(
      `id, nombre_participante, cedula_participante, titulo_curso, 
       fecha_emision, fecha_vencimiento, is_active, id_empresa, 
       id_certificado, id_osi,
       certificados!inner(id_estado, fecha_emision, nro_osi, id_ciudad)`,
      { count: "exact" },
    )
    .eq("id_empresa", empresaId)
    .eq("is_active", true);

  if (sessionCityId) {
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
  const supabase = await createClient();

  // Count total certificates for this company
  let certCountQuery = supabase
    .from("certificados")
    .select("id", { count: "exact", head: true })
    .eq("id_empresa", empresaId)
    .eq("is_active", true);
  if (sessionCityId) certCountQuery = certCountQuery.eq("id_ciudad", sessionCityId);
  const { count: certCount, error: certError } = await certCountQuery;

  if (certError) {
    console.error("Error counting certificates:", certError);
  }

  // Count carnets for this company (filter by city via certificados join)
  let carnetCountQuery = supabase
    .from("carnets")
    .select(
      sessionCityId
        ? "id, certificados!inner(id_ciudad)"
        : "id",
      { count: "exact", head: true },
    )
    .eq("id_empresa", empresaId)
    .eq("is_active", true);
  if (sessionCityId) {
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
  if (sessionCityId) participantCountQuery = participantCountQuery.eq("id_ciudad", sessionCityId);
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
  if (sessionCityId) byCourseQuery = byCourseQuery.eq("id_ciudad", sessionCityId);
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
  const supabase = await createClient();

  // Fetch certificates grouped by nro_osi — get all for this company first
  let batchQuery = supabase
    .from("certificados")
    .select(
      `id, nro_osi, fecha_emision, id_curso, catalogo_servicios!inner(nombre)`,
    )
    .eq("id_empresa", empresaId)
    .eq("is_active", true)
    .not("nro_osi", "is", null);
  if (sessionCityId) batchQuery = batchQuery.eq("id_ciudad", sessionCityId);
  const { data, error } = await batchQuery.order("fecha_emision", { ascending: false });

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
      });
    }

    const batch = batchMap.get(nroOsi)!;
    batch.participant_count++;
    batch.certificate_ids.push(row.id);
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
  const supabase = await createClient();

  let query = supabase
    .from("certificados")
    .select(
      `id, nro_osi, fecha_emision, id_curso, snapshot_contenido,
       catalogo_servicios!inner(nombre),
       participantes_certificados!inner(nombre, cedula, nacionalidad)`,
    )
    .eq("id_empresa", empresaId)
    .eq("is_active", true)
    .not("nro_osi", "is", null);

  if (sessionCityId) query = query.eq("id_ciudad", sessionCityId);
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

  query = query.order("fecha_emision", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching filtered batches:", error);
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
      });
    }

    const batch = batchMap.get(nroOsi)!;
    batch.participant_count++;
    batch.certificate_ids.push(row.id);
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
  const supabase = await createClient();

  // Get distinct courses for this company's certificates
  let certDataQuery = supabase
    .from("certificados")
    .select(`id_curso, catalogo_servicios!inner(id, nombre)`)
    .eq("id_empresa", empresaId)
    .eq("is_active", true)
    .not("id_curso", "is", null);
  if (sessionCityId) certDataQuery = certDataQuery.eq("id_ciudad", sessionCityId);
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

  // Get distinct states for this company's certificates
  let stateDataQuery = supabase
    .from("certificados")
    .select(`id_estado, cat_estados_venezuela(id, nombre_estado)`)
    .eq("id_empresa", empresaId)
    .eq("is_active", true)
    .not("id_estado", "is", null);
  if (sessionCityId) stateDataQuery = stateDataQuery.eq("id_ciudad", sessionCityId);
  const { data: stateData, error: stateError } = await stateDataQuery;

  if (stateError) {
    console.error("Error fetching state options:", stateError);
  }

  const stateMap = new Map<number, string>();
  if (stateData) {
    for (const row of stateData) {
      const stateInfo = row.cat_estados_venezuela as unknown as {
        id: number;
        nombre_estado: string;
      };
      if (stateInfo && !stateMap.has(stateInfo.id)) {
        stateMap.set(stateInfo.id, stateInfo.nombre_estado);
      }
    }
  }

  // Get distinct cities for this company's certificates
  let cityDataQuery = supabase
    .from("certificados")
    .select(`id_ciudad, cat_ciudades!inner(id, nombre_ciudad)`)
    .eq("id_empresa", empresaId)
    .eq("is_active", true)
    .not("id_ciudad", "is", null);
  if (sessionCityId) cityDataQuery = cityDataQuery.eq("id_ciudad", sessionCityId);
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

  return {
    data: {
      courses: Array.from(courseMap.entries()).map(([id, nombre]) => ({
        id,
        nombre,
      })),
      states: Array.from(stateMap.entries()).map(([id, nombre_estado]) => ({
        id,
        nombre_estado,
      })),
      cities: Array.from(cityMap.entries()).map(([id, nombre_ciudad]) => ({
        id,
        nombre_ciudad,
      })),
    },
  };
}
