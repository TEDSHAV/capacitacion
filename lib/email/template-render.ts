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

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

/**
 * Replace all `{{key}}` placeholders in `str` with values from `context`.
 * Unknown keys resolve to "" (empty string).
 */
export function renderTemplate(str: string, context: Record<string, string | undefined | null>): string {
  return str.replace(PLACEHOLDER_RE, (match, key: string) => {
    const val = context[key];
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
    facilitador_nombre: ctx.facilitador_nombre,
    facilitador_email: ctx.facilitador_email ?? "",
    nro_osi: ctx.nro_osi,
    curso: ctx.curso,
    empresa: ctx.empresa,
    fechas: ctx.fechas,
    horario: ctx.horario,
    duracion: ctx.duracion,
    direccion: ctx.direccion,
    contacto: ctx.contacto,
    contacto_telefono: ctx.contacto_telefono,
    observaciones: ctx.observaciones,
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

/**
 * Build an `EmailContext` from raw OSI + facilitador + session rows.
 * SERVER-ONLY in practice (takes raw DB rows), but kept pure for testability.
 *
 * @param osi        Row from `v_osi_formato_completo` (or a subset with the
 *                   fields below).
 * @param facilitador Row from `facilitadores` (nombre_apellido, email).
 * @param sesiones   Session detail rows. When the assignment is for a specific
 *                   session, pass only that session; for "all sessions", pass
 *                   all of them. Empty array → falls back to OSI-level fields.
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
  },
  facilitador: {
    nombre_apellido: string | null;
    email: string | null;
  },
  sesiones: EmailSessionInfo[],
): EmailContext {
  const sList = sesiones ?? [];

  // Fechas: list each session date (deduped, sorted), or fall back to fecha_inicio_real.
  const fechas =
    sList.length > 0
      ? Array.from(new Set(sList.map((s) => formatDate(s.fecha)).filter(Boolean)))
          .sort()
          .join(", ")
      : formatDate(osi.fecha_inicio_real ?? null);

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

  // Duración: left as a highlighted marker so the user manually confirms/sets
  // it in the assign modal before sending. The session-level hours source
  // (osi_sesion has no hours column; desglose_recursos_sesiones is unreliable)
  // makes automatic population unreliable, so we surface it explicitly.
  const duracion = "[DURACIÓN A CONFIRMAR]";

  return {
    facilitador_nombre: facilitador.nombre_apellido ?? "",
    facilitador_email: facilitador.email ?? null,
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
    sesiones: sList,
  };
}
