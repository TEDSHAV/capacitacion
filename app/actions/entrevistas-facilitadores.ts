"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { getCurrentUserUsuarioId } from "./requisiciones";
import { toLowerCase } from "@/utils/string-utils";
import type {
  FacilitadorEntrevista,
  FacilitadorEntrevistaPayload,
  EntrevistaMetrics,
  EntrevistaMonthOption,
  EntrevistaEstatus,
  FacilitadorPostulacionToken,
  CreatePostulacionTokenInput,
  PublicTokenValidation,
  CandidatoPostulacionPayload,
} from "@/types/entrevistas-facilitadores";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export interface GetEntrevistasOptions {
  mes?: string; // "YYYY-MM"
  estatus?: string; // "pendiente" | "aprobado" | "rechazado" | "todas"
  busqueda?: string;
  sortBy?: "recientes" | "antiguos" | "nombre";
}

/**
 * Fetch all interviews matching filters, along with global metrics and available month filters.
 */
export async function getEntrevistasList(options: GetEntrevistasOptions = {}) {
  try {
    const supabase = await createClient();

    // Fetch all interviews with linked facilitador
    let query = supabase
      .from("facilitador_entrevistas")
      .select(
        `
        *,
        facilitadores (
          id,
          nombre_apellido,
          cedula,
          is_active
        )
      `
      );

    if (options.sortBy === "antiguos") {
      query = query.order("fecha_entrevista", { ascending: true });
    } else if (options.sortBy === "nombre") {
      query = query.order("nombre_apellido", { ascending: true });
    } else {
      // Default: most recent first
      query = query.order("fecha_entrevista", { ascending: false });
    }

    const { data: allData, error } = await query;
    if (error) throw error;

    const all = (allData || []) as FacilitadorEntrevista[];

    // Calculate metrics across all data
    const metrics: EntrevistaMetrics = {
      total: all.length,
      pendientes: all.filter((e) => e.estatus === "pendiente").length,
      aprobados: all.filter((e) => e.estatus === "aprobado").length,
      rechazados: all.filter((e) => e.estatus === "rechazado").length,
      promovidos: all.filter((e) => e.facilitador_id !== null).length,
    };

    // Calculate available distinct months with counts
    const monthMap = new Map<string, number>();
    for (const item of all) {
      if (item.fecha_entrevista) {
        const monthKey = item.fecha_entrevista.slice(0, 7); // "YYYY-MM"
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
      }
    }

    const months: EntrevistaMonthOption[] = Array.from(monthMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, count]) => {
        const [yearStr, monthStr] = key.split("-");
        const monthIndex = parseInt(monthStr, 10) - 1;
        const name = MONTH_NAMES[monthIndex] || monthStr;
        return {
          key,
          label: `${name} ${yearStr}`,
          count,
        };
      });

    // Apply filters in memory for instant responsiveness
    let filtered = all;

    const hasBusqueda = Boolean(options.busqueda && options.busqueda.trim());
    const rawQ = hasBusqueda ? options.busqueda!.trim() : "";
    const q = rawQ.toLowerCase();
    const cleanIdQ = q.replace(/^#/, "").trim();
    const digitsOnlyQ = q.replace(/\D/g, "");
    const isHashOrExplicitId = /^#\d+$/.test(rawQ) || /^id\s*:\s*\d+$/i.test(rawQ);
    const targetNumericId = isHashOrExplicitId
      ? parseInt(cleanIdQ.replace(/\D/g, ""), 10)
      : /^\d+$/.test(cleanIdQ)
      ? parseInt(cleanIdQ, 10)
      : null;

    if (hasBusqueda) {
      filtered = filtered.filter((e) => {
        // 1. Direct ID matching: If user explicitly typed #7 or id: 7
        if (isHashOrExplicitId && e.id === targetNumericId) {
          return true;
        }
        if (isHashOrExplicitId) {
          return false;
        }

        // Direct numeric match (e.g. user typed "7")
        if (targetNumericId !== null && e.id === targetNumericId) {
          return true;
        }

        // 2. Cédula match (raw or digits-only to handle dots, dashes, V-)
        if (e.cedula) {
          const cedLower = e.cedula.toLowerCase();
          if (cedLower === q || cedLower.includes(q)) return true;
          const cedDigits = cedLower.replace(/\D/g, "");
          if (digitsOnlyQ.length >= 4 && cedDigits.includes(digitsOnlyQ)) {
            return true;
          }
          if (digitsOnlyQ.length < 4 && cedDigits === digitsOnlyQ) {
            return true;
          }
        }

        // 3. Candidate name
        if ((e.nombre_apellido || "").toLowerCase().includes(q)) return true;

        // 4. Contact
        if ((e.email || "").toLowerCase().includes(q)) return true;
        if ((e.telefono || "").toLowerCase().includes(q)) return true;

        // 5. Education & Background
        if ((e.universitario || "").toLowerCase().includes(q)) return true;
        if ((e.nivel_tecnico || "").toLowerCase().includes(q)) return true;
        if ((e.posee_especializacion || "").toLowerCase().includes(q)) return true;

        // 6. Interviewer & Notes
        if ((e.entrevistado_por || "").toLowerCase().includes(q)) return true;
        if ((e.observaciones || "").toLowerCase().includes(q)) return true;

        // 7. Course capacities/topics
        if (Array.isArray(e.temas_capacidades)) {
          if (e.temas_capacidades.some((t) => (t || "").toLowerCase().includes(q))) {
            return true;
          }
        }

        return false;
      });
    }

    const isIdQuery = isHashOrExplicitId || targetNumericId !== null;

    // Apply month filter (skip month constraint if searching by explicit ID number)
    if (options.mes && options.mes !== "todos") {
      if (!isIdQuery) {
        filtered = filtered.filter(
          (e) => e.fecha_entrevista && e.fecha_entrevista.startsWith(options.mes!)
        );
      }
    }

    // Apply status filter (skip status constraint if searching by explicit ID number)
    if (options.estatus && options.estatus !== "todas" && options.estatus !== "todos") {
      if (!isIdQuery) {
        filtered = filtered.filter((e) => e.estatus === options.estatus);
      }
    }

    return {
      entrevistas: filtered,
      metrics,
      months,
      error: null,
    };
  } catch (err) {
    console.error("Error en getEntrevistasList:", err);
    return {
      entrevistas: [],
      metrics: { total: 0, pendientes: 0, aprobados: 0, rechazados: 0, promovidos: 0 },
      months: [],
      error: err instanceof Error ? err.message : "Error al cargar las entrevistas",
    };
  }
}

