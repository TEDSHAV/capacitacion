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
import type { PorDimensionItem } from "@/types";

interface Props {
  data: PorDimensionItem[];
  title: string;
  subtitle?: string;
  slaHours?: number;
  maxItems?: number;
}

export default function DimensionBarChart({
  data,
  title,
  subtitle,
  maxItems = 10,
}: Props) {
  const chartData = data
    .slice(0, maxItems)
    .map((d) => ({
      label: d.label.length > 22 ? d.label.slice(0, 20) + "…" : d.label,
      fullLabel: d.label,
      avgHoras: d.avgHoras ?? 0,
      count: d.count,
      pct: d.pct,
    }));

  const hasData = chartData.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div style={{ height: `${Math.max(220, chartData.length * 26)}px` }}>
        {!hasData ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Sin datos
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
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
                width={120}
              />
              <Tooltip
                formatter={(value) => [`${value}h`, "Promedio"]}
                labelFormatter={(_label, payload) => {
                  const p = payload?.[0]?.payload as
                    | { fullLabel?: string; count?: number; pct?: number | null }
                    | undefined;
                  return p
                    ? `${p.fullLabel} · ${p.count} OSIs · ${p.pct ?? "—"}%`
                    : "";
                }}
                contentStyle={{
                  fontSize: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              />
              <ReferenceLine x={72} stroke="#ef4444" strokeDasharray="4 4" />
              <Bar dataKey="avgHoras" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.avgHoras <= 72 ? "#0ea5e9" : "#f97316"
                    }
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
