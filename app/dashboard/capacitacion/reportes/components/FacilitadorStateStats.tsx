"use client";

import { useState, useEffect } from "react";
import { getFacilitatorStateStatsAction } from "../../../../actions/reportes-stats";
import { FacilitadorStateStatsProps, StateStat, FacilitadorReport } from "@/types";

export default function FacilitadorStateStats({ selectedState }: FacilitadorStateStatsProps) {
  const [stateStats, setStateStats] = useState<StateStat[]>([]);
  const [facilitadores, setFacilitadores] = useState<FacilitadorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedState]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getFacilitatorStateStatsAction(selectedState);
      
      if (result.error) {
        setError(result.error);
      } else if (result.data && result.data.estadoStats) {
        setStateStats(result.data.estadoStats);
        setFacilitadores(result.data.facilitadores as any[]);
      }
    } catch (err) {
      console.error('Error loading facilitator state stats:', err);
      setError(`Error al cargar datos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to get state name by ID
  const getStateName = (stateId: number | null) => {
    if (!stateId) return "N/A";
    const state = stateStats.find(s => s.id === stateId);
    return state?.nombre_estado || "N/A";
  };

  // Function to get facilitador state name (now using API data)
  const getFacilitadorStateName = (facilitador: FacilitadorReport) => {
    return facilitador.nombre_apellido || "N/A";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  const activeFacilitadores = facilitadores.filter(f => f.is_active);
  const inactiveFacilitadores = facilitadores.filter(f => !f.is_active);

  // Calculate max count for bar width
  const maxCount = stateStats.length > 0 ? Math.max(...stateStats.map(s => s.count)) : 1;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Total Facilitadores</h3>
          <p className="text-3xl font-bold text-indigo-600">{facilitadores.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Activos</h3>
          <p className="text-3xl font-bold text-green-600">{activeFacilitadores.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Inactivos</h3>
          <p className="text-3xl font-bold text-red-600">{inactiveFacilitadores.length}</p>
        </div>
      </div>

      {/* State Distribution */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Distribución por Estado</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {stateStats
              .filter(state => state.count > 0)
              .sort((a, b) => b.count - a.count)
              .map((state) => (
                <div key={state.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {state.nombre_estado}
                      </span>
                      <span className="text-sm text-gray-500">
                        {state.count} facilitadores
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{
                          width: `${(state.count / maxCount) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Facilitadores List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Lista de Facilitadores {selectedState && "(Filtrado)"}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cédula
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estatus
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {facilitadores.map((facilitador: any) => (
                <tr key={facilitador.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {facilitador.nombre_apellido}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {facilitador.cedula || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getStateName(facilitador.id_estado_geografico)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {facilitador.email || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      facilitador.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {facilitador.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
