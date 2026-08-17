"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { IndicadorEstado, IndicadoresAggregates } from "@/types";

interface Props {
  aggregates: IndicadoresAggregates;
  activeEstado?: IndicadorEstado | null;
  onSelectEstado?: (estado: IndicadorEstado | null) => void;
}

export default function ComplianceGauge({
  aggregates,
  activeEstado = null,
  onSelectEstado,
}: Props) {
  const { dentro72, fuera72, pendientes, programadas, noAplica, totalOsis } = aggregates;
  // Use the same canonical total as the KPI cards so the numbers on this
  // screen always reconcile with each other.
  const total = totalOsis;
  const pct = aggregates.pctCumplimiento;

  type SliceDatum = { name: string; value: number; color: string; estado: IndicadorEstado };
  const allSlices: SliceDatum[] = [
    { name: "Dentro", value: dentro72, color: "#10b981", estado: "dentro" },
    { name: "Fuera", value: fuera72, color: "#ef4444", estado: "fuera" },
    { name: "Pendientes", value: pendientes, color: "#f59e0b", estado: "pendiente" },
    { name: "Programadas", value: programadas, color: "#6366f1", estado: "programada" },
    { name: "No aplica", value: noAplica, color: "#9ca3af", estado: "no_aplica" },
  ];
  const data = allSlices.filter((d) => d.value > 0);

  const handleSelect = (estado: IndicadorEstado) => {
    if (!onSelectEstado) return;
    onSelectEstado(activeEstado === estado ? null : estado);
  };

  const pctColor =
    pct == null
      ? "#9ca3af"
      : pct >= 90
        ? "#10b981"
        : pct >= 75
          ? "#f59e0b"
          : "#ef4444";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Cumplimiento 3 días hábiles
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Distribución de OSIs por estado
          </p>
        </div>
      </div>
      <div className="relative" style={{ height: "220px" }}>
        {total === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Sin datos
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.color}
                    stroke={activeEstado === entry.estado ? "#111827" : undefined}
                    strokeWidth={activeEstado === entry.estado ? 2 : undefined}
                    opacity={activeEstado && activeEstado !== entry.estado ? 0.4 : 1}
                    onClick={onSelectEstado ? () => handleSelect(entry.estado) : undefined}
                    cursor={onSelectEstado ? "pointer" : undefined}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  `${value} OSIs`,
                  String(name),
                ]}
                contentStyle={{
                  fontSize: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        {total > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p
              className="text-3xl font-bold leading-none"
              style={{ color: pctColor }}
            >
              {pct == null ? "—" : `${pct}%`}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">cumplimiento</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
        <Legend
          color="#10b981"
          label="Dentro"
          value={dentro72}
          active={activeEstado === "dentro"}
          onClick={onSelectEstado ? () => handleSelect("dentro") : undefined}
        />
        <Legend
          color="#ef4444"
          label="Fuera"
          value={fuera72}
          active={activeEstado === "fuera"}
          onClick={onSelectEstado ? () => handleSelect("fuera") : undefined}
        />
        <Legend
          color="#f59e0b"
          label="Pend."
          value={pendientes}
          active={activeEstado === "pendiente"}
          onClick={onSelectEstado ? () => handleSelect("pendiente") : undefined}
        />
        <Legend
          color="#6366f1"
          label="Prog."
          value={programadas}
          active={activeEstado === "programada"}
          onClick={onSelectEstado ? () => handleSelect("programada") : undefined}
        />
        <Legend
          color="#9ca3af"
          label="N/A"
          value={noAplica}
          active={activeEstado === "no_aplica"}
          onClick={onSelectEstado ? () => handleSelect("no_aplica") : undefined}
        />
      </div>
    </div>
  );
}

function Legend({
  color,
  label,
  value,
  active,
  onClick,
}: {
  color: string;
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
}) {
  const Tag = "div";
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
      className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 ${
        onClick ? "cursor-pointer hover:bg-gray-50" : ""
      } ${active ? "bg-gray-100 ring-1 ring-gray-300" : ""}`}
    >
      <span
        className="w-2.5 h-2.5 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-gray-600">
        {label} <strong className="text-gray-900">{value}</strong>
      </span>
    </Tag>
  );
}
