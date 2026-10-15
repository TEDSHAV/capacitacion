"use server";

import { createAdminClient } from "@/utils/supabase/server";
import { businessDaysInclusive, parseDate } from "@/lib/business-days";
import { toTitleCase } from "@/utils/string-utils";

export type AlertaPrioridad = "urgente" | "alta" | "media" | "normal";

export type CategoriaAlerta =
  | "lista_para_emitir" // Facilitator data is received, awaiting certificate generation!
  | "vencida_72h"       // Execution happened > 3 business days ago, no certs generated
  | "en_riesgo"         // Approaching 72h deadline (day 2 or 3)
  | "esperando_facilitador"; // Executed, but facilitator hasn't uploaded attendance list yet

export interface OsiAlertaCertificado {
  osiId: number;
  nroOsi: string;
  nombreEmpresa: string;
  servicio: string;
  ciudad: string | null;
  fechaEjecucion: string; // YYYY-MM-DD
  diasHabiles: number;
  diasCalendario: number;
  plazoVencido: boolean;
  brechaDias: number; // diasHabiles - 3
  enRiesgo: boolean;
  dataRecibidaFacilitador: boolean;
  archivosSubidosCount: number;
  tiposArchivos: string[];
  facilitadorNombre: string | null;
  sesionesCount: number;
  prioridad: AlertaPrioridad;
  categoriaAlerta: CategoriaAlerta;
  isParentService?: boolean;
  isChildService?: boolean;
  groupOsiCount?: number;
  groupNroOsis?: string[];
  parentNroOsi?: string | null;
}

export interface AlertasCertificadosResumen {
  totalPendientes: number;
  totalListasParaEmitir: number;
  totalVencidas72h: number;
  totalEnRiesgo: number;
  totalEsperandoFacilitador: number;
  items: OsiAlertaCertificado[];
  ultimoCalculo: string;
}

/** Returns current date in Venezuela timezone (America/Caracas, UTC-4) as YYYY-MM-DD */
function getCaracasTodayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const PLAZO_BUSINESS_DAYS = 3;
const IN_CHUNK_SIZE = 100;

function formatChunkError(err: unknown): string {
  if (!err) return "Unknown error";
  if (err instanceof Error) {
    return `${err.name}: ${err.message}${err.stack ? `\n${err.stack}` : ""}`;
  }
  if (typeof err === "object") {
    const o = err as Record<string, unknown>;
    const parts: string[] = [];
    if (o.message) parts.push(`message: ${o.message}`);
    if (o.code) parts.push(`code: ${o.code}`);
    if (o.details) parts.push(`details: ${o.details}`);
    if (o.hint) parts.push(`hint: ${o.hint}`);
    if (parts.length > 0) return parts.join(" | ");
    try {
      return JSON.stringify(err, Object.getOwnPropertyNames(err));
    } catch {
      return String(err);
    }
  }
  return String(err);
}

async function chunkedIn<T>(
  label: string,
  ids: number[],
  fetcher: (chunk: number[]) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  if (ids.length === 0) return [];
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + IN_CHUNK_SIZE));
  }
  const results = await Promise.all(
    chunks.map(async (chunk, index) => {
      try {
        let res = await fetcher(chunk);
        if (res.error) {
          // Fast retry once after brief delay for transient network/socket glitches
          await new Promise((r) => setTimeout(r, 200));
          res = await fetcher(chunk);
        }
        if (res.error) {
          console.error(
            `[alertas-certificados] chunk error on '${label}' (chunk ${index + 1}/${chunks.length}, ${chunk.length} items):`,
            formatChunkError(res.error),
          );
          return [];
        }
        return res.data || [];
      } catch (err) {
        console.error(
          `[alertas-certificados] chunk exception on '${label}' (chunk ${index + 1}/${chunks.length}):`,
          formatChunkError(err),
        );
        return [];
      }
    }),
  );
  return results.flat();
}

/**
 * Fetches all OSIs that have reached or passed their execution date,
 * but still do not have certificates generated.
 * Cross-references facilitator uploads, process steps, and 72-hour business-day indicator.
 */
