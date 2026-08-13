"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, Info } from "lucide-react";
import type {
  IndicadoresFilterOptions,
  IndicadoresResponse,
  IndicadorOsiRow,
} from "@/types";
import { getIndicadoresCertificados72h } from "@/app/actions/indicadores-certificados";
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
    "Servicio",
    "Fecha ejecucion",
    "Fuente ejecucion",
    "Fecha emision",
    "Fuente emision",
    "Horas",
    "Brecha (h)",
    "Facilitador",
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
        r.servicio,
        r.fechaEjecucion,
        r.fuenteEjecucion,
        r.fechaEmision,
        r.fuenteEmision,
        r.horas,
        r.brechaHoras,
        r.facilitadorNombre,
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
  link.download = `indicadores-72h-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function IndicadoresClient({ user: _user, filterOptions }: Props) {
  void _user;
  const searchParams = useSearchParams();
  const [filterState, setFilterState] = useState<IndicadoresFilterState>(DEFAULT_STATE);
  const [data, setData] = useState<IndicadoresResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }, [filterState]);

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
          <h1 className="text-xl font-bold text-gray-900">
            Indicadores de Certificados · SLA 72h
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Mide si la emisión de certificados ocurre dentro de 72h tras la
            última fecha de ejecución (
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
              MAX(osi_sesion.fecha)
            </code>
            , con respaldo en{" "}
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
            .
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
            <KpiCards aggregates={aggregates} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ComplianceGauge aggregates={aggregates} />
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
                title="Promedio de horas por empresa"
                subtitle="Top 10 empresas por volumen (línea roja = 72h)"
              />
              <DimensionBarChart
                data={aggregates.porFacilitador}
                title="Promedio de horas por facilitador"
                subtitle="Top 10 facilitadores por volumen (línea roja = 72h)"
              />
            </div>

            <IndicadoresTable rows={rows} />
          </div>
        )}
      </main>
    </div>
  );
}
