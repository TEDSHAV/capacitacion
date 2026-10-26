import {
  getFacilitatorSession,
  getOSIParticipants,
} from "@/app/actions/facilitador-portal";
import { getOSIForControlServicios } from "@/app/actions/control-servicios";
import { getMaterialKitForOSI } from "@/app/actions/material-didactico";
import { createAdminClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Building2, Calendar, MapPin } from "lucide-react";
import Link from "next/link";
import { ParticipantForm } from "./participant-form";
import { getSessionCount } from "@/lib/osi-utils";
import { getOsiSessionInfo } from "@/app/actions/osi-facilitador-assignments";


interface OSIPageProps {
  params: Promise<{ id: string }>;
}

export default async function FacilitadorOSIPage({ params }: OSIPageProps) {
  const resolvedParams = await params;
  const session = await getFacilitatorSession();
  if (!session) redirect("/portal/facilitador/login");

  const osiId = parseInt(resolvedParams.id);
  if (isNaN(osiId)) notFound();

  const [osi, participants, materialKitRes] = await Promise.all([
    getOSIForControlServicios(osiId).catch(() => null),
    getOSIParticipants(osiId, session.facilitador_id),
    getMaterialKitForOSI(osiId).catch(() => ({ data: null, error: null })),
  ]);

  if (!osi) notFound();

  // Security check: Is this OSI assigned to this facilitator?
  const supabase = await createAdminClient();
  const { data: assignments } = await supabase
    .from("facilitador_osi_assignments")
    .select("id, nro_sesion")
    .eq("osi_id", osiId)
    .eq("facilitador_id", session.facilitador_id)
    .eq("is_active", true);

  const isAssigned = assignments && assignments.length > 0;

  if (!isAssigned) {
    redirect("/portal/facilitador/dashboard");
  }

  // Fetch course passing grade (nota_aprobatoria) from catalogo_servicios
  let notaAprobatoria: number | null = null;
  if (osi.id_servicio) {
    const { data: curso } = await supabase
      .from("catalogo_servicios")
      .select("nota_aprobatoria")
      .eq("id", osi.id_servicio)
      .maybeSingle();
    if (curso && curso.nota_aprobatoria !== null) {
      notaAprobatoria = curso.nota_aprobatoria;
    }
  } else if (osi.servicio) {
    const { data: curso } = await supabase
      .from("catalogo_servicios")
      .select("nota_aprobatoria")
      .ilike("nombre", osi.servicio.trim())
      .maybeSingle();
    if (curso && curso.nota_aprobatoria !== null) {
      notaAprobatoria = curso.nota_aprobatoria;
    }
  }

  const sessionAssignments = (assignments || []).map((a) => a.nro_sesion);
  const specificSessions = sessionAssignments.filter((s) => s !== null) as number[];
  const hasAllSessionsAssignment = sessionAssignments.some((s) => s === null);

  const assignedSession: number | null =
    specificSessions.length === 1 && !hasAllSessionsAssignment ? specificSessions[0] : null;
  const sessionInfo = await getOsiSessionInfo(osiId);
  const sessionCount: number = Math.max(sessionInfo.totalCount, getSessionCount(osi), ...specificSessions);

  const sessionsInfo = Array.from({ length: sessionCount }, (_, i) => {
    const n = i + 1;
    const fromInfo = sessionInfo.sessions.find((s) => s.nro_sesion === n);
    return {
      nro_sesion: n,
      fecha:
        fromInfo?.fecha ??
        (Array.isArray(osi.sesiones_programadas) && osi.sesiones_programadas[i]?.fecha
          ? osi.sesiones_programadas[i].fecha
          : null),
      hora_inicio: fromInfo?.hora_inicio ?? null,
      hora_fin: fromInfo?.hora_fin ?? null,
    };
  });


  const needsSessionPicker = assignedSession === null;

  // Verify whether all assigned sessions actually have attachments
  const { data: attachments } = await supabase
    .from("ejecucion_osi_asistencia")
    .select("category, nro_sesion")
    .eq("osi_id", osiId)
    .eq("facilitador_id", session.facilitador_id);

  const relevantSessionNums =
    specificSessions.length > 0 && !hasAllSessionsAssignment
      ? specificSessions
      : Array.from({ length: sessionCount }, (_, i) => i + 1);

  const allAssignedSessionsHaveAttachments =
    relevantSessionNums.length === 0 ||
    relevantSessionNums.every((ses) => {
      const forSes =
        relevantSessionNums.length > 1
          ? (attachments || []).filter((a) => a.nro_sesion === ses)
          : (attachments || []).filter((a) => a.nro_sesion === ses || a.nro_sesion == null);
      const hasAsist = forSes.some((a) => a.category === "lista_asistencia");
      const hasCalif = (notaAprobatoria === 0) || forSes.some((a) => a.category === "hoja_calificacion");
      const hasFotos = forSes.some((a) => a.category === "material_fotografico");
      return hasAsist && hasCalif && hasFotos;
    });

  // Determine if list has been finalized/sent AND all assigned sessions have attachments
  const isFinal =
    (participants.data || []).some((p: any) => p.status === "final") &&
    allAssignedSessionsHaveAttachments;

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Back to Dashboard link */}
      <div>
        <Link
          href="/portal/facilitador/dashboard"
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-slate-600 hover:text-sky-700 group transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-1 transition-transform" />
          Volver a Mis Servicios
        </Link>
      </div>

      {/* Header Service Card (Light & Modern) */}
      <header className="p-6 rounded-2xl bg-gradient-to-br from-white via-sky-50/40 to-blue-50/30 border border-sky-100/90 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-800 px-2.5 py-1 rounded-md border border-sky-200">
            OSI #{osi.nro_osi}
          </span>
          <span className="text-xs text-slate-500 font-semibold">
            {osi.servicio || "Servicio General"}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
          {osi.nombre_empresa}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
          {(osi.ciudad || osi.estado) && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span><strong>{[osi.ciudad, osi.estado].filter(Boolean).join(", ")}</strong></span>
            </div>
          )}
          {(() => {
            const dateStr =
              osi.fecha_inicio_real ||
              (Array.isArray(osi.sesiones_programadas) && osi.sesiones_programadas[0]?.fecha) ||
              osi.fecha_emision;
            if (!dateStr) return null;
            let formattedDate = dateStr;
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              const [y, m, d] = dateStr.split("-");
              formattedDate = `${d}/${m}/${y}`;
            } else {
              try {
                formattedDate = new Date(dateStr).toLocaleDateString("es-VE");
              } catch {}
            }
            return (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Fecha: <strong>{formattedDate}</strong></span>
              </div>
            );
          })()}

          {/* Session assignment badges (Light Sky/Teal) */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Asignado:</span>
            {sessionCount === 1 ? (
              <span className="inline-flex items-center text-xs font-semibold bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200">
                Sesión 1
              </span>
            ) : hasAllSessionsAssignment && specificSessions.length === 0 ? (
              <span className="inline-flex items-center text-xs font-semibold bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200">
                Todas las sesiones
              </span>
            ) : (
              specificSessions.sort((a, b) => a - b).map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center text-xs font-semibold bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200"
                >
                  Sesión {s}
                </span>
              ))
            )}
            {sessionCount > 1 && hasAllSessionsAssignment && specificSessions.length > 0 && (
              <span className="inline-flex items-center text-xs font-semibold bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200">
                + Todas
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Guided Wizard: Stepper, Material Kit, Attendance, Participants, Photos, and Final Review */}
      <ParticipantForm
        osiId={osiId}
        facilitadorId={session.facilitador_id}
        initialParticipants={participants.data || []}
        materialKit={materialKitRes.data}
        osi={osi}
        assignedSession={assignedSession}
        needsSessionPicker={needsSessionPicker}
        sessionCount={sessionCount}
        assignedSessions={specificSessions}
        hasAllSessionsAssignment={hasAllSessionsAssignment}
        isFinal={isFinal}
        notaAprobatoria={notaAprobatoria}
        sessionsInfo={sessionsInfo}
      />
    </div>
  );
}
