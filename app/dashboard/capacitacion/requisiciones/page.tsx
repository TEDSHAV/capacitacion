import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { getAllRequisiciones, isRequisicionesAdmin, isCurrentUserCapacitacion, getOsiNumbersForLookup, getCoordinatedDepartments, getDepartmentsInLedGerencias, getCoordinatorlessDepartmentsInLedGerencias } from "@/app/actions/requisiciones";
import RequisicionesTable from "./components/RequisicionesTable";
import { FilePlus2 } from "lucide-react";

export const metadata = {
  title: "Requisiciones | PRISMA",
};

export default async function RequisicionesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  const isAdminView = await isRequisicionesAdmin();
  const isCapacitacionView = !isAdminView && await isCurrentUserCapacitacion();
  // Approval scope is resolved from departamentos.coordinador / gerencias.lider,
  // never from the user's own department (a coordinador/lider may belong to a
  // different department than the one they coordinate/lead).
  const coordinadorDepts = isAdminView ? [] : await getCoordinatedDepartments();
  const isCoordinador = coordinadorDepts.length > 0;
  const [liderDepts, liderFallbackDepts] = isAdminView
    ? [[], []]
    : await Promise.all([
        getDepartmentsInLedGerencias(),
        getCoordinatorlessDepartmentsInLedGerencias(),
      ]);
  const isLider = liderDepts.length > 0;
  const [records, osiPairs] = await Promise.all([
    getAllRequisiciones(isAdminView),
    getOsiNumbersForLookup(),
  ]);

  const osiLookup = new Map<number, string>();
  (osiPairs || []).forEach(({ id_osi, nro_osi }) => {
    if (id_osi && nro_osi) {
      osiLookup.set(id_osi, nro_osi);
    }
  });

  const pendingLiderCount = (records || []).filter(
    (r: any) => r.tipo_solicitud === "Interno" && r.lider_estatus === "pendiente"
  ).length;
  const pendingCoordinadorCount = (records || []).filter(
    (r: any) => r.tipo_solicitud === "Externo" && r.coordinador_estatus === "pendiente"
  ).length;
  const pendingApprovalCount = pendingLiderCount + pendingCoordinadorCount;

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdminView ? "Gestión de Requisiciones" : "Mis Requisiciones"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {isAdminView
              ? "Listado de todas las requisiciones recibidas por Administración."
              : (isLider || isCoordinador) && pendingApprovalCount > 0
                ? `Tienes ${pendingApprovalCount} requisición${pendingApprovalCount !== 1 ? "es" : ""} pendiente${pendingApprovalCount !== 1 ? "s" : ""} por aprobar.`
                : isCapacitacionView
                  ? "Listado de las requisiciones creadas por el departamento de Capacitación."
                  : "Listado de todas las solicitudes de requisición que has creado."}
          </p>
        </div>
        <Link href="/dashboard/capacitacion/requisiciones/create">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex gap-2">
            <FilePlus2 className="h-4 w-4" />
            Nueva Requisición
          </Button>
        </Link>
      </div>

      <RequisicionesTable
        records={records || []}
        isAdminView={isAdminView}
        osiLookup={osiLookup}
        isCoordinador={isCoordinador}
        coordinadorDepts={coordinadorDepts}
        isLider={isLider}
        liderDepts={liderDepts}
        liderFallbackDepts={liderFallbackDepts}
      />
    </div>
  );
}
