"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Download,
  Loader2,
} from "lucide-react";
import { getCarnetsMetrics } from "@/app/actions/reportes";
import { CarnetsMetrics } from "@/types";
import { exportCarnetsReport } from "@/lib/csv-export";

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

export default function CarnetsReport({ dateFrom, dateTo, selectedState }: Props) {
  const [data, setData] = useState<CarnetsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getCarnetsMetrics(dateFrom, dateTo)
      .then((res) => {
        if (res.error) setError(res.error);
        else setData(res.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  const handleExport = () => {
    if (!data) return;

    const exportData = [
      {
        "Métrica": "Total Carnets",
        "Valor": data.totalCarnets,
        "Descripción": "Total de carnets generados",
      },
      {
        "Métrica": "Carnets Activos",
        "Valor": data.activeCarnets,
        "Descripción": "Carnets actualmente activos",
      },
      {
        "Métrica": "Por Vencer (30 días)",
        "Valor": data.expiringSoon,
        "Descripción": "Carnets que vencerán en los próximos 30 días",
      },
      {
        "Métrica": "Vencidos",
        "Valor": data.expired,
        "Descripción": "Carnets ya vencidos",
      },
      {
        "Métrica": "Generados Este Mes",
        "Valor": data.monthlyGeneration[data.monthlyGeneration.length - 1]?.count || 0,
        "Descripción": "Carnets generados en el mes actual",
      },
    ];

    exportCarnetsReport(exportData);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  // Filter template usage based on search
  const filteredTemplates = data.templateUsage.filter(template =>
    template.templateName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Métricas de Carnets</h2>
          <p className="text-sm text-gray-500 mt-1">
            Análisis completo de tarjetas de identificación
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar Excel
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {data.totalCarnets.toLocaleString("es-VE")}
              </p>
              <p className="text-xs text-gray-500">Total Carnets</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <span className="text-green-600 font-medium">{data.activeCarnets}</span> activos
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.expiringSoon}</p>
              <p className="text-xs text-gray-500">Por Vencer</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">Próximos 30 días</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.expired}</p>
              <p className="text-xs text-gray-500">Vencidos</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">Carnets expirados</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {data.monthlyGeneration[data.monthlyGeneration.length - 1]?.count || 0}
              </p>
              <p className="text-xs text-gray-500">Este Mes</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">Generados en el mes actual</div>
        </div>
      </div>

      {/* Monthly Generation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Generación Mensual</h3>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {data.monthlyGeneration.slice().reverse().map((month) => (
            <div key={`${month.year}-${month.month}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{month.month} {month.year}</p>
                <p className="text-sm text-gray-500">{month.activeCount} activos</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{month.count}</p>
                <p className="text-xs text-gray-500">generados</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
