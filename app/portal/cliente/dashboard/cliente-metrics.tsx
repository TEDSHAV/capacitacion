"use client";

import { Award, IdCard, Users, TrendingUp } from "lucide-react";
import { ClienteMetrics } from "@/types";

interface ClienteMetricsCardsProps {
  metrics: ClienteMetrics;
}

export function ClienteMetricsCards({ metrics }: ClienteMetricsCardsProps) {
  const cards = [
    {
      label: "Total Certificados",
      value: metrics.totalCertificates,
      icon: Award,
      bg: "bg-amber-50",
      text: "text-amber-600",
    },
    {
      label: "Total Carnets",
      value: metrics.totalCarnets,
      icon: IdCard,
      bg: "bg-blue-50",
      text: "text-blue-600",
    },
    {
      label: "Total Participantes",
      value: metrics.totalParticipants,
      icon: Users,
      bg: "bg-emerald-50",
      text: "text-emerald-600",
    },
    {
      label: "Curso más Solicitado",
      value: metrics.courseWithMostParticipants?.courseName || "N/A",
      subValue: metrics.courseWithMostParticipants
        ? `${metrics.courseWithMostParticipants.count} certificados`
        : "",
      icon: TrendingUp,
      bg: "bg-purple-50",
      text: "text-purple-600",
      isText: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4"
          >
            <div className={`p-3 rounded-lg ${card.bg} ${card.text}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p
                className={`font-bold text-gray-900 ${card.isText ? "text-sm truncate" : "text-2xl"}`}
              >
                {card.value}
              </p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {card.label}
              </p>
              {card.subValue && (
                <p className="text-xs text-gray-500 mt-0.5">{card.subValue}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
