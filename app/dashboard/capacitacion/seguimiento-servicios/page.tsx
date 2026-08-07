import { Briefcase } from "lucide-react";
import { getOSIsForManagement, getOSIFilterOptions, getOSIStatuses } from "@/app/actions/osi";
import {
  autoAdvanceEjecucionSteps,
  getAllProcesoStepsBatch,
  getOSISessions,
  type ProcesoStepRecord,
} from "@/app/actions/capacitacion-proceso-steps";
import SeguimientoServiciosClient from "./SeguimientoServiciosClient";
import type { OSIManagement, OSISesion, OSIFilters, OSIStatus } from "@/types";

export const dynamic = "force-dynamic";

// Serializable versions of the maps for client props
type StepsByOsiMap = Map<number, Map<number, Record<string, ProcesoStepRecord>>>;
type SessionsByOsiMap = Map<number, OSISesion[]>;

export default async function SeguimientoServiciosPage() {
  // Fetch initial OSIs (first page)
  const result = await getOSIsForManagement({}, 1, 20);
  const osis = result.osis as OSIManagement[];
  const osiIds = osis.map((o) => o.id_osi);

  // Auto-advance ejecucion steps based on dates (per-session)
  await autoAdvanceEjecucionSteps(
    osis.map((o) => ({
      id_osi: o.id_osi,
      fecha_inicio_real: o.fecha_inicio_real ?? null,
      desglose_recursos_sesiones: o.desglose_recursos_sesiones ?? null,
      sesiones_programadas: o.sesiones_programadas ?? null,
    })),
  );

  // Fetch all steps (both phases, all sessions) in parallel with sessions and filter options
  const [stepsMap, sessionsResult, filterOptions, statuses] = await Promise.all([
    osiIds.length > 0 ? getAllProcesoStepsBatch(osiIds) : Promise.resolve(new Map() as StepsByOsiMap),
    Promise.all(
      osis.map(async (osi) => {
        const sessions = await getOSISessions(osi.id_osi, {
          desglose_recursos_sesiones: osi.desglose_recursos_sesiones,
          sesiones_programadas: osi.sesiones_programadas,
        });
        return { osiId: osi.id_osi, sessions };
      }),
    ),
    getOSIFilterOptions(),
    getOSIStatuses(),
  ]);

  // Build sessions map
  const sessionsByOsi = new Map<number, OSISesion[]>();
  for (const { osiId, sessions } of sessionsResult) {
    sessionsByOsi.set(osiId, sessions);
  }

  // Convert Maps to plain objects for client component serialization
  const stepsPlain: Record<string, Record<string, Record<string, ProcesoStepRecord>>> = {};
  for (const [osiId, sessionMap] of stepsMap.entries()) {
    const sessionObj: Record<string, Record<string, ProcesoStepRecord>> = {};
    for (const [nroSesion, steps] of sessionMap.entries()) {
      sessionObj[String(nroSesion)] = steps;
    }
    stepsPlain[String(osiId)] = sessionObj;
  }

  const sessionsPlain: Record<string, OSISesion[]> = {};
  for (const [osiId, sessions] of sessionsByOsi.entries()) {
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

// Re-export types for client component
export type { StepsByOsiMap, SessionsByOsiMap, OSIFilters };
