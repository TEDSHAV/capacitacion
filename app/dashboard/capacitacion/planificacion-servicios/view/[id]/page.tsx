import { 
  getControlServiciosRecord, 
  getOSIForControlServicios 
} from "@/app/actions/control-servicios";
import RequisicionView from "./components/requisicion-view";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";

export default async function ViewRequisicionPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const record = await getControlServiciosRecord(parseInt(id));

  if (!record) {
    notFound();
  }

  let osiData = null;
  if (record.id_osi) {
    try {
      osiData = await getOSIForControlServicios(record.id_osi);
    } catch (e) {
      console.error("Error fetching OSI data for view:", e);
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/capacitacion/planificacion-servicios/lista">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Detalle de Requisición
            </h1>
            <p className="mt-2 text-gray-600">
              Vista de lectura del registro {record.nro_correlativo}
            </p>
          </div>
        </div>
        <Link href={`/dashboard/capacitacion/planificacion-servicios/solicitud-requisiciones?edit=${id}`}>
          <Button className="flex gap-2">
            <Edit className="h-4 w-4" />
            Editar Registro
          </Button>
        </Link>
      </div>

      <RequisicionView record={record} osiData={osiData} />
    </div>
  );
}
