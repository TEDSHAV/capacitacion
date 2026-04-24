"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Curso, Empresa } from "@/types";
import {
  createCurso,
  updateCurso,
  duplicateCurso,
  deleteCurso,
} from "./actions";
import CourseForm from "./CourseForm";
import CourseList from "./CourseList";
import CreateCourseButton from "./CreateCourseButton";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { BookOpen, Award, Clock, TrendingUp } from "lucide-react";

export default function GestionCursosClient({
  user,
  empresas = [],
  cursos = [],
  analyticsMetrics = null,
}: {
  user: any;
  empresas: Empresa[];
  cursos: Curso[] | undefined;
  analyticsMetrics: any;
}) {
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [creandoCurso, setCreandoCurso] = useState(false);
  const [editandoCurso, setEditandoCurso] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cursosList, setCursosList] = useState<Curso[]>(cursos || []);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-gray-600">No autenticado</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cerrarModal = () => {
    setCreandoCurso(false);
    setEditandoCurso(null);
    setError(null);
  };

  const handleCreateCourse = async (formData: any) => {
    setError(null);

    try {
      const result = await createCurso(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setCreandoCurso(false);
        setCursosList((prev) => [result.data, ...prev]); // Add new course to list
      }
    } catch (err) {
      setError("Error al crear el curso");
    }
  };

  const handleEditCourse = async (formData: any) => {
    if (!editandoCurso) return;

    setError(null);

    try {
      const result = await updateCurso(editandoCurso.toString(), formData);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setEditandoCurso(null);
        setCursosList((prev) =>
          prev.map((curso) =>
            curso.id === editandoCurso ? result.data! : curso,
          ),
        ); // Update course in list
      }
    } catch (err) {
      setError("Error al actualizar el curso");
    }
  };

  const handleDeleteCourse = (id: string) => {
    confirm({
      title: "Eliminar Curso",
      message: "¿Estás seguro de que quieres eliminar este curso?",
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        try {
          const result = await deleteCurso(id);
          if (result.error) {
            setError(result.error);
          } else {
            setCursosList((prev) =>
              prev.filter((curso) => curso.id.toString() !== id),
            );
          }
        } catch (err) {
          setError("Error al eliminar el curso");
        }
      },
    });
  };

  const handleDuplicateCourse = async (id: string) => {
    try {
      const result = await duplicateCurso(id);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        if (result.data) setCursosList((prev) => [result.data!, ...prev]); // Add duplicated course to list
      }
    } catch (err) {
      setError("Error al duplicar el curso");
    }
  };

  const abrirModalEdicion = (curso: Curso) => {
    setEditandoCurso(curso.id);
    setError(null);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gestión de Cursos
              </h1>
              <p className="mt-2 text-gray-600">
                Crear y administrar contenidos de cursos
              </p>
            </div>
            <CreateCourseButton onClick={() => setCreandoCurso(true)} />
          </div>

          {/* Metrics Row */}
          {analyticsMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">
                    Cursos con Certificados
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsMetrics.unique_courses_with_certificates || 0}
                  </p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
                <Award className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Certificados Totales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsMetrics.total_certificates || 0}
                  </p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
                <Clock className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-500">Promedio de Cursos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsMetrics.average_score || 0}
                  </p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-500">Certificados Este Mes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsMetrics.certificates_this_month || 0}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top Courses */}
          {analyticsMetrics?.top_courses &&
            analyticsMetrics.top_courses.length > 0 && (
              <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Top Cursos por Certificados
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analyticsMetrics.top_courses
                    .slice(0, 3)
                    .map((course: any, index: number) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {course.course_name}
                          </h4>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>Certificados: {course.certificate_count}</p>
                          <p>Participantes: {course.participant_count}</p>
                          <p>Promedio: {course.avg_score}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
        </div>

        {/* Create/Edit Course Modal */}
        {(creandoCurso || editandoCurso) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <CourseForm
              curso={
                editandoCurso !== null
                  ? cursosList.find((c) => c.id === editandoCurso) || null
                  : null
              }
              empresas={empresas}
              onSubmit={creandoCurso ? handleCreateCourse : handleEditCourse}
              onCancel={cerrarModal}
              isEdit={!!editandoCurso}
            />
          </div>
        )}

        {/* Courses List */}
        <CourseList
          cursos={cursosList}
          onEdit={abrirModalEdicion}
          onDelete={handleDeleteCourse}
          onDuplicate={handleDuplicateCourse}
        />
      </div>
      {confirmDialog}
    </div>
  );
}
