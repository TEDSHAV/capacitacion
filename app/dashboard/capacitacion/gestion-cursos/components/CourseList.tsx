import { useState, useEffect } from 'react';
import { Curso } from '@/types';
import CourseItem from './CourseItem';
import Pagination from './Pagination';

interface CourseListProps {
  cursos: Curso[];
  onEdit: (curso: Curso) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export default function CourseList({ cursos, onEdit, onDelete, onDuplicate }: CourseListProps) {
  const [busqueda, setBusqueda] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Filter courses based on search
  const cursosFiltrados = cursos.filter(curso =>
    curso.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    curso.contenido?.toLowerCase().includes(busqueda.toLowerCase()) ||
    (curso.empresas?.razon_social?.toLowerCase().includes(busqueda.toLowerCase())) ||
    curso.horas_estimadas?.toString().includes(busqueda.toLowerCase()) ||
    curso.tipo_servicio?.toString().includes(busqueda.toLowerCase()) ||
    false
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

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Search Bar */}
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
          <div className="col-span-4">Información del Curso</div>
          <div className="col-span-2">Cliente</div>
          <div className="col-span-2">Duración</div>
          <div className="col-span-2">Creado</div>
          <div className="col-span-2 text-right">Acciones</div>
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
            <CourseItem
              key={curso.id}
              curso={curso}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
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
  );
}