/**
 * Get a single interview by ID
 */
export async function getEntrevistaById(id: number) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("facilitador_entrevistas")
      .select(
        `
        *,
        facilitadores (
          id,
          nombre_apellido,
          cedula,
          is_active
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return { entrevista: data as FacilitadorEntrevista, error: null };
  } catch (err) {
    console.error("Error en getEntrevistaById:", err);
    return {
      entrevista: null,
      error: err instanceof Error ? err.message : "Error al cargar la entrevista",
    };
  }
}

/**
 * Save (insert or update) an interview record
 */
export async function saveEntrevista(payload: FacilitadorEntrevistaPayload) {
  try {
    const supabase = await createClient();
    const usuarioId = await getCurrentUserUsuarioId();

    const row: Record<string, unknown> = {
      nombre_apellido: payload.nombre_apellido.trim(),
      cedula: payload.cedula?.trim() || null,
      telefono: payload.telefono?.trim() || null,
      email: payload.email?.trim() || null,
      direccion: payload.direccion?.trim() || null,
      posee_vehiculo: Boolean(payload.posee_vehiculo),
      posee_laptop: Boolean(payload.posee_laptop),
      disponibilidad_viajar: Boolean(payload.disponibilidad_viajar),

      nivel_tecnico: payload.nivel_tecnico?.trim() || null,
      universitario: payload.universitario?.trim() || null,
      posee_especializacion: payload.posee_especializacion?.trim() || null,
      ultimo_curso_tiempo: payload.ultimo_curso_tiempo || null,
      ultimo_curso_descripcion: payload.ultimo_curso_descripcion?.trim() || null,
      manejo_herramientas_audiovisuales: payload.manejo_herramientas_audiovisuales || null,

      doc_resumen_curricular: Boolean(payload.doc_resumen_curricular),
      doc_cedula_identidad: Boolean(payload.doc_cedula_identidad),
      doc_soportes_resumen_curricular: Boolean(payload.doc_soportes_resumen_curricular),
      doc_rif_actualizado: Boolean(payload.doc_rif_actualizado),
      doc_registro_inpsasel: Boolean(payload.doc_registro_inpsasel),
      doc_factura_fiscal: Boolean(payload.doc_factura_fiscal),
      doc_titulo_universitario: Boolean(payload.doc_titulo_universitario),
      doc_declaracion_islr: Boolean(payload.doc_declaracion_islr),
      doc_formacion_docente: Boolean(payload.doc_formacion_docente),
      doc_posee_laptop: Boolean(payload.doc_posee_laptop),

      retos_facilitador: payload.retos_facilitador?.trim() || null,
      logros_formacion: payload.logros_formacion?.trim() || null,
      caracteristica_esencial: payload.caracteristica_esencial || null,
      ejemplo_liderazgo: payload.ejemplo_liderazgo?.trim() || null,
      fortalezas: payload.fortalezas?.trim() || null,
      debilidades: payload.debilidades?.trim() || null,
      motivo_trabajar_aqui: payload.motivo_trabajar_aqui?.trim() || null,
      por_que_contratarte: payload.por_que_contratarte?.trim() || null,
      temas_capacidades: payload.temas_capacidades || [],

      fecha_entrevista: payload.fecha_entrevista || new Date().toISOString().split("T")[0],
      entrevistado_por: payload.entrevistado_por?.trim() || null,
      evaluacion_items: payload.evaluacion_items || [],
      observaciones: payload.observaciones?.trim() || null,
      estatus: payload.estatus || "pendiente",
    };

    if (payload.origen) {
      row.origen = payload.origen;
    }

    if (payload.id) {
      // Update
      const { data, error } = await supabase
        .from("facilitador_entrevistas")
        .update(row)
        .eq("id", payload.id)
        .select()
        .single();

      if (error) throw error;
      return { entrevista: data as FacilitadorEntrevista, error: null };
    } else {
      // Insert
      row.creado_por = usuarioId;
      if (!row.origen) {
        row.origen = "interno";
      }
      const { data, error } = await supabase
        .from("facilitador_entrevistas")
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      return { entrevista: data as FacilitadorEntrevista, error: null };
    }
  } catch (err) {
    console.error("Error en saveEntrevista:", err);
    return {
      entrevista: null,
      error: err instanceof Error ? err.message : "Error al guardar la entrevista",
    };
  }
}

/**
 * Quick update of status and observations
 */
export async function updateEntrevistaEstatus(
  id: number,
  estatus: EntrevistaEstatus,
  observaciones?: string
) {
  try {
    const supabase = await createClient();
    const updateData: Record<string, unknown> = { estatus };
    if (observaciones !== undefined) {
      updateData.observaciones = observaciones.trim() || null;
    }

    const { data, error } = await supabase
      .from("facilitador_entrevistas")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { entrevista: data as FacilitadorEntrevista, error: null };
  } catch (err) {
    console.error("Error en updateEntrevistaEstatus:", err);
    return {
      entrevista: null,
      error: err instanceof Error ? err.message : "Error al actualizar el estatus",
    };
  }
}

/**
 * Promote an approved prospect to the facilitadores table.
 * Preserves the interview record, links facilitador_id, and marks promovido_at.
 */
export async function promoverAFacilitador(entrevistaId: number) {
  try {
    const supabase = await createClient();

    // 1. Fetch current interview
    const { data: entrevista, error: fetchErr } = await supabase
      .from("facilitador_entrevistas")
      .select("*")
      .eq("id", entrevistaId)
      .single();

    if (fetchErr || !entrevista) {
      throw new Error("No se encontró la entrevista a promover");
    }

    if (entrevista.facilitador_id) {
      return {
        success: true,
        alreadyPromoted: true,
        facilitadorId: entrevista.facilitador_id,
        error: null,
      };
    }

    const today = new Date().toISOString().split("T")[0];
    const currentYear = new Date().getFullYear();

    // 2. Insert into facilitadores table
    const { data: newFacilitador, error: facErr } = await supabase
      .from("facilitadores")
      .insert([
        {
          nombre_apellido: toLowerCase(entrevista.nombre_apellido),
          cedula: entrevista.cedula || null,
          telefono: entrevista.telefono || null,
          email: entrevista.email || null,
          direccion: entrevista.direccion || null,
          nivel_educacion:
            entrevista.universitario || entrevista.nivel_tecnico || null,
          formacion_docente_certificada: Boolean(
            entrevista.doc_formacion_docente
          ),
          temas_cursos: Array.isArray(entrevista.temas_capacidades)
            ? entrevista.temas_capacidades
            : [],
          tiene_curriculum: Boolean(entrevista.doc_resumen_curricular),
          tiene_certificaciones: Boolean(
            entrevista.doc_soportes_resumen_curricular
          ),
          is_active: true,
          fuente: "Entrevista",
          ano_ingreso: currentYear,
          fecha_ingreso: today,
          notas_observaciones: `Promovido desde Entrevista de Facilitadores (#${entrevista.id}) realizada el ${entrevista.fecha_entrevista}`,
        },
      ])
      .select()
      .single();

    if (facErr || !newFacilitador) {
      throw new Error(`Error al crear el facilitador: ${facErr?.message}`);
    }

    // 3. Update interview record with link and timestamp
    const { data: updatedInterview, error: updateErr } = await supabase
      .from("facilitador_entrevistas")
      .update({
        facilitador_id: newFacilitador.id,
        promovido_at: new Date().toISOString(),
        estatus: "aprobado",
      })
      .eq("id", entrevistaId)
      .select(
        `
        *,
        facilitadores (
          id,
          nombre_apellido,
          cedula,
          is_active
        )
      `
      )
      .single();

    if (updateErr) {
      console.warn("Could not update interview link after creating facilitador:", updateErr);
    }

    return {
      success: true,
      alreadyPromoted: false,
      facilitadorId: newFacilitador.id,
      entrevista: updatedInterview as FacilitadorEntrevista,
      error: null,
    };
  } catch (err) {
    console.error("Error en promoverAFacilitador:", err);
    return {
      success: false,
      alreadyPromoted: false,
      facilitadorId: null,
      entrevista: null,
      error: err instanceof Error ? err.message : "Error al promover a facilitador",
    };
  }
}

