import {
  getFacilitatorSession,
  getOSIParticipants,
} from "@/app/actions/facilitador-portal";
import { getOSIForControlServicios } from "@/app/actions/control-servicios";
import { createAdminClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import Link from "next/link";
import { ParticipantForm } from "./participant-form";
import FacilitadorExamCard from "./FacilitadorExamCard";
import { getSessionCount } from "@/lib/osi-utils";
import { getOsiSessionInfo } from "@/app/actions/osi-facilitador-assignments";


interface OSIPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ sesion?: string }>;
}

export default async function FacilitadorOSIPage({ params, searchParams }: OSIPageProps) {
  const resolvedParams = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const querySession = resolvedSearch.sesion ? parseInt(resolvedSearch.sesion) : null;
  const session = await getFacilitatorSession();
  if (!session) redirect("/portal/facilitador/login");

  const osiId = parseInt(resolvedParams.id);
  if (isNaN(osiId)) notFound();

  const [osi, participants] = await Promise.all([
    getOSIForControlServicios(osiId).catch(() => null),
    getOSIParticipants(osiId, session.facilitador_id),
  ]);

  if (!osi) notFound();

  // Security check: Is this OSI assigned to this facilitator?
  const supabase = await createAdminClient();
  const { data: assignments } = await supabase
    .from("facilitador_osi_assignments")
    .select("id, nro_sesion, attachment_received")
    .eq("osi_id", osiId)
    .eq("facilitador_id", session.facilitador_id)
    .eq("is_active", true);

  const isAssigned = assignments && assignments.length > 0;

  if (!isAssigned) {
    redirect("/portal/facilitador/dashboard");
  }

  // Fetch course passing grade (nota_aprobatoria) and evaluation mode from catalogo_servicios
  let notaAprobatoria: number | null = null;
  let evaluacionTeoricaPractica = false;
  if (osi.id_servicio) {
    const { data: curso, error: cursoErr } = await supabase
      .from("catalogo_servicios")
      .select("nota_aprobatoria, evaluacion_teorica_practica")
      .eq("id", osi.id_servicio)
      .maybeSingle();

    if (cursoErr && cursoErr.code === "42703") {
      const { data: fbCurso } = await supabase
        .from("catalogo_servicios")
        .select("nota_aprobatoria")
        .eq("id", osi.id_servicio)
        .maybeSingle();
      if (fbCurso && fbCurso.nota_aprobatoria !== null) {
        notaAprobatoria = fbCurso.nota_aprobatoria;
      }
    } else if (curso) {
      if (curso.nota_aprobatoria !== null) {
        notaAprobatoria = curso.nota_aprobatoria;
      }
      evaluacionTeoricaPractica = Boolean((curso as any).evaluacion_teorica_practica);
    }
  } else if (osi.servicio) {
    const { data: curso, error: cursoErr } = await supabase
      .from("catalogo_servicios")
      .select("nota_aprobatoria, evaluacion_teorica_practica")
      .ilike("nombre", osi.servicio.trim())
      .maybeSingle();

    if (cursoErr && cursoErr.code === "42703") {
      const { data: fbCurso } = await supabase
        .from("catalogo_servicios")
        .select("nota_aprobatoria")
        .ilike("nombre", osi.servicio.trim())
        .maybeSingle();
      if (fbCurso && fbCurso.nota_aprobatoria !== null) {
        notaAprobatoria = fbCurso.nota_aprobatoria;
      }
    } else if (curso) {
      if (curso.nota_aprobatoria !== null) {
        notaAprobatoria = curso.nota_aprobatoria;
      }
      evaluacionTeoricaPractica = Boolean((curso as any).evaluacion_teorica_practica);
    }
  }

  const sedeUpper = String(osi.sede || "").toUpperCase();
  const nombreEmpresaUpper = String(osi.nombre_empresa || "").toUpperCase();
  const isPlanta = sedeUpper.includes("PLANTA") || nombreEmpresaUpper.includes("PLANTA");

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

  // Check if an active digital evaluation exists for this OSI
  const { data: osiEvaluacion } = await supabase
    .from("capacitacion_osi_evaluaciones")
    .select("id, titulo, is_active, preguntas")
    .eq("id_osi", osiId)
    .eq("is_active", true)
    .maybeSingle();

  const { count: submissionsCount } = osiEvaluacion
    ? await supabase
        .from("capacitacion_evaluaciones_respuestas")
        .select("id", { count: "exact", head: true })
        .eq("id_osi", osiId)
    : { count: 0 };

  const relevantSessionNums =
    specificSessions.length > 0 && !hasAllSessionsAssignment
      ? [...specificSessions].sort((a, b) => a - b)
      : Array.from({ length: sessionCount }, (_, i) => i + 1);

  const finalizedSessionNums = relevantSessionNums.filter((ses) => {
    const isMarkedReceived = (assignments || []).some(
      (a) =>
        (relevantSessionNums.length > 1
          ? a.nro_sesion === ses
          : a.nro_sesion === ses || a.nro_sesion == null) && a.attachment_received
    );
    if (isMarkedReceived) return true;

    const forSes =
      relevantSessionNums.length > 1
        ? (attachments || []).filter((a) => a.nro_sesion === ses)
        : (attachments || []).filter((a) => a.nro_sesion === ses || a.nro_sesion == null);
    const hasAsist = forSes.some((a) => a.category === "lista_asistencia");
    const hasDigitalEval = Boolean(osiEvaluacion && (submissionsCount ?? 0) > 0);
    const hasCalif = (notaAprobatoria === 0) || hasDigitalEval || forSes.some((a) => a.category === "hoja_calificacion");
    const hasFotos = forSes.some((a) => a.category === "material_fotografico");
    const hasFinalPart = (participants.data || []).some(
      (p: any) => (p.nro_sesion ?? 1) === ses && p.status === "final"
    );
    return hasAsist && hasCalif && hasFotos && hasFinalPart;
  });

  const pendingSessionNums = relevantSessionNums.filter((ses) => !finalizedSessionNums.includes(ses));

  const nroOsiInt = parseInt(String(osi.nro_osi || "").replace(/[^\d]/g, ""), 10);
  const { data: certRows } = nroOsiInt
    ? await supabase
        .from("certificados")
        .select("id")
        .eq("nro_osi", nroOsiInt)
        .is("motivo_anulacion", null)
        .limit(1)
    : { data: [] };
  const hasCertificates = Boolean(certRows && certRows.length > 0);

  // Determine target session strictly:
  const targetSession =
    querySession && relevantSessionNums.includes(querySession)
      ? querySession
      : pendingSessionNums.length > 0
      ? pendingSessionNums[0]
      : relevantSessionNums[0] || 1;

  // Enforce canonical isolated URL if multi-session
  if ((relevantSessionNums.length > 1 || (sessionCount > 1 && targetSession > 1)) && resolvedSearch.sesion !== String(targetSession)) {
    redirect(`/portal/facilitador/osi/${osiId}?sesion=${targetSession}`);
  }

  const isTargetSessionFinal = finalizedSessionNums.includes(targetSession);

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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-800 px-2.5 py-1 rounded-md border border-sky-200">
              OSI #{osi.nro_osi}
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              {osi.servicio || "Servicio General"}
            </span>
          </div>

          {sessionCount > 1 && (
            <span className="text-xs font-extrabold bg-sky-600 text-white px-3 py-1 rounded-lg shadow-2xs">
              Sesión {targetSession} de {sessionCount}
            </span>
          )}
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

          {/* Active Session Date */}
          {(() => {
            const targetSessionInfo = sessionsInfo.find((s) => s.nro_sesion === targetSession);
            const dateStr =
              targetSessionInfo?.fecha ||
              (Array.isArray(osi.sesiones_programadas) && osi.sesiones_programadas[targetSession - 1]?.fecha) ||
              osi.fecha_inicio_real ||
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
        </div>
      </header>

      {/* Classroom Digital Evaluation Card (if assigned by Capacitación) */}
      {osiEvaluacion && (
        <FacilitadorExamCard
          osi={{
            id_osi: osiId,
            nro_osi: osi.nro_osi || String(osiId),
            servicio: osi.servicio || "Servicio General",
            nombre_empresa: osi.nombre_empresa || "",
          }}
          examTitle={osiEvaluacion.titulo}
          submissionsCount={submissionsCount || 0}
          totalQuestions={
            Array.isArray(osiEvaluacion.preguntas) ? osiEvaluacion.preguntas.length : undefined
          }
        />
      )}

      {/* Guided Wizard: Stepper, Attendance, Participants, Photos, and Final Review */}
      <ParticipantForm
        osiId={osiId}
        facilitadorId={session.facilitador_id}
        initialParticipants={participants.data || []}
        osi={osi}
        assignedSession={targetSession}
        needsSessionPicker={false}
        sessionCount={sessionCount}
        assignedSessions={[targetSession]}
        hasAllSessionsAssignment={false}
        isFinal={isTargetSessionFinal}
        initialSession={targetSession}
        initialFinalizedSessions={finalizedSessionNums}
        notaAprobatoria={notaAprobatoria}
        sessionsInfo={sessionsInfo}
        hasCertificates={hasCertificates}
        isPlanta={isPlanta}
        evaluacionTeoricaPractica={evaluacionTeoricaPractica}
        hasDigitalEvaluation={Boolean(osiEvaluacion)}
        digitalSubmissionsCount={submissionsCount || 0}
        digitalExamTitle={osiEvaluacion?.titulo}
      />
    </div>
  );
}
