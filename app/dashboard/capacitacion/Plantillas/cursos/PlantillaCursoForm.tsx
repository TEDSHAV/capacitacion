import { useState } from "react";
import { PlantillaCurso } from "./types";

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
  onCancel
}: PlantillaCursoFormProps) {
  const [formData, setFormData] = useState({
    titulo: plantilla?.titulo || (plantilla?.descripcion || ""),
    contenido: plantilla?.contenido || "",
    id_curso: plantilla?.id_curso || "",
    id_empresa: plantilla?.id_empresa || "",
    is_active: plantilla?.is_active ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const plantillaData = {
      ...formData,
      descripcion: formData.titulo, // Use title as the main description field in database
      titulo: formData.titulo, // Keep title for frontend display
      id_curso: formData.id_curso ? parseInt(formData.id_curso.toString()) : null,
      id_empresa: formData.id_empresa ? parseInt(formData.id_empresa.toString()) : null
    };

    // Validate required fields
    if (!plantillaData.id_curso) {
      alert('Debe seleccionar un curso para crear la plantilla.');
      return;
    }
    
    if (!plantillaData.id_empresa) {
      alert('Debe seleccionar una empresa para crear la plantilla.');
      return;
    }
    
    onSave(plantillaData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));

    // If course is changed, auto-populate content from already loaded course data
    if (name === 'id_curso' && value && !plantilla) {
      const selectedCourse = courses.find(course => course.id === parseInt(value.toString()));
      if (selectedCourse) {
        setFormData(prev => ({
          ...prev,
          titulo: prev.titulo || selectedCourse.nombre || "",
          contenido: prev.contenido || selectedCourse.contenido || ""
        }));
        console.log('Auto-populated content from course:', selectedCourse.nombre);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-lg bg-white">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {plantilla ? "Editar Plantilla" : "Nueva Plantilla de Curso"}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {plantilla 
              ? "Modifica los datos de la plantilla existente"
              : "Crea una nueva plantilla de contenido para cursos"
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Selection - First Field */}
          <div>
            <label htmlFor="id_curso" className="block text-sm font-medium text-gray-700 mb-1">
              Curso *
            </label>
            <select
              id="id_curso"
              name="id_curso"
              value={formData.id_curso}
              onChange={handleChange}
              required
              disabled={!!plantilla}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Seleccionar curso...</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.nombre}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {plantilla 
                ? "El curso asociado no puede ser modificado."
                : "Selecciona un curso para autocargar su contenido. Podrás modificarlo según necesites."
              }
            </p>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              id="titulo"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Plantilla de Seguridad Industrial"
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="contenido" className="block text-sm font-medium text-gray-700 mb-1">
              Contenido *
            </label>
            <textarea
              id="contenido"
              name="contenido"
              value={formData.contenido}
              onChange={handleChange}
              required
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ingresa el contenido detallado de la plantilla..."
            />
          </div>

          {/* Company Selection */}
          <div>
            <label htmlFor="id_empresa" className="block text-sm font-medium text-gray-700 mb-1">
              Empresa *
            </label>
            <select
              id="id_empresa"
              name="id_empresa"
              value={formData.id_empresa}
              onChange={handleChange}
              required
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
              La empresa para la cual se creará esta plantilla de curso.
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Plantilla activa
            </label>
            <p className="text-xs text-gray-500 ml-4">
              Las plantillas inactivas no aparecerán en el listado
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
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
              {plantilla ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
