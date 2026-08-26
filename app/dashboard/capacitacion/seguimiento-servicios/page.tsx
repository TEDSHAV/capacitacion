import { Suspense } from "react";
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
  // Fetch initial OSIs first (fast — 2-3 round trips) so the page shell can paint.
  const result = await getOSIsForManagement({}, 1, 20);
  const osis = result.osis as OSIManagement[];

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

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-10 bg-gray-100 rounded animate-pulse" />
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {Array.from({ length: Math.min(osis.length, 8) }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-gray-100">
                  <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                  <div className="ml-auto h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        }
      >
        <SeguimientoContent osis={osis} totalCount={result.totalCount} />
      </Suspense>
    </div>
  );
}

async function SeguimientoContent({
  osis,
  totalCount,
}: {
  osis: OSIManagement[];
  totalCount: number;
}) {
  // Auto-advance ejecucion steps based on dates (per-session) AND fetch filter options / statuses
  // in parallel. autoAdvanceEjecucionSteps batches all seeding into a single upsert and
  // returns the steps + sessions maps it builds internally.
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
    <SeguimientoServiciosClient
      initialOsis={osis}
      initialTotalCount={totalCount}
      initialStepsByOsi={stepsPlain}
      initialSessionsByOsi={sessionsPlain}
      filterOptions={filterOptions}
      statuses={statuses as OSIStatus[]}
    />
  );
}
