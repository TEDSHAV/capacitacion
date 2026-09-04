"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getFacilitatorsAction } from "@/app/actions/facilitators-crud";
import { getEvaluacionesList } from "@/app/actions/evaluacion-facilitadores";
import { CachedDataBanner } from "@/components/CachedDataBanner";
import {
  cachePortalData,
  getCachedPortalData,
} from "@/lib/offline/portal-data-cache";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { toTitleCase } from "@/utils/string-utils";
import type { Facilitador } from "@/types";
import {
  ClipboardCheck,
  Search,
  Loader2,
  Plus,
  ChevronRight,
  Calendar,
  TrendingUp,
} from "lucide-react";
import FacilitadorPickerModal from "../../gestion-asignaciones/components/FacilitadorPickerModal";

interface EvaluacionRow {
  id: number;
  facilitador_id: number;
  tipo_evaluacion: string;
  fecha_evaluacion: string;
  puntaje_total: number | null;
  porcentaje_total: number | null;
  condicion_final: string | null;
}

interface FacilitadorWithEval extends Facilitador {
  latestEval?: EvaluacionRow;
  evalCount?: number;
}

const CONDICION_LABELS: Record<string, { label: string; color: string }> = {
  aprobado: { label: "Aprobado", color: "bg-green-100 text-green-700 border-green-200" },
  aprobado_supervision: { label: "Aprobado bajo supervisión", color: "bg-amber-100 text-amber-700 border-amber-200" },
  no_aprobado: { label: "No aprobado", color: "bg-red-100 text-red-700 border-red-200" },
  aceptable: { label: "Aceptable", color: "bg-green-100 text-green-700 border-green-200" },
  no_aceptable: { label: "No aceptable", color: "bg-red-100 text-red-700 border-red-200" },
};

const TIPO_LABELS: Record<string, string> = {
  nuevo: "Verificación Inicial",
  seguimiento: "Seguimiento",
  reevaluacion: "Reevaluación",
};

