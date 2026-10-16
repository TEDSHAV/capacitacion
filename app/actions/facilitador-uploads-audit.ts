"use server";

import { createAdminClient } from "@/utils/supabase/server";
import { OSIAttachment } from "@/types";
import { getFeriadosSet } from "@/app/actions/feriados";
import { businessDaysInclusive, parseDate } from "@/lib/business-days";

export interface AuditAttachment extends OSIAttachment {
  originOsiNro?: string;
  isSharedFromGroup?: boolean;
}

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
  archivos: AuditAttachment[];
  fechaCargaSoportes?: string | null;
  diasDesdeEjecucion?: number | null;
  diasCargaFacilitador?: number | null;
  // Multi-OSI Group Metadata (Non-Redundancy)
  isGroupMember?: boolean;
  isGroupParent?: boolean;
  isGroupChild?: boolean;
  parentOsiId?: number | null;
  parentNroOsi?: string | null;
  childOsis?: { id: number; nroOsi: string }[];
  sharedFilesCount?: number;
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

  // 2. Fetch multi-OSI adjustments (grouping relationships)
  const { data: rawAjustes } = await supabase
    .from("capacitacion_indicadores_ajustes")
    .select("osi_id, osi_referencia_id, nro_osi_referencia, emitido_en_otra_osi, motivo")
    .not("osi_referencia_id", "is", null);

  const parentByChildId = new Map<number, { parentId: number; parentNro: string }>();
  const childrenByParentId = new Map<number, { childId: number }[]>();

  for (const a of rawAjustes || []) {
    if (a.osi_id && a.osi_referencia_id) {
      parentByChildId.set(a.osi_id, {
        parentId: a.osi_referencia_id,
        parentNro: a.nro_osi_referencia || `OSI-${a.osi_referencia_id}`,
      });
      const list = childrenByParentId.get(a.osi_referencia_id) || [];
      list.push({ childId: a.osi_id });
      childrenByParentId.set(a.osi_referencia_id, list);
    }
  }

  // Ensure any parent or child ID not in osiIds is fetched as well
  const extraIds = new Set<number>();
  for (const id of osiIds) {
    const parent = parentByChildId.get(id);
    if (parent && !osiIds.includes(parent.parentId)) {
      extraIds.add(parent.parentId);
    }
    const children = childrenByParentId.get(id);
    if (children) {
      for (const c of children) {
        if (!osiIds.includes(c.childId)) {
          extraIds.add(c.childId);
        }
      }
    }
  }

  const allOsiIdsToQuery = Array.from(new Set([...osiIds, ...Array.from(extraIds)]));

  // Build an OSI number lookup map
  const osiNroById = new Map<number, string>();
  for (const o of osis) {
    if (o.id_osi && o.nro_osi) osiNroById.set(o.id_osi, o.nro_osi);
  }

  // If there are extraIds not in osis, fetch their nro_osi
  const missingNroIds = Array.from(extraIds).filter((id) => !osiNroById.has(id));
  if (missingNroIds.length > 0) {
    const { data: extraOsis } = await supabase
      .from("v_osi_formato_completo")
      .select("id_osi, nro_osi")
      .in("id_osi", missingNroIds);
    for (const eo of extraOsis || []) {
      if (eo.id_osi && eo.nro_osi) osiNroById.set(eo.id_osi, eo.nro_osi);
    }
  }

  // 3. Fetch parallel data: sessions, facilitator assignments, uploads, feriados
  const [sesionRows, assignmentRows, uploadRows, holidays] = await Promise.all([
    chunkedIn<{ id_osi: number; nro_sesion: number; fecha: string | null; fecha_ejecutada: string | null }>(
      allOsiIdsToQuery,
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
      allOsiIdsToQuery,
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
      allOsiIdsToQuery,
      (chunk) =>
        supabase
          .from("ejecucion_osi_asistencia")
          .select("*")
          .in("osi_id", chunk)
    ),
    getFeriadosSet(),
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

  const uploadsByOsi = new Map<number, AuditAttachment[]>();
  for (const u of uploadRows) {
    const { data: { publicUrl } } = supabase.storage
      .from("facilitador-uploads")
      .getPublicUrl(u.storage_path);

    const att: AuditAttachment = {
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
      originOsiNro: osiNroById.get(u.osi_id) || `OSI-${u.osi_id}`,
    };

    const list = uploadsByOsi.get(u.osi_id) || [];
    list.push(att);
    uploadsByOsi.set(u.osi_id, list);
  }

  // 4. Assemble items and summary with Multi-OSI Group Non-Redundancy
  let totalWithUploads = 0;
  let totalPendingUploads = 0;
  let totalPendingConfirmation = 0;
  let totalComplete = 0;

  const items: OsiUploadAuditItem[] = [];

  for (const osi of osis) {
    const osiId = osi.id_osi as number;
    const parentInfo = parentByChildId.get(osiId);
    const childList = childrenByParentId.get(osiId) || [];

    const isGroupChild = Boolean(parentInfo);
    const isGroupParent = childList.length > 0;
    const isGroupMember = isGroupChild || isGroupParent;

    // Build the set of all OSI IDs belonging to this service cluster
    const clusterOsiIds = new Set<number>([osiId]);
    if (parentInfo) {
      clusterOsiIds.add(parentInfo.parentId);
      const siblings = childrenByParentId.get(parentInfo.parentId) || [];
      for (const s of siblings) clusterOsiIds.add(s.childId);
    }
    if (isGroupParent) {
      for (const c of childList) clusterOsiIds.add(c.childId);
    }

    // Pool all attachments across cluster (deduped by ID)
    const pooledArchivos: AuditAttachment[] = [];
    const seenAttachmentIds = new Set<string>();
    for (const cId of clusterOsiIds) {
      const atts = uploadsByOsi.get(cId) || [];
      for (const att of atts) {
        if (!seenAttachmentIds.has(att.id)) {
          seenAttachmentIds.add(att.id);
          pooledArchivos.push({
            ...att,
            isSharedFromGroup: att.osi_id !== osiId,
          });
        }
      }
    }

    // Shared facilitator assignment with fallback across cluster
    let assignment = assignmentsByOsi.get(osiId) || {
      facilitadorId: null,
      nombre: "Sin asignar",
      attachmentReceived: false,
    };

    if ((!assignment.facilitadorId || assignment.nombre === "Sin asignar") && parentInfo) {
      const parentAssign = assignmentsByOsi.get(parentInfo.parentId);
      if (parentAssign && parentAssign.facilitadorId) {
        assignment = {
          ...assignment,
          facilitadorId: parentAssign.facilitadorId,
          nombre: parentAssign.nombre,
        };
      }
    }

    // Pool attachmentReceived flag across group members
    let isAttachmentReceived = assignment.attachmentReceived;
    if (!isAttachmentReceived && isGroupMember) {
      for (const cId of clusterOsiIds) {
        if (assignmentsByOsi.get(cId)?.attachmentReceived) {
          isAttachmentReceived = true;
          break;
        }
      }
    }

    const sessionInfo = sessionsByOsi.get(osiId) || { count: 1, maxFecha: null };
    const fechaSesion = sessionInfo.maxFecha || (osi.fecha_inicio_real as string | null);
    const isExecutedOrPassed = Boolean(fechaSesion && fechaSesion <= todayStr);

    const asistenciaFiles = pooledArchivos.filter((a) => a.category === "lista_asistencia");
    const calificacionFiles = pooledArchivos.filter((a) => a.category === "hoja_calificacion");
    const fotosFiles = pooledArchivos.filter((a) => a.category === "material_fotografico");

    const hasAsistencia = asistenciaFiles.length > 0;
    const hasCalificacion = calificacionFiles.length > 0;
    const hasFotos = fotosFiles.length > 0;

    const isPendingUpload =
      isExecutedOrPassed && (!hasAsistencia || !hasCalificacion || !hasFotos);

    const isComplete = hasAsistencia && hasCalificacion && hasFotos && isAttachmentReceived;
    const isPendingConfirmation =
      (hasAsistencia || hasCalificacion || hasFotos) && !isAttachmentReceived;

    if (pooledArchivos.length > 0) totalWithUploads += 1;
    if (isPendingUpload) totalPendingUploads += 1;
    if (isPendingConfirmation) totalPendingConfirmation += 1;
    if (isComplete) totalComplete += 1;

    // Apply category filter if specified
    if (categoryFilter && categoryFilter !== "all") {
      const matchCat = pooledArchivos.some((a) => a.category === categoryFilter);
      if (!matchCat) continue;
    }

    // Apply status filter if specified
    if (filterMode === "pendientes_carga" && !isPendingUpload) continue;
    if (filterMode === "pendientes_confirmar" && !isPendingConfirmation) continue;
    if (filterMode === "completos" && !isComplete) continue;

    // Timing calculation
    let fechaCargaSoportes: string | null = null;
    let diasCargaFacilitador: number | null = null;
    let diasDesdeEjecucion: number | null = null;

    if (pooledArchivos.length > 0) {
      const dates = pooledArchivos.map((a) => a.created_at).filter(Boolean).sort();
      fechaCargaSoportes = dates[dates.length - 1] ?? null;
    }

    if (fechaSesion) {
      const execDate = parseDate(fechaSesion);
      const nowDate = new Date();
      if (fechaCargaSoportes) {
        diasCargaFacilitador = businessDaysInclusive(execDate, parseDate(fechaCargaSoportes), holidays);
      }
      if (execDate <= nowDate) {
        diasDesdeEjecucion = businessDaysInclusive(execDate, nowDate, holidays);
      }
    }

    const resolvedChildOsis = childList.map((c) => ({
      id: c.childId,
      nroOsi: osiNroById.get(c.childId) || `OSI-${c.childId}`,
    }));

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
      totalArchivos: pooledArchivos.length,
      archivos: pooledArchivos,
      fechaCargaSoportes,
      diasDesdeEjecucion,
      diasCargaFacilitador,
      isGroupMember,
      isGroupParent,
      isGroupChild,
      parentOsiId: parentInfo?.parentId ?? null,
      parentNroOsi: parentInfo?.parentNro ?? null,
      childOsis: resolvedChildOsis,
      sharedFilesCount: pooledArchivos.filter((a) => a.isSharedFromGroup).length,
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

export interface OsiAuditParticipant {
  id: number;
  nombre_apellido: string;
  cedula: string;
  score: number | string | null;
  status: string | null;
  isPassing: boolean;
  source: "ejecucion_portal" | "certificados";
  osi_id?: number;
  nro_osi?: string;
}

export interface OsiGroupRelatedItem {
  id_osi: number;
  nro_osi: string;
  nombre_empresa: string;
  servicio: string;
  isCurrent: boolean;
  isParent: boolean;
  uploadsCount: number;
  participantsCount: number;
}

export interface OsiGroupInfo {
  isGroup: boolean;
  isChild: boolean;
  isParent: boolean;
  parentOsiId: number | null;
  parentNroOsi: string | null;
  relatedOsis: OsiGroupRelatedItem[];
}

export interface OsiAuditDetailData {
  osi: {
    id_osi: number;
    nro_osi: string;
    nombre_empresa: string;
    servicio: string;
    id_servicio: number | null;
    fecha_inicio_real: string | null;
    fecha_fin_real: string | null;
    tipo_servicio?: string | null;
    modalidad?: string | null;
    duracion_horas?: number | null;
    id_sede?: number | null;
    sede_nombre?: string | null;
    direccion_ejecucion?: string | null;
  };
  facilitador: {
    id: number | null;
    nombre_apellido: string;
    cedula?: string | null;
    email?: string | null;
    telefono?: string | null;
    attachmentReceived: boolean;
  };
  notaAprobatoria: number;
  attachments: AuditAttachment[];
  participants: OsiAuditParticipant[];
  acknowledgment: {
    acknowledged_at: string | null;
    disclaimer_text: string | null;
  } | null;
  groupInfo?: OsiGroupInfo | null;
  stats: {
    totalParticipants: number;
    evaluatedCount: number;
    passingCount: number;
    failingCount: number;
    averageScore: number | null;
    highestScore: number | null;
    lowestScore: number | null;
    hasGradeSheet: boolean;
    hasAttendanceList: boolean;
    hasPhotos: boolean;
    isComplete: boolean;
    fechaCargaSoportes: string | null;
    diasCargaFacilitador: number | null;
    diasDesdeEjecucion: number | null;
  };
}

/**
 * Fetch complete audit workspace data for a specific OSI, including
 * facilitator uploaded documents (grade sheets, attendance, photos),
 * digital participant scores, passing thresholds, and acknowledgment proofs.
 * Multi-OSI aware: pools documents and participants across grouped OSIs.
 */
export async function getOsiAuditDetail(
  osiId: number
): Promise<{ data?: OsiAuditDetailData; error?: string }> {
  try {
    const supabase = await createAdminClient();

    // 1. Fetch OSI basic info
    const { data: osiData, error: osiError } = await supabase
      .from("v_osi_formato_completo")
      .select("*")
      .eq("id_osi", osiId)
      .maybeSingle();

    if (osiError || !osiData) {
      console.error("[getOsiAuditDetail] Error fetching OSI:", osiError);
      return { error: "No se encontró la OSI solicitada" };
    }

    // 2. Resolve Multi-OSI Grouping relationships from capacitacion_indicadores_ajustes
    const { data: directAjustes } = await supabase
      .from("capacitacion_indicadores_ajustes")
      .select("osi_id, osi_referencia_id, nro_osi_referencia, emitido_en_otra_osi, motivo")
      .or(`osi_id.eq.${osiId},osi_referencia_id.eq.${osiId}`);

    let parentOsiId: number | null = null;
    let parentNroOsi: string | null = null;
    const clusterOsiIds = new Set<number>([osiId]);

    for (const a of directAjustes || []) {
      if (a.osi_id === osiId && a.osi_referencia_id) {
        parentOsiId = a.osi_referencia_id;
        parentNroOsi = a.nro_osi_referencia;
        clusterOsiIds.add(a.osi_referencia_id);
      } else if (a.osi_referencia_id === osiId) {
        parentOsiId = osiId;
        clusterOsiIds.add(a.osi_id);
      }
    }

    // If current OSI is a child, query sibling adjustments of the same parent
    if (parentOsiId && parentOsiId !== osiId) {
      const { data: siblingAjustes } = await supabase
        .from("capacitacion_indicadores_ajustes")
        .select("osi_id, osi_referencia_id, nro_osi_referencia")
        .eq("osi_referencia_id", parentOsiId);

      for (const s of siblingAjustes || []) {
        if (s.osi_id) clusterOsiIds.add(s.osi_id);
      }
    }

    const allGroupOsiIds = Array.from(clusterOsiIds);

    // 3. Fetch related OSIs info for group display
    const { data: relatedOsisRaw } = await supabase
      .from("v_osi_formato_completo")
      .select("id_osi, nro_osi, nombre_empresa, servicio")
      .in("id_osi", allGroupOsiIds);

    const osiNroMap = new Map<number, string>();
    for (const ro of relatedOsisRaw || []) {
      if (ro.id_osi && ro.nro_osi) osiNroMap.set(ro.id_osi, ro.nro_osi);
    }
    if (!osiNroMap.has(osiId) && osiData.nro_osi) {
      osiNroMap.set(osiId, osiData.nro_osi);
    }

    // 4. Parallel queries across all group members: passing grade, assignments, attachments, participants, ack, feriados
    const [
      courseRes,
      assignmentRowsRes,
      attachmentRowsRes,
      participantRowsRes,
      ackRowsRes,
      holidays,
    ] = await Promise.all([
      osiData.id_servicio
        ? supabase
            .from("catalogo_servicios")
            .select("id, nombre, nota_aprobatoria")
            .eq("id", osiData.id_servicio)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("facilitador_osi_assignments")
        .select("osi_id, facilitador_id, attachment_received, facilitadores(id, nombre_apellido, cedula, email, telefono)")
        .in("osi_id", allGroupOsiIds)
        .eq("is_active", true),
      supabase
        .from("ejecucion_osi_asistencia")
        .select("*")
        .in("osi_id", allGroupOsiIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("ejecucion_osi_participantes")
        .select("*")
        .in("osi_id", allGroupOsiIds)
        .order("id", { ascending: true }),
      supabase
        .from("facilitador_acknowledgments")
        .select("osi_id, acknowledged_at, disclaimer_text")
        .in("osi_id", allGroupOsiIds),
      getFeriadosSet(),
    ]);

    // Passing score threshold (defaults to 14/20 if unconfigured)
    const notaAprobatoria = courseRes.data?.nota_aprobatoria ?? 14;

    // Resolve facilitator info (with group fallback)
    const assignmentsList = assignmentRowsRes.data || [];
    let primaryAssignment = assignmentsList.find((a) => a.osi_id === osiId);
    if (!primaryAssignment && parentOsiId) {
      primaryAssignment = assignmentsList.find((a) => a.osi_id === parentOsiId);
    }
    if (!primaryAssignment && assignmentsList.length > 0) {
      primaryAssignment = assignmentsList[0];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const facRecord: any = primaryAssignment?.facilitadores;
    const isAnyAttachmentReceived = assignmentsList.some((a) => Boolean(a.attachment_received));

    const facilitador = {
      id: primaryAssignment?.facilitador_id ?? null,
      nombre_apellido: facRecord?.nombre_apellido || "Sin asignar",
      cedula: facRecord?.cedula || null,
      email: facRecord?.email || null,
      telefono: facRecord?.telefono || null,
      attachmentReceived: isAnyAttachmentReceived,
    };

    // Process pooled attachments and generate public URLs
    const rawAttachments = attachmentRowsRes.data || [];
    const attachments: AuditAttachment[] = rawAttachments.map((u) => {
      const {
        data: { publicUrl },
      } = supabase.storage.from("facilitador-uploads").getPublicUrl(u.storage_path);

      const fileOsiNro = osiNroMap.get(u.osi_id) || `OSI-${u.osi_id}`;

      return {
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
        originOsiNro: fileOsiNro,
        isSharedFromGroup: u.osi_id !== osiId,
      };
    });

    // Process participants (from portal execution table first across group, fallback to certificates)
    const rawParticipants = participantRowsRes.data || [];
    let participants: OsiAuditParticipant[] = [];

    if (rawParticipants.length > 0) {
      participants = rawParticipants.map((p) => {
        const numScore = p.score !== null && p.score !== "" ? Number(p.score) : null;
        const isPassing = numScore !== null && !isNaN(numScore) ? numScore >= notaAprobatoria : false;
        const partOsiNro = osiNroMap.get(p.osi_id) || (p.osi_id ? `OSI-${p.osi_id}` : undefined);

        return {
          id: p.id,
          nombre_apellido: p.nombre_apellido || "Sin Nombre",
          cedula: p.cedula || "",
          score: p.score ?? null,
          status: p.status || null,
          isPassing,
          source: "ejecucion_portal" as const,
          osi_id: p.osi_id,
          nro_osi: partOsiNro,
        };
      });
    } else {
      // Query certificates using numeric sequence numbers of all group OSIs
      const numericOsis: number[] = [];
      for (const gId of allGroupOsiIds) {
        const nroStr = osiNroMap.get(gId);
        if (nroStr) {
          const num = parseInt(nroStr.replace(/\D/g, ""), 10);
          if (Number.isFinite(num)) numericOsis.push(num);
        }
      }

      if (numericOsis.length > 0) {
        const { data: certList } = await supabase
          .from("certificados")
          .select(`
            id,
            calificacion,
            nro_osi,
            participantes_certificados (
              id,
              nombre,
              cedula
            )
          `)
          .in("nro_osi", numericOsis)
          .order("id", { ascending: true });

        if (certList && certList.length > 0) {
          participants = certList.map((c) => {
            const numScore = c.calificacion !== null ? Number(c.calificacion) : null;
            const isPassing = numScore !== null && !isNaN(numScore) ? numScore >= notaAprobatoria : false;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const partObj: any = Array.isArray(c.participantes_certificados)
              ? c.participantes_certificados[0]
              : c.participantes_certificados;

            return {
              id: c.id,
              nombre_apellido: partObj?.nombre || "Sin Nombre",
              cedula: partObj?.cedula || "",
              score: c.calificacion ?? null,
              status: "certificado",
              isPassing,
              source: "certificados" as const,
              nro_osi: c.nro_osi != null ? String(c.nro_osi) : undefined,
            };
          });
        }
      }
    }

    // Calculate participant grade metrics
    const numericScores = participants
      .map((p) => (p.score !== null && p.score !== "" ? Number(p.score) : NaN))
      .filter((s) => !isNaN(s));

    const totalParticipants = participants.length;
    const evaluatedCount = numericScores.length;
    const passingCount = participants.filter((p) => p.isPassing).length;
    const failingCount = numericScores.filter((s) => s < notaAprobatoria).length;
    const averageScore =
      evaluatedCount > 0
        ? Number((numericScores.reduce((acc, s) => acc + s, 0) / evaluatedCount).toFixed(1))
        : null;
    const highestScore = evaluatedCount > 0 ? Math.max(...numericScores) : null;
    const lowestScore = evaluatedCount > 0 ? Math.min(...numericScores) : null;

    // Attachment flags (pooled across group)
    const hasGradeSheet = attachments.some((a) => a.category === "hoja_calificacion");
    const hasAttendanceList = attachments.some((a) => a.category === "lista_asistencia");
    const hasPhotos = attachments.some((a) => a.category === "material_fotografico");
    const isComplete = hasGradeSheet && hasAttendanceList && hasPhotos && facilitador.attachmentReceived;

    // Timing metrics
    let fechaCargaSoportes: string | null = null;
    let diasCargaFacilitador: number | null = null;
    let diasDesdeEjecucion: number | null = null;

    if (attachments.length > 0) {
      const dates = attachments.map((a) => a.created_at).filter(Boolean).sort();
      fechaCargaSoportes = dates[dates.length - 1] ?? null;
    }

    const execDateStr = (osiData.fecha_inicio_real as string | null) || null;
    if (execDateStr) {
      const execDate = parseDate(execDateStr);
      const nowDate = new Date();
      if (fechaCargaSoportes) {
        diasCargaFacilitador = businessDaysInclusive(execDate, parseDate(fechaCargaSoportes), holidays);
      }
      if (execDate <= nowDate) {
        diasDesdeEjecucion = businessDaysInclusive(execDate, nowDate, holidays);
      }
    }

    // Acknowledgment (current or group parent)
    const ackList = ackRowsRes.data || [];
    const matchedAck = ackList.find((a) => a.osi_id === osiId) || ackList[0] || null;

    // Assemble group info
    const isGroup = allGroupOsiIds.length > 1;
    const groupInfo: OsiGroupInfo = {
      isGroup,
      isChild: Boolean(parentOsiId && parentOsiId !== osiId),
      isParent: Boolean(parentOsiId === osiId && isGroup),
      parentOsiId,
      parentNroOsi: parentNroOsi || (parentOsiId ? osiNroMap.get(parentOsiId) || null : null),
      relatedOsis: (relatedOsisRaw || []).map((ro) => ({
        id_osi: ro.id_osi,
        nro_osi: ro.nro_osi || `OSI-${ro.id_osi}`,
        nombre_empresa: ro.nombre_empresa || "",
        servicio: ro.servicio || "",
        isCurrent: ro.id_osi === osiId,
        isParent: ro.id_osi === (parentOsiId || osiId),
        uploadsCount: rawAttachments.filter((a) => a.osi_id === ro.id_osi).length,
        participantsCount: rawParticipants.filter((p) => p.osi_id === ro.id_osi).length,
      })),
    };

    return {
      data: {
        osi: {
          id_osi: osiData.id_osi,
          nro_osi: osiData.nro_osi || `OSI-${osiData.id_osi}`,
          nombre_empresa: osiData.nombre_empresa || "Empresa no especificada",
          servicio: osiData.servicio || "Capacitación",
          id_servicio: osiData.id_servicio || null,
          fecha_inicio_real: osiData.fecha_inicio_real || null,
          fecha_fin_real: osiData.fecha_fin_real || null,
          tipo_servicio: osiData.tipo_servicio || null,
          modalidad: osiData.modalidad || null,
          duracion_horas: osiData.duracion_horas || osiData.horas_teoricas || null,
          id_sede: osiData.id_sede || null,
          sede_nombre: osiData.sede_nombre || null,
          direccion_ejecucion: osiData.direccion || osiData.direccion_ejecucion || null,
        },
        facilitador,
        notaAprobatoria,
        attachments,
        participants,
        acknowledgment: matchedAck
          ? {
              acknowledged_at: matchedAck.acknowledged_at,
              disclaimer_text: matchedAck.disclaimer_text,
            }
          : null,
        groupInfo,
        stats: {
          totalParticipants,
          evaluatedCount,
          passingCount,
          failingCount,
          averageScore,
          highestScore,
          lowestScore,
          hasGradeSheet,
          hasAttendanceList,
          hasPhotos,
          isComplete,
          fechaCargaSoportes,
          diasCargaFacilitador,
          diasDesdeEjecucion,
        },
      },
    };
  } catch (err: unknown) {
    console.error("[getOsiAuditDetail] Unexpected error:", err);
    return {
      error: err instanceof Error ? err.message : "Error al cargar detalle de auditoría",
    };
  }
}
