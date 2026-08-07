"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search,
  Loader2,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Calendar,
  Building2,
  Layers,
  Filter,
  X,
  User,
  Clock,
} from "lucide-react";
import type { OSIManagement, OSISesion, OSIFilters, OSIStatus } from "@/types";
import { getOSIsForManagement } from "@/app/actions/osi";
import {
  getAllProcesoStepsBatch,
  toggleUnifiedStep,
  ensureAllProcesoStepsExist,
  autoAdvanceEjecucionSteps,
  getOSISessions,
  toggleAttachmentReceived,
  type ProcesoStepRecord,
} from "@/app/actions/capacitacion-proceso-steps";
import { ALL_STEPS, PLANIFICACION_STEPS, EJECUCION_STEPS } from "@/lib/proceso-steps";
import ProcesoStepsTimeline from "../components/proceso-steps-timeline";
import ListaAsistenciaPreview from "./components/lista-asistencia-preview";

interface FilterOptions {
  companies: { id_empresa: number; nombre_empresa: string }[];
  ejecutivos: string[];
  statuses: OSIStatus[];
}

interface SeguimientoServiciosClientProps {
  initialOsis: OSIManagement[];
  initialTotalCount: number;
  initialStepsByOsi?: Record<string, Record<string, Record<string, ProcesoStepRecord>>>;
  initialSessionsByOsi?: Record<string, OSISesion[]>;
  filterOptions?: FilterOptions;
  statuses?: OSIStatus[];
}

function plainToStepsMap(
  plain?: Record<string, Record<string, Record<string, ProcesoStepRecord>>>,
): Map<number, Map<number, Record<string, ProcesoStepRecord>>> {
  const map = new Map<number, Map<number, Record<string, ProcesoStepRecord>>>();
  if (!plain) return map;
  for (const [osiIdStr, sessionObj] of Object.entries(plain)) {
    const osiId = Number(osiIdStr);
    const sessionMap = new Map<number, Record<string, ProcesoStepRecord>>();
    for (const [nroSesionStr, steps] of Object.entries(sessionObj)) {
      sessionMap.set(Number(nroSesionStr), steps);
    }
    map.set(osiId, sessionMap);
  }
  return map;
}

function plainToSessionsMap(
  plain?: Record<string, OSISesion[]>,
): Map<number, OSISesion[]> {
  const map = new Map<number, OSISesion[]>();
  if (!plain) return map;
  for (const [osiIdStr, sessions] of Object.entries(plain)) {
    map.set(Number(osiIdStr), sessions);
  }
  return map;
}

function getNextSessionDate(sessions: OSISesion[]): string | null {
  if (!sessions.length) return null;
  const now = new Date();
  const upcoming = sessions
    .filter((s) => s.fecha)
    .sort((a, b) => new Date(a.fecha!).getTime() - new Date(b.fecha!).getTime());
  const next = upcoming.find((s) => new Date(s.fecha!).getTime() >= now.getTime());
  return (next || upcoming[upcoming.length - 1])?.fecha ?? null;
}

