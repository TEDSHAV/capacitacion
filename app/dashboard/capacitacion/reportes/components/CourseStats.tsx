"use client";

import { useState, useEffect } from "react";
import { getCourseStatsAction } from "@/app/actions/reportes-stats";
import { CourseStatsProps, CourseStat, CourseFacilitator } from "@/types";
import { Button } from "@/components/ui/button";

export default function CourseStats({ selectedState, selectedCourse }: CourseStatsProps) {
  const [courseStats, setCourseStats] = useState<CourseStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedState, selectedCourse]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getCourseStatsAction(selectedState, selectedCourse);
      
      if (result.error) {
        setError(result.error);
      } else {
        setCourseStats(result.data || []);
      }
    } catch (err) {
      console.error('Error loading course stats:', err);
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

  const totalCourses = courseStats.length;
  const coursesWithFacilitators = courseStats.filter(c => c.facilitadores.length > 0);
  const coursesWithoutFacilitators = courseStats.filter(c => c.facilitadores.length === 0);
  const totalHours = courseStats.reduce((sum, course) => sum + course.totalHours, 0);
  const totalCertificates = courseStats.reduce((sum, course) => sum + course.totalCertificates, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Total Cursos</h3>
          <p className="text-3xl font-bold text-indigo-600">{totalCourses}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Cursos Dictados</h3>
          <p className="text-3xl font-bold text-green-600">{coursesWithFacilitators.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin Facilitador</h3>
          <p className="text-3xl font-bold text-red-600">{coursesWithoutFacilitators.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Total Horas</h3>
          <p className="text-3xl font-bold text-purple-600">{totalHours.toFixed(1)}</p>
        </div>
      </div>

      {/* Courses List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Estadísticas por Curso {selectedCourse && "(Filtrado)"}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Curso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Facilitadores
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Certificados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horas Totales
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
              {courseStats.map((course) => (
                <tr key={course.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {course.nombre}
                      </p>
                      <p className="text-xs text-gray-500">
                        {course.totalCertificates > 0 ? "Dictado" : "No dictado"}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <span className="font-medium">{course.facilitadores.length}</span>
                      {course.facilitadores.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {course.facilitadores.map(f => f.nombre_apellido).slice(0, 2).join(", ")}
                          {course.facilitadores.length > 2 && ` +${course.facilitadores.length - 2}`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {course.totalCertificates}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {course.totalHours.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      course.facilitadores.length > 0
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {course.facilitadores.length > 0 ? "Activo" : "Sin facilitador"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedCourse(
                        expandedCourse === course.id 
                          ? null 
                          : course.id
                      )}
                      disabled={course.facilitadores.length === 0}
                    >
                      {course.facilitadores.length === 0 ? "Sin datos" : 
                       expandedCourse === course.id ? "Ocultar" : "Ver detalles"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Expanded Details */}
        {expandedCourse && (
          <div className="border-t border-gray-200">
            {courseStats
              .filter(c => c.id === expandedCourse)
              .map((course) => (
                <div key={course.id} className="px-6 py-4 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Facilitadores de {course.nombre}
                  </h4>
                  {course.facilitadores.length === 0 ? (
                    <p className="text-sm text-gray-500">Este curso no ha sido dictado por ningún facilitador.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {course.facilitadores.map((facilitador) => (
                        <div key={facilitador.id} className="bg-white p-4 rounded border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-900">
                              {facilitador.nombre_apellido}
                            </p>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              facilitador.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}>
                              {facilitador.is_active ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs text-gray-600">
                            <p>Estado: {facilitador.estado_nombre}</p>
                            <p>Certificados: {facilitador.totalCertificates}</p>
                            <p>Horas: {facilitador.totalHours.toFixed(1)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