/**
 * Delete an interview record
 */
export async function deleteEntrevista(id: number) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("facilitador_entrevistas")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.error("Error en deleteEntrevista:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al eliminar la entrevista",
    };
  }
}

/**
 * Create a new dynamic invitation token for public candidate application (Individual or Campaign)
 */
export async function crearPostulacionToken(input: CreatePostulacionTokenInput = {}) {
  try {
    const usuarioId = await getCurrentUserUsuarioId();
    if (!usuarioId) {
      throw new Error("No autorizado: Debes iniciar sesión");
    }

    const admin = await createAdminClient();
    const token = crypto.randomBytes(24).toString("hex");
    const isCampana = input.tipo === "campana";
    const diasValidez =
      input.dias_validez && input.dias_validez > 0
        ? input.dias_validez
        : isCampana
        ? 30
        : 7;
    const expiresAt = new Date(Date.now() + diasValidez * 24 * 60 * 60 * 1000).toISOString();
    const tituloCampana = isCampana
      ? input.titulo_campana?.trim() || "Convocatoria Abierta de Facilitadores"
      : null;

    let encodedNotas = input.notas?.trim() || "";
    if (isCampana) {
      encodedNotas = `[CAMPAÑA: ${tituloCampana}] ${encodedNotas}`.trim();
    }

    // Try inserting with all fields first (works when migration is applied)
    let insertData: any = null;
    const { data: tryData, error: tryErr } = await admin
      .from("facilitador_postulacion_tokens")
      .insert({
        token,
        tipo: input.tipo || "individual",
        titulo_campana: tituloCampana,
        max_usos: input.max_usos && input.max_usos > 0 ? input.max_usos : null,
        usos_count: 0,
        nombre_candidato: isCampana ? null : input.nombre_candidato?.trim() || null,
        email_candidato: isCampana ? null : input.email_candidato?.trim() || null,
        notas: encodedNotas || null,
        dias_validez: diasValidez,
        expires_at: expiresAt,
        creado_por: usuarioId,
        is_active: true,
      })
      .select()
      .single();

    if (!tryErr && tryData) {
      insertData = tryData;
    } else {
      // Fallback if extra columns don't exist yet in Supabase
      const { data: fbData, error: fbErr } = await admin
        .from("facilitador_postulacion_tokens")
        .insert({
          token,
          nombre_candidato: isCampana ? null : input.nombre_candidato?.trim() || null,
          email_candidato: isCampana ? null : input.email_candidato?.trim() || null,
          notas: encodedNotas || null,
          dias_validez: diasValidez,
          expires_at: expiresAt,
          creado_por: usuarioId,
          is_active: true,
        })
        .select()
        .single();

      if (fbErr) throw fbErr;
      insertData = fbData;
    }

    const tokenObj: FacilitadorPostulacionToken = {
      ...(insertData as FacilitadorPostulacionToken),
      tipo: isCampana ? "campana" : "individual",
      titulo_campana: tituloCampana,
      total_postulaciones: 0,
    };

    // Build URL
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    if (!baseUrl) {
      try {
        const headersList = await headers();
        const host = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost:3000";
        const proto = headersList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
        baseUrl = `${proto}://${host}`;
      } catch {
        baseUrl = "http://localhost:3000";
      }
    }

    const publicUrl = `${baseUrl.replace(/\/$/, "")}/postulacion/${token}`;

    revalidatePath("/dashboard/capacitacion/entrevista-facilitadores");

    return {
      success: true,
      token: tokenObj,
      url: publicUrl,
      error: null,
    };
  } catch (err) {
    console.error("Error en crearPostulacionToken:", err);
    return {
      success: false,
      token: null,
      url: null,
      error: err instanceof Error ? err.message : "Error al generar el enlace de postulación",
    };
  }
}

