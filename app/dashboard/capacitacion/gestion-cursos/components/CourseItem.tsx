import { Curso } from '@/types';
import CourseActions from '../CourseActions';

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
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Course Information */}
        <div className="col-span-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-900 truncate">
              {curso.nombre}
            </div>
            <div className="text-xs text-gray-500 line-clamp-2">
              {curso.contenido?.substring(0, 80)}{curso.contenido?.length > 80 ? '...' : ''}
            </div>
          </div>
        </div>

        {/* Client */}
        <div className="col-span-2">
          <div className="text-sm text-gray-600 truncate">
            {curso.empresas?.razon_social || 'Sin cliente'}
          </div>
        </div>

        {/* Duration */}
        <div className="col-span-2">
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium text-gray-900">
              {curso.horas_estimadas || 0}h
            </div>
            {curso.tipo_servicio && (
              <div className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                Tipo {curso.tipo_servicio}
              </div>
            )}
          </div>
        </div>

        {/* Creation Date */}
        <div className="col-span-2">
          <div className="text-xs text-gray-500">
            {formatDate(curso.created_at || curso.creado)}
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-2 flex justify-end">
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
