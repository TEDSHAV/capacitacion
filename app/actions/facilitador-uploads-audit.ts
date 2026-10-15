"use server";

import { createAdminClient } from "@/utils/supabase/server";
import { OSIAttachment } from "@/types";

export interface OsiUploadAuditItem {
  osiId: number;
  nroOsi: string;
  nombreEmpresa: string;
  servicio: string;
  fechaSesion: string | null;
  sesionesCount: number;
  facilitadorNombre: string;
  facilitadorId: number | null;
  hasAsistencia: boolean;
  hasCalificacion: boolean;
  hasFotos: boolean;
  isAttachmentReceived: boolean;
  isExecutedOrPassed: boolean;
  isPendingUpload: boolean;
  isPendingConfirmation: boolean;
  isComplete: boolean;
  asistenciaCount: number;
  calificacionCount: number;
  fotosCount: number;
  totalArchivos: number;
  archivos: OSIAttachment[];
}

export interface FacilitadorUploadsAuditSummary {
  totalOsis: number;
  totalWithUploads: number;
  totalPendingUploads: number;
  totalPendingConfirmation: number;
  totalComplete: number;
  items: OsiUploadAuditItem[];
}

function getCaracasTodayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const IN_CHUNK_SIZE = 100;

async function chunkedIn<T>(
  ids: number[],
  fetcher: (chunk: number[]) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  if (ids.length === 0) return [];
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + IN_CHUNK_SIZE));
  }
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const res = await fetcher(chunk);
        return res.data || [];
      } catch (e) {
        console.error("[chunkedIn] Error:", e);
        return [];
      }
    })
  );
  return results.flat();
}

/**
 * Audit and query OSI attachments uploaded by facilitadores,
 * identifying which services have complete uploads vs which are pending.
 */
