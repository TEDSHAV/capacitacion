"use client";

import {
  Gauge,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Hourglass,
  Timer,
} from "lucide-react";
import type { IndicadoresAggregates } from "@/types";

interface Props {
  aggregates: IndicadoresAggregates;
}

function complianceColor(pct: number | null): string {
  if (pct == null) return "bg-gray-100 text-gray-500";
  if (pct >= 90) return "bg-emerald-100 text-emerald-700";
  if (pct >= 75) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function complianceValueColor(pct: number | null): string {
  if (pct == null) return "text-gray-400";
  if (pct >= 90) return "text-emerald-600";
  if (pct >= 75) return "text-amber-600";
  return "text-red-600";
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  valueColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
        <span className="text-xs font-medium text-gray-500 leading-tight">
          {label}
        </span>
      </div>
      <div>
        <p
          className={`text-2xl font-bold leading-none ${
            valueColor ?? "text-gray-900"
          }`}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function KpiCards({ aggregates }: Props) {
  const pct = aggregates.pctCumplimiento;
  const pctLabel = pct == null ? "—" : `${pct}%`;
  const pctSub =
    pct == null
      ? "Sin datos evaluados"
      : `${aggregates.dentro72} de ${aggregates.totalEvaluadas} OSIs`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Headline: % Cumplimiento */}
      <KpiCard
        icon={Gauge}
        label="% Cumplimiento 3 días hábiles"
        value={pctLabel}
        sub={pctSub}
        color={complianceColor(pct)}
        valueColor={complianceValueColor(pct)}
      />
      <KpiCard
        icon={CheckCircle2}
        label="Dentro de SLA"
        value={aggregates.dentro72}
        sub={`de ${aggregates.totalEvaluadas} evaluadas`}
        color="bg-emerald-100 text-emerald-700"
        valueColor="text-emerald-600"
      />
      <KpiCard
        icon={XCircle}
        label="Fuera de SLA"
        value={aggregates.fuera72}
        sub={
          aggregates.fuera72 > 0 ? "Requieren atención" : "Sin incumplimientos"
        }
        color="bg-red-100 text-red-700"
        valueColor="text-red-600"
      />
      <KpiCard
        icon={Hourglass}
        label="Pendientes / Backlog"
        value={aggregates.pendientes}
        sub={
          aggregates.enRiesgoPendientes > 0
            ? `${aggregates.enRiesgoPendientes} en riesgo (>3 días hábiles)`
            : "Ninguna en riesgo"
        }
        color="bg-amber-100 text-amber-700"
        valueColor="text-amber-600"
      />
      <KpiCard
        icon={Clock}
        label="Días promedio"
        value={aggregates.avgDias != null ? `${aggregates.avgDias}d` : "—"}
        sub="Tiempo medio de emisión (días hábiles)"
        color="bg-sky-100 text-sky-700"
      />
      <KpiCard
        icon={Timer}
        label="Días mediana"
        value={
          aggregates.medianaDias != null
            ? `${aggregates.medianaDias}d`
            : "—"
        }
        sub="Robusto a valores atípicos"
        color="bg-sky-100 text-sky-700"
      />
      <KpiCard
        icon={TrendingUp}
        label="Peor caso"
        value={aggregates.maxDias != null ? `${aggregates.maxDias}d` : "—"}
        sub={aggregates.maxDiasOsi ? `OSI ${aggregates.maxDiasOsi}` : undefined}
        color="bg-orange-100 text-orange-700"
        valueColor="text-orange-600"
      />
      <KpiCard
        icon={AlertTriangle}
        label="OSIs evaluadas"
        value={aggregates.totalEvaluadas}
        sub={`${aggregates.noAplica} no aplican`}
        color="bg-gray-100 text-gray-600"
      />
    </div>
  );
}
