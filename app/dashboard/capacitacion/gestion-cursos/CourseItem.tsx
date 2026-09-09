import { Curso } from "@/types";
import CourseActions from "./CourseActions";
import { stripHtml } from "@/lib/strip-html";

interface CourseItemProps {
  curso: Curso;
  onEdit: (curso: Curso) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export default function CourseItem({
  curso,
  onEdit,
  onDelete,
  onDuplicate,
}: CourseItemProps) {
  return (
    <div
      onClick={() => onEdit(curso)}
      className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded"
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(curso);
        }
      }}
    >
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Course Information */}
        <div className="col-span-5">
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-900 truncate">
              {curso.nombre.toUpperCase()}
            </div>
            <div className="text-xs text-gray-500 line-clamp-2">
              {(() => {
                const plain = stripHtml(curso.contenido_curso || "");
                return (
                  plain.substring(0, 80) + (plain.length > 80 ? "..." : "")
                );
              })()}
            </div>
          </div>
        </div>

        {/* Duration */}
        <div className="col-span-2">
          <div className="text-sm font-medium text-gray-900">
            {curso.carga_horaria_std || 0}h
          </div>
        </div>

        {/* Actions */}
        <div
          className="col-span-5 flex justify-end flex-wrap gap-2"
          onClick={(e) => e.stopPropagation()}
        >
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
