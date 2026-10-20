/**
 * Email template rendering — pure, client-compatible (no "use server").
 *
 * `renderTemplate` replaces `{{placeholder}}` tokens in a template's subject
 * and body with values from an `EmailContext`. Missing values become empty
 * strings (never the literal `{{placeholder}}`), so a partially-populated OSI
 * never sends `{{direccion}}` to the facilitador.
 *
 * `buildEmailContext` is the server-side counterpart that assembles an
 * `EmailContext` from raw OSI + facilitador + session rows. It lives here so
 * both the server action and (if ever needed) a client preview can share the
 * same shape, but it is only ever called server-side (it takes raw DB rows).
 */

import type { EmailContext, EmailSessionInfo } from "@/types/email";
import { toTitleCase } from "@/utils/string-utils";

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

/**
 * Replace all `{{key}}` placeholders in `str` with values from `context`.
 * Unknown keys resolve to "" (empty string).
 */
export function renderTemplate(str: string, context: Record<string, string | undefined | null>): string {
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(context)) {
    normalized[k.toLowerCase()] = v === undefined || v === null ? "" : String(v);
  }
  if (normalized["nro_osi"] && !normalized["osi"]) normalized["osi"] = normalized["nro_osi"];
  if (normalized["osi"] && !normalized["nro_osi"]) normalized["nro_osi"] = normalized["osi"];
  if (normalized["impresion"] && !normalized["impresiones"]) normalized["impresiones"] = normalized["impresion"];
  if (normalized["impresiones"] && !normalized["impresion"]) normalized["impresion"] = normalized["impresiones"];

  return str.replace(PLACEHOLDER_RE, (_match, key: string) => {
    const val = normalized[key.toLowerCase()];
    if (val === undefined || val === null) return "";
    return String(val);
  });
}

/** Render both subject and body of a template in one call. */
export function renderTemplateBoth(
  subject: string,
  body: string,
  context: Record<string, string | undefined | null>,
): { subject: string; body: string } {
  return {
    subject: renderTemplate(subject, context),
    body: renderTemplate(body, context),
  };
}

/**
 * Flatten an EmailContext into the simple string map that `renderTemplate`
 * expects. This is what the client modal calls to re-render on every edit.
 */
export function emailContextToMap(ctx: EmailContext): Record<string, string> {
  return {
    facilitador_nombre: toTitleCase(ctx.facilitador_nombre),
    facilitador_email: ctx.facilitador_email ?? "",
    facilitador_telefono: ctx.facilitador_telefono ?? "",
    nro_osi: ctx.nro_osi,
    osi: ctx.nro_osi,
    curso: ctx.curso,
    empresa: ctx.empresa,
    fechas: ctx.fechas,
    horario: ctx.horario,
    duracion: ctx.duracion,
    direccion: ctx.direccion,
    contacto: ctx.contacto,
    contacto_telefono: ctx.contacto_telefono,
    observaciones: ctx.observaciones,
    honorarios: ctx.honorarios ?? "",
    traslado: ctx.traslado ?? "",
    impresion: ctx.impresion ?? "",
    impresiones: ctx.impresion ?? "",
    enlace_portal: ctx.enlace_portal ?? "",
    enlace_presentacion: ctx.enlace_presentacion ?? "",
  };
}


// ─── Date/time formatting helpers (es-VE) ───────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr.length === 10 ? dateStr + "T12:00:00" : dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTimeRange(horaInicio: string | null, horaFin: string | null): string {
  const i = (horaInicio || "").slice(0, 5);
  const f = (horaFin || "").slice(0, 5);
  if (!i && !f) return "";
  if (!i) return f;
  if (!f) return i;
  return `${i} a ${f}`;
}

function formatMoney(val: unknown, fallback: string = "[A confirmar]"): string {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    if (trimmed.includes("$") || trimmed.toLowerCase().includes("no aplica") || trimmed.toLowerCase().includes("confirmar")) {
      return trimmed;
    }
  }
  const num = Number(val);
  if (isNaN(num)) return String(val);
  if (num === 0) return "No aplica";
  return `$${Number.isInteger(num) ? num : num.toFixed(2)}`;
}

