import { Briefcase } from "lucide-react";
import { getOSIFilterOptions, getOSIStatuses } from "@/app/actions/osi";
import {
  getRescheduledOsiIds,
  getSeguimientoPageData,
} from "@/app/actions/capacitacion-proceso-steps";
import SeguimientoServiciosClient from "./SeguimientoServiciosClient";
import type { OSIStatus } from "@/types";

export const dynamic = "force-dynamic";

export default async function SeguimientoServiciosPage() {
  // Parallelize all initial data requirements in a single roundtrip to the DB
  const [rescheduledOsiIds, pageData, filterOptions, statuses] = await Promise.all([
    getRescheduledOsiIds(),
    getSeguimientoPageData({}, 1, 10),
    getOSIFilterOptions(),
    getOSIStatuses(),
  ]);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Planificación y Ejecución de Servicios
            </h1>
            <p className="mt-1 text-gray-600">
              Seguimiento del proceso completo de servicios de capacitación
            </p>
          </div>
        </div>
      </div>

      <SeguimientoServiciosClient
        initialOsis={pageData.osis}
        initialTotalCount={pageData.totalCount}
        initialStepsByOsi={pageData.stepsPlain}
        initialSessionsByOsi={pageData.sessionsPlain}
        initialRescheduledOsiIds={rescheduledOsiIds}
        filterOptions={filterOptions}
        statuses={statuses as OSIStatus[]}
      />
    </div>
  );
}