/**
 * List active and recent invitation tokens with received candidate metrics
 */
export async function getPostulacionTokens() {
  try {
    const usuarioId = await getCurrentUserUsuarioId();
    if (!usuarioId) {
      return { tokens: [], error: "No autorizado" };
    }

    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("facilitador_postulacion_tokens")
      .select(`
        *,
        usuarios:creado_por (
          id,
          nombre_completo
        )
      `)
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) throw error;

    // Fetch received applications counts for each token
    const { data: countData } = await admin
      .from("facilitador_entrevistas")
      .select("postulacion_token_id")
      .not("postulacion_token_id", "is", null);

    const countsMap = new Map<number, number>();
    if (countData) {
      for (const row of countData) {
        if (row.postulacion_token_id) {
          countsMap.set(
            row.postulacion_token_id,
            (countsMap.get(row.postulacion_token_id) || 0) + 1
          );
        }
      }
    }

    const tokens: FacilitadorPostulacionToken[] = (data || []).map((t: any) => {
      const isCampana =
        t.tipo === "campana" || (t.notas && t.notas.startsWith("[CAMPAÑA:"));
      let titulo = t.titulo_campana || null;
      if (!titulo && t.notas && t.notas.startsWith("[CAMPAÑA:")) {
        const match = t.notas.match(/^\[CAMPAÑA:\s*(.+?)\]/);
        if (match) titulo = match[1];
      }

      return {
        ...t,
        tipo: isCampana ? "campana" : "individual",
        titulo_campana: titulo,
        total_postulaciones: countsMap.get(t.id) || 0,
      };
    });

    return { tokens, error: null };
  } catch (err) {
    console.error("Error en getPostulacionTokens:", err);
    return {
      tokens: [],
      error: err instanceof Error ? err.message : "Error al cargar los enlaces de postulación",
    };
  }
}

