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
    descripcion: plantilla?.descripcion || "",
    contenido: plantilla?.contenido || "",
    id_curso: plantilla?.id_curso || "",
    id_empresa: plantilla?.id_empresa || "",
    is_active: plantilla?.is_active ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const plantillaData = {
      ...formData,
      id_curso: formData.id_curso ? parseInt(formData.id_curso.toString()) : null,
      id_empresa: formData.id_empresa ? parseInt(formData.id_empresa.toString()) : null
    };
    
    onSave(plantillaData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
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
          {/* Description */}
          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
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
            <label htmlFor="contenido" className="block text-sm font-medium text-gray-700 mb-1">
              Contenido *
            </label>
            <textarea
              id="contenido"
              name="contenido"
              value={formData.contenido}
              onChange={handleChange}
              required
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ingresa el contenido detallado de la plantilla..."
            />
          </div>

          {/* Course Selection */}
          <div>
            <label htmlFor="id_curso" className="block text-sm font-medium text-gray-700 mb-1">
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
              Si seleccionas un curso, esta plantilla estará disponible específicamente para ese curso.
            </p>
          </div>

          {/* Company Selection */}
          <div>
            <label htmlFor="id_empresa" className="block text-sm font-medium text-gray-700 mb-1">
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
              Si seleccionas una empresa, esta plantilla estará disponible específicamente para esa empresa.
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
