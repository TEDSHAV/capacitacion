"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TendenciaMensual } from "@/types";

interface Props {
  data: TendenciaMensual[];
}

export default function MonthlyStackedBar({ data }: Props) {
  const hasData = data.some((d) => d.total > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Volumen mensual
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            OSIs dentro vs fuera de 3 días hábiles (últimos 12 meses)
          </p>
        </div>
      </div>
      <div style={{ height: "240px" }}>
        {!hasData ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Sin datos en el rango
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
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
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <Tooltip
                contentStyle={{
                  fontSize: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
                formatter={(value, name) => [`${value} OSIs`, String(name)]}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px" }}
                iconType="square"
                iconSize={10}
              />
              <Bar
                dataKey="dentro"
                stackId="a"
                fill="#10b981"
                name="Dentro"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="fuera"
                stackId="a"
                fill="#ef4444"
                name="Fuera"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
