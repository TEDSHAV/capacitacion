"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FacilitadorCrud, FacilitatorForm } from "./components";
import { getAnalyticsMetrics } from "@/app/actions/participants";
import { Users, Award, Clock, TrendingUp } from "lucide-react";

export default function GestionDeFacilitadoresPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const createMode = searchParams.get("create");
  const [showForm, setShowForm] = useState(false);
  const [analyticsMetrics, setAnalyticsMetrics] = useState<any>(null);

  useEffect(() => {
    // Show form if in create or edit mode
    if (createMode || editId) {
      setShowForm(true);
    } else {
      setShowForm(false);
    }
  }, [createMode, editId]);

  useEffect(() => {
    async function loadMetrics() {
      const data = await getAnalyticsMetrics();
      setAnalyticsMetrics(data);
    }
    loadMetrics();
  }, []);

  const handleFacilitadorSaved = () => {
    // Just hide the form, no navigation needed
    setShowForm(false);
  };

  const handleCancel = () => {
    // Just hide the form, no navigation needed
    setShowForm(false);
  };

  if (showForm) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Facilitadores
          </h1>
          <p className="mt-2 text-gray-600">
            Administra la información de los facilitadores de capacitación
            {editId && (
              <span className="ml-2 text-sm text-blue-600">
                (Modo edición activo para ID: {editId})
              </span>
            )}
            {createMode && (
              <span className="ml-2 text-sm text-green-600">
                (Modo creación activo)
              </span>
            )}
          </p>
        </div>

        <FacilitatorForm
          onFacilitatorSaved={handleFacilitadorSaved}
          onCancel={handleCancel}
          editId={editId}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Gestión de Facilitadores
        </h1>
        <p className="mt-2 text-gray-600">
          Administra la información de los facilitadores de capacitación
        </p>
      </div>

      {/* Metrics Row */}
      {analyticsMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Facilitadores Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsMetrics.unique_facilitators_with_certificates || 0}
              </p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
            <Award className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Certificados Emitidos</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsMetrics.total_certificates || 0}
              </p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
            <Clock className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-500">Promedio General</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsMetrics.average_score || 0}
              </p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-500">Este Mes</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsMetrics.certificates_this_month || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Facilitators */}
      {analyticsMetrics?.top_facilitators &&
        analyticsMetrics.top_facilitators.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top Facilitadores por Certificados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analyticsMetrics.top_facilitators
                .slice(0, 3)
                .map((facilitator: any, index: number) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {facilitator.facilitator_name}
                      </h4>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Certificados: {facilitator.certificate_count}</p>
                      <p>Participantes: {facilitator.participant_count}</p>
                      <p>Promedio: {facilitator.avg_score}</p>
                      <p>Horas Totales: {facilitator.total_hours}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

      <FacilitadorCrud />
    </div>
  );
}