export async function getFacilitadorUploadsAudit(
  searchQuery?: string,
  filterMode?: "todos" | "pendientes_carga" | "pendientes_confirmar" | "completos",
  categoryFilter?: string
): Promise<FacilitadorUploadsAuditSummary> {
  const supabase = await createAdminClient();
  const todayStr = getCaracasTodayStr();

  // 1. Fetch OSIs of type Capacitacion (ordered by date descending)
  let osisQuery = supabase
    .from("v_osi_formato_completo")
    .select("id_osi, nro_osi, nombre_empresa, servicio, fecha_inicio_real, fecha_fin_real, tipo_servicio, id_estatus")
    .ilike("tipo_servicio", "%capacitacion%")
    .not("nro_osi", "ilike", "%PEN-%")
    .order("fecha_inicio_real", { ascending: false, nullsFirst: false })
    .limit(500);

  if (searchQuery && searchQuery.trim().length > 0) {
    const q = searchQuery.trim();
    osisQuery = osisQuery.or(`nro_osi.ilike.%${q}%,nombre_empresa.ilike.%${q}%,servicio.ilike.%${q}%`);
  }

  const { data: osisRaw, error: osisErr } = await osisQuery;
  if (osisErr || !osisRaw || osisRaw.length === 0) {
    if (osisErr) console.error("[getFacilitadorUploadsAudit] Error fetching OSIs:", osisErr);
    return {
      totalOsis: 0,
      totalWithUploads: 0,
      totalPendingUploads: 0,
      totalPendingConfirmation: 0,
      totalComplete: 0,
      items: [],
    };
  }

  const osis = osisRaw.filter((o) => o.id_osi != null);
  const osiIds = osis.map((o) => o.id_osi as number);

  // 2. Fetch parallel data: sessions, facilitator assignments, uploads
  const [sesionRows, assignmentRows, uploadRows] = await Promise.all([
    chunkedIn<{ id_osi: number; nro_sesion: number; fecha: string | null; fecha_ejecutada: string | null }>(
      osiIds,
      (chunk) =>
        supabase
          .from("osi_sesion")
          .select("id_osi, nro_sesion, fecha, fecha_ejecutada")
          .in("id_osi", chunk)
    ),
    chunkedIn<{
      osi_id: number;
      facilitador_id: number;
      attachment_received: boolean | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      facilitadores: any;
    }>(
      osiIds,
      (chunk) =>
        supabase
          .from("facilitador_osi_assignments")
          .select("osi_id, facilitador_id, attachment_received, facilitadores(nombre_apellido)")
          .in("osi_id", chunk)
          .eq("is_active", true)
    ),
    chunkedIn<{
      id: string;
      osi_id: number;
      facilitador_id: number | null;
      storage_path: string;
      file_name: string;
      file_type: string;
      file_size: number | null;
      category: string | null;
      nro_sesion: number | null;
      created_at: string;
      updated_at: string;
    }>(
      osiIds,
      (chunk) =>
        supabase
          .from("ejecucion_osi_asistencia")
          .select("*")
          .in("osi_id", chunk)
    ),
  ]);

  // Lookup maps
  const sessionsByOsi = new Map<number, { count: number; maxFecha: string | null }>();
  for (const s of sesionRows) {
    const entry = sessionsByOsi.get(s.id_osi) || { count: 0, maxFecha: null };
    entry.count += 1;
    const d = s.fecha_ejecutada || s.fecha;
    if (d && (!entry.maxFecha || d > entry.maxFecha)) {
      entry.maxFecha = d;
    }
    sessionsByOsi.set(s.id_osi, entry);
  }

  const assignmentsByOsi = new Map<
    number,
    { facilitadorId: number | null; nombre: string; attachmentReceived: boolean }
  >();
  for (const a of assignmentRows) {
    const existing = assignmentsByOsi.get(a.osi_id);
    const nombre =
      (Array.isArray(a.facilitadores)
        ? a.facilitadores[0]?.nombre_apellido
        : a.facilitadores?.nombre_apellido) || "Sin asignar";
    if (!existing) {
      assignmentsByOsi.set(a.osi_id, {
        facilitadorId: a.facilitador_id,
        nombre,
        attachmentReceived: Boolean(a.attachment_received),
      });
    } else {
      if (a.attachment_received) existing.attachmentReceived = true;
      if (!existing.nombre.includes(nombre)) {
        existing.nombre += `, ${nombre}`;
      }
    }
  }

  const uploadsByOsi = new Map<number, OSIAttachment[]>();
  for (const u of uploadRows) {
    const { data: { publicUrl } } = supabase.storage
      .from("facilitador-uploads")
      .getPublicUrl(u.storage_path);

    const att: OSIAttachment = {
      id: u.id,
      osi_id: u.osi_id,
      facilitador_id: u.facilitador_id,
      storage_path: u.storage_path,
      file_name: u.file_name,
      file_type: u.file_type,
      file_size: u.file_size || 0,
      category: u.category,
      nro_sesion: u.nro_sesion,
      created_at: u.created_at,
      updated_at: u.updated_at,
      publicUrl,
    };

    const list = uploadsByOsi.get(u.osi_id) || [];
    list.push(att);
    uploadsByOsi.set(u.osi_id, list);
  }

  // 3. Assemble items and summary
  let totalWithUploads = 0;
  let totalPendingUploads = 0;
  let totalPendingConfirmation = 0;
  let totalComplete = 0;

  const items: OsiUploadAuditItem[] = [];

  for (const osi of osis) {
    const osiId = osi.id_osi as number;
    const sessionInfo = sessionsByOsi.get(osiId) || { count: 1, maxFecha: null };
    const assignment = assignmentsByOsi.get(osiId) || {
      facilitadorId: null,
      nombre: "Sin asignar",
      attachmentReceived: false,
    };
    const archivos = uploadsByOsi.get(osiId) || [];

    const asistenciaFiles = archivos.filter((a) => a.category === "lista_asistencia");
    const calificacionFiles = archivos.filter((a) => a.category === "hoja_calificacion");
    const fotosFiles = archivos.filter((a) => a.category === "material_fotografico");

    const hasAsistencia = asistenciaFiles.length > 0;
    const hasCalificacion = calificacionFiles.length > 0;
    const hasFotos = fotosFiles.length > 0;
    const isAttachmentReceived = assignment.attachmentReceived;

    const fechaSesion = sessionInfo.maxFecha || (osi.fecha_inicio_real as string | null);
    const isExecutedOrPassed = Boolean(fechaSesion && fechaSesion <= todayStr);

    const isPendingUpload =
      isExecutedOrPassed && (!hasAsistencia || !hasCalificacion || !hasFotos);

    const isComplete = hasAsistencia && hasCalificacion && hasFotos && isAttachmentReceived;
    const isPendingConfirmation =
      (hasAsistencia || hasCalificacion || hasFotos) && !isAttachmentReceived;

    if (archivos.length > 0) totalWithUploads += 1;
    if (isPendingUpload) totalPendingUploads += 1;
    if (isPendingConfirmation) totalPendingConfirmation += 1;
    if (isComplete) totalComplete += 1;

    // Apply category filter if specified
    if (categoryFilter && categoryFilter !== "all") {
      const matchCat = archivos.some((a) => a.category === categoryFilter);
      if (!matchCat) continue;
    }

    // Apply status filter if specified
    if (filterMode === "pendientes_carga" && !isPendingUpload) continue;
    if (filterMode === "pendientes_confirmar" && !isPendingConfirmation) continue;
    if (filterMode === "completos" && !isComplete) continue;

    items.push({
      osiId,
      nroOsi: osi.nro_osi || `OSI-${osiId}`,
      nombreEmpresa: osi.nombre_empresa || "Empresa no especificada",
      servicio: osi.servicio || "Capacitación",
      fechaSesion,
      sesionesCount: sessionInfo.count,
      facilitadorNombre: assignment.nombre,
      facilitadorId: assignment.facilitadorId,
      hasAsistencia,
      hasCalificacion,
      hasFotos,
      isAttachmentReceived,
      isExecutedOrPassed,
      isPendingUpload,
      isPendingConfirmation,
      isComplete,
      asistenciaCount: asistenciaFiles.length,
      calificacionCount: calificacionFiles.length,
      fotosCount: fotosFiles.length,
      totalArchivos: archivos.length,
      archivos,
    });
  }

  return {
    totalOsis: osis.length,
    totalWithUploads,
    totalPendingUploads,
    totalPendingConfirmation,
    totalComplete,
    items,
  };
}
