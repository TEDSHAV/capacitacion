"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  MapPin,
  Calendar,
} from "lucide-react";
import { getTendenciasReport } from "@/app/actions/reportes";
import { TendenciasData } from "@/types";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`bg-gray-200 rounded animate-pulse ${className ?? ""}`} />
  );
}

const PALETTE = [
  "#0ea5e9",
  "#10b981",
  "#22d3ee",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#ec4899",
  "#84cc16",
];

function SVGAreaChart({
  data,
}: {
  data: Array<{ label: string; year: number; count: number; key: string }>;
}) {
  const W = 800;
  const H = 180;
  const padT = 15;
  const padB = 36;
  const padL = 36;
  const padR = 12;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxVal = Math.max(...data.map((d) => d.count), 1);

  const xPos = (i: number) =>
    data.length > 1 ? padL + (i / (data.length - 1)) * plotW : padL + plotW / 2;
  const yPos = (v: number) => padT + plotH - (v / maxVal) * plotH;

  const pts = data.map((d, i) => ({ x: xPos(i), y: yPos(d.count), ...d }));

  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    pts.length > 0
      ? `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
      : "";

  // Y-axis grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: padT + plotH * (1 - f),
    label: Math.round(maxVal * f),
  }));

  // Show label every N points to avoid overcrowding
  const labelEvery = data.length > 18 ? 3 : data.length > 12 ? 2 : 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: "180px" }}
      aria-label="Tendencia mensual de certificados"
    >
      <defs>
        <linearGradient id="tendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line
            x1={padL}
            y1={g.y}
            x2={W - padR}
            y2={g.y}
            stroke="#e5e7eb"
            strokeWidth="0.8"
            strokeDasharray={i === 0 ? "none" : "3 3"}
          />
          {i > 0 && (
            <text
              x={padL - 4}
              y={g.y + 4}
              textAnchor="end"
              fontSize="9"
              fill="#9ca3af"
            >
              {g.label}
            </text>
          )}
        </g>
      ))}

      {/* Area fill */}
      {areaPath && <path d={areaPath} fill="url(#tendGrad)" />}

      {/* Line */}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Data points */}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={p.count > 0 ? "3.5" : "2"}
          fill={p.count > 0 ? "#0ea5e9" : "#e5e7eb"}
          stroke="white"
          strokeWidth="1.5"
        />
      ))}

      {/* X labels */}
      {pts.map((p, i) =>
        i % labelEvery === 0 ? (
          <text
            key={i}
            x={p.x}
            y={H - 6}
            textAnchor="middle"
            fontSize="9"
            fill={
              p.year !== pts[i > 0 ? i - 1 : 0].year ? "#0284c7" : "#9ca3af"
            }
            fontWeight={p.year !== pts[i > 0 ? i - 1 : 0].year ? "600" : "400"}
          >
            {p.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function GrowthBadge({ current, prev }: { current: number; prev: number }) {
  if (prev === 0 && current === 0)
    return <span className="text-xs text-gray-400">Sin datos</span>;
  if (prev === 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        <TrendingUp className="w-3 h-3" /> Nuevo
      </span>
    );
  const pct = ((current - prev) / prev) * 100;
  if (Math.abs(pct) < 1)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
        <Minus className="w-3 h-3" /> Estable
      </span>
    );
  if (pct > 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        <TrendingUp className="w-3 h-3" /> +{pct.toFixed(0)}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
      <TrendingDown className="w-3 h-3" /> {pct.toFixed(0)}%
    </span>
  );
}

const MONTH_NAMES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export default function TendenciasReport() {
  const [data, setData] = useState<TendenciasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTendenciasReport()
      .then((res) => {
        if (res.error) setError(res.error);
        else setData(res.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { monthlyData, yearlyTotals, stateDistribution } = data;

  // Total emitidos en los últimos 24 meses
  const totalLast24 = monthlyData.reduce((s, m) => s + m.count, 0);
  const last12 = monthlyData.slice(12).reduce((s, m) => s + m.count, 0);
  const prev12 = monthlyData.slice(0, 12).reduce((s, m) => s + m.count, 0);
  const peakMonth = [...monthlyData].sort((a, b) => b.count - a.count)[0];

  // Year-over-year table (only months present in at least 2 years)
  const years = Array.from(new Set(monthlyData.map((m) => m.year))).sort();
  const currentYear = years[years.length - 1];
  const prevYear = years[years.length - 2];

  const byYearMonth: Record<number, Record<number, number>> = {};
  monthlyData.forEach((m) => {
    if (!byYearMonth[m.year]) byYearMonth[m.year] = {};
    byYearMonth[m.year][m.month] = m.count;
  });

  const maxState = Math.max(...stateDistribution.map((s) => s.count), 1);

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Últimos 24 meses</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalLast24.toLocaleString("es-VE")}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Últimos 12 meses</p>
          <p className="text-2xl font-bold text-sky-600">
            {last12.toLocaleString("es-VE")}
          </p>
          <div className="mt-1">
            <GrowthBadge current={last12} prev={prev12} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Mes pico</p>
          <p className="text-sm font-bold text-gray-900">
            {peakMonth?.count > 0
              ? `${MONTH_NAMES[(peakMonth.month || 1) - 1]} ${peakMonth.year}`
              : "—"}
          </p>
          {peakMonth?.count > 0 && (
            <p className="text-xs text-sky-600 mt-0.5">
              {peakMonth.count} cert.
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Prom. mensual (12m)</p>
          <p className="text-2xl font-bold text-orange-500">
            {last12 > 0 ? (last12 / 12).toFixed(1) : "0"}
          </p>
        </div>
      </div>

      {/* SVG Area Chart — 24 months */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Certificados emitidos — últimos 24 meses
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Tendencia acumulada de emisión mensual
            </p>
          </div>
          {years.length >= 2 && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {years.slice(-2).map((y) => (
                <span key={y} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{
                      background: y === currentYear ? "#0ea5e9" : "#d1d5db",
                    }}
                  />
                  {y}
                </span>
              ))}
            </div>
          )}
        </div>
        <SVGAreaChart data={monthlyData} />
      </div>

      {/* YoY Table + State Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Year comparison */}
        {prevYear && currentYear && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">
                Comparativa año a año
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Mes
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      {prevYear}
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-600 uppercase tracking-wide">
                      {currentYear}
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Δ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {MONTH_NAMES.map((name, idx) => {
                    const month = idx + 1;
                    const cy = byYearMonth[currentYear]?.[month] ?? 0;
                    const py = byYearMonth[prevYear]?.[month] ?? 0;
                    const diff = cy - py;
                    const showRow = cy > 0 || py > 0;
                    if (!showRow) return null;
                    return (
                      <tr
                        key={month}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-2 text-xs font-medium text-gray-700">
                          {name}
                        </td>
                        <td className="px-4 py-2 text-right text-xs text-gray-500">
                          {py > 0 ? py : "—"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={`text-xs font-semibold ${cy > 0 ? "text-sky-700" : "text-gray-400"}`}
                          >
                            {cy > 0 ? cy : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {py > 0 && cy > 0 ? (
                            <span
                              className={`text-xs font-medium ${
                                diff > 0
                                  ? "text-emerald-600"
                                  : diff < 0
                                    ? "text-rose-600"
                                    : "text-gray-400"
                              }`}
                            >
                              {diff > 0 ? "+" : ""}
                              {diff}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-800">
                      Total
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-600">
                      {Object.values(byYearMonth[prevYear] ?? {}).reduce(
                        (a, b) => a + b,
                        0,
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-xs font-bold text-sky-700">
                        {Object.values(byYearMonth[currentYear] ?? {}).reduce(
                          (a, b) => a + b,
                          0,
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <GrowthBadge
                        current={Object.values(
                          byYearMonth[currentYear] ?? {},
                        ).reduce((a, b) => a + b, 0)}
                        prev={Object.values(byYearMonth[prevYear] ?? {}).reduce(
                          (a, b) => a + b,
                          0,
                        )}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* State distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">
              Distribución por estado
            </h3>
          </div>
          {stateDistribution.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              Sin datos de estado en los certificados
            </p>
          ) : (
            <div className="space-y-3">
              {stateDistribution.map((s, i) => {
                const pct = (
                  (s.count /
                    stateDistribution.reduce((a, b) => a + b.count, 0)) *
                  100
                ).toFixed(1);
                return (
                  <div key={s.nombre}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: PALETTE[i % PALETTE.length] }}
                        />
                        <span className="text-xs text-gray-700 truncate">
                          {s.nombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        <span className="text-[10px] text-gray-400">
                          {pct}%
                        </span>
                        <span className="text-xs font-semibold text-gray-800 w-8 text-right">
                          {s.count}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(s.count / maxState) * 100}%`,
                          background: PALETTE[i % PALETTE.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Yearly totals */}
          {yearlyTotals.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                Totales por año
              </p>
              <div className="flex items-end gap-3">
                {yearlyTotals.map((y) => {
                  const maxY = Math.max(...yearlyTotals.map((x) => x.count), 1);
                  const pct = (y.count / maxY) * 100;
                  return (
                    <div
                      key={y.year}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <span className="text-xs font-semibold text-gray-700">
                        {y.count}
                      </span>
                      <div
                        className="w-full rounded-t-sm bg-sky-200"
                        style={{
                          height: `${Math.max(pct, 4)}px`,
                          maxHeight: "48px",
                        }}
                      />
                      <span className="text-[10px] text-gray-400">
                        {y.year}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
