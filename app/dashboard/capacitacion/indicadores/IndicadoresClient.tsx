"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, Info, Settings, X } from "lucide-react";
import type {
  GestionMensualResponse,
  IndicadorEstado,
  IndicadoresFilterOptions,
  IndicadoresResponse,
  IndicadorOsiRow,
} from "@/types";
import { getIndicadoresCertificados72h } from "@/app/actions/indicadores-certificados";
import { getIndicadoresGestionMensual } from "@/app/actions/indicadores-gestion";
import { cachePortalData } from "@/lib/offline/portal-data-cache";
import { fetchWithOfflineFallback } from "@/lib/offline/use-offline-data";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { CachedDataBanner } from "@/components/CachedDataBanner";
import FilterBar, { type IndicadoresFilterState } from "./components/FilterBar";
import GestionKpiCards from "./components/GestionKpiCards";
import GestionMensualTable from "./components/GestionMensualTable";
import CarryPanel from "./components/CarryPanel";
import ComplianceGauge from "./components/ComplianceGauge";
import IndicadoresTable from "./components/IndicadoresTable";

interface Props {
  user: { id?: string } | null;
  filterOptions: IndicadoresFilterOptions;
}

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
  const month = year === CURRENT_YEAR ? new Date().getMonth() + 1 : 12;
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * The 72h section is scoped to the selected month (derived from
 * `selectedMes`), so the page has a single period control shared with the
 * monthly matrix highlight.
 */