export default function SeguimientoServiciosClient({
  initialOsis,
  initialTotalCount,
  initialStepsByOsi,
  initialSessionsByOsi,
  filterOptions,
  statuses = [],
}: SeguimientoServiciosClientProps) {
  const [loading, setLoading] = useState(false);
  const [osis, setOsis] = useState<OSIManagement[]>(initialOsis);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<OSIFilters>({});
  const [stepFilter, setStepFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  // osiId → nroSesion → stepKey → record
  const [stepsByOsi, setStepsByOsi] = useState<
    Map<number, Map<number, Record<string, ProcesoStepRecord>>>
  >(() => plainToStepsMap(initialStepsByOsi));
  // osiId → sessions[]
  const [sessionsByOsi, setSessionsByOsi] = useState<Map<number, OSISesion[]>>(() =>
    plainToSessionsMap(initialSessionsByOsi),
  );
  const [expandedOsi, setExpandedOsi] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<Map<number, number>>(new Map());
  const [seeding, setSeeding] = useState<number | null>(null);
  const [previewOsi, setPreviewOsi] = useState<{ osiId: number; nroOsi: string; nroSesion: number; category?: string; title?: string; showReceivedToggle?: boolean } | null>(null);
  const isFirstRender = useRef(true);

  // Cache of all fetched OSIs for instant client-side search
  const cachedOsisRef = useRef<OSIManagement[]>(initialOsis);

  // Client-side filtered OSIs from cache (instant search + step filter)
  // When no search/step filter, show the server-returned page. When searching, filter the full cache.
  const filteredOsis = useMemo(() => {
    let result = !searchInput.trim() ? osis : (() => {
      const q = searchInput.toLowerCase();
      return cachedOsisRef.current.filter(
        (o) =>
          o.nro_osi?.toLowerCase().includes(q) ||
          o.nombre_empresa?.toLowerCase().includes(q),
      );
    })();

    // Client-side step filter: show OSIs where the selected step is completed (in any session)
    if (stepFilter) {
      result = result.filter((o) => {
        const osiMap = stepsByOsi.get(o.id_osi);
        if (!osiMap) return false;
        for (const sessionSteps of osiMap.values()) {
          if (sessionSteps[stepFilter]?.completed) return true;
        }
        return false;
      });
    }

    return result;
  }, [searchInput, osis, stepFilter, stepsByOsi]);

  // Derive unique course/servicio options from cached OSIs
  const courseOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of cachedOsisRef.current) {
      if (o.servicio) set.add(o.servicio);
    }
    return Array.from(set).sort();
  }, [osis]);

  const fetchOSIs = useCallback(async () => {
    setLoading(true);
    try {
      // Search is handled client-side; only send filters to server
      const result = await getOSIsForManagement(
        filters,
        currentPage,
        itemsPerPage,
      );
      setOsis(result.osis);
      setTotalCount(result.totalCount);

      // Accumulate fetched OSIs into cache (dedup by id_osi)
      const existingIds = new Set(cachedOsisRef.current.map((o) => o.id_osi));
      const newOnes = result.osis.filter((o) => !existingIds.has(o.id_osi));
      if (newOnes.length > 0) {
        cachedOsisRef.current = [...cachedOsisRef.current, ...newOnes];
      }

      if (result.osis.length > 0) {
        const osiIds = result.osis.map((o) => o.id_osi);

        // Run auto-advance, steps fetch, and sessions fetch all in parallel
        const [, stepsMap, sessionsResult] = await Promise.all([
          autoAdvanceEjecucionSteps(
            result.osis.map((o) => ({
              id_osi: o.id_osi,
              fecha_inicio_real: o.fecha_inicio_real ?? null,
              desglose_recursos_sesiones: o.desglose_recursos_sesiones ?? null,
              sesiones_programadas: o.sesiones_programadas ?? null,
            })),
          ),
          getAllProcesoStepsBatch(osiIds),
          Promise.all(
            result.osis.map(async (osi) => {
              const sessions = await getOSISessions(osi.id_osi, {
                desglose_recursos_sesiones: osi.desglose_recursos_sesiones,
                sesiones_programadas: osi.sesiones_programadas,
              });
              return { osiId: osi.id_osi, sessions } as const;
            }),
          ),
        ]);

        setStepsByOsi(stepsMap);

        const newSessionsMap = new Map<number, OSISesion[]>();
        for (const { osiId, sessions } of sessionsResult) {
          newSessionsMap.set(osiId, sessions);
        }
        setSessionsByOsi(newSessionsMap);
      }
    } catch (err) {
      console.error("Error fetching OSIs for seguimiento:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, itemsPerPage]);

  // Re-fetch when filters or page changes (skip first render — server already loaded)
  // Search is NOT in deps — it's handled client-side via filteredOsis
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchOSIs();
  }, [fetchOSIs, filters, currentPage]);

  const handleToggleStep = useCallback(
    async (osiId: number, nroSesion: number, stepKey: string, notes?: string) => {
      const result = await toggleUnifiedStep(osiId, stepKey, nroSesion, notes);
      if (result.success) {
        setStepsByOsi((prev) => {
          const newMap = new Map(prev);
          const osiMap = newMap.get(osiId) || new Map();
          const sessionMap = osiMap.get(nroSesion) || {};
          const existing = sessionMap[stepKey];
          osiMap.set(nroSesion, {
            ...sessionMap,
            [stepKey]: {
              ...existing,
              osi_id: osiId,
              nro_sesion: nroSesion,
              phase: existing?.phase ?? "ejecucion",
              step_key: stepKey,
              id: existing?.id ?? 0,
              completed: result.completed!,
              completed_at: result.completed ? new Date().toISOString() : null,
              completed_by: existing?.completed_by ?? null,
              notes: result.completed ? (notes ?? existing?.notes ?? null) : null,
            },
          });
          newMap.set(osiId, osiMap);
          return newMap;
        });

        // If toggling lista_asistencia, also toggle the per-OSI attachment_received flag
        if (stepKey === "lista_asistencia" && result.completed) {
          await toggleAttachmentReceived(osiId);
        }
      }
    },
    [],
  );

  const handleBulkToggle = useCallback(
    async (osiId: number, nroSesion: number, stepKeys: string[]) => {
      for (const key of stepKeys) {
        await handleToggleStep(osiId, nroSesion, key);
      }
    },
    [handleToggleStep],
  );

  const handleExpand = useCallback(
    async (osiId: number) => {
      if (expandedOsi === osiId) {
        setExpandedOsi(null);
        return;
      }
      setExpandedOsi(osiId);

      const sessions = sessionsByOsi.get(osiId) || [];
      const nroSesion = selectedSession.get(osiId) ?? sessions[0]?.nro_sesion ?? 1;

      // Seed steps for the selected session if not present
      const osiMap = stepsByOsi.get(osiId);
      const sessionMap = osiMap?.get(nroSesion);
      if (!sessionMap || Object.keys(sessionMap).length === 0) {
        setSeeding(osiId);
        await ensureAllProcesoStepsExist(osiId, nroSesion);
        const freshMap = await getAllProcesoStepsBatch([osiId]);
        setStepsByOsi((prev) => {
          const newMap = new Map(prev);
          const fresh = freshMap.get(osiId);
          if (fresh) newMap.set(osiId, fresh);
          return newMap;
        });
        setSeeding(null);
      }
    },
    [expandedOsi, sessionsByOsi, selectedSession, stepsByOsi],
  );

  const handleSessionSelect = useCallback(
    async (osiId: number, nroSesion: number) => {
      setSelectedSession((prev) => {
        const newMap = new Map(prev);
        newMap.set(osiId, nroSesion);
        return newMap;
      });

      // Seed steps for this session if not present
      const osiMap = stepsByOsi.get(osiId);
      const sessionMap = osiMap?.get(nroSesion);
      if (!sessionMap || Object.keys(sessionMap).length === 0) {
        setSeeding(osiId);
        await ensureAllProcesoStepsExist(osiId, nroSesion);
        const freshMap = await getAllProcesoStepsBatch([osiId]);
        setStepsByOsi((prev) => {
          const newMap = new Map(prev);
          const fresh = freshMap.get(osiId);
          if (fresh) newMap.set(osiId, fresh);
          return newMap;
        });
        setSeeding(null);
      }
    },
    [stepsByOsi],
  );

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-4">
      {/* OSI List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-sm text-gray-900">
                Seguimiento de OSIs
              </h3>
              <span className="text-xs text-gray-500">
                {searchInput.trim()
                  ? `(${filteredOsis.length} de ${cachedOsisRef.current.length} cargados)`
                  : `(${totalCount} OSIs)`}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por OSI o empresa..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
              />
            </div>
          </div>
        </div>

        {/* Filter Bar — always visible */}
        {filterOptions && (
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                Filtros
                {(Object.values(filters).some((v) => v !== undefined && v !== "") || !!stepFilter) && (
                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                    Activos
                  </span>
                )}
              </span>
              {(Object.values(filters).some((v) => v !== undefined && v !== "") || !!stepFilter) ? (
                <button
                  onClick={() => {
                    setFilters({});
                    setStepFilter("");
                    setCurrentPage(1);
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md hover:bg-red-100 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Limpiar
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* Empresa */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">
                    Empresa
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <select
                      value={filters.companyName || ""}
                      onChange={(e) => {
                        setFilters((prev) => ({ ...prev, companyName: e.target.value || undefined }));
                        setCurrentPage(1);
                      }}
                      className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="">Todas</option>
                      {filterOptions.companies.map((company) => (
                        <option key={company.id_empresa} value={company.nombre_empresa}>
                          {company.nombre_empresa}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Curso / Servicio */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">
                    Curso
                  </label>
                  <select
                    value={filters.servicio || ""}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, servicio: e.target.value || undefined }));
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Todos</option>
                    {courseOptions.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fase del proceso */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">
                    Fase del proceso
                  </label>
                  <select
                    value={stepFilter}
                    onChange={(e) => setStepFilter(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Todas</option>
                    <optgroup label="Planificación">
                      {PLANIFICACION_STEPS.map((step) => (
                        <option key={step.key} value={step.key}>
                          {step.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Ejecución">
                      {EJECUCION_STEPS.map((step) => (
                        <option key={step.key} value={step.key}>
                          {step.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Ejecutivo */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">
                    Ejecutivo
                  </label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <select
                      value={filters.ejecutivo || ""}
                      onChange={(e) => {
                        setFilters((prev) => ({ ...prev, ejecutivo: e.target.value || undefined }));
                        setCurrentPage(1);
                      }}
                      className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="">Todos</option>
                      {filterOptions.ejecutivos.map((ejecutivo) => (
                        <option key={ejecutivo} value={ejecutivo}>
                          {ejecutivo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fecha Servicio Desde */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">
                    Fecha Desde
                  </label>
                  <input
                    type="date"
                    value={filters.dateServiceFrom || ""}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, dateServiceFrom: e.target.value || undefined }));
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Fecha Servicio Hasta */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">
                    Fecha Hasta
                  </label>
                  <input
                    type="date"
                    value={filters.dateServiceTo || ""}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, dateServiceTo: e.target.value || undefined }));
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : osis.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">No se encontraron OSIs</p>
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-gray-50/50">
              <div className="w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-[2fr_2fr_1fr_1fr_0.7fr_0.6fr] gap-2 items-center">
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Empresa / OSI</span>
                <span className="hidden md:block text-[10px] font-bold uppercase tracking-wide text-gray-500">Servicio</span>
                <span className="hidden md:block text-[10px] font-bold uppercase tracking-wide text-gray-500">Emisión</span>
                <span className="hidden md:block text-[10px] font-bold uppercase tracking-wide text-gray-500">Ejecución</span>
                <span className="hidden md:block text-[10px] font-bold uppercase tracking-wide text-gray-500">Sesiones</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 text-right">Progreso</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
            {filteredOsis.map((osi) => {
              const sessions = sessionsByOsi.get(osi.id_osi) || [];
              const hasMultipleSessions = sessions.length > 1;
              const isExpanded = expandedOsi === osi.id_osi;
              const osiStepsMap = stepsByOsi.get(osi.id_osi) || new Map();
              const currentNroSesion = selectedSession.get(osi.id_osi) ?? sessions[0]?.nro_sesion ?? 1;
              const sessionSteps: Record<string, ProcesoStepRecord> = osiStepsMap.get(currentNroSesion) || {};
              const completedCount = Object.values(sessionSteps).filter((s) => s.completed).length;

              return (
                <div key={osi.id_osi}>
                  {/* Row header — always expandable */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleExpand(osi.id_osi)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-[2fr_2fr_1fr_1fr_0.7fr_0.6fr] gap-2 items-center">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                          <Building2 className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{osi.nombre_empresa}</span>
                        </p>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {osi.nro_osi}
                        </p>
                      </div>
                      <div className="hidden md:block min-w-0">
                        <p className="text-xs text-gray-500 truncate">{osi.servicio}</p>
                      </div>
                      <div className="hidden md:block min-w-0">
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{formatDate(osi.fecha_emision)}</span>
                        </p>
                      </div>
                      <div className="hidden md:block min-w-0">
                        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{formatDate(getNextSessionDate(sessions))}</span>
                        </p>
                      </div>
                      <div className="hidden md:flex items-center gap-1 text-xs text-gray-500 min-w-0">
                        {sessions.length > 0 ? (
                          <>
                            <Layers className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{sessions.length} {sessions.length === 1 ? "sesión" : "sesiones"}</span>
                          </>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-medium text-gray-500">
                          {completedCount}/{ALL_STEPS.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded view */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 bg-gray-50/30 border-t border-gray-100">
                      {/* Session tabs (only for multi-session) */}
                      {hasMultipleSessions && (
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                          {sessions.map((s) => (
                            <button
                              key={s.nro_sesion}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSessionSelect(osi.id_osi, s.nro_sesion ?? 1);
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                currentNroSesion === s.nro_sesion
                                  ? "bg-blue-600 text-white"
                                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              <Layers className="w-3 h-3" />
                              Sesión {s.nro_sesion}
                              {s.fecha && (
                                <span className="opacity-75 flex items-center gap-0.5">
                                  <Calendar className="w-2.5 h-2.5" />
                                  {formatDate(s.fecha)}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {seeding === osi.id_osi ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <ProcesoStepsTimeline
                          osiId={osi.id_osi}
                          steps={ALL_STEPS}
                          completedSteps={sessionSteps}
                          canEdit={true}
                          onToggle={(stepKey, notes) =>
                            handleToggleStep(osi.id_osi, currentNroSesion, stepKey, notes)
                          }
                          onBulkToggle={(stepKeys) =>
                            handleBulkToggle(osi.id_osi, currentNroSesion, stepKeys)
                          }
                          onPreviewListaAsistencia={(id) =>
                            setPreviewOsi({ osiId: id, nroOsi: osi.nro_osi || "", nroSesion: currentNroSesion })
                          }
                          onPreviewCalificacion={(id) =>
                            setPreviewOsi({ osiId: id, nroOsi: osi.nro_osi || "", nroSesion: currentNroSesion, category: "hoja_calificacion", title: "Hoja de Calificación", showReceivedToggle: false })
                          }
                          onPreviewMaterialFotografico={(id) =>
                            setPreviewOsi({ osiId: id, nroOsi: osi.nro_osi || "", nroSesion: currentNroSesion, category: "material_fotografico", title: "Registro Fotográfico", showReceivedToggle: false })
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* Pagination — hidden when searching or step-filtering (uses client-side cache) */}
        {!searchInput.trim() && !stepFilter && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
            <span className="text-xs text-gray-500">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-xs border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-100 transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-xs border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-100 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attachment Preview Modal */}
      {previewOsi && (
        <ListaAsistenciaPreview
          osiId={previewOsi.osiId}
          nroOsi={previewOsi.nroOsi}
          isOpen={!!previewOsi}
          onClose={() => setPreviewOsi(null)}
          category={previewOsi.category}
          title={previewOsi.title}
          showReceivedToggle={previewOsi.showReceivedToggle !== false}
          onAttachmentToggled={(received) => {
            if (received) {
              handleToggleStep(previewOsi.osiId, previewOsi.nroSesion, "lista_asistencia");
            }
          }}
        />
      )}
    </div>
  );
}
