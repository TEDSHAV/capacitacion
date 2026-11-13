import { createAdminClient } from "@/utils/supabase/server";
import { sendMail } from "./send";
import {
  generateFichaTecnicaFacilitadorPdf,
  type FichaTecnicaFacilitadorData,
} from "@/lib/ficha-tecnica-facilitador-generator";
import { toTitleCase } from "@/utils/string-utils";
import { buildEmailContext, renderTemplateBoth, emailContextToMap } from "./template-render";
import { getDefaultEmailTemplate, getEmailTemplate } from "@/app/actions/email-templates";
import { getOsiSessionInfo } from "@/app/actions/osi-facilitador-assignments";
import type { EmailLogStatus, EmailSessionInfo } from "@/types/email";

export interface NotifyClientAssignmentInput {
  osiId: number;
  facilitadorId: number;
  clientEmail: string;
  assignmentId?: number | null;
  assignedBy?: string | null;
  templateId?: number | null;
  nroSesion?: number | null;
}

function sanitizeFilename(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!cleaned) return "Facilitador";

  return cleaned
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("_")
    .substring(0, 60);
}

/**
 * Sends a confirmation email to the client contact person for an OSI when a facilitador is assigned,
 * attaching the official Ficha Técnica del Facilitador as a PDF.
 *
 * Uses the editable email template of event_type = "confirmacion_facilitador_cliente",
 * falling back to a clean built-in default if none is configured.
 *
 * Records the send outcome in `capacitacion_email_log`.
 * NEVER throws — any unexpected error is caught and returned.
 */
