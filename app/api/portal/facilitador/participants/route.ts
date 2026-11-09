import { NextRequest, NextResponse } from "next/server";
import { getFacilitadorSessionFromRequest } from "@/utils/api-auth";
import { createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyCapacitacionUsersOfUpload } from "@/app/actions/facilitador-notifications";
import { getOsiSessionInfo } from "@/app/actions/osi-facilitador-assignments";
import { getSessionCount } from "@/lib/osi-utils";

interface SaveParticipantsBody {
  osiId: number;
  facilitadorId: number;
  nroSesion?: number;
  participants: Array<{
    nombre_apellido: string;
    cedula: string;
    score: number | null;
  }>;
  status: "draft" | "final";
  acknowledged: boolean;
  disclaimerText?: string;
}

/**
 * REST API mirror of the saveParticipants server action.
 * Used by the offline sync queue to replay participant saves when
 * connectivity returns. Auth via facilitador_session cookie.
 */
export async function POST(request: NextRequest) {
  const session = getFacilitadorSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: SaveParticipantsBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { osiId, facilitadorId, participants, status, acknowledged, disclaimerText } = body;
  const nroSesion = body.nroSesion ?? 1;

  // Validate session matches the request
  if (session.facilitador_id !== facilitadorId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const supabase = await createAdminClient();

  if (status === "final") {
    if (!acknowledged) {
      return NextResponse.json(
        { error: "Debes confirmar la declaración de veracidad para finalizar el envío." },
        { status: 400 },
      );
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: "Debes registrar al menos un participante con su calificación antes de finalizar." },
        { status: 400 },
      );
    }

    const validParticipants = participants.filter(
      (p) => (p.nombre_apellido || "").trim() && (p.cedula || "").trim(),
    );

    if (validParticipants.length === 0) {
      return NextResponse.json(
        { error: "Debes registrar al menos un participante con nombre y cédula antes de finalizar." },
        { status: 400 },
      );
    }

    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const name = (p.nombre_apellido || "").trim();
      const cedula = (p.cedula || "").trim();

      if (name || cedula || (p.score !== null && p.score !== undefined)) {
        if (!name || name.length < 2) {
          return NextResponse.json(
            { error: `El participante en la fila ${i + 1} debe tener nombre y apellido completos.` },
            { status: 400 },
          );
        }
        if (!cedula || cedula.length < 4) {
          return NextResponse.json(
            { error: `El participante ${name || `#${i + 1}`} debe tener una cédula válida.` },
            { status: 400 },
          );
        }
        const scoreVal = p.score;
        if (scoreVal === null || scoreVal === undefined) {
          return NextResponse.json(
            { error: `El participante ${name} no tiene calificación asignada. Todos deben tener nota de 0 a 20.` },
            { status: 400 },
          );
        }
        const numScore = Number(scoreVal);
        if (isNaN(numScore) || numScore < 0 || numScore > 20) {
          return NextResponse.json(
            { error: `La calificación de ${name} (${scoreVal}) no es válida. Debe ser un número entre 0 y 20.` },
            { status: 400 },
          );
        }
      }
    }

    const { data: osiRow } = await supabase
      .from("v_osi_formato_completo")
      .select("id_servicio, servicio, desglose_recursos_sesiones, sesiones_programadas, sesiones_solped, sesiones_ejecucion")
      .eq("id_osi", osiId)
      .maybeSingle();

    // Check if course requires passing grade
    let isParticipationOnly = false;
    if (osiRow?.id_servicio) {
      const { data: curso } = await supabase
        .from("catalogo_servicios")
        .select("nota_aprobatoria")
        .eq("id", osiRow.id_servicio)
        .maybeSingle();
      if (curso && curso.nota_aprobatoria === 0) {
        isParticipationOnly = true;
      }
    }

    const { data: attachments, error: attError } = await supabase
      .from("ejecucion_osi_asistencia")
      .select("category, nro_sesion")
      .eq("osi_id", osiId)
      .eq("facilitador_id", facilitadorId);

    if (attError) {
      console.error("[POST /api/portal/facilitador/participants] Attachment query error:", attError);
      return NextResponse.json({ error: "Error al verificar los soportes adjuntos del servicio." }, { status: 500 });
    }

    const attList = attachments || [];
    const totalSessions = getSessionCount(osiRow);
    const forSes =
      totalSessions > 1
        ? attList.filter((a) => a.nro_sesion === nroSesion || (nroSesion === 1 && a.nro_sesion == null))
        : attList.filter((a) => a.nro_sesion === nroSesion || a.nro_sesion == null);
    const hasAsist = forSes.some((a) => a.category === "lista_asistencia");
    const hasCalif = isParticipationOnly || forSes.some((a) => a.category === "hoja_calificacion");
    const hasFotos = forSes.some((a) => a.category === "material_fotografico");

    if (!hasAsist) {
      return NextResponse.json(
        { error: `Falta adjuntar la lista de asistencia física firmada para la Sesión ${nroSesion}.` },
        { status: 400 },
      );
    }
    if (!hasCalif) {
      return NextResponse.json(
        { error: `Falta adjuntar la hoja de calificación física firmada para la Sesión ${nroSesion}.` },
        { status: 400 },
      );
    }
    if (!hasFotos) {
      return NextResponse.json(
        { error: `Falta adjuntar al menos una foto de soporte para la Sesión ${nroSesion}.` },
        { status: 400 },
      );
    }
  }

  // Delete existing participants for this (OSI, Facilitator, nroSesion) to overwrite
  const delQuery = supabase
    .from("ejecucion_osi_participantes")
    .delete()
    .eq("osi_id", osiId)
    .eq("facilitador_id", facilitadorId);

  const { error: deleteError } = await delQuery.eq("nro_sesion", nroSesion);
  if (deleteError && deleteError.code === "42703") {
    await supabase
      .from("ejecucion_osi_participantes")
      .delete()
      .eq("osi_id", osiId)
      .eq("facilitador_id", facilitadorId);
  } else if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const records = participants.map((p) => ({
    osi_id: osiId,
    facilitador_id: facilitadorId,
    nro_sesion: nroSesion,
    nombre_apellido: p.nombre_apellido,
    cedula: p.cedula,
    score: p.score,
    status: status,
  }));

  if (records.length === 0) {
    // Clear acknowledgment since there are no participants
    const { error: delAckErr } = await supabase
      .from("facilitador_acknowledgments")
      .delete()
      .eq("osi_id", osiId)
      .eq("facilitador_id", facilitadorId)
      .eq("nro_sesion", nroSesion);

    if (delAckErr && delAckErr.code === "42703") {
      await supabase
        .from("facilitador_acknowledgments")
        .delete()
        .eq("osi_id", osiId)
        .eq("facilitador_id", facilitadorId);
    }

    revalidatePath("/portal/facilitador/dashboard");
    return NextResponse.json({ success: true });
  }

  let { error: insertError } = await supabase
    .from("ejecucion_osi_participantes")
    .insert(records);

  if (insertError && insertError.code === "42703") {
    const recordsWithoutSession = participants.map((p) => ({
      osi_id: osiId,
      facilitador_id: facilitadorId,
      nombre_apellido: p.nombre_apellido,
      cedula: p.cedula,
      score: p.score,
      status: status,
    }));
    const fb = await supabase
      .from("ejecucion_osi_participantes")
      .insert(recordsWithoutSession);
    insertError = fb.error;
  }

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (status === "draft") {
    const { error: delAckErr } = await supabase
      .from("facilitador_acknowledgments")
      .delete()
      .eq("osi_id", osiId)
      .eq("facilitador_id", facilitadorId)
      .eq("nro_sesion", nroSesion);

    if (delAckErr && delAckErr.code === "42703") {
      await supabase
        .from("facilitador_acknowledgments")
        .delete()
        .eq("osi_id", osiId)
        .eq("facilitador_id", facilitadorId);
    }
  }

  // Save acknowledgment audit record on final submission
  if (status === "final" && acknowledged && disclaimerText) {
    const { error: ackError } = await supabase
      .from("facilitador_acknowledgments")
      .upsert(
        {
          osi_id: osiId,
          facilitador_id: facilitadorId,
          nro_sesion: nroSesion,
          disclaimer_text: disclaimerText,
          acknowledged_at: new Date().toISOString(),
        },
        { onConflict: "osi_id,facilitador_id,nro_sesion" },
      );

    if (ackError && (ackError.code === "42703" || ackError.message.includes("nro_sesion"))) {
      await supabase
        .from("facilitador_acknowledgments")
        .upsert(
          {
            osi_id: osiId,
            facilitador_id: facilitadorId,
            disclaimer_text: disclaimerText,
            acknowledged_at: new Date().toISOString(),
          },
          { onConflict: "osi_id,facilitador_id" },
        );
    }
  }

  // Notify capacitacion users and auto-mark execution process steps for this session
  if (status === "final") {
    try {
      const now = new Date().toISOString();
      await supabase
        .from("capacitacion_proceso_steps")
        .upsert(
          {
            osi_id: osiId,
            nro_sesion: nroSesion,
            phase: "ejecucion",
            step_key: "nomina_participantes",
            completed: true,
            completed_at: now,
            completed_by: null,
          },
          { onConflict: "osi_id,nro_sesion,phase,step_key" }
        );

      const { data: osiInfo } = await supabase
        .from("v_osi_lista")
        .select("nro_osi")
        .eq("id_osi", osiId)
        .maybeSingle();

      let facilitadorName = (session as any)?.nombre;
      if (!facilitadorName) {
        const { data: fac } = await supabase
          .from("facilitadores")
          .select("nombre_apellido")
          .eq("id", facilitadorId)
          .maybeSingle();
        facilitadorName = fac?.nombre_apellido || "Facilitador";
      }

      await notifyCapacitacionUsersOfUpload({
        osiId,
        nroOsi: osiInfo?.nro_osi ?? `ID ${osiId}`,
        facilitadorName,
        category: "servicio_finalizado",
      });
    } catch (notifErr) {
      console.error("[POST /api/portal/facilitador/participants] Notification error (non-fatal):", notifErr);
    }
  }

  revalidatePath("/portal/facilitador/dashboard");
  revalidatePath("/dashboard/capacitacion/seguimiento-servicios");

  return NextResponse.json({ success: true });
}
