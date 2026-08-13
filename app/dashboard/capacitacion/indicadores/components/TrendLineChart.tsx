"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { TendenciaMensual } from "@/types";

interface Props {
  data: TendenciaMensual[];
  target?: number;
}

export default function TrendLineChart({ data, target = 90 }: Props) {
  const hasData = data.some((d) => d.total > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Tendencia mensual
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            % cumplimiento últimos 12 meses
          </p>
        </div>
      </div>
      <div style={{ height: "220px" }}>
        {!hasData ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Sin datos en el rango
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, "Cumplimiento"]}
                labelFormatter={(label) => `Mes: ${label}`}
                contentStyle={{
                  fontSize: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              />
              <ReferenceLine
                y={target}
                stroke="#0ea5e9"
                strokeDasharray="4 4"
                label={{
                  value: `Meta ${target}%`,
                  fontSize: 10,
                  fill: "#0ea5e9",
                  position: "insideTopRight",
                }}
              />
              <Line
                type="monotone"
                dataKey="pct"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#10b981" }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
