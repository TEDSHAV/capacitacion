"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, Info, Settings, X } from "lucide-react";
import type {
  IndicadorEstado,
  IndicadoresFilterOptions,
  IndicadoresResponse,
  IndicadorOsiRow,
} from "@/types";
import { getIndicadoresCertificados72h } from "@/app/actions/indicadores-certificados";
import { cachePortalData } from "@/lib/offline/portal-data-cache";
import FilterBar, {
  getDateRange,
  type IndicadoresFilterState,
} from "./components/FilterBar";
import KpiCards from "./components/KpiCards";
import ComplianceGauge from "./components/ComplianceGauge";
import TrendLineChart from "./components/TrendLineChart";
import DistributionHistogram from "./components/DistributionHistogram";
import OsiBarChart from "./components/OsiBarChart";
import DimensionBarChart from "./components/DimensionBarChart";
import MonthlyStackedBar from "./components/MonthlyStackedBar";
import IndicadoresTable from "./components/IndicadoresTable";

interface Props {
  user: { id?: string } | null;
  filterOptions: IndicadoresFilterOptions;
}

const DEFAULT_STATE: IndicadoresFilterState = {
  osiIds: [],
  datePreset: "all",
  customFrom: "",
  customTo: "",
  empresaId: "",
  facilitadorId: "",
  estadoId: "",
  soloIncumplimientos: false,
};

function buildFilters(state: IndicadoresFilterState) {
  const { from, to } =
    state.datePreset === "custom"
      ? { from: state.customFrom, to: state.customTo }
      : getDateRange(state.datePreset);
  return {
    osiIds: state.osiIds.length ? state.osiIds : undefined,
    fechaFrom: from,
    fechaTo: to,
    empresaId: state.empresaId || undefined,
    facilitadorId: state.facilitadorId || undefined,
    estadoId: state.estadoId || undefined,
    soloIncumplimientos: state.soloIncumplimientos || undefined,
  };
}