function build72hFilters(
  state: IndicadoresFilterState,
  selectedMes: string,
) {
  const [yStr, mStr] = selectedMes.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  // Last day of the selected month (clamped for month length, including
  // leap-year February).
  const lastDay = new Date(y, m, 0).getDate();
  return {
    osiIds: state.osiIds.length ? state.osiIds : undefined,
    fechaFrom: `${y}-${String(m).padStart(2, "0")}-01`,
    fechaTo: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
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

function escapeCsv(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(lines: string[], filename: string) {
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Monthly matrix export: one row per indicator, one column per month. */
function exportGestionCsv(gestion: GestionMensualResponse) {
  const rows: { label: string; get: (m: (typeof gestion.meses)[number]) => number }[] = [
    { label: "OSIs recibidas", get: (m) => m.osisRecibidas },
    { label: "OSIs planificadas", get: (m) => m.osisPlanificadas },
    { label: "Ejecutadas en su mes", get: (m) => m.osisEjecutadasEnSuMes },
    { label: "Pendientes del mes", get: (m) => m.osisPendientes },
    { label: "Pendientes con fecha ya pasada", get: (m) => m.osisPendientesVencidas },
    { label: "Ejecutadas de meses anteriores", get: (m) => m.osisRezagadasEjecutadas },
    { label: "Participantes planificados", get: (m) => m.participantesPlanificados },
    { label: "Participantes en lista", get: (m) => m.participantesLista },
    { label: "Certificados emitidos", get: (m) => m.certificados },
    { label: "Participantes con certificado", get: (m) => m.participantesCertificados },
    { label: "PVC (carnets) emitidos", get: (m) => m.pvc },
  ];
  const lines = [
    ["Indicador", ...gestion.meses.map((m) => m.label), "Total"]
      .map(escapeCsv)
      .join(","),
  ];
  for (const r of rows) {
    lines.push(
      [r.label, ...gestion.meses.map((m) => r.get(m)), r.get(gestion.total)]
        .map(escapeCsv)
        .join(","),
    );
  }
  downloadCsv(lines, `indicadores-gestion-mensual-${gestion.year}.csv`);
}

/** 72h detail export: one row per OSI. */
function exportDetalleCsv(rows: IndicadorOsiRow[], periodLabel: string) {
  const headers = [
    "OSI",
    "Empresa",
    "Sede",
    "Servicio",
    "Fecha ejecucion",
    "Fuente ejecucion",
    "Fecha emision",
    "Fuente emision",
    "Dias habiles (max. 3)",
    "Brecha (dias)",
    "Facilitador emisor",
    "Facilitador sesion",
    "Estado",
    "Sospechoso",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.nroOsi,
        r.empresa,
        r.sede,
        r.servicio,
        r.fechaEjecucion,
        r.fuenteEjecucion,
        r.fechaEmision,
        r.fuenteEmision,
        r.diasHabiles,
        r.brechaDias,
        r.facilitadorNombre,
        r.facilitadorSesionNombre,
        r.estado,
        r.sospechoso ? "SI" : "No",
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  downloadCsv(lines, `indicadores-72-horas-${periodLabel}.csv`);
}

// Drill-down: clicking a gauge slice filters the detail table to just that
// estado, without triggering a new server fetch. Label map used for the
// "showing X" banner above the table.
const DRILLDOWN_LABELS: Record<IndicadorEstado, string> = {
  dentro: "Dentro de 72h",
  fuera: "Fuera de 72h",
  pendiente: "Pendientes",
  programada: "Programadas",
  no_aplica: "No aplica",
};

export default function IndicadoresClient({ user: _user, filterOptions }: Props) {
  void _user;
  const searchParams = useSearchParams();
  const isOnline = useOnlineStatus();
  const [filterState, setFilterState] = useState<IndicadoresFilterState>(DEFAULT_STATE);
  const [selectedMes, setSelectedMes] = useState(defaultMesForYear(CURRENT_YEAR));

  const [gestion, setGestion] = useState<GestionMensualResponse | null>(null);
  const [gestionFromCache, setGestionFromCache] = useState(false);
  const [gestionCachedAt, setGestionCachedAt] = useState<number | null>(null);

  const [data, setData] = useState<IndicadoresResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Drill-down applied to the detail table only (estado bucket, or a
  // specific OSI number). null = show all.
  const [drilldown, setDrilldown] = useState<
    { type: "estado"; value: IndicadorEstado } | { type: "osi"; value: string } | null
  >(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Cache filter options on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      cachePortalData("dash_indicadores_filters", "dash_indicadores", filterOptions).catch(() => {});
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
    const vista = searchParams.get("vista");

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
    setSelectedMes(
      mes && /^\d{4}-\d{2}$/.test(mes) ? mes : defaultMesForYear(next.year),
    );
    if (vista?.startsWith("osi:")) {
      setDrilldown({ type: "osi", value: vista.slice(4) });
    } else if (vista && vista in DRILLDOWN_LABELS) {
      setDrilldown({ type: "estado", value: vista as IndicadorEstado });
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
    if (drilldown?.type === "estado") params.set("vista", drilldown.value);
    else if (drilldown?.type === "osi") params.set("vista", `osi:${drilldown.value}`);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }, [filterState, selectedMes, drilldown]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const gestionFilters = buildGestionFilters(filterState);
    const filters72h = build72hFilters(filterState, selectedMes);
    const filterKey = JSON.stringify({
      empresaId: gestionFilters.empresaId,
      facilitadorId: gestionFilters.facilitadorId,
      estadoId: gestionFilters.estadoId,
    });

    const [gestionRes, res72h] = await Promise.all([
      fetchWithOfflineFallback(
        `dash_indicadores_gestion_${filterState.year}_${filterKey}`,
        "dash_indicadores",
        () => getIndicadoresGestionMensual(gestionFilters),
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
        () => getIndicadoresCertificados72h(filters72h),
      ).catch((err) => {
        console.error("Error loading indicadores 72h:", err);
        return null;
      }),
    ]);

    if (gestionRes?.data.data) {
      setGestion(gestionRes.data.data);
      setGestionFromCache(gestionRes.fromCache);
      setGestionCachedAt(gestionRes.cachedAt);
    } else {
      setGestion(null);
    }

    const err = gestionRes?.data.error ?? res72h?.data.error ?? null;
    if (res72h?.data.data) setData(res72h.data.data);
    else setData(null);
    setError(err);
    setLoading(false);
  }, [filterState, selectedMes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const aggregates = data?.aggregates;
  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);

  // Years offered by the selector: whatever the server found, always
  // including the current year and the one currently selected (so the
  // control never renders an empty/invalid value).
  const years = useMemo(() => {
    const set = new Set<number>([CURRENT_YEAR, filterState.year]);
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

  // Drill-down only filters the detail table below — the CSV export keeps
  // reflecting the full toolbar-filtered dataset.
  const tableRows = useMemo(() => {
    if (!drilldown) return rows;
    if (drilldown.type === "estado") {
      return rows.filter((r) => r.estado === drilldown.value);
    }
    return rows.filter((r) => r.nroOsi === drilldown.value);
  }, [rows, drilldown]);

  const scrollToTable = useCallback(() => {
    // Defer to the next tick so layout has settled (e.g. after a click that
    // also changes visible content above the table).
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, []);

  const handleSelectEstado = useCallback(
    (estado: IndicadorEstado | null) => {
      setDrilldown((cur) => {
        if (estado == null) return null;
        if (cur?.type === "estado" && cur.value === estado) return null; // toggle off
        return { type: "estado", value: estado };
      });
      if (estado != null) scrollToTable();
    },
    [scrollToTable],
  );

  // Changing the year moves the card selection to a month that exists in it.
  const handleFilterChange = useCallback(
    (next: IndicadoresFilterState) => {
      setFilterState((cur) => {
        if (next.year !== cur.year) setSelectedMes(defaultMesForYear(next.year));
        return next;
      });
    },
    [],
  );

  const drilldownLabel =
    drilldown?.type === "estado"
      ? DRILLDOWN_LABELS[drilldown.value]
      : drilldown?.type === "osi"
        ? `OSI ${drilldown.value}`
        : null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <FilterBar
        options={filterOptions}
        state={filterState}
        onChange={handleFilterChange}
        years={years}
        selectedMes={selectedMes}
        onSelectMes={setSelectedMes}
        onExportGestionCsv={() => gestion && exportGestionCsv(gestion)}
        onExportDetalleCsv={() => exportDetalleCsv(rows, selectedMes)}
      />

      <main className="flex-1 p-6 overflow-auto">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900">
            Indicadores de Gestión · Capacitación {filterState.year}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Flujo mensual de OSIs (recibidas, ejecutadas, pendientes),
            participantes y emisión de certificados y carnets.
          </p>
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

        {gestionFromCache && (
          <div className="mb-5">
            <CachedDataBanner cachedAt={gestionCachedAt} isOnline={isOnline} />
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
          <div className="space-y-8">
            {/* ── Gestión mensual ─────────────────────────────────────── */}
            <section className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Gestión mensual de OSIs
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Recibidas por fecha de emisión de la OSI · planificadas y
                  ejecutadas por fecha de sesión · certificados y carnets por su
                  propia fecha de emisión.
                </p>
              </div>
              {!gestion || !mesActual ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
                  <Info className="w-8 h-8 mb-2" />
                  <p className="text-sm">
                    No hay datos de gestión para {filterState.year} con estos
                    filtros.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-gray-500">
                      Mes seleccionado:
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {mesActual.label}
                    </span>
                  </div>
                  <GestionKpiCards mes={mesActual} />
                  <CarryPanel
                    osisList={gestion.osisList}
                    selectedMes={mesActual.mes}
                    selectedMesLabel={mesActual.label}
                  />
                  <GestionMensualTable
                    data={gestion}
                    selectedMes={mesActual.mes}
                    onSelectMes={setSelectedMes}
                  />
                </>
              )}
            </section>

            {/* ── Certificados en 72 horas ────────────────────────────── */}
            <section className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Certificados emitidos en 72 horas · {mesActual?.label}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Mide si la emisión del certificado ocurre dentro de 3 días
                    hábiles (72 horas laborables, excluyendo fines de semana y
                    feriados venezolanos) tras la última fecha de ejecución. El
                    día de ejecución cuenta como día 1. Alcance: certificados
                    emitidos en {mesActual?.label}.
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

              {!aggregates || aggregates.totalOsis === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
                  <Info className="w-8 h-8 mb-2" />
                  <p className="text-sm">
                    No hay OSIs de capacitación que coincidan con los filtros.
                  </p>
                </div>
              ) : (
                <>
                  <div className="max-w-md">
                    <ComplianceGauge
                      aggregates={aggregates}
                      activeEstado={
                        drilldown?.type === "estado" ? drilldown.value : null
                      }
                      onSelectEstado={handleSelectEstado}
                    />
                  </div>

                  <div ref={tableRef}>
                    {drilldownLabel && (
                      <div className="mb-3 flex items-center justify-between gap-3 bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5">
                        <p className="text-sm text-gray-800">
                          Mostrando: <strong>{drilldownLabel}</strong> (
                          {tableRows.length}{" "}
                          {tableRows.length === 1 ? "OSI" : "OSIs"})
                        </p>
                        <button
                          onClick={() => setDrilldown(null)}
                          className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
                        >
                          <X className="w-3.5 h-3.5" />
                          Limpiar
                        </button>
                      </div>
                    )}
                    <IndicadoresTable
                      key={drilldown ? `${drilldown.type}:${drilldown.value}` : "all"}
                      rows={tableRows}
                      defaultSortByBrecha={
                        drilldown?.type === "estado" &&
                        drilldown.value === "pendiente"
                      }
                    />
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
