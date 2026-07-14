import { getFacilitatorSession, getAssignedOSIs, logoutFacilitator } from "@/app/actions/facilitador-portal";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PortalNavbar } from "@/components/PortalNavbar";
import { toTitleCase } from "@/utils/string-utils";
import { 
  ClipboardList, 
  Calendar, 
  Building2, 
  ChevronRight, 
  CheckCircle2,
  Clock
} from "lucide-react";

export default async function FacilitadorDashboardPage() {
  const session = await getFacilitatorSession();

  if (!session) {
    redirect("/portal/facilitador/login");
  }

  const { data: osis, error } = await getAssignedOSIs(session.facilitador_id);

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNavbar title="Portal de Facilitadores" logoutAction={logoutFacilitator} loginPath="/portal/facilitador/login" />
      <div className="max-w-5xl mx-auto py-10 px-4">
      <header className="mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bienvenido, {toTitleCase(session.nombre)}</h1>
          <p className="text-gray-600">Aquí puedes gestionar tus servicios asignados.</p>
        </div>
      </header>

      <div className="grid gap-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-blue-600" />
          Servicios Asignados
        </h2>

        {osis && osis.length > 0 ? (
          <div className="grid gap-4">
            {osis.map((osi: any) => (
              <Link 
                key={osi.id_osi} 
                href={`/portal/facilitador/osi/${osi.id_osi}`}
                className="block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        OSI #{osi.nro_osi}
                      </span>
                      <span className="text-sm text-gray-500 font-medium">
                        {osi.servicio || "Servicio General"}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900">
                      {osi.nombre_empresa}
                    </h3>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Emisión: {osi.fecha_emision ? new Date(osi.fecha_emision).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span>RIF: {osi.cliente_rif || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-tight">Estado</p>
                      {osi.participant_status === "final" ? (
                        <div className="flex items-center gap-1 text-green-600 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Listado Enviado</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-600 font-medium">
                          <Clock className="w-4 h-4" />
                          <span>Pendiente Datos</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl py-16 flex flex-col items-center justify-center">
            <ClipboardList className="w-12 h-12 text-gray-200 mb-4" />
            <p className="text-gray-500">No tienes servicios asignados actualmente.</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
