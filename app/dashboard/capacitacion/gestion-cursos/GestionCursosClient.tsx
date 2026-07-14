"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Curso, Empresa } from '@/types';
import { createCurso, updateCurso, duplicateCurso, deleteCurso } from './actions';
import CourseForm from './CourseForm';
import CourseList from './CourseList';
import CreateCourseButton from './CreateCourseButton';

export default function GestionCursosClient({
  user,
  empresas = [],
  cursos = [],
}: {
  user: any;
  empresas: Empresa[];
  cursos: Curso[] | undefined;
}) {
  const router = useRouter();
  const [creandoCurso, setCreandoCurso] = useState(false);
  const [editandoCurso, setEditandoCurso] = useState<string | null>(null);
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
        setCursosList(prev => [result.data, ...prev]); // Add new course to list
      }
    } catch (err) {
      setError('Error al crear el curso');
    }
  };

  const handleEditCourse = async (formData: any) => {
    if (!editandoCurso) return;
    
    setError(null);
    
    try {
      const result = await updateCurso(editandoCurso, formData);
      
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setEditandoCurso(null);
        setCursosList(prev => prev.map(curso => 
          curso.id === editandoCurso ? result.data : curso
        )); // Update course in list
      }
    } catch (err) {
      setError('Error al actualizar el curso');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este curso?')) return;
    
    try {
      const result = await deleteCurso(id);
      
      if (result.error) {
        setError(result.error);
      } else {
        // Remove the course from the local list since it's now inactive
        setCursosList(prev => prev.filter(curso => curso.id !== id));
      }
    } catch (err) {
      setError('Error al eliminar el curso');
    }
  };

  const handleDuplicateCourse = async (id: string) => {
    try {
      const result = await duplicateCurso(id);
      
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setCursosList(prev => [result.data, ...prev]); // Add duplicated course to list
      }
    } catch (err) {
      setError('Error al duplicar el curso');
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
            <CourseForm
              curso={editandoCurso ? cursosList.find(c => c.id === editandoCurso) || null : null}
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
    </div>
  );
}
