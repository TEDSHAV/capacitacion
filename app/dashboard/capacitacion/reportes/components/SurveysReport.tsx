"use client";

import React, { useState, useEffect } from "react";
import { 
  ClipboardList, 
  Search, 
  Building2, 
  MapPin, 
  Calendar,
  ChevronRight,
  Star,
  Download
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

export default function SurveysReport({ 
  dateFrom, 
  dateTo, 
  selectedState 
}: SurveysReportProps) {
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<SurveySummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredSummaries = summaries.filter(s => 
    s.nro_osi.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nombre_empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.servicio.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      {/* Search and Summary */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por OSI, empresa o curso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>
        <div className="flex gap-4">
          <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
            <div className="bg-sky-100 p-2 rounded-lg">
              <ClipboardList className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OSIs Evaluadas</p>
              <p className="text-xl font-bold text-gray-900">{summaries.length}</p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Promedio Global</p>
              <p className="text-xl font-bold text-gray-900">
                {summaries.length > 0 
                  ? (summaries.reduce((acc, s) => acc + (s.avg_score * s.survey_count), 0) / summaries.reduce((acc, s) => acc + s.survey_count, 0)).toFixed(1)
                  : "0.0"
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Export button */}
      {summaries.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => exportSurveysReport(filteredSummaries)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
      )}

      {/* Rich Analytics Section */}
      {summaries.length > 0 && (
        <div className="space-y-6">
          {/* Question Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Análisis por Pregunta</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(qNum => {
                const qKey = `q${qNum}`;
                const avgScore = summaries.reduce((acc, s) => acc + (s.question_averages[qKey] || 0) * s.survey_count, 0) / 
                              summaries.reduce((acc, s) => acc + s.survey_count, 0);
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
                        const count = summaries.reduce((acc, s) => acc + (s.question_distributions[qKey]?.[score] || 0), 0);
                        const total = summaries.reduce((acc, s) => acc + s.survey_count, 0);
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        
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
              {Object.entries(
                summaries.reduce((acc, s) => {
                  Object.entries(s.attendance_reasons).forEach(([reason, count]) => {
                    acc[reason] = (acc[reason] || 0) + count;
                  });
                  return acc;
                }, {} as { [reason: string]: number })
              )
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([reason, count]) => {
                  const total = Object.values(
                    summaries.reduce((acc, s) => {
                      Object.entries(s.attendance_reasons).forEach(([r, c]) => {
                        acc[r] = (acc[r] || 0) + c;
                      });
                      return acc;
                    }, {} as { [reason: string]: number })
                  ).reduce((sum, c) => sum + c, 0);
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  
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
                })}
            </div>
          </div>
        </div>
      )}

      {/* Grid of OSIs with Surveys */}
      {filteredSummaries.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed rounded-3xl">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No se encontraron encuestas</h3>
          <p className="text-gray-500">Intente ajustar los filtros o los términos de búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSummaries.map((summary) => (
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
      )}
    </div>
  );
}