function exportCsv(rows: IndicadorOsiRow[]) {
  const headers = [
    "OSI",
    "Empresa",
    "Sede",
    "Servicio",
    "Fecha ejecucion",
    "Fuente ejecucion",
    "Fecha emision",
    "Fuente emision",
    "Dias habiles",
    "Brecha (dias)",
    "Facilitador emisor",
    "Facilitador sesion",
    "Estado",
    "Sospechoso",
  ];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
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
        .map(escape)
        .join(","),
    );
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `indicadores-dias-habiles-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Drill-down: clicking a KPI card/gauge slice filters the detail table to
// just that estado, without triggering a new server fetch. Label map used
// for the "showing X" banner above the table.
const DRILLDOWN_LABELS: Record<IndicadorEstado, string> = {
  dentro: "Dentro de SLA",
  fuera: "Fuera de SLA",
  pendiente: "Pendientes",
  programada: "Programadas",
  no_aplica: "No aplica",
};

export default function IndicadoresClient({ user: _user, filterOptions }: Props) {
  void _user;
  const searchParams = useSearchParams();
  const [filterState, setFilterState] = useState<IndicadoresFilterState>(DEFAULT_STATE);
  const [data, setData] = useState<IndicadoresResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Drill-down applied to the detail table only (estado bucket, or a
  // specific OSI number e.g. from the "Peor caso" card). null = show all.
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
    const date = searchParams.get("date");
    const empresa = searchParams.get("empresa");
    const facilitador = searchParams.get("facilitador");
    const estado = searchParams.get("estado");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const breach = searchParams.get("breach");
    const vista = searchParams.get("vista");

    const next: IndicadoresFilterState = { ...DEFAULT_STATE };
    if (osiIdsParam) {
      next.osiIds = osiIdsParam
        .split(",")
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isFinite(n));
    }
    if (date) next.datePreset = date;
    if (empresa) next.empresaId = empresa;
    if (facilitador) next.facilitadorId = facilitador;
    if (estado) next.estadoId = estado;
    if (from && to) {
      next.customFrom = from;
      next.customTo = to;
      next.datePreset = "custom";
    }
    if (breach === "1") next.soloIncumplimientos = true;
    setFilterState(next);
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
    params.set("date", filterState.datePreset);
    if (filterState.empresaId) params.set("empresa", filterState.empresaId);
    if (filterState.facilitadorId)
      params.set("facilitador", filterState.facilitadorId);
    if (filterState.estadoId) params.set("estado", filterState.estadoId);
    if (filterState.datePreset === "custom" && filterState.customFrom && filterState.customTo) {
      params.set("from", filterState.customFrom);
      params.set("to", filterState.customTo);
    }
    if (filterState.soloIncumplimientos) params.set("breach", "1");
    if (drilldown?.type === "estado") params.set("vista", drilldown.value);
    else if (drilldown?.type === "osi") params.set("vista", `osi:${drilldown.value}`);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }, [filterState, drilldown]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getIndicadoresCertificados72h(buildFilters(filterState));
    if (res.error) {
      setError(res.error);
      setData(null);
    } else {
      setData(res.data);
    }
    setLoading(false);
  }, [filterState]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const aggregates = data?.aggregates;
  const rows = data?.rows ?? [];

  // Drill-down only filters the detail table below — the CSV export, the
  // OSI bar chart, and the dimension charts keep reflecting the full
  // toolbar-filtered dataset.
  const tableRows = useMemo(() => {
    if (!drilldown) return rows;
    if (drilldown.type === "estado") {
      return rows.filter((r) => r.estado === drilldown.value);
    }
    return rows.filter((r) => r.nroOsi === drilldown.value);
  }, [rows, drilldown]);

  const scrollToTable = useCallback(() => {
    // Defer to the next tick so layout has settled (e.g. after a card click
    // that also changes visible content above the table).
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

  const handleSelectOsi = useCallback(
    (nroOsi: string | null) => {
      setDrilldown((cur) => {
        if (nroOsi == null) return null;
        if (cur?.type === "osi" && cur.value === nroOsi) return null; // toggle off
        return { type: "osi", value: nroOsi };
      });
      if (nroOsi != null) scrollToTable();
    },
    [scrollToTable],
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
        onChange={setFilterState}
        onExportCsv={() => exportCsv(rows)}
      />

      <main className="flex-1 p-6 overflow-auto">
        {/* Title + assumption note */}
        <div className="mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Indicadores de Certificados · SLA 3 días hábiles
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Mide si la emisión de certificados ocurre dentro de 3 días
                hábiles (excluyendo fines de semana y feriados venezolanos)
                tras la última fecha de ejecución real (
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                  MAX(osi_sesion.fecha_ejecutada)
                </code>
                , con respaldo en{" "}
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                  fecha
                </code>{" "}
                planificada y{" "}
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                  fecha_fin_real
                </code>
                ). Emisión medida por{" "}
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                  certificados.created_at
                </code>{" "}
                (timestamp real de BD), con respaldo en{" "}
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                  fecha_emision
                </code>
                . El día de ejecución cuenta como día 1.
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
        ) : !aggregates ? (
          <div className="flex items-center justify-center py-24 text-sm text-gray-400">
            Sin datos
          </div>
        ) : aggregates.totalEvaluadas === 0 &&
          aggregates.pendientes === 0 &&
          aggregates.noAplica === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Info className="w-8 h-8 mb-2" />
            <p className="text-sm">
              No hay OSIs de capacitación que coincidan con los filtros.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <KpiCards
              aggregates={aggregates}
              activeEstado={drilldown?.type === "estado" ? drilldown.value : null}
              activeOsi={drilldown?.type === "osi" ? drilldown.value : null}
              onSelectEstado={handleSelectEstado}
              onSelectOsi={handleSelectOsi}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ComplianceGauge
                aggregates={aggregates}
                activeEstado={drilldown?.type === "estado" ? drilldown.value : null}
                onSelectEstado={handleSelectEstado}
              />
              <div className="lg:col-span-2">
                <TrendLineChart data={aggregates.tendenciaMensual} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DistributionHistogram data={aggregates.distribucion} />
              <MonthlyStackedBar data={aggregates.tendenciaMensual} />
            </div>

            <OsiBarChart rows={rows} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DimensionBarChart
                data={aggregates.porEmpresa}
                title="Promedio de días por empresa · sede · servicio"
                subtitle="Top 10 por volumen de OSIs evaluadas (línea roja = 3 días)"
              />
              <DimensionBarChart
                data={aggregates.porFacilitador}
                title="Promedio de días por facilitador emisor"
                subtitle="Top 10 facilitadores que emiten certificados (línea roja = 3 días)"
                uppercaseLabel
              />
            </div>

            <DimensionBarChart
              data={aggregates.porFacilitadorSesion}
              title="Promedio de días por facilitador de sesión"
              subtitle="Top 10 · historial de quién dictó cada sesión (una OSI con varios facilitadores cuenta en cada uno · línea roja = 3 días)"
              uppercaseLabel
            />

            <div ref={tableRef}>
              {drilldownLabel && (
                <div className="mb-3 flex items-center justify-between gap-3 bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5">
                  <p className="text-sm text-gray-800">
                    Mostrando: <strong>{drilldownLabel}</strong> ({tableRows.length}{" "}
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
                rows={tableRows}
                defaultSortByBrecha={drilldown?.type === "estado" && drilldown.value === "pendiente"}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
