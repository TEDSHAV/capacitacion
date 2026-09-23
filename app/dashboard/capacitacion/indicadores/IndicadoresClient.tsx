"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, Info, Settings, BarChart3, Clock } from "lucide-react";
import type {
  GestionMensualResponse,
  IndicadoresFilterOptions,
  IndicadoresResponse,
} from "@/types";
import { getIndicadoresCertificados72h } from "@/app/actions/indicadores-certificados";
import { getIndicadoresGestionMensual } from "@/app/actions/indicadores-gestion";
import { cachePortalData } from "@/lib/offline/portal-data-cache";
import { fetchWithOfflineFallback } from "@/lib/offline/use-offline-data";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import {
  INDICADORES_START_MES,
  INDICADORES_START_YEAR,
  INDICADORES_START_MONTH,
  isMesTracked,
} from "@/lib/indicadores-cutoff";
import { CachedDataBanner } from "@/components/CachedDataBanner";
import FilterBar, { type IndicadoresFilterState } from "./components/FilterBar";
import GestionMensualTable from "./components/GestionMensualTable";
import CarryPanel from "./components/CarryPanel";
import Certificados72hView from "./components/Certificados72hView";

interface Props {
  user: { id?: string } | null;
  filterOptions: IndicadoresFilterOptions;
  shellUrl: string;
}

type IndicadorTab = "gestion" | "72h";

const TAB_DEFS: {
  id: IndicadorTab;
  label: string;
  icon: typeof BarChart3;
  subtitle: string;
}[] = [
  {
    id: "gestion",
    label: "Gestión Mensual",
    icon: BarChart3,
    subtitle:
      "Flujo mensual de OSIs: programadas, ejecutadas, pendientes, participantes y emisión.",
  },
  {
    id: "72h",
    label: "Certificados 72h",
    icon: Clock,
    subtitle:
      "Control de emisión de certificados dentro de 3 días hábiles tras la última sesión.",
  },
];

const CURRENT_YEAR = new Date().getFullYear();

const DEFAULT_STATE: IndicadoresFilterState = {
  osiIds: [],
  year: CURRENT_YEAR,
  empresaId: "",
  facilitadorId: "",
  estadoId: "",
  soloIncumplimientos: false,
};

/** "YYYY-MM" of the month the cards should open on for a given year. */
function defaultMesForYear(year: number): string {
  if (year < INDICADORES_START_YEAR) return INDICADORES_START_MES;
  const month = year === CURRENT_YEAR ? new Date().getMonth() + 1 : 12;
  const clamped =
    year === INDICADORES_START_YEAR
      ? Math.max(month, INDICADORES_START_MONTH)
      : month;
  return `${year}-${String(clamped).padStart(2, "0")}`;
}

/**
 * The 72h section is scoped to the selected month (derived from `selectedMes`),
 * so the page has a single period control shared with the monthly matrix highlight.
 */
function build72hFilters(state: IndicadoresFilterState, selectedMes: string) {
  if (!/^\d{4}-\d{2}$/.test(selectedMes)) {
    return {
      osiIds: state.osiIds.length ? state.osiIds : undefined,
      fechaFrom: undefined,
      fechaTo: undefined,
      empresaId: state.empresaId || undefined,
      facilitadorId: state.facilitadorId || undefined,
      estadoId: state.estadoId || undefined,
      soloIncumplimientos: state.soloIncumplimientos || undefined,
    };
  }
  const [yStr, mStr] = selectedMes.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const lastDay = new Date(y, m, 0).getDate();
  const fechaFrom = `${selectedMes}-01`;
  const fechaTo = `${selectedMes}-${String(lastDay).padStart(2, "0")}`;
  return {
    osiIds: state.osiIds.length ? state.osiIds : undefined,
    fechaFrom,
    fechaTo,
    empresaId: state.empresaId || undefined,
    facilitadorId: state.facilitadorId || undefined,
    estadoId: state.estadoId || undefined,
    soloIncumplimientos: state.soloIncumplimientos || undefined,
  };
}

function buildGestionFilters(state: IndicadoresFilterState) {
  return {
    year: state.year,
    empresaId: state.empresaId || undefined,
    facilitadorId: state.facilitadorId || undefined,
    estadoId: state.estadoId || undefined,
  };
}

interface IndicadoresCachedSnapshot {
  gestion: GestionMensualResponse | null;
  res72h: IndicadoresResponse | null;
  error: string | null;
  timestamp: number;
}

// Module-level in-memory cache for instant navigation (0ms) across tabs and months
const indicadoresMemCache = new Map<string, IndicadoresCachedSnapshot>();

