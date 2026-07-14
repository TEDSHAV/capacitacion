"use client";

import { useState, useEffect } from "react";
import { getFacilitatorHoursStatsAction } from "@/app/actions/reportes-stats";
import { FacilitadorHoursStatsProps, CertificateInfo, FacilitadorHoursStat } from "@/types";
import { Button } from "@/components/ui/button";

export default function FacilitadorHoursStats({ selectedState }: FacilitadorHoursStatsProps) {
  const [facilitadorStats, setFacilitadorStats] = useState<FacilitadorHoursStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFacilitador, setExpandedFacilitador] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedState]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getFacilitatorHoursStatsAction(selectedState);
      
      if (result.error) {
        setError(result.error);
      } else {
        setFacilitadorStats(result.data || []);
      }
    } catch (err) {
      console.error('Error loading facilitator hours stats:', err);
      setError(`Error al cargar datos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
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

  const totalHours = facilitadorStats.reduce((sum, stat) => sum + stat.totalCombinedHours, 0);
  const totalCourses = facilitadorStats.reduce((sum, stat) => sum + stat.totalCertificates, 0);
  const activeFacilitadores = facilitadorStats.filter(f => f.is_active);
  const topPerformers = facilitadorStats.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Total Horas</h3>
          <p className="text-3xl font-bold text-indigo-600">{totalHours.toFixed(1)}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Total Cursos</h3>
          <p className="text-3xl font-bold text-green-600">{totalCourses}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Facilitadores Activos</h3>
          <p className="text-3xl font-bold text-blue-600">{activeFacilitadores.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Promedio Horas/Facilitador</h3>
          <p className="text-3xl font-bold text-purple-600">
            {facilitadorStats.length > 0 ? (totalHours / facilitadorStats.length).toFixed(1) : "0"}
          </p>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top 5 Facilitadores por Horas</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {topPerformers.map((facilitador, index) => (
              <div key={facilitador.facilitatorId} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 text-sm font-medium">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {facilitador.nombre_apellido}
                    </p>
                    <p className="text-sm text-gray-500">
                      {facilitador.estado_nombre} • {facilitador.totalCertificates} cursos
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {facilitador.totalCombinedHours.toFixed(1)} horas
                  </p>
                  <p className="text-xs text-gray-500">
                    {facilitador.totalHours.toFixed(1)} + {facilitador.osiHours.toFixed(1)} OSI
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Detalle de Horas por Facilitador {selectedState && "(Filtrado)"}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Facilitador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cursos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horas Cursos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horas OSI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Horas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {facilitadorStats.map((facilitador) => (
                <tr key={facilitador.facilitatorId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {facilitador.nombre_apellido}
                      </p>
                      <p className="text-xs text-gray-500">
                        {facilitador.estatus_nombre}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {facilitador.estado_nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {facilitador.totalCertificates}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {facilitador.totalHours.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {facilitador.osiHours.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-indigo-600">
                      {facilitador.totalCombinedHours.toFixed(1)}
                    </span>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedFacilitador(
                        expandedFacilitador === facilitador.facilitatorId 
                          ? null 
                          : facilitador.facilitatorId
                      )}
                    >
                      {expandedFacilitador === facilitador.facilitatorId ? "Ocultar" : "Ver"} detalles
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Expanded Details */}
        {expandedFacilitador && (
          <div className="border-t border-gray-200">
            {facilitadorStats
              .filter(f => f.facilitatorId === expandedFacilitador)
              .map((facilitador) => (
                <div key={facilitador.facilitatorId} className="px-6 py-4 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Certificados de {facilitador.nombre_apellido}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {facilitador.certificates.map((cert, index) => (
                      <div key={index} className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-sm font-medium text-gray-900">
                          OSI #{cert.nro_osi}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {cert.course_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {cert.hours} horas
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
