"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Empresa {
  id: string;
  razon_social: string;
  rif: string;
  direccion_fiscal: string;
  codigo_cliente: string;
}

interface Curso {
  id: string;
  titulo: string;
  contenido: string;
  empresa_id?: string;
  created_at: string;
  empresas?: {
    razon_social: string;
  };
}

interface GestionCursosClientProps {
  user: any;
  empresas: Empresa[];
  cursos: Curso[] | undefined;
}

export default function GestionCursosClient({
  user,
  empresas = [],
  cursos = [],
}: GestionCursosClientProps) {
  const router = useRouter();
  const [creandoCurso, setCreandoCurso] = useState(false);
  const [datosFormulario, setDatosFormulario] = useState({
    titulo: "",
    empresa_id: "",
    contenido: ""
  });

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && creandoCurso) {
        setCreandoCurso(false);
      }
    };

    if (creandoCurso) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [creandoCurso]);

  const manejarCambioInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDatosFormulario(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/cursos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...datosFormulario,
          empresa_id: datosFormulario.empresa_id || null
        }),
      });

      if (response.ok) {
        // Reset form and refresh
        setDatosFormulario({
          titulo: "",
          empresa_id: "",
          contenido: ""
        });
        setCreandoCurso(false);
        router.refresh();
      } else {
        console.error('Error creating course');
      }
    } catch (error) {
      console.error('Error:', error);
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
          <button
            onClick={() => setCreandoCurso(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-md"
            style={{ backgroundColor: 'var(--primary-blue)' }}
          >
            + Nuevo Curso
          </button>
        </div>

        {/* Create Course Modal */}
        {creandoCurso && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Crear Nuevo Curso
                </h2>
                <button
                  onClick={() => setCreandoCurso(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <span className="text-lg font-light">×</span>
                </button>
              </div>

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

                {/* Client Dropdown */}
                <div>
                  <label htmlFor="empresa_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Vincular a Empresa (opcional)
                  </label>
                  <select
                    id="empresa_id"
                    name="empresa_id"
                    value={datosFormulario.empresa_id}
                    onChange={manejarCambioInput}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Curso General</option>
                    {empresas.length === 0 ? (
                      <option value="" disabled>No hay empresas disponibles</option>
                    ) : (
                      empresas.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.razon_social}
                        </option>
                      ))
                    )}
                  </select>
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
                    onClick={() => setCreandoCurso(false)}
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
                    Crear Curso
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Courses List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Cursos Existentes
            </h2>
          </div>
          
          {cursos.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">No hay cursos creados aún</p>
              <p className="text-sm text-gray-400 mt-1">
                Crea tu primer curso haciendo clic en el botón "Nuevo Curso"
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {cursos.map((curso) => (
                <div key={curso.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {curso.titulo}
                      </h3>
                      <p className="text-xs text-gray-400 mt-2">
                        Creado: {new Date(curso.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                        Editar
                      </button>
                      <button className="text-red-600 hover:text-red-900 text-sm font-medium">
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
