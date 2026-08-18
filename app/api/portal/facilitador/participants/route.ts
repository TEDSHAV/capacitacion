import { NextRequest, NextResponse } from "next/server";
import { getFacilitadorSessionFromRequest } from "@/utils/api-auth";
import { createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

interface SaveParticipantsBody {
  osiId: number;
  facilitadorId: number;
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

  // Validate session matches the request
  if (session.facilitador_id !== facilitadorId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (status === "final" && !acknowledged) {
    return NextResponse.json(
      { error: "Debes confirmar la declaración para finalizar el envío." },
      { status: 400 },
    );
  }

  const supabase = await createAdminClient();

  // Delete existing participants for this OSI/Facilitator to overwrite
  const { error: deleteError } = await supabase
    .from("ejecucion_osi_participantes")
    .delete()
    .eq("osi_id", osiId)
    .eq("facilitador_id", facilitadorId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const records = participants.map((p) => ({
    osi_id: osiId,
    facilitador_id: facilitadorId,
    nombre_apellido: p.nombre_apellido,
    cedula: p.cedula,
    score: p.score,
    status: status,
  }));

  if (records.length === 0) {
    // Clear acknowledgment since there are no participants
    await supabase
      .from("facilitador_acknowledgments")
      .delete()
      .eq("osi_id", osiId)
      .eq("facilitador_id", facilitadorId);

    revalidatePath("/portal/facilitador/dashboard");
    return NextResponse.json({ success: true });
  }

  const { error: insertError } = await supabase
    .from("ejecucion_osi_participantes")
    .insert(records);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Save acknowledgment audit record on final submission
  if (status === "final" && acknowledged && disclaimerText) {
    const { error: ackError } = await supabase
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

    if (ackError) {
      console.error("Failed to save acknowledgment:", ackError);
    }
  }

  revalidatePath("/portal/facilitador/dashboard");
  revalidatePath("/dashboard/capacitacion/seguimiento-servicios");

  return NextResponse.json({ success: true });
}
