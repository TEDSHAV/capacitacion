"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { IndicadorOsiRow } from "@/types";

interface Props {
  rows: IndicadorOsiRow[];
  slaHours?: number;
  maxItems?: number;
}

export default function OsiBarChart({
  rows,
  slaHours = 72,
  maxItems = 20,
}: Props) {
  // Only evaluadas (have horas), sorted by horas desc, top N
  const data = rows
    .filter((r) => r.horas != null)
    .sort((a, b) => (b.horas ?? 0) - (a.horas ?? 0))
    .slice(0, maxItems)
    .map((r) => ({
      label: r.nroOsi,
      horas: r.horas ?? 0,
      estado: r.estado,
      empresa: r.empresa,
    }));

  const hasData = data.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Horas por OSI (top {maxItems})
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Línea roja = SLA 72h · barras rojas = incumplimiento
          </p>
        </div>
      </div>
      <div style={{ height: `${Math.max(220, data.length * 22)}px` }}>
        {!hasData ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Sin OSIs evaluadas
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                tickFormatter={(v) => `${v}h`}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                width={90}
              />
              <Tooltip
                formatter={(value) => [`${value}h`, "Horas"]}
                labelFormatter={(_label, payload) => {
                  const p = payload?.[0]?.payload as
                    | { label?: string; empresa?: string }
                    | undefined;
                  return p ? `${p.label} · ${p.empresa}` : "";
                }}
                contentStyle={{
                  fontSize: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              />
              <ReferenceLine
                x={slaHours}
                stroke="#ef4444"
                strokeDasharray="4 4"
              />
              <Bar dataKey="horas" radius={[0, 4, 4, 0]}>
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.estado === "dentro" ? "#10b981" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
