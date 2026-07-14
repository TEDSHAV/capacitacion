"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Users,
  BookOpen,
  Award,
  AlertCircle,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";
import { getEmpresasReport } from "@/app/actions/reportes";
import { EmpresaReportItem } from "@/types";

interface Props {
  dateFrom?: string;
  dateTo?: string;
  selectedState?: string;
}

type SortField =
  | "razon_social"
  | "totalCerts"
  | "uniqueParticipants"
  | "uniqueCourses"
  | "lastActivity";
type SortDir = "asc" | "desc";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`bg-gray-200 rounded animate-pulse ${className ?? ""}`} />
  );
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysAgo(d: string | null): string {
  if (!d) return "";
  const diff = Math.floor(
    (Date.now() - new Date(d + "T12:00:00").getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  if (diff < 30) return `Hace ${diff} días`;
  if (diff < 365) return `Hace ${Math.floor(diff / 30)} meses`;
  return `Hace ${Math.floor(diff / 365)} años`;
}

function SortButton({
  field,
  current,
  dir,
  onSort,
  children,
}: {
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
  children: React.ReactNode;
}) {
  const isActive = field === current;
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 group"
    >
      <span
        className={`text-xs font-semibold uppercase tracking-wide ${
          isActive ? "text-sky-700" : "text-gray-700 group-hover:text-gray-900"
        }`}
      >
        {children}
      </span>
      <span className="text-gray-300 group-hover:text-gray-500">
        {isActive ? (
          dir === "asc" ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3" />
        )}
      </span>
    </button>
  );
}

export default function EmpresasReport({
  dateFrom,
  dateTo,
  selectedState,
}: Props) {
  const [data, setData] = useState<EmpresaReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("totalCerts");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    getEmpresasReport(dateFrom, dateTo, selectedState || undefined)
      .then((res) => {
        if (res.error) setError(res.error);
        else setData(res.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, selectedState]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    let list = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.razon_social.toLowerCase().includes(q) ||
          c.rif.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      let av: any = (a as any)[sortField] ?? "";
      let bv: any = (b as any)[sortField] ?? "";
      if (sortField === "razon_social")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      if (sortField === "lastActivity") {
        av = av || "0000-00-00";
        bv = bv || "0000-00-00";
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? Number(av) - Number(bv)
        : Number(bv) - Number(av);
    });
    return list;
  }, [data, sortField, sortDir, search]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
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

  const totalCerts = data.reduce((s, c) => s + c.totalCerts, 0);
  const totalParticipants = data.reduce((s, c) => s + c.uniqueParticipants, 0);
  const maxCerts = Math.max(...data.map((c) => c.totalCerts), 1);
  const topCompany = data.length > 0 ? data[0] : null;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Empresas capacitadas</p>
          <p className="text-2xl font-bold text-gray-900">{data.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total certificados</p>
          <p className="text-2xl font-bold text-sky-600">
            {totalCerts.toLocaleString("es-VE")}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Participantes únicos</p>
          <p className="text-2xl font-bold text-emerald-600">
            {totalParticipants.toLocaleString("es-VE")}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Cliente más activo</p>
          <p
            className="text-sm font-bold text-gray-800 truncate"
            title={topCompany?.razon_social}
          >
            {topCompany?.razon_social ?? "—"}
          </p>
          {topCompany && (
            <p className="text-xs text-sky-600 mt-0.5">
              {topCompany.totalCerts} cert.
            </p>
          )}
        </div>
      </div>

      {/* Horizontal bar chart - top 10 */}
      {data.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Top empresas por certificados emitidos
          </h3>
          <div className="space-y-2.5">
            {[...data]
              .sort((a, b) => b.totalCerts - a.totalCerts)
              .slice(0, 10)
              .map((c, i) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs text-gray-400 flex-shrink-0">
                    {i + 1}
                  </span>
                  <span
                    className="w-52 text-xs text-gray-700 truncate flex-shrink-0"
                    title={c.razon_social}
                  >
                    {c.razon_social}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-sky-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(c.totalCerts / maxCerts) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-10 text-right flex-shrink-0">
                    {c.totalCerts}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Detalle por Empresa
          </h3>
          <input
            type="text"
            placeholder="Buscar empresa o RIF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-sky-300 w-52"
          />
        </div>

        {sorted.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            {search
              ? "Sin resultados"
              : "Sin datos para el período seleccionado"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-5 py-3 text-left">
                    <SortButton
                      field="razon_social"
                      current={sortField}
                      dir={sortDir}
                      onSort={handleSort}
                    >
                      Empresa
                    </SortButton>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton
                      field="totalCerts"
                      current={sortField}
                      dir={sortDir}
                      onSort={handleSort}
                    >
                      Certs.
                    </SortButton>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton
                      field="uniqueParticipants"
                      current={sortField}
                      dir={sortDir}
                      onSort={handleSort}
                    >
                      Participantes
                    </SortButton>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton
                      field="uniqueCourses"
                      current={sortField}
                      dir={sortDir}
                      onSort={handleSort}
                    >
                      Cursos
                    </SortButton>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton
                      field="lastActivity"
                      current={sortField}
                      dir={sortDir}
                      onSort={handleSort}
                    >
                      Última actividad
                    </SortButton>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {c.razon_social}
                          </p>
                          <p className="text-[11px] text-gray-400">{c.rif}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm font-semibold text-sky-700">
                        {c.totalCerts}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <Users className="w-3 h-3 text-gray-400" />
                        {c.uniqueParticipants}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <BookOpen className="w-3 h-3 text-gray-400" />
                        {c.uniqueCourses}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div>
                        <p className="text-xs text-gray-600">
                          {formatDate(c.lastActivity)}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {daysAgo(c.lastActivity)}
                        </p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