export async function notifyClientFacilitadorAssigned(
  input: NotifyClientAssignmentInput,
): Promise<{ success: boolean; status: EmailLogStatus; error?: string }> {
  try {
    const targetEmail = input.clientEmail?.trim();
    if (!targetEmail) {
      return { success: false, status: "failed", error: "Correo del cliente no proporcionado." };
    }

    const admin = await createAdminClient();

    // 1. Fetch OSI and Facilitador details in parallel
    const [osiRes, facRes, sessionInfo] = await Promise.all([
      admin
        .from("v_osi_formato_completo")
        .select(
          "nro_osi, servicio, nombre_empresa, direccion_ejecucion, persona_contacto, contacto_telefono, contacto_email, contenido_servicio, observaciones_totales, fecha_inicio_real, desglose_recursos_sesiones, horas_academicas_ejecucion, sesiones_ejecucion",
        )
        .eq("id_osi", input.osiId)
        .maybeSingle(),
      admin
        .from("facilitadores")
        .select(
          "id, nombre_apellido, cedula, titulo_profesional, formacion_academica, experiencia_laboral, competencias_habilidades, foto_perfil_url, fecha_creacion, email, telefono",
        )
        .eq("id", input.facilitadorId)
        .maybeSingle(),
      getOsiSessionInfo(input.osiId),
    ]);

    if (!osiRes.data) {
      console.warn(`[notifyClient] OSI ${input.osiId} not found, skipping email notification.`);
      return { success: false, status: "failed", error: "OSI no encontrada" };
    }
    if (!facRes.data) {
      console.warn(`[notifyClient] Facilitador ${input.facilitadorId} not found, skipping email notification.`);
      return { success: false, status: "failed", error: "Facilitador no encontrado" };
    }

    const osi = osiRes.data;
    const fac = facRes.data;

    // 2. Resolve sessions
    type DesgloseRow = {
      nro_sesion?: number | null;
      id_sesion?: number | null;
      horas_honorarios_instructor?: number | null;
    };
    const rawDesglose = Array.isArray(osi.desglose_recursos_sesiones)
      ? (osi.desglose_recursos_sesiones as DesgloseRow[])
      : [];

    let sessions: EmailSessionInfo[] = sessionInfo.sessions.map((s) => {
      const desgloseMatch = rawDesglose.find(
        (d, idx) => (d.nro_sesion ?? d.id_sesion ?? idx + 1) === s.nro_sesion,
      );
      return {
        nro_sesion: s.nro_sesion,
        fecha: s.fecha,
        hora_inicio: s.hora_inicio,
        hora_fin: s.hora_fin,
        horas: desgloseMatch?.horas_honorarios_instructor ?? null,
      };
    });

    if (input.nroSesion != null) {
      const scoped = sessions.filter((s) => s.nro_sesion === input.nroSesion);
      sessions = scoped.length > 0
        ? scoped
        : [{ nro_sesion: input.nroSesion, fecha: null, hora_inicio: null, hora_fin: null, horas: null }];
    }

    // 3. Build email context
    const ctx = buildEmailContext(
      {
        nro_osi: osi.nro_osi,
        servicio: osi.servicio,
        nombre_empresa: osi.nombre_empresa,
        direccion_ejecucion: osi.direccion_ejecucion,
        persona_contacto: osi.persona_contacto,
        contacto_telefono: osi.contacto_telefono,
        contacto_email: osi.contacto_email,
        contenido_servicio: osi.contenido_servicio,
        observaciones_totales: osi.observaciones_totales,
        fecha_inicio_real: osi.fecha_inicio_real,
        horas_academicas_ejecucion: osi.horas_academicas_ejecucion,
        sesiones_ejecucion: osi.sesiones_ejecucion,
      },
      {
        nombre_apellido: fac.nombre_apellido,
        email: fac.email,
        telefono: fac.telefono,
      },
      sessions,
    );

    // 4. Resolve template
    let templateSubject = "";
    let templateBody = "";
    let resolvedTemplateId: number | null = null;

    if (input.templateId) {
      const tplRes = await getEmailTemplate(input.templateId);
      if (tplRes.data) {
        templateSubject = tplRes.data.subject;
        templateBody = tplRes.data.body;
        resolvedTemplateId = tplRes.data.id;
      }
    }

    if (!templateSubject || !templateBody) {
      const defTpl = await getDefaultEmailTemplate("confirmacion_facilitador_cliente");
      if (defTpl.data) {
        templateSubject = defTpl.data.subject;
        templateBody = defTpl.data.body;
        resolvedTemplateId = defTpl.data.id > 0 ? defTpl.data.id : null;
      }
    }

    const ctxMap = emailContextToMap(ctx);
    const rendered = renderTemplateBoth(templateSubject, templateBody, ctxMap);

    // 5. Generate the Ficha Técnica PDF in-memory
    let pdfBuffer: Buffer | null = null;
    const facName = toTitleCase(fac.nombre_apellido) || "Facilitador";
    const safeName = sanitizeFilename(facName);
    const pdfFilename = `Ficha_Tecnica_${safeName}.pdf`;

    try {
      const fichaData: FichaTecnicaFacilitadorData = {
        nombre_apellido: facName,
        cedula: fac.cedula ?? null,
        titulo_profesional: fac.titulo_profesional ?? null,
        formacion_academica: fac.formacion_academica ?? null,
        experiencia_laboral: fac.experiencia_laboral ?? null,
        competencias_habilidades: fac.competencias_habilidades ?? null,
        foto_perfil_url: fac.foto_perfil_url ?? null,
        facilitadorId: fac.id,
        created_at: fac.fecha_creacion ?? null,
      };

      const pdfBlob = await generateFichaTecnicaFacilitadorPdf(fichaData);
      const arrayBuf = await pdfBlob.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuf);
    } catch (pdfErr) {
      console.error("[notifyClient] Error generating Ficha Técnica PDF:", pdfErr);
    }

    const attachments = pdfBuffer
      ? [
          {
            filename: pdfFilename,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ]
      : [];

    // 6. Send email via sendMail (MXroute)
    const sendRes = await sendMail({
      to: targetEmail,
      subject: rendered.subject,
      text: rendered.body,
      attachments,
    });

    const status: EmailLogStatus =
      sendRes.status === "sent" ? "sent" : sendRes.status === "failed" ? "failed" : "not_configured";

    // 7. Audit log in capacitacion_email_log
    try {
      await admin.from("capacitacion_email_log").insert({
        osi_id: input.osiId,
        facilitador_id: input.facilitadorId,
        assignment_id: input.assignmentId ?? null,
        template_id: resolvedTemplateId,
        to_email: targetEmail,
        subject: rendered.subject,
        body_sent: rendered.body,
        status,
        error_message: sendRes.error ?? null,
        attachments: pdfBuffer
          ? [{ key: "", name: pdfFilename, size: pdfBuffer.length }]
          : [],
        sent_by: input.assignedBy ?? null,
      });
    } catch (logErr) {
      console.warn("[notifyClient] Warning writing email log:", logErr);
    }

    if (sendRes.status === "sent") {
      console.log(`[notifyClient] Email successfully sent to client ${targetEmail} for OSI ${osi.nro_osi}`);
      return { success: true, status: "sent" };
    } else if (sendRes.status === "not_configured") {
      console.warn(`[notifyClient] Email not configured, skipped sending to ${targetEmail}`);
      return { success: false, status: "not_configured", error: "Servidor de correo no configurado" };
    } else {
      console.warn(`[notifyClient] Email send failed:`, sendRes.error);
      return { success: false, status: "failed", error: sendRes.error };
    }
  } catch (err) {
    console.error("[notifyClientFacilitadorAssigned] Unexpected error:", err);
    return {
      success: false,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
