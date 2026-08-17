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
  // When true, the Y-axis label is uppercased before truncation. Used for
  // facilitador charts where names should be displayed in ALL CAPS.
  uppercaseLabel?: boolean;
}

export default function DimensionBarChart({
  data,
  title,
  subtitle,
  maxItems = 10,
  uppercaseLabel = false,
}: Props) {
  const chartData = data
    .slice(0, maxItems)
    .map((d) => {
      const rawLabel = uppercaseLabel ? d.label.toUpperCase() : d.label;
      // For multi-part labels like "empresa · sede · servicio", split into
      // a primary label (empresa) and a sublabel (sede · servicio) so the
      // Y-axis can render them on two lines. This makes it clear why the
      // same company appears multiple times (different sede/servicio).
      const parts = rawLabel.split(" · ");
      const primary = parts[0] ?? rawLabel;
      const sublabel = parts.length > 1 ? parts.slice(1).join(" · ") : undefined;
      const truncLabel = primary.length > 22 ? primary.slice(0, 20) + "…" : primary;
      const truncSub = sublabel
        ? sublabel.length > 28 ? sublabel.slice(0, 26) + "…" : sublabel
        : undefined;
      return {
        label: truncLabel,
        sublabel: truncSub,
        fullLabel: rawLabel,
        avgDias: d.avgDias ?? 0,
        count: d.count,
        pendientes: d.pendientes,
        noAplica: d.noAplica,
        programadas: d.programadas,
        pct: d.pct,
      };
    });

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
      <div style={{ height: `${Math.max(260, chartData.length * 36)}px` }}>
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
                tickFormatter={(v) => `${v}d`}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={<CustomYAxisTick />}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                width={180}
              />
              <Tooltip
                formatter={(value) => [`${value}d`, "Promedio"]}
                labelFormatter={(_label, payload) => {
                  const p = payload?.[0]?.payload as
                    | {
                        fullLabel?: string;
                        count?: number;
                        pendientes?: number;
                        noAplica?: number;
                        programadas?: number;
                        pct?: number | null;
                      }
                    | undefined;
                  if (!p) return "";
                  const extra: string[] = [];
                  if (p.pendientes) extra.push(`${p.pendientes} pend.`);
                  if (p.programadas) extra.push(`${p.programadas} prog.`);
                  if (p.noAplica) extra.push(`${p.noAplica} N/A`);
                  const extraStr = extra.length ? ` (+ ${extra.join(", ")})` : "";
                  return `${p.fullLabel} · ${p.count} OSIs evaluadas${extraStr} · ${p.pct ?? "—"}%`;
                }}
                contentStyle={{
                  fontSize: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              />
              <ReferenceLine x={3} stroke="#ef4444" strokeDasharray="4 4" />
              <Bar dataKey="avgDias" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.avgDias <= 3 ? "#0ea5e9" : "#f97316"
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

// Custom Y-axis tick that renders the primary label (e.g. empresa name) on
// the first line and the sublabel (e.g. "sede · servicio") on a second
// smaller gray line below it. This makes it clear why the same company
// appears as multiple bars — each bar is a different sede/servicio combo.
function CustomYAxisTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string; payload?: { sublabel?: string } };
}) {
  const px = x ?? 0;
  const py = y ?? 0;
  const sublabel = payload?.payload?.sublabel;
  return (
    <g transform={`translate(${px},${py})`}>
      <text
        x={-6}
        y={sublabel ? -4 : 0}
        textAnchor="end"
        dominantBaseline="middle"
        fontSize={10}
        fill="#374151"
        fontWeight={500}
      >
        {payload?.value}
      </text>
      {sublabel && (
        <text
          x={-6}
          y={8}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={9}
          fill="#9ca3af"
        >
          {sublabel}
        </text>
      )}
    </g>
  );
}
