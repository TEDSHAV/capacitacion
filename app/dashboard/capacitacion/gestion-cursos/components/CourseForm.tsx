import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Curso, Empresa } from '@/types';
import EmpresaSearch from '../EmpresaSearch';

interface CourseFormProps {
  curso: Curso | null;
  empresas: Empresa[];
  onSubmit: (formData: any) => void;
  onCancel: () => void;
  isEdit: boolean;
}

export default function CourseForm({ curso, empresas, onSubmit, onCancel, isEdit }: CourseFormProps) {
  const [datosFormulario, setDatosFormulario] = useState({
    titulo: curso?.nombre || "",
    empresa_id: curso?.cliente_asociado ? curso.cliente_asociado.toString() : "", // Convert number to string properly
    empresa_nombre: curso?.empresas?.razon_social || "",
    contenido: curso?.contenido || "",
    horas_estimadas: curso?.horas_estimadas || 0,
  });

  const [error, setError] = useState<string | null>(null);

  const manejarCambioInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDatosFormulario(prev => ({
      ...prev,
      [name]: name === 'horas_estimadas' ? (value === "" ? 0 : Number(value)) : value
    }));
  };

  const handleEmpresaSelect = (empresaId: string, empresaData: Empresa) => {
    setDatosFormulario(prev => ({
      ...prev,
      empresa_id: empresaId || "", // Keep as string for form state
      empresa_nombre: empresaData?.razon_social || "", // Set company name for display
    }));
  };

  const manejarEnvio = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create FormData properly
    const formData = new FormData();
    formData.append('titulo', datosFormulario.titulo);
    formData.append('contenido', datosFormulario.contenido);
    formData.append('horas_estimadas', datosFormulario.horas_estimadas.toString());
    
    // Handle empresa_id properly - convert number to string for FormData
    if (datosFormulario.empresa_id) {
      formData.append('cliente_asociado', datosFormulario.empresa_id.toString());
    }
    
    onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {isEdit ? 'Editar Curso' : 'Crear Nuevo Curso'}
        </h2>
        <button
          onClick={onCancel}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <span className="text-lg font-light">×</span>
        </button>
      </div>

      <form onSubmit={manejarEnvio} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">
            Título del Curso *
          </label>
          <input
            type="text"
            id="titulo"
            name="titulo"
            value={datosFormulario.titulo}
            onChange={manejarCambioInput}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Ej: Introducción a la Seguridad Industrial"
          />
        </div>

        {/* Client Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vincular a Empresa (opcional)
          </label>
          <EmpresaSearch
            empresas={empresas}
            value={datosFormulario.empresa_id}
            onChange={handleEmpresaSelect}
            placeholder="Buscar empresa por nombre, RIF o código..."
          />
        </div>

        {/* Estimated Hours */}
        <div>
          <label htmlFor="horas_estimadas" className="block text-sm font-medium text-gray-700 mb-1">
            Horas Estimadas
          </label>
          <input
            type="number"
            id="horas_estimadas"
            name="horas_estimadas"
            value={datosFormulario.horas_estimadas}
            onChange={manejarCambioInput}
            min="2"
            step="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Ej: 40"
          />
          <p className="text-sm text-gray-500 mt-1">
            Duración estimada del curso en horas
          </p>
        </div>

        {/* Content */}
        <div>
          <label htmlFor="contenido" className="block text-sm font-medium text-gray-700 mb-1">
            Contenido del Curso *
          </label>
          <textarea
            id="contenido"
            name="contenido"
            value={datosFormulario.contenido}
            onChange={manejarCambioInput}
            required
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Agrega el contenido detallado del curso aquí..."
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
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
            {isEdit ? 'Actualizar Curso' : 'Crear Curso'}
          </button>
        </div>
      </form>
    </div>
  );
}
