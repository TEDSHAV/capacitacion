import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Curso, Empresa } from '@/types';
import EmpresaSearch from './EmpresaSearch';

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
    empresa_id: "", // Removed cliente_asociado reference as column doesn't exist
    empresa_nombre: curso?.empresas?.razon_social || "",
    contenido: curso?.contenido || "",
    horas_estimadas: curso?.horas_estimadas || 0,
    tipo_certificado: curso?.nota_aprobatoria === 0 ? "participacion" : "calificacion", // Certificate type
    nota_aprobatoria: curso?.nota_aprobatoria || 14, // Default to 14 for graded courses
    emite_carnet: curso?.emite_carnet || false, // Default to false
  });

  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onCancel]);

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);

  const manejarCambioInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDatosFormulario(prev => ({
      ...prev,
      [name]: (name === 'horas_estimadas' || name === 'nota_aprobatoria') ? 
        (value === "" ? 0 : Number(value.replace(/^0+/, ''))) : value
    }));
  };

  const handleTipoCertificadoChange = (tipo: string) => {
    setDatosFormulario(prev => ({
      ...prev,
      tipo_certificado: tipo,
      nota_aprobatoria: tipo === "participacion" ? 0 : (prev.nota_aprobatoria || 14) // Set to 0 for participation, keep existing or default for graded
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
    formData.append('nota_aprobatoria', datosFormulario.nota_aprobatoria.toString());
    formData.append('emite_carnet', datosFormulario.emite_carnet.toString());
    
    // Note: empresa_id is no longer stored in database as cliente_asociado column doesn't exist
    // if (datosFormulario.empresa_id) {
    //   formData.append('cliente_asociado', datosFormulario.empresa_id.toString());
    // }
    
    onSubmit(formData);
  };

  return (
    <div 
      ref={modalRef}
      className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
    >
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

        {/* Certificate Type */}
        <div>
          <label htmlFor="tipo_certificado" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Certificado * 
            <br /> 
            <span className='font-normal'>modificar solo si el certificado es de "Participación" </span>
          </label>
          <select
            id="tipo_certificado"
            name="tipo_certificado"
            value={datosFormulario.tipo_certificado}
            onChange={(e) => handleTipoCertificadoChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="calificacion">Certificado con Calificación</option>
            <option value="participacion">Certificado de Participación</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            {datosFormulario.tipo_certificado === "calificacion" 
              ? "Los participantes recibirán una calificación y necesitarán aprobar para obtener el certificado"
              : "Todos los participantes recibirán el certificado por asistir, sin calificación"
            }
          </p>
        </div>

        {/* Passing Grade - Only show for graded courses */}
        {datosFormulario.tipo_certificado === "calificacion" && (
          <div>
            <label htmlFor="nota_aprobatoria" className="block text-sm font-medium text-gray-700 mb-1">
              Calificación Aprobatoria
            </label>
            <input
              type="number"
              id="nota_aprobatoria"
              name="nota_aprobatoria"
              value={datosFormulario.nota_aprobatoria}
              onChange={manejarCambioInput}
              min="1"
              max="20"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ej: 14"
            />
            <p className="text-sm text-gray-500 mt-1">
              Nota mínima para aprobar el curso (escala 1-20)
            </p>
          </div>
        )}

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

        {/* Emitir Carnet Checkbox */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="emite_carnet"
              checked={datosFormulario.emite_carnet || false}
              onChange={(e) => setDatosFormulario(prev => ({
                ...prev,
                emite_carnet: e.target.checked
              }))}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Emite Carnet
            </span>
          </label>
          <p className="text-sm text-gray-500 mt-1">
            Marca esta opción si el curso emite carnet además del certificado
          </p>
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
