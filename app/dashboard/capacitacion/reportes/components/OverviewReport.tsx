"use client";

import { useState, useEffect } from "react";
import {
  Award,
  Calendar,
  Star,
  Clock,
  Users,
  Building2,
  BookOpen,
  Loader2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { getOverviewMetrics } from "@/app/actions/reportes";
import { OverviewMetrics } from "@/types";

interface Props {
  dateFrom?: string;
  dateTo?: string;
  selectedState?: string;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`bg-gray-200 rounded animate-pulse ${className ?? ""}`} />
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
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
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function MonthlyTrendChart({
  data,
}: {
  data: OverviewMetrics["monthlyTrend"];
}) {
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Emisión Mensual
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Últimos 12 meses</p>
        </div>
        <TrendingUp className="w-4 h-4 text-gray-300" />
      </div>
      <div className="flex items-end gap-1" style={{ height: "120px" }}>
        {data.map((m, i) => {
          const pct = (m.count / maxVal) * 100;
          const isLast = i === data.length - 1;
          return (
            <div
              key={m.key}
              className="flex-1 flex flex-col items-center gap-1 group relative"
              style={{ height: "100%" }}
            >
              {/* Tooltip */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {m.count} certs
              </div>
              <div className="w-full flex-1 flex items-end">
                <div
                  className={`w-full rounded-t-sm transition-all duration-500 ${
                    isLast
                      ? "bg-sky-500"
                      : m.count > 0
                        ? "bg-sky-200 group-hover:bg-sky-400"
                        : "bg-gray-100"
                  }`}
                  style={{ height: `${Math.max(pct, m.count > 0 ? 4 : 1)}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-400 leading-none">
                {m.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopList({
  title,
  items,
  valueLabel,
}: {
  title: string;
  items: Array<{ name: string; count: number; avgScore?: number }>;
  valueLabel: string;
}) {
  const maxVal = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Sin datos en el período</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span
                    className="text-xs text-gray-700 truncate"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                </div>
                <span className="text-xs font-semibold text-gray-800 ml-2 flex-shrink-0">
                  {item.count} {valueLabel}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 ml-7">
                <div
                  className="bg-sky-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(item.count / maxVal) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OverviewReport({ dateFrom, dateTo }: Props) {
  const [data, setData] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getOverviewMetrics(dateFrom, dateTo)
      .then((res) => {
        if (res.error) setError(res.error);
        else setData(res.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-52 rounded-xl lg:col-span-1" />
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

  const now = new Date();
  const currentYear = now.getFullYear();

  return (
    <div className="space-y-5">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard
          icon={Award}
          label="Total Certificados"
          value={data.totalCertificates.toLocaleString("es-VE")}
          sub={`${data.activeCertificates} activos`}
          color="bg-gray-50 text-gray-700"
        />
        <KPICard
          icon={Calendar}
          label="Este Mes"
          value={data.certificatesThisMonth}
          sub="Emitidos en el mes actual"
          color="bg-emerald-50 text-emerald-600"
        />
        <KPICard
          icon={TrendingUp}
          label={`Año ${currentYear}`}
          value={data.certificatesThisYear}
          sub="Total en el año en curso"
          color="bg-gray-50 text-gray-700"
        />
        <KPICard
          icon={Star}
          label="Calificación Prom."
          value={data.averageScore > 0 ? `${data.averageScore}/20` : "—"}
          sub="Promedio general de scores"
          color="bg-amber-50 text-amber-600"
        />
        <KPICard
          icon={Clock}
          label="Horas Dictadas"
          value={data.totalHoursDelivered.toLocaleString("es-VE")}
          sub="Horas académicas acumuladas"
          color="bg-orange-50 text-orange-600"
        />
        <KPICard
          icon={Users}
          label="Participantes"
          value={data.uniqueParticipants.toLocaleString("es-VE")}
          sub={`${data.uniqueFacilitators} facilitadores activos`}
          color="bg-pink-50 text-pink-600"
        />
      </div>

      {/* Secondary KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
          <BookOpen className="w-5 h-5 text-sky-400 flex-shrink-0" />
          <div>
            <p className="text-xl font-bold text-gray-900">
              {data.uniqueCourses}
            </p>
            <p className="text-xs text-gray-500">Cursos con actividad</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
          <Users className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-xl font-bold text-gray-900">
              {data.uniqueFacilitators}
            </p>
            <p className="text-xs text-gray-500">Facilitadores activos</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
          <Building2 className="w-5 h-5 text-sky-400 flex-shrink-0" />
          <div>
            <p className="text-xl font-bold text-gray-900">
              {data.uniqueCompanies}
            </p>
            <p className="text-xs text-gray-500">Empresas con certificados</p>
          </div>
        </div>
      </div>

      {/* Trend chart + top tables */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <MonthlyTrendChart data={data.monthlyTrend} />
        </div>
        <div className="lg:col-span-1">
          <TopList
            title="Top Cursos"
            items={data.topCourses}
            valueLabel="cert."
          />
        </div>
        <div className="lg:col-span-1">
          <TopList
            title="Top Empresas"
            items={data.topCompanies}
            valueLabel="cert."
          />
        </div>
      </div>
    </div>
  );
}
