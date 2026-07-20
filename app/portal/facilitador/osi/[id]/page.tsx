import { 
  getFacilitatorSession, 
  getOSIParticipants,
  logoutFacilitator
} from "@/app/actions/facilitador-portal";
import { getOSIForControlServicios } from "@/app/actions/control-servicios";
import { createAdminClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, Info, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { PortalNavbar } from "@/components/PortalNavbar";
import { ParticipantForm } from "./participant-form";

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
  const supabase = await createAdminClient();
  const { data: assignmentCheck } = await supabase
    .from("facilitador_osi_assignments")
    .select("id")
    .eq("osi_id", osiId)
    .eq("facilitador_id", session.facilitador_id)
    .eq("is_active", true)
    .limit(1);

  const isAssigned = assignmentCheck && assignmentCheck.length > 0;

  if (!isAssigned) {
    redirect("/portal/facilitador/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNavbar title="Portal de Facilitadores" logoutAction={logoutFacilitator} loginPath="/portal/facilitador/login" />
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
        />
      </div>
    </div>
    </div>
  );
}
