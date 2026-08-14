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
} from "recharts";
import type { DistribucionBucket } from "@/types";

interface Props {
  data: DistribucionBucket[];
}

export default function DistributionHistogram({ data }: Props) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Distribución de tiempos
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            OSIs por rango de días hábiles hasta emisión
          </p>
        </div>
      </div>
      <div style={{ height: "220px" }}>
        {!hasData ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Sin datos
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
                formatter={(value) => [`${value} OSIs`, "Cantidad"]}
                contentStyle={{
                  fontSize: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.dentro ? "#10b981" : "#ef4444"}
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
