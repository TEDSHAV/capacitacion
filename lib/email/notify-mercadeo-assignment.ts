import { createAdminClient } from "@/utils/supabase/server";
import { sendMail } from "./send";
import {
  generateFichaTecnicaFacilitadorPdf,
  type FichaTecnicaFacilitadorData,
} from "@/lib/ficha-tecnica-facilitador-generator";
import { toTitleCase } from "@/utils/string-utils";

/**
 * Recipient for facilitator assignment notifications (Equipo de Negocios).
 */
export const MERCADEO_NOTIFICATION_EMAIL = "mercadeo@shadevenezuela.com.ve";
export const NEGOCIOS_NOTIFICATION_EMAIL = MERCADEO_NOTIFICATION_EMAIL;

export interface NotifyMercadeoAssignmentInput {
  osiId: number;
  facilitadorId: number;
  assignmentId?: number | null;
  assignedBy?: string | null;
  recipientEmail?: string | null;
}

function formatDateVE(dateStr: string | null | undefined): string {
  if (!dateStr) return "Por definir";
  const trimmed = dateStr.trim();
  const safeStr = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T12:00:00` : trimmed;
  try {
    return new Date(safeStr).toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
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
 * Asynchronously sends an email notification to Mercadeo confirming that a facilitador
 * has been assigned to an OSI, with their official Ficha Técnica attached as a PDF.
 *
 * This function NEVER throws — all errors are caught and logged so the primary
 * assignment flow is never blocked or compromised.
 */
export async function notifyMercadeoFacilitadorAssigned(
  input: NotifyMercadeoAssignmentInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await createAdminClient();

    // 1. Fetch OSI and Facilitador details in parallel
    const [osiRes, facRes, sesRes] = await Promise.all([
      admin
        .from("v_osi_formato_completo")
        .select(
          "nro_osi, servicio, nombre_empresa, direccion_ejecucion, fecha_inicio_real, desglose_recursos_sesiones",
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
      admin
        .from("osi_sesion")
        .select("nro_sesion, fecha, hora_inicio, hora_fin")
        .eq("id_osi", input.osiId)
        .order("nro_sesion", { ascending: true }),
    ]);

    if (!osiRes.data) {
      console.warn(`[notifyMercadeo] OSI ${input.osiId} not found, skipping email notification.`);
      return { success: false, error: "OSI no encontrada" };
    }
    if (!facRes.data) {
      console.warn(`[notifyMercadeo] Facilitador ${input.facilitadorId} not found, skipping email notification.`);
      return { success: false, error: "Facilitador no encontrado" };
    }

    const osi = osiRes.data;
    const fac = facRes.data;
    const sessions = sesRes.data || [];

    // 2. Resolve dates
    const uniqueDates = Array.from(
      new Set(sessions.map((s) => s.fecha).filter(Boolean)),
    ) as string[];
    const fechasText =
      uniqueDates.length > 0
        ? uniqueDates.map(formatDateVE).join(", ")
        : formatDateVE(osi.fecha_inicio_real);

    // 3. Generate the Ficha Técnica PDF in-memory
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
      console.error("[notifyMercadeo] Error generating Ficha Técnica PDF:", pdfErr);
    }

    // 4. Construct email subject and body
    const nroOsi = osi.nro_osi || `ID-${input.osiId}`;
    const empresa = osi.nombre_empresa || "Cliente";
    const servicio = osi.servicio || "Servicio de Capacitación";
    const subject = `Asignación de Facilitador: ${facName} — OSI ${nroOsi} (${empresa})`;

    const plainText = `
Confirmación de Asignación de Facilitador
Módulo de Capacitación — SHA de Venezuela
--------------------------------------------------
OSI: ${nroOsi}
Cliente: ${empresa}
--------------------------------------------------

Estimado equipo de Negocios,

Se ha confirmado la asignación de un facilitador para el siguiente servicio:

DATOS DE LA OSI:
• N° OSI: ${nroOsi}
• Cliente / Empresa: ${empresa}
• Servicio / Curso: ${servicio}
• Fecha(s): ${fechasText}
${osi.direccion_ejecucion ? `• Lugar: ${osi.direccion_ejecucion}\n` : ""}
FACILITADOR ASIGNADO:
• Nombre: ${facName}
• Cédula: ${fac.cedula || "No registrada"}

${pdfBuffer ? `📎 Se adjunta la Ficha Técnica oficial del facilitador (${pdfFilename}).` : "⚠️ La Ficha Técnica no pudo ser generada automáticamente."}

--------------------------------------------------
Este mensaje fue generado automáticamente por el Sistema PRISMA Capacitación.
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; }
    .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0c3f69; color: #ffffff; padding: 24px 28px 22px 28px; }
    .header-pre { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #7dd3fc; margin-bottom: 6px; }
    .header h1 { margin: 0 0 16px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; color: #ffffff; }
    .header-meta { background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 8px; padding: 12px 16px; }
    .header-meta-table { width: 100%; border-collapse: collapse; }
    .meta-col-osi { vertical-align: middle; width: 42%; border-right: 1px solid rgba(255, 255, 255, 0.2); padding-right: 14px; }
    .meta-col-client { vertical-align: middle; width: 58%; padding-left: 14px; }
    .meta-label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #93c5fd; margin-bottom: 3px; }
    .osi-badge { display: inline-block; background: #38bdf8; color: #082f49; font-weight: 800; font-size: 15px; padding: 3px 10px; border-radius: 6px; letter-spacing: 0.02em; }
    .client-title { display: block; font-size: 15px; font-weight: 700; color: #ffffff; line-height: 1.25; }
    .content { padding: 28px; }
    .intro { font-size: 14px; color: #475569; margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #0284c7; margin-top: 24px; margin-bottom: 10px; border-bottom: 1px solid #e0f2fe; padding-bottom: 4px; }
    .info-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
    .info-table td { padding: 8px 10px; vertical-align: top; }
    .info-table td.label { font-weight: 600; color: #64748b; width: 140px; background: #f8fafc; border-radius: 4px; }
    .info-table td.value { color: #0f172a; }
    .badge { display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 600; border-radius: 9999px; background: #e0f2fe; color: #0369a1; }
    .attachment-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-top: 20px; font-size: 13px; color: #166534; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-pre">Módulo de Capacitación — SHA de Venezuela</div>
      <h1>Confirmación de Asignación de Facilitador</h1>
      <div class="header-meta">
        <table class="header-meta-table">
          <tr>
            <td class="meta-col-osi">
              <span class="meta-label">Orden de Servicio</span>
              <span class="osi-badge">OSI: ${nroOsi}</span>
            </td>
            <td class="meta-col-client">
              <span class="meta-label">Cliente / Empresa</span>
              <span class="client-title">${empresa}</span>
            </td>
          </tr>
        </table>
      </div>
    </div>
    <div class="content">
      <p class="intro">
        Estimado equipo de Negocios,<br>
        Se ha confirmado la asignación de un facilitador para el siguiente servicio:
      </p>

      <div class="section-title">Datos del Servicio (OSI)</div>
      <table class="info-table">
        <tr>
          <td class="label">N° OSI:</td>
          <td class="value"><strong>${nroOsi}</strong></td>
        </tr>
        <tr>
          <td class="label">Cliente / Empresa:</td>
          <td class="value"><strong>${empresa}</strong></td>
        </tr>
        <tr>
          <td class="label">Servicio / Curso:</td>
          <td class="value">${servicio}</td>
        </tr>
        <tr>
          <td class="label">Fecha(s):</td>
          <td class="value">${fechasText}</td>
        </tr>
        ${osi.direccion_ejecucion ? `
        <tr>
          <td class="label">Lugar / Ubicación:</td>
          <td class="value">${osi.direccion_ejecucion}</td>
        </tr>` : ""}
      </table>

      <div class="section-title">Facilitador Asignado</div>
      <table class="info-table">
        <tr>
          <td class="label">Nombre:</td>
          <td class="value"><strong>${facName}</strong></td>
        </tr>
        <tr>
          <td class="label">Cédula:</td>
          <td class="value">${fac.cedula || "No registrada"}</td>
        </tr>
      </table>

      ${
        pdfBuffer
          ? `<div class="attachment-box">
              📎 <strong>Ficha Técnica adjunta:</strong>&nbsp;<code>${pdfFilename}</code>
            </div>`
          : `<div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; margin-top: 20px; font-size: 13px; color: #92400e;">
              ⚠️ La Ficha Técnica no pudo adjuntarse automáticamente en esta ocasión.
            </div>`
      }
    </div>
    <div class="footer">
      Este correo es una notificación automática generada por el Sistema PRISMA Capacitación.<br>
      SHA de Venezuela, C.A.
    </div>
  </div>
</body>
</html>
`.trim();

    // 5. Send email via MXroute SMTP
    const recipient = input.recipientEmail?.trim() || MERCADEO_NOTIFICATION_EMAIL;
    const attachments = pdfBuffer
      ? [
          {
            filename: pdfFilename,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ]
      : [];

    const sendRes = await sendMail({
      to: recipient,
      subject,
      text: plainText,
      html,
      attachments,
    });

    // 6. Record audit in capacitacion_email_log
    try {
      await admin.from("capacitacion_email_log").insert({
        osi_id: input.osiId,
        facilitador_id: input.facilitadorId,
        assignment_id: input.assignmentId ?? null,
        template_id: null,
        to_email: recipient,
        subject,
        body_sent: plainText,
        status: sendRes.status,
        error_message: sendRes.error ?? null,
        attachments: pdfBuffer
          ? [{ key: "", name: pdfFilename, size: pdfBuffer.length }]
          : [],
        sent_by: input.assignedBy ?? null,
      });
    } catch (logErr) {
      console.warn("[notifyMercadeo] Warning writing email log:", logErr);
    }

    if (sendRes.status === "sent") {
      console.log(`[notifyMercadeo] Email successfully sent to ${recipient} for OSI ${nroOsi}`);
      return { success: true };
    } else {
      console.warn(`[notifyMercadeo] Email send finished with status '${sendRes.status}':`, sendRes.error);
      return { success: false, error: sendRes.error };
    }
  } catch (err) {
    console.error("[notifyMercadeoFacilitadorAssigned] Unexpected error:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
