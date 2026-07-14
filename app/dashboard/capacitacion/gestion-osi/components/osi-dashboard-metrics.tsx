"use client";

import { OSIManagement, OSIStatus } from "@/types";
import { FileText, Clock, Building2, TrendingUp, CheckCircle2 } from "lucide-react";

interface OSIDashboardMetricsProps {
  osis: OSIManagement[];
  statuses: OSIStatus[];
  loading?: boolean;
}

export default function OSIDashboardMetrics({
  osis,
  statuses,
  loading = false,
}: OSIDashboardMetricsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const totalOSIs = osis.length;
  const totalHours = osis.reduce((sum, osi) => sum + (osi.horas_academicas_ejecucion || 0), 0);
  const totalSesiones = osis.reduce((sum, osi) => sum + (osi.sesiones_ejecucion || 0), 0);
  const uniqueCompanies = new Set(osis.map((osi) => osi.id_empresa)).size;

  // Get the most common status
  const statusCounts = osis.reduce((acc, osi) => {
    acc[osi.status_name || "Desconocido"] = (acc[osi.status_name || "Desconocido"] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommonStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0];
  const mostCommonStatusColor = statuses.find((s) => s.nombre_estado === mostCommonStatus?.[0])?.color_hex || "#6B7280";

  const metrics = [
    {
      label: "Total OSIs",
      value: totalOSIs,
      icon: FileText,
      color: "blue",
      description: "Órdenes de Servicio registradas",
    },
    {
      label: "Horas Totales",
      value: totalHours,
      icon: Clock,
      color: "green",
      description: "Horas académicas programadas",
    },
    {
      label: "Empresas",
      value: uniqueCompanies,
      icon: Building2,
      color: "purple",
      description: "Clientes únicos atendidos",
    },
    {
      label: "Estado Principal",
      value: mostCommonStatus?.[1] || 0,
      icon: CheckCircle2,
      color: "orange",
      description: mostCommonStatus?.[0] || "Sin datos",
      customColor: mostCommonStatusColor,
    },
  ];

  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      icon: "text-blue-600",
      border: "border-blue-200",
    },
    green: {
      bg: "bg-green-50",
      icon: "text-green-600",
      border: "border-green-200",
    },
    purple: {
      bg: "bg-purple-50",
      icon: "text-purple-600",
      border: "border-purple-200",
    },
    orange: {
      bg: "bg-orange-50",
      icon: "text-orange-600",
      border: "border-orange-200",
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric) => {
        const colors = metric.customColor
          ? {
              bg: "bg-gray-50",
              icon: "",
              border: "border-gray-200",
            }
          : colorClasses[metric.color as keyof typeof colorClasses];

        const Icon = metric.icon;

        return (
          <div
            key={metric.label}
            className={`bg-white rounded-lg border ${colors.border} p-6 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{metric.label}</p>
                <p className="text-3xl font-bold text-gray-900 mb-1">{metric.value}</p>
                <p className="text-xs text-gray-500">{metric.description}</p>
              </div>
              <div
                className={`p-3 rounded-lg ${colors.bg} ${
                  metric.customColor ? "" : colors.icon
                }`}
                style={
                  metric.customColor
                    ? { backgroundColor: `${metric.customColor}15` }
                    : {}
                }
              >
                <Icon
                  className="w-6 h-6"
                  style={
                    metric.customColor ? { color: metric.customColor } : {}
                  }
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