/**
 * Revoke/deactivate an invitation token
 */
export async function revocarPostulacionToken(id: number) {
  try {
    const usuarioId = await getCurrentUserUsuarioId();
    if (!usuarioId) {
      return { success: false, error: "No autorizado" };
    }

    const admin = await createAdminClient();
    const { error } = await admin
      .from("facilitador_postulacion_tokens")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/dashboard/capacitacion/entrevista-facilitadores");
    return { success: true, error: null };
  } catch (err) {
    console.error("Error en revocarPostulacionToken:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al revocar el enlace",
    };
  }
}

/**
 * Public validation for a postulación token
 */
export async function validarTokenPostulacion(token: string): Promise<PublicTokenValidation> {
  try {
    if (!token || typeof token !== "string" || token.trim().length < 16) {
      return {
        valid: false,
        error: "invalid",
        errorMessage: "El enlace de postulación no es válido o está incompleto.",
      };
    }

    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("facilitador_postulacion_tokens")
      .select("*")
      .eq("token", token.trim())
      .single();

    if (error || !data) {
      return {
        valid: false,
        error: "invalid",
        errorMessage: "El enlace de postulación no existe o fue retirado.",
      };
    }

    const isCampana =
      data.tipo === "campana" || (data.notas && data.notas.includes("[CAMPAÑA"));
    let tituloCampana = data.titulo_campana || null;
    if (!tituloCampana && data.notas && data.notas.startsWith("[CAMPAÑA:")) {
      const match = data.notas.match(/^\[CAMPAÑA:\s*(.+?)\]/);
      if (match) tituloCampana = match[1];
    }

    if (!data.is_active) {
      return {
        valid: false,
        error: "invalid",
        errorMessage: isCampana
          ? "Esta convocatoria de postulación ha sido cerrada o pausada."
          : "Este enlace de postulación ha sido desactivado o revocado.",
      };
    }

    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < now) {
      return {
        valid: false,
        error: "expired",
        errorMessage: isCampana
          ? "El plazo para postularse en esta convocatoria ha expirado."
          : "Este enlace de postulación ha expirado. Por favor solicita uno nuevo al equipo de Capacitación.",
      };
    }

    // Only block single-use individual tokens by used_at
    if (!isCampana && data.used_at) {
      return {
        valid: false,
        error: "used",
        errorMessage: "Este enlace de postulación ya fue completado y utilizado anteriormente.",
      };
    }

    // Check max_usos for campaign if configured
    if (isCampana && data.max_usos && data.max_usos > 0) {
      const { count } = await admin
        .from("facilitador_entrevistas")
        .select("id", { count: "exact", head: true })
        .eq("postulacion_token_id", data.id);

      if ((count || 0) >= data.max_usos) {
        return {
          valid: false,
          error: "expired",
          errorMessage: "Esta convocatoria ha alcanzado el límite máximo de postulaciones permitidas.",
        };
      }
    }

    return {
      valid: true,
      token: data.token,
      tipo: isCampana ? "campana" : "individual",
      titulo_campana: tituloCampana,
      nombre_candidato: data.nombre_candidato,
      email_candidato: data.email_candidato,
      expires_at: data.expires_at,
    };
  } catch (err) {
    console.error("Error en validarTokenPostulacion:", err);
    return {
      valid: false,
      error: "server_error",
      errorMessage: "Ocurrió un error al verificar la validez del enlace.",
    };
  }
}

