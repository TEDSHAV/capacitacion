"use client";

import React, { useState, useEffect } from "react";
import { 
  ClipboardList, 
  Search, 
  Building2, 
  MapPin, 
  Calendar,
  ChevronRight,
  Star
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

interface SurveysReportProps {
  dateFrom?: string;
  dateTo?: string;
  selectedState?: string;
}

interface SurveySummary {
  id_osi: number;
  nro_osi: string;
  nombre_empresa: string;
  servicio: string;
  direccion_ejecucion: string;
  fecha_inicio_real: string;
  survey_count: number;
  avg_score: number;
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
      const supabase = createClient();

      try {
        // 1. Fetch all surveys first
        const { data: surveyData, error: surveyError } = await supabase
          .from("course_satisfaction_surveys")
          .select("id_osi, q9");

        if (surveyError) throw surveyError;

        if (!surveyData || surveyData.length === 0) {
          setSummaries([]);
          return;
        }

        // 2. Get unique OSI IDs
        const uniqueOsiIds = Array.from(new Set(surveyData.map(s => s.id_osi)));

        // 3. Fetch OSI details for these IDs
        let osiQuery = supabase
          .from("v_osi_formato_completo")
          .select(`
            id_osi,
            nro_osi,
            nombre_empresa,
            servicio,
            direccion_ejecucion,
            fecha_inicio_real,
            id_estado_direccion_ejecucion_efectiva
          `)
          .in("id_osi", uniqueOsiIds);

        if (dateFrom) osiQuery = osiQuery.gte("fecha_inicio_real", dateFrom);
        if (dateTo) osiQuery = osiQuery.lte("fecha_inicio_real", dateTo);
        if (selectedState) osiQuery = osiQuery.eq("id_estado_direccion_ejecucion_efectiva", selectedState);

        const { data: osiData, error: osiError } = await osiQuery;

        if (osiError) throw osiError;

        // 4. Group surveys by OSI
        const osiMap = new Map();
        osiData?.forEach(osi => {
          osiMap.set(osi.id_osi, {
            ...osi,
            total_score: 0,
            survey_count: 0
          });
        });

        surveyData.forEach(survey => {
          const osiEntry = osiMap.get(survey.id_osi);
          if (osiEntry) {
            osiEntry.total_score += survey.q9;
            osiEntry.survey_count += 1;
          }
        });

        // 5. Final transformation
        const summariesData: SurveySummary[] = Array.from(osiMap.values())
          .filter(osi => osi.survey_count > 0)
          .map(g => ({
            id_osi: g.id_osi,
            nro_osi: g.nro_osi,
            nombre_empresa: g.nombre_empresa,
            servicio: g.servicio,
            direccion_ejecucion: g.direccion_ejecucion,
            fecha_inicio_real: g.fecha_inicio_real,
            survey_count: g.survey_count,
            avg_score: g.total_score / g.survey_count,
          }));

        // Sort by most recent
        summariesData.sort((a, b) => 
          new Date(b.fecha_inicio_real).getTime() - new Date(a.fecha_inicio_real).getTime()
        );

        setSummaries(summariesData);
      } catch (err) {
        console.error("Error fetching survey report data:", err);
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
                  ? (summaries.reduce((acc, s) => acc + s.avg_score, 0) / summaries.length).toFixed(1)
                  : "0.0"
                }
              </p>
            </div>
          </div>
        </div>
      </div>

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
