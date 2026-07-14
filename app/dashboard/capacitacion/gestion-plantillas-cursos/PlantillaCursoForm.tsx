import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { PlantillaCurso } from "./types";

const RichTextEditor = dynamic(
  () => import("@/components/ui/rich-text-editor"),
  { ssr: false },
);

interface PlantillaCursoFormProps {
  plantilla?: PlantillaCurso | null;
  courses: any[];
  empresas: any[];
  onSave: (plantillaData: Partial<PlantillaCurso>) => void;
  onCancel: () => void;
}

export function PlantillaCursoForm({
  plantilla,
  courses,
  empresas,
  onSave,
  onCancel,
}: PlantillaCursoFormProps) {
  const [formData, setFormData] = useState({
    descripcion: plantilla?.descripcion || "",
    contenido: plantilla?.contenido || "",
    id_curso: plantilla?.id_curso || "",
    id_empresa: plantilla?.id_empresa || "",
  });

  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [onCancel]);

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onCancel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate content length
    if ((formData.contenido?.length || 0) > 2000) {
      alert(
        "El contenido excede el límite de 2000 caracteres. Por favor, reduce el contenido.",
      );
      return;
    }

    const plantillaData = {
      ...formData,
      descripcion: formData.descripcion.toUpperCase(),
      id_curso: formData.id_curso
        ? parseInt(formData.id_curso.toString())
        : null,
      id_empresa: formData.id_empresa
        ? parseInt(formData.id_empresa.toString())
        : null,
      is_active: true,
    };

    onSave(plantillaData);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : name === "descripcion"
            ? value.toUpperCase()
            : value,
    }));

    // When a course is selected, populate the content field with the course's content
    if (name === "id_curso" && value) {
      const selectedCourse = courses.find(
        (course) => course.id === parseInt(value.toString()),
      );
      if (selectedCourse?.contenido) {
        setFormData((prev) => ({
          ...prev,
          contenido: selectedCourse.contenido,
        }));
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div
        ref={modalRef}
        className="relative top-20 mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-lg bg-white"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {plantilla ? "Editar Plantilla" : "Nueva Plantilla de Curso"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {plantilla
                ? "Modifica los datos de la plantilla existente"
                : "Crea una nueva plantilla de contenido para cursos"}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div>
            <label
              htmlFor="descripcion"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Descripción *
            </label>
            <input
              type="text"
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Contenido general de seguridad industrial"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contenido *
            </label>
            <RichTextEditor
              value={formData.contenido}
              onChange={(html) =>
                setFormData((prev) => ({ ...prev, contenido: html }))
              }
              rows={10}
            />
            <div className="flex justify-between items-center mt-1">
              <p
                className={`text-xs font-medium ${(formData.contenido?.length || 0) > 2000 ? "text-red-600" : (formData.contenido?.length || 0) > 1800 ? "text-yellow-600" : "text-gray-500"}`}
              >
                {formData.contenido?.length || 0} / 2000 caracteres
              </p>
            </div>
          </div>

          {/* Course Selection */}
          <div>
            <label
              htmlFor="id_curso"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Curso (Opcional)
            </label>
            <select
              id="id_curso"
              name="id_curso"
              value={formData.id_curso}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar curso...</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.nombre}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Si seleccionas un curso, esta plantilla estará disponible
              específicamente para ese curso.
            </p>
          </div>

          {/* Company Selection */}
          <div>
            <label
              htmlFor="id_empresa"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Empresa (Opcional)
            </label>
            <select
              id="id_empresa"
              name="id_empresa"
              value={formData.id_empresa}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar empresa...</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Si seleccionas una empresa, esta plantilla estará disponible
              específicamente para esa empresa.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {plantilla ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