export async function getAlertasCertificadosPendientes(): Promise<AlertasCertificadosResumen> {
  const emptyResumen: AlertasCertificadosResumen = {
    totalPendientes: 0,
    totalListasParaEmitir: 0,
    totalVencidas72h: 0,
    totalEnRiesgo: 0,
    totalEsperandoFacilitador: 0,
    items: [],
    ultimoCalculo: new Date().toISOString(),
  };

  try {
    const supabase = await createAdminClient();
    
    // Fetch holidays, cities catalog, and OSIs in parallel — they are independent queries
    const [feriadosResult, ciudadesResult, osisResult] = await Promise.all([
      // Venezuelan holidays for business day calculations
      supabase.from("cat_feriados_venezuela").select("fecha"),
      // Venezuelan cities catalog for resolving city names
      supabase.from("cat_ciudades").select("id, nombre_ciudad"),
      // Capacitacion OSIs (exclude pending PEN-)
      // Order by fecha_inicio_real descending — most recent operational horizon (up to 400 OSIs)
      supabase
        .from("v_osi_formato_completo")
        .select(
          "id_osi, nro_osi, nombre_empresa, servicio, fecha_inicio_real, fecha_fin_real, tipo_servicio, id_estatus, sesiones_ejecucion, id_ciudad_direccion_ejecucion_efectiva, id_ciudad_direccion_contrato",
        )
        .ilike("tipo_servicio", "%capacitacion%")
        .not("nro_osi", "ilike", "%PEN-%")
        .order("fecha_inicio_real", { ascending: false, nullsFirst: false })
        .limit(400),
    ]);

    const holidays = new Set((feriadosResult.data || []).map((r: { fecha: string }) => r.fecha));
    const cityMap = new Map<number, string>(
      (ciudadesResult.data || []).map((c: { id: number; nombre_ciudad: string }) => [c.id, c.nombre_ciudad]),
    );

    const todayStr = getCaracasTodayStr();
    const todayDate = parseDate(todayStr);

    const osisRaw = osisResult.data;
    const osisErr = osisResult.error;

    if (osisErr || !osisRaw || osisRaw.length === 0) {
      if (osisErr) console.error("[alertas-certificados] Error fetching OSIs:", osisErr);
      return emptyResumen;
    }

    const osis = osisRaw.filter((o) => o.id_osi != null);
    const osiIds = osis.map((o) => o.id_osi as number);

    // 2. Map osiId -> numeric nro_osi_secuencial (used by certificados.nro_osi)
    // and load adjustments from capacitacion_indicadores_ajustes (grouping / multi-OSI links)
    interface AjusteRow {
      osi_id: number;
      fecha_ejecucion: string | null;
      fecha_emision: string | null;
      motivo: string | null;
      emitido_en_otra_osi: boolean | null;
      osi_referencia_id: number | null;
      nro_osi_referencia: string | null;
    }

    const [ejecRows, ajusteRows] = await Promise.all([
      chunkedIn<{ id: number; nro_osi_secuencial: string | number | null }>(
        "ejecucion_osi",
        osiIds,
        (chunk) =>
          supabase.from("ejecucion_osi").select("id, nro_osi_secuencial").in("id", chunk),
      ),
      chunkedIn<AjusteRow>(
        "capacitacion_indicadores_ajustes",
        osiIds,
        (chunk) =>
          supabase
            .from("capacitacion_indicadores_ajustes")
            .select("osi_id, fecha_ejecucion, fecha_emision, motivo, emitido_en_otra_osi, osi_referencia_id, nro_osi_referencia")
            .in("osi_id", chunk),
      ),
    ]);

    const numericOsiByOsiId = new Map<number, number>();
    for (const e of ejecRows) {
      if (e.nro_osi_secuencial != null) {
        const n = typeof e.nro_osi_secuencial === "number"
          ? e.nro_osi_secuencial
          : parseInt(String(e.nro_osi_secuencial), 10);
        if (Number.isFinite(n)) numericOsiByOsiId.set(e.id, n);
      }
    }

    const ajustesByOsi = new Map<number, AjusteRow>();
    for (const a of ajusteRows) {
      ajustesByOsi.set(a.osi_id, a);
    }

    // Resolve any parent OSIs referenced by child OSIs that might not be in the initial osiIds
    const missingRefOsiIds = ajusteRows
      .map((a) => a.osi_referencia_id)
      .filter((id): id is number => id != null && !numericOsiByOsiId.has(id));

    if (missingRefOsiIds.length > 0) {
      const extEjecRows = await chunkedIn<{ id: number; nro_osi_secuencial: string | number | null }>(
        "ejecucion_osi_parents",
        missingRefOsiIds,
        (chunk) =>
          supabase.from("ejecucion_osi").select("id, nro_osi_secuencial").in("id", chunk),
      );
      for (const e of extEjecRows) {
        if (e.nro_osi_secuencial != null) {
          const n = typeof e.nro_osi_secuencial === "number"
            ? e.nro_osi_secuencial
            : parseInt(String(e.nro_osi_secuencial), 10);
          if (Number.isFinite(n)) numericOsiByOsiId.set(e.id, n);
        }
      }
    }

    // Also include numeric OSIs parsed from nro_osi_referencia text (e.g. "3583" or "OSI-3583")
    const extraParentNumericOsis: number[] = [];
    for (const a of ajusteRows) {
      if (a.nro_osi_referencia) {
        const m = a.nro_osi_referencia.match(/\d+/);
        if (m) {
          const parsed = parseInt(m[0], 10);
          if (Number.isFinite(parsed)) extraParentNumericOsis.push(parsed);
        }
      }
    }

    const numericOsis = Array.from(new Set([...numericOsiByOsiId.values(), ...extraParentNumericOsis]));

    // 3. Parallel fetch: sessions, certificates, facilitator uploads, assignments, and process steps
    const [sesionRows, certRows, uploadRows, assignmentRows, stepRows] = await Promise.all([
      // Sessions
      chunkedIn<{ id_osi: number; nro_sesion: number; fecha: string | null; fecha_ejecutada: string | null }>(
        "osi_sesion",
        osiIds,
        (chunk) =>
          supabase
            .from("osi_sesion")
            .select("id_osi, nro_sesion, fecha, fecha_ejecutada")
            .in("id_osi", chunk),
      ),
      // Existing Certificates
      chunkedIn<{ nro_osi: number | null }>(
        "certificados",
        numericOsis,
        (chunk) =>
          supabase.from("certificados").select("nro_osi").in("nro_osi", chunk),
      ),
      // Uploaded attachments by facilitator (ejecucion_osi_asistencia)
      chunkedIn<{ osi_id: number; category: string; file_name: string }>(
        "ejecucion_osi_asistencia",
        osiIds,
        (chunk) =>
          supabase
            .from("ejecucion_osi_asistencia")
            .select("osi_id, category, file_name")
            .in("osi_id", chunk),
      ),
      // Facilitator assignments and attachment_received toggle
      chunkedIn<{
        osi_id: number;
        facilitador_id: number;
        attachment_received: boolean | null;
        facilitadores: any;
      }>(
        "facilitador_osi_assignments",
        osiIds,
        (chunk) =>
          supabase
            .from("facilitador_osi_assignments")
            .select("osi_id, facilitador_id, attachment_received, facilitadores(nombre_apellido)")
            .in("osi_id", chunk),
      ),
      // Proceso steps (lista_asistencia, calificacion, elaboracion_certificados)
      chunkedIn<{ osi_id: number; step_key: string; completed: boolean }>(
        "capacitacion_proceso_steps",
        osiIds,
        (chunk) =>
          supabase
            .from("capacitacion_proceso_steps")
            .select("osi_id, step_key, completed")
            .in("osi_id", chunk)
            .in("step_key", ["lista_asistencia", "calificacion", "elaboracion_certificados"]),
      ),
    ]);

    // Build lookup of OSIs that ALREADY have certificates
    const osisWithCertificates = new Set<number>();
    for (const c of certRows) {
      if (c.nro_osi != null) osisWithCertificates.add(c.nro_osi);
    }

    // Sessions lookup: find max execution date per OSI
    const maxSesionFechaByOsi = new Map<number, string>();
    const sessionCountByOsi = new Map<number, number>();
    for (const s of sesionRows) {
      const d = s.fecha_ejecutada ?? s.fecha;
      if (d) {
        const cur = maxSesionFechaByOsi.get(s.id_osi);
        if (!cur || d > cur) {
          maxSesionFechaByOsi.set(s.id_osi, d);
        }
      }
      sessionCountByOsi.set(s.id_osi, (sessionCountByOsi.get(s.id_osi) || 0) + 1);
    }

    // Facilitator uploads lookup
    const uploadsByOsi = new Map<number, { count: number; categories: Set<string> }>();
    for (const u of uploadRows) {
      let entry = uploadsByOsi.get(u.osi_id);
      if (!entry) {
        entry = { count: 0, categories: new Set() };
        uploadsByOsi.set(u.osi_id, entry);
      }
      entry.count++;
      if (u.category) entry.categories.add(u.category);
    }

    // Assignments lookup (facilitator name + attachment_received flag)
    const assignmentInfoByOsi = new Map<
      number,
      { facilitadorNombre: string | null; attachmentReceived: boolean }
    >();
    for (const a of assignmentRows) {
      const existing = assignmentInfoByOsi.get(a.osi_id);
      const rawFacName = Array.isArray(a.facilitadores)
        ? a.facilitadores[0]?.nombre_apellido || null
        : a.facilitadores?.nombre_apellido || null;
      const facName = rawFacName ? toTitleCase(rawFacName) : null;
      const isReceived = !!a.attachment_received;
      if (!existing) {
        assignmentInfoByOsi.set(a.osi_id, {
          facilitadorNombre: facName,
          attachmentReceived: isReceived,
        });
      } else {
        if (isReceived) existing.attachmentReceived = true;
        if (!existing.facilitadorNombre && facName) existing.facilitadorNombre = facName;
      }
    }

    // Proceso steps lookup
    const stepsCompletedByOsi = new Map<number, Set<string>>();
    for (const st of stepRows) {
      if (st.completed) {
        let set = stepsCompletedByOsi.get(st.osi_id);
        if (!set) {
          set = new Set();
          stepsCompletedByOsi.set(st.osi_id, set);
        }
        set.add(st.step_key);
      }
    }

    // 4. Filter and build alert items
    const alertItems: OsiAlertaCertificado[] = [];

    // Pre-map child OSIs grouped under their parent OSI
    const childrenByParentId = new Map<number, string[]>();
    for (const a of ajusteRows) {
      if (a.osi_referencia_id) {
        const childOsi = osis.find((o) => o.id_osi === a.osi_id);
        const childNro = childOsi?.nro_osi || `OSI-${a.osi_id}`;
        const list = childrenByParentId.get(a.osi_referencia_id) || [];
        if (!list.includes(childNro)) list.push(childNro);
        childrenByParentId.set(a.osi_referencia_id, list);
      }
    }

    for (const osi of osis) {
      const osiId = osi.id_osi!;
      const numericOsi = numericOsiByOsiId.get(osiId);
      const ajuste = ajustesByOsi.get(osiId);

      // Check if certificates already exist for this OSI directly
      let hasCerts = numericOsi ? osisWithCertificates.has(numericOsi) : false;

      // Grouping / Otra OSI detection:
      // If this OSI is grouped with a parent OSI, check if the parent OSI has certificates issued.
      // If parent has certificates, this child OSI must NOT be listed as pending!
      const isEmitidoEnOtraOsi =
        Boolean(ajuste?.emitido_en_otra_osi) ||
        Boolean(ajuste?.osi_referencia_id) ||
        Boolean(ajuste?.nro_osi_referencia) ||
        Boolean(ajuste?.motivo && /emitid[oa]s?\s+en\s+osi/i.test(ajuste.motivo));

      let parentNumericOsi: number | null = null;
      if (ajuste?.osi_referencia_id) {
        parentNumericOsi = numericOsiByOsiId.get(ajuste.osi_referencia_id) ?? null;
      }
      if (!parentNumericOsi && ajuste?.nro_osi_referencia) {
        const m = ajuste.nro_osi_referencia.match(/\d+/);
        if (m) parentNumericOsi = parseInt(m[0], 10);
      }

      if (!hasCerts && isEmitidoEnOtraOsi) {
        // If parent OSI has certificates issued, then child OSI is covered
        if (parentNumericOsi && osisWithCertificates.has(parentNumericOsi)) {
          hasCerts = true;
        } else if (ajuste?.fecha_emision) {
          // If child was given an adjusted emission date, certificates were emitted
          hasCerts = true;
        } else if (ajuste?.emitido_en_otra_osi && !ajuste?.osi_referencia_id && !ajuste?.nro_osi_referencia) {
          // Flagged manually as emitted in another OSI without specific reference
          hasCerts = true;
        }
      }

      if (hasCerts) continue; // Already has certificates (directly or via parent OSI), skip!

      // If this is a child OSI in a service group whose certificates are pending,
      // it should NOT create a duplicate alert because the primary parent OSI
      // represents the service in the notification center.
      if (ajuste?.osi_referencia_id || (ajuste?.emitido_en_otra_osi && parentNumericOsi)) {
        continue;
      }

      // Determine effective execution date:
      // Prefer manual adjustment date, then max session date (fecha_ejecutada or planned fecha), then fallback to fecha_fin_real or fecha_inicio_real
      const fechaEjecucion =
        ajuste?.fecha_ejecucion ||
        maxSesionFechaByOsi.get(osiId) ||
        osi.fecha_fin_real ||
        osi.fecha_inicio_real ||
        null;

      // If no date at all, we cannot evaluate execution
      if (!fechaEjecucion) continue;

      const execDate = parseDate(fechaEjecucion);

      // Only evaluate OSIs whose execution date has arrived or passed (<= today)
      if (execDate > todayDate) {
        continue; // Scheduled for the future, not yet executed!
      }

      // If the OSI has been marked as fully processed ("elaboracion_certificados" completed), skip
      const completedSteps = stepsCompletedByOsi.get(osiId) || new Set();
      // Notice: if elaboracion_certificados was marked complete, it means certificates were produced or distributed
      if (completedSteps.has("elaboracion_certificados")) {
        continue;
      }

      // Calculate business days elapsed from execution date to today
      const diasHabiles = businessDaysInclusive(execDate, todayDate, holidays);
      const diasCalendario = Math.max(
        0,
        Math.floor((todayDate.getTime() - execDate.getTime()) / (1000 * 60 * 60 * 24)),
      );

      const plazoVencido = diasHabiles > PLAZO_BUSINESS_DAYS;
      const brechaDias = diasHabiles - PLAZO_BUSINESS_DAYS;
      const enRiesgo = diasHabiles === 2 || diasHabiles === 3;

      // Check facilitator data receipt (strictly requires attendance list or grades):
      const uploadInfo = uploadsByOsi.get(osiId);
      const assignmentInfo = assignmentInfoByOsi.get(osiId);

      const hasAttendanceOrGradeUpload = uploadInfo
        ? uploadInfo.categories.has("lista_asistencia") ||
          uploadInfo.categories.has("hoja_calificacion") ||
          uploadInfo.categories.has("lista_participantes")
        : false;
      const hasAttachmentFlag = assignmentInfo?.attachmentReceived || false;
      const hasStepLista = completedSteps.has("lista_asistencia");
      const hasStepCalif = completedSteps.has("calificacion");

      // Strictly true ONLY when attendance list, grades, or confirmed attachment has been received
      const dataRecibidaFacilitador =
        hasAttendanceOrGradeUpload || hasAttachmentFlag || hasStepLista || hasStepCalif;

      const tiposArchivos = uploadInfo ? Array.from(uploadInfo.categories) : [];
      if (hasStepLista && !tiposArchivos.includes("lista_asistencia")) {
        tiposArchivos.push("lista_asistencia");
      }
      if (hasStepCalif && !tiposArchivos.includes("hoja_calificacion")) {
        tiposArchivos.push("hoja_calificacion");
      }

      // Classify alert category:
      let categoriaAlerta: CategoriaAlerta;
      let prioridad: AlertaPrioridad;

      if (dataRecibidaFacilitador) {
        // Facilitator submitted data, but certificates haven't been generated!
        categoriaAlerta = "lista_para_emitir";
        if (plazoVencido) {
          prioridad = "urgente";
        } else if (enRiesgo) {
          prioridad = "alta";
        } else {
          prioridad = "alta";
        }
      } else if (plazoVencido) {
        categoriaAlerta = "vencida_72h";
        prioridad = "urgente";
      } else if (enRiesgo) {
        categoriaAlerta = "en_riesgo";
        prioridad = "media";
      } else {
        categoriaAlerta = "esperando_facilitador";
        prioridad = "normal";
      }

      const cityId =
        (osi as any).id_ciudad_direccion_ejecucion_efectiva ??
        (osi as any).id_ciudad_direccion_contrato ??
        null;
      const ciudad = cityId ? cityMap.get(cityId) || null : null;

      const linkedChildren = childrenByParentId.get(osiId) || [];
      const isParentService = linkedChildren.length > 0;
      const groupOsiCount = isParentService ? linkedChildren.length + 1 : undefined;
      const groupNroOsis = isParentService ? [osi.nro_osi || `OSI-${osiId}`, ...linkedChildren] : undefined;

      alertItems.push({
        osiId,
        nroOsi: osi.nro_osi || `OSI-${osiId}`,
        nombreEmpresa: osi.nombre_empresa || "Sin Empresa",
        servicio: osi.servicio || "Servicio de Capacitación",
        ciudad,
        fechaEjecucion,
        diasHabiles,
        diasCalendario,
        plazoVencido,
        brechaDias,
        enRiesgo,
        dataRecibidaFacilitador,
        archivosSubidosCount: uploadInfo?.count || 0,
        tiposArchivos,
        facilitadorNombre: assignmentInfo?.facilitadorNombre || null,
        sesionesCount: sessionCountByOsi.get(osiId) || osi.sesiones_ejecucion || 1,
        prioridad,
        categoriaAlerta,
        isParentService,
        groupOsiCount,
        groupNroOsis,
      });
    }

    // 5. Sort alert items intelligently:
    // Priority order:
    // 1. Urgente (Vencida con data recibida)
    // 2. Lista para emitir (Data recibida dentro de plazo)
    // 3. Vencida sin data (Requiere seguimiento con facilitador)
    // 4. En riesgo
    // 5. Normal
    const PRIORITY_WEIGHT: Record<AlertaPrioridad, number> = {
      urgente: 4,
      alta: 3,
      media: 2,
      normal: 1,
    };

    alertItems.sort((a, b) => {
      // 1st: Data recibida wins over waiting
      if (a.dataRecibidaFacilitador !== b.dataRecibidaFacilitador) {
        return a.dataRecibidaFacilitador ? -1 : 1;
      }
      // 2nd: Highest priority weight
      const weightDiff = PRIORITY_WEIGHT[b.prioridad] - PRIORITY_WEIGHT[a.prioridad];
      if (weightDiff !== 0) return weightDiff;
      // 3rd: Most overdue (highest brechaDias or diasHabiles)
      if (b.diasHabiles !== a.diasHabiles) return b.diasHabiles - a.diasHabiles;
      // 4th: Most recent execution date
      return b.fechaEjecucion.localeCompare(a.fechaEjecucion);
    });

    // 6. Compute summary counts
    const totalListasParaEmitir = alertItems.filter(
      (i) => i.categoriaAlerta === "lista_para_emitir",
    ).length;
    const totalVencidas72h = alertItems.filter(
      (i) => i.plazoVencido,
    ).length;
    const totalEnRiesgo = alertItems.filter(
      (i) => i.enRiesgo && !i.plazoVencido,
    ).length;
    const totalEsperandoFacilitador = alertItems.filter(
      (i) => !i.dataRecibidaFacilitador,
    ).length;

    return {
      totalPendientes: alertItems.length,
      totalListasParaEmitir,
      totalVencidas72h,
      totalEnRiesgo,
      totalEsperandoFacilitador,
      items: alertItems,
      ultimoCalculo: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[getAlertasCertificadosPendientes] Unexpected error:", err);
    return emptyResumen;
  }
}