/**
 * Submit candidate application via public form
 */
export async function submitCandidatoPostulacion(
  payload: CandidatoPostulacionPayload
): Promise<{ success: boolean; entrevistaId?: number; error?: string }> {
  try {
    // 1. Anti-bot honeypot check
    if (payload._hp_website && payload._hp_website.trim().length > 0) {
      console.warn("Honeypot field triggered in submitCandidatoPostulacion");
      return { success: false, error: "Solicitud no procesada." };
    }

    // 2. Validate token
    const validation = await validarTokenPostulacion(payload.token);
    if (!validation.valid) {
      return { success: false, error: validation.errorMessage || "Enlace no válido" };
    }

    // 3. Validate required fields
    if (!payload.nombre_apellido || payload.nombre_apellido.trim().length < 3) {
      return {
        success: false,
        error: "El nombre y apellido del aspirante es obligatorio.",
      };
    }

    const admin = await createAdminClient();

    // Re-fetch token row to get ID for foreign key & check type
    const { data: tokenRow, error: tokenErr } = await admin
      .from("facilitador_postulacion_tokens")
      .select("*")
      .eq("token", payload.token.trim())
      .single();

    if (tokenErr || !tokenRow) {
      return { success: false, error: "Error validando el token de postulación." };
    }

    const isCampana =
      tokenRow.tipo === "campana" || (tokenRow.notas && tokenRow.notas.includes("[CAMPAÑA"));
    let tituloCampana = tokenRow.titulo_campana || null;
    if (!tituloCampana && tokenRow.notas && tokenRow.notas.startsWith("[CAMPAÑA:")) {
      const match = tokenRow.notas.match(/^\[CAMPAÑA:\s*(.+?)\]/);
      if (match) tituloCampana = match[1];
    }

    const observacionesText = isCampana
      ? `Postulación recibida en línea vía Convocatoria / Campaña: ${tituloCampana || "Campaña abierta"}.`
      : "Postulación recibida en línea mediante enlace dinámico de invitación.";

    // 4. Construct interview row with strict isolation
    const entrevistaRow: Record<string, unknown> = {
      nombre_apellido: payload.nombre_apellido.trim(),
      cedula: payload.cedula?.trim() || null,
      telefono: payload.telefono?.trim() || null,
      email: payload.email?.trim() || null,
      direccion: payload.direccion?.trim() || null,
      posee_vehiculo: Boolean(payload.posee_vehiculo),
      posee_laptop: Boolean(payload.posee_laptop),
      disponibilidad_viajar: Boolean(payload.disponibilidad_viajar),

      nivel_tecnico: payload.nivel_tecnico?.trim() || null,
      universitario: payload.universitario?.trim() || null,
      posee_especializacion: payload.posee_especializacion?.trim() || null,
      ultimo_curso_tiempo: payload.ultimo_curso_tiempo || null,
      ultimo_curso_descripcion: payload.ultimo_curso_descripcion?.trim() || null,
      manejo_herramientas_audiovisuales: payload.manejo_herramientas_audiovisuales || null,

      doc_resumen_curricular: Boolean(payload.doc_resumen_curricular),
      doc_cedula_identidad: Boolean(payload.doc_cedula_identidad),
      doc_soportes_resumen_curricular: Boolean(payload.doc_soportes_resumen_curricular),
      doc_rif_actualizado: Boolean(payload.doc_rif_actualizado),
      doc_registro_inpsasel: Boolean(payload.doc_registro_inpsasel),
      doc_factura_fiscal: Boolean(payload.doc_factura_fiscal),
      doc_titulo_universitario: Boolean(payload.doc_titulo_universitario),
      doc_declaracion_islr: Boolean(payload.doc_declaracion_islr),
      doc_formacion_docente: Boolean(payload.doc_formacion_docente),
      doc_posee_laptop: Boolean(payload.doc_posee_laptop),

      retos_facilitador: payload.retos_facilitador?.trim() || null,
      logros_formacion: payload.logros_formacion?.trim() || null,
      caracteristica_esencial: payload.caracteristica_esencial || null,
      ejemplo_liderazgo: payload.ejemplo_liderazgo?.trim() || null,
      fortalezas: payload.fortalezas?.trim() || null,
      debilidades: payload.debilidades?.trim() || null,
      motivo_trabajar_aqui: payload.motivo_trabajar_aqui?.trim() || null,
      por_que_contratarte: payload.por_que_contratarte?.trim() || null,
      temas_capacidades: Array.isArray(payload.temas_capacidades)
        ? payload.temas_capacidades
        : [],

      // Fixed system values for public submissions
      fecha_entrevista: new Date().toISOString().split("T")[0],
      entrevistado_por: null,
      evaluacion_items: [],
      observaciones: observacionesText,
      estatus: "pendiente",
      origen: "web",
      postulacion_token_id: tokenRow.id,
      creado_por: null,
    };

    const { data: newEntrevista, error: insertErr } = await admin
      .from("facilitador_entrevistas")
      .insert(entrevistaRow)
      .select("id")
      .single();

    if (insertErr || !newEntrevista) {
      console.error("Error inserting interview from web postulación:", insertErr);
      return { success: false, error: "Error al registrar la postulación." };
    }

    // 5. Update token status
    if (isCampana) {
      // For campaigns, it remains active for further applicants
      try {
        await admin
          .from("facilitador_postulacion_tokens")
          .update({
            usos_count: (tokenRow.usos_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", tokenRow.id);
      } catch {
        // Ignored if column not present yet
      }
    } else {
      // Single-use individual token: mark as used and deactivated
      await admin
        .from("facilitador_postulacion_tokens")
        .update({
          used_at: new Date().toISOString(),
          is_active: false,
          entrevista_id: newEntrevista.id,
        })
        .eq("id", tokenRow.id);
    }

    revalidatePath("/dashboard/capacitacion/entrevista-facilitadores");

    return {
      success: true,
      entrevistaId: newEntrevista.id,
    };
  } catch (err) {
    console.error("Error en submitCandidatoPostulacion:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error inesperado al enviar la postulación",
    };
  }
}
