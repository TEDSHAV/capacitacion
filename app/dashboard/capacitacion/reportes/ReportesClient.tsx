"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { ReportesClientProps, State } from "@/types";
import FacilitadorStateStats from "./components/FacilitadorStateStats";
import FacilitadorHoursStats from "./components/FacilitadorHoursStats";

export default function ReportesClient({ user, states }: ReportesClientProps) {
  const [selectedState, setSelectedState] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"states" | "hours">("states");

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Reportes de Capacitación
        </h1>
        <p className="mt-2 text-gray-600">
          Estadísticas y análisis de facilitadores
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("states")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "states"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Facilitadores por Estado
          </button>
          <button
            onClick={() => setActiveTab("hours")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "hours"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Horas de Capacitación
          </button>
        </nav>
      </div>

      {/* State Filter (for both tabs) */}
      <div className="mb-6">
        <label htmlFor="state-filter" className="block text-sm font-medium text-gray-700 mb-2">
          Filtrar por Estado:
        </label>
        <select
          id="state-filter"
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="block w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">Todos los estados</option>
          {states.map((state) => (
            <option key={state.id} value={state.id.toString()}>
              {state.nombre_estado}
            </option>
          ))}
        </select>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "states" && (
          <FacilitadorStateStats selectedState={selectedState} />
        )}
        {activeTab === "hours" && (
          <FacilitadorHoursStats selectedState={selectedState} />
        )}
      </div>
    </div>
  );
}
