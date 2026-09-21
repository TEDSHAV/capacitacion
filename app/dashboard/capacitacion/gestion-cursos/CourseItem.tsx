import { Curso } from "@/types";
import CourseActions from "./CourseActions";
import { stripHtml } from "@/lib/strip-html";
import {
  CourseCategoryItem,
  resolveCourseCategory,
  getCategoryTheme,
  formatCourseDisplayCode,
} from "@/lib/course-categories";

interface CourseItemProps {
  curso: Curso;
  onEdit: (curso: Curso) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  categories?: CourseCategoryItem[];
}

export default function CourseItem({
  curso,
  onEdit,
  onDelete,
  onDuplicate,
  categories,
}: CourseItemProps) {
  const category = resolveCourseCategory(curso, categories);
  const theme = category ? getCategoryTheme(category.color) : null;
  const courseCode = formatCourseDisplayCode(curso.id, category?.codigo);

  return (
    <div
      onClick={() => onEdit(curso)}
      className="px-6 py-4 hover:bg-gray-50/90 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded"
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
        <div className="col-span-6 sm:col-span-6">
          <div className="space-y-1.5">
            {/* Category Badge & Code Line */}
            <div className="flex flex-wrap items-center gap-2">
              {category ? (
                <span
                  title={category.nombre}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border tracking-wide uppercase ${theme?.badge}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full mr-1.5 ${theme?.badgeDot}`}
                  />
                  {category.codigo}
                  <span className="ml-1 font-normal opacity-75 hidden sm:inline">
                    · {category.nombre}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                  Sin categoría
                </span>
              )}

              <span className="text-[11px] font-mono text-gray-400">
                #{courseCode}
              </span>

              {curso.mostrar_en_catalogo === false && (
                <span
                  title="Este curso no se muestra en el catálogo disponible para facilitadores"
                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
                >
                  Oculto en catálogo
                </span>
              )}
            </div>

            {/* Course Title */}
            <div className="text-sm font-semibold text-gray-900 leading-snug">
              {curso.nombre.toUpperCase()}
            </div>

            {/* Content Preview */}
            <div className="text-xs text-gray-500 line-clamp-2">
              {(() => {
                const plain = stripHtml(curso.contenido_curso || "");
                return (
                  plain.substring(0, 100) + (plain.length > 100 ? "..." : "")
                );
              })()}
            </div>
          </div>
        </div>

        {/* Duration */}
        <div className="col-span-2 text-center sm:text-left">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
            {curso.carga_horaria_std || 0}h
          </span>
        </div>

        {/* Actions */}
        <div
          className="col-span-4 flex justify-end flex-wrap gap-2"
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
