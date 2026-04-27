"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FacilitadorCrud, FacilitatorForm } from "./components";
import { getFacilitatorMetrics } from "@/app/actions/participants";
import { Users, MapPin, BookOpen, Star } from "lucide-react";

export default function GestionDeFacilitadoresPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const createMode = searchParams.get("create");
  const [showForm, setShowForm] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);

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
      const data = await getFacilitatorMetrics();
      setMetrics(data);
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
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Total Facilitadores</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.total_facilitators || 0}
              </p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Estado Principal</p>
              <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
                {metrics.top_states?.[0]?.name || "N/A"}
              </p>
              <p className="text-xs text-gray-400">
                {metrics.top_states?.[0]?.count || 0} facilitadores
              </p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-500">Tema Popular</p>
              <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
                {metrics.top_themes?.[0]?.name || "N/A"}
              </p>
              <p className="text-xs text-gray-400">
                En {metrics.top_themes?.[0]?.count || 0} perfiles
              </p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
            <Star className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-500">Estatus</p>
              <p className="text-sm font-bold text-gray-900">
                {metrics.active_facilitators || 0} Activos
              </p>
              <p className="text-xs text-gray-400">
                de {metrics.total_facilitators || 0} en total
              </p>
            </div>
          </div>
        </div>
      )}

      <FacilitadorCrud />
    </div>
  );
}
