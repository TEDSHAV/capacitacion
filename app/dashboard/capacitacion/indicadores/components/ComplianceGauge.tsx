"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { IndicadoresAggregates } from "@/types";

interface Props {
  aggregates: IndicadoresAggregates;
}

export default function ComplianceGauge({ aggregates }: Props) {
  const { dentro72, fuera72, pendientes } = aggregates;
  const total = dentro72 + fuera72 + pendientes;
  const pct = aggregates.pctCumplimiento;

  const data = [
    { name: "Dentro", value: dentro72, color: "#10b981" },
    { name: "Fuera", value: fuera72, color: "#ef4444" },
    { name: "Pendientes", value: pendientes, color: "#f59e0b" },
  ].filter((d) => d.value > 0);

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
                  <Cell key={i} fill={entry.color} />
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
        <Legend color="#10b981" label="Dentro" value={dentro72} />
        <Legend color="#ef4444" label="Fuera" value={fuera72} />
        <Legend color="#f59e0b" label="Pend." value={pendientes} />
      </div>
    </div>
  );
}

function Legend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2.5 h-2.5 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-gray-600">
        {label} <strong className="text-gray-900">{value}</strong>
      </span>
    </div>
  );
}
