"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCurso, updateCurso, deleteCurso, duplicateCurso } from "./actions";
import CourseActions from "./CourseActions";
import CreateCourseButton from "./CreateCourseButton";
import EmpresaSearch from "./EmpresaSearch";
import Pagination from "./components/Pagination";
import { Empresa, Curso, GestionCursosClientProps } from "./types";

export default function GestionCursosClient({
  user,
  empresas = [],
  cursos = [],
}: GestionCursosClientProps) {
  const router = useRouter();
  const [creandoCurso, setCreandoCurso] = useState(false);
  const [editandoCurso, setEditandoCurso] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [datosFormulario, setDatosFormulario] = useState({
    titulo: "",
    empresa_id: "",
    contenido: "",
    horas_estimadas: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (creandoCurso || editandoCurso)) {
        setCreandoCurso(false);
        setEditandoCurso(null);
        resetForm();
      }
    };

    if (creandoCurso || editandoCurso) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [creandoCurso, editandoCurso]);

  const handleEmpresaSelect = (empresaId: string, empresaData: Empresa) => {
    setDatosFormulario(prev => ({ ...prev, empresa_id: empresaId }));
  };

  const resetForm = () => {
    setDatosFormulario({
      titulo: "",
      empresa_id: "",
      contenido: "",
      horas_estimadas: ""
    });
    setError(null);
  };

  const abrirModalEdicion = (curso: Curso) => {
    setDatosFormulario({
      titulo: curso.nombre || "",
      empresa_id: curso.cliente_asociado || "",
      contenido: curso.contenido_curso || "",
      horas_estimadas: ""
    });
    setEditandoCurso(curso.id);
    setError(null);
  };

  const cerrarModal = () => {
    setCreandoCurso(false);
    setEditandoCurso(null);
    setError(null);
  };

  // Filter courses based on search
  const cursosFiltrados = cursos.filter(curso =>
    curso.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    curso.contenido_curso?.toLowerCase().includes(busqueda.toLowerCase()) ||
    (curso.empresas?.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) || false)
  );

  // Pagination logic
  const totalPages = Math.ceil(cursosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const cursosPaginados = cursosFiltrados.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda]);

  const manejarCambioInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDatosFormulario(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('titulo', datosFormulario.titulo);
      formData.append('empresa_id', datosFormulario.empresa_id);
      formData.append('contenido', datosFormulario.contenido);
      formData.append('horas_estimadas', datosFormulario.horas_estimadas);

      let result;
      if (editandoCurso) {
        result = await updateCurso(editandoCurso, formData);
      } else {
        result = await createCurso(formData);
      }

      if (result.success) {
        cerrarModal();
        router.refresh();
      } else {
        setError(result.error || 'Error al guardar el curso');
      }
    } catch (error) {
            setError('Error interno del servidor');
    }
  };

  const manejarDuplicacion = async (id: string) => {
    try {
      const result = await duplicateCurso(id);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Error al duplicar el curso');
      }
    } catch (error) {
            setError('Error interno del servidor');
    }
  };

  const manejarEliminacion = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este curso?')) {
      return;
    }

    try {
      const result = await deleteCurso(id);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Error al eliminar el curso');
      }
    } catch (error) {
            setError('Error interno del servidor');
    }
  };

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

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
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

        {/* Create/Edit Course Modal */}
        {(creandoCurso || editandoCurso) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editandoCurso ? 'Editar Curso' : 'Crear Nuevo Curso'}
                </h2>
                <button
                  onClick={cerrarModal}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <span className="text-lg font-light">×</span>
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              <form onSubmit={manejarEnvio} className="space-y-4">
                {/* Title */}
                <div>
                  <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">
                    Título del Curso *
                  </label>
                  <input
                    type="text"
                    id="titulo"
                    name="titulo"
                    value={datosFormulario.titulo}
                    onChange={manejarCambioInput}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: Introducción a la Seguridad Industrial"
                  />
                </div>

                {/* Subtitle removed - not needed */}

                {/* Client Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vincular a Empresa (opcional)
                  </label>
                  <EmpresaSearch
                    empresas={empresas}
                    value={datosFormulario.empresa_id}
                    onChange={handleEmpresaSelect}
                    placeholder="Buscar empresa por nombre, RIF o código..."
                  />
                </div>

                {/* Estimated Hours */}
                <div>
                  <label htmlFor="horas_estimadas" className="block text-sm font-medium text-gray-700 mb-1">
                    Horas Estimadas
                  </label>
                  <input
                    type="number"
                    id="horas_estimadas"
                    name="horas_estimadas"
                    value={datosFormulario.horas_estimadas}
                    onChange={manejarCambioInput}
                    min="2"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: 40"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Duración estimada del curso en horas
                  </p>
                </div>

                {/* Content */}
                <div>
                  <label htmlFor="contenido" className="block text-sm font-medium text-gray-700 mb-1">
                    Contenido del Curso *
                  </label>
                  <textarea
                    id="contenido"
                    name="contenido"
                    value={datosFormulario.contenido}
                    onChange={manejarCambioInput}
                    required
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Agrega el contenido detallado del curso aquí..."
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors shadow-md"
                    style={{ backgroundColor: 'var(--primary-gray)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-md"
                    style={{ backgroundColor: 'var(--primary-blue)' }}
                  >
                    {editandoCurso ? 'Actualizar Curso' : 'Crear Curso'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Courses List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Search Bar - Above header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-end">
              <div className="relative w-80">
                <input
                  type="text"
                  placeholder="Buscar cursos..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <svg
                  className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* List Header */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-4">Curso</div>
              <div className="col-span-3">Cliente</div>
              <div className="col-span-2">Creado</div>
              <div className="col-span-3 text-right">Acciones</div>
            </div>
          </div>
          
          {cursosPaginados.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {busqueda ? 'No se encontraron cursos' : 'No hay cursos creados'}
              </h3>
              <p className="text-sm text-gray-500">
                {busqueda ? 'Intenta con otros términos de búsqueda' : 'Crea tu primer curso para comenzar'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {cursosPaginados.map((curso) => (
                <div
                  key={curso.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Course Name */}
                    <div className="col-span-4">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {curso.nombre}
                      </div>
                    </div>

                    {/* Client */}
                    <div className="col-span-3">
                      <div className="text-sm text-gray-900 truncate">
                        {curso.empresas?.razon_social || 'General'}
                      </div>
                    </div>

                    {/* Created Date */}
                    <div className="col-span-2">
                      <div className="text-sm text-gray-900">
                        {new Date(curso.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(curso.created_at).toLocaleDateString('es-ES', {
                          weekday: 'short'
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-3 flex justify-end">
                      <CourseActions 
                        curso={curso}
                        onEdit={abrirModalEdicion}
                        onDelete={manejarEliminacion}
                        onDuplicate={manejarDuplicacion}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={cursosFiltrados.length}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
