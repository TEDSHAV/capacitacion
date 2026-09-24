/**
 * Types for the "Asignar Facilitador" email feature.
 *
 * - EmailTemplate: a row of `capacitacion_email_templates` (editable subject +
 *   body with {{placeholders}}).
 * - EmailLog: a row of `capacitacion_email_log` (append-only send log).
 * - EmailContext: the OSI + facilitador data used to render a template.
 * - SendResult: the return shape of the MXroute send helper.
 *
 * The `attachments` jsonb column on the log is the foundation for the future
 * R2/Backblaze PPT attachment feature (array of {key, name, size, url}).
 */

export type EmailEventType =
  | "asignacion_facilitador"
  | (string & {}); // open for future event types

export interface EmailTemplate {
  id: number;
  name: string;
  slug: string;
  event_type: EmailEventType;
  subject: string;
  body: string;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateListItem {
  id: number;
  name: string;
  slug: string;
  event_type: EmailEventType;
  is_default: boolean;
  is_active: boolean;
}

export type EmailLogStatus = "sent" | "failed" | "not_configured";

export interface EmailLogAttachment {
  key: string;
  name: string;
  size: number;
  url?: string;
}

export interface EmailLog {
  id: number;
  osi_id: number | null;
  facilitador_id: number | null;
  assignment_id: number | null;
  template_id: number | null;
  to_email: string;
  subject: string;
  body_sent: string;
  status: EmailLogStatus;
  error_message: string | null;
  attachments: EmailLogAttachment[];
  sent_by: string | null;
  sent_at: string;
}

/**
 * Log entry with the facilitador name joined in — used by the assign modal
 * badges and the registro-correos table.
 */
export interface EmailLogEntry extends EmailLog {
  facilitadores?: { nombre_apellido?: string } | null;
}

/**
 * Per-session detail used to populate date/horario/duracion placeholders.
 * Sourced from `osi_sesion` (preferred) or `desglose_recursos_sesiones`.
 */
export interface EmailSessionInfo {
  nro_sesion: number | null;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  horas: number | null;
}

/**
 * The data context for rendering an email template. Built from the OSI
 * (`v_osi_formato_completo`) + the assigned facilitador + the session(s)
 * the facilitador is assigned to.
 */
export interface EmailContext {
  facilitador_nombre: string;
  facilitador_email: string | null;
  nro_osi: string;
  curso: string;
  empresa: string;
  fechas: string;
  horario: string;
  duracion: string;
  direccion: string;
  contacto: string;
  contacto_telefono: string;
  observaciones: string;
  enlace_portal?: string;
  enlace_presentacion?: string;
  sesiones: EmailSessionInfo[];
}


export type SendStatus = "sent" | "failed" | "not_configured";

export interface SendResult {
  status: SendStatus;
  messageId?: string;
  error?: string;
}

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

/**
 * Attachment payload sent from the client to the server action, base64-encoded
 * so it serializes cleanly over the server action boundary. The server decodes
 * it to a Buffer before handing it to nodemailer. File content is never
 * persisted — only metadata (filename, size) is recorded in the email log.
 *
 * @deprecated Prefer `UploadedAttachment` (B2-backed) for new code. This type
 * is kept for backwards compatibility with any existing base64 flow.
 */
export interface EmailAttachmentInput {
  filename: string;
  contentBase64: string;
  contentType: string;
  size: number;
}

/**
 * Metadata for a file already uploaded to Backblaze B2 via the
 * `/api/email-attachments/upload` route. The server action downloads the file
 * from B2 at send time — small files (<10MB) are attached directly to the
 * email, large files (≥10MB) get a 7-day signed download URL in the body.
 *
 * This replaces the base64 `EmailAttachmentInput` flow which was limited by
 * the Next.js server action body size limit.
 */
export interface UploadedAttachment {
  key: string; // B2 object key
  name: string; // original filename
  size: number; // bytes
  contentType: string;
}
