"use client";

import {
  Gauge,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Hourglass,
  Calendar,
} from "lucide-react";
import type { IndicadorEstado, IndicadoresAggregates } from "@/types";

interface Props {
  aggregates: IndicadoresAggregates;
  // Currently active drill-down (if any), so the matching card can be
  // visually highlighted.
  activeEstado?: IndicadorEstado | null;
  activeOsi?: string | null;
  onSelectEstado?: (estado: IndicadorEstado | null) => void;
  onSelectOsi?: (nroOsi: string | null) => void;
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
  onClick,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  valueColor?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const Tag = onClick ? "div" : "div";
  return (
    <Tag
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`bg-white rounded-xl border p-5 flex flex-col gap-3 text-left w-full ${
        onClick ? "cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all" : ""
      } ${active ? "border-gray-900 ring-1 ring-gray-300" : "border-gray-200"}`}
    >
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
    </Tag>
  );
}

export default function KpiCards({
  aggregates,
  activeEstado = null,
  activeOsi = null,
  onSelectEstado,
  onSelectOsi,
}: Props) {
  const pct = aggregates.pctCumplimiento;
  const pctLabel = pct == null ? "—" : `${pct}%`;
  const total = aggregates.totalOsis;
  const pctSub =
    pct == null
      ? "Sin datos evaluados"
      : `${aggregates.dentro72} de ${aggregates.totalEvaluadas} evaluadas`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Headline: % Cumplimiento — a rate, not a single estado bucket, so
          it's not clickable. */}
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
        sub={`de ${aggregates.totalEvaluadas} evaluadas · clic para ver detalle`}
        color="bg-emerald-100 text-emerald-700"
        valueColor="text-emerald-600"
        active={activeEstado === "dentro"}
        onClick={onSelectEstado ? () => onSelectEstado("dentro") : undefined}
      />
      <KpiCard
        icon={XCircle}
        label="Fuera de SLA"
        value={aggregates.fuera72}
        sub={`de ${aggregates.totalEvaluadas} evaluadas · clic para ver detalle`}
        color="bg-red-100 text-red-700"
        valueColor="text-red-600"
        active={activeEstado === "fuera"}
        onClick={onSelectEstado ? () => onSelectEstado("fuera") : undefined}
      />
      <KpiCard
        icon={Hourglass}
        label="Pendientes / Backlog"
        value={aggregates.pendientes}
        sub={
          aggregates.enRiesgoPendientes > 0
            ? `de ${total} total · ${aggregates.enRiesgoPendientes} en riesgo (>3 días hábiles)`
            : `de ${total} total · ninguna en riesgo`
        }
        color="bg-amber-100 text-amber-700"
        valueColor="text-amber-600"
        active={activeEstado === "pendiente"}
        onClick={onSelectEstado ? () => onSelectEstado("pendiente") : undefined}
      />
      <KpiCard
        icon={Clock}
        label="Días promedio"
        value={aggregates.avgDias != null ? `${aggregates.avgDias}d` : "—"}
        sub="Tiempo medio de emisión (días hábiles)"
        color="bg-sky-100 text-sky-700"
      />
      <KpiCard
        icon={Calendar}
        label="Programadas"
        value={aggregates.programadas}
        sub={`de ${total} total · fecha de ejecución futura · clic para ver detalle`}
        color="bg-indigo-100 text-indigo-700"
        valueColor="text-indigo-600"
        active={activeEstado === "programada"}
        onClick={onSelectEstado ? () => onSelectEstado("programada") : undefined}
      />
      <KpiCard
        icon={TrendingUp}
        label="Peor caso"
        value={aggregates.maxDias != null ? `${aggregates.maxDias}d` : "—"}
        sub={
          aggregates.maxDiasOsi
            ? `OSI ${aggregates.maxDiasOsi} · clic para ver detalle`
            : undefined
        }
        color="bg-orange-100 text-orange-700"
        valueColor="text-orange-600"
        active={!!aggregates.maxDiasOsi && activeOsi === aggregates.maxDiasOsi}
        onClick={
          onSelectOsi && aggregates.maxDiasOsi
            ? () => onSelectOsi(aggregates.maxDiasOsi)
            : undefined
        }
      />
      <KpiCard
        icon={AlertTriangle}
        label="Total OSIs"
        value={total}
        sub={`${aggregates.totalEvaluadas} evaluadas · ${aggregates.pendientes} pendientes · ${aggregates.programadas} programadas · ${aggregates.noAplica} no aplica · clic para ver todo`}
        color="bg-gray-100 text-gray-600"
        active={activeEstado == null && activeOsi == null}
        onClick={
          onSelectEstado
            ? () => {
                onSelectEstado(null);
                onSelectOsi?.(null);
              }
            : undefined
        }
      />
    </div>
  );
}
