"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCurso, updateCurso, deleteCurso, duplicateCurso } from "./actions";
import CourseActions from "./CourseActions";
import CreateCourseButton from "./CreateCourseButton";
import EmpresaSearch from "./EmpresaSearch";
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
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [datosFormulario, setDatosFormulario] = useState({
    titulo: "",
    empresa_id: "",
    contenido: ""
  });
  const [error, setError] = useState<string | null>(null);

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
    setSelectedEmpresa(empresaData);
  };

  const resetForm = () => {
    setDatosFormulario({
      titulo: "",
      empresa_id: "",
      contenido: ""
    });
    setSelectedEmpresa(null);
    setError(null);
  };

  const abrirModalEdicion = (curso: Curso) => {
    // Find the empresa data if cliente_asociado exists
    const empresaData = curso.cliente_asociado ? empresas.find(emp => emp.id === curso.cliente_asociado) || null : null;
    
    setDatosFormulario({
      titulo: curso.nombre || "",
      empresa_id: curso.cliente_asociado || "",
      contenido: curso.contenido_curso || ""
    });
    setSelectedEmpresa(empresaData);
    setEditandoCurso(curso.id);
    setError(null);
  };

  const cerrarModal = () => {
    setCreandoCurso(false);
    setEditandoCurso(null);
    resetForm();
  };

  // Filter courses based on search
  const cursosFiltrados = cursos.filter(curso => {
    const terminoBusqueda = busqueda.toLowerCase();
    return (
      curso.nombre?.toLowerCase().includes(terminoBusqueda) ||
      curso.contenido_curso?.toLowerCase().includes(terminoBusqueda) ||
      (curso.empresas?.razon_social?.toLowerCase().includes(terminoBusqueda) || false)
    );
  });

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
                  <p className="text-sm text-gray-500 mt-1">
                    Pronto se agregará un editor de texto enriquecido
                  </p>
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
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Cursos Existentes
              </h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar cursos..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full sm:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          
          {cursosFiltrados.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">
                {busqueda ? 'No se encontraron cursos que coincidan con tu búsqueda' : 'No hay cursos creados aún'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {busqueda ? 'Intenta con otros términos de búsqueda' : 'Crea tu primer curso haciendo clic en el botón "Nuevo Curso"'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {cursosFiltrados.map((curso) => (
                <div key={curso.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {curso.nombre}
                      </h3>
                      {curso.empresas && (
                        <p className="text-sm text-gray-600 mt-1">
                          Cliente: {curso.empresas.razon_social}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Creado: {new Date(curso.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <CourseActions 
                      curso={curso}
                      onEdit={abrirModalEdicion}
                      onDelete={manejarEliminacion}
                      onDuplicate={manejarDuplicacion}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Bottom Create Button */}
          <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
            <CreateCourseButton onClick={() => setCreandoCurso(true)} className="w-full sm:w-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