export default function IndicadoresClient({ user: _user, filterOptions, shellUrl }: Props) {
  void _user;
  const searchParams = useSearchParams();
  const isOnline = useOnlineStatus();
  const defaultMes = defaultMesForYear(CURRENT_YEAR);
  const initialMemKey = `${CURRENT_YEAR}_${defaultMes}_all_all_all_0`;
  const initialCache = indicadoresMemCache.get(initialMemKey);

  const [filterState, setFilterState] = useState<IndicadoresFilterState>(DEFAULT_STATE);
  const [selectedMes, setSelectedMes] = useState(defaultMes);
  const [activeTab, setActiveTab] = useState<IndicadorTab>("gestion");

  const [gestion, setGestion] = useState<GestionMensualResponse | null>(
    initialCache?.gestion ?? null
  );
  const [gestionFromCache, setGestionFromCache] = useState(false);
  const [gestionCachedAt, setGestionCachedAt] = useState<number | null>(null);

  const [data, setData] = useState<IndicadoresResponse | null>(
    initialCache?.res72h ?? null
  );
  const [loading, setLoading] = useState(!initialCache);
  const [error, setError] = useState<string | null>(initialCache?.error ?? null);

  const hasInitialized = useRef(false);

  // Cache filter options on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      cachePortalData(
        "dash_indicadores_filters",
        "dash_indicadores",
        filterOptions
      ).catch(() => {});
    }
  }, [filterOptions]);

  // Initialize from URL params
  useEffect(() => {
    const osiIdsParam = searchParams.get("osis");
    const year = searchParams.get("year");
    const mes = searchParams.get("mes");
    const empresa = searchParams.get("empresa");
    const facilitador = searchParams.get("facilitador");
    const estado = searchParams.get("estado");
    const breach = searchParams.get("breach");
    const tab = searchParams.get("tab");

    const next: IndicadoresFilterState = { ...DEFAULT_STATE };
    if (osiIdsParam) {
      next.osiIds = osiIdsParam
        .split(",")
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isFinite(n));
    }
    const parsedYear = year ? parseInt(year, 10) : NaN;
    if (Number.isFinite(parsedYear)) next.year = parsedYear;
    if (empresa) next.empresaId = empresa;
    if (facilitador) next.facilitadorId = facilitador;
    if (estado) next.estadoId = estado;
    if (breach === "1") next.soloIncumplimientos = true;
    setFilterState(next);

    let initMes: string;
    if (mes && /^\d{4}-\d{2}$/.test(mes)) {
      initMes = isMesTracked(mes) ? mes : defaultMesForYear(next.year);
    } else {
      initMes = defaultMesForYear(next.year);
    }
    setSelectedMes(initMes);

    if (tab === "72h" || tab === "gestion") {
      setActiveTab(tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (filterState.osiIds.length)
      params.set("osis", filterState.osiIds.join(","));
    params.set("year", String(filterState.year));
    params.set("mes", selectedMes);
    if (filterState.empresaId) params.set("empresa", filterState.empresaId);
    if (filterState.facilitadorId)
      params.set("facilitador", filterState.facilitadorId);
    if (filterState.estadoId) params.set("estado", filterState.estadoId);
    if (filterState.soloIncumplimientos) params.set("breach", "1");
    if (activeTab !== "gestion") params.set("tab", activeTab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }, [filterState, selectedMes, activeTab]);

  const fetchData = useCallback(async () => {
    const gestionFilters = buildGestionFilters(filterState);
    const filters72h = build72hFilters(filterState, selectedMes);
    const filterKey = JSON.stringify({
      empresaId: gestionFilters.empresaId,
      facilitadorId: gestionFilters.facilitadorId,
      estadoId: gestionFilters.estadoId,
    });

    const memCacheKey = `${filterState.year}_${selectedMes}_${filterState.empresaId || "all"}_${filterState.facilitadorId || "all"}_${filterState.estadoId || "all"}_${filters72h.soloIncumplimientos ? "1" : "0"}`;
    const cached = indicadoresMemCache.get(memCacheKey);

    if (cached) {
      setGestion(cached.gestion);
      setData(cached.res72h);
      setError(cached.error);
      setLoading(false);
    } else {
      setLoading(true);
      setError(null);
    }

    // Parallel fetch: Gestión Mensual + Certificados 72h
    const [gestionRes, res72h] = await Promise.all([
      fetchWithOfflineFallback(
        `dash_indicadores_gestion_${filterState.year}_${filterKey}`,
        "dash_indicadores",
        () => getIndicadoresGestionMensual(gestionFilters)
      ).catch((err) => {
        console.error("Error loading gestion mensual:", err);
        return null;
      }),
      fetchWithOfflineFallback(
        `dash_indicadores_72h_${selectedMes}_${JSON.stringify({
          osiIds: filters72h.osiIds,
          empresaId: filters72h.empresaId,
          facilitadorId: filters72h.facilitadorId,
          estadoId: filters72h.estadoId,
          soloIncumplimientos: filters72h.soloIncumplimientos,
        })}`,
        "dash_indicadores",
        () => getIndicadoresCertificados72h(filters72h)
      ).catch((err) => {
        console.error("Error loading indicadores 72h:", err);
        return null;
      }),
    ]);

    const newGestion = gestionRes?.data.data ?? null;
    const newRes72h = res72h?.data.data ?? null;
    const err = gestionRes?.data.error ?? res72h?.data.error ?? null;

    if (newGestion) {
      setGestion(newGestion);
      setGestionFromCache(gestionRes?.fromCache ?? false);
      setGestionCachedAt(gestionRes?.cachedAt ?? null);
    } else if (!cached) {
      setGestion(null);
    }

    if (newRes72h) {
      setData(newRes72h);
    } else if (!cached) {
      setData(null);
    }

    if (!cached || err) {
      setError(err);
    }

    // Save snapshot in memory cache
    indicadoresMemCache.set(memCacheKey, {
      gestion: newGestion || (cached?.gestion ?? null),
      res72h: newRes72h || (cached?.res72h ?? null),
      error: err,
      timestamp: Date.now(),
    });

    setLoading(false);
  }, [filterState, selectedMes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const aggregates = data?.aggregates;

  const years = useMemo(() => {
    const set = new Set<number>();
    if (CURRENT_YEAR >= INDICADORES_START_YEAR) set.add(CURRENT_YEAR);
    if (filterState.year >= INDICADORES_START_YEAR) set.add(filterState.year);
    for (const y of gestion?.yearsDisponibles ?? []) set.add(y);
    return Array.from(set).sort((a, b) => b - a);
  }, [gestion?.yearsDisponibles, filterState.year]);

  const mesActual = useMemo(() => {
    if (!gestion) return null;
    return (
      gestion.meses.find((m) => m.mes === selectedMes) ??
      gestion.meses[gestion.meses.length - 1]
    );
  }, [gestion, selectedMes]);

  const handleFilterChange = useCallback((next: IndicadoresFilterState) => {
    setFilterState((cur) => {
      if (next.year !== cur.year) setSelectedMes(defaultMesForYear(next.year));
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <FilterBar
        options={filterOptions}
        state={filterState}
        onChange={handleFilterChange}
        years={years}
        selectedMes={selectedMes}
        onSelectMes={setSelectedMes}
        activeTab={activeTab}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TAB_DEFS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap bg-transparent ${
                  active
                    ? "border-sky-600 text-sky-700 font-semibold"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                Error al cargar los indicadores
              </p>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-sky-600 animate-spin" />
            <span className="ml-3 text-sm text-gray-500">
              Calculando indicadores…
            </span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Vista 1: Gestión Mensual ───────────────────────────── */}
            {activeTab === "gestion" && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Gestión mensual de OSIs
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Recibidas por fecha de emisión de la OSI · programadas y
                    ejecutadas por fecha de sesión · emisión por fecha de registro.
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Los datos confiables comienzan en Ago {INDICADORES_START_YEAR};
                    los meses anteriores no se muestran porque el sistema de
                    seguimiento aún no estaba en uso.
                  </p>
                </div>
                {gestionFromCache && (
                  <CachedDataBanner
                    cachedAt={gestionCachedAt}
                    isOnline={isOnline}
                  />
                )}
                {!gestion || !mesActual ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
                    <Info className="w-8 h-8 mb-2" />
                    <p className="text-sm">
                      No hay datos de gestión para {filterState.year} con estos filtros.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">
                        Mes seleccionado:
                      </span>
                      <span className="bg-sky-50 text-sky-700 rounded-full px-3 py-1 text-xs font-semibold">
                        {mesActual.label}
                      </span>
                    </div>
                    <GestionMensualTable
                      data={gestion}
                      selectedMes={mesActual.mes}
                      onSelectMes={setSelectedMes}
                    />
                    <CarryPanel
                      osisList={gestion.osisList}
                      selectedMes={mesActual.mes}
                      selectedMesLabel={mesActual.label}
                      shellUrl={shellUrl}
                    />
                  </>
                )}
              </section>
            )}

            {/* ── Vista 2: Certificados en 72 Horas ───────────────────── */}
            {activeTab === "72h" && (
              <section className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      Certificados emitidos en 72 horas {mesActual ? `· ${mesActual.label}` : ""}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Mide si la emisión del certificado ocurre dentro de 3 días
                      hábiles (72 horas laborables, excluyendo fines de semana y
                      feriados venezolanos) tras la última fecha de ejecución.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/capacitacion/configuracion/feriados"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Configurar feriados
                  </Link>
                </div>

                {!aggregates || aggregates.totalOsis === 0 || !data ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
                    <Info className="w-8 h-8 mb-2" />
                    <p className="text-sm">
                      No hay OSIs de capacitación que coincidan con los filtros en este período.
                    </p>
                  </div>
                ) : (
                  <Certificados72hView
                    aggregates={aggregates}
                    rows={data.rows}
                    mesLabel={mesActual?.label}
                  />
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