export default function EvaluacionListClient() {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [loading, setLoading] = useState(true);
  const [facilitadores, setFacilitadores] = useState<FacilitadorWithEval[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const hasInitialized = useRef(false);

  const loadData = useCallback(async () => {
    const [facResult, evalResult] = await Promise.all([
      getFacilitatorsAction(),
      getEvaluacionesList(),
    ]);

    const facs = (facResult.data as Facilitador[]) || [];
    const evals = (evalResult.evaluaciones as unknown as EvaluacionRow[]) || [];

    // Group evaluations by facilitador — latest per facilitador
    const latestByFac = new Map<number, EvaluacionRow>();
    const countByFac = new Map<number, number>();
    for (const ev of evals) {
      const existing = latestByFac.get(ev.facilitador_id);
      if (!existing || ev.fecha_evaluacion > existing.fecha_evaluacion) {
        latestByFac.set(ev.facilitador_id, ev);
      }
      countByFac.set(ev.facilitador_id, (countByFac.get(ev.facilitador_id) ?? 0) + 1);
    }

    const merged: FacilitadorWithEval[] = facs
      .map((f) => ({
        ...f,
        latestEval: latestByFac.get(f.id),
        evalCount: countByFac.get(f.id) ?? 0,
      }))
      .sort((a, b) =>
        (a.nombre_apellido || "").localeCompare(b.nombre_apellido || "", "es", {
          sensitivity: "base",
        }),
      );

    setFacilitadores(merged);
    setEvaluaciones(evals);
    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    loadData();
  }, [loadData]);

  // Offline cache
  useEffect(() => {
    if (!isOnline && !loading && facilitadores.length === 0) {
      getCachedPortalData<{ facilitadores: FacilitadorWithEval[]; evaluaciones: EvaluacionRow[] }>(
        "dash_eval_facilitadores",
      )
        .then((cached) => {
          if (cached) {
            setFacilitadores(cached.data.facilitadores);
            setEvaluaciones(cached.data.evaluaciones);
            setFromCache(true);
            setCachedAt(cached.cachedAt);
          }
        })
        .catch(() => {});
    }
    if (isOnline && !loading && facilitadores.length > 0) {
      cachePortalData("dash_eval_facilitadores", "dash_eval_facilitadores", {
        facilitadores,
        evaluaciones,
      })
        .then(() => {
          setFromCache(false);
          setCachedAt(null);
        })
        .catch(() => {});
    }
  }, [isOnline, loading, facilitadores, evaluaciones]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return facilitadores;
    return facilitadores.filter(
      (f) =>
        (f.nombre_apellido || "").toLowerCase().includes(term) ||
        (f.cedula || "").toLowerCase().includes(term),
    );
  }, [facilitadores, searchTerm]);

  const stats = useMemo(() => {
    const total = facilitadores.length;
    const active = facilitadores.filter((f) => f.is_active).length;
    const withEval = facilitadores.filter((f) => f.latestEval).length;
    return { total, active, withEval };
  }, [facilitadores]);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Evaluación de Facilitadores
        </h1>
        <p className="mt-2 text-gray-600">
          Registro y evaluación periódica de facilitadores como proveedores
          (RG-CAP-004). Gestione verificaciones iniciales, evaluaciones de
          seguimiento y reevaluaciones.
        </p>
      </div>

      {fromCache && (
        <div className="mb-4">
          <CachedDataBanner cachedAt={cachedAt} isOnline={isOnline} />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-violet-600" />
          <div>
            <p className="text-sm text-gray-500">Total Facilitadores</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-green-600" />
          <div>
            <p className="text-sm text-gray-500">Con Evaluación</p>
            <p className="text-2xl font-bold text-gray-900">{stats.withEval}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          <div>
            <p className="text-sm text-gray-500">Evaluaciones Realizadas</p>
            <p className="text-2xl font-bold text-gray-900">{evaluaciones.length}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Evaluación
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center py-16">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
          <p className="text-sm text-gray-500 mt-3">Cargando facilitadores...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {searchTerm
              ? `No se encontraron facilitadores para "${searchTerm}"`
              : "No hay facilitadores registrados"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Cod
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nombre y Apellido
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Estatus
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Cédula
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Últ. Evaluación
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Resultado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Próxima Ev.
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.map((f) => {
                const latest = f.latestEval;
                const condicion = latest?.condicion_final
                  ? CONDICION_LABELS[latest.condicion_final]
                  : null;
                const proximaEv = latest
                  ? new Date(new Date(latest.fecha_evaluacion).setFullYear(
                      new Date(latest.fecha_evaluacion).getFullYear() + 1,
                    ))
                  : null;
                return (
                  <tr
                    key={f.id}
                    onClick={() =>
                      router.push(
                        `/dashboard/capacitacion/evaluacion-facilitadores/${f.id}`,
                      )
                    }
                    className="hover:bg-violet-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-500">{f.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {toTitleCase(f.nombre_apellido || "")}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${
                          f.is_active
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}
                      >
                        {f.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {f.cedula || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {latest ? (
                        <div>
                          <div>{formatDate(latest.fecha_evaluacion)}</div>
                          <div className="text-xs text-gray-400">
                            {TIPO_LABELS[latest.tipo_evaluacion] || latest.tipo_evaluacion}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300">Sin eval.</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {condicion ? (
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${condicion.color}`}
                        >
                          {condicion.label}
                        </span>
                      ) : latest?.porcentaje_total != null ? (
                        <span className="text-sm text-gray-500">
                          {(latest.porcentaje_total * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {proximaEv ? formatDate(proximaEv.toISOString()) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="w-4 h-4 text-gray-400 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Facilitador picker for nueva evaluación */}
      {showPicker && (
        <FacilitadorPickerModal
          title="Nueva Evaluación"
          onClose={() => setShowPicker(false)}
          onSelect={(fac) => {
            setShowPicker(false);
            router.push(
              `/dashboard/capacitacion/evaluacion-facilitadores/${fac.id}/nueva`,
            );
          }}
        />
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