/**
 * Build an `EmailContext` from raw OSI + facilitador + session rows.
 * SERVER-ONLY in practice (takes raw DB rows), but kept pure for testability.
 *
 * @param osi        Row from `v_osi_formato_completo` (or a subset with the
 *                   fields below).
 * @param facilitador Row from `facilitadores` (nombre_apellido, email, telefono).
 * @param sesiones   Session detail rows. When the assignment is for a specific
 *                   session, pass only that session; for "all sessions", pass
 *                   all of them. Empty array → falls back to OSI-level fields.
 * @param extra      Optional economic conditions (honorarios, traslado, impresion).
 */
export function buildEmailContext(
  osi: {
    nro_osi: string | null;
    servicio: string | null;
    nombre_empresa: string | null;
    direccion_ejecucion: string | null;
    persona_contacto?: string | null;
    contacto_telefono?: string | null;
    contenido_servicio?: string | null;
    observaciones_totales?: string | null;
    fecha_inicio_real?: string | null;
    horas_academicas_ejecucion?: number | null;
    sesiones_ejecucion?: number | null;
  },
  facilitador: {
    nombre_apellido: string | null;
    email: string | null;
    telefono?: string | null;
  },
  sesiones: EmailSessionInfo[],
  extra?: {
    honorarios?: number | string | null;
    traslado?: number | string | null;
    impresion?: number | string | null;
  },
): EmailContext {
  const sList = sesiones ?? [];

  // Fechas: list each session date (deduped, sorted), or fall back to fecha_inicio_real, or [Fecha por confirmar].
  const formattedDates = sList.length > 0
    ? Array.from(new Set(sList.map((s) => formatDate(s.fecha)).filter(Boolean))).sort()
    : [];
  const fechas =
    formattedDates.length > 0
      ? formattedDates.join(", ")
      : formatDate(osi.fecha_inicio_real ?? null) || "[Fecha por confirmar]";


  // Horario: if all sessions share the same horario, show it once; else list per session.
  const horarios = sList
    .map((s) => formatTimeRange(s.hora_inicio, s.hora_fin))
    .filter(Boolean);
  let horario: string;
  if (horarios.length === 0) {
    horario = "";
  } else if (Array.from(new Set(horarios)).length === 1) {
    horario = horarios[0];
  } else {
    horario = sList
      .map((s, i) => {
        const h = formatTimeRange(s.hora_inicio, s.hora_fin);
        return h ? `Sesión ${s.nro_sesion ?? i + 1}: ${h}` : "";
      })
      .filter(Boolean)
      .join(", ");
  }

  // Duración: calculate hours per day from session times, or total hours / sessions
  let duracion = "";
  if (sList.length > 0 && sList[0].hora_inicio && sList[0].hora_fin) {
    const parseHour = (h: string) => {
      const parts = h.split(":").map(Number);
      return parts[0] + (parts[1] || 0) / 60;
    };
    const start = parseHour(sList[0].hora_inicio);
    const end = parseHour(sList[0].hora_fin);
    if (end > start) {
      const diff = end - start;
      duracion = Number.isInteger(diff) ? String(diff) : diff.toFixed(1);
    }
  }

  if (!duracion && osi.horas_academicas_ejecucion && osi.sesiones_ejecucion && osi.sesiones_ejecucion > 0) {
    const d = osi.horas_academicas_ejecucion / osi.sesiones_ejecucion;
    duracion = Number.isInteger(d) ? String(d) : d.toFixed(1);
  }

  if (!duracion) {
    duracion = "[DURACIÓN A CONFIRMAR]";
  }

  const honorarios = formatMoney(extra?.honorarios, "[A convenir]");
  const traslado = formatMoney(extra?.traslado, "No aplica");
  const impresion = formatMoney(extra?.impresion, "Digital / No aplica");

  return {
    facilitador_nombre: facilitador.nombre_apellido ? toTitleCase(facilitador.nombre_apellido) : "",
    facilitador_email: facilitador.email ?? null,
    facilitador_telefono: facilitador.telefono ?? null,
    nro_osi: osi.nro_osi ?? "",
    curso: osi.servicio ?? "",
    empresa: osi.nombre_empresa ?? "",
    fechas,
    horario,
    duracion,
    direccion: osi.direccion_ejecucion ?? "",
    contacto: osi.persona_contacto ?? osi.nombre_empresa ?? "",
    contacto_telefono: osi.contacto_telefono ?? "",
    observaciones: osi.contenido_servicio ?? osi.observaciones_totales ?? "",
    honorarios,
    traslado,
    impresion,
    sesiones: sList,
  };
}
