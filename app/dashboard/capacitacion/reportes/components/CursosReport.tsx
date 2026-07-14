"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  Star,
  Clock,
  Users,
  CheckCircle2,
} from "lucide-react";
import { getCursosReport } from "@/app/actions/reportes";
import { CursoReportItem } from "@/types";

interface Props {
  dateFrom?: string;
  dateTo?: string;
  selectedState?: string;
}

type SortField =
  | "nombre"
  | "totalCertificates"
  | "avgScore"
  | "totalHours"
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
      className="flex items-center gap-1 text-left group"
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

function HorizontalBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-sky-400 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 w-6 text-right">
        {label ?? value}
      </span>
    </div>
  );
}

export default function CursosReport({
  dateFrom,
  dateTo,
  selectedState,
}: Props) {
  const [data, setData] = useState<CursoReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("totalCertificates");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    getCursosReport(dateFrom, dateTo, selectedState || undefined)
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
      list = list.filter((c) => c.nombre.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let av: any = a[sortField as keyof CursoReportItem] ?? "";
      let bv: any = b[sortField as keyof CursoReportItem] ?? "";
      if (typeof av === "string" && typeof bv === "string")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc"
        ? Number(av) - Number(bv)
        : Number(bv) - Number(av);
    });
    return list;
  }, [data, sortField, sortDir, search]);

  const maxCerts = Math.max(...data.map((c) => c.totalCertificates), 1);
  const totalCerts = data.reduce((s, c) => s + c.totalCertificates, 0);
  const totalHours = data.reduce((s, c) => s + c.totalHours, 0);
  const avgScore =
    data.filter((c) => c.avgScore > 0).length > 0
      ? (
          data
            .filter((c) => c.avgScore > 0)
            .reduce((s, c) => s + c.avgScore, 0) /
          data.filter((c) => c.avgScore > 0).length
        ).toFixed(1)
      : "—";

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
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

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Cursos con actividad</p>
          <p className="text-2xl font-bold text-gray-900">{data.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total certificados</p>
          <p className="text-2xl font-bold text-sky-600">
            {totalCerts.toLocaleString("es-VE")}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Horas totales</p>
          <p className="text-2xl font-bold text-orange-500">
            {totalHours.toLocaleString("es-VE")}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Calificación promedio</p>
          <p className="text-2xl font-bold text-amber-600">{avgScore}</p>
        </div>
      </div>

      {/* Top 10 bar chart */}
      {data.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Top cursos por certificados emitidos
          </h3>
          <div className="space-y-2.5">
            {[...data]
              .sort((a, b) => b.totalCertificates - a.totalCertificates)
              .slice(0, 10)
              .map((c, i) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs text-gray-400 flex-shrink-0">
                    {i + 1}
                  </span>
                  <span
                    className="w-48 text-xs text-gray-700 truncate flex-shrink-0"
                    title={c.nombre}
                  >
                    {c.nombre}
                  </span>
                  <div className="flex-1">
                    <HorizontalBar value={c.totalCertificates} max={maxCerts} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Detalle por Curso
          </h3>
          <input
            type="text"
            placeholder="Buscar curso..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-sky-300 w-48"
          />
        </div>

        {sorted.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            {search
              ? "Sin resultados para la búsqueda"
              : "Sin datos para el período seleccionado"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-5 py-3 text-left">
                    <SortButton
                      field="nombre"
                      current={sortField}
                      dir={sortDir}
                      onSort={handleSort}
                    >
                      Curso
                    </SortButton>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton
                      field="totalCertificates"
                      current={sortField}
                      dir={sortDir}
                      onSort={handleSort}
                    >
                      Certs.
                    </SortButton>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton
                      field="avgScore"
                      current={sortField}
                      dir={sortDir}
                      onSort={handleSort}
                    >
                      Prom.
                    </SortButton>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton
                      field="totalHours"
                      current={sortField}
                      dir={sortDir}
                      onSort={handleSort}
                    >
                      Horas
                    </SortButton>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                      Facilitadores
                    </span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton
                      field="lastActivity"
                      current={sortField}
                      dir={sortDir}
                      onSort={handleSort}
                    >
                      Última act.
                    </SortButton>
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((course) => (
                  <>
                    <tr
                      key={course.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-800">
                            {course.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-semibold text-sky-700">
                          {course.totalCertificates}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {course.avgScore > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                            <Star className="w-3 h-3" />
                            {course.avgScore}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-xs text-gray-600">
                          {course.totalHours > 0
                            ? `${course.totalHours.toLocaleString("es-VE")} h`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                          <Users className="w-3 h-3 text-gray-400" />
                          {course.facilitadoresCount}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-xs text-gray-500">
                          {formatDate(course.lastActivity)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {course.facilitadoresCount > 0 && (
                          <button
                            onClick={() =>
                              setExpandedId(
                                expandedId === course.id ? null : course.id,
                              )
                            }
                            className="text-xs text-sky-600 hover:text-sky-800 font-medium"
                          >
                            {expandedId === course.id ? "Ocultar" : "Detalles"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === course.id && (
                      <tr key={`${course.id}-detail`} className="bg-gray-50/40">
                        <td colSpan={7} className="px-5 py-3">
                          <p className="text-xs font-semibold text-gray-600 mb-2">
                            Facilitadores que han impartido este curso:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {course.facilitadores.map((f) => (
                              <div
                                key={f.id}
                                className="flex flex-col items-center gap-1.5 bg-white border border-sky-100 rounded-lg px-3 py-1.5"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span className="text-xs text-gray-700">
                                  {f.nombre}
                                </span>
                                <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-medium">
                                  {f.certs} cert.
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
