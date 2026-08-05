"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ClipboardList,
  Building2,
  MapPin,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Star,
  Download,
  Filter,
  X,
  Search,
} from "lucide-react";
import { getSurveysReport } from "@/app/actions/reportes";
import { exportSurveysReport } from "@/lib/csv-export";
import Link from "next/link";

// Type for the survey data returned from server action
interface SurveySummary {
  id_osi: number;
  nro_osi: string;
  nombre_empresa: string;
  servicio: string;
  direccion_ejecucion: string;
  fecha_inicio_real: string;
  survey_count: number;
  avg_score: number;
  // New fields for richer analytics
  question_averages: { [key: string]: number };
  question_distributions: { [key: string]: { [score: number]: number } };
  attendance_reasons: { [reason: string]: number };
  participant_count?: number;
  response_rate?: number;
}

interface SurveysReportProps {
  dateFrom?: string;
  dateTo?: string;
  selectedState?: string;
}

const GROUPS_PER_PAGE = 6;

export default function SurveysReport({
  dateFrom,
  dateTo,
  selectedState
}: SurveysReportProps) {
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<SurveySummary[]>([]);
  const [filterOsi, setFilterOsi] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState("");
  const [filterCurso, setFilterCurso] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function fetchSurveyData() {
      setLoading(true);

      try {
        const result = await getSurveysReport(dateFrom, dateTo, selectedState);

        if (result.error) {
          console.error("Error fetching survey report data:", result.error);
          setSummaries([]);
        } else {
          setSummaries(result.data);
        }
      } catch (err) {
        console.error("Error fetching survey report data:", err);
        setSummaries([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSurveyData();
  }, [dateFrom, dateTo, selectedState]);

  // Reset to first page whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterOsi, filterEmpresa, filterCurso]);

  // Unique filter options derived from the loaded summaries
  const uniqueEmpresas = useMemo(
    () => Array.from(new Set(summaries.map(s => s.nombre_empresa).filter(Boolean))).sort(),
    [summaries]
  );
  const uniqueCursos = useMemo(
    () => Array.from(new Set(summaries.map(s => s.servicio).filter(Boolean))).sort(),
    [summaries]
  );

  const filteredSummaries = summaries.filter(s =>
    (!filterOsi || s.nro_osi === filterOsi) &&
    (!filterEmpresa || s.nombre_empresa === filterEmpresa) &&
    (!filterCurso || s.servicio === filterCurso)
  );

  // Group filtered summaries by nro_osi so OSIs sharing the same number
  // appear visually together. Preserve overall recency sort (most recent first).
  const groupedByNroOsi = useMemo(() => {
    const map = new Map<string, SurveySummary[]>();
    for (const s of filteredSummaries) {
      const key = s.nro_osi || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    // Sort each group's OSIs by most recent fecha_inicio_real
    map.forEach(list => list.sort(
      (a, b) => new Date(b.fecha_inicio_real).getTime() - new Date(a.fecha_inicio_real).getTime()
    ));
    // Sort groups by the most recent OSI inside each group
    return Array.from(map.entries()).sort(([, aList], [, bList]) =>
      new Date(bList[0].fecha_inicio_real).getTime() - new Date(aList[0].fecha_inicio_real).getTime()
    );
  }, [filteredSummaries]);

  // Pagination over OSI groups
  const totalGroups = groupedByNroOsi.length;
  const totalPages = Math.max(1, Math.ceil(totalGroups / GROUPS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * GROUPS_PER_PAGE;
  const pageEnd = Math.min(pageStart + GROUPS_PER_PAGE, totalGroups);
  const pagedGroups = groupedByNroOsi.slice(pageStart, pageEnd);

  const hasActiveFilters = !!(filterOsi || filterEmpresa || filterCurso);

  const clearFilters = () => {
    setFilterOsi("");
    setFilterEmpresa("");
    setFilterCurso("");
  };

  // Summary stats computed from the filtered set
  const totalResponses = filteredSummaries.reduce((acc, s) => acc + s.survey_count, 0);
  const globalAvg = totalResponses > 0
    ? filteredSummaries.reduce((acc, s) => acc + s.avg_score * s.survey_count, 0) / totalResponses
    : 0;

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-green-600";
    if (score >= 3.5) return "text-blue-600";
    if (score >= 2.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getQuestionText = (qNum: number) => {
    const questions = {
      1: "¿Fue responsable y puntual?",
      2: "¿Proyectó una imagen adecuada?",
      3: "¿Domina el tema?",
      4: "¿El lenguaje utilizado fue fácil de entender?",
      5: "¿Estímula la participación e intercambio de ideas?",
      6: "¿El material didáctico utilizado fue fácil de entender?",
      7: "¿Las dinámicas, ejercicios, demostraciones y demás actividades hechas en el curso, fueron comprensibles y útiles?",
      8: "¿El contenido del curso cumplió sus expectativas?",
      9: "¿Cómo calificarías el curso?",
      10: "¿Las condiciones ambientales (aula, mobiliario, recursos didácticos (si aplica) han sido adecuados?"
    };
    return questions[qNum as keyof typeof questions] || `Pregunta ${qNum}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
        <p className="mt-4 text-gray-500 font-medium">Cargando datos de encuestas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stat cards (computed from filtered set) */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
          <div className="bg-sky-100 p-2 rounded-lg">
            <ClipboardList className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OSIs Evaluadas</p>
            <p className="text-xl font-bold text-gray-900">{filteredSummaries.length}</p>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
          <div className="bg-sky-100 p-2 rounded-lg">
            <ClipboardList className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Respuestas</p>
            <p className="text-xl font-bold text-gray-900">{totalResponses}</p>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
          <div className="bg-yellow-100 p-2 rounded-lg">
            <Star className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Promedio Global</p>
            <p className="text-xl font-bold text-gray-900">{globalAvg.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Filter bar + Export */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros</span>
          </div>
          {/* OSI filter */}
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-sm text-gray-600">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] font-bold text-gray-400 uppercase">OSI</span>
            <input
              type="text"
              inputMode="numeric"
              value={filterOsi}
              onChange={(e) => setFilterOsi(e.target.value.trim())}
              placeholder="Buscar..."
              className="text-xs text-gray-700 bg-transparent outline-none w-[140px] placeholder:text-gray-300"
            />
          </div>
          {/* Empresa filter */}
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-sm text-gray-600">
            <Building2 className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={filterEmpresa}
              onChange={(e) => setFilterEmpresa(e.target.value)}
              className="text-xs text-gray-700 bg-transparent outline-none max-w-[180px]"
            >
              <option value="">Todas</option>
              {uniqueEmpresas.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          {/* Curso filter */}
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-sm text-gray-600">
            <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={filterCurso}
              onChange={(e) => setFilterCurso(e.target.value)}
              className="text-xs text-gray-700 bg-transparent outline-none max-w-[200px]"
            >
              <option value="">Todos</option>
              {uniqueCursos.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>

        {filteredSummaries.length > 0 && (
          <button
            onClick={() => exportSurveysReport(filteredSummaries)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors self-start md:self-auto"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
        )}
      </div>

      {/* OSI grouped section (paginated) */}
      {filteredSummaries.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed rounded-3xl">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No se encontraron encuestas</h3>
          <p className="text-gray-500">Intente ajustar los filtros.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pagedGroups.map(([nroOsi, groupSummaries]) => {
            const groupResponses = groupSummaries.reduce((acc, s) => acc + s.survey_count, 0);
            const weightedAvg = groupResponses > 0
              ? groupSummaries.reduce((acc, s) => acc + s.avg_score * s.survey_count, 0) / groupResponses
              : 0;
            const empresaLabel = groupSummaries[0]?.nombre_empresa || "—";

            return (
              <div key={nroOsi} className="space-y-3">
                {/* Group header */}
                <div className="flex flex-wrap items-center gap-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
                  <div className="bg-sky-600 text-white text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
                    OSI {nroOsi}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="truncate font-medium">{empresaLabel}</span>
                  </div>
                  <div className="ml-auto flex items-center gap-4">
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-sky-100">
                      <ClipboardList className="w-3.5 h-3.5 text-sky-600" />
                      <span className="text-xs font-bold text-gray-700">
                        {groupSummaries.length} curso{groupSummaries.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-sky-100">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Respuestas</span>
                      <span className="text-xs font-black text-gray-900">{groupResponses}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-yellow-50 px-2.5 py-1 rounded-lg border border-yellow-100">
                      <Star className="w-3.5 h-3.5 text-yellow-600 fill-yellow-600" />
                      <span className={`text-xs font-black ${getScoreColor(weightedAvg)}`}>
                        {weightedAvg.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cards within the group */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {groupSummaries.map((summary) => (
                    <Link
                      key={summary.id_osi}
                      href={`/dashboard/capacitacion/gestion-osi/${summary.id_osi}/survey-view`}
                      className="group bg-white border border-gray-200 rounded-2xl p-5 hover:border-sky-500 hover:shadow-lg transition-all flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-xs font-black text-sky-600 uppercase tracking-widest">OSI {summary.nro_osi}</span>
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-sky-700 transition-colors leading-tight mt-1">
                            {summary.servicio}
                          </h3>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                            <Star className="w-3.5 h-3.5 text-yellow-600 fill-yellow-600" />
                            <span className={`text-sm font-black ${getScoreColor(summary.avg_score)}`}>
                              {summary.avg_score.toFixed(1)}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                            {summary.survey_count} respuestas
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 mt-auto">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{summary.nombre_empresa}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{summary.direccion_ejecucion || "No especificada"}</span>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span suppressHydrationWarning>
                              {new Date(summary.fecha_inicio_real).toISOString().split('T')[0]}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-sky-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Ver Detalles <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3">
              <p className="text-sm text-gray-600">
                Mostrando {pageStart + 1}–{pageEnd} de {totalGroups} OSIs
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-gray-700 px-2">
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rich Analytics Section (aggregated across all filtered OSIs) */}
      {filteredSummaries.length > 0 && (
        <div className="space-y-6">
          <p className="text-xs text-gray-500 italic">
            Análisis basado en {filteredSummaries.length} OSI{filteredSummaries.length > 1 ? "s" : ""} filtrada{filteredSummaries.length > 1 ? "s" : ""} ({totalResponses} respuestas).
          </p>

          {/* Question Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Análisis por Pregunta</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(qNum => {
                const qKey = `q${qNum}`;
                const avgScore = totalResponses > 0
                  ? filteredSummaries.reduce((acc, s) => acc + (s.question_averages[qKey] || 0) * s.survey_count, 0) / totalResponses
                  : 0;
                const scoreColor = getScoreColor(avgScore);

                return (
                  <div key={qKey} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">{getQuestionText(qNum)}</span>
                      <span className={`text-sm font-bold ${scoreColor}`}>
                        {avgScore.toFixed(1)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {[5, 4, 3, 2, 1].map(score => {
                        const count = filteredSummaries.reduce((acc, s) => acc + (s.question_distributions[qKey]?.[score] || 0), 0);
                        const pct = totalResponses > 0 ? (count / totalResponses) * 100 : 0;

                        return (
                          <div key={score} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-3">{score}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  score >= 4 ? 'bg-green-500' : score >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attendance Reasons */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Razones de Asistencia</h3>
            <div className="space-y-2">
              {(() => {
                const reasonsAgg = filteredSummaries.reduce((acc, s) => {
                  Object.entries(s.attendance_reasons).forEach(([reason, count]) => {
                    acc[reason] = (acc[reason] || 0) + count;
                  });
                  return acc;
                }, {} as { [reason: string]: number });
                const reasonsTotal = Object.values(reasonsAgg).reduce((sum, c) => sum + c, 0);

                return Object.entries(reasonsAgg)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([reason, count]) => {
                    const pct = reasonsTotal > 0 ? (count / reasonsTotal) * 100 : 0;

                    return (
                      <div key={reason} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 min-w-0 flex-1 truncate">{reason}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-24 bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-sky-500 h-2 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
