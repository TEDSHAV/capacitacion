import {
  getFacilitatorSession,
  getOSIParticipants,
} from "@/app/actions/facilitador-portal";
import { getOSIForControlServicios } from "@/app/actions/control-servicios";
import { createAdminClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, Info, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { ParticipantForm } from "./participant-form";
import { getSessionCount } from "@/lib/osi-utils";

interface OSIPageProps {
  params: Promise<{ id: string }>;
}

export default async function FacilitadorOSIPage({ params }: OSIPageProps) {
  const resolvedParams = await params;
  const session = await getFacilitatorSession();
  if (!session) redirect("/portal/facilitador/login");

  const osiId = parseInt(resolvedParams.id);
  if (isNaN(osiId)) notFound();

  const [osi, participants] = await Promise.all([
    getOSIForControlServicios(osiId).catch(() => null),
    getOSIParticipants(osiId, session.facilitador_id)
  ]);

  if (!osi) notFound();

  // Security check: Is this OSI assigned to this facilitator?
  // Also fetch nro_sesion to know which session(s) they're assigned to.
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

  // Determine session context for the facilitador:
  // - If they have a session-specific assignment (nro_sesion != null), use that.
  // - If they only have an all-sessions assignment (nro_sesion = null), they need to pick.
  // - If they have both, prefer the specific session(s).
  const sessionAssignments = (assignments || []).map((a) => a.nro_sesion);
  const specificSessions = sessionAssignments.filter((s) => s !== null) as number[];
  const hasAllSessionsAssignment = sessionAssignments.some((s) => s === null);

  // assignedSession: a specific session if exactly one specific session assigned; otherwise null (needs picker)
  const assignedSession: number | null = specificSessions.length === 1 ? specificSessions[0] : null;
  // needsSessionPicker: true if facilitador is assigned to all sessions (or multiple sessions) and must choose
  const needsSessionPicker = assignedSession === null;

  // Total session count for this OSI (for the session picker dropdown)
  const sessionCount: number = getSessionCount(osi);

  console.log("[FacilitadorOSIPage] Session context:", {
    sessionCount,
    specificSessions,
    hasAllSessionsAssignment,
    assignedSession,
    needsSessionPicker,
    osiSesionesEjecucion: osi.sesiones_ejecucion,
    osiDesglose: Array.isArray(osi.desglose_recursos_sesiones) ? `array[${osi.desglose_recursos_sesiones.length}]` : osi.desglose_recursos_sesiones,
    osiSesionesProgramadas: Array.isArray(osi.sesiones_programadas) ? `array[${osi.sesiones_programadas.length}]` : osi.sesiones_programadas,
  });

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-10 px-4">
      <Link 
        href="/portal/facilitador/dashboard"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
        Volver al Dashboard
      </Link>

      <header className="mb-6 sm:mb-10">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-1 rounded">
            OSI #{osi.nro_osi}
          </span>
          <span className="text-sm text-gray-500 font-medium">
            {osi.servicio || "Servicio General"}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{osi.nombre_empresa}</h1>
        <p className="text-gray-600 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Sube la lista física, completa los datos de los participantes y revisa antes de enviar.
        </p>

        {/* Session assignment info banner */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Asignado a:</span>
          {sessionCount === 1 ? (
            // Single-session OSI: always show "Sesión 1" regardless of assignment type
            <span className="inline-flex items-center text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded">
              Sesión 1
            </span>
          ) : hasAllSessionsAssignment && specificSessions.length === 0 ? (
            // Multi-session OSI, assigned to all sessions
            <span className="inline-flex items-center text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded">
              Todas las sesiones
            </span>
          ) : (
            // Multi-session OSI, assigned to specific sessions
            specificSessions.sort((a, b) => a - b).map((s) => (
              <span key={s} className="inline-flex items-center text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded">
                Sesión {s}
              </span>
            ))
          )}
          {sessionCount > 1 && hasAllSessionsAssignment && specificSessions.length > 0 && (
            <span className="inline-flex items-center text-xs font-semibold bg-purple-50 text-purple-600 px-2 py-1 rounded border border-purple-200">
              + Todas las sesiones
            </span>
          )}
        </div>
      </header>

      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 sm:p-6 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-bold text-amber-900">
              AVISO IMPORTANTE: Obligatoriedad de Digitalización Post-Capacitación
            </p>
            <p className="text-amber-800">
              Estimado(a) facilitador(a), le recordamos que la digitalización y automatización de toda la documentación al finalizar cada curso es un requerimiento técnico obligatorio.
            </p>
            <p className="text-amber-800">
              Este proceso responde al cumplimiento de nuestro Sistema Integrado de Gestión (SIG) bajo la Norma ISO 14001, alineado con los siguientes controles operativos:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-amber-800">
              <li><strong>Impacto Ambiental (Cláusula 6.1.2):</strong> Reducción prioritaria de residuos de papel y consumibles de impresión.</li>
              <li><strong>Control de la Información (Cláusula 7.5.3):</strong> Garantía de integridad, legibilidad y protección contra pérdida física del historial del curso.</li>
              <li><strong>Control Operacional (Cláusula 8.1):</strong> Trazabilidad digital inmediata del flujo de entrega.</li>
            </ul>
            <p className="text-amber-800">
              Agradecemos su compromiso con la sostenibilidad y la excelencia operativa de la organización.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <ParticipantForm
          osiId={osiId}
          facilitadorId={session.facilitador_id}
          initialParticipants={participants.data || []}
          assignedSession={assignedSession}
          needsSessionPicker={needsSessionPicker}
          sessionCount={sessionCount}
          assignedSessions={specificSessions}
          hasAllSessionsAssignment={hasAllSessionsAssignment}
        />
      </div>
    </div>
  );
}
