import { 
  getFacilitatorSession, 
  getOSIParticipants,
  logoutFacilitator
} from "@/app/actions/facilitador-portal";
import { getOSIForControlServicios } from "@/app/actions/control-servicios";
import { createAdminClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, Info } from "lucide-react";
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
      <div className="max-w-5xl mx-auto py-10 px-4">
      <Link 
        href="/portal/facilitador/dashboard"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
        Volver al Dashboard
      </Link>

      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-1 rounded">
            OSI #{osi.nro_osi}
          </span>
          <span className="text-sm text-gray-500 font-medium">
            {osi.servicio || "Servicio General"}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{osi.nombre_empresa}</h1>
        <p className="text-gray-600 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Por favor, ingresa el listado de participantes y sus calificaciones finales.
        </p>
      </header>

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
