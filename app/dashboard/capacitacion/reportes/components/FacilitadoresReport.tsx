"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  MapPin,
  Star,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Hash,
} from "lucide-react";
import { getFacilitadoresReport } from "@/app/actions/reportes";
import { FacilitadoresReportData } from "@/types";

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

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const PALETTE = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-amber-500",
  "bg-rose-400",
  "bg-pink-500",
  "bg-orange-400",
  "bg-cyan-500",
];

export default function FacilitadoresReport({
  dateFrom,
  dateTo,
  selectedState,
}: Props) {
  const [reportData, setReportData] = useState<FacilitadoresReportData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  useEffect(() => {
    setLoading(true);
    setError(null);
    getFacilitadoresReport(dateFrom, dateTo, selectedState || undefined)
      .then((res) => {
        if (res.error) setError(res.error);
        else setReportData(res.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, selectedState]);

  const filtered = useMemo(() => {
    if (!reportData) return [];
    let list = [...reportData.facilitadores];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.nombre_apellido.toLowerCase().includes(q) ||
          (f.cedula && f.cedula.includes(q)) ||
          f.estado_nombre.toLowerCase().includes(q),
      );
    }
    if (statusFilter === "active") list = list.filter((f) => f.is_active);
    if (statusFilter === "inactive") list = list.filter((f) => !f.is_active);
    return list;
  }, [reportData, search, statusFilter]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-72 rounded-xl col-span-2" />
          <Skeleton className="h-72 rounded-xl" />
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

  if (!reportData) return null;

  const { facilitadores, stateStats } = reportData;
  const totalCerts = facilitadores.reduce((s, f) => s + f.totalCerts, 0);
  const totalHours = facilitadores.reduce((s, f) => s + f.totalHours, 0);
  const avgHours =
    facilitadores.length > 0
      ? (totalHours / facilitadores.length).toFixed(1)
      : "0";
  const activeCount = facilitadores.filter((f) => f.is_active).length;
  const maxCerts = Math.max(...facilitadores.map((f) => f.totalCerts), 1);
  const maxStateCount = Math.max(...stateStats.map((s) => s.count), 1);

  return (
    <div className="space-y-4">
      {/* KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Con actividad</p>
          <p className="text-2xl font-bold text-gray-900">
            {facilitadores.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">{activeCount} activos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Certificados emitidos</p>
          <p className="text-2xl font-bold text-sky-600">
            {totalCerts.toLocaleString("es-VE")}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Horas impartidas</p>
          <p className="text-2xl font-bold text-orange-500">
            {totalHours.toLocaleString("es-VE")}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Prom. horas/facilitador</p>
          <p className="text-2xl font-bold text-amber-600">{avgHours}</p>
        </div>
      </div>

      {/* Ranking + state distribution side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top facilitadores ranking */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Ranking por certificados emitidos
          </h3>
          {facilitadores.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              Sin datos para el período
            </p>
          ) : (
            <div className="space-y-3">
              {[...facilitadores]
                .sort((a, b) => b.totalCerts - a.totalCerts)
                .slice(0, 8)
                .map((f, i) => (
                  <div key={f.id} className="flex items-center gap-3">
                    <span className="w-5 flex-shrink-0 text-right text-xs font-bold text-gray-400">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-medium text-gray-800 truncate">
                            {f.nombre_apellido}
                          </span>
                          {!f.is_active && (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                          <span className="text-[10px] text-gray-500">
                            {f.estado_nombre}
                          </span>
                          <span className="text-xs font-semibold text-sky-700">
                            {f.totalCerts} cert.
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              f.is_active ? "bg-sky-400" : "bg-gray-400"
                            }`}
                            style={{
                              width: `${(f.totalCerts / maxCerts) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 w-16 text-right flex-shrink-0">
                          {f.totalHours > 0 ? `${f.totalHours}h` : ""}
                          {f.avgScore > 0 ? ` · ★${f.avgScore}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* State distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            Por estado
          </h3>
          {stateStats.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Sin datos</p>
          ) : (
            <div className="space-y-2.5">
              {stateStats.map((s, i) => (
                <div key={s.nombre}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-700 truncate">
                      {s.nombre}
                    </span>
                    <span className="text-xs font-medium text-gray-600 ml-2 flex-shrink-0">
                      {s.count}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${PALETTE[i % PALETTE.length]}`}
                      style={{ width: `${(s.count / maxStateCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-900">
            Listado Completo
          </h3>
          <div className="flex items-center gap-2">
            {(["all", "active", "inactive"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  statusFilter === s
                    ? "bg-sky-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s === "all"
                  ? "Todos"
                  : s === "active"
                    ? "Activos"
                    : "Inactivos"}
              </button>
            ))}
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-sky-300 w-40"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            Sin resultados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Facilitador
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Certs.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Horas
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Cursos
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Prom.
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Estatus
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Última act.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-800">
                        {f.nombre_apellido}
                      </p>
                      {f.cedula && (
                        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <Hash className="w-2.5 h-2.5" />
                          {f.cedula}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">
                        {f.estado_nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-sky-700">
                        {f.totalCerts}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-gray-600">
                        {f.totalHours > 0 ? `${f.totalHours}h` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-gray-600">
                        {f.uniqueCourses}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {f.avgScore > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                          <Star className="w-3 h-3" />
                          {f.avgScore}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {f.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-gray-500">
                        {formatDate(f.lastActivity)}
                      </span>
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
