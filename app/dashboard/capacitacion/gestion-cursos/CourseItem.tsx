import { Curso } from '@/types';
import CourseActions from './CourseActions';

interface CourseItemProps {
  curso: Curso;
  onEdit: (curso: Curso) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Sin fecha';
  
  try {
    // Handle PostgreSQL date format (YYYY-MM-DD)
    const date = new Date(dateString + 'T00:00:00'); // Add time to make it a valid date
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Fecha inválida';
    }
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'Fecha inválida';
  }
};

export default function CourseItem({ curso, onEdit, onDelete, onDuplicate }: CourseItemProps) {
  return (
    <div
      onClick={() => onEdit(curso)}
      className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded"
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(curso);
        }
      }}
    >
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Course Information */}
        <div className="col-span-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-900 truncate">
              {curso.nombre}
            </div>
            <div className="text-xs text-gray-500 line-clamp-2">
              {curso.contenido?.substring(0, 80)}{(curso.contenido && curso.contenido.length > 80) ? '...' : ''}
            </div>
          </div>
        </div>

        {/* Client */}
        <div className="col-span-2">
          <div className="text-sm text-gray-600 truncate">
            {curso.empresas?.razon_social || 'Uso General'}
          </div>
        </div>

        {/* Duration */}
        <div className="col-span-2">
          <div className="text-sm font-medium text-gray-900">
            {curso.horas_estimadas || 0}h
          </div>
        </div>

        {/* Creation Date */}
        <div className="col-span-2">
          <div className="text-xs text-gray-500">
            {formatDate(curso.created_at)}
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
          <CourseActions 
            curso={curso}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        </div>
      </div>
    </div>
  );
}
