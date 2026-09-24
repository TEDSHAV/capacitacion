import {
  getFacilitatorSession,
  getOSIParticipants,
} from "@/app/actions/facilitador-portal";
import { getOSIForControlServicios } from "@/app/actions/control-servicios";
import { getMaterialKitForOSI } from "@/app/actions/material-didactico";
import { createAdminClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Building2, Calendar } from "lucide-react";
import Link from "next/link";
import { ParticipantForm } from "./participant-form";
import { getSessionCount } from "@/lib/osi-utils";
import FacilitadorMaterialKit from "./FacilitadorMaterialKit";
import OSIWorkflowStepper from "./OSIWorkflowStepper";

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

  const sessionAssignments = (assignments || []).map((a) => a.nro_sesion);
  const specificSessions = sessionAssignments.filter((s) => s !== null) as number[];
  const hasAllSessionsAssignment = sessionAssignments.some((s) => s === null);

  const assignedSession: number | null = specificSessions.length === 1 ? specificSessions[0] : null;
  const needsSessionPicker = assignedSession === null;
  const sessionCount: number = getSessionCount(osi);

  // Determine if list has been finalized/sent
  const isFinal = (participants.data || []).some((p: any) => p.status === "final");

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
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>RIF: <strong>{osi.cliente_rif || "N/A"}</strong></span>
          </div>
          {osi.fecha_emision && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Emisión: <strong>{new Date(osi.fecha_emision).toLocaleDateString()}</strong></span>
            </div>
          )}

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

      {/* Stepper Workflow Guide */}
      <OSIWorkflowStepper
        hasMaterial={!!materialKitRes.data && materialKitRes.data.materiales.length > 0}
        isFinal={isFinal}
      />

      {/* Material Didáctico Kit */}
      {materialKitRes.data && (
        <FacilitadorMaterialKit kit={materialKitRes.data} />
      )}

      {/* Main Participant Registration Form (Contains Hoja de Calificación on top of Fotos, Disclaimer, and ISO Banner at the bottom) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
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
