import { Briefcase } from "lucide-react";
import { getOSIsForManagement, getOSIFilterOptions, getOSIStatuses } from "@/app/actions/osi";
import {
  autoAdvanceEjecucionSteps,
  type ProcesoStepRecord,
} from "@/app/actions/capacitacion-proceso-steps";
import SeguimientoServiciosClient from "./SeguimientoServiciosClient";
import type { OSIManagement, OSISesion, OSIStatus } from "@/types";

export const dynamic = "force-dynamic";

export default async function SeguimientoServiciosPage() {
  // Fetch initial OSIs (first page)
  const result = await getOSIsForManagement({}, 1, 20);
  const osis = result.osis as OSIManagement[];

  // Auto-advance ejecucion steps based on dates (per-session) AND fetch filter options / statuses
  // in parallel. autoAdvanceEjecucionSteps now batches all seeding into a single upsert and
  // returns the steps + sessions maps it builds internally, so we no longer need separate
  // getAllProcesoStepsBatch / per-OSI getOSISessions calls afterwards.
  const [autoResult, filterOptions, statuses] = await Promise.all([
    osis.length > 0
      ? autoAdvanceEjecucionSteps(
          osis.map((o) => ({
            id_osi: o.id_osi,
            fecha_inicio_real: o.fecha_inicio_real ?? null,
            desglose_recursos_sesiones: o.desglose_recursos_sesiones ?? null,
            sesiones_programadas: o.sesiones_programadas ?? null,
          })),
        )
      : Promise.resolve({
          stepsByOsi: new Map<number, Map<number, Record<string, ProcesoStepRecord>>>(),
          sessionsByOsi: new Map<number, OSISesion[]>(),
        }),
    getOSIFilterOptions(),
    getOSIStatuses(),
  ]);

  // Convert Maps to plain objects for client component serialization
  const stepsPlain: Record<string, Record<string, Record<string, ProcesoStepRecord>>> = {};
  for (const [osiId, sessionMap] of autoResult.stepsByOsi.entries()) {
    const sessionObj: Record<string, Record<string, ProcesoStepRecord>> = {};
    for (const [nroSesion, steps] of sessionMap.entries()) {
      sessionObj[String(nroSesion)] = steps;
    }
    stepsPlain[String(osiId)] = sessionObj;
  }

  const sessionsPlain: Record<string, OSISesion[]> = {};
  for (const [osiId, sessions] of autoResult.sessionsByOsi.entries()) {
    sessionsPlain[String(osiId)] = sessions;
  }

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
        initialOsis={osis}
        initialTotalCount={result.totalCount}
        initialStepsByOsi={stepsPlain}
        initialSessionsByOsi={sessionsPlain}
        filterOptions={filterOptions}
        statuses={statuses as OSIStatus[]}
      />
    </div>
  );
}
