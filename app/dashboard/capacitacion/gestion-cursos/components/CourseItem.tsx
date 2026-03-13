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
    const date = new Date(dateString);
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
        {/* Course Name */}
        <div className="col-span-4">
          <div className="text-sm font-medium text-gray-900 truncate">
            {curso.nombre}
          </div>
        </div>

        {/* Client */}
        <div className="col-span-3">
          <div className="text-sm text-gray-500 truncate">
            {curso.empresas?.razon_social || 'Sin cliente'}
          </div>
        </div>

        {/* Creation Date */}
        <div className="col-span-2">
          <div className="text-xs text-gray-400 text-right">
            {formatDate(curso.creado)}
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-3 flex justify-end">
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
